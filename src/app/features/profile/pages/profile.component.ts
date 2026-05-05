import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { UserService } from '../../../core/services/user.service';
import { AuthService } from '../../../core/services/auth.service';
import { UserResponse } from '../../../core/models/user.models';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css'],
})
export class ProfileComponent implements OnInit {
  profileForm!: FormGroup;
  passwordForm!: FormGroup;
  user: UserResponse | null = null;
  loading = false;
  saving = false;
  changingPassword = false;
  successMessage = '';
  errorMessage = '';

  activeTab: 'profile' | 'security' = 'profile';
  showOldPwd     = false;
  showNewPwd     = false;
  showConfirmPwd = false;

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

  loadUserProfile(): void {
    this.loading = true;
    this.userService.getProfile().subscribe({
      next: (r) => {
        if (r.success && r.data) {
          this.user = r.data;
          this.profileForm.patchValue({ nom: r.data.nom, prenom: r.data.prenom, phone: r.data.phone });
        }
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => { this.loading = false; this.cdr.detectChanges(); },
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
