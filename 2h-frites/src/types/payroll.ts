// ─── Pay Period ───
export interface PayPeriod {
  id: string;
  label: string; // "Semaine 15 — Avril 2026"
  startDate: string;
  endDate: string;
  status: 'draft' | 'validated' | 'paid';
}

// ─── Timesheet (auto-computed from TimeEntries) ───
export interface TimesheetLine {
  employeeId: string;
  date: string;
  regularHours: number;
  overtimeHours: number; // > 38h/week or > 8h/day
  totalHours: number;
}

// ─── Payslip ───
export interface Payslip {
  id: string;
  periodId: string;
  employeeId: string;
  employeeName: string;
  regularHours: number;
  overtimeHours: number;
  hourlyRate: number;
  overtimeRate: number; // 1.5x
  grossRegular: number;
  grossOvertime: number;
  grossTotal: number;
  deductions: number; // ONSS ~13.07%
  netTotal: number;
  bonus: number;
  deliveryCount?: number; // for drivers
  deliveryEarnings?: number;
  status: 'draft' | 'validated' | 'paid';
  createdAt: string;
}
