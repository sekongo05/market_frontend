import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PublicPromoResponse } from '../../../../core/models/promo.models';

interface UniverseStripItem {
  readonly index: string;
  readonly title: string;
  readonly subtitle: string;
  readonly imageUrl: string;
  readonly alt: string;
  readonly searchParam: string;
}

@Component({
  selector: 'app-home-hero',
  standalone: true,
  imports: [FormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- 1. HERO PLEIN ÉCRAN — CADRAN DÉGAGÉ, TYPOGRAPHIE EN ANCRAGE BAS -->
    <section aria-label="Pièce maîtresse Horlogerie SDM Store"
             class="relative h-[84vh] min-h-[540px] max-h-[900px] w-full overflow-hidden bg-[#0a0a0a] text-[#faf8f5]">

      <img [src]="watchImageUrl"
           alt="Montre de prestige — pièce maîtresse SDM Store"
           width="1376"
           height="768"
           fetchpriority="high"
           loading="eager"
           decoding="async"
           (error)="$any($event.target).src='/maison-horlogerie.jpg'"
           class="absolute inset-0 h-full w-full object-cover object-[50%_42%]" />

      <!-- Assombrissement progressif limité au tiers inférieur (pierre d'obsidienne) -->
      <div aria-hidden="true"
           class="pointer-events-none absolute inset-x-0 bottom-0 h-[48%] bg-gradient-to-t from-[#0a0a0a]/95 via-[#0a0a0a]/45 to-transparent"></div>

      <!-- Ancrage typographique bas : titre compact à gauche, action à droite (le centre reste 100% libre) -->
      <div class="relative z-10 flex h-full items-end">
        <div class="mx-auto w-full max-w-[1440px] px-6 pb-8 sm:px-10 sm:pb-12 lg:px-16 lg:pb-14 xl:px-24">
          <div class="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">

            <div class="max-w-md">
              <p class="text-[10px] font-medium uppercase tracking-[0.42em] text-[#d4af37]">
                Horlogerie · Maison SDM
              </p>
              <h1 class="mt-2.5 font-display font-normal leading-[1.02] tracking-tight text-white"
                  style="font-size: clamp(2.15rem, 4.1vw, 3.6rem);">
                L'élégance<br>
                <em class="italic font-normal text-[#f2e8cf]">au quotidien.</em>
              </h1>
            </div>

            <div class="flex flex-wrap items-center gap-5 sm:gap-7">
              <a routerLink="/products"
                 [queryParams]="{ search: 'montre' }"
                 class="group inline-flex items-center gap-4 border border-white/45 bg-[#0a0a0a]/50 px-7 py-3.5 text-[11px] font-medium uppercase tracking-[0.26em] text-white backdrop-blur-sm transition-colors hover:border-[#d4af37] hover:bg-[#d4af37] hover:text-[#0a0a0a]">
                Découvrir les montres
                <span aria-hidden="true" class="transition-transform duration-300 group-hover:translate-x-1">→</span>
              </a>
              <a routerLink="/products"
                 class="border-b border-white/35 pb-1 text-[11px] font-medium uppercase tracking-[0.24em] text-white/80 transition-colors hover:border-[#d4af37] hover:text-[#d4af37]">
                Toute la boutique
              </a>
            </div>

          </div>
        </div>
      </div>

    </section>

    <!-- 2. BANDEAU IVOIRE SOUS LE HERO : RECHERCHE FINE + 3 UNIVERS -->
    <section aria-label="Accès rapide aux univers"
             class="border-b border-[#111111]/10 bg-[#faf8f5] text-[#111111]">
      <div class="mx-auto max-w-[1440px] px-6 py-8 sm:px-10 sm:py-10 lg:px-16 xl:px-24">

        @if (!isLoggedIn && firstOrderPromo) {
          <p class="mb-5 text-center text-[10px] font-semibold uppercase tracking-[0.28em] text-[#92700c]">
            Privilège premier achat · Code {{ firstOrderPromo.code }} (−{{ firstOrderPromo.discountPercent }}%)
          </p>
        }

        <!-- Recherche soulignée 1px -->
        <form (submit)="submitSearch($event)"
              class="mx-auto mb-8 flex max-w-2xl items-center gap-3 border-b border-[#111111]/25 pb-2.5 focus-within:border-[#111111] transition-colors">
          <svg class="h-4 w-4 flex-shrink-0 text-[#6b675f]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-5.2-5.2m1.7-4.3a6 6 0 11-12 0 6 6 0 0112 0z" />
          </svg>
          <label for="hero-search" class="sr-only">Rechercher une montre ou une pièce</label>
          <input id="hero-search"
                 type="search"
                 name="search"
                 [(ngModel)]="query"
                 placeholder="Rechercher une montre, une paire, un accessoire…"
                 class="min-w-0 flex-1 bg-transparent text-xs sm:text-sm text-[#111111] placeholder:text-[#6b675f] focus:outline-none" />
          <button type="submit"
                  class="text-[10px] font-semibold uppercase tracking-[0.26em] text-[#111111] transition-colors hover:text-[#92700c]">
            Rechercher →
          </button>
        </form>

        <!-- 3 univers en bandeau horizontal net -->
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-6">
          @for (item of universeStrip; track item.index) {
            <a routerLink="/products"
               [queryParams]="item.searchParam ? { search: item.searchParam } : null"
               class="group flex items-center gap-4 border border-[#111111]/10 bg-white p-3 transition-colors hover:border-[#92700c]">
              <div class="h-20 w-20 flex-shrink-0 overflow-hidden bg-[#f2efe9]">
                <img [src]="item.imageUrl"
                     [alt]="item.alt"
                     loading="eager"
                     decoding="async"
                     class="h-full w-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-[1.05] motion-reduce:transition-none motion-reduce:group-hover:scale-100" />
              </div>
              <div class="min-w-0 flex-1">
                <p class="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#92700c]">
                  {{ item.index }}
                </p>
                <p class="mt-0.5 font-display text-lg font-normal text-[#111111] truncate">
                  {{ item.title }}
                </p>
                <p class="text-[11px] text-[#6b675f] truncate">
                  {{ item.subtitle }}
                </p>
              </div>
              <span aria-hidden="true" class="pr-2 text-xs text-[#6b675f] transition-transform duration-300 group-hover:translate-x-1">→</span>
            </a>
          }
        </div>

      </div>
    </section>
  `,
})
export class HomeHeroComponent {
  @Input() isLoggedIn = false;
  @Input() firstOrderPromo: PublicPromoResponse | null = null;
  @Output() searchSubmit = new EventEmitter<string>();

  query = '';

  readonly watchImageUrl = '/hero-montre.jpg';

  readonly universeStrip: readonly UniverseStripItem[] = [
    {
      index: '01',
      title: 'Horlogerie',
      subtitle: 'Garde-temps choisis',
      imageUrl: '/maison-horlogerie.jpg',
      alt: 'Montres sélectionnées SDM Store',
      searchParam: 'montre',
    },
    {
      index: '02',
      title: 'Souliers & Allure',
      subtitle: 'Sneakers & silhouettes',
      imageUrl: '/campus.webp',
      alt: 'Souliers et sneakers SDM Store',
      searchParam: '',
    },
    {
      index: '03',
      title: 'Audio & Essentiels',
      subtitle: 'Objets du quotidien',
      imageUrl: '/sans_fil.webp',
      alt: 'Écouteurs et objets connectés SDM Store',
      searchParam: '',
    },
  ];

  submitSearch(event: Event): void {
    event.preventDefault();
    const trimmed = this.query.trim();
    if (trimmed) {
      this.searchSubmit.emit(trimmed);
    }
  }
}
