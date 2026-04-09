import { PayPeriod, Payslip, TimesheetLine } from '@/types/payroll';
import { staffStore } from './staffStore';
import { store as orderStore } from './store';

let counter = 400;
function genId(prefix: string) { return `${prefix}-${++counter}`; }

const ONSS_RATE = 0.1307; // Belgian social security employee contribution
const OVERTIME_MULTIPLIER = 1.5;
const DAILY_OVERTIME_THRESHOLD = 8;

// ─── Demo periods ───
const DEMO_PERIODS: PayPeriod[] = [
  { id: 'pp-1', label: 'Semaine 15 — Avril 2026', startDate: '2026-04-07', endDate: '2026-04-13', status: 'draft' },
  { id: 'pp-2', label: 'Semaine 14 — Avril 2026', startDate: '2026-03-31', endDate: '2026-04-06', status: 'validated' },
];

let periods: PayPeriod[] = [...DEMO_PERIODS];
let payslips: Payslip[] = [];
let listeners: (() => void)[] = [];
function notify() { listeners.forEach((l) => l()); }

export const payrollStore = {
  subscribe(listener: () => void) {
    listeners.push(listener);
    return () => { listeners = listeners.filter((l) => l !== listener); };
  },

  // ─── Periods ───
  getPeriods: () => periods,
  getPeriod: (id: string) => periods.find((p) => p.id === id),

  addPeriod(data: Omit<PayPeriod, 'id' | 'status'>): PayPeriod {
    const period: PayPeriod = { ...data, id: genId('pp'), status: 'draft' };
    periods = [period, ...periods];
    notify();
    return period;
  },

  updatePeriodStatus(id: string, status: PayPeriod['status']) {
    periods = periods.map((p) => (p.id === id ? { ...p, status } : p));
    notify();
  },

  // ─── Timesheets (computed from staffStore time entries) ───
  getTimesheets(startDate: string, endDate: string): TimesheetLine[] {
    const employees = staffStore.getEmployees();
    const lines: TimesheetLine[] = [];

    for (const emp of employees) {
      if (!emp.active) continue;
      const start = new Date(startDate);
      const end = new Date(endDate);

      let totalRegular = 0;
      let totalOvertime = 0;

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().slice(0, 10);
        const entries = staffStore.getTimeEntries(emp.id, dateStr);
        const dayHours = entries.reduce((sum, e) => sum + (e.hoursWorked || 0), 0);

        if (dayHours > DAILY_OVERTIME_THRESHOLD) {
          totalRegular += DAILY_OVERTIME_THRESHOLD;
          totalOvertime += dayHours - DAILY_OVERTIME_THRESHOLD;
        } else {
          totalRegular += dayHours;
        }
      }

      if (totalRegular > 0 || totalOvertime > 0) {
        lines.push({
          employeeId: emp.id,
          date: startDate,
          regularHours: Math.round(totalRegular * 100) / 100,
          overtimeHours: Math.round(totalOvertime * 100) / 100,
          totalHours: Math.round((totalRegular + totalOvertime) * 100) / 100,
        });
      }
    }

    return lines;
  },

  // ─── Payslips ───
  getPayslips: (periodId?: string) => periodId ? payslips.filter((p) => p.periodId === periodId) : payslips,
  getPayslipsByEmployee: (employeeId: string) => payslips.filter((p) => p.employeeId === employeeId),

  generatePayslips(periodId: string): Payslip[] {
    const period = periods.find((p) => p.id === periodId);
    if (!period) return [];

    // Remove existing drafts for this period
    payslips = payslips.filter((p) => !(p.periodId === periodId && p.status === 'draft'));

    const timesheets = payrollStore.getTimesheets(period.startDate, period.endDate);
    const employees = staffStore.getEmployees();
    const orders = orderStore.getOrders();
    const newSlips: Payslip[] = [];

    for (const ts of timesheets) {
      const emp = employees.find((e) => e.id === ts.employeeId);
      if (!emp) continue;

      const overtimeRate = emp.hourlyRate * OVERTIME_MULTIPLIER;
      const grossRegular = ts.regularHours * emp.hourlyRate;
      const grossOvertime = ts.overtimeHours * overtimeRate;

      // Driver delivery bonus
      let deliveryCount = 0;
      let deliveryEarnings = 0;
      if (emp.position === 'livreur') {
        const driverOrders = orders.filter(
          (o) => o.driverId === emp.id.replace('emp-', 'drv-') &&
                 ['delivered', 'picked_up'].includes(o.status)
        );
        deliveryCount = driverOrders.length;
        deliveryEarnings = deliveryCount * 3.50; // fixed rate for simplicity
      }

      const grossTotal = grossRegular + grossOvertime + deliveryEarnings;
      const deductions = Math.round(grossTotal * ONSS_RATE * 100) / 100;
      const netTotal = Math.round((grossTotal - deductions) * 100) / 100;

      const slip: Payslip = {
        id: genId('ps'),
        periodId,
        employeeId: emp.id,
        employeeName: emp.name,
        regularHours: ts.regularHours,
        overtimeHours: ts.overtimeHours,
        hourlyRate: emp.hourlyRate,
        overtimeRate,
        grossRegular: Math.round(grossRegular * 100) / 100,
        grossOvertime: Math.round(grossOvertime * 100) / 100,
        grossTotal: Math.round(grossTotal * 100) / 100,
        deductions,
        netTotal,
        bonus: 0,
        deliveryCount: deliveryCount > 0 ? deliveryCount : undefined,
        deliveryEarnings: deliveryEarnings > 0 ? deliveryEarnings : undefined,
        status: 'draft',
        createdAt: new Date().toISOString(),
      };

      newSlips.push(slip);
    }

    payslips = [...payslips, ...newSlips];
    notify();
    return newSlips;
  },

  validatePayslip(id: string) {
    payslips = payslips.map((p) => (p.id === id ? { ...p, status: 'validated' as const } : p));
    notify();
  },

  markPayslipPaid(id: string) {
    payslips = payslips.map((p) => (p.id === id ? { ...p, status: 'paid' as const } : p));
    notify();
  },
};
