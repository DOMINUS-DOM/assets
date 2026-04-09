export type UserRole = 'patron' | 'manager' | 'employe' | 'livreur' | 'client';

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
