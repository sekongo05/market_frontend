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
          <div class="luxury-card rounded-2xl p-5 space-y-3">
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
          <div class="luxury-card rounded-2xl p-5 transition-all duration-200"
               [style]="addr.isDefault ? 'border-color: rgba(184,148,30,0.4)' : ''">
            <div class="flex items-start justify-between gap-3">
              <div class="flex items-start gap-3 min-w-0">
                <div class="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                     [style]="addr.isDefault ? 'background: rgba(184,148,30,0.12); border: 1px solid rgba(184,148,30,0.3)' : 'background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08)'">
                  <svg class="w-4 h-4" [class]="addr.isDefault ? 'text-gold' : 'text-white/40'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                  </svg>
                </div>
                <div class="min-w-0">
                  <div class="flex items-center gap-2 flex-wrap">
                    <span class="text-sm font-bold theme-text">{{ addr.label }}</span>
                    @if (addr.isDefault) {
                      <span class="px-2 py-0.5 rounded-full text-[10px] font-bold" style="background: rgba(184,148,30,0.15); color: #b8941e; border: 1px solid rgba(184,148,30,0.3)">Par défaut</span>
                    }
                  </div>
                  <p class="text-sm theme-muted mt-0.5">{{ addr.prenom }} {{ addr.nom }}</p>
                  <p class="text-sm theme-muted">{{ addr.quartier }}, {{ addr.ville }}</p>
                  <p class="text-xs text-white/30 mt-0.5">{{ addr.phone }}</p>
                  @if (addr.complement) { <p class="text-xs text-white/30">{{ addr.complement }}</p> }
                </div>
              </div>
              <div class="flex items-center gap-1 flex-shrink-0">
                @if (!addr.isDefault) {
                  <button (click)="setDefault.emit(addr.id)" title="Définir par défaut"
                    class="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:bg-gold/10 text-white/30 hover:text-gold">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>
                    </svg>
                  </button>
                }
                <button (click)="edit(addr)" title="Modifier"
                  class="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:bg-white/5 text-white/30 hover:text-white">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                  </svg>
                </button>
                <button (click)="startDelete(addr.id)" title="Supprimer"
                  class="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:bg-red-500/10 text-white/30 hover:text-red-400">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        }

        @if (addresses.length === 0 && !loading) {
          <div class="luxury-card rounded-2xl p-8 text-center">
            <div class="w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08)">
              <svg class="w-6 h-6 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
              </svg>
            </div>
            <p class="text-sm font-semibold theme-muted">Aucune adresse enregistrée</p>
            <p class="text-xs text-white/20 mt-1">Ajoutez une adresse pour accélérer vos commandes</p>
          </div>
        }
      </div>

      @if (addresses.length < MAX_ADDRESSES && !showForm) {
        <button (click)="openForm()"
          class="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold transition-all duration-200 hover:-translate-y-0.5"
          style="background: rgba(184,148,30,0.08); border: 1px dashed rgba(184,148,30,0.3); color: #b8941e">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
          </svg>
          Ajouter une adresse ({{ addresses.length }}/{{ MAX_ADDRESSES }})
        </button>
      }

      @if (showForm) {
        <div class="luxury-card rounded-3xl overflow-hidden mt-4">
          <div class="px-6 sm:px-8 pt-6 pb-5 border-b theme-border">
            <div class="flex items-center justify-between">
              <h3 class="text-base font-black theme-text">{{ editing ? 'Modifier l\'adresse' : 'Nouvelle adresse' }}</h3>
              <button (click)="closeForm()" class="w-8 h-8 rounded-lg flex items-center justify-center text-white/30 hover:text-white hover:bg-white/5 transition-all">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
          </div>

          <form [formGroup]="addressForm" (ngSubmit)="save()" class="px-6 sm:px-8 py-6 space-y-4">
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider theme-muted mb-2">Type d'adresse</label>
              <div class="flex gap-2">
                @for (lbl of LABELS; track lbl) {
                  <button type="button" (click)="addressForm.patchValue({label: lbl})"
                    class="flex-1 py-2 rounded-xl text-xs font-bold transition-all"
                    [style]="addressForm.get('label')?.value === lbl ? 'background: rgba(184,148,30,0.15); border: 1px solid rgba(184,148,30,0.4); color: #b8941e' : 'background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); color: rgba(255,255,255,0.4)'">
                    {{ lbl }}
                  </button>
                }
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-bold uppercase tracking-wider theme-muted mb-2">Prénom</label>
                <input formControlName="prenom" type="text" placeholder="Moussa"
                  class="w-full px-4 py-3 rounded-xl text-sm theme-text transition-all outline-none focus:ring-1"
                  style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1)">
              </div>
              <div>
                <label class="block text-xs font-bold uppercase tracking-wider theme-muted mb-2">Nom</label>
                <input formControlName="nom" type="text" placeholder="Koné"
                  class="w-full px-4 py-3 rounded-xl text-sm theme-text transition-all outline-none focus:ring-1"
                  style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1)">
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold uppercase tracking-wider theme-muted mb-2">Téléphone</label>
              <input formControlName="phone" type="tel" placeholder="0700000000"
                class="w-full px-4 py-3 rounded-xl text-sm theme-text transition-all outline-none focus:ring-1"
                style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1)">
            </div>

            <div>
              <label class="block text-xs font-bold uppercase tracking-wider theme-muted mb-2">Quartier / Rue</label>
              <input formControlName="quartier" type="text" placeholder="Cocody Riviera 2, Rue des Jardins"
                class="w-full px-4 py-3 rounded-xl text-sm theme-text transition-all outline-none focus:ring-1"
                style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1)">
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-bold uppercase tracking-wider theme-muted mb-2">Ville</label>
                <input formControlName="ville" type="text" placeholder="Abidjan"
                  class="w-full px-4 py-3 rounded-xl text-sm theme-text transition-all outline-none focus:ring-1"
                  style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1)">
              </div>
              <div>
                <label class="block text-xs font-bold uppercase tracking-wider theme-muted mb-2">Pays</label>
                <input formControlName="pays" type="text" placeholder="Côte d'Ivoire"
                  class="w-full px-4 py-3 rounded-xl text-sm theme-text transition-all outline-none focus:ring-1"
                  style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1)">
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold uppercase tracking-wider theme-muted mb-2">Complément <span class="text-white/20 normal-case font-normal">(optionnel)</span></label>
              <input formControlName="complement" type="text" placeholder="Bâtiment A, Appartement 3..."
                class="w-full px-4 py-3 rounded-xl text-sm theme-text transition-all outline-none focus:ring-1"
                style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1)">
            </div>

            <label class="flex items-center gap-3 cursor-pointer group">
              <input formControlName="isDefault" type="checkbox" class="sr-only peer">
              <div class="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 transition-all peer-checked:bg-gold peer-checked:border-gold"
                   style="border: 2px solid rgba(255,255,255,0.2); background: rgba(255,255,255,0.04)">
                @if (addressForm.get('isDefault')?.value) {
                  <svg class="w-3 h-3 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/>
                  </svg>
                }
              </div>
              <span class="text-sm font-semibold theme-muted group-hover:text-white/60 transition-colors">Définir comme adresse par défaut</span>
            </label>

            <div class="flex items-center justify-end gap-3 pt-2">
              <button type="button" (click)="closeForm()" class="px-5 py-2.5 rounded-xl text-sm font-bold theme-muted hover:text-white transition-colors">Annuler</button>
              <button type="submit" [disabled]="addressForm.invalid || saving"
                class="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed hover:-translate-y-0.5"
                style="background: linear-gradient(135deg, #f5d442, #b8941e); color: black">
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
        <div class="absolute inset-0 bg-black/70 backdrop-blur-sm" (click)="deleteId = null"></div>
        <div class="relative w-full max-w-sm theme-surface border theme-border rounded-3xl shadow-2xl p-6">
          <div class="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/25 flex items-center justify-center mx-auto mb-4">
            <svg class="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <h3 class="text-base font-black theme-text text-center mb-1">Supprimer cette adresse ?</h3>
          <p class="text-sm theme-muted text-center mb-4">Cette action est irréversible.</p>
          <div class="flex gap-3">
            <button (click)="deleteId = null" class="flex-1 py-2.5 border theme-border theme-muted rounded-xl text-sm font-semibold hover:theme-text transition-colors">Annuler</button>
            <button (click)="confirmDelete()" class="flex-1 py-2.5 bg-red-500/15 border border-red-500/30 text-red-400 rounded-xl text-sm font-black hover:bg-red-500/25 transition-colors">Supprimer</button>
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

  // alias for template
  edit(addr: Address): void { this.openForm(addr); }
}
