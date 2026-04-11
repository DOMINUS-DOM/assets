// ─── Employee ───
export type ContractType = 'cdi' | 'cdd' | 'etudiant' | 'freelance';
export type Position = 'cuisine' | 'comptoir' | 'livreur' | 'manager' | 'polyvalent';

export interface Employee {
  id: string;
  userId: string; // linked auth user
  name: string;
  phone: string;
  email: string;
  position: Position;
  contractType: ContractType;
  hourlyRate: number;
  hireDate: string;
  active: boolean;
  notes: string;
}

// ─── Shifts / Planning ───
export interface Shift {
  id: string;
  employeeId: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  position: Position;
  notes: string;
}

// ─── Clock In/Out ───
export interface TimeEntry {
  id: string;
  employeeId: string;
  date: string;
  clockIn: string; // ISO timestamp
  clockOut?: string;
  hoursWorked?: number;
}

// ─── Leave Requests ───
export type LeaveStatus = 'pending' | 'approved' | 'rejected';
export type LeaveType = 'vacation' | 'sick' | 'personal' | 'other';

export interface LeaveRequest {
  id: string;
  employeeId: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  reason: string;
  status: LeaveStatus;
  createdAt: string;
}

// ─── Daily Tasks ───
export type TaskCategory = 'prep' | 'cleaning' | 'restock' | 'other';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Task {
  id: string;
  employeeId?: string | null;
  locationId?: string | null;
  title: string;
  description: string;
  date: string;
  dueTime?: string | null;
  completed: boolean;
  completedAt?: string | null;
  category: TaskCategory;
  priority: TaskPriority;
  photoUrl?: string | null;
  completionPhotoUrl?: string | null;
  requiresPhoto: boolean;
  createdAt: string;
}
