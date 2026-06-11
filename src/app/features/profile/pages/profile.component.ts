import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { UserService } from '../../../core/services/user.service';
import { AuthService } from '../../../core/services/auth.service';
import { UserResponse, UserFullProfileResponse, Address, AddressRequest } from '../../../core/models/user.models';
import { orderStatusLabel, orderStatusClass } from '../../admin/shared/admin-status.helpers';
import { ProfileInfoComponent } from './profile-info.component';
import { ProfileSecurityComponent } from './profile-security.component';
import { ProfileAddressesComponent } from './profile-addresses.component';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterLink, ProfileInfoComponent, ProfileSecurityComponent, ProfileAddressesComponent],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css'],
})
export class ProfileComponent implements OnInit {
  readonly orderStatusLabel = orderStatusLabel;
  readonly orderStatusClass = orderStatusClass;

  user: UserResponse | null = null;
  fullProfile: UserFullProfileResponse | null = null;
  loading = false;
  saving = false;
  changingPassword = false;
  savingAddress = false;
  successMessage = '';
  errorMessage = '';

  activeTab: 'profile' | 'security' | 'addresses' = 'profile';
  addresses: Address[] = [];
  loadingAddresses = false;

  constructor(
    private userService: UserService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadUserProfile();
  }

  get recentOrders() { return this.fullProfile?.recentOrders ?? []; }
  get isManager(): boolean { const r = this.authService.getCurrentUser()?.role; return r === 'MANAGER' || r === 'ADMIN'; }
  get initials(): string { if (!this.user) return '?'; return `${this.user.prenom[0]}${this.user.nom[0]}`.toUpperCase(); }
  get memberSince(): string { if (!this.user?.createdAt) return ''; return new Date(this.user.createdAt).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }); }
  get roleLabel(): string { const m: Record<string, string> = { CUSTOMER: 'Client', MANAGER: 'Manager', ADMIN: 'Administrateur' }; return m[this.user?.role ?? ''] ?? this.user?.role ?? ''; }
  get roleColor(): string { switch (this.user?.role) { case 'ADMIN': return 'bg-red-500/15 text-red-400 border-red-500/25'; case 'MANAGER': return 'bg-gold/15 text-gold border-gold/25'; default: return 'bg-blue-500/15 text-blue-400 border-blue-500/25'; } }
  get hasPhone(): boolean { const p = this.user?.phone?.trim(); return !!p && p !== '+225' && p.length > 6; }

  loadUserProfile(): void {
    this.loading = true;
    this.userService.getProfile().subscribe({
      next: (r) => {
        if (r.success && r.data) {
          this.user = r.data;
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
      next: (r) => { if (r.success && r.data) { this.fullProfile = r.data; this.cdr.detectChanges(); } },
      error: (err) => { console.error('Failed to load profile', err); },
    });
  }

  updateProfile(data: { nom: string; prenom: string; phone: string }): void {
    this.saving = true;
    this.clearMessages();
    this.userService.updateProfile(data).subscribe({
      next: (r) => {
        if (r.success) { this.user = r.data; this._showSuccess('Profil mis à jour avec succès'); }
        else { this._showError('Une erreur est survenue'); }
        this.saving = false;
        this.cdr.detectChanges();
      },
      error: (err) => { this._showError(err?.error?.message || 'Erreur lors de la mise à jour'); this.saving = false; this.cdr.detectChanges(); },
    });
  }

  changePassword(data: { oldPassword: string; newPassword: string }): void {
    this.changingPassword = true;
    this.clearMessages();
    this.userService.changePassword(data).subscribe({
      next: (r) => {
        if (r.success) { this._showSuccess('Mot de passe modifié avec succès'); }
        else { this._showError(r.message || 'Ancien mot de passe incorrect'); }
        this.changingPassword = false;
        this.cdr.detectChanges();
      },
      error: (err) => { this._showError(err?.error?.message || 'Erreur lors du changement de mot de passe'); this.changingPassword = false; this.cdr.detectChanges(); },
    });
  }

  loadAddresses(): void {
    this.loadingAddresses = true;
    this.userService.getAddresses().subscribe({
      next: (r) => { if (r.success) this.addresses = r.data; this.loadingAddresses = false; this.cdr.detectChanges(); },
      error: () => { this.loadingAddresses = false; this.cdr.detectChanges(); },
    });
  }

  addAddress(data: AddressRequest): void {
    this.savingAddress = true;
    this.clearMessages();
    this.userService.createAddress(data).subscribe({
      next: (r) => {
        if (r.success) { this.loadAddresses(); this._showSuccess('Adresse ajoutée'); }
        this.savingAddress = false;
        this.cdr.detectChanges();
      },
      error: (err) => { this._showError(err?.error?.message || 'Erreur'); this.savingAddress = false; this.cdr.detectChanges(); },
    });
  }

  updateAddress(ev: { id: number; data: AddressRequest }): void {
    this.savingAddress = true;
    this.clearMessages();
    this.userService.updateAddress(ev.id, ev.data).subscribe({
      next: (r) => {
        if (r.success) { this.loadAddresses(); this._showSuccess('Adresse mise à jour'); }
        this.savingAddress = false;
        this.cdr.detectChanges();
      },
      error: (err) => { this._showError(err?.error?.message || 'Erreur'); this.savingAddress = false; this.cdr.detectChanges(); },
    });
  }

  deleteAddress(id: number): void {
    this.userService.deleteAddress(id).subscribe({
      next: () => { this.loadAddresses(); this._showSuccess('Adresse supprimée'); this.cdr.detectChanges(); },
      error: () => { this._showError('Erreur lors de la suppression'); this.cdr.detectChanges(); },
    });
  }

  setDefaultAddress(id: number): void {
    this.userService.setDefaultAddress(id).subscribe({
      next: (r) => { if (r.success) { this.loadAddresses(); this._showSuccess('Adresse par défaut mise à jour'); } this.cdr.detectChanges(); },
      error: () => { this._showError('Erreur'); this.cdr.detectChanges(); },
    });
  }

  clearMessages(): void { this.successMessage = ''; this.errorMessage = ''; }
  private _showSuccess(msg: string): void { this.successMessage = msg; this.errorMessage = ''; setTimeout(() => { this.successMessage = ''; this.cdr.detectChanges(); }, 4000); }
  private _showError(msg: string): void { this.errorMessage = msg; this.successMessage = ''; }
}
