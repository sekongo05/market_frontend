import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  afterNextRender,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { map, retry } from 'rxjs/operators';
import { environment } from '../environments/environment';
import { CategoryResponse } from './core/models/category.models';
import { PageResponse } from './core/models/common.models';
import { ProductSummaryResponse } from './core/models/product.models';
import { PublicPromoResponse } from './core/models/promo.models';
import { ReviewResponse } from './core/models/review.models';
import { AuthService } from './core/services/auth.service';
import { CartService } from './core/services/cart.service';
import { CategoryService } from './core/services/category.service';
import { DashboardService, PublicStats } from './core/services/dashboard.service';
import { ProductService } from './core/services/product.service';
import { PromoService } from './core/services/promo.service';
import { ReviewService } from './core/services/review.service';
import { SeoService } from './core/services/seo.service';
import { ToastService } from './core/services/toast.service';
import { WebSocketService } from './core/services/websocket.service';
import { WishlistService } from './core/services/wishlist.service';
import { HomeCampaignOfferComponent } from './features/home/components/home-campaign-offer/home-campaign-offer.component';
import { HomeCollectionsComponent } from './features/home/components/home-collections/home-collections.component';
import { HomeHeroComponent } from './features/home/components/home-hero/home-hero.component';
import { HomeLookbookComponent } from './features/home/components/home-lookbook/home-lookbook.component';
import { HomeMaisonComponent } from './features/home/components/home-maison/home-maison.component';
import {
  HomeShowcaseTabsComponent,
  ShowcaseTabKey,
} from './features/home/components/home-showcase-tabs/home-showcase-tabs.component';
import { HomeTestimonialsComponent } from './features/home/components/home-testimonials/home-testimonials.component';

