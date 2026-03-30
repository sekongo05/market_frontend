import { Component, OnInit, OnDestroy, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterModule, RouterLinkActive, Router } from '@angular/router';
import { TooltipDirective } from '../directives/tooltip.directive';
import { AuthService, CurrentUser } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { NotificationResponse } from '../../core/models/notification.models';
import { ThemeService } from '../../core/services/theme.service';
import { CartService, CartItem } from '../../core/services/cart.service';
import { OrderService } from '../../core/services/order.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, RouterLink, RouterLinkActive, TooltipDirective],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css'],
})
export class NavbarComponent implements OnInit, OnDestroy {
  currentUser: CurrentUser | null = null;
  unreadNotifications = 0;
  showUserMenu       = false;
  showCart           = false;
  showNotifications  = false;
  mobileOpen         = false;
  scrolled           = false;
  cartItems: CartItem[] = [];
  notifications: NotificationResponse[] = [];
  notificationsLoading = false;
  selectedNotification: NotificationResponse | null = null;

  // Checkout flow
  showCheckout    = false;
  deliveryAddress = '';
  checkoutLoading = false;
  checkoutError: string | null = null;
  checkoutSuccess = false;

  private destroy$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    private notificationService: NotificationService,
    private orderService: OrderService,
    private router: Router,
    readonly themeService: ThemeService,
    readonly cartService: CartService,
    private cdr: ChangeDetectorRef
  ) {}

  @HostListener('window:scroll')
  onScroll(): void {
    this.scrolled = window.scrollY > 20;
    this.cdr.detectChanges();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.showCart || this.showUserMenu || this.showNotifications || this.mobileOpen) {
      this.closeAll();
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (this.showNotifications && !target.closest('[data-notif-panel]')) {
      this.showNotifications = false;
      this.selectedNotification = null;
      this.cdr.detectChanges();
    }
    if (this.showUserMenu && !target.closest('[data-user-menu]')) {
      this.showUserMenu = false;
      this.cdr.detectChanges();
    }
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
  toggleCart():    void { this.showCart = !this.showCart; this.showUserMenu = false; this.showNotifications = false; this.mobileOpen = false; }
  toggleUserMenu():void { this.showUserMenu = !this.showUserMenu; this.showCart = false; this.showNotifications = false; }
  toggleMobile():  void { this.mobileOpen = !this.mobileOpen; this.showCart = false; this.showUserMenu = false; this.showNotifications = false; }
  closeAll():      void { this.showCart = false; this.showUserMenu = false; this.showNotifications = false; this.mobileOpen = false; this._resetCheckout(); }

  toggleNotifications(): void {
    this.showNotifications = !this.showNotifications;
    this.showCart = false;
    this.showUserMenu = false;
    if (!this.showNotifications) this.selectedNotification = null;
    if (this.showNotifications && this.notifications.length === 0) {
      this.loadNotifications();
    }
    this.cdr.detectChanges();
  }

  loadNotifications(): void {
    this.notificationsLoading = true;
    this.notificationService.getNotifications({ page: 0, size: 20 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (r) => {
          if (r.success) this.notifications = r.data.content;
          this.notificationsLoading = false;
          this.cdr.detectChanges();
        },
        error: () => { this.notificationsLoading = false; this.cdr.detectChanges(); },
      });
  }

  openNotification(notif: NotificationResponse): void {
    this.selectedNotification = notif;
    if (!notif.read) {
      this.notificationService.markAsRead(notif.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            const idx = this.notifications.findIndex(n => n.id === notif.id);
            if (idx !== -1) {
              this.notifications = [...this.notifications];
              this.notifications[idx] = { ...this.notifications[idx], read: true };
              this.selectedNotification = this.notifications[idx];
            }
            if (this.unreadNotifications > 0) this.unreadNotifications--;
            this.cdr.detectChanges();
          },
        });
    }
  }

  closeNotificationDetail(): void {
    this.selectedNotification = null;
    this.cdr.detectChanges();
  }

  markAsRead(notif: NotificationResponse): void {
    if (notif.read) return;
    this.notificationService.markAsRead(notif.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          const idx = this.notifications.findIndex(n => n.id === notif.id);
          if (idx !== -1) {
            this.notifications = [...this.notifications];
            this.notifications[idx] = { ...this.notifications[idx], read: true };
          }
          if (this.unreadNotifications > 0) this.unreadNotifications--;
          this.cdr.detectChanges();
        },
      });
  }

  markAllAsRead(): void {
    this.notificationService.markAllAsRead()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.notifications = this.notifications.map(n => ({ ...n, read: true }));
          this.unreadNotifications = 0;
          this.cdr.detectChanges();
        },
      });
  }

  deleteNotification(notif: NotificationResponse, event: Event): void {
    event.stopPropagation();
    this.notificationService.deleteNotification(notif.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          if (!notif.read && this.unreadNotifications > 0) this.unreadNotifications--;
          this.notifications = this.notifications.filter(n => n.id !== notif.id);
          if (this.selectedNotification?.id === notif.id) this.selectedNotification = null;
          this.cdr.detectChanges();
        },
      });
  }

  deleteAllNotifications(): void {
    this.notificationService.deleteAllNotifications()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.notifications = [];
          this.unreadNotifications = 0;
          this.selectedNotification = null;
          this.cdr.detectChanges();
        },
      });
  }

  logout(): void {
    this.authService.logout();
    this.closeAll();
  }

  loadUnreadCount(): void {
    this.notificationService.getUnreadCount()
      .pipe(takeUntil(this.destroy$))
      .subscribe(r => { if (r.success) this.unreadNotifications = r.data.count; });
  }

  // ── Checkout ────────────────────────────────────────────────────────────────

  openCheckout(): void {
    this.showCheckout = true;
    this.deliveryAddress = '';
    this.checkoutError = null;
    this.checkoutSuccess = false;
    this.cdr.detectChanges();
  }

  cancelCheckout(): void {
    this.showCheckout = false;
    this.checkoutError = null;
    this.cdr.detectChanges();
  }

  placeOrder(): void {
    if (!this.deliveryAddress.trim()) {
      this.checkoutError = 'Veuillez saisir une adresse de livraison';
      this.cdr.detectChanges();
      return;
    }
    this.checkoutLoading = true;
    this.checkoutError = null;

    const payload = {
      items: this.cartItems.map(i => ({ productId: i.productId, quantity: i.quantity })),
      deliveryAddress: this.deliveryAddress.trim(),
    };

    this.orderService.createOrder(payload).subscribe({
      next: (res) => {
        if (res.success) {
          this.checkoutSuccess = true;
          this.cartService.clearCart();
          this.cdr.detectChanges();
          setTimeout(() => {
            this.closeAll();
            this.router.navigate(['/payment', res.data.id]);
          }, 1200);
        } else {
          this.checkoutError = 'Erreur lors de la commande, veuillez réessayer';
        }
        this.checkoutLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.checkoutError = err?.error?.message || 'Erreur lors de la commande';
        this.checkoutLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  private _resetCheckout(): void {
    this.showCheckout = false;
    this.deliveryAddress = '';
    this.checkoutLoading = false;
    this.checkoutError = null;
    this.checkoutSuccess = false;
  }

  // ── Getters ─────────────────────────────────────────────────────────────────

  get isManager(): boolean {
    return this.currentUser?.role === 'MANAGER' || this.currentUser?.role === 'ADMIN';
  }
  get cartCount(): number { return this.cartItems.reduce((s, i) => s + i.quantity, 0); }
  get cartTotal(): number { return this.cartService.getTotalPrice(); }

  get fullName(): string {
    return this.currentUser ? `${this.currentUser.prenom} ${this.currentUser.nom}` : '';
  }
  get initials(): string {
    return this.currentUser
      ? `${this.currentUser.prenom[0]}${this.currentUser.nom[0]}`.toUpperCase()
      : '';
  }
}
