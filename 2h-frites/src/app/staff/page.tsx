'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n/LanguageContext';
import { formatPrice } from '@/utils/format';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import Link from 'next/link';

const CAT_EMOJI: Record<string, string> = { prep: '🔪', cleaning: '🧹', restock: '📦', other: '📌' };

function StaffContent() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [employee, setEmployee] = useState<any>(null);
  const [activeEntry, setActiveEntry] = useState<any>(null);
  const [todayShifts, setTodayShifts] = useState<any[]>([]);
  const [myTasks, setMyTasks] = useState<any[]>([]);
  const [myLeaves, setMyLeaves] = useState<any[]>([]);
  const [myPayslips, setMyPayslips] = useState<any[]>([]);
  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [leaveForm, setLeaveForm] = useState({ type: 'vacation' as const, startDate: '', endDate: '', reason: '' });
  const today = new Date().toISOString().slice(0, 10);

  const refresh = async () => {
    if (!user) return;
    try {
      const [staffData, payData] = await Promise.all([
        api.get<{ employees: any[]; shifts: any[]; timeEntries: any[]; leaveRequests: any[]; tasks: any[] }>('/staff'),
        api.get<{ payslips: any[] }>('/payroll'),
      ]);
      const emp = staffData.employees.find((e: any) => e.userId === user.id);
      setEmployee(emp || null);
      if (emp) {
        const active = staffData.timeEntries.find((t: any) => t.employeeId === emp.id && !t.clockOut);
        setActiveEntry(active || null);
        setTodayShifts(staffData.shifts.filter((s: any) => s.date === today && s.employeeId === emp.id));
        setMyTasks(staffData.tasks.filter((t: any) => t.date === today && (t.employeeId === emp.id || !t.employeeId)));
        setMyLeaves(staffData.leaveRequests.filter((l: any) => l.employeeId === emp.id));
        setMyPayslips(payData.payslips.filter((p: any) => p.employeeId === emp.id));
      }
    } catch {}
  };

  useEffect(() => { refresh(); }, [user, today]);

  if (!employee) {
    return (
      <div className="text-center py-20">
        <span className="text-5xl block mb-4">🔍</span>
        <p className="text-zinc-400 text-sm">{t.ui.staff_noProfile}</p>
      </div>
    );
  }

  const handleClock = async () => {
    if (activeEntry) {
      await api.post('/staff', { action: 'clockOut', id: activeEntry.id });
    } else {
      await api.post('/staff', { action: 'clockIn', employeeId: employee.id });
    }
  };

  const handleLeaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveForm.startDate || !leaveForm.endDate) return;
    await api.post('/staff', { action: 'addLeaveRequest', data: { employeeId: employee.id, ...leaveForm } });
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
          {myTasks.map((tk) => {
            const PRIO_COLORS: Record<string, string> = { low: 'bg-emerald-500/15 text-emerald-400', medium: 'bg-amber-500/15 text-amber-400', high: 'bg-red-500/15 text-red-400', urgent: 'bg-purple-500/15 text-purple-400' };
            return (
              <div key={tk.id} className={`p-3 rounded-xl bg-zinc-900 border border-zinc-800/50 ${tk.completed ? 'opacity-60' : ''}`}>
                <div className="flex items-start gap-3">
                  {/* Checkbox — if requires photo and not complete, don't allow simple toggle */}
                  {tk.requiresPhoto && !tk.completed ? (
                    <label className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-xs shrink-0 cursor-pointer">
                      📷
                      <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const formData = new FormData();
                        formData.append('file', file);
                        formData.append('locationId', 'global');
                        formData.append('name', `task-proof-${tk.id}`);
                        try {
                          const token = localStorage.getItem('2h-auth-token');
                          const res = await fetch('/api/signage/media', {
                            method: 'POST',
                            headers: token ? { 'Authorization': `Bearer ${token}` } : {},
                            body: formData,
                          });
                          const media = await res.json();
                          if (media.url) {
                            await api.post('/staff', { action: 'completeTaskWithPhoto', id: tk.id, completionPhotoUrl: media.url });
                            refresh();
                          }
                        } catch {}
                      }} />
                    </label>
                  ) : (
                    <button onClick={() => api.post('/staff', { action: 'toggleTask', id: tk.id }).then(refresh)}
                      className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center text-sm shrink-0 transition-colors ${
                        tk.completed ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-zinc-600 hover:border-zinc-500'
                      }`}>
                      {tk.completed ? '✓' : ''}
                    </button>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-sm font-medium ${tk.completed ? 'text-zinc-500 line-through' : 'text-white'}`}>
                        {CAT_EMOJI[tk.category]} {tk.title}
                      </span>
                      {tk.priority && tk.priority !== 'medium' && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${PRIO_COLORS[tk.priority] || ''}`}>
                          {tk.priority === 'urgent' ? '⚡ Urgent' : tk.priority === 'high' ? '🔴 High' : '🟢 Low'}
                        </span>
                      )}
                      {tk.dueTime && (
                        <span className="text-[10px] text-zinc-500">🕐 {tk.dueTime}</span>
                      )}
                    </div>
                    {tk.description && (
                      <p className="text-xs text-zinc-400 mt-1 line-clamp-2">{tk.description}</p>
                    )}
                    {tk.photoUrl && (
                      <div className="mt-2">
                        <p className="text-[10px] text-zinc-500 mb-1">📎 Photo de référence :</p>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={tk.photoUrl} alt="Référence" className="h-20 w-auto rounded-lg border border-zinc-700" />
                      </div>
                    )}
                    {tk.requiresPhoto && !tk.completed && (
                      <p className="text-[10px] text-amber-400 mt-1">📷 Photo preuve requise pour valider</p>
                    )}
                    {tk.completionPhotoUrl && (
                      <div className="mt-2">
                        <p className="text-[10px] text-emerald-400 mb-1">✓ Photo preuve :</p>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={tk.completionPhotoUrl} alt="Preuve" className="h-20 w-auto rounded-lg border border-emerald-700/30" />
                      </div>
                    )}
                    {tk.completedAt && (
                      <p className="text-[10px] text-zinc-600 mt-1">Validée le {new Date(tk.completedAt).toLocaleString('fr-BE')}</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
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
                    <p className="text-sm text-white font-medium">{(slip.regularHours || 0).toFixed(1)}h + {(slip.overtimeHours || 0).toFixed(1)}h sup</p>
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
