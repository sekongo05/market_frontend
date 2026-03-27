import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { UserService } from '../../../core/services/user.service';
import { UserResponse } from '../../../core/models/user.models';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css'],
})
export class ProfileComponent implements OnInit {
  profileForm!: FormGroup;
  passwordForm!: FormGroup;
  user: UserResponse | null = null;
  loading = false;
  successMessage = '';
  errorMessage = '';

  constructor(
    private formBuilder: FormBuilder,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    this.loadUserProfile();
    this.initializeForms();
  }

  initializeForms(): void {
    this.profileForm = this.formBuilder.group({
      nom: ['', Validators.required],
      prenom: ['', Validators.required],
      phone: ['', Validators.required],
    });

    this.passwordForm = this.formBuilder.group({
      oldPassword: ['', [Validators.required, Validators.minLength(6)]],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required],
    });
  }

  loadUserProfile(): void {
    this.loading = true;
    this.userService.getProfile().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.user = response.data;
          this.profileForm.patchValue({
            nom: this.user.nom,
            prenom: this.user.prenom,
            phone: this.user.phone,
          });
        }
        this.loading = false;
      },
      error: (error) => {
        this.errorMessage = 'Erreur lors du chargement du profil';
        this.loading = false;
      },
    });
  }

  updateProfile(): void {
    if (this.profileForm.invalid) {
      return;
    }

    this.loading = true;
    this.userService.updateProfile(this.profileForm.value).subscribe({
      next: (response) => {
        if (response.success) {
          this.successMessage = 'Profil mis à jour avec succès';
          this.user = response.data;
        }
        this.loading = false;
      },
      error: (error) => {
        this.errorMessage = 'Erreur lors de la mise à jour';
        this.loading = false;
      },
    });
  }

  changePassword(): void {
    if (this.passwordForm.invalid) {
      return;
    }

    if (
      this.passwordForm.value.newPassword !==
      this.passwordForm.value.confirmPassword
    ) {
      this.errorMessage = 'Les nouveaux mots de passe ne correspondent pas';
      return;
    }

    this.loading = true;
    const { confirmPassword, ...data } = this.passwordForm.value;

    this.userService.changePassword(data).subscribe({
      next: (response) => {
        if (response.success) {
          this.successMessage = 'Mot de passe changé avec succès';
          this.passwordForm.reset();
        }
        this.loading = false;
      },
      error: (error) => {
        this.errorMessage = 'Erreur lors du changement de mot de passe';
        this.loading = false;
      },
    });
  }
}
