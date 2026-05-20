import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { UserService } from '../../../../core/services/user.service';
import { UserResponse, AdminCreateUserRequest, UserFullProfileResponse } from '../../../../core/models/user.models';
import { PageResponse, UserRole } from '../../../../core/models/common.models';
import { WebSocketService } from '../../../../core/services/websocket.service';
import { AdminToastService } from '../../shared/admin-toast.service';
import { ScrollLockService } from '../../../../core/services/scroll-lock.service';
import { TooltipDirective } from '../../../../shared/directives/tooltip.directive';
import { formatAmount } from '../../shared/admin-status.helpers';

export interface UserSegment {
  label: string;
  classes: string;
}

@Component({
  selector: 'app-admin-users',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, TooltipDirective],
  templateUrl: './admin-users.component.html',
})
export class AdminUsersComponent implements OnInit, OnDestroy {
  users: UserResponse[] = [];
  usersLoading = false;
  usersPage = 0;
  usersTotalPages = 0;
  usersTotalElements = 0;
  toggleUpdatingId: number | null = null;
  readonly roles = Object.values(UserRole);

  /* ── Recherche & filtres ── */
  searchQuery = '';
  filterRole = '';
  filterStatus = '';
  sortBy: 'createdAt' | 'nom' = 'createdAt';
  sortDir: 'asc' | 'desc' = 'desc';

  private readonly search$ = new Subject<string>();

  /* ── Création ── */
  showCreateUserModal = false;
  createUserLoading = false;
  createUserError: string | null = null;
  createUserForm: AdminCreateUserRequest = {
    nom: '', prenom: '', email: '', password: '', phone: '+225', role: UserRole.CUSTOMER,
  };

  /* ── Fiche client ── */
  userFullProfile: UserFullProfileResponse | null = null;
  userFullProfileLoading = false;
  showUserProfile = false;

  readonly formatAmount = formatAmount;
  private readonly destroy$ = new Subject<void>();

  constructor(
    private userService: UserService,
    private wsService: WebSocketService,
    private toast: AdminToastService,
    private scrollLock: ScrollLockService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadUsers(0);

    this.search$.pipe(
      debounceTime(350),
      distinctUntilChanged(),
      takeUntil(this.destroy$),
    ).subscribe(() => this.loadUsers(0));

    this.wsService.staffEvent$.pipe(takeUntil(this.destroy$)).subscribe(e => {
      if (e.module === 'users') this.loadUsers(0);
    });
  }

  ngOnDestroy(): void {
    this.scrollLock.forceUnlock();
    this.destroy$.next();
    this.destroy$.complete();
  }

  get userPages(): number[] { return Array.from({ length: this.usersTotalPages }, (_, i) => i); }

  get hasActiveFilters(): boolean {
    return !!this.searchQuery || !!this.filterRole || !!this.filterStatus;
  }

  onSearchChange(): void { this.search$.next(this.searchQuery); }

  applyFilter(): void { this.loadUsers(0); }

  clearFilters(): void {
    this.searchQuery = '';
    this.filterRole  = '';
    this.filterStatus = '';
    this.loadUsers(0);
  }

  loadUsers(page = 0): void {
    this.usersLoading = true;
    const enabled = this.filterStatus === 'active'   ? true
                  : this.filterStatus === 'inactive' ? false
                  : undefined;
    this.userService.getAllUsers(page, 15, this.searchQuery || undefined, this.filterRole || undefined, enabled).subscribe({
      next: (r) => {
        if (r.success) {
          const pg = r.data as PageResponse<UserResponse>;
          this.users = pg.content;
          this.usersTotalPages    = pg.totalPages;
          this.usersTotalElements = pg.totalElements;
          this.usersPage = page;
        }
        this.usersLoading = false;
        this.cdr.markForCheck();
      },
      error: () => { this.usersLoading = false; this.cdr.markForCheck(); },
    });
  }

  /* ── Segmentation ── */
  getSegments(user: UserResponse): UserSegment[] {
    const segs: UserSegment[] = [];
    const daysSince = (date: string) => (Date.now() - new Date(date).getTime()) / 86_400_000;

    if (daysSince(user.createdAt) < 7)
      segs.push({ label: 'Nouveau', classes: 'bg-blue-500/15 text-blue-400 border border-blue-500/25' });

    if (!user.enabled)
      segs.push({ label: 'Suspendu', classes: 'bg-red-500/15 text-red-400 border border-red-500/25' });

    return segs;
  }

  isNewUser(user: UserResponse | UserFullProfileResponse): boolean {
    const date = 'createdAt' in user ? user.createdAt : (user as UserFullProfileResponse).memberSince;
    return (Date.now() - new Date(date).getTime()) / 86_400_000 < 7;
  }

  /* ── VIP (fiche complète) ── */
  isVip(profile: UserFullProfileResponse): boolean {
    return profile.totalSpent >= 100_000;
  }

  avgBasket(profile: UserFullProfileResponse): number {
    return profile.completedOrders > 0
      ? Math.round(profile.totalSpent / profile.completedOrders)
      : 0;
  }

  /* ── Toggle ── */
  toggleUser(user: UserResponse): void {
    this.toggleUpdatingId = user.id;
    this.userService.toggleUser(user.id).subscribe({
      next: () => {
        const idx = this.users.findIndex(u => u.id === user.id);
        if (idx !== -1) {
          this.users = [...this.users];
          this.users[idx] = { ...this.users[idx], enabled: !this.users[idx].enabled };
        }
        this.toggleUpdatingId = null;
        this.cdr.markForCheck();
      },
      error: () => { this.toggleUpdatingId = null; this.cdr.markForCheck(); },
    });
  }

  /* ── Création ── */
  openCreateUserModal(): void {
    this.createUserForm = { nom: '', prenom: '', email: '', password: '', phone: '+225', role: UserRole.CUSTOMER };
    this.createUserError = null;
    this.showCreateUserModal = true;
    this.cdr.markForCheck();
  }

  closeCreateUserModal(): void { this.showCreateUserModal = false; this.cdr.markForCheck(); }

  submitCreateUser(): void {
    this.createUserLoading = true;
    this.createUserError = null;
    this.userService.createUser(this.createUserForm).subscribe({
      next: (r) => {
        if (r.success) {
          this.users = [r.data, ...this.users];
          this.showCreateUserModal = false;
          this.toast.show('Utilisateur créé');
        }
        this.createUserLoading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.createUserError = err?.error?.message || 'Une erreur est survenue';
        this.createUserLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  /* ── Fiche client ── */
  openUserProfile(userId: number): void {
    this.userFullProfile = null;
    this.userFullProfileLoading = true;
    this.showUserProfile = true;
    this.scrollLock.lock();
    this.cdr.markForCheck();
    this.userService.getFullProfile(userId).subscribe({
      next: (r) => {
        if (r.success) this.userFullProfile = r.data;
        this.userFullProfileLoading = false;
        this.cdr.markForCheck();
      },
      error: () => { this.userFullProfileLoading = false; this.cdr.markForCheck(); },
    });
  }

  closeUserProfile(): void {
    this.showUserProfile = false;
    this.userFullProfile = null;
    this.scrollLock.unlock();
    this.cdr.markForCheck();
  }
}
