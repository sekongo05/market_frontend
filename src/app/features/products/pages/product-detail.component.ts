import {
  Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef,
  AfterViewInit, HostListener
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { MediaUrlPipe } from '../../../shared/pipes/media-url.pipe';
import { Subject, interval, fromEvent, merge } from 'rxjs';
import { takeUntil, switchMap } from 'rxjs/operators';

import { FormsModule } from '@angular/forms';
import { ProductService } from '../../../core/services/product.service';
import { CartService } from '../../../core/services/cart.service';
import { AuthService } from '../../../core/services/auth.service';
import { AuthPromptService } from '../../../core/services/auth-prompt.service';
import { WebSocketService } from '../../../core/services/websocket.service';
import { ReviewService } from '../../../core/services/review.service';
import { WhatsappService } from '../../../core/services/whatsapp.service';
import { SeoService } from '../../../core/services/seo.service';
import { ProductMediaItem, ProductResponse, ProductVariant } from '../../../core/models/product.models';
import { ReviewResponse, ProductRatingResponse } from '../../../core/models/review.models';
import { TooltipDirective } from '../../../shared/directives/tooltip.directive';

export interface GalleryItem {
  url: string;
  type: 'IMAGE' | 'VIDEO';
}



@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, TooltipDirective, MediaUrlPipe],
  templateUrl: './product-detail.component.html',
  styleUrls: ['./product-detail.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductDetailComponent implements OnInit, AfterViewInit, OnDestroy {
  product: ProductResponse | null = null;
  loading = true;
  error: string | null = null;

  // Gallery
  galleryItems: GalleryItem[] = [];
  activeIndex = 0;
  zoomed = false;

  // Related products (from same category)
  relatedProducts: ProductResponse[] = [];

  // Reviews
  reviews: ReviewResponse[] = [];
  productRating: ProductRatingResponse | null = null;
  reviewsLoading = false;
  reviewRating = 0;
  reviewHover = 0;
  reviewComment = '';
  reviewSubmitting = false;
  reviewError: string | null = null;
  myReview: ReviewResponse | null = null;
  editingReview = false;
  canReview = false;

  // Cart state
  quantity = 1;
  addedToCart = false;

  // Variant selection — multi-qty mode (one qty stepper per variant)
  selectedVariant: ProductVariant | null = null;
  variantQty = new Map<number, number>();

  // Cascade selection (variantes dynamiques par catégorie)
  cascadeAttributes: { name: string; type: string }[] = [];
  cascadeSelections: Record<string, string | null> = {};
  cascadeMatchedVariant: ProductVariant | null = null;

  private _currentProductId: number | null = null;
  private destroy$ = new Subject<void>();
  private observer?: IntersectionObserver;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private productService: ProductService,
    private cartService: CartService,
    private authService: AuthService,
    private authPromptService: AuthPromptService,
    private wsService: WebSocketService,
    private reviewService: ReviewService,
    private cdr: ChangeDetectorRef,
    private wa: WhatsappService,
    private seo: SeoService,
  ) {}

  goBack(): void {
    this.router.navigate(['/products']);
  }

  get isManager(): boolean {
    const role = this.authService.getCurrentUser()?.role;
    return role === 'MANAGER' || role === 'ADMIN';
  }

  get isCustomer(): boolean {
    return this.authService.getCurrentUser()?.role === 'CUSTOMER';
  }

  get isLoggedIn(): boolean {
    return this.authService.isAuthenticated();
  }

  get whatsappUrl(): string {
    return this.wa.buildUrl(this.product.slug);
  }

  ngOnInit(): void {
    this.wsService.stockUpdate$
      .pipe(takeUntil(this.destroy$))
      .subscribe(update => {
        if (!this.product || this.product.id !== update.productId) return;
        (this.product as any).stock = update.stock;
        if (update.variantId != null && update.variantStock != null && this.product.variants) {
          const v = this.product.variants.find(v => v.id === update.variantId);
          if (v) (v as any).stock = update.variantStock;
        }
        this.quantity = Math.min(this.quantity, Math.max(1, this.effectiveStock || update.stock));
        this.cdr.detectChanges();
      });

    this.route.paramMap.pipe(
      takeUntil(this.destroy$),
      switchMap(params => {
        const param = params.get('id') ?? '';
        const numId  = Number(param);
        this.loading = true;
        this.error = null;
        this.activeIndex = 0;
        this.cdr.detectChanges();
        // Supporte les deux : ID numérique (/products/42) et slug (/products/montre-luxe)
        return (numId > 0)
          ? this.productService.getProductById(numId)
          : this.productService.getProductBySlug(param);
      })
    ).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.product = response.data;
          this._currentProductId = response.data.id;
          this.wa.context.set({ name: response.data.name, price: response.data.price, id: response.data.id });
          this._autoSelectVariant();
          this._buildGallery();
          this._loadRelated();
          this._loadReviews();
          this._loadRating();
          this._loadCanReview();
          this._updateSeo();
        } else {
          this.error = 'Produit introuvable';
        }
        this.loading = false;
        this.cdr.detectChanges();
        setTimeout(() => this._initScrollReveal(), 0);
      },
      error: () => {
        this.error = 'Produit introuvable';
        this.loading = false;
        this.cdr.detectChanges();
        setTimeout(() => this._initScrollReveal(), 0);
      },
    });

    if (typeof window !== 'undefined') {
      merge(
        interval(30000),
        fromEvent(window, 'focus'),
      ).pipe(takeUntil(this.destroy$)).subscribe(() => {
        if (this._currentProductId) {
          this.productService.getProductById(this._currentProductId).subscribe(response => {
            if (response.success && response.data) {
              this.product = response.data;
              this._buildGallery();
              this._loadRelated();
              this._loadReviews();
              this._loadRating();
              this.cdr.detectChanges();
            }
          });
        }
      });
    }
  }

  ngAfterViewInit(): void { /* observer started after product loads */ }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.observer?.disconnect();
    this.wa.context.set(null);
  }

  // ── Gallery ──────────────────────────────────────────────────────────────

  private _buildGallery(): void {
    if (!this.product) return;

    // ── Priorité 1 : médias réels de l'API ─────────────────────────────────
    if (this.product.media?.length) {
      this.galleryItems = this.product.media.map(m => ({ url: m.url, type: m.mediaType }));
      if (this.product.imageUrl) {
        const alreadyInMedia = this.galleryItems.some(i => i.url === this.product!.imageUrl);
        if (!alreadyInMedia) {
          this.galleryItems.unshift({ url: this.product.imageUrl, type: 'IMAGE' });
        }
      }
    } else {
      // ── Priorité 2 : seulement l'image principale ──────────────────────────
      this.galleryItems = this.product.imageUrl
        ? [{ url: this.product.imageUrl, type: 'IMAGE' as const }]
        : [];
    }

    // ── Ajouter les images des variantes (si pas déjà présentes) ────────────
    if (this.product.variants?.length) {
      for (const v of this.product.variants) {
        if (v.imageUrl && !this.galleryItems.some(i => i.url === v.imageUrl)) {
          this.galleryItems.push({ url: v.imageUrl, type: 'IMAGE' });
        }
      }
    }

    // ── Positionner la galerie sur l'image de la variante auto-sélectionnée ──
    if (this.selectedVariant?.imageUrl) {
      const idx = this.galleryItems.findIndex(g => g.url === this.selectedVariant!.imageUrl);
      if (idx >= 0) this.activeIndex = idx;
    }
  }

  get isCascadeMode(): boolean {
    return this.cascadeAttributes.length > 0;
  }

  get cascadeFilteredVariants(): ProductVariant[] {
    if (!this.product?.variants) return [];
    const sel = this.cascadeSelections;
    return this.product.variants.filter(v => {
      for (const [key, val] of Object.entries(sel)) {
        if (val && v.attributes?.[key] !== val) return false;
      }
      return true;
    });
  }

  cascadeAvailableValues(attrName: string): string[] {
    const values = new Set<string>();
    for (const v of this.cascadeFilteredVariants) {
      const val = v.attributes?.[attrName];
      if (val) values.add(val);
    }
    return [...values];
  }

  selectCascadeAttribute(attrName: string, value: string | null): void {
    this.cascadeSelections = { ...this.cascadeSelections, [attrName]: value };
    // Clear subsequent selections
    let found = false;
    for (const attr of this.cascadeAttributes) {
      if (found) this.cascadeSelections[attr.name] = null;
      if (attr.name === attrName) found = true;
    }
    this.cascadeSelections = { ...this.cascadeSelections };
    // Check if we have a unique match
    const filtered = this.cascadeFilteredVariants;
    if (filtered.length === 1) {
      this.cascadeMatchedVariant = filtered[0];
      this.selectVariant(filtered[0]);
    } else {
      this.cascadeMatchedVariant = null;
      if (filtered.length === 0) this.selectedVariant = null;
    }
    this.cdr.detectChanges();
  }

  clearCascade(): void {
    this.cascadeSelections = {};
    this.cascadeMatchedVariant = null;
    this.cdr.detectChanges();
  }

  private _initCascade(): void {
    const cfg = this.product?.category?.variantConfig;
    if (cfg) {
      try {
        this.cascadeAttributes = JSON.parse(cfg);
        this.cascadeSelections = {};
        this.cascadeMatchedVariant = null;
        for (const attr of this.cascadeAttributes) {
          this.cascadeSelections[attr.name] = null;
        }
        // Auto-select first variant if only one
        const variants = this.product?.variants ?? [];
        if (variants.length === 1) {
          this.cascadeMatchedVariant = variants[0];
          this.selectVariant(variants[0]);
        }
        return;
      } catch { /* invalid JSON, fall through */ }
    }
    this.cascadeAttributes = [];
  }

  private _autoSelectVariant(): void {
    this.variantQty = new Map();
    this._initCascade();
    if (this.isCascadeMode) return;
    if (!this.product?.variants?.length) {
      this.selectedVariant = null;
      return;
    }
    // Gallery sync: highlight first in-stock variant
    this.selectedVariant =
      this.product.variants.find(v => v.stock > 0) ?? this.product.variants[0];
  }

  private _syncVariantFromImage(url: string): void {
    if (!url || !this.product?.variants?.length) return;
    const match = this.product.variants.find(v => v.imageUrl === url);
    if (match) {
      this.selectedVariant = match;
      this.quantity = Math.min(this.quantity, Math.max(1, this.effectiveStock));
    }
  }

  get activeItem(): GalleryItem {
    return this.galleryItems[this.activeIndex] ?? { url: '', type: 'IMAGE' };
  }

  setActive(index: number): void {
    this.activeIndex = index;
    this.zoomed = false;
    this._syncVariantFromImage(this.galleryItems[index]?.url);
    this.cdr.detectChanges();
  }

  private touchStartX = 0;

  onTouchStart(e: TouchEvent): void {
    this.touchStartX = e.changedTouches[0].screenX;
  }

  onTouchEnd(e: TouchEvent): void {
    const dx = e.changedTouches[0].screenX - this.touchStartX;
    if (Math.abs(dx) < 40) return;
    if (dx < 0) this.nextImage(); else this.prevImage();
  }

  prevImage(): void {
    this.activeIndex = (this.activeIndex - 1 + this.galleryItems.length) % this.galleryItems.length;
    this.zoomed = false;
    this._syncVariantFromImage(this.galleryItems[this.activeIndex]?.url);
    this.cdr.detectChanges();
  }

  nextImage(): void {
    this.activeIndex = (this.activeIndex + 1) % this.galleryItems.length;
    this.zoomed = false;
    this._syncVariantFromImage(this.galleryItems[this.activeIndex]?.url);
    this.cdr.detectChanges();
  }

  toggleZoom(): void {
    this.zoomed = !this.zoomed;
    this.cdr.detectChanges();
  }

  @HostListener('document:keydown.arrowleft')
  onLeft(): void { if (this.product) this.prevImage(); }

  @HostListener('document:keydown.arrowright')
  onRight(): void { if (this.product) this.nextImage(); }

  @HostListener('document:keydown.escape')
  onEsc(): void { this.zoomed = false; this.cdr.detectChanges(); }

  // ── Cart ─────────────────────────────────────────────────────────────────

  // ── Variant selection ─────────────────────────────────────────────────────

  get hasVariants(): boolean {
    return (this.product?.variants?.length ?? 0) > 0;
  }

  get allVariantsOutOfStock(): boolean {
    if (!this.hasVariants) return false;
    return this.product!.variants!.every(v => v.stock === 0);
  }

  get effectiveStock(): number {
    if (!this.product) return 0;
    if (this.hasVariants) {
      // Total stock remaining across all variants minus what's already in the qty map
      return this.product.variants!.reduce((sum, v) => sum + Math.max(0, v.stock - this.getVariantQty(v.id)), 0);
    }
    return this.product.stock;
  }

  selectVariant(variant: ProductVariant): void {
    this.selectedVariant = variant;
    if (variant.imageUrl) {
      const idx = this.galleryItems.findIndex(g => g.url === variant.imageUrl);
      if (idx >= 0) this.activeIndex = idx;
    }
    this.cdr.detectChanges();
  }

  getVariantQty(variantId: number): number {
    return this.variantQty.get(variantId) ?? 0;
  }

  adjustVariantQty(variant: ProductVariant, delta: number): void {
    const current = this.getVariantQty(variant.id);
    const next = Math.max(0, Math.min(current + delta, variant.stock));
    if (next === 0) {
      this.variantQty.delete(variant.id);
    } else {
      this.variantQty.set(variant.id, next);
    }
    this.cdr.detectChanges();
  }

  get totalSelectedQty(): number {
    let total = 0;
    this.variantQty.forEach(q => total += q);
    return total;
  }

  get totalSelectedPrice(): number {
    if (!this.product) return 0;
    const unitPrice = this.product.salePrice ?? this.product.price;
    return unitPrice * this.totalSelectedQty;
  }

  get formattedTotalPrice(): string {
    return new Intl.NumberFormat('fr-FR').format(this.totalSelectedPrice);
  }

  // ── Cart ─────────────────────────────────────────────────────────────────

  setQuantity(q: number): void {
    if (!this.product) return;
    this.quantity = Math.max(1, Math.min(q, this.product.stock));
    this.cdr.detectChanges();
  }

  addToCart(): void {
    if (!this.product) return;

    if (this.isCascadeMode) {
      if (!this.cascadeMatchedVariant || this.quantity === 0) return;
      const variant = this.cascadeMatchedVariant;
      this.cartService.addToCart({
        productId: this.product.id,
        productName: this.product.name,
        price: this.product.salePrice ?? this.product.price,
        quantity: this.quantity,
        imageUrl: variant.imageUrl || this.product.imageUrl,
        maxStock: variant.stock,
        variantId: variant.id,
        selectedColor: variant.variantName,
        selectedColorHex: variant.colorHex,
      });
      this.addedToCart = true;
      this.quantity = 1;
      this.cdr.detectChanges();
      setTimeout(() => { this.addedToCart = false; this.cdr.detectChanges(); }, 2500);
    } else if (this.hasVariants) {
      if (this.totalSelectedQty === 0) return;
      const unitPrice = this.product.salePrice ?? this.product.price;
      let added = false;
      this.variantQty.forEach((qty, variantId) => {
        const variant = this.product!.variants!.find(v => v.id === variantId);
        if (!variant) return;
        this.cartService.addToCart({
          productId: this.product!.id,
          productName: this.product!.name,
          price: unitPrice,
          quantity: qty,
          imageUrl: variant.imageUrl || this.product!.imageUrl,
          maxStock: variant.stock,
          variantId: variant.id,
          selectedColor: variant.variantName,
          selectedColorHex: variant.colorHex,
        });
        added = true;
      });
      if (added) {
        this.addedToCart = true;
        this.variantQty = new Map();
        this.cdr.detectChanges();
        setTimeout(() => { this.addedToCart = false; this.cdr.detectChanges(); }, 2500);
      }
    } else {
      if (this.product.stock === 0) return;
      this.cartService.addToCart({
        productId: this.product.id,
        productName: this.product.name,
        price: this.product.salePrice ?? this.product.price,
        quantity: this.quantity,
        imageUrl: this.product.imageUrl,
        maxStock: this.product.stock,
      });
      this.addedToCart = true;
      this.cdr.detectChanges();
      setTimeout(() => { this.addedToCart = false; this.cdr.detectChanges(); }, 2500);
    }
  }

  // ── Related products ─────────────────────────────────────────────────────

  private _loadRelated(): void {
    if (!this.product) return;
    const params = { page: 0, size: 8, categoryId: this.product.category?.id };
    this.productService.getProducts(params).subscribe({
      next: (res) => {
        if (res.success) {
          const all = (res.data as any)?.content ?? [];
          this.relatedProducts = all
            .filter((p: ProductResponse) => p.id !== this.product!.id)
            .slice(0, 4);
        }
        this.cdr.detectChanges();
      },
      error: () => this.cdr.detectChanges(),
    });
  }

  addRelatedToCart(product: ProductResponse): void {
    this.cartService.addToCart({
      productId: product.id,
      productName: product.name,
      price: product.salePrice ?? product.price,
      quantity: 1,
      imageUrl: product.imageUrl,
      maxStock: product.stock,
    });
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  get formattedPrice(): string {
    if (!this.product) return '';
    const p = (this.product.salePrice ?? this.product.price);
    return new Intl.NumberFormat('fr-FR').format(p);
  }

  get formattedOriginalPrice(): string {
    if (!this.product || !this.product.discountPercent) return '';
    return new Intl.NumberFormat('fr-FR').format(this.product.price);
  }

  get hasDiscount(): boolean {
    return !!this.product?.discountPercent && this.product.discountPercent > 0;
  }

  get stockLabel(): string {
    if (!this.product) return '';
    if (this.hasVariants) {
      const total = this.product.variants!.reduce((s, v) => s + v.stock, 0);
      if (total === 0) return 'Épuisé';
      return 'En stock';
    }
    const s = this.product.stock;
    if (s === 0) return 'Épuisé';
    return 'En stock';
  }

  get stockColor(): string {
    if (!this.product) return '#9ca3af';
    if (this.hasVariants) {
      const total = this.product.variants!.reduce((s, v) => s + v.stock, 0);
      if (total === 0) return '#f87171';
      if (total <= 3) return '#fb923c';
      return '#4ade80';
    }
    const s = this.product.stock;
    if (s === 0) return '#f87171';
    if (s <= 3) return '#fb923c';
    return '#4ade80';
  }



  private _updateSeo(): void {
    if (!this.product) return;
    const p = this.product;
    const price = p.salePrice ?? p.price;
    const slug = p.slug ?? p.id;
    const description = p.description
      ? p.description.slice(0, 160)
      : `Achetez ${p.name} sur SDM STORE. Livraison rapide en Côte d'Ivoire.`;

    const rating = this.productRating;

    this.seo.set({
      title: p.name,
      description,
      image: p.imageUrl || undefined,
      url: `/products/${slug}`,
      type: 'product',
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: p.name,
        description: p.description || description,
        image: p.imageUrl,
        sku: String(p.id),
        brand: { '@type': 'Brand', name: 'SDM STORE' },
        offers: {
          '@type': 'Offer',
          url: `https://sdm-store.shop/products/${slug}`,
          priceCurrency: 'XOF',
          price: price,
          availability: p.stock > 0
            ? 'https://schema.org/InStock'
            : 'https://schema.org/OutOfStock',
          seller: { '@type': 'Organization', name: 'SDM STORE' },
        },
        ...(rating && rating.totalReviews > 0 ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: rating.averageRating,
            reviewCount: rating.totalReviews,
            bestRating: 5,
            worstRating: 1,
          },
        } : {}),
      },
    });
  }

  private _initScrollReveal(): void {
    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            e.target.classList.add('in-view');
            this.observer?.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    document.querySelectorAll('.scroll-reveal').forEach(el => this.observer!.observe(el));
  }

  // ── Reviews ──────────────────────────────────────────────────────────────

  private _loadReviews(): void {
    if (!this.product) return;
    this.reviewsLoading = true;
    this.reviewService.getProductReviews(this.product.id, 0, 20).subscribe({
      next: (res) => {
        if (res.success) {
          this.reviews = (res.data as any)?.content ?? [];
          const uid = this.authService.getCurrentUser()?.id;
          this.myReview = uid ? (this.reviews.find(r => r.userId === uid) ?? null) : null;
        }
        this.reviewsLoading = false;
        this.cdr.detectChanges();
      },
      error: () => { this.reviewsLoading = false; this.cdr.detectChanges(); }
    });
  }

  private _loadCanReview(): void {
    if (!this.product || !this.isCustomer) return;
    this.reviewService.canReviewProduct(this.product.id).subscribe({
      next: (res) => { this.canReview = res.success && !!res.data; this.cdr.detectChanges(); },
      error: () => { this.canReview = false; }
    });
  }

  private _loadRating(): void {
    if (!this.product) return;
    this.reviewService.getProductRating(this.product.id).subscribe({
      next: (res) => {
        if (res.success) {
          this.productRating = res.data;
          this._updateSeo();
          this.cdr.detectChanges();
        }
      },
      error: (err) => { console.error('Failed to load rating', err); }
    });
  }

  setReviewRating(r: number): void { this.reviewRating = r; this.cdr.detectChanges(); }

  submitReview(): void {
    if (!this.product || this.reviewRating === 0) return;
    this.reviewSubmitting = true;
    this.reviewError = null;
    const payload = { productId: this.product.id, rating: this.reviewRating, comment: this.reviewComment.trim() || undefined };
    const obs$ = (this.editingReview && this.myReview)
      ? this.reviewService.updateReview(this.myReview.id, payload)
      : this.reviewService.createReview(payload);
    obs$.subscribe({
      next: () => {
        this.reviewRating = 0;
        this.reviewComment = '';
        this.editingReview = false;
        this.reviewSubmitting = false;
        this._loadReviews();
        this._loadRating();
      },
      error: (err) => {
        this.reviewError = err?.error?.message || 'Erreur lors de la publication';
        this.reviewSubmitting = false;
        this.cdr.detectChanges();
      }
    });
  }

  deleteMyReview(): void {
    if (!this.myReview) return;
    this.reviewService.deleteReview(this.myReview.id).subscribe({
      next: () => { this.myReview = null; this.editingReview = false; this._loadReviews(); this._loadRating(); },
      error: (err) => { console.error('Failed to delete review', err); }
    });
  }

  startEditReview(): void {
    if (!this.myReview) return;
    this.reviewRating = this.myReview.rating;
    this.reviewComment = this.myReview.comment ?? '';
    this.editingReview = true;
    this.cdr.detectChanges();
  }

  cancelEditReview(): void {
    this.editingReview = false;
    this.reviewRating = 0;
    this.reviewComment = '';
    this.reviewError = null;
    this.cdr.detectChanges();
  }

  reviewInitials(name: string): string {
    return name.split(' ').map(n => n[0] ?? '').join('').slice(0, 2).toUpperCase();
  }

  starsRange = [1, 2, 3, 4, 5];
}
