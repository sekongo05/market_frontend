import { Component, OnInit, OnDestroy, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterModule, RouterLinkActive, Router } from '@angular/router';
import { TooltipDirective } from '../directives/tooltip.directive';
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
import { OrderService } from '../../core/services/order.service';
import { PromoService } from '../../core/services/promo.service';
import { PromoCheckResponse, PublicPromoResponse } from '../../core/models/promo.models';
import { Subject } from 'rxjs';
import { LogoComponent } from './logo.component';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, RouterLink, RouterLinkActive, TooltipDirective, NotifBodyPipe, MediaUrlPipe, LogoComponent],
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
  pendingPaymentCount = 0;
  notifications: NotificationResponse[] = [];
  notificationsLoading = false;
  selectedNotification: NotificationResponse | null = null;

  // Checkout flow
  showCheckout    = false;
  deliveryAddress = '';
  deliveryPhone   = '';
  deliveryZone: 'abidjan' | 'interieur' | '' = '';
  deliveryCity    = '';
  checkoutLoading = false;
  checkoutError: string | null = null;
  promoCodeInput = '';
  promoCheckResult: PromoCheckResponse | null = null;
  promoChecking = false;
  promoError: string | null = null;
  activePromos: PublicPromoResponse[] = [];
  promosLoaded = false;

  readonly villesInterieur = [
    'Abengourou', 'Aboisso', 'Adzopé', 'Agboville', 'Agnibilékrou',
    'Bangolo', 'Biankouma', 'Bocanda', 'Bondoukou', 'Bongouanou',
    'Bouaflé', 'Bouaké', 'Boundiali', 'Dabakala', 'Daloa',
    'Danané', 'Daoukro', 'Dimbokro', 'Divo', 'Duékoué',
    'Ferkessédougou', 'Gagnoa', 'Grand-Bassam', 'Grand-Lahou', 'Guiglo',
    'Issia', 'Jacqueville', 'Katiola', 'Korhogo', 'Lakota',
    'Man', 'Mankono', 'Mbahiakro', 'Odienné', 'Oumé',
    'Sakassou', 'San-Pédro', 'Sassandra', 'Séguéla', 'Sinfra',
    'Soubré', 'Tabou', 'Tiassalé', 'Tingrela', 'Touba',
    'Toumodi', 'Vavoua', 'Yamoussoukro', 'Zuenoula',
  ];
  checkoutSuccess = false;

  private destroy$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    private notificationService: NotificationService,
    readonly notifTemplate: NotificationTemplateService,
    private authPromptService: AuthPromptService,
    private orderService: OrderService,
    private promoService: PromoService,
    private router: Router,
    readonly themeService: ThemeService,
    readonly cartService: CartService,
    private cdr: ChangeDetectorRef
  ) {}

  getTemplate(type: NotificationType): NotifTemplate {
    return this.notifTemplate.get(type);
  }

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

    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        if (user && user.role === 'CUSTOMER') {
          this.orderService.refreshPendingCount();
        } else {
          this.orderService.clearPendingCount();
        }
      });

    this.orderService.pendingPaymentCount$
      .pipe(takeUntil(this.destroy$))
      .subscribe(count => {
        this.pendingPaymentCount = count;
        this.cdr.detectChanges();
      });

    if (this.currentUser) this.loadUnreadCount();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggleTheme():   void { this.themeService.toggle(); this.cdr.detectChanges(); }
  toggleCart():    void {
    this.showCart = !this.showCart;
    this.showUserMenu = false;
    this.showNotifications = false;
    this.mobileOpen = false;
    if (this.showCart && !this.promosLoaded) this._loadActivePromos();
  }
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
    this.orderService.clearPendingCount();
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
    if (!this.authService.isAuthenticated()) {
      this.showCart = false;
      this.authPromptService.show();
      return;
    }
    this.showCheckout = true;
    this.deliveryAddress = '';
    this.deliveryPhone   = '';
    this.deliveryZone    = '';
    this.deliveryCity    = '';
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
    if (!this.deliveryPhone.trim()) {
      this.checkoutError = 'Veuillez saisir votre numéro de téléphone';
      this.cdr.detectChanges();
      return;
    }
    if (!this.deliveryZone) {
      this.checkoutError = 'Veuillez sélectionner une zone de livraison';
      this.cdr.detectChanges();
      return;
    }
    if (this.deliveryZone === 'abidjan' && !this.deliveryAddress.trim()) {
      this.checkoutError = 'Veuillez indiquer le lieu de livraison à Abidjan';
      this.cdr.detectChanges();
      return;
    }
    if (this.deliveryZone === 'interieur' && !this.deliveryCity) {
      this.checkoutError = 'Veuillez sélectionner une ville';
      this.cdr.detectChanges();
      return;
    }
    this.checkoutLoading = true;
    this.checkoutError = null;

    const adresse = this.deliveryZone === 'abidjan'
      ? `Abidjan — ${this.deliveryAddress.trim()}`
      : `Intérieur du pays — ${this.deliveryCity}`;
    const fullAddress = `${adresse} | Tél: ${this.deliveryPhone.trim()}`;
    const payload: any = {
      items: this.cartItems.map(i => ({ productId: i.productId, quantity: i.quantity })),
      deliveryAddress: fullAddress,
    };
    if (this.promoCheckResult?.valid && this.promoCheckResult.code) {
      payload.promoCode = this.promoCheckResult.code;
    }

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

  private _loadActivePromos(): void {
    this.promoService.getActivePromos()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (r) => {
          if (r.success) { this.activePromos = r.data; this.promosLoaded = true; }
          this.cdr.detectChanges();
        },
        error: () => {},
      });
  }

  applyPromoFromBadge(code: string): void {
    this.promoCodeInput = code;
    this.checkPromo();
  }

  checkPromo(): void {
    if (!this.promoCodeInput.trim()) return;
    this.promoChecking = true;
    this.promoError = null;
    this.promoCheckResult = null;
    this.promoService.checkPromo(this.promoCodeInput.trim(), this.cartTotal).subscribe({
      next: (r) => {
        if (r.success) {
          this.promoCheckResult = r.data;
          if (!r.data.valid) this.promoError = r.data.message;
        }
        this.promoChecking = false;
        this.cdr.detectChanges();
      },
      error: () => { this.promoError = 'Erreur de vérification'; this.promoChecking = false; this.cdr.detectChanges(); },
    });
  }

  removePromo(): void {
    this.promoCodeInput = '';
    this.promoCheckResult = null;
    this.promoError = null;
    this.cdr.detectChanges();
  }

  private _resetCheckout(): void {
    this.showCheckout = false;
    this.deliveryAddress = '';
    this.deliveryPhone   = '';
    this.deliveryZone    = '';
    this.deliveryCity    = '';
    this.checkoutLoading = false;
    this.checkoutError = null;
    this.checkoutSuccess = false;
    this.promoCodeInput = '';
    this.promoCheckResult = null;
    this.promoError = null;
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
