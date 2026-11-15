import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { ReviewResponse } from '../../../../core/models/review.models';
import { HomeSectionErrorComponent } from '../home-section-error/home-section-error.component';

@Component({
  selector: 'app-home-testimonials',
  standalone: true,
  imports: [HomeSectionErrorComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (!loading && (reviews.length > 0 || error)) {
      <section class="border-b border-[#111111]/8 bg-[#faf8f5] py-20 text-[#111111] sm:py-28">
        <div class="mx-auto max-w-[1440px] px-6 sm:px-10 lg:px-16 xl:px-24">

          @if (error && reviews.length === 0) {
            <app-home-section-error
              message="Impossible de charger les témoignages clients pour le moment."
              (retry)="retry.emit()" />
          } @else if (current; as review) {
            <div class="mx-auto max-w-3xl text-center">
              <div class="flex items-center justify-center gap-3">
                <span class="text-[10px] font-semibold uppercase tracking-[0.38em] text-[#92700c]">
                  Notes &amp; Témoignages
                </span>
                @if (averageRating) {
                  <span class="text-[10px] font-medium uppercase tracking-[0.22em] text-[#6b675f]">
                    · {{ avgDisplay }}/5 ({{ totalReviews || reviews.length }}+)
                  </span>
                }
              </div>

              <div class="mx-auto mt-6 h-px w-10 bg-[#111111]/20"></div>

              <blockquote class="mt-8 min-h-[7rem] font-display text-2xl italic font-normal leading-[1.32] text-[#111111] sm:text-3xl lg:text-[2.2rem]">
                « {{ quoteText(review.comment) }} »
              </blockquote>

              <div class="mt-8 flex flex-col items-center gap-1.5">
                <p class="text-xs font-semibold uppercase tracking-[0.24em] text-[#111111]">
                  {{ initials(review.customerName) }}
                </p>
                <div class="flex flex-wrap items-center justify-center gap-2 text-xs text-[#6b675f]">
                  <span class="font-medium text-[#92700c]">{{ review.productName }}</span>
                  @if (review.purchased) {
                    <span>· Achat vérifié</span>
                  }
                </div>
              </div>

              @if (reviews.length > 1) {
                <div class="mt-10 flex items-center justify-center gap-5">
                  <button type="button"
                          (click)="prev()"
                          aria-label="Témoignage précédent"
                          class="flex h-10 w-10 items-center justify-center border border-[#111111]/20 text-[#111111] transition-colors hover:border-[#111111] hover:bg-[#0a0a0a] hover:text-[#faf8f5]">
                    ←
                  </button>
                  <span class="text-xs font-medium tracking-[0.22em] text-[#6b675f] tabular-nums" aria-live="polite">
                    {{ currentNumber }} / {{ totalNumber }}
                  </span>
                  <button type="button"
                          (click)="next()"
                          aria-label="Témoignage suivant"
                          class="flex h-10 w-10 items-center justify-center border border-[#111111]/20 text-[#111111] transition-colors hover:border-[#111111] hover:bg-[#0a0a0a] hover:text-[#faf8f5]">
                    →
                  </button>
                </div>
              }
            </div>
          }

        </div>
      </section>
    }
  `,
})
export class HomeTestimonialsComponent {
  @Input() reviews: ReviewResponse[] = [];
  @Input() loading = true;
  @Input() error = false;
  @Input() averageRating: number | null = null;
  @Input() totalReviews: number | null = null;
  @Output() retry = new EventEmitter<void>();

  activeIndex = 0;

  get current(): ReviewResponse | null {
    if (!this.reviews.length) return null;
    const safeIdx = this.activeIndex % this.reviews.length;
    return this.reviews[safeIdx] ?? this.reviews[0];
  }

  get avgDisplay(): string {
    return this.averageRating && this.averageRating > 0 ? this.averageRating.toFixed(1) : '5.0';
  }

  get currentNumber(): string {
    const idx = this.reviews.length ? (this.activeIndex % this.reviews.length) + 1 : 0;
    return String(idx).padStart(2, '0');
  }

  get totalNumber(): string {
    return String(this.reviews.length).padStart(2, '0');
  }

  prev(): void {
    if (!this.reviews.length) return;
    this.activeIndex = (this.activeIndex - 1 + this.reviews.length) % this.reviews.length;
  }

  next(): void {
    if (!this.reviews.length) return;
    this.activeIndex = (this.activeIndex + 1) % this.reviews.length;
  }

  quoteText(comment: string | null): string {
    const text = (comment ?? '').trim();
    if (!text) return 'Très satisfait(e) de mon achat et du soin apporté à la livraison.';
    return text.length > 210 ? text.slice(0, 210).trimEnd() + '…' : text;
  }

  initials(name: string): string {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return `${parts[0]} ${parts[1].charAt(0)}.`;
    return parts[0] || 'Client SDM';
  }
}
