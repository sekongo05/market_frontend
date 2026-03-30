import {
  Component, OnInit, OnDestroy, ChangeDetectorRef,
  AfterViewInit, HostListener
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil, switchMap } from 'rxjs/operators';

import { ProductService } from '../../../core/services/product.service';
import { CartService } from '../../../core/services/cart.service';
import { AuthService } from '../../../core/services/auth.service';
import { ProductMediaItem, ProductResponse } from '../../../core/models/product.models';
import { TooltipDirective } from '../../../shared/directives/tooltip.directive';

export interface GalleryItem {
  url: string;
  type: 'IMAGE' | 'VIDEO';
}

// Category → curated Unsplash gallery images  (slugs match real DB: electronique, mode-vetements, maison-cuisine, beaute-sante, sports-loisirs)
const CATEGORY_GALLERIES: Record<string, string[]> = {
  electronique: [
    'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=800&q=85',
    'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=800&q=85',
    'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=800&q=85',
    'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=800&q=85',
    'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800&q=85',
  ],
  mode: [
    'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800&q=85',
    'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=800&q=85',
    'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&q=85',
    'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&q=85',
  ],
  maison: [
    'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=800&q=85',
    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=85',
    'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&q=85',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=85',
  ],
  beaute: [
    'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=800&q=85',
    'https://images.unsplash.com/photo-1541643600914-78b084683702?w=800&q=85',
    'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=800&q=85',
    'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=800&q=85',
  ],
  sport: [
    'https://images.unsplash.com/photo-1571068316344-75bc76f77890?w=800&q=85',
    'https://images.unsplash.com/photo-1575361204480-aadea25e6e68?w=800&q=85',
    'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=800&q=85',
    'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&q=85',
  ],
};

