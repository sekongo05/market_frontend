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
    <div class="min-h-screen flex items-center justify-center bg-[#070502] px-4">
      <div class="w-full max-w-md">
        <div class="text-center mb-8">
          <a routerLink="/"><app-sdm-logo class="inline-block mb-6" /></a>
          <h1 class="text-2xl font-bold text-white">Nouveau mot de passe</h1>
          <p class="text-gray-400 mt-2 text-sm">
            Choisissez un mot de passe sécurisé pour votre compte.
          </p>
        </div>

        @if (tokenMissing) {
          <div class="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center mb-6">
            Lien de réinitialisation invalide ou manquant. Veuillez refaire une demande.
          </div>
          <p class="text-center text-sm text-gray-500">
            <a routerLink="/auth/forgot-password" class="text-[#d4af37] hover:underline">Nouvelle demande</a>
          </p>
        } @else if (success) {
          <div class="p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm text-center mb-6">
            Mot de passe réinitialisé avec succès !
          </div>
          <p class="text-center text-sm text-gray-500">
            <a routerLink="/auth/login" class="text-[#d4af37] hover:underline">Se connecter</a>
          </p>
        } @else {
          <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-5">
            <div>
              <label for="password" class="block text-sm font-semibold text-gray-300 mb-1.5">Nouveau mot de passe</label>
              <input id="password" type="password" formControlName="newPassword"
                class="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] outline-none transition-colors"
                placeholder="8 caractères min, 1 majuscule, 1 chiffre" />
              @if (submitted && form.controls['newPassword'].errors) {
                <p class="text-red-400 text-xs mt-1">
                  @if (form.controls['newPassword'].errors['required']) { Mot de passe requis }
                  @else if (form.controls['newPassword'].errors['minlength']) { Minimum 8 caractères }
                  @else { Doit contenir une majuscule et un chiffre }
                </p>
              }
            </div>

            <div>
              <label for="confirmPassword" class="block text-sm font-semibold text-gray-300 mb-1.5">Confirmer le mot de passe</label>
              <input id="confirmPassword" type="password" formControlName="confirmPassword"
                class="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] outline-none transition-colors"
                placeholder="Confirmez le mot de passe" />
              @if (submitted && form.errors?.['mismatch']) {
                <p class="text-red-400 text-xs mt-1">Les mots de passe ne correspondent pas</p>
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
              {{ loading ? 'Réinitialisation…' : 'Réinitialiser' }}
            </button>

            <p class="text-center text-sm text-gray-500">
              <a routerLink="/auth/login" class="text-[#d4af37] hover:underline">Retour à la connexion</a>
            </p>
          </form>
        }
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
