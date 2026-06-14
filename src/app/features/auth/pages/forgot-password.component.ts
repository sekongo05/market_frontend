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
    <div class="relative min-h-screen flex items-center justify-center bg-[#070502] overflow-hidden px-4 py-12">
      <!-- Ambient orbs -->
      <div class="absolute inset-0 pointer-events-none">
        <div class="absolute -top-40 -right-40 w-96 h-96 bg-[#d4af37]/5 rounded-full blur-[120px]"></div>
        <div class="absolute -bottom-40 -left-40 w-96 h-96 bg-[#d4af37]/3 rounded-full blur-[120px]"></div>
      </div>

      <div class="relative w-full max-w-md">
        <!-- Success state -->
        @if (success) {
          <div class="text-center">
            <div class="w-16 h-16 rounded-full bg-[#d4af37]/10 flex items-center justify-center mx-auto mb-6">
              <svg class="w-8 h-8 text-[#d4af37]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 class="text-xl font-bold text-white mb-2">Email envoyé</h2>
            <p class="text-gray-400 text-sm mb-6 leading-relaxed">
              Si un compte existe avec cette adresse, vous recevrez<br class="hidden sm:inline" />
              un lien de réinitialisation sous quelques minutes.
            </p>
            <a routerLink="/auth/login"
              class="inline-block px-6 py-2.5 rounded-xl bg-[#d4af37] text-black font-bold text-sm uppercase tracking-widest hover:bg-[#e0b845] transition-colors">
              Retour à la connexion
            </a>
          </div>
        } @else {
          <!-- Header -->
          <div class="text-center mb-8">
            <a routerLink="/"><app-sdm-logo class="inline-block mb-6" /></a>
            <div class="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
              <svg class="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
            </div>
            <h1 class="text-xl font-bold text-white">Mot de passe oublié</h1>
            <p class="text-gray-400 mt-2 text-sm leading-relaxed">
              Saisissez l'email lié à votre compte, nous vous enverrons<br class="hidden sm:inline" />
              un lien pour réinitialiser votre mot de passe.
            </p>
          </div>

          <!-- Card -->
          <div class="bg-white/[0.03] backdrop-blur-xl rounded-2xl border border-white/[0.06] p-6 sm:p-8">
            <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-5">
              <!-- Email -->
              <div>
                <label for="email" class="block text-sm font-semibold text-gray-300 mb-1.5">Adresse email</label>
                <div class="relative">
                  <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <svg class="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                    </svg>
                  </span>
                  <input id="email" type="email" formControlName="email"
                    class="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border text-white placeholder-gray-500 outline-none transition-all duration-200"
                    [class.border-white/10]="!submitted || !form.controls['email'].errors"
                    [class.border-red-400/40]="submitted && form.controls['email'].errors"
                    placeholder="vous@exemple.com" />
                </div>
                @if (submitted && form.controls['email'].errors) {
                  <p class="text-red-400 text-xs mt-1.5 flex items-center gap-1">
                    <svg class="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                    </svg>
                    Email valide requis
                  </p>
                }
              </div>

              @if (error) {
                <div class="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
                  {{ error }}
                </div>
              }

              <button type="submit" [disabled]="loading"
                class="relative w-full py-3 rounded-xl font-bold text-sm uppercase tracking-widest transition-all duration-200 overflow-hidden"
                [class.bg-[#d4af37] text-black hover:bg-[#e0b845] active:scale-[0.98]]="!loading"
                [class.bg-white/5 text-gray-500 cursor-not-allowed]="loading">
                @if (loading) {
                  <span class="flex items-center justify-center gap-2">
                    <svg class="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                    Envoi en cours…
                  </span>
                } @else {
                  Envoyer le lien
                }
              </button>
            </form>
          </div>

          <!-- Back link -->
          <div class="text-center mt-6">
            <a routerLink="/auth/login"
              class="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-300 transition-colors">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
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
