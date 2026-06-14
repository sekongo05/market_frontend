import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Address, AddressRequest } from '../../../core/models/user.models';

@Component({
  selector: 'app-profile-addresses',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (loading && addresses.length === 0) {
      <div class="space-y-3">
        @for (i of [1,2]; track i) {
          <div class="bg-white rounded-xl p-5 space-y-3 border border-gray-100">
            <div class="skeleton h-4 w-24 rounded"></div>
            <div class="skeleton h-4 w-48 rounded"></div>
            <div class="skeleton h-4 w-32 rounded"></div>
          </div>
        }
      </div>
    }

    @if (!loading || addresses.length > 0) {
      <div class="space-y-3 mb-4">
        @for (addr of addresses; track addr.id) {
          <div class="bg-white rounded-xl p-4 border transition-all duration-200"
               [class.border-amber-300]="addr.isDefault"
               [class.border-gray-100]="!addr.isDefault">
            <div class="flex items-start justify-between gap-3">
              <div class="flex items-start gap-3 min-w-0">
                <div class="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                     [class]="addr.isDefault ? 'bg-amber-50 border border-amber-200' : 'bg-gray-50 border border-gray-200'">
                  <svg class="w-4 h-4" [class.text-amber-600]="addr.isDefault" [class.text-gray-400]="!addr.isDefault" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                  </svg>
                </div>
                <div class="min-w-0">
                  <div class="flex items-center gap-2 flex-wrap">
                    <span class="text-sm font-bold text-gray-900">{{ addr.label }}</span>
                    @if (addr.isDefault) {
                      <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200">Par défaut</span>
                    }
                  </div>
                  <p class="text-sm text-gray-500 mt-0.5">{{ addr.prenom }} {{ addr.nom }}</p>
                  <p class="text-sm text-gray-500">{{ addr.quartier }}, {{ addr.ville }}</p>
                  <p class="text-xs text-gray-400 mt-0.5">{{ addr.phone }}</p>
                  @if (addr.complement) { <p class="text-xs text-gray-400">{{ addr.complement }}</p> }
                </div>
              </div>
              <div class="flex items-center gap-1 flex-shrink-0">
                @if (!addr.isDefault) {
                  <button (click)="setDefault.emit(addr.id)" title="Définir par défaut"
                    class="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:bg-amber-50 text-gray-400 hover:text-amber-600">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>
                    </svg>
                  </button>
                }
                <button (click)="edit(addr)" title="Modifier"
                  class="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:bg-gray-100 text-gray-400 hover:text-gray-700">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                  </svg>
                </button>
                <button (click)="startDelete(addr.id)" title="Supprimer"
                  class="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:bg-red-50 text-gray-400 hover:text-red-500">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        }

        @if (addresses.length === 0 && !loading) {
          <div class="bg-white rounded-xl p-8 text-center border border-gray-100">
            <div class="w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center bg-gray-50 border border-gray-200">
              <svg class="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
              </svg>
            </div>
            <p class="text-sm font-semibold text-gray-500">Aucune adresse enregistrée</p>
            <p class="text-xs text-gray-400 mt-1">Ajoutez une adresse pour accélérer vos commandes</p>
          </div>
        }
      </div>

      @if (addresses.length < MAX_ADDRESSES && !showForm) {
        <button (click)="openForm()"
          class="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all duration-200 border-2 border-dashed border-gray-300 text-gray-500 hover:border-amber-400 hover:text-amber-600 hover:bg-amber-50">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
          </svg>
          Ajouter une adresse ({{ addresses.length }}/{{ MAX_ADDRESSES }})
        </button>
      }

      @if (showForm) {
        <div class="bg-white rounded-xl border border-gray-200 overflow-hidden mt-4">
          <div class="px-5 pt-5 pb-4 border-b border-gray-100">
            <div class="flex items-center justify-between">
              <h3 class="text-base font-bold text-gray-900">{{ editing ? 'Modifier l\'adresse' : 'Nouvelle adresse' }}</h3>
              <button (click)="closeForm()" class="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
          </div>

          <form [formGroup]="addressForm" (ngSubmit)="save()" class="p-5 space-y-4">
            <div>
              <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Type d'adresse</label>
              <div class="flex gap-2">
                @for (lbl of LABELS; track lbl) {
                  <button type="button" (click)="addressForm.patchValue({label: lbl})"
                    class="flex-1 py-2 rounded-lg text-xs font-semibold transition-all"
                    [class]="addressForm.get('label')?.value === lbl ? 'bg-amber-50 border border-amber-300 text-amber-700' : 'bg-gray-50 border border-gray-200 text-gray-500 hover:border-gray-300'">
                    {{ lbl }}
                  </button>
                }
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Prénom</label>
                <input formControlName="prenom" type="text" placeholder="Moussa"
                  class="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-900 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-colors">
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Nom</label>
                <input formControlName="nom" type="text" placeholder="Koné"
                  class="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-900 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-colors">
              </div>
            </div>

            <div>
              <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Téléphone</label>
              <input formControlName="phone" type="tel" placeholder="0700000000"
                class="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-900 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-colors">
            </div>

            <div>
              <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Quartier / Rue</label>
              <input formControlName="quartier" type="text" placeholder="Cocody Riviera 2, Rue des Jardins"
                class="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-900 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-colors">
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Ville</label>
                <input formControlName="ville" type="text" placeholder="Abidjan"
                  class="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-900 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-colors">
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Pays</label>
                <input formControlName="pays" type="text" placeholder="Côte d'Ivoire"
                  class="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-900 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-colors">
              </div>
            </div>

            <div>
              <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Complément <span class="text-gray-400 normal-case font-normal">(optionnel)</span></label>
              <input formControlName="complement" type="text" placeholder="Bâtiment A, Appartement 3..."
                class="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-900 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-colors">
            </div>

            <label class="flex items-center gap-3 cursor-pointer group">
              <input formControlName="isDefault" type="checkbox" class="sr-only peer">
              <div class="w-5 h-5 rounded-lg flex items-center justify-center flex-shrink-0 transition-all border-2 border-gray-300 peer-checked:border-amber-600 peer-checked:bg-amber-600">
                @if (addressForm.get('isDefault')?.value) {
                  <svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/>
                  </svg>
                }
              </div>
              <span class="text-sm font-medium text-gray-600 group-hover:text-gray-900 transition-colors">Définir comme adresse par défaut</span>
            </label>

            <div class="flex items-center justify-end gap-3 pt-2">
              <button type="button" (click)="closeForm()" class="px-5 py-2.5 rounded-lg text-sm font-semibold text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors">Annuler</button>
              <button type="submit" [disabled]="addressForm.invalid || saving"
                class="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold text-white transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed bg-amber-600 hover:bg-amber-700 shadow-sm">
                @if (saving) {
                  <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Enregistrement…
                } @else {
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                  </svg>
                  {{ editing ? 'Mettre à jour' : 'Enregistrer' }}
                }
              </button>
            </div>
          </form>
        </div>
      }
    }

    @if (deleteId) {
      <div class="fixed inset-0 z-[70] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/60" (click)="deleteId = null"></div>
        <div class="relative w-full max-w-sm bg-white rounded-2xl shadow-xl p-6">
          <div class="w-12 h-12 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center mx-auto mb-4">
            <svg class="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <h3 class="text-base font-bold text-gray-900 text-center mb-1">Supprimer cette adresse ?</h3>
          <p class="text-sm text-gray-500 text-center mb-4">Cette action est irréversible.</p>
          <div class="flex gap-3">
            <button (click)="deleteId = null" class="flex-1 py-2.5 border border-gray-200 text-gray-500 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors">Annuler</button>
            <button (click)="confirmDelete()" class="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600 transition-colors shadow-sm">Supprimer</button>
          </div>
        </div>
      </div>
    }
  `,
})
export class ProfileAddressesComponent {
  @Input({ required: true }) addresses: Address[] = [];
  @Input() loading = false;
  @Input() saving = false;
  @Output() add = new EventEmitter<AddressRequest>();
  @Output() update = new EventEmitter<{ id: number; data: AddressRequest }>();
  @Output() remove = new EventEmitter<number>();
  @Output() setDefault = new EventEmitter<number>();

  readonly LABELS = ['Domicile', 'Bureau', 'Autre'];
  readonly MAX_ADDRESSES = 5;
  showForm = false;
  editing: Address | null = null;
  deleteId: number | null = null;

  addressForm: FormGroup;

  constructor(private fb: FormBuilder) {
    this.addressForm = this.fb.group({
      label:      ['Domicile', Validators.required],
      nom:        ['', Validators.required],
      prenom:     ['', Validators.required],
      phone:      ['+225', [Validators.required, Validators.pattern(/^(\+225|00225)?\s?[0-9]{10}$/)]],
      quartier:   ['', Validators.required],
      ville:      ['', Validators.required],
      pays:       ['Côte d\'Ivoire', Validators.required],
      complement: [''],
      isDefault:  [false],
    });
  }

  openForm(addr?: Address): void {
    this.editing = addr ?? null;
    this.showForm = true;
    if (addr) {
      this.addressForm.patchValue(addr);
    } else {
      this.addressForm.reset({ label: 'Domicile', pays: 'Côte d\'Ivoire', phone: '+225', isDefault: false });
    }
  }

  closeForm(): void {
    this.showForm = false;
    this.editing = null;
  }

  save(): void {
    if (this.addressForm.invalid) return;
    if (this.editing) {
      this.update.emit({ id: this.editing.id, data: this.addressForm.value });
    } else {
      this.add.emit(this.addressForm.value);
    }
  }

  startDelete(id: number): void { this.deleteId = id; }
  confirmDelete(): void { if (this.deleteId) { this.remove.emit(this.deleteId); this.deleteId = null; } }

  edit(addr: Address): void { this.openForm(addr); }
}
