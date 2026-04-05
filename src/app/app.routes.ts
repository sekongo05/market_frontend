import { Routes } from '@angular/router';
import { LayoutComponent } from './shared/components/layout.component';
import { HomeComponent } from './home.component';
import { LoginComponent, RegisterComponent } from './features/auth/pages';
import { ProductsComponent, ProductDetailComponent } from './features/products/pages';
import { OrdersComponent } from './features/orders/pages';
import { ProfileComponent } from './features/profile/pages';
import { AdminDashboardComponent } from './features/admin/pages';
import { ManagerComponent } from './features/manager/pages';
import { PaymentPageComponent } from './features/payment/payment-page.component';
import { HelpComponent } from './features/help/help.component';
import { PrivacyComponent } from './features/privacy/privacy.component';
import { AuthenticityComponent } from './features/authenticity/authenticity.component';
import { ReturnsComponent } from './features/returns/returns.component';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { UserRole } from './core/models/common.models';

export const APP_ROUTES: Routes = [
  {
    path: '',
    component: LayoutComponent,
    children: [
      { path: '', component: HomeComponent },
      { path: 'products', component: ProductsComponent },
      { path: 'products/:id', component: ProductDetailComponent },
      {
        path: 'orders',
        component: OrdersComponent,
        canActivate: [authGuard],
      },
      {
        path: 'profile',
        component: ProfileComponent,
        canActivate: [authGuard],
      },
      {
        path: 'admin',
        component: AdminDashboardComponent,
        canActivate: [authGuard, roleGuard],
        data: { roles: [UserRole.ADMIN] },
      },
      {
        path: 'manager',
        component: ManagerComponent,
        canActivate: [authGuard, roleGuard],
        data: { roles: [UserRole.MANAGER, UserRole.ADMIN] },
      },
      {
        path: 'payment/:orderId',
        component: PaymentPageComponent,
        canActivate: [authGuard],
      },
      { path: 'help', component: HelpComponent },
      { path: 'privacy', component: PrivacyComponent },
      { path: 'authenticity', component: AuthenticityComponent },
      { path: 'returns', component: ReturnsComponent },
    ],
  },
  {
    path: 'auth',
    children: [
      { path: 'login', component: LoginComponent },
      { path: 'register', component: RegisterComponent },
    ],
  },
];
