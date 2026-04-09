'use client';

import { useState, useEffect } from 'react';
import { staffStore } from '@/stores/staffStore';
import { payrollStore } from '@/stores/payrollStore';
import { Employee, TimeEntry, Shift, Task, LeaveRequest } from '@/types/staff';
import { Payslip } from '@/types/payroll';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n/LanguageContext';
import { formatPrice } from '@/utils/format';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import Link from 'next/link';

const CAT_EMOJI: Record<string, string> = { prep: '🔪', cleaning: '🧹', restock: '📦', other: '📌' };

function StaffContent() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [activeEntry, setActiveEntry] = useState<TimeEntry | null>(null);
  const [todayShifts, setTodayShifts] = useState<Shift[]>([]);
  const [myTasks, setMyTasks] = useState<Task[]>([]);
  const [myLeaves, setMyLeaves] = useState<LeaveRequest[]>([]);
  const [myPayslips, setMyPayslips] = useState<Payslip[]>([]);
  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [leaveForm, setLeaveForm] = useState({ type: 'vacation' as const, startDate: '', endDate: '', reason: '' });
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    const refresh = () => {
      if (!user) return;
      const emp = staffStore.getEmployeeByUserId(user.id);
      setEmployee(emp || null);
      if (emp) {
        setActiveEntry(staffStore.getActiveEntry(emp.id) || null);
        setTodayShifts(staffStore.getShifts(today).filter((s) => s.employeeId === emp.id));
        setMyTasks(staffStore.getTasks(today, emp.id));
        setMyLeaves(staffStore.getLeaveRequests(emp.id));
        setMyPayslips(payrollStore.getPayslipsByEmployee(emp.id));
      }
    };
    refresh();
    return staffStore.subscribe(refresh);
  }, [user, today]);

  if (!employee) {
    return (
      <div className="text-center py-20">
        <span className="text-5xl block mb-4">🔍</span>
        <p className="text-zinc-400 text-sm">{t.ui.staff_noProfile}</p>
      </div>
    );
  }

  const handleClock = () => {
    if (activeEntry) {
      staffStore.clockOut(activeEntry.id);
    } else {
      staffStore.clockIn(employee.id);
    }
  };

  const handleLeaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveForm.startDate || !leaveForm.endDate) return;
    staffStore.addLeaveRequest({ employeeId: employee.id, ...leaveForm });
    setLeaveForm({ type: 'vacation', startDate: '', endDate: '', reason: '' });
    setShowLeaveForm(false);
  };

  const ic = 'w-full px-3 py-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm focus:outline-none focus:border-amber-500/50';

  return (
    <div className="space-y-6">
      {/* Clock In/Out — big button */}
      <div className="text-center">
        <button onClick={handleClock}
          className={`w-32 h-32 rounded-full font-bold text-lg shadow-lg transition-all active:scale-90 mx-auto flex flex-col items-center justify-center gap-1 ${
            activeEntry
              ? 'bg-red-500 text-white shadow-red-500/25'
              : 'bg-emerald-500 text-white shadow-emerald-500/25'
          }`}>
          <span className="text-3xl">{activeEntry ? '⏹' : '▶'}</span>
          <span className="text-xs">{activeEntry ? t.ui.staff_clockOut : t.ui.staff_clockIn}</span>
        </button>
        {activeEntry && (
          <p className="text-xs text-emerald-400 mt-3 animate-pulse">
            🟢 {t.ui.staff_clockedSince} {new Date(activeEntry.clockIn).toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
      </div>

      {/* Today's shifts */}
      {todayShifts.length > 0 && (
        <div>
          <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">{t.ui.staff_myShifts}</h2>
          {todayShifts.map((sh) => (
            <div key={sh.id} className="flex items-center justify-between p-3 rounded-xl bg-zinc-900 border border-zinc-800/50">
              <span className="text-sm text-white">{t.ui[`staff_pos_${sh.position}`]}</span>
              <span className="text-sm font-bold text-amber-400">{sh.startTime} → {sh.endTime}</span>
            </div>
          ))}
        </div>
      )}

      {/* My tasks */}
      <div>
        <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">{t.ui.staff_myTasks}</h2>
        {myTasks.length === 0 && <p className="text-zinc-500 text-sm py-2">{t.ui.staff_noTasks}</p>}
        <div className="space-y-2">
          {myTasks.map((tk) => (
            <div key={tk.id} className="flex items-center gap-3 p-3 rounded-xl bg-zinc-900 border border-zinc-800/50">
              <button onClick={() => staffStore.toggleTask(tk.id)}
                className={`w-6 h-6 rounded-md border-2 flex items-center justify-center text-xs shrink-0 ${tk.completed ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-zinc-600'}`}>
                {tk.completed ? '✓' : ''}
              </button>
              <span className={`text-sm ${tk.completed ? 'text-zinc-500 line-through' : 'text-white'}`}>
                {CAT_EMOJI[tk.category]} {tk.title}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Leave requests */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{t.ui.staff_myLeaves}</h2>
          <button onClick={() => setShowLeaveForm(!showLeaveForm)}
            className="text-xs text-amber-400 font-medium">{showLeaveForm ? t.ui.admin_cancel : t.ui.staff_requestLeave}</button>
        </div>

        {showLeaveForm && (
          <form onSubmit={handleLeaveSubmit} className="p-4 rounded-xl bg-zinc-900 border border-zinc-800/50 space-y-3 mb-3 animate-slide-up">
            <select className={ic} value={leaveForm.type} onChange={(e) => setLeaveForm({ ...leaveForm, type: e.target.value as any })}>
              <option value="vacation">{t.ui.staff_leave_vacation}</option>
              <option value="sick">{t.ui.staff_leave_sick}</option>
              <option value="personal">{t.ui.staff_leave_personal}</option>
              <option value="other">{t.ui.staff_leave_other}</option>
            </select>
            <div className="grid grid-cols-2 gap-2">
              <input className={ic} type="date" value={leaveForm.startDate} onChange={(e) => setLeaveForm({ ...leaveForm, startDate: e.target.value })} required />
              <input className={ic} type="date" value={leaveForm.endDate} onChange={(e) => setLeaveForm({ ...leaveForm, endDate: e.target.value })} required />
            </div>
            <input className={ic} placeholder={t.ui.staff_leaveReason} value={leaveForm.reason} onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })} />
            <button type="submit" className="px-4 py-2 rounded-xl bg-amber-500 text-zinc-950 font-bold text-sm">{t.ui.staff_submitLeave}</button>
          </form>
        )}

        <div className="space-y-2">
          {myLeaves.map((lr) => {
            const colors: Record<string, string> = { pending: 'text-amber-400', approved: 'text-emerald-400', rejected: 'text-red-400' };
            return (
              <div key={lr.id} className="flex items-center justify-between p-3 rounded-xl bg-zinc-900 border border-zinc-800/50 text-sm">
                <div>
                  <p className="text-white font-medium">{t.ui[`staff_leave_${lr.type}`]}</p>
                  <p className="text-xs text-zinc-500">{lr.startDate} → {lr.endDate}</p>
                </div>
                <span className={`text-xs font-medium ${colors[lr.status]}`}>{t.ui[`staff_leaveStatus_${lr.status}`]}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Payslips */}
      {myPayslips.length > 0 && (
        <div>
          <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">{t.ui.pay_myPayslips}</h2>
          <div className="space-y-2">
            {myPayslips.map((slip) => {
              const colors: Record<string, string> = { draft: 'text-zinc-400', validated: 'text-amber-400', paid: 'text-emerald-400' };
              return (
                <div key={slip.id} className="flex items-center justify-between p-3 rounded-xl bg-zinc-900 border border-zinc-800/50">
                  <div>
                    <p className="text-sm text-white font-medium">{slip.regularHours.toFixed(1)}h + {slip.overtimeHours.toFixed(1)}h sup</p>
                    <p className="text-xs text-zinc-500">{t.ui[`pay_status_${slip.status}`]}</p>
                  </div>
                  <span className={`text-lg font-extrabold ${colors[slip.status]}`}>{formatPrice(slip.netTotal)} €</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function StaffPage() {
  const { t } = useLanguage();
  return (
    <ProtectedRoute allowedRoles={['patron', 'manager', 'employe', 'livreur']}>
      <div className="min-h-screen max-w-lg mx-auto pb-20 bg-zinc-950">
        <header className="sticky top-0 z-40 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800/50">
          <div className="flex items-center justify-between h-14 px-4">
            <Link href="/" className="text-amber-400 font-medium text-sm">← Menu</Link>
            <h1 className="text-sm font-bold text-white">{t.ui.staff_portal}</h1>
            <div className="w-12" />
          </div>
        </header>
        <div className="px-4 pt-4"><StaffContent /></div>
      </div>
    </ProtectedRoute>
  );
}
