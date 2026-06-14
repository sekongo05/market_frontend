import { Routes } from '@angular/router';
import { LayoutComponent } from './shared/components/layout.component';
import { HomeComponent } from './home.component';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { UserRole } from './core/models/common.models';
export const APP_ROUTES: Routes = [
  {
    path: '',
    component: LayoutComponent,
    children: [
      { path: '', component: HomeComponent },
      {
        path: 'products',
        loadComponent: () => import('./features/products/pages/products.component').then(m => m.ProductsComponent),
      },
      {
        path: 'products/:id',
        loadComponent: () => import('./features/products/pages/product-detail.component').then(m => m.ProductDetailComponent),
      },
      {
        path: 'orders',
        loadComponent: () => import('./features/orders/pages/orders.component').then(m => m.OrdersComponent),
        canActivate: [authGuard],
      },
      {
        path: 'checkout',
        loadComponent: () => import('./features/orders/pages/checkout.component').then(m => m.CheckoutComponent),
        canActivate: [authGuard],
      },
      {
        path: 'profile',
        loadComponent: () => import('./features/profile/pages/profile.component').then(m => m.ProfileComponent),
        canActivate: [authGuard],
      },
      {
        path: 'admin',
        canActivate: [authGuard, roleGuard],
        data: { roles: [UserRole.ADMIN] },
        loadChildren: () => import('./features/admin/admin.routes').then(m => m.ADMIN_ROUTES),
      },
      {
        path: 'manager',
        canActivate: [authGuard, roleGuard],
        data: { roles: [UserRole.MANAGER, UserRole.ADMIN] },
        loadChildren: () => import('./features/manager/manager.routes').then(m => m.MANAGER_ROUTES),
      },
      {
        path: 'help',
        loadComponent: () => import('./features/help/help.component').then(m => m.HelpComponent),
      },
      {
        path: 'privacy',
        loadComponent: () => import('./features/privacy/privacy.component').then(m => m.PrivacyComponent),
      },
      {
        path: 'qualite',
        loadComponent: () => import('./features/authenticity/authenticity.component').then(m => m.AuthenticityComponent),
      },
      {
        path: 'returns',
        loadComponent: () => import('./features/returns/returns.component').then(m => m.ReturnsComponent),
      },
    ],
  },
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/pages').then(m => [
      { path: 'login', component: m.LoginComponent },
      { path: 'register', component: m.RegisterComponent },
      { path: 'forgot-password', component: m.ForgotPasswordComponent },
      { path: 'reset-password', component: m.ResetPasswordComponent },
    ]),
  },
  { path: '**', redirectTo: '' },
];
