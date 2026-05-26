import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil, timeout } from 'rxjs/operators';

import { CartService, CartItem } from '../../../core/services/cart.service';
import { AuthService } from '../../../core/services/auth.service';
import { OrderService } from '../../../core/services/order.service';
import { PromoService } from '../../../core/services/promo.service';
import { PromoCheckResponse } from '../../../core/models/promo.models';
import { MediaUrlPipe } from '../../../shared/pipes/media-url.pipe';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MediaUrlPipe],
  templateUrl: './checkout.component.html',
})
export class CheckoutComponent implements OnInit, OnDestroy {

  cartItems: CartItem[] = [];
  cartTotal = 0;

  deliveryPhone   = '';
  deliveryZone: 'abidjan' | 'interieur' | '' = '';
  deliveryAddress = '';
  deliveryCity    = '';

  promoCodeInput    = '';
  promoCheckResult: PromoCheckResponse | null = null;
  promoChecking     = false;
  promoError: string | null = null;

  checkoutLoading = false;
  checkoutError: string | null = null;
  checkoutSuccess = false;

  readonly villesInterieur = [
    'Abengourou','Aboisso','Adzopé','Agboville','Bondoukou','Bouaflé','Bouaké','Boundiali','Daloa',
    'Danané','Dimbokro','Divo','Duékoué','Ferkessédougou','Gagnoa','Grand-Bassam','Grand-Lahou',
    'Issia','Jacqueville','Katiola','Korhogo','Lakota','Man','Odienné','San-Pédro','Sassandra',
    'Séguéla','Sinfra','Soubré','Tabou','Tiassalé','Tingrela','Toumodi','Yamoussoukro',
  ];

  private destroy$ = new Subject<void>();

  constructor(
    readonly cartService: CartService,
    private authService: AuthService,
    private orderService: OrderService,
    private promoService: PromoService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.cartService.cart$.pipe(takeUntil(this.destroy$)).subscribe(items => {
      this.cartItems = items;
      this.cartTotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
      if (this.promoCheckResult?.valid) this.checkPromo();
    });

    const user = this.authService.getCurrentUser();
    this.deliveryPhone = user?.phone || '';

    const nav = this.router.getCurrentNavigation();
    const promoFromState = nav?.extras?.state?.['promoCode'];
    if (promoFromState) {
      this.promoCodeInput = promoFromState;
      setTimeout(() => this.checkPromo(), 0);
    }
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  get shippingFee(): number {
    return this.deliveryZone === 'interieur' ? 2000 : (this.deliveryZone === 'abidjan' ? 1500 : 0);
  }

  get discountAmount(): number {
    if (!this.promoCheckResult?.valid) return 0;
    return Math.round(this.cartTotal * (this.promoCheckResult.discountPercent / 100));
  }

  get finalTotal(): number {
    return this.cartTotal - this.discountAmount + this.shippingFee;
  }

  get cartCount(): number {
    return this.cartItems.reduce((s, i) => s + i.quantity, 0);
  }

  checkPromo(): void {
    if (!this.promoCodeInput.trim()) return;
    this.promoChecking = true;
    this.promoError = null;
    this.promoCheckResult = null;
    this.promoService.checkPromo(this.promoCodeInput.trim(), this.cartTotal).subscribe({
      next: r => {
        if (r.success) {
          this.promoCheckResult = r.data;
          if (!r.data.valid) this.promoError = r.data.message;
        }
        this.promoChecking = false;
      },
      error: () => { this.promoError = 'Erreur de vérification'; this.promoChecking = false; },
    });
  }

  removePromo(): void {
    this.promoCodeInput = '';
    this.promoCheckResult = null;
    this.promoError = null;
  }

  placeOrder(): void {
    this.checkoutError = null;

    if (!this.deliveryPhone.trim()) {
      this.checkoutError = 'Veuillez saisir votre numéro de téléphone'; return;
    }
    const phoneDigits = this.deliveryPhone.trim().replace(/^\+225/, '');
    if (!/^[0-9]{10}$/.test(phoneDigits)) {
      this.checkoutError = 'Numéro invalide — 10 chiffres requis (ex: 0700000000)'; return;
    }
    if (!this.deliveryZone) {
      this.checkoutError = 'Veuillez sélectionner une zone de livraison'; return;
    }
    if (this.deliveryZone === 'abidjan' && !this.deliveryAddress.trim()) {
      this.checkoutError = 'Veuillez indiquer le lieu de livraison à Abidjan'; return;
    }
    if (this.deliveryZone === 'interieur' && !this.deliveryCity) {
      this.checkoutError = 'Veuillez sélectionner une ville'; return;
    }

    this.checkoutLoading = true;

    const adresse = this.deliveryZone === 'abidjan'
      ? `Abidjan — ${this.deliveryAddress.trim()}`
      : `Intérieur du pays — ${this.deliveryCity}`;
    const fullAddress = `${adresse} | Tél: ${this.deliveryPhone.trim()}`;

    const payload: any = {
      items: this.cartItems.map(i => ({
        productId: i.productId,
        quantity: i.quantity,
        ...(i.variantId != null ? { variantId: i.variantId } : {}),
      })),
      deliveryAddress: fullAddress,
      deliveryZone: this.deliveryZone === 'interieur' ? 'INTERIOR' : 'ABIDJAN',
    };
    if (this.promoCheckResult?.valid && this.promoCheckResult.code) {
      payload.promoCode = this.promoCheckResult.code;
    }

    this.orderService.createOrder(payload).pipe(timeout(30000)).subscribe({
      next: res => {
        this.checkoutLoading = false;
        if (res.success) {
          this.checkoutSuccess = true;
          this.cartService.clearCart();
          setTimeout(() => this.router.navigate(['/orders']), 2500);
        } else {
          this.checkoutError = 'Erreur lors de la commande, veuillez réessayer';
        }
      },
      error: err => {
        this.checkoutLoading = false;
        this.checkoutError = err?.name === 'TimeoutError'
          ? 'Le serveur met trop de temps à répondre. Veuillez réessayer.'
          : (err?.error?.message || 'Erreur lors de la commande, veuillez réessayer');
      },
    });
  }

  get canConfirm(): boolean {
    if (this.checkoutLoading) return false;
    if (!this.deliveryPhone.trim() || !this.deliveryZone) return false;
    if (this.deliveryZone === 'abidjan' && !this.deliveryAddress.trim()) return false;
    if (this.deliveryZone === 'interieur' && !this.deliveryCity) return false;
    return true;
  }

  formatPrice(n: number): string {
    return n.toLocaleString('fr-FR');
  }
}
