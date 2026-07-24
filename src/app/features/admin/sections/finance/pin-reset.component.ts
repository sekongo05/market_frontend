import { Component, EventEmitter, Output, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FinanceService } from '../../../../core/services/finance.service';
import { AdminToastService } from '../../shared/admin-toast.service';

@Component({
  selector: 'app-pin-reset',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div class="w-full max-w-md bg-[#1a1a1a] border border-white/10 rounded-3xl shadow-2xl overflow-hidden animate-fade-in-up">
        
        <div class="p-6 sm:p-8">
          <div class="flex justify-between items-center mb-6">
            <h2 class="text-xl font-black text-white">Changer le PIN Finance</h2>
            <button (click)="cancel.emit()" class="text-gray-500 hover:text-white transition-colors">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>

          <div class="space-y-4">
            <div>
              <label class="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Nouveau PIN (6 chiffres) <span class="text-red-400">*</span></label>
              <input type="password" inputmode="numeric" maxlength="6" [(ngModel)]="newPin"
                     placeholder="••••••"
                     class="w-full bg-black/50 border border-white/10 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-gold transition-colors text-center text-xl tracking-widest font-mono">
            </div>
            
            <div>
              <label class="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Confirmer le PIN <span class="text-red-400">*</span></label>
              <input type="password" inputmode="numeric" maxlength="6" [(ngModel)]="pinConfirm"
                     placeholder="••••••"
                     class="w-full bg-black/50 border border-white/10 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-gold transition-colors text-center text-xl tracking-widest font-mono"
                     [class.border-red-500]="pinConfirm && newPin !== pinConfirm">
            </div>

            <div>
              <label class="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Mot de passe de votre compte <span class="text-red-400">*</span></label>
              <input type="password" [(ngModel)]="accountPassword"
                     placeholder="Pour des raisons de sécurité..."
                     class="w-full bg-black/50 border border-white/10 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-gold transition-colors">
            </div>

            @if (error) {
              <div class="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex gap-2">
                <svg class="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                <p class="text-xs text-red-400">{{ error }}</p>
              </div>
            }

            <div class="flex gap-3 pt-2">
              <button (click)="cancel.emit()" 
                      class="flex-1 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-semibold text-white transition-colors">
                Annuler
              </button>
              <button (click)="submit()" [disabled]="!isValid || loading"
                      class="flex-1 py-3 bg-gold text-black rounded-xl text-sm font-black hover:shadow-lg hover:shadow-yellow-600/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2">
                @if (loading) {
                  <span class="w-4 h-4 border-2 border-black/40 border-t-black rounded-full animate-spin"></span>
                }
                Confirmer
              </button>
            </div>
          </div>
        </div>
        
      </div>
    </div>
  `
})
export class PinResetComponent {
  @Output() resetDone = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  newPin = '';
  pinConfirm = '';
  accountPassword = '';
  error: string | null = null;
  loading = false;

  constructor(
    private financeService: FinanceService,
    private cdr: ChangeDetectorRef,
    private toast: AdminToastService,
  ) {}

  get isValid(): boolean {
    return this.newPin.length === 6 && this.newPin === this.pinConfirm && this.accountPassword.length > 0;
  }

  submit(): void {
    if (!this.isValid) return;
    
    if (!/^\\d{6}$/.test(this.newPin)) {
      this.error = 'Le PIN doit contenir exactement 6 chiffres.';
      return;
    }

    this.loading = true;
    this.error = null;
    
    this.financeService.resetPin({ newPin: this.newPin, accountPassword: this.accountPassword }).subscribe({
      next: (res) => {
        if (res.success) {
          this.toast.show('PIN modifié avec succès');
          this.resetDone.emit();
        }
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.error = err?.error?.message || 'Mot de passe incorrect ou erreur réseau';
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }
}
