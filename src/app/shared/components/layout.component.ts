import { Component, ChangeDetectionStrategy, ChangeDetectorRef, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationStart, NavigationEnd, NavigationCancel, NavigationError, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { NavbarComponent } from './navbar.component';
import { SupportWidgetComponent } from './support-widget.component';
import { ToastComponent } from './toast.component';
import { AuthService } from '../../core/services/auth.service';
import { SdmLogoComponent } from './logo.component';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterModule, NavbarComponent, SupportWidgetComponent, ToastComponent, SdmLogoComponent],
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LayoutComponent implements OnInit, OnDestroy {
  navigating = false;
  private routerSub?: Subscription;

  constructor(
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
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
}
