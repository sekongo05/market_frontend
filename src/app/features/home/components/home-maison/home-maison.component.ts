import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PublicStats } from '../../../../core/services/dashboard.service';
import { HomeSectionErrorComponent } from '../home-section-error/home-section-error.component';

interface MaisonCommitment {
  readonly icon: string;
  readonly title: string;
  readonly desc: string;
}

@Component({
  selector: 'app-home-maison',
  standalone: true,
  imports: [RouterLink, HomeSectionErrorComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="border-y border-[#111111]/10 bg-[#f2efe9] py-20 text-[#111111] sm:py-28 lg:py-32">
      <div class="mx-auto max-w-[1440px] px-6 sm:px-10 lg:px-16 xl:px-24">

        <!-- Diptyque architectural : Portrait encadré + Manifeste Maison -->
        <div class="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-16">

          <div class="lg:col-span-5 px-3 py-4 sm:px-5 sm:py-6">
            <div class="group relative mx-auto max-w-md lg:max-w-none">
              <!-- Contre-cadre parchemin légèrement incliné en sens opposé -->
              <div aria-hidden="true"
                   class="pointer-events-none absolute inset-0 rotate-[3deg] border border-[#92700c]/40 bg-[#e8e2d7] transition-transform duration-700 ease-out group-hover:rotate-[1deg] motion-reduce:transition-none">
              </div>

              <!-- Cadre principal penché (revient délicatement à l'axe au survol) -->
              <figure class="relative -rotate-[2.5deg] border border-[#111111]/15 bg-[#faf8f5] p-2.5 shadow-[0_28px_65px_-28px_rgba(17,17,17,0.28)] transition-transform duration-700 ease-out group-hover:rotate-0 sm:p-3 motion-reduce:transition-none">
                <!-- Repères d'angle horlogers discrets -->
                <span aria-hidden="true" class="pointer-events-none absolute -top-px -left-px z-10 h-3 w-3 border-t border-l border-[#92700c]/60"></span>
                <span aria-hidden="true" class="pointer-events-none absolute -top-px -right-px z-10 h-3 w-3 border-t border-r border-[#92700c]/60"></span>
                <span aria-hidden="true" class="pointer-events-none absolute -bottom-px -left-px z-10 h-3 w-3 border-b border-l border-[#92700c]/60"></span>
                <span aria-hidden="true" class="pointer-events-none absolute -bottom-px -right-px z-10 h-3 w-3 border-b border-r border-[#92700c]/60"></span>

                <div class="relative overflow-hidden border border-[#111111]/10 bg-[#0d0d0d]">
                  <img src="/maison-horlogerie.jpg"
                       alt="Chronographe bicolore inspecté au gant noir — sélection horlogère SDM Store"
                       loading="lazy"
                       decoding="async"
                       width="896"
                       height="1200"
                       class="aspect-[3/4] w-full object-cover object-center transition-transform duration-1000 ease-out group-hover:scale-[1.02] motion-reduce:transition-none motion-reduce:group-hover:scale-100" />
                </div>

                <figcaption class="flex items-center justify-between px-2 pt-3.5 pb-1 text-[10px] font-semibold uppercase tracking-[0.26em] text-[#6b675f]">
                  <span>Contrôle Horloger</span>
                  <span class="text-[#92700c]">Atelier · Est. 2020</span>
                </figcaption>
              </figure>
            </div>
          </div>

          <div class="lg:col-span-7">
            <p class="text-[10px] font-semibold uppercase tracking-[0.42em] text-[#92700c]">
              Savoir-faire · Maison SDM
            </p>
            <h2 class="mt-4 font-display text-3xl font-normal leading-[1.08] tracking-tight text-[#111111] sm:text-4xl lg:text-5xl">
              L'allure tient <em class="italic font-normal text-[#6b5314]">dans la précision du détail.</em>
            </h2>
            <p class="mt-6 max-w-xl text-sm leading-relaxed text-[#4f4b44] sm:text-base">
              Chaque montre, soulier ou accessoire est inspecté à la main avant son départ : finitions brossées, justesse des proportions et authenticité des matériaux.
            </p>

            <!-- Chiffres clés alignés en ligne nette -->
            @if (publicStats) {
              <dl class="mt-10 grid grid-cols-2 border-y border-[#111111]/12 sm:grid-cols-4">
                <div class="py-5 pr-4">
                  <dd class="font-display text-2xl sm:text-3xl text-[#92700c] tabular-nums">
                    {{ publicStats.activeProducts }}+
                  </dd>
                  <dt class="mt-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#6b675f]">
                    Pièces en ligne
                  </dt>
                </div>
                <div class="border-l border-[#111111]/12 py-5 px-4">
                  <dd class="font-display text-2xl sm:text-3xl text-[#111111] tabular-nums">
                    {{ publicStats.activeCategories }}
                  </dd>
                  <dt class="mt-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#6b675f]">
                    Univers curatés
                  </dt>
                </div>
                <div class="border-t border-[#111111]/12 sm:border-t-0 sm:border-l py-5 pr-4 sm:px-4">
                  <dd class="font-display text-2xl sm:text-3xl text-[#111111] tabular-nums">
                    {{ publicStats.totalClients }}+
                  </dd>
                  <dt class="mt-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#6b675f]">
                    Clients servis
                  </dt>
                </div>
                <div class="border-t border-l border-[#111111]/12 sm:border-t-0 py-5 pl-4">
                  <dd class="font-display text-2xl sm:text-3xl text-[#92700c] tabular-nums">
                    {{ publicStats.totalReviews }}+
                  </dd>
                  <dt class="mt-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#6b675f]">
                    Avis vérifiés
                  </dt>
                </div>
              </dl>
            } @else if (statsError) {
              <div class="mt-8">
                <app-home-section-error
                  message="Les statistiques de la Maison sont momentanément indisponibles."
                  (retry)="retryStats.emit()" />
              </div>
            }

            <div class="mt-9">
              <a routerLink="/products"
                 class="group inline-flex items-center gap-4 text-[11px] font-semibold uppercase tracking-[0.26em] text-[#111111] transition-colors hover:text-[#92700c]">
                Découvrir nos pièces
                <span aria-hidden="true" class="h-px w-10 bg-[#111111]/45 transition-all duration-500 group-hover:w-16 group-hover:bg-[#92700c]"></span>
              </a>
            </div>
          </div>

        </div>

        <!-- Grille régulière 4 colonnes des engagements de service -->
        <div class="mt-16 grid grid-cols-1 border-t border-l border-[#111111]/12 bg-[#faf8f5]/70 sm:grid-cols-2 lg:mt-20 lg:grid-cols-4">
          @for (item of commitments; track item.title) {
            <div class="border-r border-b border-[#111111]/12 px-6 py-6 sm:px-7 sm:py-7">
              <div class="flex items-center gap-3">
                <svg class="h-4 w-4 flex-shrink-0 text-[#92700c]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.35" [attr.d]="item.icon" />
                </svg>
                <h3 class="font-display text-base font-normal text-[#111111] sm:text-lg">
                  {{ item.title }}
                </h3>
              </div>
              <p class="mt-2.5 text-xs leading-relaxed text-[#5c5850]">
                {{ item.desc }}
              </p>
            </div>
          }
        </div>

      </div>
    </section>
  `,
})
export class HomeMaisonComponent {
  @Input() publicStats: PublicStats | null = null;
  @Input() statsError = false;
  @Output() retryStats = new EventEmitter<void>();

  readonly commitments: readonly MaisonCommitment[] = [
    {
      icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
      title: 'Expédition 24–48 h',
      desc: 'Remise soignée sous 24 à 48 h à Abidjan et sous 72 h partout en Côte d\'Ivoire.',
    },
    {
      icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
      title: 'Inspection manuelle',
      desc: 'Chaque pièce est contrôlée avant mise en écrin : finitions, cadran et justesse d\'assemblage.',
    },
    {
      icon: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
      title: 'Échange sous 3 jours',
      desc: 'Ajustement de pointure ou remplacement accompagnés directement par notre équipe.',
    },
    {
      icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z',
      title: 'Paiement certifié',
      desc: 'Règlement chiffré en ligne par Mobile Money ou carte bancaire via GeniusPay.',
    },
  ];
}
