import { Component, OnInit, OnDestroy, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterModule, RouterLinkActive, Router } from '@angular/router';
import { AuthService, CurrentUser } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { ThemeService } from '../../core/services/theme.service';
import { CartService, CartItem } from '../../core/services/cart.service';
import { OrderService } from '../../core/services/order.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, RouterLink, RouterLinkActive],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css'],
})
export class NavbarComponent implements OnInit, OnDestroy {
  currentUser: CurrentUser | null = null;
  unreadNotifications = 0;
  showUserMenu  = false;
  showCart      = false;
  mobileOpen    = false;
  scrolled      = false;
  cartItems: CartItem[] = [];

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
  closeAll():      void { this.showCart = false; this.showUserMenu = false; this.mobileOpen = false; this._resetCheckout(); }

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
            this.router.navigate(['/orders']);
          }, 1800);
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
