import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { LogoComponent } from '../../../shared/components/logo.component';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, LogoComponent],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css'],
})
export class RegisterComponent implements OnInit {
  registerForm!: FormGroup;
  loading = false;
  submitted = false;
  error: string | null = null;
  showPwd = false;
  showConfirmPwd = false;

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private toastService: ToastService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.registerForm = this.formBuilder.group({
      nom: ['', Validators.required],
      prenom: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: ['+225', [Validators.required, Validators.pattern(/^(\+225)?[0-9]{10}$/)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required],
    });
  }

  get f() {
    return this.registerForm.controls;
  }

  onSubmit(): void {
    this.submitted = true;
    this.error = null;

    if (this.registerForm.invalid) {
      return;
    }

    if (
      this.registerForm.value.password !==
      this.registerForm.value.confirmPassword
    ) {
      this.error = 'Les mots de passe ne correspondent pas';
      return;
    }

    this.loading = true;
    const { confirmPassword, ...data } = this.registerForm.value;
    this.authService.register(data).subscribe({
      next: (response) => {
        this.loading = false;
        if (response.success) {
          this.toastService.success('Compte créé avec succès ! Bienvenue 🎉');
          this.router.navigate(['/']);
        } else {
          this.error = response.message || 'Erreur lors de l\'inscription';
        }
      },
      error: (error) => {
        this.error = error?.error?.message || 'Erreur lors de l\'inscription';
        this.loading = false;
      },
    });
  }
}
