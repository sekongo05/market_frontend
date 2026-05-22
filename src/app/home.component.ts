import { Component, AfterViewInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from './core/services/auth.service';
import { ProductService } from './core/services/product.service';
import { ReviewService } from './core/services/review.service';
import { CategoryService } from './core/services/category.service';
import { DashboardService, PublicStats } from './core/services/dashboard.service';
import { WebSocketService } from './core/services/websocket.service';
import { SeoService } from './core/services/seo.service';
import { MediaUrlPipe } from './shared/pipes/media-url.pipe';
import { ProductResponse } from './core/models/product.models';
import { ReviewResponse } from './core/models/review.models';
import { CategoryResponse } from './core/models/category.models';
import { PageResponse } from './core/models/common.models';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, MediaUrlPipe],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent implements AfterViewInit, OnDestroy {
  currentUser$;

  categories: CategoryResponse[] = [];
  featuredProducts: ProductResponse[] = [];
  bestsellers: ProductResponse[] = [];
  newProducts: ProductResponse[] = [];
  discountProducts: ProductResponse[] = [];
  featuredReviews: ReviewResponse[] = [];

  categoriesLoading   = true;
  featuredLoading     = true;
  bestsellersLoading  = true;
  newProductsLoading  = true;
  reviewsLoading      = true;

  statProducts   = 0;
  statCategories = 0;
  statClients    = 0;
  statReviews    = 0;
  statAvgRating  = 0;
  publicStats: PublicStats | null = null;

  searchQuery = '';

  private _observer?: IntersectionObserver;
  private _statsAnimated = false;
  private destroy$ = new Subject<void>();

  readonly steps = [
    {
      n: '01',
      title: 'Choisissez vos articles',
      desc: 'Parcourez notre catalogue et ajoutez vos coups de cœur au panier.',
      icon: 'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z',
    },
    {
      n: '02',
      title: 'Passez commande',
      desc: 'Indiquez votre adresse, confirmez et recevez la validation de notre équipe.',
      icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
    },
    {
      n: '03',
      title: 'Recevez chez vous',
      desc: '24–48h à Abidjan, 72h max partout en Côte d\'Ivoire. Paiement à la réception.',
      icon: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z',
    },
  ];

  constructor(
    private authService: AuthService,
    private productService: ProductService,
    private reviewService: ReviewService,
    private categoryService: CategoryService,
    private dashboardService: DashboardService,
    private wsService: WebSocketService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private seo: SeoService,
  ) {
    this.currentUser$ = this.authService.currentUser$;
  }

  ngAfterViewInit(): void {
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
          'https://tiktok.com/@sdmstore',
        ],
        hasMap: 'https://www.google.com/maps/search/SDM+STORE+Abidjan',
      },
    });
    this._loadPublicStats();
    this._loadCategories();
    this._loadFeatured();
    this._loadBestsellers();
    this._loadProducts();
    this._loadReviews();
    this._initObserver();
    this._subscribeStock();
  }

  ngOnDestroy(): void {
    this._observer?.disconnect();
    this.destroy$.next();
    this.destroy$.complete();
  }

  goToCategory(slug: string): void {
    this.router.navigate(['/products'], { queryParams: { categorie: slug } });
  }

  search(): void {
    if (this.searchQuery.trim()) {
      this.router.navigate(['/products'], { queryParams: { search: this.searchQuery.trim() } });
    }
  }

  onSearchKey(event: KeyboardEvent): void {
    if (event.key === 'Enter') this.search();
  }

  isNew(product: ProductResponse): boolean {
    if (!product.createdAt) return false;
    return (Date.now() - new Date(product.createdAt).getTime()) / 86400000 <= 21;
  }

  onHeroMouseMove(event: MouseEvent): void {
    if (window.matchMedia('(hover: none)').matches) return;
    const section = event.currentTarget as HTMLElement;
    const rect    = section.getBoundingClientRect();
    const cx = (event.clientX - rect.left) / rect.width  - 0.5;
    const cy = (event.clientY - rect.top)  / rect.height - 0.5;
    const parallax = section.querySelector('.hero-parallax') as HTMLElement | null;
    if (parallax) parallax.style.transform = `translate(${(cx * -12).toFixed(2)}px, ${(cy * -8).toFixed(2)}px)`;
    section.style.setProperty('--mx', ((event.clientX - rect.left) / rect.width  * 100).toFixed(1) + '%');
    section.style.setProperty('--my', ((event.clientY - rect.top)  / rect.height * 100).toFixed(1) + '%');
  }

  onHeroMouseLeave(event: MouseEvent): void {
    if (window.matchMedia('(hover: none)').matches) return;
    const parallax = (event.currentTarget as HTMLElement).querySelector('.hero-parallax') as HTMLElement | null;
    if (parallax) parallax.style.transform = '';
  }

  get hasDeals(): boolean { return !this.newProductsLoading && this.discountProducts.length > 0; }
  get hasFeatured(): boolean { return !this.featuredLoading && this.featuredProducts.length > 0; }
  get hasBestsellers(): boolean { return !this.bestsellersLoading && this.bestsellers.length > 0; }
  get hasNewProducts(): boolean { return !this.newProductsLoading && this.newProducts.length > 0; }

  get editorialStats(): { v: string; l: string }[] {
    const p = this.publicStats;
    return [
      { v: p ? p.activeProducts   + '+' : '…', l: 'Références en stock' },
      { v: p ? p.activeCategories + ''  : '…', l: 'Catégories' },
      { v: '24h',                               l: 'Livraison Abidjan' },
      { v: '100%',                              l: 'Pièces authentifiées' },
    ];
  }

  reviewInitials(name: string): string {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return parts[0] + ' ' + parts[1].charAt(0) + '.';
    return parts[0];
  }

  starArray(): number[] { return [1, 2, 3, 4, 5]; }

  avgRatingDisplay(): string {
    if (!this.publicStats) return '…';
    return this.publicStats.averageRating.toFixed(1);
  }

  private _loadCategories(): void {
    this.categoryService.getCategories().subscribe({
      next: (r) => {
        if (r.success) this.categories = r.data as CategoryResponse[];
        this.categoriesLoading = false;
        this.cdr.detectChanges();
      },
      error: () => { this.categoriesLoading = false; this.cdr.detectChanges(); },
    });
  }

  private _loadFeatured(): void {
    this.productService.getFeaturedProducts(6).subscribe({
      next: (r) => {
        if (r.success) this.featuredProducts = r.data as ProductResponse[];
        this.featuredLoading = false;
        this.cdr.detectChanges();
      },
      error: () => { this.featuredLoading = false; this.cdr.detectChanges(); },
    });
  }

  private _loadBestsellers(): void {
    this.productService.getBestsellers(8).subscribe({
      next: (r) => {
        if (r.success) this.bestsellers = r.data as ProductResponse[];
        this.bestsellersLoading = false;
        this.cdr.detectChanges();
      },
      error: () => { this.bestsellersLoading = false; this.cdr.detectChanges(); },
    });
  }

  private _loadProducts(): void {
    this.productService.getProducts({ page: 0, size: 24, sort: 'newest' }).subscribe({
      next: (r) => {
        if (r.success) {
          const pg = r.data as PageResponse<ProductResponse>;
          this.newProducts      = pg.content.filter(p => this.isNew(p)).slice(0, 8);
          this.discountProducts = pg.content.filter(p => p.discountPercent && p.discountPercent > 0).slice(0, 4);
        }
        this.newProductsLoading = false;
        this.cdr.detectChanges();
      },
      error: () => { this.newProductsLoading = false; this.cdr.detectChanges(); },
    });
  }

  private _loadPublicStats(): void {
    this.dashboardService.getPublicStats().subscribe({
      next: (r) => {
        if (r.success) {
          this.publicStats   = r.data as PublicStats;
          this.statAvgRating = this.publicStats.averageRating;
          if (this._statsAnimated) {
            this._statsAnimated = false;
            this._count('statProducts',   this.publicStats.activeProducts,   2000);
            this._count('statCategories', this.publicStats.activeCategories, 1400);
            this._count('statClients',    this.publicStats.totalClients,     2400);
            this._count('statReviews',    this.publicStats.totalReviews,     1800);
          }
          this.cdr.detectChanges();
        }
      },
      error: () => {},
    });
  }

  private _loadReviews(): void {
    this.reviewService.getFeaturedReviews().subscribe({
      next: (r) => {
        if (r.success) this.featuredReviews = (r.data as ReviewResponse[]).slice(0, 6);
        this.reviewsLoading = false;
        this.cdr.detectChanges();
      },
      error: () => { this.reviewsLoading = false; this.cdr.detectChanges(); },
    });
  }

  private _subscribeStock(): void {
    this.wsService.stockUpdate$.pipe(takeUntil(this.destroy$)).subscribe(update => {
      let changed = false;
      for (const list of [this.newProducts, this.discountProducts, this.featuredProducts, this.bestsellers]) {
        const p = list.find(p => p.id === update.productId);
        if (p) { (p as any).stock = update.stock; changed = true; }
      }
      if (changed) this.cdr.detectChanges();
    });
  }

  private _initObserver(): void {
    this._observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('in-view');
        if (entry.target.id === 'stats-row' && !this._statsAnimated && this.publicStats) {
          this._statsAnimated = true;
          this._count('statProducts',   this.publicStats.activeProducts,   2000);
          this._count('statCategories', this.publicStats.activeCategories, 1400);
          this._count('statClients',    this.publicStats.totalClients,     2400);
          this._count('statReviews',    this.publicStats.totalReviews,     1800);
        }
        this._observer!.unobserve(entry.target);
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

    document.querySelectorAll('.scroll-reveal').forEach(el => this._observer!.observe(el));
    const stats = document.getElementById('stats-row');
    if (stats) this._observer.observe(stats);
  }

  private _count(prop: 'statProducts'|'statCategories'|'statClients'|'statReviews', target: number, ms: number): void {
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - t0) / ms, 1);
      (this as any)[prop] = Math.round((1 - Math.pow(1 - p, 4)) * target);
      this.cdr.detectChanges();
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
}
