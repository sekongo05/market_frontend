import { Component, Output, EventEmitter, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FinanceService } from '../../../../core/services/finance.service';

@Component({
  selector: 'app-pin-setup',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="flex flex-col items-center justify-center min-h-[60vh] px-6">
      <div class="w-full max-w-sm">

        <div class="w-14 h-14 bg-gold/15 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <svg class="w-7 h-7 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/>
          </svg>
        </div>

        <h2 class="text-xl font-black theme-text text-center mb-1">Créer votre PIN Finance</h2>
        <p class="text-sm theme-muted text-center mb-6">Ce PIN protège l'accès aux données financières</p>

        @if (error()) {
          <div class="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-xl mb-4 text-center">
            {{ error() }}
          </div>
        }
        @if (success()) {
          <div class="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm px-4 py-3 rounded-xl mb-4 text-center">
            PIN créé avec succès !
          </div>
        }

        <div class="space-y-4 mb-6">
          <div>
            <label class="block text-xs font-semibold theme-muted mb-1.5">PIN (6 chiffres)</label>
            <input type="password" inputmode="numeric" maxlength="6" [(ngModel)]="pin"
                   pattern="[0-9]{6}"
                   placeholder="••••••"
                   class="w-full px-4 py-3 rounded-xl theme-surface border theme-border theme-text text-center tracking-[0.5em] text-xl outline-none focus:border-gold transition-colors">
          </div>
          <div>
            <label class="block text-xs font-semibold theme-muted mb-1.5">Confirmer le PIN</label>
            <input type="password" inputmode="numeric" maxlength="6" [(ngModel)]="pinConfirm"
                   pattern="[0-9]{6}"
                   placeholder="••••••"
                   class="w-full px-4 py-3 rounded-xl theme-surface border theme-border theme-text text-center tracking-[0.5em] text-xl outline-none focus:border-gold transition-colors">
          </div>
          <div>
            <label class="block text-xs font-semibold theme-muted mb-1.5">Mot de passe du compte</label>
            <input type="password" [(ngModel)]="accountPassword"
                   placeholder="Votre mot de passe"
                   class="w-full px-4 py-3 rounded-xl theme-surface border theme-border theme-text outline-none focus:border-gold transition-colors">
          </div>
        </div>

        <button (click)="submit()" [disabled]="loading() || !canSubmit()"
                class="w-full py-3.5 rounded-2xl bg-gold text-black font-bold text-sm active:scale-[0.98] transition-transform disabled:opacity-40 disabled:cursor-not-allowed">
          @if (loading()) {
            <span class="flex items-center justify-center gap-2">
              <span class="w-4 h-4 border-2 border-black/40 border-t-black rounded-full animate-spin"></span>
              Enregistrement…
            </span>
          } @else {
            Créer le PIN
          }
        </button>

      </div>
    </div>
  `,
})
export class PinSetupComponent {
  @Output() setupDone = new EventEmitter<void>();

  pin = '';
  pinConfirm = '';
  accountPassword = '';
  loading = signal(false);
  error = signal('');
  success = signal(false);

  constructor(private financeService: FinanceService) {}

  canSubmit(): boolean {
    return this.pin.length === 6 && this.pinConfirm.length === 6 && this.accountPassword.length > 0;
  }

  submit(): void {
    if (this.pin !== this.pinConfirm) {
      this.error.set('Les deux PIN ne correspondent pas');
      return;
    }
    if (!/^\d{6}$/.test(this.pin)) {
      this.error.set('Le PIN doit contenir exactement 6 chiffres');
      return;
    }

    this.loading.set(true);
    this.error.set('');
    this.financeService.setupPin({ pin: this.pin, accountPassword: this.accountPassword }).subscribe({
      next: (res) => {
        if (res.success) {
          this.success.set(true);
          setTimeout(() => this.setupDone.emit(), 800);
        } else {
          this.error.set(res.message ?? 'Erreur lors de la création du PIN');
        }
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'Erreur lors de la création du PIN');
        this.loading.set(false);
      },
    });
  }
}
