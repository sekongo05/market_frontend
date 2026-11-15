import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CategoryResponse } from '../../../../core/models/category.models';
import { MediaUrlPipe } from '../../../../shared/pipes/media-url.pipe';
import { HomeSectionErrorComponent } from '../home-section-error/home-section-error.component';

@Component({
  selector: 'app-home-collections',
  standalone: true,
  imports: [MediaUrlPipe, HomeSectionErrorComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section id="main-content" class="bg-[#faf8f5] py-20 text-[#111111] sm:py-28">
      <div class="mx-auto max-w-[1440px] px-6 sm:px-10 lg:px-16 xl:px-24">

        <!-- En-tête de section épuré -->
        <div class="mb-12 flex flex-col gap-4 border-b border-[#111111]/10 pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p class="text-[10px] font-semibold uppercase tracking-[0.38em] text-[#92700c]">
              Les Univers
            </p>
            <h2 class="mt-2.5 font-display text-3xl font-normal tracking-tight text-[#111111] sm:text-4xl lg:text-5xl">
              Nos <em class="italic font-normal">Collections</em>
            </h2>
          </div>
          <p class="max-w-sm text-xs leading-relaxed text-[#6b675f] sm:text-right">
            Chaque catégorie réunit des pièces contrôlées à la main avant mise en ligne.
          </p>
        </div>

        @if (loading) {
          <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div class="skeleton h-[340px] sm:h-[440px] rounded-none"></div>
            <div class="skeleton h-[340px] sm:h-[440px] rounded-none"></div>
          </div>
          <div class="mt-6 grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-4">
            @for (i of [1, 2, 3, 4]; track i) {
              <div class="skeleton aspect-[4/5] rounded-none"></div>
            }
          </div>
        } @else if (error && categories.length === 0) {
          <app-home-section-error
            message="Impossible de charger les univers pour le moment."
            (retry)="retry.emit()" />
        } @else if (categories.length > 0) {
          <!-- 2 grands univers symétriques -->
          <div class="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2">
            @for (cat of categories.slice(0, 2); track cat.id) {
              <a [href]="'/products?categorie=' + cat.slug"
                 (click)="selectCategory.emit(cat.slug); $event.preventDefault()"
                 class="group relative block h-[340px] sm:h-[440px] lg:h-[500px] overflow-hidden bg-[#ece7df]">
                @if (cat.imageUrl) {
                  <img [src]="cat.imageUrl | mediaUrl: 1200"
                       [alt]="cat.name"
                       loading="lazy"
                       decoding="async"
                       (error)="$any($event.target).src='/product-placeholder.svg'"
                       class="h-full w-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100" />
                }
                <div aria-hidden="true"
                     class="absolute inset-0 bg-gradient-to-t from-[#0a0a0a]/85 via-[#0a0a0a]/15 to-transparent"></div>
                <div class="absolute inset-x-0 bottom-0 p-6 sm:p-8 text-white">
                  <p class="text-[10px] font-medium uppercase tracking-[0.34em] text-[#d4af37]">
                    Univers
                  </p>
                  <h3 class="mt-1.5 font-display text-2xl font-normal tracking-tight sm:text-3xl">
                    {{ cat.name }}
                  </h3>
                  <div class="mt-4 flex items-center gap-3">
                    <span aria-hidden="true"
                          class="h-px w-8 bg-[#d4af37] transition-all duration-500 group-hover:w-16"></span>
                    <span class="text-[10px] font-semibold uppercase tracking-[0.26em] text-white/85">
                      Découvrir
                    </span>
                  </div>
                </div>
              </a>
            }
          </div>

          <!-- Univers suivants en rangée régulière -->
          @if (categories.length > 2) {
            <div class="mt-4 sm:mt-6 grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-4">
              @for (cat of categories.slice(2, 6); track cat.id) {
                <a [href]="'/products?categorie=' + cat.slug"
                   (click)="selectCategory.emit(cat.slug); $event.preventDefault()"
                   class="group block">
                  <div class="relative aspect-[4/5] overflow-hidden bg-[#ece7df]">
                    @if (cat.imageUrl) {
                      <img [src]="cat.imageUrl | mediaUrl: 800"
                           [alt]="cat.name"
                           loading="lazy"
                           decoding="async"
                           (error)="$any($event.target).src='/product-placeholder.svg'"
                           class="h-full w-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100" />
                    }
                    <div aria-hidden="true"
                         class="absolute inset-0 bg-gradient-to-t from-[#0a0a0a]/70 via-transparent to-transparent"></div>
                  </div>
                  <div class="mt-3 flex items-center justify-between border-b border-[#111111]/12 pb-2.5">
                    <h3 class="font-display text-base font-normal text-[#111111] transition-colors group-hover:text-[#92700c] sm:text-lg">
                      {{ cat.name }}
                    </h3>
                    <span aria-hidden="true" class="text-xs text-[#6b675f] transition-transform duration-300 group-hover:translate-x-1">→</span>
                  </div>
                </a>
              }
            </div>
          }
        }
      </div>
    </section>
  `,
})
export class HomeCollectionsComponent {
  @Input() categories: CategoryResponse[] = [];
  @Input() loading = true;
  @Input() error = false;
  @Output() selectCategory = new EventEmitter<string>();
  @Output() retry = new EventEmitter<void>();
}
