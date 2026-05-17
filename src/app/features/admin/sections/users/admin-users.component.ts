import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { UserService } from '../../../../core/services/user.service';
import { UserResponse, AdminCreateUserRequest, UserFullProfileResponse } from '../../../../core/models/user.models';
import { PageResponse, UserRole } from '../../../../core/models/common.models';
import { WebSocketService } from '../../../../core/services/websocket.service';
import { AdminToastService } from '../../shared/admin-toast.service';
import { ScrollLockService } from '../../../../core/services/scroll-lock.service';
import { TooltipDirective } from '../../../../shared/directives/tooltip.directive';
import { formatAmount } from '../../shared/admin-status.helpers';

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
  toggleUpdatingId: number | null = null;
  readonly roles = Object.values(UserRole);

  showCreateUserModal = false;
  createUserLoading = false;
  createUserError: string | null = null;
  createUserForm: AdminCreateUserRequest = {
    nom: '', prenom: '', email: '', password: '', phone: '+225', role: UserRole.CUSTOMER,
  };

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

  loadUsers(page = 0): void {
    this.usersLoading = true;
    this.userService.getAllUsers(page, 15).subscribe({
      next: (r) => {
        if (r.success) {
          const pg = r.data as PageResponse<UserResponse>;
          this.users = pg.content;
          this.usersTotalPages = pg.totalPages;
          this.usersPage = page;
        }
        this.usersLoading = false;
        this.cdr.markForCheck();
      },
      error: () => { this.usersLoading = false; this.cdr.markForCheck(); },
    });
  }

  toggleUser(user: UserResponse): void {
    this.toggleUpdatingId = user.id;
    this.userService.toggleUser(user.id).subscribe({
      next: () => {
        const idx = this.users.findIndex(u => u.id === user.id);
        if (idx !== -1) { this.users = [...this.users]; this.users[idx] = { ...this.users[idx], enabled: !this.users[idx].enabled }; }
        this.toggleUpdatingId = null;
        this.cdr.markForCheck();
      },
      error: () => { this.toggleUpdatingId = null; this.cdr.markForCheck(); },
    });
  }

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
        if (r.success) { this.users = [r.data, ...this.users]; this.showCreateUserModal = false; this.toast.show('Utilisateur créé ✓'); }
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

  openUserProfile(userId: number): void {
    this.userFullProfile = null;
    this.userFullProfileLoading = true;
    this.showUserProfile = true;
    this.scrollLock.lock();
    this.cdr.markForCheck();
    this.userService.getFullProfile(userId).subscribe({
      next: (r) => { if (r.success) this.userFullProfile = r.data; this.userFullProfileLoading = false; this.cdr.markForCheck(); },
      error: () => { this.userFullProfileLoading = false; this.cdr.markForCheck(); },
    });
  }

  closeUserProfile(): void { this.showUserProfile = false; this.userFullProfile = null; this.scrollLock.unlock(); this.cdr.markForCheck(); }
}
