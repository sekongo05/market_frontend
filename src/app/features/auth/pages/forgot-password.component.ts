import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { timeout, catchError, of } from 'rxjs';
import { SdmLogoComponent } from '../../../shared/components/logo.component';

@Component({
  selector: 'app-forgot-password',
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
            Retour
          </a>

          <!-- Logo centré (mobile) -->
          <div class="flex justify-center lg:hidden mb-8">
            <app-sdm-logo [size]="64"></app-sdm-logo>
          </div>

          <div class="mb-8">
            <h1 class="text-3xl font-black theme-text mb-2">Mot de passe oublié</h1>
            <p class="theme-muted text-sm">Saisissez l'email lié à votre compte. Nous vous enverrons un lien de réinitialisation.</p>
          </div>

          <!-- Success state -->
          @if (success) {
            <div class="text-center p-8 rounded-2xl" style="background: rgba(212,175,55,0.05); border: 1px solid rgba(212,175,55,0.15);">
              <div class="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style="background: rgba(212,175,55,0.1);">
                <svg class="w-8 h-8" style="color:#d4af37" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 class="text-xl font-bold theme-text mb-2">Email envoyé</h2>
              <p class="theme-muted text-sm mb-6 leading-relaxed">Si un compte existe avec cette adresse, vous recevrez un lien de réinitialisation sous quelques minutes.</p>
              <a routerLink="/auth/login"
                class="inline-block px-6 py-2.5 rounded-xl font-bold text-sm text-black"
                style="background: linear-gradient(135deg, #f5cc42, #d4af37); box-shadow: 0 4px 20px rgba(212,175,55,0.3);">
                Retour à la connexion
              </a>
            </div>
          } @else {
            <!-- Error -->
            @if (error) {
              <div class="flex items-center gap-3 p-4 rounded-2xl mb-6 text-sm font-medium"
                   style="background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.25); color:#f87171;">
                <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                {{ error }}
              </div>
            }

            <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-5">
              <!-- Email -->
              <div>
                <label class="block text-sm font-semibold theme-text mb-1.5">Adresse email</label>
                <div class="relative">
                  <svg class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 theme-muted pointer-events-none"
                       fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                          d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                  </svg>
                  <input id="email" type="email" formControlName="email" autocomplete="email"
                           placeholder="vous@exemple.com"
                    class="w-full pl-10 pr-4 py-3.5 rounded-xl text-sm theme-text theme-surface theme-border border
                           transition-all duration-200 focus:outline-none placeholder-gray-400
                           focus:border-yellow-500/60 focus:ring-2 focus:ring-yellow-500/20"
                    [class.border-red-500!]="submitted && form.controls['email'].errors"/>
                </div>
                @if (submitted && form.controls['email'].errors) {
                  <p class="mt-1.5 text-xs font-medium" style="color:#f87171;">Email valide requis</p>
                }
              </div>

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
                  Envoi en cours…
                } @else {
                  Envoyer le lien
                }
              </button>
            </form>

            <p class="mt-6 text-center text-sm theme-muted">
              <a routerLink="/auth/login" class="text-gold font-semibold hover:opacity-80 transition-opacity">Retour à la connexion</a>
            </p>
          }

        </div>
      </div>
    </div>
  `,
})
export class ForgotPasswordComponent {
  form: FormGroup;
  loading = false;
  submitted = false;
  error: string | null = null;
  success = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private toast: ToastService,
  ) {
    this.form = this.fb.group({ email: ['', [Validators.required, Validators.email]] });
  }

  submit(): void {
    this.submitted = true;
    this.error = null;
    if (this.form.invalid) return;

    this.loading = true;
    this.authService.forgotPassword({ email: this.form.value.email })
      .pipe(
        timeout(15_000),
        catchError(err => {
          this.loading = false;
          this.error = 'Erreur lors de l\'envoi';
          return of(null);
        })
      )
      .subscribe(res => {
        if (res === null) return;
        this.loading = false;
        this.success = true;
        this.toast.success('Email envoyé si le compte existe');
      });
  }
}
