import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ProductSummaryResponse } from '../../../../core/models/product.models';
import { MediaUrlPipe } from '../../../../shared/pipes/media-url.pipe';
import { ProductCardComponent } from '../../../../shared/components/product-card/product-card.component';

@Component({
  selector: 'app-home-campaign-offer',
  standalone: true,
  imports: [DecimalPipe, RouterLink, MediaUrlPipe, ProductCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (!loading && deals.length > 0) {
      <section class="bg-[#faf8f5] py-20 text-[#111111] sm:py-28">
        <div class="mx-auto max-w-[1440px] px-6 sm:px-10 lg:px-16 xl:px-24">

          <!-- Bloc éditorial 50/50 sur la pièce phare en offre -->
          @if (deals[0]; as heroDeal) {
            <div class="grid grid-cols-1 items-center border border-[#111111]/10 bg-white lg:grid-cols-2">
              <a [routerLink]="['/products', heroDeal.slug]"
                 class="group relative block aspect-[4/3] lg:aspect-[5/4] overflow-hidden bg-[#f4f1ec]">
                <img [src]="(heroDeal.listImageUrl || heroDeal.imageUrl) | mediaUrl: 1200"
                     [alt]="heroDeal.name"
                     loading="lazy"
                     decoding="async"
                     (error)="$any($event.target).src='/product-placeholder.svg'"
                     class="h-full w-full object-contain p-8 transition-transform duration-700 ease-out group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100" />
                @if (heroDeal.discountPercent) {
                  <span class="absolute top-5 left-5 bg-[#0a0a0a] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#d4af37]">
                    Privilège −{{ heroDeal.discountPercent }}%
                  </span>
                }
              </a>

              <div class="p-8 sm:p-12 lg:p-16">
                <p class="text-[10px] font-semibold uppercase tracking-[0.38em] text-[#92700c]">
                  Sélection Privée · Offre Limitée
                </p>
                <h2 class="mt-3 font-display text-3xl font-normal leading-[1.08] tracking-tight text-[#111111] sm:text-4xl">
                  {{ heroDeal.name }}
                </h2>
                <p class="mt-4 text-xs leading-relaxed text-[#6b675f] sm:text-sm">
                  Une sélection restreinte proposée temporairement à tarif privilégié, disponible en quantité limitée avant retour au catalogue standard.
                </p>

                <div class="mt-7 flex items-baseline gap-3 border-y border-[#111111]/10 py-5">
                  <span class="font-display text-2xl sm:text-3xl text-[#111111] tabular-nums">
                    {{ (heroDeal.salePrice ?? heroDeal.price) | number:'1.0-0':'fr-FR' }}
                    <span class="font-sans text-xs font-semibold tracking-[0.18em] text-[#92700c]">FCFA</span>
                  </span>
                  @if (heroDeal.salePrice) {
                    <span class="text-sm text-[#6b675f] line-through tabular-nums">
                      {{ heroDeal.price | number:'1.0-0':'fr-FR' }} FCFA
                    </span>
                  }
                </div>

                <div class="mt-8 flex flex-wrap items-center gap-4">
                  <a [routerLink]="['/products', heroDeal.slug]"
                     class="inline-flex items-center justify-center bg-[#0a0a0a] px-7 py-3.5 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#faf8f5] transition-colors hover:bg-[#92700c]">
                    Découvrir la pièce
                  </a>
                  <button type="button"
                          (click)="quickAdd.emit(heroDeal)"
                          class="border border-[#111111]/25 px-6 py-3.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#111111] transition-colors hover:border-[#111111]">
                    {{ cartIds.has(heroDeal.id) ? 'Dans le panier' : 'Ajouter au panier' }}
                  </button>
                </div>
              </div>
            </div>
          }

          <!-- Autres offres alignées si présentes -->
          @if (deals.length > 1) {
            <div class="mt-10 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3">
              @for (product of deals.slice(1, 4); track product.id; let idx = $index) {
                <app-product-card
                  [product]="product"
                  [index]="idx"
                  [showQuickView]="false"
                  tone="light"
                  [inCart]="cartIds.has(product.id)"
                  [isFavorite]="favoriteIds.has(product.id)"
                  sizes="(max-width: 768px) 50vw, 33vw"
                  (quickAdd)="quickAdd.emit($event)"
                  (toggleFavorite)="toggleFavorite.emit($event)" />
              }
            </div>
          }

        </div>
      </section>
    }
  `,
})
export class HomeCampaignOfferComponent {
  @Input() deals: ProductSummaryResponse[] = [];
  @Input() loading = true;
  @Input({ required: true }) cartIds!: ReadonlySet<number>;
  @Input({ required: true }) favoriteIds!: ReadonlySet<number>;

  @Output() quickAdd = new EventEmitter<ProductSummaryResponse>();
  @Output() toggleFavorite = new EventEmitter<ProductSummaryResponse>();
}
