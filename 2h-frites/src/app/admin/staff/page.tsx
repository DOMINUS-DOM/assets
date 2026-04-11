'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from '@/contexts/LocationContext';
import { formatPrice } from '@/utils/format';
import Link from 'next/link';

const POS_EMOJI: Record<string, string> = { cuisine: '👨‍🍳', comptoir: '🧑‍💼', livreur: '🛵', manager: '📋', polyvalent: '🔄' };
const LEAVE_COLORS: Record<string, string> = { pending: 'bg-amber-500/15 text-amber-400', approved: 'bg-emerald-500/15 text-emerald-400', rejected: 'bg-red-500/15 text-red-400' };
const CAT_EMOJI: Record<string, string> = { prep: '🔪', cleaning: '🧹', restock: '📦', other: '📌' };

type Tab = 'employees' | 'planning' | 'tasks' | 'leaves' | 'clock';

export default function StaffPage() {
  const { t } = useLanguage();
  const { hasRole } = useAuth();
  const { locationId } = useLocation();
  const [tab, setTab] = useState<Tab>('employees');
  const [employees, setEmployees] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [entries, setEntries] = useState<any[]>([]);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const today = new Date().toISOString().slice(0, 10);
  const [viewDate, setViewDate] = useState(today);

  const ic = 'w-full px-3 py-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm focus:outline-none focus:border-amber-500/50';

  // Task form state
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskCategory, setTaskCategory] = useState('prep');
  const [taskPriority, setTaskPriority] = useState('medium');
  const [taskEmployee, setTaskEmployee] = useState('');
  const [taskDueTime, setTaskDueTime] = useState('');
  const [taskPhotoUrl, setTaskPhotoUrl] = useState('');
  const [taskRequiresPhoto, setTaskRequiresPhoto] = useState(false);
  const [taskFilter, setTaskFilter] = useState('all');
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  const PRIORITY_COLORS: Record<string, string> = { low: 'bg-emerald-500/15 text-emerald-400', medium: 'bg-amber-500/15 text-amber-400', high: 'bg-red-500/15 text-red-400', urgent: 'bg-purple-500/15 text-purple-400' };
  const PRIORITY_LABELS: Record<string, string> = { low: 'Low', medium: 'Medium', high: 'High', urgent: 'Urgent' };

  const resetTaskForm = () => {
    setTaskTitle(''); setTaskDesc(''); setTaskCategory('prep'); setTaskPriority('medium');
    setTaskEmployee(''); setTaskDueTime(''); setTaskPhotoUrl(''); setTaskRequiresPhoto(false);
    setEditingTaskId(null);
  };

  const startEditTask = (tk: any) => {
    setEditingTaskId(tk.id);
    setTaskTitle(tk.title || '');
    setTaskDesc(tk.description || '');
    setTaskCategory(tk.category || 'prep');
    setTaskPriority(tk.priority || 'medium');
    setTaskEmployee(tk.employeeId || '');
    setTaskDueTime(tk.dueTime || '');
    setTaskPhotoUrl(tk.photoUrl || '');
    setTaskRequiresPhoto(tk.requiresPhoto || false);
    setShowTaskForm(true);
  };

  const submitTask = async () => {
    if (!taskTitle.trim()) return;
    if (editingTaskId) {
      // Update existing task
      await api.post('/staff', {
        action: 'updateTask',
        data: {
          id: editingTaskId,
          title: taskTitle.trim(), description: taskDesc.trim(), category: taskCategory,
          priority: taskPriority, employeeId: taskEmployee || null,
          dueTime: taskDueTime || null, photoUrl: taskPhotoUrl || null,
          requiresPhoto: taskRequiresPhoto,
        },
      });
    } else {
      // Create new task
      await api.post('/staff', {
        action: 'addTask',
        data: {
          title: taskTitle.trim(), description: taskDesc.trim(), category: taskCategory,
          priority: taskPriority, employeeId: taskEmployee || null, locationId,
          date: viewDate, dueTime: taskDueTime || null, photoUrl: taskPhotoUrl || null,
          requiresPhoto: taskRequiresPhoto,
        },
      });
    }
    resetTaskForm(); setShowTaskForm(false); refresh();
  };

  const filteredTasks = taskFilter === 'all' ? tasks : tasks.filter((t: any) => t.priority === taskFilter);

  const refresh = async () => {
    try {
      const locParam = locationId ? `?locationId=${locationId}` : '';
      const data = await api.get<{ employees: any[]; shifts: any[]; timeEntries: any[]; leaveRequests: any[]; tasks: any[] }>(`/staff${locParam}`);
      setEmployees(data.employees);
      setShifts(data.shifts.filter((s: any) => s.date === viewDate));
      setEntries(data.timeEntries.filter((e: any) => e.date === viewDate));
      setLeaves(data.leaveRequests);
      setTasks(data.tasks.filter((t: any) => t.date === viewDate));
    } catch {}
  };

  useEffect(() => { refresh(); }, [viewDate, locationId]);

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

      {/* Date picker + Tab bar */}
      <div className="flex items-center gap-3 mb-2">
        <input
          type="date"
          value={viewDate}
          onChange={(e) => setViewDate(e.target.value)}
          className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-white text-xs focus:outline-none focus:border-amber-500/50"
        />
        {viewDate !== today && (
          <button onClick={() => setViewDate(today)} className="text-xs text-amber-400 hover:text-amber-300">
            {t.ui.staff_todayShifts ? 'Aujourd\'hui' : 'Today'}
          </button>
        )}
      </div>
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
        <div className="space-y-3">
          {/* Create Task Toggle */}
          {hasRole('patron', 'manager') && (
            <button onClick={() => { if (showTaskForm) { resetTaskForm(); setShowTaskForm(false); } else { setShowTaskForm(true); } }}
              className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800/50 text-sm font-medium text-amber-400 hover:bg-zinc-800/70 transition-colors">
              <span>{showTaskForm ? '✕ Fermer' : (editingTaskId ? '✏️ Modifier' : '＋ Nouvelle tâche')}</span>
              <span className="text-zinc-600 text-xs">{showTaskForm ? '' : `${tasks.length} tâche${tasks.length !== 1 ? 's' : ''}`}</span>
            </button>
          )}

          {/* Create Task Form */}
          {showTaskForm && (
            <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800/50 space-y-3">
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Titre *</label>
                <input type="text" value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} placeholder="Ex: Préparer les sauces" className={ic} />
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Description</label>
                <textarea value={taskDesc} onChange={(e) => setTaskDesc(e.target.value)} rows={2} placeholder="Instructions détaillées..." className={ic + ' resize-none'} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Catégorie</label>
                  <select value={taskCategory} onChange={(e) => setTaskCategory(e.target.value)} className={ic}>
                    <option value="prep">🔪 Préparation</option>
                    <option value="cleaning">🧹 Nettoyage</option>
                    <option value="restock">📦 Réassort</option>
                    <option value="other">📌 Autre</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Priorité</label>
                  <select value={taskPriority} onChange={(e) => setTaskPriority(e.target.value)} className={ic}>
                    <option value="low">🟢 Low</option>
                    <option value="medium">🟡 Medium</option>
                    <option value="high">🔴 High</option>
                    <option value="urgent">🟣 Urgent</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Assigné à</label>
                  <select value={taskEmployee} onChange={(e) => setTaskEmployee(e.target.value)} className={ic}>
                    <option value="">Équipe (non assigné)</option>
                    {employees.filter((e) => e.active).map((e) => (
                      <option key={e.id} value={e.id}>{e.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Heure limite</label>
                  <input type="time" value={taskDueTime} onChange={(e) => setTaskDueTime(e.target.value)} className={ic} />
                </div>
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Photo de référence (URL)</label>
                <input type="text" value={taskPhotoUrl} onChange={(e) => setTaskPhotoUrl(e.target.value)} placeholder="https://res.cloudinary.com/..." className={ic} />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="reqPhoto" checked={taskRequiresPhoto} onChange={(e) => setTaskRequiresPhoto(e.target.checked)}
                  className="w-4 h-4 rounded bg-zinc-800 border-zinc-600 text-amber-500 focus:ring-amber-500/30" />
                <label htmlFor="reqPhoto" className="text-xs text-zinc-400">Exiger une photo preuve à la complétion</label>
              </div>
              <button onClick={submitTask} disabled={!taskTitle.trim()}
                className="w-full py-2.5 rounded-lg bg-amber-500 text-black text-sm font-bold hover:bg-amber-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                {editingTaskId ? 'Enregistrer' : 'Créer la tâche'}
              </button>
            </div>
          )}

          {/* Filter bar */}
          <div className="flex gap-1.5 overflow-x-auto">
            {['all', 'urgent', 'high', 'medium', 'low'].map((f) => (
              <button key={f} onClick={() => setTaskFilter(f)}
                className={`whitespace-nowrap px-3 py-1 rounded-lg text-xs font-medium transition-colors ${taskFilter === f ? 'bg-amber-500/15 text-amber-400' : 'bg-zinc-900 text-zinc-500 hover:text-zinc-400'}`}>
                {f === 'all' ? 'Toutes' : PRIORITY_LABELS[f]}
              </button>
            ))}
          </div>

          {/* Task list */}
          {filteredTasks.map((tk: any) => (
            <div key={tk.id} className={`p-3.5 rounded-xl bg-zinc-900 border transition-colors ${tk.completed ? 'border-zinc-800/30 opacity-60' : 'border-zinc-800/50'}`}>
              <div className="flex items-start gap-3">
                {/* Toggle complete */}
                <button onClick={() => api.post('/staff', { action: 'toggleTask', id: tk.id }).then(refresh)}
                  className={`w-6 h-6 rounded-md border-2 flex items-center justify-center text-xs shrink-0 mt-0.5 transition-colors ${tk.completed ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-zinc-600 text-transparent hover:border-zinc-400'}`}>
                  ✓
                </button>

                <div className="flex-1 min-w-0">
                  {/* Title row with badges */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm" title={tk.category}>{CAT_EMOJI[tk.category] || '📌'}</span>
                    <p className={`text-sm font-semibold ${tk.completed ? 'text-zinc-500 line-through' : 'text-white'}`}>{tk.title}</p>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${PRIORITY_COLORS[tk.priority] || PRIORITY_COLORS.medium}`}>
                      {PRIORITY_LABELS[tk.priority] || 'Medium'}
                    </span>
                  </div>

                  {/* Description preview */}
                  {tk.description && (
                    <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{tk.description}</p>
                  )}

                  {/* Meta row */}
                  <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                    <span className="text-[10px] text-zinc-500">
                      👤 {tk.employeeId ? getName(tk.employeeId) : 'Équipe'}
                    </span>
                    {tk.dueTime && (
                      <span className="text-[10px] text-zinc-500">⏰ {tk.dueTime}</span>
                    )}
                    {tk.completed && tk.completedAt && (
                      <span className="text-[10px] text-emerald-400/70">
                        ✓ {new Date(tk.completedAt).toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>

                  {/* Photo reference thumbnail */}
                  {tk.photoUrl && (
                    <div className="mt-2">
                      <img src={tk.photoUrl} alt="Référence" className="w-16 h-16 rounded-lg object-cover border border-zinc-700" />
                    </div>
                  )}

                  {/* Completion photo */}
                  {tk.completionPhotoUrl && (
                    <div className="mt-2 flex items-center gap-2">
                      <img src={tk.completionPhotoUrl} alt="Preuve" className="w-16 h-16 rounded-lg object-cover border border-emerald-700/50" />
                      <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">✓ Photo preuve</span>
                    </div>
                  )}
                </div>

                {/* Edit + Delete buttons (admin only) */}
                {hasRole('patron', 'manager') && (
                  <div className="flex flex-col gap-1 shrink-0">
                    <button onClick={() => startEditTask(tk)}
                      className="text-zinc-600 hover:text-amber-400 text-xs transition-colors p-1" title="Modifier">
                      ✏️
                    </button>
                    <button onClick={() => api.post('/staff', { action: 'deleteTask', id: tk.id }).then(refresh)}
                      className="text-zinc-600 hover:text-red-400 text-xs transition-colors p-1" title="Supprimer">
                      🗑
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {filteredTasks.length === 0 && <p className="text-zinc-500 text-sm py-4 text-center">{t.ui.staff_noTasks}</p>}
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
                  <button onClick={() => api.post('/staff', { action: 'updateLeaveStatus', id: lr.id, status: 'approved' }).then(refresh)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 text-xs font-medium">
                    ✅ {t.ui.staff_approve}
                  </button>
                  <button onClick={() => api.post('/staff', { action: 'updateLeaveStatus', id: lr.id, status: 'rejected' }).then(refresh)}
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
