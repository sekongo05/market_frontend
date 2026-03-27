import { Component, OnInit, OnDestroy, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterModule, RouterLinkActive } from '@angular/router';
import { AuthService, CurrentUser } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { ThemeService } from '../../core/services/theme.service';
import { CartService, CartItem } from '../../core/services/cart.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule, RouterLink, RouterLinkActive],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css'],
})
export class NavbarComponent implements OnInit, OnDestroy {
  currentUser: CurrentUser | null = null;
  unreadNotifications = 0;
  showUserMenu = false;
  showCart     = false;
  mobileOpen   = false;
  scrolled     = false;
  cartItems: CartItem[] = [];

  private destroy$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    private notificationService: NotificationService,
    readonly themeService: ThemeService,
    readonly cartService: CartService,
    private cdr: ChangeDetectorRef
  ) {}

  @HostListener('window:scroll')
  onScroll(): void {
    this.scrolled = window.scrollY > 20;
    this.cdr.detectChanges();
  }

  ngOnInit(): void {
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => { this.currentUser = user; this.cdr.detectChanges(); });

    this.cartService.cart$
      .pipe(takeUntil(this.destroy$))
      .subscribe(items => { this.cartItems = items; this.cdr.detectChanges(); });

    if (this.currentUser) this.loadUnreadCount();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggleTheme():   void { this.themeService.toggle(); this.cdr.detectChanges(); }
  toggleCart():    void { this.showCart = !this.showCart; this.showUserMenu = false; this.mobileOpen = false; }
  toggleUserMenu():void { this.showUserMenu = !this.showUserMenu; this.showCart = false; }
  toggleMobile():  void { this.mobileOpen = !this.mobileOpen; this.showCart = false; this.showUserMenu = false; }
  closeAll():      void { this.showCart = false; this.showUserMenu = false; this.mobileOpen = false; }

  logout(): void {
    this.authService.logout();
    this.closeAll();
  }

  loadUnreadCount(): void {
    this.notificationService.getUnreadCount()
      .pipe(takeUntil(this.destroy$))
      .subscribe(r => { if (r.success) this.unreadNotifications = r.data.count; });
  }

  get isManager(): boolean {
    return this.currentUser?.role === 'MANAGER' || this.currentUser?.role === 'ADMIN';
  }
  get cartCount(): number  { return this.cartItems.reduce((s, i) => s + i.quantity, 0); }
  get cartTotal(): number  { return this.cartService.getTotalPrice(); }

  get fullName(): string {
    return this.currentUser ? `${this.currentUser.prenom} ${this.currentUser.nom}` : '';
  }
  get initials(): string {
    return this.currentUser
      ? `${this.currentUser.prenom[0]}${this.currentUser.nom[0]}`.toUpperCase()
      : '';
  }
}
