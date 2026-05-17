import { Routes } from '@angular/router';
import { ManagerLayoutComponent } from './layout/manager-layout.component';

export const MANAGER_ROUTES: Routes = [
  {
    path: '',
    component: ManagerLayoutComponent,
    children: [
      { path: '', redirectTo: 'products', pathMatch: 'full' },
      {
        path: 'products',
        loadComponent: () => import('./sections/products/manager-products.component').then(m => m.ManagerProductsComponent),
      },
      {
        path: 'orders',
        loadComponent: () => import('./sections/orders/manager-orders.component').then(m => m.ManagerOrdersComponent),
      },
      {
        path: 'delivery',
        loadComponent: () => import('./sections/delivery/manager-delivery.component').then(m => m.ManagerDeliveryComponent),
      },
      {
        path: 'dashboard',
        loadComponent: () => import('./sections/dashboard/manager-dashboard.component').then(m => m.ManagerDashboardComponent),
      },
    ],
  },
];
