import { Component, OnInit, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { UserResponse } from '../../../core/models/user.models';

@Component({
  selector: 'app-profile-info',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div>
      <div class="flex items-center gap-3 mb-6">
        <div class="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center flex-shrink-0">
          <svg class="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
          </svg>
        </div>
        <div>
          <h2 class="text-base font-bold text-gray-900">Informations personnelles</h2>
          <p class="text-xs text-gray-500 mt-0.5">Mettez à jour vos informations de contact</p>
        </div>
      </div>

      <form [formGroup]="form" (ngSubmit)="save()" class="space-y-5">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="space-y-1.5">
            <label class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Nom <span class="text-amber-600">*</span></label>
            <input type="text" formControlName="nom" placeholder="Koné"
              class="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-900 font-medium focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-colors"
              [class.border-red-400]="form.get('nom')?.invalid && form.get('nom')?.touched"/>
          </div>
          <div class="space-y-1.5">
            <label class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Prénom <span class="text-amber-600">*</span></label>
            <input type="text" formControlName="prenom" placeholder="Moussa"
              class="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-900 font-medium focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-colors"
              [class.border-red-400]="form.get('prenom')?.invalid && form.get('prenom')?.touched"/>
          </div>
        </div>

        <div class="space-y-1.5">
          <label class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Adresse e-mail</label>
          <div class="relative">
            <input type="email" [value]="user.email || ''" disabled
              class="w-full px-4 py-2.5 pl-10 rounded-lg border border-gray-200 bg-gray-100 text-sm text-gray-400 cursor-not-allowed"/>
            <div class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
              </svg>
            </div>
          </div>
          <p class="text-xs text-gray-400 flex items-center gap-1">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            L'adresse e-mail ne peut pas être modifiée
          </p>
        </div>

        <div class="space-y-1.5">
          <label class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Téléphone <span class="text-amber-600">*</span></label>
          <div class="relative">
            <input type="tel" formControlName="phone" placeholder="+225 07 000 00 00"
              class="w-full px-4 py-2.5 pl-10 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-900 font-medium focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-colors"/>
            <div class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
              </svg>
            </div>
          </div>
        </div>

        @if (!hasPhone) {
          <div class="flex items-start gap-2.5 px-3 py-3 rounded-lg bg-amber-50 border border-amber-200">
            <svg class="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <p class="text-xs text-amber-700 leading-relaxed">Votre numéro WhatsApp est indispensable pour recevoir les mises à jour de vos commandes et les confirmations de livraison.</p>
          </div>
        }

        <div class="flex items-center justify-between pt-4 border-t border-gray-100">
          <div class="flex items-center gap-2">
            @if (!isManager) {
              <a routerLink="/orders" class="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-amber-600 transition-colors">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                </svg>
                Mes commandes
              </a>
            }
          </div>
          <button type="submit" [disabled]="form.invalid || !form.dirty || saving"
            class="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold text-white transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed bg-amber-600 hover:bg-amber-700 shadow-sm">
            @if (saving) {
              <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Sauvegarde…
            } @else {
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
              </svg>
              Sauvegarder
            }
          </button>
        </div>
      </form>
    </div>
  `,
})
export class ProfileInfoComponent implements OnInit {
  @Input({ required: true }) user!: UserResponse;
  @Input() isManager = false;
  @Input() saving = false;
  @Output() saveProfile = new EventEmitter<{ nom: string; prenom: string; phone: string }>();

  form: FormGroup;

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      nom:    ['', Validators.required],
      prenom: ['', Validators.required],
      phone:  ['+225', Validators.required],
    });
  }

  ngOnInit(): void {
    this.form.patchValue({
      nom: this.user.nom,
      prenom: this.user.prenom,
      phone: this.user.phone,
    });
    this.form.markAsPristine();
  }

  get hasPhone(): boolean {
    const p = this.user?.phone?.trim();
    return !!p && p !== '+225' && p.length > 6;
  }

  save(): void {
    if (this.form.invalid) return;
    this.saveProfile.emit(this.form.value);
  }
}
