export type UserRole = 'franchisor_admin' | 'franchisee_owner' | 'location_manager' | 'patron' | 'manager' | 'employe' | 'livreur' | 'client';

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  phone: string;
  role: UserRole;
  active: boolean;
  driverId?: string;
  createdAt: string;
}

export interface AuthToken {
  userId: string;
  role: UserRole;
  exp: number;
}
