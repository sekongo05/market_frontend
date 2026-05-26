import { Routes } from '@angular/router';
import { LayoutComponent } from './shared/components/layout.component';
import { HomeComponent } from './home.component';
import { LoginComponent, RegisterComponent } from './features/auth/pages';
import { ProductsComponent, ProductDetailComponent } from './features/products/pages';
import { OrdersComponent, CheckoutComponent } from './features/orders/pages';
import { ProfileComponent } from './features/profile/pages';
import { ADMIN_ROUTES } from './features/admin/admin.routes';
import { MANAGER_ROUTES } from './features/manager/manager.routes';
import { HelpComponent } from './features/help/help.component';
import { PrivacyComponent } from './features/privacy/privacy.component';
import { AuthenticityComponent } from './features/authenticity/authenticity.component';
import { ReturnsComponent } from './features/returns/returns.component';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { UserRole } from './core/models/common.models';
import { NotFoundComponent } from './features/not-found/not-found.component';

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
        path: 'checkout',
        component: CheckoutComponent,
        canActivate: [authGuard],
      },
      {
        path: 'profile',
        component: ProfileComponent,
        canActivate: [authGuard],
      },
      {
        path: 'admin',
        canActivate: [authGuard, roleGuard],
        data: { roles: [UserRole.ADMIN] },
        children: ADMIN_ROUTES,
      },
      {
        path: 'manager',
        canActivate: [authGuard, roleGuard],
        data: { roles: [UserRole.MANAGER, UserRole.ADMIN] },
        children: MANAGER_ROUTES,
      },
{ path: 'help', component: HelpComponent },
      { path: 'privacy', component: PrivacyComponent },
      { path: 'qualite', component: AuthenticityComponent },
      { path: 'returns', component: ReturnsComponent },
/*       { path: '**', component: NotFoundComponent },
 */    ],
  },
  {
    path: 'auth',
    children: [
      { path: 'login', component: LoginComponent },
      { path: 'register', component: RegisterComponent },
    ],
  },
];
