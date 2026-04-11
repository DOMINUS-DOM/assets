'use client';

import { useState, useEffect, useMemo } from 'react';
import { api } from '@/lib/api';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from '@/contexts/LocationContext';
import { formatPrice } from '@/utils/format';
import Link from 'next/link';

const POS_EMOJI: Record<string, string> = { cuisine: '👨‍🍳', comptoir: '🧑‍💼', livreur: '🛵', manager: '📋', polyvalent: '🔄' };
const LEAVE_COLORS: Record<string, string> = { pending: 'bg-amber-500/15 text-amber-400', approved: 'bg-emerald-500/15 text-emerald-400', rejected: 'bg-red-500/15 text-red-400' };
const CAT_EMOJI: Record<string, string> = { prep: '🔪', cleaning: '🧹', restock: '📦', other: '📌' };
const CAT_LABELS: Record<string, string> = { prep: 'Préparation', cleaning: 'Nettoyage', restock: 'Réassort', other: 'Autre' };
const PRIO_COLORS: Record<string, string> = { low: 'bg-emerald-500/15 text-emerald-400', medium: 'bg-amber-500/15 text-amber-400', high: 'bg-red-500/15 text-red-400', urgent: 'bg-purple-500/15 text-purple-400' };
const PRIO_LABELS: Record<string, string> = { low: 'Faible', medium: 'Normal', high: 'Élevé', urgent: 'Urgent' };
const PRIO_DOT: Record<string, string> = { low: 'bg-emerald-500', medium: 'bg-amber-500', high: 'bg-red-500', urgent: 'bg-purple-500' };

