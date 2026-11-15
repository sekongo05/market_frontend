import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-home-section-error',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div role="alert"
         class="flex flex-col items-start justify-between gap-4 border px-6 py-5 sm:flex-row sm:items-center"
         [class]="tone === 'dark'
           ? 'border-white/15 bg-white/[0.03] text-[#faf8f5]'
           : 'border-[#111111]/12 bg-white text-[#111111]'">
      <p class="text-sm" [class]="tone === 'dark' ? 'text-[#faf8f5]/80' : 'text-[#111111]/75'">
        {{ message }}
      </p>
      <button type="button"
              (click)="retry.emit()"
              class="inline-flex flex-shrink-0 items-center gap-2 border px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] transition-colors"
              [class]="tone === 'dark'
                ? 'border-[#d4af37]/60 text-[#d4af37] hover:bg-[#d4af37] hover:text-[#0a0a0a]'
                : 'border-[#111111] text-[#111111] hover:bg-[#0a0a0a] hover:text-[#faf8f5]'">
        Réessayer
      </button>
    </div>
  `,
})
export class HomeSectionErrorComponent {
  @Input() message = 'Cette sélection est momentanément indisponible.';
  @Input() tone: 'light' | 'dark' = 'light';
  @Output() retry = new EventEmitter<void>();
}
