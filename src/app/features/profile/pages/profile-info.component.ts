import { Component, OnInit, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { UserResponse } from '../../../core/models/user.models';

@Component({
  selector: 'app-profile-info',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div>
      <div class="flex items-center justify-between gap-3 mb-6">
        <div class="flex items-center gap-3 min-w-0">
          <div class="w-10 h-10 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center flex-shrink-0">
            <svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
            </svg>
          </div>
          <div>
            <h2 class="text-base font-bold text-gray-900">Informations personnelles</h2>
            <p class="text-xs text-gray-500 mt-0.5">Consultez et modifiez vos informations</p>
          </div>
        </div>
        @if (!editing) {
          <button (click)="startEditing()"
            class="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors flex-shrink-0">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
            </svg>
            Modifier
          </button>
        }
      </div>

      @if (!editing) {
        <!-- Read-only mode -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
          <div>
            <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Nom</p>
            <p class="text-sm font-medium text-gray-900">{{ user.nom }}</p>
          </div>
          <div>
            <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Prénom</p>
            <p class="text-sm font-medium text-gray-900">{{ user.prenom }}</p>
          </div>
          <div>
            <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Email</p>
            <p class="text-sm text-gray-500">{{ user.email }}</p>
          </div>
          <div>
            <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Téléphone</p>
            <p class="text-sm font-medium text-gray-900">{{ hasPhone ? user.phone : 'Non renseigné' }}</p>
          </div>
        </div>
      } @else {
        <!-- Edit mode -->
        <form [formGroup]="form" (ngSubmit)="save()" class="space-y-5">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Nom <span class="text-gray-400">*</span></label>
              <input type="text" formControlName="nom"
                class="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-900 font-medium focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 transition-colors"
                [class.border-red-400]="form.get('nom')?.invalid && form.get('nom')?.touched"/>
            </div>
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Prénom <span class="text-gray-400">*</span></label>
              <input type="text" formControlName="prenom"
                class="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-900 font-medium focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 transition-colors"
                [class.border-red-400]="form.get('prenom')?.invalid && form.get('prenom')?.touched"/>
            </div>
          </div>

          <div class="space-y-1.5">
            <label class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</label>
            <p class="text-sm text-gray-400 px-4 py-2.5 rounded-lg bg-gray-50 border border-gray-200">{{ user.email }}</p>
          </div>

          <div class="space-y-1.5">
            <label class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Téléphone <span class="text-gray-400">*</span></label>
            <input type="tel" formControlName="phone" placeholder="+225 07 000 00 00"
              class="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-900 font-medium focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 transition-colors"/>
          </div>

          @if (!hasPhone) {
            <div class="flex items-start gap-2.5 px-3 py-3 rounded-lg bg-gray-50 border border-gray-200">
              <svg class="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <p class="text-xs text-gray-500 leading-relaxed">Votre numéro WhatsApp est indispensable pour recevoir les mises à jour de vos commandes.</p>
            </div>
          }

          <div class="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
            <button type="button" (click)="cancelEditing()"
              class="px-5 py-2.5 rounded-lg text-sm font-semibold text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors">
              Annuler
            </button>
            <button type="submit" [disabled]="form.invalid || !form.dirty || saving"
              class="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold text-white transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed bg-gray-800 hover:bg-gray-900 shadow-sm">
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
      }
    </div>
  `,
})
export class ProfileInfoComponent implements OnInit {
  @Input({ required: true }) user!: UserResponse;
  @Input() isManager = false;
  private _saving = false;
  @Input() set saving(v: boolean) {
    if (this._saving && !v && this.editing) {
      this.editing = false;
    }
    this._saving = v;
  }
  get saving(): boolean { return this._saving; }
  @Output() saveProfile = new EventEmitter<{ nom: string; prenom: string; phone: string }>();

  form: FormGroup;
  editing = false;

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      nom:    ['', Validators.required],
      prenom: ['', Validators.required],
      phone:  ['+225', Validators.required],
    });
  }

  ngOnInit(): void {
    this.resetForm();
  }

  get hasPhone(): boolean {
    const p = this.user?.phone?.trim();
    return !!p && p !== '+225' && p.length > 6;
  }

  startEditing(): void {
    this.resetForm();
    this.editing = true;
  }

  cancelEditing(): void {
    this.editing = false;
    this.resetForm();
  }

  private resetForm(): void {
    this.form.patchValue({
      nom: this.user.nom,
      prenom: this.user.prenom,
      phone: this.user.phone,
    });
    this.form.markAsPristine();
  }

  save(): void {
    if (this.form.invalid) return;
    this.saveProfile.emit(this.form.value);
  }
}
