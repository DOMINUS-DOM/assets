'use client';

import { useState, useEffect } from 'react';
import { payrollStore } from '@/stores/payrollStore';
import { staffStore } from '@/stores/staffStore';
import { PayPeriod, Payslip, TimesheetLine } from '@/types/payroll';
import { Employee } from '@/types/staff';
import { useLanguage } from '@/i18n/LanguageContext';
import { formatPrice } from '@/utils/format';

type Tab = 'periods' | 'timesheets' | 'payslips';

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-zinc-700/50 text-zinc-300',
  validated: 'bg-amber-500/15 text-amber-400',
  paid: 'bg-emerald-500/15 text-emerald-400',
};

export default function PayrollPage() {
  const { t } = useLanguage();
  const [tab, setTab] = useState<Tab>('periods');
  const [periods, setPeriods] = useState<PayPeriod[]>([]);
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [activePeriod, setActivePeriod] = useState<string | null>(null);
  const [timesheets, setTimesheets] = useState<TimesheetLine[]>([]);

  useEffect(() => {
    const refresh = () => {
      setPeriods(payrollStore.getPeriods());
      setPayslips(payrollStore.getPayslips());
      setEmployees(staffStore.getEmployees());
    };
    refresh();
    const unsub1 = payrollStore.subscribe(refresh);
    const unsub2 = staffStore.subscribe(refresh);
    return () => { unsub1(); unsub2(); };
  }, []);

  useEffect(() => {
    if (activePeriod) {
      const period = periods.find((p) => p.id === activePeriod);
      if (period) {
        setTimesheets(payrollStore.getTimesheets(period.startDate, period.endDate));
      }
    }
  }, [activePeriod, periods]);

  const getName = (empId: string) => employees.find((e) => e.id === empId)?.name || '?';
  const periodSlips = activePeriod ? payslips.filter((s) => s.periodId === activePeriod) : [];
  const totalNet = periodSlips.reduce((sum, s) => sum + s.netTotal, 0);
  const totalGross = periodSlips.reduce((sum, s) => sum + s.grossTotal, 0);

  const ic = 'w-full px-3 py-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm focus:outline-none focus:border-amber-500/50';

  const TABS: { key: Tab; label: string }[] = [
    { key: 'periods', label: t.ui.pay_periods },
    { key: 'timesheets', label: t.ui.pay_timesheets },
    { key: 'payslips', label: t.ui.pay_payslips },
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-white">{t.ui.pay_title}</h1>

      {/* Period selector */}
      <select className={ic} value={activePeriod || ''} onChange={(e) => setActivePeriod(e.target.value || null)}>
        <option value="">{t.ui.pay_selectPeriod}</option>
        {periods.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
      </select>

      {/* Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {TABS.map((tb) => (
          <button key={tb.key} onClick={() => setTab(tb.key)}
            className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${tab === tb.key ? 'bg-amber-500/15 text-amber-400' : 'bg-zinc-900 text-zinc-500'}`}>
            {tb.label}
          </button>
        ))}
      </div>

      {!activePeriod && (
        <p className="text-center text-zinc-500 py-8 text-sm">{t.ui.pay_selectPeriodHint}</p>
      )}

      {/* ─── PERIODS TAB ─── */}
      {tab === 'periods' && activePeriod && (() => {
        const period = periods.find((p) => p.id === activePeriod);
        if (!period) return null;
        return (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800/50">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-bold text-white">{period.label}</h2>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[period.status]}`}>
                  {t.ui[`pay_status_${period.status}`]}
                </span>
              </div>
              <p className="text-xs text-zinc-500">{period.startDate} → {period.endDate}</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              {period.status === 'draft' && (
                <>
                  <button onClick={() => payrollStore.generatePayslips(activePeriod)}
                    className="px-4 py-2 rounded-xl bg-amber-500 text-zinc-950 font-bold text-sm active:scale-95">
                    ⚙️ {t.ui.pay_generate}
                  </button>
                  <button onClick={() => payrollStore.updatePeriodStatus(activePeriod, 'validated')}
                    className="px-4 py-2 rounded-xl bg-emerald-500/15 text-emerald-400 font-bold text-sm active:scale-95">
                    ✅ {t.ui.pay_validate}
                  </button>
                </>
              )}
              {period.status === 'validated' && (
                <button onClick={() => payrollStore.updatePeriodStatus(activePeriod, 'paid')}
                  className="px-4 py-2 rounded-xl bg-emerald-500 text-white font-bold text-sm active:scale-95">
                  💶 {t.ui.pay_markPaid}
                </button>
              )}
            </div>
            {periodSlips.length > 0 && (
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800/50">
                  <p className="text-2xl font-extrabold text-amber-400">{formatPrice(totalGross)} €</p>
                  <p className="text-xs text-zinc-500">{t.ui.pay_grossTotal}</p>
                </div>
                <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800/50">
                  <p className="text-2xl font-extrabold text-emerald-400">{formatPrice(totalNet)} €</p>
                  <p className="text-xs text-zinc-500">{t.ui.pay_netTotal}</p>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* ─── TIMESHEETS TAB ─── */}
      {tab === 'timesheets' && activePeriod && (
        <div className="space-y-2">
          {timesheets.length === 0 && <p className="text-center text-zinc-500 py-8 text-sm">{t.ui.pay_noTimesheets}</p>}
          {timesheets.map((ts) => (
            <div key={ts.employeeId} className="flex items-center justify-between p-4 rounded-xl bg-zinc-900 border border-zinc-800/50">
              <div>
                <p className="text-sm font-bold text-white">{getName(ts.employeeId)}</p>
                <p className="text-xs text-zinc-500">
                  {t.ui.pay_regular}: {ts.regularHours.toFixed(1)}h
                  {ts.overtimeHours > 0 && <span className="text-amber-400 ml-2">+ {ts.overtimeHours.toFixed(1)}h {t.ui.pay_overtime}</span>}
                </p>
              </div>
              <span className="text-lg font-extrabold text-amber-400">{ts.totalHours.toFixed(1)}h</span>
            </div>
          ))}
        </div>
      )}

      {/* ─── PAYSLIPS TAB ─── */}
      {tab === 'payslips' && activePeriod && (
        <div className="space-y-3">
          {periodSlips.length === 0 && (
            <div className="text-center py-8">
              <p className="text-zinc-500 text-sm mb-3">{t.ui.pay_noPayslips}</p>
              <button onClick={() => payrollStore.generatePayslips(activePeriod)}
                className="px-4 py-2 rounded-xl bg-amber-500 text-zinc-950 font-bold text-sm active:scale-95">
                ⚙️ {t.ui.pay_generate}
              </button>
            </div>
          )}
          {periodSlips.map((slip) => (
            <div key={slip.id} className="p-4 rounded-xl bg-zinc-900 border border-zinc-800/50 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-bold text-white">{slip.employeeName}</p>
                  <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_COLORS[slip.status]}`}>
                    {t.ui[`pay_status_${slip.status}`]}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-lg font-extrabold text-emerald-400">{formatPrice(slip.netTotal)} €</p>
                  <p className="text-[10px] text-zinc-500">{t.ui.pay_netLabel}</p>
                </div>
              </div>

              {/* Detail breakdown */}
              <div className="text-xs space-y-1 pt-2 border-t border-zinc-800">
                <div className="flex justify-between text-zinc-400">
                  <span>{t.ui.pay_regular} ({slip.regularHours.toFixed(1)}h × {formatPrice(slip.hourlyRate)} €)</span>
                  <span>{formatPrice(slip.grossRegular)} €</span>
                </div>
                {slip.overtimeHours > 0 && (
                  <div className="flex justify-between text-amber-400/80">
                    <span>{t.ui.pay_overtime} ({slip.overtimeHours.toFixed(1)}h × {formatPrice(slip.overtimeRate)} €)</span>
                    <span>{formatPrice(slip.grossOvertime)} €</span>
                  </div>
                )}
                {slip.deliveryCount != null && slip.deliveryCount > 0 && (
                  <div className="flex justify-between text-orange-400/80">
                    <span>🛵 {slip.deliveryCount} {t.ui.admin_deliveryCount} × 3,50 €</span>
                    <span>{formatPrice(slip.deliveryEarnings || 0)} €</span>
                  </div>
                )}
                <div className="flex justify-between text-zinc-300 font-medium">
                  <span>{t.ui.pay_grossTotal}</span>
                  <span>{formatPrice(slip.grossTotal)} €</span>
                </div>
                <div className="flex justify-between text-red-400/80">
                  <span>ONSS (13,07%)</span>
                  <span>- {formatPrice(slip.deductions)} €</span>
                </div>
                <div className="flex justify-between text-emerald-400 font-bold pt-1 border-t border-zinc-800">
                  <span>{t.ui.pay_netTotal}</span>
                  <span>{formatPrice(slip.netTotal)} €</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                {slip.status === 'draft' && (
                  <button onClick={() => payrollStore.validatePayslip(slip.id)}
                    className="px-3 py-1.5 rounded-lg bg-amber-500/15 text-amber-400 text-xs font-medium active:scale-95">
                    ✅ {t.ui.pay_validate}
                  </button>
                )}
                {slip.status === 'validated' && (
                  <button onClick={() => payrollStore.markPayslipPaid(slip.id)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 text-xs font-medium active:scale-95">
                    💶 {t.ui.pay_markPaid}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
