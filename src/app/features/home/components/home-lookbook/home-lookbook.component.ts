import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';

interface CampaignShot {
  readonly index: string;
  readonly label: string;
  readonly imageUrl: string;
  readonly search: string;
}

@Component({
  selector: 'app-home-lookbook',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="bg-white py-20 text-[#111111] sm:py-28">
      <div class="mx-auto max-w-[1440px] px-6 sm:px-10 lg:px-16 xl:px-24">

        <!-- En-tête Campagne + Réseaux -->
        <div class="mb-12 flex flex-col gap-6 border-b border-[#111111]/10 pb-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p class="text-[10px] font-semibold uppercase tracking-[0.38em] text-[#92700c]">
              La Campagne · &#64;sdmstore
            </p>
            <h2 class="mt-2.5 font-display text-3xl font-normal tracking-tight text-[#111111] sm:text-4xl lg:text-5xl">
              Silhouettes <em class="italic font-normal">&amp; Objets</em>
            </h2>
          </div>

          <div class="flex flex-wrap items-center gap-3">
            <a [href]="instagramUrl" target="_blank" rel="noopener noreferrer"
               class="border border-[#111111]/18 px-5 py-2.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#111111] transition-colors hover:border-[#111111] hover:bg-[#0a0a0a] hover:text-white">
              Instagram
            </a>
            <a [href]="tiktokUrl" target="_blank" rel="noopener noreferrer"
               class="border border-[#111111]/18 px-5 py-2.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#111111] transition-colors hover:border-[#111111] hover:bg-[#0a0a0a] hover:text-white">
              TikTok
            </a>
            <a [href]="whatsAppUrl" target="_blank" rel="noopener noreferrer"
               class="bg-[#128C7E] px-5 py-2.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-white transition-colors hover:bg-[#0e7569]">
              Commander sur WhatsApp
            </a>
          </div>
        </div>

        <!-- Grille régulière 4 colonnes plein cadre alignée au cordeau -->
        <div class="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
          @for (shot of shots; track shot.imageUrl) {
            <a routerLink="/products"
               [queryParams]="{ search: shot.search }"
               class="group block">
              <div class="aspect-[4/5] overflow-hidden bg-[#f2efe9]">
                <img [src]="shot.imageUrl"
                     [alt]="shot.label"
                     loading="lazy"
                     decoding="async"
                     class="h-full w-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100" />
              </div>
              <div class="mt-3 flex items-center justify-between border-b border-[#111111]/10 pb-2.5">
                <span class="text-xs font-medium tracking-wide text-[#111111] transition-colors group-hover:text-[#92700c]">
                  <span class="mr-2 text-[10px] text-[#6b675f]">{{ shot.index }}</span>{{ shot.label }}
                </span>
                <span aria-hidden="true" class="text-xs text-[#6b675f] transition-transform duration-300 group-hover:translate-x-1">→</span>
              </div>
            </a>
          }
        </div>

        <!-- Invitation finale sobre -->
        <div class="mt-16 flex flex-col items-start justify-between gap-5 border-t border-[#111111]/10 pt-10 sm:flex-row sm:items-center">
          <div>
            <p class="text-[10px] font-semibold uppercase tracking-[0.32em] text-[#92700c]">
              Collection Complète
            </p>
            <h3 class="mt-1.5 font-display text-2xl font-normal text-[#111111]">
              Parcourez toutes nos pièces disponibles dès maintenant.
            </h3>
          </div>
          <div class="flex flex-wrap items-center gap-5">
            @if (!isLoggedIn) {
              <a routerLink="/auth/register"
                 class="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#92700c] underline underline-offset-4 transition-colors hover:text-[#111111]">
                Créer un compte
              </a>
            }
            <a routerLink="/products"
               class="group inline-flex items-center gap-4 text-[11px] font-semibold uppercase tracking-[0.26em] text-[#111111] transition-colors hover:text-[#92700c]">
              Voir tout le catalogue
              <span aria-hidden="true" class="h-px w-10 bg-[#111111]/45 transition-all duration-500 group-hover:w-16 group-hover:bg-[#92700c]"></span>
            </a>
          </div>
        </div>

      </div>
    </section>
  `,
})
export class HomeLookbookComponent {
  @Input() whatsAppUrl = '';
  @Input() isLoggedIn = false;

  readonly instagramUrl = 'https://instagram.com/sdmstore';
  readonly tiktokUrl = 'https://tiktok.com/@sdm_store1';

  readonly shots: readonly CampaignShot[] = [
    { index: '01', label: 'Maillots & Sélections', imageUrl: '/mt.webp', search: '' },
    { index: '02', label: 'Souliers & Allure', imageUrl: '/campus.webp', search: '' },
    { index: '03', label: 'Casquettes & Détails', imageUrl: '/cas.webp', search: '' },
    { index: '04', label: 'Audio & Essentiels', imageUrl: '/sans_fil.webp', search: '' },
  ];
}
