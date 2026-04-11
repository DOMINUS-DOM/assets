import { Employee, Shift, TimeEntry, LeaveRequest, LeaveStatus, Task } from '@/types/staff';

let counter = 300;
function genId(prefix: string) { return `${prefix}-${++counter}`; }
function today() { return new Date().toISOString().slice(0, 10); }
function now() { return new Date().toISOString(); }

// ─── Demo Data ───
const DEMO_EMPLOYEES: Employee[] = [
  { id: 'emp-1', userId: 'usr-1', name: 'Hassan B.', phone: '+32 470 000 001', email: 'patron@2hfrites.be', position: 'manager', contractType: 'cdi', hourlyRate: 18.00, hireDate: '2020-01-15', active: true, notes: 'Patron fondateur' },
  { id: 'emp-2', userId: 'usr-2', name: 'Fatima L.', phone: '+32 470 000 002', email: 'manager@2hfrites.be', position: 'manager', contractType: 'cdi', hourlyRate: 15.00, hireDate: '2021-06-01', active: true, notes: '' },
  { id: 'emp-3', userId: 'usr-3', name: 'Youssef K.', phone: '+32 470 000 003', email: 'employe@2hfrites.be', position: 'cuisine', contractType: 'cdi', hourlyRate: 13.50, hireDate: '2023-03-10', active: true, notes: 'Spécialiste grillades' },
  { id: 'emp-4', userId: 'usr-4', name: 'Karim B.', phone: '+32 470 123 456', email: 'karim@2hfrites.be', position: 'livreur', contractType: 'freelance', hourlyRate: 12.00, hireDate: '2024-01-20', active: true, notes: '' },
  { id: 'emp-5', userId: 'usr-5', name: 'Sophie M.', phone: '+32 471 234 567', email: 'sophie@2hfrites.be', position: 'livreur', contractType: 'freelance', hourlyRate: 12.00, hireDate: '2024-06-15', active: true, notes: 'Disponible le soir' },
];

const d = today();
const DEMO_SHIFTS: Shift[] = [
  { id: 'sh-1', employeeId: 'emp-2', date: d, startTime: '11:00', endTime: '15:00', position: 'manager', notes: '' },
  { id: 'sh-2', employeeId: 'emp-3', date: d, startTime: '11:00', endTime: '22:00', position: 'cuisine', notes: 'Journée complète' },
  { id: 'sh-3', employeeId: 'emp-4', date: d, startTime: '17:00', endTime: '22:00', position: 'livreur', notes: '' },
  { id: 'sh-4', employeeId: 'emp-5', date: d, startTime: '18:00', endTime: '22:00', position: 'livreur', notes: '' },
  { id: 'sh-5', employeeId: 'emp-2', date: d, startTime: '17:00', endTime: '22:00', position: 'manager', notes: 'Soirée' },
];

const DEMO_TIME_ENTRIES: TimeEntry[] = [
  { id: 'te-1', employeeId: 'emp-3', date: d, clockIn: `${d}T11:02:00Z`, clockOut: `${d}T15:05:00Z`, hoursWorked: 4.05 },
  { id: 'te-2', employeeId: 'emp-3', date: d, clockIn: `${d}T17:00:00Z` }, // still clocked in
  { id: 'te-3', employeeId: 'emp-4', date: d, clockIn: `${d}T17:05:00Z` }, // still clocked in
];

const DEMO_LEAVE_REQUESTS: LeaveRequest[] = [
  { id: 'lr-1', employeeId: 'emp-3', type: 'vacation', startDate: '2026-04-21', endDate: '2026-04-25', reason: 'Vacances familiales', status: 'pending', createdAt: '2026-04-05T10:00:00Z' },
  { id: 'lr-2', employeeId: 'emp-5', type: 'sick', startDate: '2026-04-03', endDate: '2026-04-04', reason: 'Grippe', status: 'approved', createdAt: '2026-04-03T08:00:00Z' },
];

const DEMO_TASKS: Task[] = [
  { id: 'tk-1', employeeId: 'emp-3', title: 'Préparer les sauces du jour', description: '', date: d, completed: true, category: 'prep', priority: 'medium', requiresPhoto: false, createdAt: d },
  { id: 'tk-2', employeeId: 'emp-3', title: 'Découper les oignons', description: '', date: d, completed: false, category: 'prep', priority: 'medium', requiresPhoto: false, createdAt: d },
  { id: 'tk-3', employeeId: undefined, title: 'Nettoyer la friteuse', description: '', date: d, completed: false, category: 'cleaning', priority: 'high', requiresPhoto: false, createdAt: d },
  { id: 'tk-4', employeeId: undefined, title: 'Réapprovisionner les boissons', description: '', date: d, completed: false, category: 'restock', priority: 'medium', requiresPhoto: false, createdAt: d },
  { id: 'tk-5', employeeId: 'emp-2', title: 'Vérifier les stocks viandes', description: '', date: d, completed: false, category: 'restock', priority: 'medium', requiresPhoto: false, createdAt: d },
];