const DEFAULT_GALLERY = [
  'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=800&q=85',
  'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800&q=85',
  'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=800&q=85',
  'https://images.unsplash.com/photo-1571068316344-75bc76f77890?w=800&q=85',
];

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, TooltipDirective],
  templateUrl: './product-detail.component.html',
  styleUrls: ['./product-detail.component.css'],
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

  // Cart state
  quantity = 1;
  addedToCart = false;

  private destroy$ = new Subject<void>();
  private observer?: IntersectionObserver;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private productService: ProductService,
    private cartService: CartService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  get isManager(): boolean {
    const role = this.authService.getCurrentUser()?.role;
    return role === 'MANAGER' || role === 'ADMIN';
  }

  ngOnInit(): void {
    this.route.paramMap.pipe(
      takeUntil(this.destroy$),
      switchMap(params => {
        const id = Number(params.get('id'));
        this.loading = true;
        this.error = null;
        this.activeIndex = 0;
        this.cdr.detectChanges();
        return this.productService.getProductById(id);
      })
    ).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.product = response.data;
          this._buildGallery();
          this._loadRelated();
        } else {
          this._tryMock();
        }
        this.loading = false;
        this.cdr.detectChanges();
        // DOM updated — now attach scroll-reveal observer to newly rendered elements
        setTimeout(() => this._initScrollReveal(), 0);
      },
      error: () => {
        this._tryMock();
        this.loading = false;
        this.cdr.detectChanges();
        setTimeout(() => this._initScrollReveal(), 0);
      },
    });
  }

  ngAfterViewInit(): void { /* observer started after product loads */ }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.observer?.disconnect();
  }

  // ── Gallery ──────────────────────────────────────────────────────────────

  private _buildGallery(): void {
    if (!this.product) return;

    // ── Priorité 1 : médias réels de l'API ─────────────────────────────────
    if (this.product.media?.length) {
      this.galleryItems = this.product.media.map(m => ({ url: m.url, type: m.mediaType }));
      // Assurer que l'image principale est en tête si elle n'est pas déjà dans media
      if (this.product.imageUrl) {
        const alreadyInMedia = this.galleryItems.some(i => i.url === this.product!.imageUrl);
        if (!alreadyInMedia) {
          this.galleryItems.unshift({ url: this.product.imageUrl, type: 'IMAGE' });
        }
      }
      return;
    }

    // ── Priorité 2 : image principale + galerie Unsplash par catégorie ──────
    const slug = this.product.category?.slug?.toLowerCase() ?? '';
    const catKey = Object.keys(CATEGORY_GALLERIES).find(k => slug.includes(k)) ?? '';
    const pool = catKey ? CATEGORY_GALLERIES[catKey] : DEFAULT_GALLERY;

    const main = this.product.imageUrl;
    const others = pool.filter(url => url !== main).slice(0, 3);
    this.galleryItems = [main, ...others].map(url => ({ url, type: 'IMAGE' as const }));
  }

  get activeItem(): GalleryItem {
    return this.galleryItems[this.activeIndex] ?? { url: '', type: 'IMAGE' };
  }

  setActive(index: number): void {
    this.activeIndex = index;
    this.zoomed = false;
    this.cdr.detectChanges();
  }

  prevImage(): void {
    this.activeIndex = (this.activeIndex - 1 + this.galleryItems.length) % this.galleryItems.length;
    this.zoomed = false;
    this.cdr.detectChanges();
  }

  nextImage(): void {
    this.activeIndex = (this.activeIndex + 1) % this.galleryItems.length;
    this.zoomed = false;
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

  setQuantity(q: number): void {
    if (!this.product) return;
    this.quantity = Math.max(1, Math.min(q, this.product.stock));
    this.cdr.detectChanges();
  }

  addToCart(): void {
    if (!this.product || this.product.stock === 0) return;
    this.cartService.addToCart({
      productId: this.product.id,
      productName: this.product.name,
      price: this.product.price,
      quantity: this.quantity,
      imageUrl: this.product.imageUrl,
    });
    this.addedToCart = true;
    this.cdr.detectChanges();
    setTimeout(() => { this.addedToCart = false; this.cdr.detectChanges(); }, 2500);
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
      price: product.price,
      quantity: 1,
      imageUrl: product.imageUrl,
    });
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  get formattedPrice(): string {
    if (!this.product) return '';
    return new Intl.NumberFormat('fr-FR').format(this.product.price);
  }

  get stockLabel(): string {
    if (!this.product) return '';
    if (this.product.stock === 0) return 'Épuisé';
    if (this.product.stock <= 3) return `Plus que ${this.product.stock} en stock`;
    return 'En stock';
  }

  get stockColor(): string {
    if (!this.product) return '#9ca3af';
    if (this.product.stock === 0) return '#f87171';
    if (this.product.stock <= 3) return '#fb923c';
    return '#4ade80';
  }

  goBack(): void { this.router.navigate(['/products']); }

  /** Fall back to mock data when API is unavailable */
  private _tryMock(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    const CAT_ELEC = { id: 1, name: 'Électronique',   slug: 'electronique',   description: '', imageUrl: '', active: true, gender: 'UNISEX' as const, createdAt: '', updatedAt: '' };
    const CAT_MODE = { id: 2, name: 'Mode & Vêtements', slug: 'mode-vetements', description: '', imageUrl: '', active: true, gender: 'UNISEX' as const, createdAt: '', updatedAt: '' };
    const CAT_MAIS = { id: 3, name: 'Maison & Cuisine', slug: 'maison-cuisine',  description: '', imageUrl: '', active: true, gender: 'UNISEX' as const, createdAt: '', updatedAt: '' };
    const CAT_BEAU = { id: 4, name: 'Beauté & Santé',   slug: 'beaute-sante',   description: '', imageUrl: '', active: true, gender: 'UNISEX' as const, createdAt: '', updatedAt: '' };
    const CAT_SPOR = { id: 5, name: 'Sports & Loisirs', slug: 'sports-loisirs', description: '', imageUrl: '', active: true, gender: 'UNISEX' as const, createdAt: '', updatedAt: '' };

    const mocks: ProductResponse[] = [
      {
        id: 1, name: 'iPhone 15 Pro', slug: 'iphone-15-pro',
        description: 'Smartphone Apple iPhone 15 Pro 256Go, puce A17 Pro, appareil photo 48MP',
        price: 650000, stock: 15, gender: 'UNISEX',
        imageUrl: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=800&q=85',
        category: CAT_ELEC, active: true, createdAt: '', updatedAt: '',
      },
      {
        id: 2, name: 'Samsung Galaxy S24', slug: 'samsung-galaxy-s24',
        description: 'Smartphone Samsung Galaxy S24 128Go, écran Dynamic AMOLED 6.2 pouces',
        price: 450000, stock: 20, gender: 'UNISEX',
        imageUrl: 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=800&q=85',
        category: CAT_ELEC, active: true, createdAt: '', updatedAt: '',
      },
      {
        id: 3, name: 'Sneakers Nike Air Max', slug: 'sneakers-nike-air-max',
        description: 'Chaussures de sport Nike Air Max 270, confort exceptionnel, plusieurs coloris',
        price: 85000, stock: 25, gender: 'UNISEX',
        imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=85',
        category: CAT_MODE, active: true, createdAt: '', updatedAt: '',
      },
      {
        id: 4, name: 'Climatiseur Hisense 1.5CV', slug: 'climatiseur-hisense-1-5cv',
        description: 'Climatiseur split Hisense 1.5 CV, fonction froid/chaud, économique',
        price: 280000, stock: 10, gender: 'UNISEX',
        imageUrl: 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=800&q=85',
        category: CAT_MAIS, active: true, createdAt: '', updatedAt: '',
      },
      {
        id: 5, name: 'Parfum Lacoste Homme', slug: 'parfum-lacoste-homme',
        description: 'Eau de toilette Lacoste Essential pour homme, 125ml, fraîcheur boisée',
        price: 75000, stock: 15, gender: 'HOMME',
        imageUrl: 'https://images.unsplash.com/photo-1541643600914-78b084683702?w=800&q=85',
        category: CAT_BEAU, active: true, createdAt: '', updatedAt: '',
      },
      {
        id: 6, name: 'Vélo de Fitness Statique', slug: 'velo-fitness-statique',
        description: "Vélo d'appartement avec résistance magnétique, écran LCD, charge max 120kg",
        price: 195000, stock: 6, gender: 'UNISEX',
        imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=85',
        category: CAT_SPOR, active: true, createdAt: '', updatedAt: '',
      },
    ];
    const found = mocks.find(p => p.id === id);
    if (found) {
      this.product = found;
      this._buildGallery();
    } else {
      this.error = 'Produit introuvable';
    }
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
}
