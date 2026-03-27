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
