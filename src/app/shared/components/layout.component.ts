import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { NavbarComponent } from './navbar.component';
import { SupportWidgetComponent } from './support-widget.component';
import { ToastComponent } from './toast.component';
import { AuthService } from '../../core/services/auth.service';
import { LogoComponent } from './logo.component';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterModule, NavbarComponent, SupportWidgetComponent, ToastComponent, LogoComponent],
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.css'],
})
export class LayoutComponent {
  constructor(private authService: AuthService) {}

  get isManager(): boolean {
    const role = this.authService.getCurrentUser()?.role;
    return role === 'MANAGER' || role === 'ADMIN';
  }
}
