import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef, HostListener } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { filter, takeUntil, take } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';
import { WebSocketService } from '../../../core/services/websocket.service';
import { AdminToastService } from '../shared/admin-toast.service';
import { DashboardService } from '../../../core/services/dashboard.service';
import { NotificationBellComponent } from '../../../shared/components/notification-bell.component';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, NotificationBellComponent],
  templateUrl: './admin-layout.component.html',
})
export class AdminLayoutComponent implements OnInit, OnDestroy {
  pendingOrdersCount = 0;
  moreSheetOpen = false;
  currentRouteLabel = 'Administration';
  isDesktop = typeof window !== 'undefined' && window.innerWidth >= 1024;

  @HostListener('window:resize')
  onResize(): void {
    const was = this.isDesktop;
    this.isDesktop = window.innerWidth >= 1024;
    if (was !== this.isDesktop) this.cdr.markForCheck();
  }
  private readonly destroy$ = new Subject<void>();
  private readonly routeLabels: Record<string, string> = {
    overview:   'Tableau de bord',
    orders:     'Commandes',
    products:   'Produits',
    delivery:   'Livraisons',
    returns:    'Retours',
    reviews:    'Avis',
    promos:     'Promotions',
    users:      'Utilisateurs',
    categories: 'Catégories',
    suppliers:       'Fournisseurs',
    'purchase-orders': 'Bons de commande',
    expenses:        'Dépenses',
    finance:         'Finance',
  };

  readonly navItems = [
    { route: 'overview',    label: 'Tableau de bord', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { route: 'orders',      label: 'Commandes',       icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2', badge: true },
    { route: 'products',    label: 'Produits',        icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
    { route: 'delivery',    label: 'Livraisons',      icon: 'M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0' },
    { route: 'returns',     label: 'Retours',         icon: 'M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6' },
    { route: 'reviews',     label: 'Avis',            icon: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z' },
    { route: 'promos',      label: 'Codes promo',     icon: 'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z' },
    { route: 'users',       label: 'Utilisateurs',    icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
    { route: 'categories',  label: 'Catégories',      icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
    { route: 'suppliers',        label: 'Fournisseurs',    icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
    { route: 'purchase-orders',  label: 'Bons de commande', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01' },
    { route: 'expenses',         label: 'Dépenses',         icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z' },
    { route: 'finance',          label: 'Finance',          icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  ];

  constructor(
    private authService: AuthService,
    private wsService: WebSocketService,
    public toastService: AdminToastService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private dashboardService: DashboardService,
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.pipe(
      filter(user => user === null),
      takeUntil(this.destroy$)
    ).subscribe(() => this.router.navigate(['/auth/login']));

    this.wsService.orderEvent$
      .pipe(takeUntil(this.destroy$))
      .subscribe(event => {
        this.pendingOrdersCount = event.pendingCount;
        this.cdr.markForCheck();
      });

    const url = this.router.url;
    if (url.includes('overview') || url === '/admin' || url === '/admin/') {
      this.dashboardService.getStats().pipe(take(1)).subscribe(r => {
        if (r.success && r.data?.pendingOrders > 0) {
          this.router.navigate(['/admin/orders']);
        }
      });
    }

    this.updateRouteLabel(this.router.url);
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      takeUntil(this.destroy$)
    ).subscribe((e: any) => {
      this.updateRouteLabel(e.urlAfterRedirects);
      this.moreSheetOpen = false;
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private updateRouteLabel(url: string): void {
    const segment = url.split('/').pop()?.split('?')[0] ?? '';
    this.currentRouteLabel = this.routeLabels[segment] ?? 'Administration';
  }
}
