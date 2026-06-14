import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { SdmLogoComponent } from '../../../shared/components/logo.component';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, SdmLogoComponent],
  template: `
    <div class="min-h-screen flex theme-bg">
      <div class="w-full flex items-center justify-center p-6 sm:p-10">
        <div class="w-full max-w-md">

          <!-- Back link -->
          <a routerLink="/auth/login"
            class="inline-flex items-center gap-1.5 text-xs font-semibold theme-muted hover:text-gold transition-colors group mb-10">
            <svg class="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform duration-150" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
            </svg>
            Connexion
          </a>

          <!-- Logo centré (mobile) -->
          <div class="flex justify-center lg:hidden mb-8">
            <app-sdm-logo [size]="64"></app-sdm-logo>
          </div>

          @if (tokenMissing) {
            <div class="p-4 rounded-2xl mb-6 text-sm text-center" style="background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.25); color:#f87171;">
              Lien de réinitialisation invalide ou manquant.
            </div>
            <p class="text-center text-sm theme-muted">
              <a routerLink="/auth/forgot-password" class="text-gold font-semibold hover:opacity-80 transition-opacity">Nouvelle demande</a>
            </p>
          } @else if (success) {
            <div class="text-center p-8 rounded-2xl" style="background: rgba(212,175,55,0.05); border: 1px solid rgba(212,175,55,0.15);">
              <div class="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style="background: rgba(212,175,55,0.1);">
                <svg class="w-8 h-8" style="color:#d4af37" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 class="text-xl font-bold theme-text mb-2">Mot de passe réinitialisé</h2>
              <p class="theme-muted text-sm mb-6">Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.</p>
              <a routerLink="/auth/login"
                class="inline-block px-6 py-2.5 rounded-xl font-bold text-sm text-black"
                style="background: linear-gradient(135deg, #f5cc42, #d4af37); box-shadow: 0 4px 20px rgba(212,175,55,0.3);">
                Se connecter
              </a>
            </div>
          } @else {
            <div class="mb-8">
              <h1 class="text-3xl font-black theme-text mb-2">Nouveau mot de passe</h1>
              <p class="theme-muted text-sm">Choisissez un mot de passe sécurisé pour votre compte.</p>
            </div>

            <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-5">
              <div>
                <label class="block text-sm font-semibold theme-text mb-1.5">Nouveau mot de passe</label>
                <input id="password" type="password" formControlName="newPassword"
                  class="w-full px-4 py-3.5 rounded-xl text-sm theme-text theme-surface theme-border border
                         transition-all duration-200 focus:outline-none placeholder-gray-400
                         focus:border-yellow-500/60 focus:ring-2 focus:ring-yellow-500/20"
                  placeholder="8 car. min, 1 majuscule, 1 chiffre" />
                @if (submitted && form.controls['newPassword'].errors) {
                  <p class="mt-1.5 text-xs font-medium" style="color:#f87171;">
                    @if (form.controls['newPassword'].errors['required']) { Mot de passe requis }
                    @else if (form.controls['newPassword'].errors['minlength']) { Minimum 8 caractères }
                  </p>
                }
              </div>

              <div>
                <label class="block text-sm font-semibold theme-text mb-1.5">Confirmer le mot de passe</label>
                <input id="confirmPassword" type="password" formControlName="confirmPassword"
                  class="w-full px-4 py-3.5 rounded-xl text-sm theme-text theme-surface theme-border border
                         transition-all duration-200 focus:outline-none placeholder-gray-400
                         focus:border-yellow-500/60 focus:ring-2 focus:ring-yellow-500/20"
                  placeholder="Confirmez le mot de passe" />
                @if (submitted && form.errors?.['mismatch']) {
                  <p class="mt-1.5 text-xs font-medium" style="color:#f87171;">Les mots de passe ne correspondent pas</p>
                }
              </div>

              @if (error) {
                <div class="p-3 rounded-xl" style="background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.25); color:#f87171; text-align:center; font-size:0.875rem;">
                  {{ error }}
                </div>
              }

              <button type="submit" [disabled]="loading"
                class="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm text-black
                       transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed
                       hover:-translate-y-0.5 disabled:translate-y-0"
                style="background: linear-gradient(135deg, #f5cc42, #d4af37); box-shadow: 0 4px 20px rgba(212,175,55,0.3);">
                @if (loading) {
                  <svg class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Réinitialisation…
                } @else {
                  Réinitialiser
                }
              </button>
            </form>
          }

        </div>
      </div>
    </div>
  `,
})
export class ResetPasswordComponent implements OnInit {
  form: FormGroup;
  loading = false;
  submitted = false;
  error: string | null = null;
  success = false;
  tokenMissing = false;
  private token = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private toast: ToastService,
    private route: ActivatedRoute,
    private router: Router,
  ) {
    this.form = this.fb.group({
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]],
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') || '';
    if (!this.token) {
      this.tokenMissing = true;
    }
  }

  private passwordMatchValidator(g: FormGroup) {
    const pwd = g.get('newPassword')?.value;
    const confirm = g.get('confirmPassword')?.value;
    return pwd === confirm ? null : { mismatch: true };
  }

  submit(): void {
    this.submitted = true;
    this.error = null;
    if (this.form.invalid) return;

    this.loading = true;
    this.authService.resetPassword({ token: this.token, newPassword: this.form.value.newPassword }).subscribe({
      next: () => {
        this.loading = false;
        this.success = true;
        this.toast.success('Mot de passe réinitialisé');
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.message || 'Erreur lors de la réinitialisation';
      },
    });
  }
}