type Tab = 'employees' | 'planning' | 'tasks' | 'leaves' | 'clock';
type TaskView = 'list' | 'byEmployee';
type TaskStatusFilter = 'all' | 'pending' | 'completed' | 'overdue';

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

  // ─── Task management state ───
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskCategory, setTaskCategory] = useState('prep');
  const [taskPriority, setTaskPriority] = useState('medium');
  const [taskEmployee, setTaskEmployee] = useState('');
  const [taskDueTime, setTaskDueTime] = useState('');
  const [taskPhotoUrl, setTaskPhotoUrl] = useState('');
  const [taskRequiresPhoto, setTaskRequiresPhoto] = useState(false);
  const [taskFilterPriority, setTaskFilterPriority] = useState('all');
  const [taskFilterStatus, setTaskFilterStatus] = useState<TaskStatusFilter>('all');
  const [taskFilterEmployee, setTaskFilterEmployee] = useState('all');
  const [taskSearch, setTaskSearch] = useState('');
  const [taskView, setTaskView] = useState<TaskView>('list');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const isAdmin = hasRole('patron', 'manager', 'franchisor_admin');
  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

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
    if (!taskTitle.trim() || submitting) return;
    setSubmitting(true);
    try {
      if (editingTaskId) {
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
    } catch {}
    setSubmitting(false);
  };

  const deleteTask = async (id: string) => {
    await api.post('/staff', { action: 'deleteTask', id });
    setConfirmDelete(null);
    refresh();
  };

  // ─── Filtered & computed tasks ───
  const filteredTasks = useMemo(() => {
    let list = tasks;
    if (taskFilterPriority !== 'all') list = list.filter((t: any) => t.priority === taskFilterPriority);
    if (taskFilterEmployee !== 'all') {
      list = taskFilterEmployee === 'unassigned'
        ? list.filter((t: any) => !t.employeeId)
        : list.filter((t: any) => t.employeeId === taskFilterEmployee);
    }
    if (taskFilterStatus === 'pending') list = list.filter((t: any) => !t.completed);
    if (taskFilterStatus === 'completed') list = list.filter((t: any) => t.completed);
    if (taskFilterStatus === 'overdue') list = list.filter((t: any) => !t.completed && t.dueTime && t.dueTime < currentTime);
    if (taskSearch) {
      const q = taskSearch.toLowerCase();
      list = list.filter((t: any) => t.title?.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q));
    }
    return list;
  }, [tasks, taskFilterPriority, taskFilterEmployee, taskFilterStatus, taskSearch, currentTime]);

  const taskStats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((t: any) => t.completed).length;
    const pending = total - completed;
    const overdue = tasks.filter((t: any) => !t.completed && t.dueTime && t.dueTime < currentTime).length;
    const urgent = tasks.filter((t: any) => !t.completed && (t.priority === 'urgent' || t.priority === 'high')).length;
    return { total, completed, pending, overdue, urgent };
  }, [tasks, currentTime]);

  const tasksByEmployee = useMemo(() => {
    const map: Record<string, any[]> = { unassigned: [] };
    employees.filter(e => e.active).forEach(e => { map[e.id] = []; });
    filteredTasks.forEach((t: any) => {
      const key = t.employeeId || 'unassigned';
      if (!map[key]) map[key] = [];
      map[key].push(t);
    });
    return map;
  }, [filteredTasks, employees]);

  // ─── Data loading ───
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
    { key: 'tasks', label: t.ui.staff_tasks, roles: ['patron', 'manager', 'employe', 'franchisor_admin'] },
    { key: 'leaves', label: t.ui.staff_leaves, roles: ['patron', 'manager'] },
  ];

  const visibleTabs = TABS.filter((tb) => hasRole(...(tb.roles as any)));
  const getName = (empId: string) => employees.find((e) => e.id === empId)?.name || '?';
  const isOverdue = (tk: any) => !tk.completed && tk.dueTime && viewDate === today && tk.dueTime < currentTime;

  // ─── Task Card Component ───
  const TaskCard = ({ tk }: { tk: any }) => (
    <div className={`p-3.5 rounded-xl border transition-colors ${
      tk.completed ? 'bg-zinc-900/50 border-zinc-800/30 opacity-60'
        : isOverdue(tk) ? 'bg-red-950/30 border-red-500/30'
        : 'bg-zinc-900 border-zinc-800/50'
    }`}>
      <div className="flex items-start gap-3">
        {/* Toggle */}
        <button onClick={() => api.post('/staff', { action: 'toggleTask', id: tk.id }).then(refresh)}
          className={`w-6 h-6 rounded-md border-2 flex items-center justify-center text-xs shrink-0 mt-0.5 transition-colors ${
            tk.completed ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-zinc-600 text-transparent hover:border-amber-500'
          }`}>✓</button>

        <div className="flex-1 min-w-0">
          {/* Title + badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm" title={CAT_LABELS[tk.category]}>{CAT_EMOJI[tk.category] || '📌'}</span>
            <p className={`text-sm font-semibold ${tk.completed ? 'text-zinc-500 line-through' : 'text-white'}`}>{tk.title}</p>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${PRIO_COLORS[tk.priority] || PRIO_COLORS.medium}`}>
              {PRIO_LABELS[tk.priority] || 'Normal'}
            </span>
            {isOverdue(tk) && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-400 animate-pulse">EN RETARD</span>
            )}
            {tk.requiresPhoto && !tk.completionPhotoUrl && !tk.completed && (
              <span className="text-[10px] text-amber-400">📷 requis</span>
            )}
          </div>

          {/* Description */}
          {tk.description && <p className="text-xs text-zinc-500 mt-1">{tk.description}</p>}

          {/* Meta */}
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            <span className="text-[10px] text-zinc-500">👤 {tk.employeeId ? getName(tk.employeeId) : 'Équipe'}</span>
            {tk.dueTime && (
              <span className={`text-[10px] ${isOverdue(tk) ? 'text-red-400 font-bold' : 'text-zinc-500'}`}>⏰ {tk.dueTime}</span>
            )}
            {tk.completed && tk.completedAt && (
              <span className="text-[10px] text-emerald-400/70">
                ✓ Terminée à {new Date(tk.completedAt).toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>

          {/* Photos */}
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            {tk.photoUrl && (
              <button onClick={() => setPhotoPreview(tk.photoUrl)} className="group relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={tk.photoUrl} alt="Référence" className="w-16 h-16 rounded-lg object-cover border border-zinc-700 group-hover:border-amber-500 transition-colors" />
                <span className="absolute bottom-0.5 left-0.5 text-[8px] bg-black/70 text-zinc-300 px-1 rounded">Réf.</span>
              </button>
            )}
            {tk.completionPhotoUrl && (
              <button onClick={() => setPhotoPreview(tk.completionPhotoUrl)} className="group relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={tk.completionPhotoUrl} alt="Preuve" className="w-16 h-16 rounded-lg object-cover border border-emerald-700/50 group-hover:border-emerald-500 transition-colors" />
                <span className="absolute bottom-0.5 left-0.5 text-[8px] bg-emerald-900/90 text-emerald-300 px-1 rounded">✓ Preuve</span>
              </button>
            )}
          </div>
        </div>

        {/* Actions */}
        {isAdmin && (
          <div className="flex flex-col gap-1 shrink-0">
            <button onClick={() => startEditTask(tk)}
              className="w-7 h-7 rounded-lg bg-zinc-800 hover:bg-amber-500/15 text-zinc-500 hover:text-amber-400 flex items-center justify-center text-xs transition-colors" title="Modifier">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" /></svg>
            </button>
            {confirmDelete === tk.id ? (
              <div className="flex flex-col gap-0.5">
                <button onClick={() => deleteTask(tk.id)}
                  className="w-7 h-7 rounded-lg bg-red-500/20 text-red-400 flex items-center justify-center text-[10px] font-bold transition-colors">✓</button>
                <button onClick={() => setConfirmDelete(null)}
                  className="w-7 h-7 rounded-lg bg-zinc-800 text-zinc-500 flex items-center justify-center text-[10px] transition-colors">✕</button>
              </div>
            ) : (
              <button onClick={() => setConfirmDelete(tk.id)}
                className="w-7 h-7 rounded-lg bg-zinc-800 hover:bg-red-500/15 text-zinc-500 hover:text-red-400 flex items-center justify-center text-xs transition-colors" title="Supprimer">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-white">{t.ui.staff_title}</h1>

      {/* Date picker + Tab bar */}
      <div className="flex items-center gap-3 mb-2">
        <input type="date" value={viewDate} onChange={(e) => setViewDate(e.target.value)}
          className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-white text-xs focus:outline-none focus:border-amber-500/50" />
        {viewDate !== today && (
          <button onClick={() => setViewDate(today)} className="text-xs text-amber-400 hover:text-amber-300">Aujourd&apos;hui</button>
        )}
      </div>
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {visibleTabs.map((tb) => {
          const badge = tb.key === 'tasks' ? taskStats.pending : 0;
          return (
            <button key={tb.key} onClick={() => setTab(tb.key)}
              className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${tab === tb.key ? 'bg-amber-500/15 text-amber-400' : 'bg-zinc-900 text-zinc-500'}`}>
              {tb.label}
              {tb.key === 'tasks' && badge > 0 && (
                <span className={`text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center ${taskStats.overdue > 0 ? 'bg-red-500' : 'bg-amber-500'}`}>{badge}</span>
              )}
            </button>
          );
        })}
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

      {/* ═══════════════════════════════════════ */}
      {/* ─── TASKS TAB (Complete Module) ───    */}
      {/* ═══════════════════════════════════════ */}
      {tab === 'tasks' && (
        <div className="space-y-4">
          {/* Stats bar */}
          <div className="grid grid-cols-4 gap-2">
            <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800/50 text-center">
              <p className="text-lg font-extrabold text-white">{taskStats.total}</p>
              <p className="text-[10px] text-zinc-500">Total</p>
            </div>
            <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800/50 text-center">
              <p className="text-lg font-extrabold text-amber-400">{taskStats.pending}</p>
              <p className="text-[10px] text-zinc-500">En attente</p>
            </div>
            <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800/50 text-center">
              <p className="text-lg font-extrabold text-emerald-400">{taskStats.completed}</p>
              <p className="text-[10px] text-zinc-500">Terminées</p>
            </div>
            <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800/50 text-center">
              <p className={`text-lg font-extrabold ${taskStats.overdue > 0 ? 'text-red-400' : 'text-zinc-600'}`}>{taskStats.overdue}</p>
              <p className="text-[10px] text-zinc-500">En retard</p>
            </div>
          </div>

          {/* Progress bar */}
          {taskStats.total > 0 && (
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${(taskStats.completed / taskStats.total) * 100}%` }} />
              </div>
              <span className="text-xs text-zinc-400 font-medium shrink-0">{Math.round((taskStats.completed / taskStats.total) * 100)}%</span>
            </div>
          )}

          {/* Toolbar: Create + Search + Filters + View */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {isAdmin && (
                <button onClick={() => { if (showTaskForm) { resetTaskForm(); setShowTaskForm(false); } else { resetTaskForm(); setShowTaskForm(true); } }}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors shrink-0 ${
                    showTaskForm ? 'bg-zinc-700 text-zinc-300' : 'bg-amber-500 text-zinc-950 hover:bg-amber-400'
                  }`}>
                  {showTaskForm ? '✕ Fermer' : '+ Nouvelle tâche'}
                </button>
              )}
              <input type="text" value={taskSearch} onChange={(e) => setTaskSearch(e.target.value)}
                placeholder="Rechercher..." className="flex-1 px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-amber-500/50" />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {/* Status filter */}
              {(['all', 'pending', 'completed', 'overdue'] as TaskStatusFilter[]).map((f) => {
                const labels: Record<string, string> = { all: 'Toutes', pending: 'En attente', completed: 'Terminées', overdue: 'En retard' };
                return (
                  <button key={f} onClick={() => setTaskFilterStatus(f)}
                    className={`whitespace-nowrap px-2.5 py-1 rounded text-xs font-medium transition-colors ${taskFilterStatus === f ? 'bg-amber-500/15 text-amber-400' : 'bg-zinc-900 text-zinc-500'}`}>
                    {labels[f]}
                  </button>
                );
              })}
              <span className="text-zinc-700">|</span>
              {/* Employee filter */}
              <select value={taskFilterEmployee} onChange={(e) => setTaskFilterEmployee(e.target.value)}
                className="px-2 py-1 rounded text-xs bg-zinc-900 border border-zinc-800 text-zinc-400 focus:outline-none">
                <option value="all">Tous</option>
                <option value="unassigned">Non assigné</option>
                {employees.filter(e => e.active).map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
              {/* Priority filter */}
              <select value={taskFilterPriority} onChange={(e) => setTaskFilterPriority(e.target.value)}
                className="px-2 py-1 rounded text-xs bg-zinc-900 border border-zinc-800 text-zinc-400 focus:outline-none">
                <option value="all">Priorité</option>
                {Object.entries(PRIO_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <span className="text-zinc-700">|</span>
              {/* View toggle */}
              <button onClick={() => setTaskView(taskView === 'list' ? 'byEmployee' : 'list')}
                className="whitespace-nowrap px-2.5 py-1 rounded text-xs font-medium bg-zinc-900 text-zinc-500 hover:text-zinc-300 transition-colors">
                {taskView === 'list' ? '👤 Par employé' : '📋 Liste'}
              </button>
            </div>
          </div>

          {/* Create/Edit Form */}
          {showTaskForm && (
            <div className="p-4 rounded-xl bg-zinc-900 border border-amber-500/30 space-y-3 animate-in">
              <h3 className="text-sm font-bold text-white">{editingTaskId ? '✏️ Modifier la tâche' : '+ Nouvelle tâche'}</h3>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Titre *</label>
                <input type="text" value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} placeholder="Ex: Préparer les sauces" className={ic} />
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Description / Instructions</label>
                <textarea value={taskDesc} onChange={(e) => setTaskDesc(e.target.value)} rows={2} placeholder="Instructions détaillées..." className={ic + ' resize-none'} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Catégorie</label>
                  <select value={taskCategory} onChange={(e) => setTaskCategory(e.target.value)} className={ic}>
                    {Object.entries(CAT_LABELS).map(([k, v]) => <option key={k} value={k}>{CAT_EMOJI[k]} {v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Priorité</label>
                  <select value={taskPriority} onChange={(e) => setTaskPriority(e.target.value)} className={ic}>
                    {Object.entries(PRIO_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Assigné à</label>
                  <select value={taskEmployee} onChange={(e) => setTaskEmployee(e.target.value)} className={ic}>
                    <option value="">Équipe (non assigné)</option>
                    {employees.filter((e) => e.active).map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
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
              <div className="flex gap-2">
                <button onClick={() => { resetTaskForm(); setShowTaskForm(false); }}
                  className="flex-1 py-2.5 rounded-lg bg-zinc-800 text-zinc-300 text-sm font-medium hover:bg-zinc-700 transition-colors">Annuler</button>
                <button onClick={submitTask} disabled={!taskTitle.trim() || submitting}
                  className="flex-1 py-2.5 rounded-lg bg-amber-500 text-black text-sm font-bold hover:bg-amber-400 transition-colors disabled:opacity-40">
                  {submitting ? '...' : (editingTaskId ? 'Enregistrer' : 'Créer')}
                </button>
              </div>
            </div>
          )}

          {/* Task List View */}
          {taskView === 'list' && (
            <div className="space-y-2">
              {filteredTasks.map((tk: any) => <TaskCard key={tk.id} tk={tk} />)}
              {filteredTasks.length === 0 && <p className="text-zinc-500 text-sm py-6 text-center">{t.ui.staff_noTasks}</p>}
            </div>
          )}

          {/* By Employee View */}
          {taskView === 'byEmployee' && (
            <div className="space-y-4">
              {Object.entries(tasksByEmployee).map(([empId, empTasks]) => {
                if (empTasks.length === 0 && empId !== 'unassigned') return null;
                const empName = empId === 'unassigned' ? 'Non assigné (Équipe)' : getName(empId);
                const empCompleted = empTasks.filter((t: any) => t.completed).length;
                return (
                  <div key={empId}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">👤 {empName}</span>
                        <span className="text-[10px] text-zinc-600">{empCompleted}/{empTasks.length}</span>
                      </div>
                      {empTasks.length > 0 && (
                        <div className="w-20 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(empCompleted / empTasks.length) * 100}%` }} />
                        </div>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      {empTasks.map((tk: any) => <TaskCard key={tk.id} tk={tk} />)}
                      {empTasks.length === 0 && <p className="text-zinc-600 text-xs py-2 pl-2">Aucune tâche</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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

      {/* ═══ PHOTO PREVIEW MODAL ═══ */}
      {photoPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setPhotoPreview(null)}>
          <div className="absolute inset-0 bg-black/80" />
          <div className="relative max-w-lg max-h-[80vh]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photoPreview} alt="Preview" className="max-w-full max-h-[80vh] rounded-xl object-contain" />
            <button onClick={() => setPhotoPreview(null)}
              className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 text-white flex items-center justify-center text-sm hover:bg-zinc-700">✕</button>
          </div>
        </div>
      )}
    </div>
  );
}
