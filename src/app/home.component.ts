import { Component, AfterViewInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from './core/services/auth.service';
import { ProductService } from './core/services/product.service';
import { MediaUrlPipe } from './shared/pipes/media-url.pipe';
import { ProductResponse } from './core/models/product.models';
import { PageResponse } from './core/models/common.models';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, MediaUrlPipe],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
})
export class HomeComponent implements AfterViewInit, OnDestroy {
  currentUser$;

  newProducts: ProductResponse[] = [];
  newProductsLoading = true;
  discountProducts: ProductResponse[] = [];

  statProducts = 0;
  statBrands   = 0;
  statClients  = 0;

  private _observer?: IntersectionObserver;
  private _statsAnimated = false;

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
      desc: '24–48h à Abidjan, 72h max partout en Côte d\'Ivoire. Paiement à la livraison.',
      icon: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z',
    },
  ];

  constructor(
    private authService: AuthService,
    private productService: ProductService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {
    this.currentUser$ = this.authService.currentUser$;
  }

  ngAfterViewInit(): void {
    this._loadProducts();
    this._initObserver();
  }

  ngOnDestroy(): void {
    this._observer?.disconnect();
  }

  goToCategory(slug: string): void {
    this.router.navigate(['/products'], { queryParams: { categorie: slug } });
  }

  private _loadProducts(): void {
    this.productService.getProducts({ page: 0, size: 8, sort: 'newest' }).subscribe({
      next: (r) => {
        if (r.success) {
          const pg = r.data as PageResponse<ProductResponse>;
          this.newProducts = pg.content;
          this.discountProducts = pg.content.filter(p => p.discountPercent && p.discountPercent > 0).slice(0, 4);
        }
        this.newProductsLoading = false;
        this.cdr.detectChanges();
      },
      error: () => { this.newProductsLoading = false; this.cdr.detectChanges(); },
    });
  }

  private _initObserver(): void {
    this._observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('in-view');
        if (entry.target.id === 'stats-row' && !this._statsAnimated) {
          this._statsAnimated = true;
          this._count('statProducts', 500,  2000);
          this._count('statBrands',   15,   1400);
          this._count('statClients',  1200, 2400);
        }
      });
    }, { threshold: 0.12 });

    document.querySelectorAll('.scroll-reveal').forEach(el => this._observer!.observe(el));
    const stats = document.getElementById('stats-row');
    if (stats) this._observer.observe(stats);
  }

  private _count(prop: 'statProducts'|'statBrands'|'statClients', target: number, ms: number): void {
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
