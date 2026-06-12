import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterModule, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { TooltipDirective } from '../directives/tooltip.directive';
import { SmartPopupDirective } from '../directives/smart-popup.directive';
import { AuthService, CurrentUser } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { NotificationTemplateService, NotifTemplate } from '../../core/services/notification-template.service';
import { NotifBodyPipe } from '../pipes/notif-body.pipe';
import { MediaUrlPipe } from '../pipes/media-url.pipe';
import { NotificationResponse } from '../../core/models/notification.models';
import { NotificationType } from '../../core/models/common.models';
import { AuthPromptService } from '../../core/services/auth-prompt.service';
import { ThemeService } from '../../core/services/theme.service';
import { CartService, CartItem } from '../../core/services/cart.service';
import { PromoService } from '../../core/services/promo.service';
import { ToastService } from '../../core/services/toast.service';
import { WebSocketService } from '../../core/services/websocket.service';
import { OrderService } from '../../core/services/order.service';
import { PublicPromoResponse } from '../../core/models/promo.models';
import { PageResponse } from '../../core/models/common.models';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { SdmLogoComponent } from './logo.component';
import { ScrollLockService } from '../../core/services/scroll-lock.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, RouterLink, RouterLinkActive, TooltipDirective, SmartPopupDirective, NotifBodyPipe, MediaUrlPipe, SdmLogoComponent],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavbarComponent implements OnInit, OnDestroy {
  currentUser: CurrentUser | null = null;
  unreadNotifications  = 0;
  pendingOrdersCount   = 0;
  showUserMenu         = false;
  showCart           = false;
  showNotifications  = false;
  mobileOpen          = false;
  mobileSearchOpen    = false;
  mobileSearchQuery   = '';
  scrolled            = false;
  cartItems: CartItem[] = [];
  notifications: NotificationResponse[] = [];
  notificationsLoading = false;
  selectedNotification: NotificationResponse | null = null;

  activePromos: PublicPromoResponse[] = [];

  reviewRequestBanner: { subject: string; products: { slug: string; name: string }[] } | null = null;
  private reviewDismissTimer?: ReturnType<typeof setTimeout>;
  isBackoffice = false;

  cartToast: CartItem | null = null;
  private cartToastTimer?: ReturnType<typeof setTimeout>;

  private swipeStartY = 0;
  private swipeCurrentY = 0;
  private swipeDrawerEl: HTMLElement | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    private notificationService: NotificationService,
    readonly notifTemplate: NotificationTemplateService,
    private authPromptService: AuthPromptService,
    private promoService: PromoService,
    private toastService: ToastService,
    private router: Router,
    readonly themeService: ThemeService,
    readonly cartService: CartService,
    private cdr: ChangeDetectorRef,
    private scrollLock: ScrollLockService,
    private webSocketService: WebSocketService,
    private orderService: OrderService,
  ) {}

  getTemplate(type: NotificationType): NotifTemplate {
    return this.notifTemplate.get(type);
  }

  @HostListener('window:scroll')
  onScroll(): void {
    const isScrolled = window.scrollY > 20;
    if (isScrolled !== this.scrolled) {
      this.scrolled = isScrolled;
      this.cdr.detectChanges();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.mobileSearchOpen) { this.mobileSearchOpen = false; this.mobileSearchQuery = ''; return; }
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
      this._syncBodyScroll();
      this.cdr.detectChanges();
    }
    if (this.showUserMenu && !target.closest('[data-user-menu]')) {
      this.showUserMenu = false;
      this.cdr.detectChanges();
    }
  }

  ngOnInit(): void {
    const url = this.router.url;
    this.isBackoffice = url.startsWith('/manager') || url.startsWith('/admin');

    this.router.events
      .pipe(takeUntil(this.destroy$))
      .subscribe(event => {
        if (event instanceof NavigationEnd) {
          const next = event.urlAfterRedirects;
          this.isBackoffice = next.startsWith('/manager') || next.startsWith('/admin');
          this.cdr.detectChanges();
        }
      });

    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.currentUser = user;
        if (user) {
          this.loadUnreadCount();
          if (user.role === 'ADMIN' || user.role === 'MANAGER') {
            this._loadPendingOrdersCount();
          }
        }
        this.cdr.detectChanges();
      });

    this.cartService.cart$
      .pipe(takeUntil(this.destroy$))
      .subscribe(items => { this.cartItems = items; this.cdr.detectChanges(); });

    this.cartService.lastAdded$
      .pipe(takeUntil(this.destroy$))
      .subscribe(item => this._showCartToast(item));

    this.webSocketService.notification$
      .pipe(takeUntil(this.destroy$))
      .subscribe(notif => {
        this.unreadNotifications++;
        if (this.showNotifications) this.loadNotifications();
        if (notif.type === 'REVIEW_REQUEST' && notif.products?.length) {
          this._showReviewBanner(notif.subject, notif.products);
        }
        this.cdr.detectChanges();
      });

    this.webSocketService.orderEvent$
      .pipe(takeUntil(this.destroy$))
      .subscribe(event => {
        this.pendingOrdersCount = event.pendingCount;
        this.cdr.detectChanges();
      });
  }

  private _showReviewBanner(subject: string, products: { slug: string; name: string }[]): void {
    clearTimeout(this.reviewDismissTimer);
    this.reviewRequestBanner = { subject, products };
    this.cdr.detectChanges();
    this.reviewDismissTimer = setTimeout(() => {
      this.reviewRequestBanner = null;
      this.cdr.detectChanges();
    }, 30000);
  }

  dismissReviewBanner(): void {
    clearTimeout(this.reviewDismissTimer);
    this.reviewRequestBanner = null;
    this.cdr.detectChanges();
  }

  ngOnDestroy(): void {
    clearTimeout(this.reviewDismissTimer);
    clearTimeout(this.cartToastTimer);
    this.scrollLock.forceUnlock();
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggleCart():    void {
    this.showCart = !this.showCart;
    this.showUserMenu = false;
    this.showNotifications = false;
    this.mobileOpen = false;
    if (this.showCart) { this.scrollLock.lock(); } else { this.scrollLock.forceUnlock(); }
    if (this.showCart) this._loadActivePromos();
    if (this.showCart) setTimeout(() => document.getElementById('cart-drawer-body')?.scrollTo(0, 0), 0);
  }
  toggleUserMenu():void { this.showUserMenu = !this.showUserMenu; this.showCart = false; this.showNotifications = false; }
  toggleMobile():  void {
    this.mobileOpen = !this.mobileOpen;
    this.showCart = false; this.showUserMenu = false; this.showNotifications = false;
    this._syncBodyScroll();
  }
  closeAll():      void {
    this.showCart = false; this.showUserMenu = false;
    this.showNotifications = false; this.mobileOpen = false;
    this.mobileSearchOpen = false; this.mobileSearchQuery = '';
    this.scrollLock.forceUnlock();
  }

  toggleMobileSearch(): void {
    this.mobileSearchOpen = !this.mobileSearchOpen;
    if (!this.mobileSearchOpen) { this.mobileSearchQuery = ''; return; }
    this.showCart = false; this.showNotifications = false; this.mobileOpen = false;
    this._syncBodyScroll();
    // Focus après la fin de l'animation (évite que le clavier iOS masque l'input)
    setTimeout(() => {
      (document.getElementById('mobile-search-input') as HTMLInputElement | null)?.focus();
    }, 280);
  }

  submitMobileSearch(): void {
    const q = this.mobileSearchQuery.trim();
    this.mobileSearchOpen = false;
    this.mobileSearchQuery = '';
    if (q) this.router.navigate(['/products'], { queryParams: { search: q } });
    else   this.router.navigate(['/products']);
  }

  toggleNotifications(): void {
    this.showNotifications = !this.showNotifications;
    this.showCart = false;
    this.showUserMenu = false;
    if (!this.showNotifications) this.selectedNotification = null;
    if (this.showNotifications && this.notifications.length === 0) {
      this.loadNotifications();
    }
    this._syncBodyScroll();
    this.cdr.detectChanges();
  }

  private _syncBodyScroll(): void {
    const locked = this.showCart || this.mobileOpen || this.showNotifications;
    if (locked) { this.scrollLock.lock(); } else { this.scrollLock.forceUnlock(); }
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

  private _extractOrderNumber(notif: NotificationResponse): string | null {
    const m = notif.subject.match(/\b(?:CMD|ORD)[-\s][A-Z0-9-]+\b/i);
    if (m) return m[0].replace(/\s+/, '-');
    return notif.subject.match(/(\b[A-Z0-9][A-Z0-9-]{3,}\b)$/i)?.[1] ?? null;
  }

  getNotificationLink(notif: NotificationResponse): string | null {
    const orderTypes: NotificationType[] = [
      NotificationType.ORDER_CREATED,
      NotificationType.ORDER_CONFIRMED,
      NotificationType.ORDER_CANCELLED,
      NotificationType.ORDER_STATUS_CHANGED,
      NotificationType.DELIVERY_UPDATE,
      NotificationType.CARRIER_ASSIGNED,
      NotificationType.RETURN_REQUESTED,
      NotificationType.RETURN_DECIDED,
    ];
    if (!orderTypes.includes(notif.type)) return null;
    const role = this.currentUser?.role;
    const base = role === 'ADMIN' ? '/admin/orders' : role === 'MANAGER' ? '/manager/orders' : '/orders';
    const order = this._extractOrderNumber(notif);
    return order ? `${base}?order=${order}` : base;
  }

  navigateFromNotif(notif: NotificationResponse): void {
    const link = this.getNotificationLink(notif);
    if (!link) return;
    this.closeAll();
    this.router.navigateByUrl(link);
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
    const name = this.currentUser?.prenom ?? '';
    this.authService.logout();
    this.closeAll();
    this.toastService.info(`À bientôt${name ? ' ' + name : ''} !`);
    this.router.navigate(['/']);
  }

  loadUnreadCount(): void {
    this.notificationService.getUnreadCount()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: r => { if (r.success) this.unreadNotifications = r.data.count; },
        error: (err) => { console.error('Failed to load unread count', err); },
      });
  }

  // ── Checkout ────────────────────────────────────────────────────────────────

  goToCheckout(promoCode?: string): void {
    if (!this.authService.isAuthenticated()) {
      this.showCart = false;
      this.authPromptService.show();
      return;
    }
    this.showCart = false;
    this.scrollLock.forceUnlock();
    this.cdr.detectChanges();
    this.router.navigate(['/checkout'], promoCode ? { state: { promoCode } } : {});
  }

  private _loadActivePromos(): void {
    this.promoService.getActivePromos()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (r) => {
          if (r.success) { this.activePromos = r.data; }
          this.cdr.detectChanges();
        },
        error: (err) => { console.error('Failed to load promos', err); },
      });
  }

  private _loadPendingOrdersCount(): void {
    this.orderService.getAllOrders({ page: 0, size: 1, status: 'PENDING' as any })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (r) => {
          if (r.success) {
            this.pendingOrdersCount = (r.data as PageResponse<any>).totalElements;
            this.cdr.detectChanges();
          }
        },
        error: (err) => { console.error('Failed to load pending orders count', err); },
      });
  }

  applyPromoFromBadge(code: string): void {
    this.goToCheckout(code);
  }

  // ── Cart toast ──────────────────────────────────────────────────────────────

  private _showCartToast(item: CartItem): void {
    if (this.showCart) return;
    clearTimeout(this.cartToastTimer);
    this.cartToast = item;
    this.cdr.detectChanges();
    this.cartToastTimer = setTimeout(() => {
      this.cartToast = null;
      this.cdr.detectChanges();
    }, 2800);
  }

  // ── Swipe to close cart ─────────────────────────────────────────────────────

  onSwipeStart(e: TouchEvent): void {
    this.swipeStartY = e.touches[0].clientY;
    this.swipeCurrentY = e.touches[0].clientY;
    this.swipeDrawerEl = (e.currentTarget as HTMLElement).closest('.cart-drawer') as HTMLElement;
    if (this.swipeDrawerEl) this.swipeDrawerEl.style.transition = 'none';
  }

  onSwipeMove(e: TouchEvent): void {
    this.swipeCurrentY = e.touches[0].clientY;
    const delta = this.swipeCurrentY - this.swipeStartY;
    if (delta > 0 && this.swipeDrawerEl) {
      this.swipeDrawerEl.style.transform = `translateY(${Math.min(delta, 350)}px)`;
      this.swipeDrawerEl.style.opacity = `${Math.max(0.3, 1 - delta / 300)}`;
    }
  }

  onSwipeEnd(): void {
    const delta = this.swipeCurrentY - this.swipeStartY;
    if (this.swipeDrawerEl) {
      this.swipeDrawerEl.style.transition = '';
      this.swipeDrawerEl.style.transform = '';
      this.swipeDrawerEl.style.opacity = '';
    }
    this.swipeDrawerEl = null;
    if (delta > 90) {
      this.showCart = false;
      this.scrollLock.forceUnlock();
      this.cdr.detectChanges();
    }
  }

  // ── Getters ─────────────────────────────────────────────────────────────────

  get isManager(): boolean {
    return this.currentUser?.role === 'MANAGER' || this.currentUser?.role === 'ADMIN';
  }
  get cartCount(): number { return this.cartItems.reduce((s, i) => s + i.quantity, 0); }
  get cartTotal(): number { return this.cartService.getTotalPrice(); }
  get cartPromos(): PublicPromoResponse[] {
    return this.activePromos.filter(p => p.firstOrderOnly);
  }

  get fullName(): string {
    return this.currentUser ? `${this.currentUser.prenom} ${this.currentUser.nom}` : '';
  }
  get initials(): string {
    return this.currentUser
      ? `${this.currentUser.prenom[0]}${this.currentUser.nom[0]}`.toUpperCase()
      : '';
  }
}
