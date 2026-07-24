import { Component, ChangeDetectionStrategy, ChangeDetectorRef, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationStart, NavigationEnd, NavigationCancel, NavigationError, RouterModule } from '@angular/router';

import { Subscription } from 'rxjs';
import { NavbarComponent } from './navbar.component';
import { ToastComponent } from './toast.component';
import { AuthService } from '../../core/services/auth.service';
import { CartService } from '../../core/services/cart.service';
import { SdmLogoComponent } from './logo.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterModule, CommonModule, NavbarComponent, ToastComponent, SdmLogoComponent],
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.css']
})
export class LayoutComponent implements OnInit, OnDestroy {
  navigating = false;
  isBackoffice = false;
  readonly currentYear = new Date().getFullYear();
  private routerSub?: Subscription;

  constructor(
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    public cartService: CartService
  ) {}

  ngOnInit(): void {
    const url = this.router.url;
    this.isBackoffice = url.startsWith('/manager') || url.startsWith('/admin');

    this.routerSub = this.router.events.subscribe(event => {
      if (event instanceof NavigationStart) {
        this.navigating = true;
        this.cdr.markForCheck();
      } else if (
        event instanceof NavigationEnd ||
        event instanceof NavigationCancel ||
        event instanceof NavigationError
      ) {
        this.navigating = false;
        if (event instanceof NavigationEnd) {
          const next = event.urlAfterRedirects;
          this.isBackoffice = next.startsWith('/manager') || next.startsWith('/admin');
        }
        this.cdr.markForCheck();
      }
    });
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
  }

  get isManager(): boolean {
    const role = this.authService.getCurrentUser()?.role;
    return role === 'MANAGER' || role === 'ADMIN';
  }

  get isManagerOnly(): boolean {
    return this.authService.getCurrentUser()?.role === 'MANAGER';
  }
}
