'use client';

import { useState, useEffect } from 'react';
import { staffStore } from '@/stores/staffStore';
import { Employee, Shift, TimeEntry, LeaveRequest, Task } from '@/types/staff';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { formatPrice } from '@/utils/format';
import Link from 'next/link';

const POS_EMOJI: Record<string, string> = { cuisine: '👨‍🍳', comptoir: '🧑‍💼', livreur: '🛵', manager: '📋', polyvalent: '🔄' };
const LEAVE_COLORS: Record<string, string> = { pending: 'bg-amber-500/15 text-amber-400', approved: 'bg-emerald-500/15 text-emerald-400', rejected: 'bg-red-500/15 text-red-400' };
const CAT_EMOJI: Record<string, string> = { prep: '🔪', cleaning: '🧹', restock: '📦', other: '📌' };

type Tab = 'employees' | 'planning' | 'tasks' | 'leaves' | 'clock';

export default function StaffPage() {
  const { t } = useLanguage();
  const { hasRole } = useAuth();
  const [tab, setTab] = useState<Tab>('employees');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    const refresh = () => {
      setEmployees(staffStore.getEmployees());
      setShifts(staffStore.getShifts(today));
      setEntries(staffStore.getTimeEntries(undefined, today));
      setLeaves(staffStore.getLeaveRequests());
      setTasks(staffStore.getTasks(today));
    };
    refresh();
    return staffStore.subscribe(refresh);
  }, [today]);

  const TABS: { key: Tab; label: string; roles: string[] }[] = [
    { key: 'employees', label: t.ui.staff_employees, roles: ['patron', 'manager'] },
    { key: 'planning', label: t.ui.staff_planning, roles: ['patron', 'manager'] },
    { key: 'clock', label: t.ui.staff_clock, roles: ['patron', 'manager'] },
    { key: 'tasks', label: t.ui.staff_tasks, roles: ['patron', 'manager', 'employe'] },
    { key: 'leaves', label: t.ui.staff_leaves, roles: ['patron', 'manager'] },
  ];

  const visibleTabs = TABS.filter((tb) => hasRole(...(tb.roles as any)));

  const getName = (empId: string) => employees.find((e) => e.id === empId)?.name || '?';

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-white">{t.ui.staff_title}</h1>

      {/* Tab bar */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {visibleTabs.map((tb) => (
          <button key={tb.key} onClick={() => setTab(tb.key)}
            className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${tab === tb.key ? 'bg-amber-500/15 text-amber-400' : 'bg-zinc-900 text-zinc-500'}`}>
            {tb.label}
          </button>
        ))}
      </div>

      {/* ─── EMPLOYEES TAB ─── */}
      {tab === 'employees' && (
        <div className="space-y-3">
          {employees.map((emp) => (
            <div key={emp.id} className="p-4 rounded-xl bg-zinc-900 border border-zinc-800/50">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span>{POS_EMOJI[emp.position]}</span>
                    <h3 className="text-sm font-bold text-white">{emp.name}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${emp.active ? 'bg-emerald-500/15 text-emerald-400' : 'bg-zinc-700 text-zinc-500'}`}>
                      {emp.active ? t.ui.admin_active : t.ui.admin_inactive}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-1">{emp.phone} — {emp.email}</p>
                  <p className="text-xs text-zinc-500">{t.ui[`staff_pos_${emp.position}`]} — {t.ui[`staff_contract_${emp.contractType}`]} — {formatPrice(emp.hourlyRate)} €/h</p>
                  <p className="text-xs text-zinc-600">{t.ui.staff_since} {emp.hireDate}</p>
                  {emp.notes && <p className="text-xs text-zinc-600 italic mt-1">💬 {emp.notes}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── PLANNING TAB ─── */}
      {tab === 'planning' && (
        <div className="space-y-2">
          <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{t.ui.staff_todayShifts}</h2>
          {shifts.length === 0 && <p className="text-zinc-500 text-sm py-4 text-center">{t.ui.staff_noShifts}</p>}
          {shifts.map((sh) => (
            <div key={sh.id} className="flex items-center justify-between p-3 rounded-xl bg-zinc-900 border border-zinc-800/50">
              <div>
                <p className="text-sm font-semibold text-white">{getName(sh.employeeId)}</p>
                <p className="text-xs text-zinc-500">{POS_EMOJI[sh.position]} {t.ui[`staff_pos_${sh.position}`]}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-amber-400">{sh.startTime} → {sh.endTime}</p>
                {sh.notes && <p className="text-[10px] text-zinc-500">{sh.notes}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── CLOCK TAB ─── */}
      {tab === 'clock' && (
        <div className="space-y-2">
          <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{t.ui.staff_todayClock}</h2>
          {entries.length === 0 && <p className="text-zinc-500 text-sm py-4 text-center">{t.ui.staff_noClock}</p>}
          {entries.map((te) => (
            <div key={te.id} className="flex items-center justify-between p-3 rounded-xl bg-zinc-900 border border-zinc-800/50">
              <div>
                <p className="text-sm font-semibold text-white">{getName(te.employeeId)}</p>
                <p className="text-xs text-zinc-500">{new Date(te.clockIn).toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit' })}
                  {te.clockOut ? ` → ${new Date(te.clockOut).toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit' })}` : ` → ⏳ ${t.ui.staff_inProgress}`}</p>
              </div>
              <div className="text-right">
                {te.hoursWorked != null ? (
                  <p className="text-sm font-bold text-amber-400">{te.hoursWorked.toFixed(1)}h</p>
                ) : (
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── TASKS TAB ─── */}
      {tab === 'tasks' && (
        <div className="space-y-2">
          {tasks.map((tk) => (
            <div key={tk.id} className="flex items-center gap-3 p-3 rounded-xl bg-zinc-900 border border-zinc-800/50">
              <button onClick={() => staffStore.toggleTask(tk.id)}
                className={`w-6 h-6 rounded-md border-2 flex items-center justify-center text-xs shrink-0 transition-colors ${tk.completed ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-zinc-600 text-transparent'}`}>
                ✓
              </button>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${tk.completed ? 'text-zinc-500 line-through' : 'text-white'}`}>
                  {CAT_EMOJI[tk.category]} {tk.title}
                </p>
                <p className="text-[10px] text-zinc-500">{tk.employeeId ? getName(tk.employeeId) : t.ui.staff_unassigned}</p>
              </div>
            </div>
          ))}
          {tasks.length === 0 && <p className="text-zinc-500 text-sm py-4 text-center">{t.ui.staff_noTasks}</p>}
        </div>
      )}

      {/* ─── LEAVES TAB ─── */}
      {tab === 'leaves' && (
        <div className="space-y-3">
          {leaves.map((lr) => (
            <div key={lr.id} className="p-4 rounded-xl bg-zinc-900 border border-zinc-800/50">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-sm font-bold text-white">{getName(lr.employeeId)}</p>
                  <p className="text-xs text-zinc-400">{t.ui[`staff_leave_${lr.type}`]} — {lr.startDate} → {lr.endDate}</p>
                  {lr.reason && <p className="text-xs text-zinc-500 mt-1 italic">{lr.reason}</p>}
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${LEAVE_COLORS[lr.status]}`}>
                  {t.ui[`staff_leaveStatus_${lr.status}`]}
                </span>
              </div>
              {lr.status === 'pending' && hasRole('patron', 'manager') && (
                <div className="flex gap-2 mt-2">
                  <button onClick={() => staffStore.updateLeaveStatus(lr.id, 'approved')}
                    className="px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 text-xs font-medium">
                    ✅ {t.ui.staff_approve}
                  </button>
                  <button onClick={() => staffStore.updateLeaveStatus(lr.id, 'rejected')}
                    className="px-3 py-1.5 rounded-lg bg-red-500/15 text-red-400 text-xs font-medium">
                    ❌ {t.ui.staff_reject}
                  </button>
                </div>
              )}
            </div>
          ))}
          {leaves.length === 0 && <p className="text-zinc-500 text-sm py-4 text-center">{t.ui.staff_noLeaves}</p>}
        </div>
      )}
    </div>
  );
}
