import { Component, Output, EventEmitter, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FinanceService } from '../../../../core/services/finance.service';

@Component({
  selector: 'app-pin-gate',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="flex flex-col items-center justify-center min-h-[60vh] px-6">
      <div class="w-full max-w-sm">

        <div class="w-14 h-14 bg-emerald-500/15 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <svg class="w-7 h-7 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
          </svg>
        </div>

        <h2 class="text-xl font-black theme-text text-center mb-1">Accès Finance</h2>
        <p class="text-sm theme-muted text-center mb-8">Entrez votre PIN à 6 chiffres</p>

        @if (error()) {
          <div class="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-xl mb-4 text-center">
            {{ error() }}
          </div>
        }

        <div class="flex justify-center gap-3 mb-8">
          @for (i of [0,1,2,3,4,5]; track i) {
            <div class="w-11 h-14 rounded-xl border-2 flex items-center justify-center text-xl font-black theme-text transition-all"
                 [class.border-gold]="pin().length === i"
                 [class.border-emerald-500]="pin().length > i"
                 [class.theme-border]="pin().length !== i && pin().length <= i">
              {{ pin().length > i ? '•' : '' }}
            </div>
          }
        </div>

        <div class="grid grid-cols-3 gap-3 mb-4">
          @for (d of [1,2,3,4,5,6,7,8,9]; track d) {
            <button (click)="addDigit(d.toString())"
                    [disabled]="loading()"
                    class="h-14 rounded-2xl theme-surface border theme-border text-lg font-bold theme-text active:scale-[0.95] active:opacity-70 transition-transform disabled:opacity-40">
              {{ d }}
            </button>
          }
          <div></div>
          <button (click)="addDigit('0')"
                  [disabled]="loading()"
                  class="h-14 rounded-2xl theme-surface border theme-border text-lg font-bold theme-text active:scale-[0.95] active:opacity-70 transition-transform disabled:opacity-40">
            0
          </button>
          <button (click)="deleteDigit()"
                  [disabled]="loading()"
                  class="h-14 rounded-2xl theme-surface border theme-border theme-muted active:scale-[0.95] active:opacity-70 transition-transform disabled:opacity-40 flex items-center justify-center">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2 2 0 001.414.586H19a2 2 0 002-2V7a2 2 0 00-2-2h-8.172a2 2 0 00-1.414.586L3 12z"/>
            </svg>
          </button>
        </div>

        @if (loading()) {
          <div class="flex justify-center mt-2">
            <div class="w-5 h-5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
          </div>
        }

      </div>
    </div>
  `,
})
export class PinGateComponent {
  @Output() unlocked = new EventEmitter<void>();

  pin = signal('');
  loading = signal(false);
  error = signal('');

  constructor(private financeService: FinanceService) {}

  addDigit(d: string): void {
    if (this.pin().length >= 6 || this.loading()) return;
    this.pin.update(p => p + d);
    this.error.set('');
    if (this.pin().length === 6) {
      this.submit();
    }
  }

  deleteDigit(): void {
    this.pin.update(p => p.slice(0, -1));
    this.error.set('');
  }

  private submit(): void {
    this.loading.set(true);
    this.financeService.verifyPin({ pin: this.pin() }).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.financeService.saveFinanceSession(res.data.financeToken, res.data.expiresInSeconds);
          this.unlocked.emit();
        } else {
          this.error.set(res.message ?? 'PIN incorrect');
          this.pin.set('');
        }
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'PIN incorrect');
        this.pin.set('');
        this.loading.set(false);
      },
    });
  }
}
