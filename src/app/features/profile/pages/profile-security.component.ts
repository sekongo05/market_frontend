import { Component, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
  selector: 'app-profile-security',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="luxury-card rounded-3xl overflow-hidden">
      <div class="px-6 sm:px-8 pt-6 sm:pt-8 pb-5 border-b theme-border">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center flex-shrink-0"
               style="background: rgba(249,115,22,0.1); border: 1px solid rgba(249,115,22,0.2)">
            <svg class="w-4 h-4 sm:w-5 sm:h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
            </svg>
          </div>
          <div>
            <h2 class="text-base font-black theme-text">Sécurité du compte</h2>
            <p class="text-xs theme-muted mt-0.5">Modifiez votre mot de passe de connexion</p>
          </div>
        </div>
      </div>

      <form [formGroup]="form" (ngSubmit)="submit()" class="p-6 sm:p-8 space-y-5">

        <div class="space-y-2">
          <label class="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider theme-muted">
            Mot de passe actuel <span class="text-gold">*</span>
          </label>
          <div class="relative">
            <input [type]="showOld ? 'text' : 'password'" formControlName="oldPassword"
              placeholder="••••••••" autocomplete="current-password"
              class="theme-input w-full px-4 py-3 pr-12 rounded-xl text-sm font-medium transition-all focus:ring-1 focus:ring-gold/40"/>
            <button type="button" (click)="showOld = !showOld"
              class="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg flex items-center justify-center theme-muted hover:text-gold transition-all hover:bg-gold/5">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
              </svg>
            </button>
          </div>
          <div class="flex justify-end">
            <a routerLink="/auth/forgot-password" class="text-xs font-semibold transition-colors hover:underline" style="color:#d4af37">Mot de passe oublié ?</a>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <div class="flex-1 h-px" style="background: linear-gradient(to right, transparent, currentColor, transparent); opacity: 0.2"></div>
          <span class="text-[10px] font-bold uppercase tracking-widest theme-muted">Nouveau mot de passe</span>
          <div class="flex-1 h-px" style="background: linear-gradient(to left, transparent, currentColor, transparent); opacity: 0.2"></div>
        </div>

        <div class="space-y-2">
          <label class="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider theme-muted">
            Nouveau mot de passe <span class="text-gold">*</span>
          </label>
          <div class="relative">
            <input [type]="showNew ? 'text' : 'password'" formControlName="newPassword"
              placeholder="••••••••" autocomplete="new-password"
              class="theme-input w-full px-4 py-3 pr-12 rounded-xl text-sm font-medium transition-all focus:ring-1 focus:ring-gold/40"/>
            <button type="button" (click)="showNew = !showNew"
              class="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg flex items-center justify-center theme-muted hover:text-gold transition-all hover:bg-gold/5">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
              </svg>
            </button>
          </div>
          @if (form.get('newPassword')?.value?.length > 0) {
            <div class="space-y-2">
              <div class="flex gap-1.5">
                @for (i of [1,2,3,4]; track i) {
                  <div class="h-1.5 flex-1 rounded-full transition-all duration-300"
                    [ngClass]="strength.score >= i
                      ? (strength.score === 1 ? 'bg-red-500' : strength.score === 2 ? 'bg-orange-400' : strength.score === 3 ? 'bg-yellow-400' : 'bg-green-400')
                      : 'bg-white/10'">
                  </div>
                }
              </div>
              <div class="flex items-center justify-between">
                <div class="flex gap-3 text-[10px] theme-muted">
                  <span [class.text-green-400]="(form.get('newPassword')?.value ?? '').length >= 8">≥ 8 car.</span>
                  <span [class.text-green-400]="/[A-Z]/.test(form.get('newPassword')?.value ?? '')">Maj.</span>
                  <span [class.text-green-400]="/[0-9]/.test(form.get('newPassword')?.value ?? '')">Chiffre</span>
                  <span [class.text-green-400]="/[^A-Za-z0-9]/.test(form.get('newPassword')?.value ?? '')">Symbole</span>
                </div>
                @if (strength.label) {
                  <span class="text-[11px] font-bold" [ngClass]="strength.color">{{ strength.label }}</span>
                }
              </div>
            </div>
          }
        </div>

        <div class="space-y-2">
          <label class="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider theme-muted">
            Confirmer le mot de passe <span class="text-gold">*</span>
          </label>
          <div class="relative">
            <input [type]="showConfirm ? 'text' : 'password'" formControlName="confirmPassword"
              placeholder="••••••••" autocomplete="new-password"
              class="theme-input w-full px-4 py-3 pr-12 rounded-xl text-sm font-medium transition-all focus:ring-1 focus:ring-gold/40"/>
            <button type="button" (click)="showConfirm = !showConfirm"
              class="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg flex items-center justify-center theme-muted hover:text-gold transition-all hover:bg-gold/5">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
              </svg>
            </button>
          </div>
          @if (form.get('confirmPassword')?.value && form.get('newPassword')?.value !== form.get('confirmPassword')?.value) {
            <p class="text-xs text-red-400">Les mots de passe ne correspondent pas</p>
          }
          @if (form.get('confirmPassword')?.value && form.get('newPassword')?.value === form.get('confirmPassword')?.value && (form.get('confirmPassword')?.value ?? '').length >= 6) {
            <p class="text-xs text-green-400">Les mots de passe correspondent</p>
          }
        </div>

        <div class="flex items-start gap-3 p-4 rounded-xl" style="background: rgba(249,115,22,0.06); border: 1px solid rgba(249,115,22,0.15)">
          <svg class="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <p class="text-xs text-orange-300/80 leading-relaxed">Utilisez au moins 8 caractères avec des lettres, chiffres et symboles pour un mot de passe sécurisé.</p>
        </div>

        <div class="flex justify-end pt-3 border-t theme-border">
          <button type="submit" [disabled]="form.invalid || changing || form.get('newPassword')?.value !== form.get('confirmPassword')?.value"
            class="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed hover:-translate-y-0.5"
            style="background: rgba(249,115,22,0.15); border: 1px solid rgba(249,115,22,0.3); color: rgb(251,146,60)">
            @if (changing) {
              <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Modification…
            } @else {
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
              </svg>
              Changer le mot de passe
            }
          </button>
        </div>
      </form>
    </div>
  `,
})
export class ProfileSecurityComponent {
  @Output() changePassword = new EventEmitter<{ oldPassword: string; newPassword: string }>();
  @Input() changing = false;

  form: FormGroup;
  showOld = false;
  showNew = false;
  showConfirm = false;

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      oldPassword:     ['', [Validators.required, Validators.minLength(6)]],
      newPassword:     ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required],
    });
  }

  get strength(): { score: number; label: string; color: string } {
    const pwd: string = this.form.get('newPassword')?.value ?? '';
    if (!pwd) return { score: 0, label: '', color: '' };
    let score = 0;
    if (pwd.length >= 8)          score++;
    if (/[A-Z]/.test(pwd))        score++;
    if (/[0-9]/.test(pwd))        score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    const map = [
      { label: '', color: '' },
      { label: 'Trop faible',  color: 'text-red-400' },
      { label: 'Faible',       color: 'text-orange-400' },
      { label: 'Correct',      color: 'text-yellow-400' },
      { label: 'Fort',         color: 'text-green-400' },
    ];
    return { score, ...map[score] };
  }

  submit(): void {
    if (this.form.invalid) return;
    const { newPassword, confirmPassword, oldPassword } = this.form.value;
    if (newPassword !== confirmPassword) return;
    this.changePassword.emit({ oldPassword, newPassword });
  }
}
