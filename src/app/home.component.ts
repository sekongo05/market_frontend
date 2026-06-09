import { Component, AfterViewInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
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
import { PromoService } from './core/services/promo.service';
import { PublicPromoResponse } from './core/models/promo.models';
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
  firstOrderPromo: PublicPromoResponse | null = null;

  // ── Hero slideshow ──────────────────────────────────────────────
  readonly heroSlides = [
    { imageUrl: 'https://images.unsplash.com/photo-1547996160-81dfa63595aa?w=1920&q=80&fm=webp', label: 'Montres de prestige' },
    { imageUrl: '/mt.png', label: 'Maillots toutes nations' },
    { imageUrl: '/campus.png', label: 'Baskets & Sneakers' },
    { imageUrl: '/sans_fil.png', label: 'Écouteurs sans fil' },
    { imageUrl: '/lalé.png', label: 'Smartphones & Tech' },
    { imageUrl: '/cas.png', label: 'Casquettes & Accessoires' },
    { imageUrl: '/macccc.png', label: 'Ordinateurs & PC' },
  ];

  currentSlide = 0;
  slidesLoaded = false;
  progressValue = 0;
  slideDirection: 'next' | 'prev' = 'next';

  private _slideTimer: ReturnType<typeof setInterval> | null = null;
  private _progressTimer: ReturnType<typeof setInterval> | null = null;
  readonly _slideInterval = 4000;
  _isPaused = false;
  _isTransitioning = false;
  private _preloaded = new Set<string>();
  private _frameIds: number[] = [];
  private _transitionTimeout: ReturnType<typeof setTimeout> | null = null;

  private _observer?: IntersectionObserver;
  private _statsAnimated = false;
  private destroy$ = new Subject<void>();

  private _cursorEl: HTMLElement | null = null;
  private _isTouchDevice = false;

  private _onCursorMove = (e: MouseEvent): void => {
    if (!this._cursorEl) return;
    this._cursorEl.style.left = e.clientX + 'px';
    this._cursorEl.style.top  = e.clientY + 'px';
  };

  private _onCursorOver = (e: MouseEvent): void => {
    if (!this._cursorEl) return;
    const inside = !!(e.target as HTMLElement).closest('.cursor-hover-zone');
    this._cursorEl.classList.toggle('sdm-visible', inside);
  };

  private _onCursorDown = (): void => this._cursorEl?.classList.add('sdm-clicking');
  private _onCursorUp   = (): void => this._cursorEl?.classList.remove('sdm-clicking');

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

  private _platformBrowser: boolean;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private authService: AuthService,
    private productService: ProductService,
    private reviewService: ReviewService,
    private categoryService: CategoryService,
    private dashboardService: DashboardService,
    private wsService: WebSocketService,
    private promoService: PromoService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private seo: SeoService,
  ) {
    this._platformBrowser = isPlatformBrowser(this.platformId);
    this.currentUser$ = this.authService.currentUser$;
  }

  ngAfterViewInit(): void {
    if (this._platformBrowser) {
      this._isTouchDevice = window.matchMedia('(hover: none)').matches;
      if (!this._isTouchDevice) {
        this._cursorEl = document.getElementById('sdm-cursor');
        document.addEventListener('mousemove',  this._onCursorMove, { passive: true });
        document.addEventListener('mouseover',  this._onCursorOver, { passive: true });
        document.addEventListener('mousedown',  this._onCursorDown);
        document.addEventListener('mouseup',    this._onCursorUp);
      }
    }
    this._preloadAdjacent();
    this._startAutoPlay();
    this._startProgress();
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
    this._loadPublicStats();
    this._loadCategories();
    this._loadFeatured();
    this._loadBestsellers();
    this._loadProducts();
    this._loadReviews();
    this._loadFirstOrderPromo();
    this._initObserver();
    this._subscribeStock();
  }

  ngOnDestroy(): void {
    this._stopAutoPlay();
    this._stopProgress();
    this._observer?.disconnect();
    this.destroy$.next();
    this.destroy$.complete();
    this._frameIds.forEach(id => cancelAnimationFrame(id));
    this._frameIds = [];
    if (this._transitionTimeout) clearTimeout(this._transitionTimeout);
    if (this._platformBrowser && !this._isTouchDevice) {
      document.removeEventListener('mousemove', this._onCursorMove);
      document.removeEventListener('mouseover', this._onCursorOver);
      document.removeEventListener('mousedown', this._onCursorDown);
      document.removeEventListener('mouseup',   this._onCursorUp);
    }
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
    if (!this._platformBrowser || window.matchMedia('(hover: none)').matches) return;
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
    if (!this._platformBrowser || window.matchMedia('(hover: none)').matches) return;
    const parallax = (event.currentTarget as HTMLElement).querySelector('.hero-parallax') as HTMLElement | null;
    if (parallax) parallax.style.transform = '';
  }

  prevSlide(): void {
    if (this._isTransitioning) return;
    this.slideDirection = 'prev';
    const prev = (this.currentSlide - 1 + this.heroSlides.length) % this.heroSlides.length;
    this._goTo(prev);
  }

  nextSlide(): void {
    if (this._isTransitioning) return;
    this.slideDirection = 'next';
    const next = (this.currentSlide + 1) % this.heroSlides.length;
    this._goTo(next);
  }

  goToSlide(index: number): void {
    if (this._isTransitioning || index === this.currentSlide) return;
    this.slideDirection = index > this.currentSlide ? 'next' : 'prev';
    this._goTo(index);
  }

  private _goTo(index: number): void {
    this._isTransitioning = true;
    this.currentSlide = index;
    this.progressValue = 0;
    this._preloadAdjacent();
    this._stopAutoPlay();
    this._stopProgress();
    this._startAutoPlay();
    this._startProgress();
    this.cdr.detectChanges();
    if (this._transitionTimeout) clearTimeout(this._transitionTimeout);
    this._transitionTimeout = setTimeout(() => { this._isTransitioning = false; }, 600);
  }

  onSlideError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = 'https://images.unsplash.com/photo-1547996160-81dfa63595aa?w=1200&q=80&fm=webp';
  }

  onHeroImgLoad(): void {
    this.slidesLoaded = true;
    this.cdr.detectChanges();
  }

  private _preloadAdjacent(): void {
    if (!this._platformBrowser) return;
    const next = (this.currentSlide + 1) % this.heroSlides.length;
    const prev = (this.currentSlide - 1 + this.heroSlides.length) % this.heroSlides.length;
    [next, prev].forEach(i => {
      const url = this.heroSlides[i].imageUrl;
      if (!this._preloaded.has(url)) {
        const img = new Image();
        img.src = url;
        this._preloaded.add(url);
      }
    });
  }

  private _startAutoPlay(): void {
    this._slideTimer = setInterval(() => {
      if (!this._isPaused) {
        this.nextSlide();
      }
    }, this._slideInterval);
  }

  private _stopAutoPlay(): void {
    if (this._slideTimer) {
      clearInterval(this._slideTimer);
      this._slideTimer = null;
    }
  }

  private _startProgress(): void {
    this.progressValue = 0;
    const step = 100 / (this._slideInterval / 30);
    this._progressTimer = setInterval(() => {
      if (!this._isPaused) {
        this.progressValue = Math.min(this.progressValue + step, 100);
        this.cdr.detectChanges();
      }
    }, 30);
  }

  private _stopProgress(): void {
    if (this._progressTimer) {
      clearInterval(this._progressTimer);
      this._progressTimer = null;
    }
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
      { v: '100%',                              l: 'Articles vérifiés' },
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
      error: (err) => { console.error('Stats load failed', err); },
    });
  }

  private _loadFirstOrderPromo(): void {
    this.promoService.getActivePromos().subscribe({
      next: (r) => {
        if (r.success) {
          this.firstOrderPromo = r.data.find(p => p.firstOrderOnly) ?? null;
          this.cdr.detectChanges();
        }
      },
      error: (err) => { console.error('Promo load failed', err); },
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
    if (!this._platformBrowser) return;
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

    if (this._platformBrowser) {
      document.querySelectorAll('.scroll-reveal').forEach(el => this._observer!.observe(el));
      const stats = document.getElementById('stats-row');
      if (stats) this._observer.observe(stats);
    }
  }

  private _count(prop: 'statProducts'|'statCategories'|'statClients'|'statReviews', target: number, ms: number): void {
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - t0) / ms, 1);
      const val = Math.round((1 - Math.pow(1 - p, 4)) * target);
      switch (prop) {
        case 'statProducts':   this.statProducts = val; break;
        case 'statCategories': this.statCategories = val; break;
        case 'statClients':    this.statClients = val; break;
        case 'statReviews':    this.statReviews = val; break;
      }
      this.cdr.detectChanges();
      if (p < 1) {
        const id = requestAnimationFrame(tick);
        this._frameIds.push(id);
      }
    };
    const id = requestAnimationFrame(tick);
    this._frameIds.push(id);
  }
}
