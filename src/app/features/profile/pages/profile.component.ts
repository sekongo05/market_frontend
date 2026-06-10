import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { UserService } from '../../../core/services/user.service';
import { AuthService } from '../../../core/services/auth.service';
import { UserResponse, UserFullProfileResponse, Address, AddressRequest } from '../../../core/models/user.models';
import { orderStatusLabel, orderStatusClass } from '../../admin/shared/admin-status.helpers';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css'],
})
export class ProfileComponent implements OnInit {
  readonly orderStatusLabel = orderStatusLabel;
  readonly orderStatusClass = orderStatusClass;
  profileForm!: FormGroup;
  passwordForm!: FormGroup;
  user: UserResponse | null = null;
  fullProfile: UserFullProfileResponse | null = null;
  loading = false;
  saving = false;
  changingPassword = false;
  successMessage = '';
  errorMessage = '';

  activeTab: 'profile' | 'security' | 'addresses' = 'profile';
  showOldPwd     = false;
  showNewPwd     = false;
  showConfirmPwd = false;

  addresses: Address[] = [];
  loadingAddresses = false;
  savingAddress = false;
  showAddressForm = false;
  editingAddress: Address | null = null;
  confirmDeleteAddressId: number | null = null;
  addressForm!: FormGroup;
  readonly ADDRESS_LABELS = ['Domicile', 'Bureau', 'Autre'];
  readonly MAX_ADDRESSES = 5;

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.profileForm = this.fb.group({
      nom:    ['', Validators.required],
      prenom: ['', Validators.required],
      phone:  ['+225', Validators.required],
    });
    this.passwordForm = this.fb.group({
      oldPassword:     ['', [Validators.required, Validators.minLength(6)]],
      newPassword:     ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required],
    });
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
    this.loadUserProfile();
  }

  get isManager(): boolean {
    const role = this.authService.getCurrentUser()?.role;
    return role === 'MANAGER' || role === 'ADMIN';
  }

  get initials(): string {
    if (!this.user) return '?';
    return `${this.user.prenom[0]}${this.user.nom[0]}`.toUpperCase();
  }

  get memberSince(): string {
    if (!this.user?.createdAt) return '';
    return new Date(this.user.createdAt).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  }

  get roleLabel(): string {
    const map: Record<string, string> = { CUSTOMER: 'Client', MANAGER: 'Manager', ADMIN: 'Administrateur' };
    return map[this.user?.role ?? ''] ?? this.user?.role ?? '';
  }

  get roleColor(): string {
    switch (this.user?.role) {
      case 'ADMIN':    return 'bg-red-500/15 text-red-400 border-red-500/25';
      case 'MANAGER':  return 'bg-gold/15 text-gold border-gold/25';
      default:         return 'bg-blue-500/15 text-blue-400 border-blue-500/25';
    }
  }

  get hasPhone(): boolean {
    const p = this.user?.phone?.trim();
    return !!p && p !== '+225' && p.length > 6;
  }

  get passwordStrength(): { score: number; label: string; color: string } {
    const pwd: string = this.passwordForm.get('newPassword')?.value ?? '';
    if (!pwd) return { score: 0, label: '', color: '' };
    let score = 0;
    if (pwd.length >= 8)          score++;
    if (/[A-Z]/.test(pwd))        score++;
    if (/[0-9]/.test(pwd))        score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    const map = [
      { label: '',                    color: '' },
      { label: 'Trop faible',         color: 'text-red-400' },
      { label: 'Faible',              color: 'text-orange-400' },
      { label: 'Correct',             color: 'text-yellow-400' },
      { label: 'Fort',                color: 'text-green-400' },
    ];
    return { score, ...map[score] };
  }

  loadUserProfile(): void {
    this.loading = true;
    this.userService.getProfile().subscribe({
      next: (r) => {
        if (r.success && r.data) {
          this.user = r.data;
          this.profileForm.patchValue({ nom: r.data.nom, prenom: r.data.prenom, phone: r.data.phone });
          this.profileForm.markAsPristine();
          this.loadFullProfile(r.data.id);
        }
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => { this.loading = false; this.cdr.detectChanges(); },
    });
  }

  private loadFullProfile(id: number): void {
    this.userService.getFullProfile(id).subscribe({
      next: (r) => {
        if (r.success && r.data) {
          this.fullProfile = r.data;
          this.cdr.detectChanges();
        }
      },
      error: () => {},
    });
  }

  updateProfile(): void {
    if (this.profileForm.invalid) return;
    this.saving = true;
    this.clearMessages();
    this.userService.updateProfile(this.profileForm.value).subscribe({
      next: (r) => {
        if (r.success) {
          this.user = r.data;
          this.profileForm.markAsPristine();
          this._showSuccess('Profil mis à jour avec succès');
        } else {
          this._showError('Une erreur est survenue');
        }
        this.saving = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => { this._showError(err?.error?.message || 'Erreur lors de la mise à jour'); this.saving = false; this.cdr.detectChanges(); },
    });
  }

  changePassword(): void {
    if (this.passwordForm.invalid) return;
    const { newPassword, confirmPassword, oldPassword } = this.passwordForm.value;
    if (newPassword !== confirmPassword) { this._showError('Les mots de passe ne correspondent pas'); return; }
    this.changingPassword = true;
    this.clearMessages();
    this.userService.changePassword({ oldPassword, newPassword }).subscribe({
      next: (r) => {
        if (r.success) { this._showSuccess('Mot de passe modifié avec succès'); this.passwordForm.reset(); }
        else { this._showError(r.message || 'Ancien mot de passe incorrect'); }
        this.changingPassword = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => { this._showError(err?.error?.message || 'Erreur lors du changement de mot de passe'); this.changingPassword = false; this.cdr.detectChanges(); },
    });
  }

  loadAddresses(): void {
    this.loadingAddresses = true;
    this.userService.getAddresses().subscribe({
      next: (r) => { if (r.success) this.addresses = r.data; this.loadingAddresses = false; this.cdr.detectChanges(); },
      error: () => { this.loadingAddresses = false; this.cdr.detectChanges(); },
    });
  }

  openAddressForm(address?: Address): void {
    this.editingAddress = address ?? null;
    this.showAddressForm = true;
    this.clearMessages();
    if (address) {
      this.addressForm.patchValue(address);
    } else {
      this.addressForm.reset({ label: 'Domicile', pays: 'Côte d\'Ivoire', phone: '+225', isDefault: false });
    }
  }

  closeAddressForm(): void {
    this.showAddressForm = false;
    this.editingAddress = null;
  }

  saveAddress(): void {
    if (this.addressForm.invalid) return;
    this.savingAddress = true;
    this.clearMessages();
    const payload: AddressRequest = this.addressForm.value;
    const obs = this.editingAddress
      ? this.userService.updateAddress(this.editingAddress.id, payload)
      : this.userService.createAddress(payload);
    obs.subscribe({
      next: (r) => {
        if (r.success) {
          this.loadAddresses();
          this.closeAddressForm();
          this._showSuccess(this.editingAddress ? 'Adresse mise à jour' : 'Adresse ajoutée');
        }
        this.savingAddress = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this._showError(err?.error?.message || 'Erreur lors de la sauvegarde');
        this.savingAddress = false;
        this.cdr.detectChanges();
      },
    });
  }

  startDeleteAddress(id: number): void {
    this.confirmDeleteAddressId = id;
  }

  confirmDeleteAddress(): void {
    if (!this.confirmDeleteAddressId) return;
    const id = this.confirmDeleteAddressId;
    this.confirmDeleteAddressId = null;
    this.userService.deleteAddress(id).subscribe({
      next: () => { this.loadAddresses(); this._showSuccess('Adresse supprimée'); this.cdr.detectChanges(); },
      error: () => { this._showError('Erreur lors de la suppression'); this.cdr.detectChanges(); },
    });
  }

  cancelDeleteAddress(): void {
    this.confirmDeleteAddressId = null;
  }

  setDefaultAddress(id: number): void {
    this.userService.setDefaultAddress(id).subscribe({
      next: (r) => {
        if (r.success) { this.loadAddresses(); this._showSuccess('Adresse par défaut mise à jour'); }
        this.cdr.detectChanges();
      },
      error: () => { this._showError('Erreur'); this.cdr.detectChanges(); },
    });
  }

  clearMessages(): void { this.successMessage = ''; this.errorMessage = ''; }

  private _showSuccess(msg: string): void {
    this.successMessage = msg;
    this.errorMessage = '';
    setTimeout(() => { this.successMessage = ''; this.cdr.detectChanges(); }, 4000);
  }

  private _showError(msg: string): void {
    this.errorMessage = msg;
    this.successMessage = '';
  }
}