const NEW_PRODUCT_DAYS = 21;

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    HomeHeroComponent,
    HomeCollectionsComponent,
    HomeShowcaseTabsComponent,
    HomeCampaignOfferComponent,
    HomeMaisonComponent,
    HomeTestimonialsComponent,
    HomeLookbookComponent,
  ],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly productService = inject(ProductService);
  private readonly reviewService = inject(ReviewService);
  private readonly categoryService = inject(CategoryService);
  private readonly dashboardService = inject(DashboardService);
  private readonly wsService = inject(WebSocketService);
  private readonly promoService = inject(PromoService);
  private readonly router = inject(Router);
  private readonly seo = inject(SeoService);
  private readonly cartService = inject(CartService);
  private readonly wishlistService = inject(WishlistService);
  private readonly toastService = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  readonly whatsAppUrl = `https://wa.me/${environment.whatsAppNumber}`;

  // ── État réactif immuable (OnPush-safe) ────────────────────────────
  private readonly currentUser = toSignal(this.authService.currentUser$, { initialValue: null });
  readonly isLoggedIn = computed(() => Boolean(this.currentUser()));

  private readonly cartItems = toSignal(this.cartService.cart$, {
    initialValue: this.cartService.cartValue,
  });
  readonly cartProductIds = computed<ReadonlySet<number>>(
    () => new Set(this.cartItems().map(item => item.productId)),
  );

  private readonly rawFavoriteIds = toSignal(
    this.wishlistService.favoriteIds$.pipe(map(ids => new Set<number>(ids))),
    { initialValue: new Set<number>() },
  );
  readonly favoriteIds = computed<ReadonlySet<number>>(() => this.rawFavoriteIds());

  // ── Signaux de données & états sections ────────────────────────────
  readonly categories = signal<CategoryResponse[]>([]);
  readonly categoriesLoading = signal(true);
  readonly categoriesError = signal(false);

  readonly featuredProducts = signal<ProductSummaryResponse[]>([]);
  readonly featuredLoading = signal(true);
  readonly featuredError = signal(false);

  readonly bestsellers = signal<ProductSummaryResponse[]>([]);
  readonly bestsellersLoading = signal(true);
  readonly bestsellersError = signal(false);

  readonly newProducts = signal<ProductSummaryResponse[]>([]);
  readonly discountProducts = signal<ProductSummaryResponse[]>([]);
  readonly newProductsLoading = signal(true);
  readonly newProductsError = signal(false);

  readonly featuredReviews = signal<ReviewResponse[]>([]);
  readonly reviewsLoading = signal(true);
  readonly reviewsError = signal(false);

  readonly publicStats = signal<PublicStats | null>(null);
  readonly statsError = signal(false);

  readonly firstOrderPromo = signal<PublicPromoResponse | null>(null);

  constructor() {
    afterNextRender(() => {
      this.loadCategories();
      this.loadFeatured();
      this.loadBestsellers();
      this.loadProducts();
      this.loadReviews();
      this.loadPublicStats();
      this.loadFirstOrderPromo();
      this.subscribeStockUpdates();
    });
  }

  ngOnInit(): void {
    this.seo.set({
      title: 'Mode, Montres & Lifestyle en Côte d\'Ivoire',
      description: 'SDM STORE : boutique en ligne de mode, montres, bijoux, beauté et lifestyle. Livraison 24–48h partout en Côte d\'Ivoire.',
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'ClothingStore',
        '@id': 'https://sdm-store.shop/#store',
        name: 'SDM STORE',
        url: 'https://sdm-store.shop',
        logo: 'https://sdm-store.shop/icon-512.png',
        image: 'https://sdm-store.shop/icon-512.png',
        description: 'Boutique en ligne de mode, montres, bijoux et lifestyle. Livraison 24–48h en Côte d\'Ivoire.',
        priceRange: '$$',
        currenciesAccepted: 'XOF',
        paymentAccepted: 'Cash, Mobile Money',
        address: {
          '@type': 'PostalAddress',
          addressLocality: 'Abidjan',
          addressRegion: 'Abidjan',
          addressCountry: 'CI',
        },
        contactPoint: {
          '@type': 'ContactPoint',
          contactType: 'customer service',
          availableLanguage: 'French',
        },
        sameAs: [
          'https://facebook.com/sdmstore',
          'https://instagram.com/sdmstore',
          'https://tiktok.com/@sdm_store1',
        ],
        hasMap: 'https://www.google.com/maps/search/SDM+STORE+Abidjan',
      },
    });
  }

  onSearch(query: string): void {
    const trimmed = query.trim();
    if (trimmed) {
      this.router.navigate(['/products'], { queryParams: { search: trimmed } });
    }
  }

  onSelectCategory(slug: string): void {
    this.router.navigate(['/products'], { queryParams: { categorie: slug } });
  }

  onRetryTab(tab: ShowcaseTabKey): void {
    if (tab === 'featured') this.loadFeatured();
    else if (tab === 'new') this.loadProducts();
    else this.loadBestsellers();
  }

  onQuickAddProduct(product: ProductSummaryResponse): void {
    if ((product.variantCount ?? 0) > 0) {
      this.router.navigate(['/products', product.slug]);
      return;
    }
    if (this.cartProductIds().has(product.id)) {
      this.toastService.info('Déjà dans votre panier');
      return;
    }
    this.cartService.addToCart({
      productId: product.id,
      productName: product.name,
      price: product.salePrice ?? product.price,
      quantity: 1,
      imageUrl: product.imageUrl,
      maxStock: product.stock,
    });
    this.toastService.success('Ajouté au panier');
  }

  onToggleFavoriteProduct(product: ProductSummaryResponse): void {
    const added = this.wishlistService.toggle(product.id);
    this.toastService.info(added ? 'Ajouté aux favoris' : 'Retiré des favoris');
  }

  loadCategories(): void {
    this.categoriesLoading.set(true);
    this.categoriesError.set(false);
    this.categoryService.getCategories()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (r) => {
          this.categories.set(r.success && Array.isArray(r.data) ? r.data : []);
          this.categoriesLoading.set(false);
        },
        error: () => {
          this.categoriesError.set(true);
          this.categoriesLoading.set(false);
        },
      });
  }

  loadFeatured(): void {
    this.featuredLoading.set(true);
    this.featuredError.set(false);
    this.productService.getFeaturedProducts(8)
      .pipe(retry({ count: 2, delay: 1000 }), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (r) => {
          this.featuredProducts.set(r.success && Array.isArray(r.data) ? r.data : []);
          this.featuredLoading.set(false);
        },
        error: () => {
          this.featuredError.set(true);
          this.featuredLoading.set(false);
        },
      });
  }

  loadBestsellers(): void {
    this.bestsellersLoading.set(true);
    this.bestsellersError.set(false);
    this.productService.getBestsellers(8)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (r) => {
          this.bestsellers.set(r.success && Array.isArray(r.data) ? r.data : []);
          this.bestsellersLoading.set(false);
        },
        error: () => {
          this.bestsellersError.set(true);
          this.bestsellersLoading.set(false);
        },
      });
  }

  loadProducts(): void {
    this.newProductsLoading.set(true);
    this.newProductsError.set(false);
    this.productService.getProducts({ page: 0, size: 24, sort: 'newest' })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (r) => {
          if (r.success && r.data) {
            const pg = r.data as PageResponse<ProductSummaryResponse>;
            const content = pg.content ?? [];
            this.newProducts.set(content.filter(p => this.isNew(p)).slice(0, 8));
            this.discountProducts.set(
              content.filter(p => Boolean(p.discountPercent && p.discountPercent > 0)).slice(0, 4),
            );
          }
          this.newProductsLoading.set(false);
        },
        error: () => {
          this.newProductsError.set(true);
          this.newProductsLoading.set(false);
        },
      });
  }

  loadPublicStats(): void {
    this.statsError.set(false);
    this.dashboardService.getPublicStats()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (r) => {
          if (r.success && r.data) {
            this.publicStats.set(r.data as PublicStats);
          }
        },
        error: () => {
          this.statsError.set(true);
        },
      });
  }

  loadReviews(): void {
    this.reviewsLoading.set(true);
    this.reviewsError.set(false);
    this.reviewService.getFeaturedReviews()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (r) => {
          this.featuredReviews.set(r.success && Array.isArray(r.data) ? r.data.slice(0, 6) : []);
          this.reviewsLoading.set(false);
        },
        error: () => {
          this.reviewsError.set(true);
          this.reviewsLoading.set(false);
        },
      });
  }

  private loadFirstOrderPromo(): void {
    this.promoService.getActivePromos()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (r) => {
          if (r.success && Array.isArray(r.data)) {
            this.firstOrderPromo.set(r.data.find(p => p.firstOrderOnly) ?? null);
          }
        },
        error: () => {
          // Non bloquant : l'absence de promo d'accueil reste silencieuse
        },
      });
  }

  private subscribeStockUpdates(): void {
    this.wsService.stockUpdate$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(update => {
        const patchStock = (items: ProductSummaryResponse[]) =>
          items.some(p => p.id === update.productId)
            ? items.map(p => (p.id === update.productId ? { ...p, stock: update.stock } : p))
            : items;

        this.newProducts.update(patchStock);
        this.discountProducts.update(patchStock);
        this.featuredProducts.update(patchStock);
        this.bestsellers.update(patchStock);
      });
  }

  private isNew(product: ProductSummaryResponse): boolean {
    if (!product.createdAt) return false;
    return (Date.now() - new Date(product.createdAt).getTime()) / 86400000 <= NEW_PRODUCT_DAYS;
  }
}
