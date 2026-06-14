import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { SdmLogoComponent } from '../../../shared/components/logo.component';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, SdmLogoComponent],
  template: `
    <div class="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div class="w-full max-w-md">

        <!-- Logo -->
        <div class="text-center mb-8">
          <a routerLink="/" class="inline-block mb-6 hover:opacity-80 transition-opacity">
            <app-sdm-logo [size]="64"></app-sdm-logo>
          </a>
          <h1 class="text-xl font-bold text-gray-900">Mot de passe oublié</h1>
          <p class="text-sm text-gray-500 mt-2">
            Saisissez l'email lié à votre compte. Nous vous enverrons un lien de réinitialisation.
          </p>
        </div>

        <!-- Success state -->
        @if (success) {
          <div class="bg-white rounded-2xl p-8 text-center border border-gray-100 shadow-sm">
            <div class="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto mb-4">
              <svg class="w-7 h-7 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 class="text-lg font-bold text-gray-900 mb-1">Email envoyé</h2>
            <p class="text-sm text-gray-500 mb-6 leading-relaxed">
              Si un compte existe avec cette adresse, vous recevrez un lien de réinitialisation sous quelques minutes.
            </p>
            <a routerLink="/auth/login"
              class="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold text-white bg-gray-800 hover:bg-gray-900 transition-colors shadow-sm">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.5 19.5l-7.5-7.5 7.5-7.5m-7.5 7.5H21" />
              </svg>
              Retour à la connexion
            </a>
          </div>
        } @else {
          <!-- Card -->
          <div class="bg-white rounded-2xl p-6 sm:p-8 border border-gray-100 shadow-sm">
            <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-5">

              <div>
                <label for="email" class="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Adresse email</label>
                <div class="relative">
                  <input id="email" type="email" formControlName="email"
                    placeholder="vous@exemple.com"
                    class="w-full px-4 py-3 rounded-lg border bg-gray-50 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400"
                    [class.border-gray-200]="!submitted || !form.controls['email'].errors"
                    [class.border-red-400]="submitted && form.controls['email'].errors"/>
                </div>
                @if (submitted && form.controls['email'].errors) {
                  <p class="text-xs text-red-500 mt-1.5">Email valide requis</p>
                }
              </div>

              @if (error) {
                <div class="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm text-center">
                  {{ error }}
                </div>
              }

              <button type="submit" [disabled]="loading"
                class="w-full flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold text-white transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed bg-gray-800 hover:bg-gray-900 shadow-sm">
                @if (loading) {
                  <svg class="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  Envoi en cours…
                } @else {
                  Envoyer le lien
                }
              </button>
            </form>
          </div>

          <!-- Back link -->
          <div class="text-center mt-6">
            <a routerLink="/auth/login"
              class="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5l-7.5-7.5 7.5-7.5m-7.5 7.5H21" />
              </svg>
              Retour à la connexion
            </a>
          </div>
        }

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
    this.authService.forgotPassword({ email: this.form.value.email }).subscribe({
      next: () => {
        this.loading = false;
        this.success = true;
        this.toast.success('Email envoyé si le compte existe');
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.message || 'Erreur lors de l\'envoi';
      },
    });
  }
}
