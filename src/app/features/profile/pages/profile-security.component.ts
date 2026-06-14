import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
  selector: 'app-profile-security',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div>
      <div class="flex items-center gap-3 mb-6">
        <div class="w-10 h-10 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center flex-shrink-0">
          <svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
          </svg>
        </div>
        <div>
          <h2 class="text-base font-bold text-gray-900">Sécurité du compte</h2>
          <p class="text-xs text-gray-500 mt-0.5">Modifiez votre mot de passe de connexion</p>
        </div>
      </div>

      <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-5">

        <div class="space-y-1.5">
          <label class="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Mot de passe actuel <span class="text-gray-400">*</span>
          </label>
          <div class="relative">
            <input [type]="showOld ? 'text' : 'password'" formControlName="oldPassword"
              placeholder="••••••••" autocomplete="current-password"
              class="w-full px-4 py-2.5 pr-11 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-900 focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 transition-colors"/>
            <button type="button" (click)="showOld = !showOld"
              class="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
              </svg>
            </button>
          </div>
          <div class="flex justify-end">
            <a routerLink="/auth/forgot-password" class="text-xs font-semibold text-gray-600 hover:text-gray-800 hover:underline">Mot de passe oublié ?</a>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <div class="flex-1 h-px bg-gray-200"></div>
          <span class="text-[10px] font-bold uppercase tracking-widest text-gray-400">Nouveau mot de passe</span>
          <div class="flex-1 h-px bg-gray-200"></div>
        </div>

        <div class="space-y-1.5">
          <label class="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Nouveau mot de passe <span class="text-gray-400">*</span>
          </label>
          <div class="relative">
            <input [type]="showNew ? 'text' : 'password'" formControlName="newPassword"
              placeholder="••••••••" autocomplete="new-password"
              class="w-full px-4 py-2.5 pr-11 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-900 focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 transition-colors"/>
            <button type="button" (click)="showNew = !showNew"
              class="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
              </svg>
            </button>
          </div>
          @if (form.get('newPassword')?.value?.length > 0) {
            <div class="space-y-1.5">
              <div class="flex gap-1.5">
                @for (i of [1,2,3,4]; track i) {
                  <div class="h-1.5 flex-1 rounded-full transition-all duration-300"
                    [ngClass]="strength.score >= i
                      ? (strength.score === 1 ? 'bg-red-500' : strength.score === 2 ? 'bg-gray-500' : strength.score === 3 ? 'bg-gray-400' : 'bg-green-500')
                      : 'bg-gray-200'">
                  </div>
                }
              </div>
              <div class="flex items-center justify-between">
                <div class="flex gap-3 text-[10px] text-gray-400">
                  <span [class.text-green-600]="(form.get('newPassword')?.value ?? '').length >= 8">≥ 8 car.</span>
                  <span [class.text-green-600]="/[A-Z]/.test(form.get('newPassword')?.value ?? '')">Maj.</span>
                  <span [class.text-green-600]="/[0-9]/.test(form.get('newPassword')?.value ?? '')">Chiffre</span>
                  <span [class.text-green-600]="/[^A-Za-z0-9]/.test(form.get('newPassword')?.value ?? '')">Symbole</span>
                </div>
                @if (strength.label) {
                  <span class="text-xs font-bold" [class]="strength.color">{{ strength.label }}</span>
                }
              </div>
            </div>
          }
        </div>

        <div class="space-y-1.5">
          <label class="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Confirmer le mot de passe <span class="text-gray-400">*</span>
          </label>
          <div class="relative">
            <input [type]="showConfirm ? 'text' : 'password'" formControlName="confirmPassword"
              placeholder="••••••••" autocomplete="new-password"
              class="w-full px-4 py-2.5 pr-11 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-900 focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 transition-colors"/>
            <button type="button" (click)="showConfirm = !showConfirm"
              class="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
              </svg>
            </button>
          </div>
          @if (form.get('confirmPassword')?.value && form.get('newPassword')?.value !== form.get('confirmPassword')?.value) {
            <p class="text-xs text-red-500">Les mots de passe ne correspondent pas</p>
          }
          @if (form.get('confirmPassword')?.value && form.get('newPassword')?.value === form.get('confirmPassword')?.value && (form.get('confirmPassword')?.value ?? '').length >= 6) {
            <p class="text-xs text-green-600">Les mots de passe correspondent</p>
          }
        </div>

        <div class="flex items-start gap-3 p-3 rounded-lg bg-gray-50 border border-gray-200">
          <svg class="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <p class="text-xs text-gray-500 leading-relaxed">Utilisez au moins 8 caractères avec des lettres, chiffres et symboles pour un mot de passe sécurisé.</p>
        </div>

        <div class="flex justify-end pt-4 border-t border-gray-100">
          <button type="submit" [disabled]="form.invalid || changing || form.get('newPassword')?.value !== form.get('confirmPassword')?.value"
            class="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold text-white transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed bg-gray-800 hover:bg-gray-900 shadow-sm">
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
      { label: 'Trop faible',  color: 'text-red-500' },
      { label: 'Faible',       color: 'text-gray-500' },
      { label: 'Correct',      color: 'text-gray-500' },
      { label: 'Fort',         color: 'text-green-600' },
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
