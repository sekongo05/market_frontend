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
    <div class="min-h-screen flex items-center justify-center bg-[#070502] px-4">
      <div class="w-full max-w-md">
        <div class="text-center mb-8">
          <a routerLink="/"><app-sdm-logo class="inline-block mb-6" /></a>
          <h1 class="text-2xl font-bold text-white">Mot de passe oublié</h1>
          <p class="text-gray-400 mt-2 text-sm">
            Saisissez votre email, nous vous enverrons un lien de réinitialisation.
          </p>
        </div>

        <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-5">
          <div>
            <label for="email" class="block text-sm font-semibold text-gray-300 mb-1.5">Email</label>
            <input id="email" type="email" formControlName="email"
              class="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] outline-none transition-colors"
              placeholder="vous@exemple.com" />
            @if (submitted && form.controls['email'].errors) {
              <p class="text-red-400 text-xs mt-1">Email valide requis</p>
            }
          </div>

          @if (error) {
            <div class="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
              {{ error }}
            </div>
          }

          <button type="submit" [disabled]="loading"
            class="w-full py-3 rounded-xl font-bold text-sm uppercase tracking-widest transition-all"
            [class.bg-[#d4af37] text-black]="!loading"
            [class.bg-gray-700 text-gray-400 cursor-not-allowed]="loading">
            {{ loading ? 'Envoi en cours…' : 'Envoyer le lien' }}
          </button>

          <p class="text-center text-sm text-gray-500">
            <a routerLink="/auth/login" class="text-[#d4af37] hover:underline">Retour à la connexion</a>
          </p>
        </form>
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
