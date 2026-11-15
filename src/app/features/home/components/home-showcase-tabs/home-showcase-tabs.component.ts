import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProductSummaryResponse } from '../../../../core/models/product.models';
import { ProductCardComponent } from '../../../../shared/components/product-card/product-card.component';
import { HomeSectionErrorComponent } from '../home-section-error/home-section-error.component';

export type ShowcaseTabKey = 'featured' | 'new' | 'bestsellers';

interface ShowcaseTabMeta {
  readonly key: ShowcaseTabKey;
  readonly label: string;
}

@Component({
  selector: 'app-home-showcase-tabs',
  standalone: true,
  imports: [RouterLink, ProductCardComponent, HomeSectionErrorComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="border-y border-[#111111]/8 bg-white py-20 text-[#111111] sm:py-28">
      <div class="mx-auto max-w-[1440px] px-6 sm:px-10 lg:px-16 xl:px-24">

        <!-- En-tête + Onglets soulignés façon Dior -->
        <div class="mb-12 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p class="text-[10px] font-semibold uppercase tracking-[0.38em] text-[#92700c]">
              La Sélection de la Maison
            </p>
            <h2 class="mt-2.5 font-display text-3xl font-normal tracking-tight text-[#111111] sm:text-4xl lg:text-5xl">
              Pièces <em class="italic font-normal">Choisies</em>
            </h2>
          </div>

          <div role="tablist"
               aria-label="Catégories de mise en avant"
               class="flex items-center gap-6 sm:gap-9 border-b border-[#111111]/10 overflow-x-auto scrollbar-none">
            @for (tab of tabs; track tab.key; let idx = $index) {
              <button type="button"
                      role="tab"
                      [id]="'showcase-tab-' + tab.key"
                      [attr.aria-selected]="activeTab === tab.key"
                      [attr.tabindex]="activeTab === tab.key ? 0 : -1"
                      aria-controls="showcase-panel"
                      (click)="selectTab(tab.key)"
                      (keydown)="onTabKeydown($event, idx)"
                      class="relative whitespace-nowrap pb-3.5 text-xs font-semibold uppercase tracking-[0.22em] transition-colors"
                      [class]="activeTab === tab.key
                        ? 'text-[#111111]'
                        : 'text-[#6b675f] hover:text-[#111111]'">
                {{ tab.label }}
                @if (activeTab === tab.key) {
                  <span aria-hidden="true" class="absolute inset-x-0 bottom-0 h-[1.5px] bg-[#111111]"></span>
                }
              </button>
            }
          </div>
        </div>

        <!-- Panneau actif -->
        <div id="showcase-panel"
             role="tabpanel"
             [attr.aria-labelledby]="'showcase-tab-' + activeTab">

          @if (activeLoading) {
            <div class="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-4">
              @for (i of [1, 2, 3, 4]; track i) {
                <div>
                  <div class="skeleton mb-3 aspect-[3/4] rounded-none"></div>
                  <div class="skeleton mb-1.5 h-3 w-20 rounded-none"></div>
                  <div class="skeleton mb-2 h-4 w-3/4 rounded-none"></div>
                  <div class="skeleton h-4 w-1/2 rounded-none"></div>
                </div>
              }
            </div>
          } @else if (activeError && activeProducts.length === 0) {
            <app-home-section-error
              message="Impossible de charger cette sélection de pièces."
              (retry)="retryTab.emit(activeTab)" />
          } @else if (activeProducts.length === 0) {
            <div class="border border-[#111111]/10 bg-[#faf8f5] px-6 py-12 text-center">
              <p class="font-display text-xl italic text-[#111111]">
                Aucune pièce disponible dans cette rubrique pour le moment.
              </p>
              <a routerLink="/products"
                 class="mt-4 inline-block text-[11px] font-semibold uppercase tracking-[0.24em] text-[#92700c] underline underline-offset-4">
                Voir tout le catalogue
              </a>
            </div>
          } @else {
            <div class="grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 sm:gap-y-12 md:grid-cols-4">
              @for (product of activeProducts.slice(0, 8); track product.id; let idx = $index) {
                <app-product-card
                  [product]="product"
                  [index]="idx"
                  [showQuickView]="false"
                  tone="light"
                  [inCart]="cartIds.has(product.id)"
                  [isFavorite]="favoriteIds.has(product.id)"
                  sizes="(max-width: 768px) 50vw, 25vw"
                  (quickAdd)="quickAdd.emit($event)"
                  (toggleFavorite)="toggleFavorite.emit($event)" />
              }
            </div>
          }
        </div>

        <!-- Lien catalogue aligné -->
        <div class="mt-14 flex justify-center">
          <a routerLink="/products"
             [queryParams]="activeTab === 'featured' ? { featured: true } : null"
             class="inline-flex items-center gap-3 border border-[#111111] px-8 py-3.5 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#111111] transition-colors hover:bg-[#0a0a0a] hover:text-[#faf8f5]">
            Explorer toute la collection
            <span aria-hidden="true">→</span>
          </a>
        </div>

      </div>
    </section>
  `,
})
export class HomeShowcaseTabsComponent {
  @Input() featuredProducts: ProductSummaryResponse[] = [];
  @Input() featuredLoading = true;
  @Input() featuredError = false;

  @Input() newProducts: ProductSummaryResponse[] = [];
  @Input() newLoading = true;
  @Input() newError = false;

  @Input() bestsellers: ProductSummaryResponse[] = [];
  @Input() bestsellersLoading = true;
  @Input() bestsellersError = false;

  @Input({ required: true }) cartIds!: ReadonlySet<number>;
  @Input({ required: true }) favoriteIds!: ReadonlySet<number>;

  @Output() quickAdd = new EventEmitter<ProductSummaryResponse>();
  @Output() toggleFavorite = new EventEmitter<ProductSummaryResponse>();
  @Output() retryTab = new EventEmitter<ShowcaseTabKey>();

  activeTab: ShowcaseTabKey = 'featured';

  readonly tabs: readonly ShowcaseTabMeta[] = [
    { key: 'featured', label: 'La Sélection' },
    { key: 'new', label: 'Nouveautés' },
    { key: 'bestsellers', label: 'Meilleures Ventes' },
  ];

  get activeProducts(): ProductSummaryResponse[] {
    switch (this.activeTab) {
      case 'featured':    return this.featuredProducts;
      case 'new':         return this.newProducts;
      case 'bestsellers': return this.bestsellers;
    }
  }

  get activeLoading(): boolean {
    switch (this.activeTab) {
      case 'featured':    return this.featuredLoading;
      case 'new':         return this.newLoading;
      case 'bestsellers': return this.bestsellersLoading;
    }
  }

  get activeError(): boolean {
    switch (this.activeTab) {
      case 'featured':    return this.featuredError;
      case 'new':         return this.newError;
      case 'bestsellers': return this.bestsellersError;
    }
  }

  selectTab(key: ShowcaseTabKey): void {
    this.activeTab = key;
  }

  onTabKeydown(event: KeyboardEvent, currentIndex: number): void {
    let nextIndex: number | null = null;
    if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % this.tabs.length;
    else if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + this.tabs.length) % this.tabs.length;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = this.tabs.length - 1;

    if (nextIndex !== null) {
      event.preventDefault();
      const targetKey = this.tabs[nextIndex].key;
      this.activeTab = targetKey;
      const doc = (event.target as HTMLElement | null)?.ownerDocument;
      doc?.getElementById(`showcase-tab-${targetKey}`)?.focus();
    }
  }
}