// ─── Store ───
let employees: Employee[] = [...DEMO_EMPLOYEES];
let shifts: Shift[] = [...DEMO_SHIFTS];
let timeEntries: TimeEntry[] = [...DEMO_TIME_ENTRIES];
let leaveRequests: LeaveRequest[] = [...DEMO_LEAVE_REQUESTS];
let tasks: Task[] = [...DEMO_TASKS];
let listeners: (() => void)[] = [];
function notify() { listeners.forEach((l) => l()); }

export const staffStore = {
  subscribe(listener: () => void) {
    listeners.push(listener);
    return () => { listeners = listeners.filter((l) => l !== listener); };
  },

  // ─── Employees ───
  getEmployees: () => employees,
  getEmployee: (id: string) => employees.find((e) => e.id === id),
  getEmployeeByUserId: (userId: string) => employees.find((e) => e.userId === userId),
  addEmployee(data: Omit<Employee, 'id'>): Employee {
    const emp: Employee = { ...data, id: genId('emp') };
    employees = [...employees, emp];
    notify();
    return emp;
  },
  updateEmployee(id: string, data: Partial<Employee>) {
    employees = employees.map((e) => (e.id === id ? { ...e, ...data } : e));
    notify();
  },

  // ─── Shifts ───
  getShifts: (date?: string) => date ? shifts.filter((s) => s.date === date) : shifts,
  addShift(data: Omit<Shift, 'id'>): Shift {
    const shift: Shift = { ...data, id: genId('sh') };
    shifts = [...shifts, shift];
    notify();
    return shift;
  },
  deleteShift(id: string) {
    shifts = shifts.filter((s) => s.id !== id);
    notify();
  },

  // ─── Time Entries (Clock in/out) ───
  getTimeEntries: (employeeId?: string, date?: string) => {
    let result = timeEntries;
    if (employeeId) result = result.filter((t) => t.employeeId === employeeId);
    if (date) result = result.filter((t) => t.date === date);
    return result;
  },
  getActiveEntry: (employeeId: string) => timeEntries.find((t) => t.employeeId === employeeId && !t.clockOut),
  clockIn(employeeId: string): TimeEntry {
    const entry: TimeEntry = { id: genId('te'), employeeId, date: today(), clockIn: now() };
    timeEntries = [...timeEntries, entry];
    notify();
    return entry;
  },
  clockOut(entryId: string) {
    const clockOutTime = now();
    timeEntries = timeEntries.map((t) => {
      if (t.id !== entryId) return t;
      const hours = (new Date(clockOutTime).getTime() - new Date(t.clockIn).getTime()) / 3600000;
      return { ...t, clockOut: clockOutTime, hoursWorked: Math.round(hours * 100) / 100 };
    });
    notify();
  },

  // ─── Leave Requests ───
  getLeaveRequests: (employeeId?: string) => employeeId ? leaveRequests.filter((l) => l.employeeId === employeeId) : leaveRequests,
  addLeaveRequest(data: Omit<LeaveRequest, 'id' | 'status' | 'createdAt'>): LeaveRequest {
    const lr: LeaveRequest = { ...data, id: genId('lr'), status: 'pending', createdAt: now() };
    leaveRequests = [lr, ...leaveRequests];
    notify();
    return lr;
  },
  updateLeaveStatus(id: string, status: LeaveStatus) {
    leaveRequests = leaveRequests.map((l) => (l.id === id ? { ...l, status } : l));
    notify();
  },

  // ─── Tasks ───
  getTasks: (date?: string, employeeId?: string) => {
    let result = tasks;
    if (date) result = result.filter((t) => t.date === date);
    if (employeeId) result = result.filter((t) => t.employeeId === employeeId || !t.employeeId);
    return result;
  },
  addTask(data: Omit<Task, 'id' | 'completed'>): Task {
    const task: Task = { ...data, id: genId('tk'), completed: false };
    tasks = [...tasks, task];
    notify();
    return task;
  },
  toggleTask(id: string) {
    tasks = tasks.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t));
    notify();
  },
  assignTask(id: string, employeeId: string) {
    tasks = tasks.map((t) => (t.id === id ? { ...t, employeeId } : t));
    notify();
  },
};
