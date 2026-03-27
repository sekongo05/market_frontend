import { Routes } from '@angular/router';
import { LayoutComponent } from './shared/components/layout.component';
import { HomeComponent } from './home.component';
import { LoginComponent, RegisterComponent } from './features/auth/pages';
import { ProductsComponent, ProductDetailComponent } from './features/products/pages';
import { OrdersComponent } from './features/orders/pages';
import { ProfileComponent } from './features/profile/pages';
import { AdminDashboardComponent } from './features/admin/pages';
import { ManagerComponent } from './features/manager/pages';

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
      },
      {
        path: 'profile',
        component: ProfileComponent,
      },
      {
        path: 'admin',
        component: AdminDashboardComponent,
      },
      {
        path: 'manager',
        component: ManagerComponent,
      },
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
