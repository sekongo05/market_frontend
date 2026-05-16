import { UserRole } from './common.models';

export interface UserResponse {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  phone: string;
  role: UserRole;
  enabled: boolean;
  createdAt: string;
}

export interface UpdateProfileRequest {
  nom: string;
  prenom: string;
  phone: string;
}

export interface ChangePasswordRequest {
  oldPassword: string;
  newPassword: string;
}

export interface UserFullProfileResponse {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  phone: string;
  role: UserRole;
  enabled: boolean;
  memberSince: string;
  totalOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  pendingOrders: number;
  totalSpent: number;
  lastOrderDate: string | null;
  recentOrders: {
    id: number;
    orderNumber: string;
    amount: number;
    orderStatus: string;
    createdAt: string;
  }[];
}

export interface AdminCreateUserRequest {
  nom: string;
  prenom: string;
  email: string;
  password: string;
  phone: string;
  role: UserRole;
}
