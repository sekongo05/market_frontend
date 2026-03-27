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
import { ProductResponse } from '../../../core/models/product.models';

// Category → curated Unsplash gallery images
const CATEGORY_GALLERIES: Record<string, string[]> = {
  montres: [
    'https://images.unsplash.com/photo-1548169874-53e85f753f1e?w=800&q=85',
    'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=800&q=85',
    'https://images.unsplash.com/photo-1587836374828-4dbafa94cf0e?w=800&q=85',
    'https://images.unsplash.com/photo-1612817159949-195b6eb9e31a?w=800&q=85',
    'https://images.unsplash.com/photo-1526045431048-f857369baa09?w=800&q=85',
  ],
  bagues: [
    'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&q=85',
    'https://images.unsplash.com/photo-1602751584552-8ba73aad10e1?w=800&q=85',
    'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800&q=85',
    'https://images.unsplash.com/photo-1573408301185-9519f94b2e5e?w=800&q=85',
  ],
  colliers: [
    'https://images.unsplash.com/photo-1599459183200-59c7687a0c70?w=800&q=85',
    'https://images.unsplash.com/photo-1601121141461-9d6647bef0a1?w=800&q=85',
    'https://images.unsplash.com/photo-1535632787350-4e68ef0ac584?w=800&q=85',
    'https://images.unsplash.com/photo-1617038220319-276d3cfab638?w=800&q=85',
  ],
  bracelets: [
    'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=800&q=85',
    'https://images.unsplash.com/photo-1506630448388-4e683c67ddb0?w=800&q=85',
    'https://images.unsplash.com/photo-1573408301185-9519f94b2e5e?w=800&q=85',
    'https://images.unsplash.com/photo-1619119069152-a2b331eb392a?w=800&q=85',
  ],
  boucles: [
    'https://images.unsplash.com/photo-1630019852942-f89202989a59?w=800&q=85',
    'https://images.unsplash.com/photo-1535632787350-4e68ef0ac584?w=800&q=85',
    'https://images.unsplash.com/photo-1617038220319-276d3cfab638?w=800&q=85',
    'https://images.unsplash.com/photo-1573408301185-9519f94b2e5e?w=800&q=85',
  ],
};

const DEFAULT_GALLERY = [
  'https://images.unsplash.com/photo-1548169874-53e85f753f1e?w=800&q=85',
  'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=800&q=85',
  'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&q=85',
  'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=800&q=85',
];

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './product-detail.component.html',
  styleUrls: ['./product-detail.component.css'],
})
export class ProductDetailComponent implements OnInit, AfterViewInit, OnDestroy {
  product: ProductResponse | null = null;
  loading = true;
  error: string | null = null;

  // Gallery
  galleryImages: string[] = [];
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
    const slug = this.product.category?.slug?.toLowerCase() ?? '';
    const catKey = Object.keys(CATEGORY_GALLERIES).find(k => slug.includes(k)) ?? '';
    const pool = catKey ? CATEGORY_GALLERIES[catKey] : DEFAULT_GALLERY;

    // Start with main image, then fill from pool (skip duplicates)
    const main = this.product.imageUrl;
    const others = pool.filter(url => url !== main).slice(0, 3);
    this.galleryImages = [main, ...others];
  }

  setActive(index: number): void {
    this.activeIndex = index;
    this.zoomed = false;
    this.cdr.detectChanges();
  }

  prevImage(): void {
    this.activeIndex = (this.activeIndex - 1 + this.galleryImages.length) % this.galleryImages.length;
    this.zoomed = false;
    this.cdr.detectChanges();
  }

  nextImage(): void {
    this.activeIndex = (this.activeIndex + 1) % this.galleryImages.length;
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
    const mocks: ProductResponse[] = [
      {
        id: 1, name: 'Royal Oak Chronographe', slug: 'royal-oak-chrono',
        description: "Montre iconique en acier inoxydable, cadran bleu satiné, mouvement automatique Swiss Made. Un chef-d'œuvre de l'horlogerie moderne qui allie technique et esthétique. Le boîtier octogonal distinctif est serti d'un cadran texturé « Grande Tapisserie » qui capture la lumière à chaque mouvement.",
        price: 8500000, stock: 3,
        imageUrl: 'https://images.unsplash.com/photo-1548169874-53e85f753f1e?w=800&q=85',
        category: { id: 1, name: 'Montres', slug: 'montres', description: '', imageUrl: '', active: true, createdAt: '' },
        active: true, createdAt: '', updatedAt: '',
      },
      {
        id: 2, name: 'Submariner Date', slug: 'submariner-date',
        description: "Montre de plongée légendaire, boîtier Oystersteel 41 mm, lunette Cerachrom noire. Étanche jusqu'à 300 mètres. Mouvement automatique calibre 3235, réserve de marche 70 heures.",
        price: 12000000, stock: 2,
        imageUrl: 'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=800&q=85',
        category: { id: 1, name: 'Montres', slug: 'montres', description: '', imageUrl: '', active: true, createdAt: '' },
        active: true, createdAt: '', updatedAt: '',
      },
      {
        id: 3, name: 'Bague Solitaire Diamant', slug: 'bague-solitaire',
        description: "Bague en or blanc 18 carats sertie d'un diamant brillant de 1.5 ct. Certificat GIA inclus. Monture 4 griffes classique sublimant la pierre de manière intemporelle.",
        price: 5500000, stock: 5,
        imageUrl: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&q=85',
        category: { id: 2, name: 'Bagues', slug: 'bagues', description: '', imageUrl: '', active: true, createdAt: '' },
        active: true, createdAt: '', updatedAt: '',
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
