import { Routes } from '@angular/router';
import { AdminLayoutComponent } from './layout/admin-layout.component';

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    component: AdminLayoutComponent,
    children: [
      { path: '', redirectTo: 'overview', pathMatch: 'full' },
      {
        path: 'overview',
        loadComponent: () => import('./sections/overview/admin-overview.component').then(m => m.AdminOverviewComponent),
      },
      {
        path: 'orders',
        loadComponent: () => import('./sections/orders/admin-orders.component').then(m => m.AdminOrdersComponent),
      },
      {
        path: 'products',
        loadComponent: () => import('./sections/products/admin-products.component').then(m => m.AdminProductsComponent),
      },
      {
        path: 'delivery',
        loadComponent: () => import('./sections/delivery/admin-delivery.component').then(m => m.AdminDeliveryComponent),
      },
      {
        path: 'returns',
        loadComponent: () => import('./sections/returns/admin-returns.component').then(m => m.AdminReturnsComponent),
      },
      {
        path: 'reviews',
        loadComponent: () => import('./sections/reviews/admin-reviews.component').then(m => m.AdminReviewsComponent),
      },
      {
        path: 'promos',
        loadComponent: () => import('./sections/promos/admin-promos.component').then(m => m.AdminPromosComponent),
      },
      {
        path: 'users',
        loadComponent: () => import('./sections/users/admin-users.component').then(m => m.AdminUsersComponent),
      },
      {
        path: 'categories',
        loadComponent: () => import('./sections/categories/admin-categories.component').then(m => m.AdminCategoriesComponent),
      },
    ],
  },
];
