'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from '@/components/context/AuthContext';
import { useLanguage } from '@/components/context/LanguageContext';
import { apiService } from '@/lib/apiService';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  ChartBarIcon,
  ArrowDownTrayIcon,
  CalendarDaysIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

// Super Manager "Statistics" report -- a date-ranged (weekly by default)
// school-wide snapshot: discipline (with individual offence rows, not just
// counts), teaching hours vs pay, per-subclass syllabus coverage, and
// per-subclass fee collection. PDF export shares the same letterhead as the
// timetable export (see statisticsReportService.ts on the backend).

type RangeMode = 'daily' | 'weekly' | 'monthly';

interface OffenceRow {
  studentId: number;
  studentName: string;
  matricule: string | null;
  className: string;
  subClassName: string;
  date: string;
}
interface SanctionRow extends OffenceRow {
  actionType: string;
  reason: string | null;
  status: string;
}
interface DisciplinePoiRow {
  studentId: number;
  studentName: string;
  matricule: string | null;
  className: string;
  subClassName: string;
  classAbsences: number;
  lateness: number;
  sanctions: number;
  totalOffences: number;
}
interface TeachingRow {
  teacherId: number;
  name: string;
  matricule: string | null;
  expectedHours: number;
  hoursTaught: number;
  hoursNotTaught: number;
  hourRate: number;
  socials: number;
  total: number;
}
interface CoverageRow {
  subClassId: number;
  subClassName: string;
  className: string;
  totalLessons: number;
  completedLessons: number;
  coveragePercent: number;
}
interface FinancialRow {
  subClassId: number;
  subClassName: string;
  className: string;
  studentsOwing: number;
  collectedThisRange: number;
  totalCollected: number;
  outstandingInstallment1: number;
  percentCollected: number;
}
interface FinancialPoiRow {
  studentId: number;
  studentName: string;
  matricule: string | null;
  className: string;
  subClassName: string;
  outstandingAmount: number;
}
interface StatisticsReportData {
  range: { from: string; to: string };
  academicYear: { id: number; name: string } | null;
  discipline: {
    lateness: OffenceRow[];
    absences: OffenceRow[];
    sanctions: SanctionRow[];
    personsOfInterest: DisciplinePoiRow[];
  };
  teaching: TeachingRow[];
  workCoverage: CoverageRow[];
  financial: { subClasses: FinancialRow[]; personsOfInterest: FinancialPoiRow[] };
  generatedAt: string;
}

const toISO = (d: Date) => d.toISOString().slice(0, 10);
const todayISO = () => toISO(new Date());

function mondayOfWeek(d: Date): Date {
  const copy = new Date(d);
  const day = copy.getDay(); // 0 = Sunday
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  return copy;
}

function monthBounds(monthStr: string): { from: string; to: string } {
  const [y, m] = monthStr.split('-').map(Number);
  if (!y || !m) return { from: todayISO(), to: todayISO() };
  const from = new Date(y, m - 1, 1);
  const to = new Date(y, m, 0);
  return { from: toISO(from), to: toISO(to) };
}

function currentMonthStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function fmtMoney(n: number): string {
  return `FCFA ${n.toLocaleString()}`;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="p-4">
      <h2 className="text-base font-bold text-gray-900 mb-3">{title}</h2>
      {children}
    </Card>
  );
}

function SubSection({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <div className="mb-5 last:mb-0">
      <h3 className="text-sm font-semibold text-gray-700 mb-1.5 border-b border-gray-200 pb-1">
        {title} <span className="text-gray-400 font-normal">({count})</span>
      </h3>
      {children}
    </div>
  );
}

function DataTable({ headers, rows, empty }: { headers: string[]; rows: React.ReactNode[][]; empty: string }) {
  if (rows.length === 0) {
    return <p className="text-sm text-gray-400 italic py-2">{empty}</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-xs">
        <thead className="text-[11px] uppercase text-gray-500 bg-gray-50 border-b">
          <tr>
            {headers.map((h) => (
              <th key={h} className="text-left py-1.5 px-2 whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b last:border-none hover:bg-gray-50">
              {row.map((cell, j) => (
                <td key={j} className="py-1.5 px-2 whitespace-nowrap">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function StatisticsPage() {
  const { selectedAcademicYear } = useAuth();
  const { t } = useLanguage();

  const [rangeMode, setRangeMode] = useState<RangeMode>('weekly');
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [weekFrom, setWeekFrom] = useState(toISO(mondayOfWeek(new Date())));
  const [weekTo, setWeekTo] = useState(todayISO());
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr());

  const { from, to } = useMemo(() => {
    if (rangeMode === 'daily') return { from: selectedDate, to: selectedDate };
    if (rangeMode === 'monthly') return monthBounds(selectedMonth);
    return { from: weekFrom, to: weekTo };
  }, [rangeMode, selectedDate, weekFrom, weekTo, selectedMonth]);

  const [data, setData] = useState<StatisticsReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    params.set('from', from);
    params.set('to', to);
    if (selectedAcademicYear?.id) params.set('academicYearId', String(selectedAcademicYear.id));
    apiService
      .get<{ success: boolean; data: StatisticsReportData }>(`/super-manager/overview/statistics-report?${params.toString()}`)
      .then((res) => {
        if (cancelled) return;
        setData(res.data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load statistics report');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [from, to, selectedAcademicYear?.id]);

  const downloadPdf = async () => {
    setDownloading(true);
    try {
      const params = new URLSearchParams();
      params.set('from', from);
      params.set('to', to);
      if (selectedAcademicYear?.id) params.set('academicYearId', String(selectedAcademicYear.id));
      const blob = await apiService.get<Blob>(
        `/super-manager/overview/statistics-report/pdf?${params.toString()}`,
        {},
        'blob'
      );
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `statistics-report-${from}-to-${to}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to download PDF');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-5 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ChartBarIcon className="w-6 h-6" />
            {t('Statistics')}
          </h1>
          <p className="text-sm text-gray-600 mt-0.5">
            {t('School-wide discipline, teaching, work-coverage and financial snapshot for the selected range.')}
            {data ? ` · ${data.range.from} → ${data.range.to}` : ''}
          </p>
        </div>
        <Button onClick={downloadPdf} disabled={downloading || loading} leftIcon={ArrowDownTrayIcon}>
          {downloading ? t('Preparing…') : t('Download PDF')}
        </Button>
      </div>

      <Card className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <CalendarDaysIcon className="w-4 h-4 text-gray-500" />
          <div className="inline-flex rounded-md border border-gray-300 overflow-hidden text-sm">
            {(['daily', 'weekly', 'monthly'] as RangeMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setRangeMode(mode)}
                className={`px-3 py-1.5 capitalize ${rangeMode === mode
                  ? 'bg-gray-800 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
              >
                {t(mode === 'daily' ? 'Daily' : mode === 'weekly' ? 'Weekly' : 'Monthly')}
              </button>
            ))}
          </div>
        </div>

        {rangeMode === 'daily' && (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">{t('Day')}</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="border border-gray-300 rounded-md px-2 py-1.5 text-sm"
            />
          </div>
        )}
        {rangeMode === 'weekly' && (
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{t('From')}</label>
              <input
                type="date"
                value={weekFrom}
                onChange={(e) => setWeekFrom(e.target.value)}
                className="border border-gray-300 rounded-md px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{t('To')}</label>
              <input
                type="date"
                value={weekTo}
                onChange={(e) => setWeekTo(e.target.value)}
                className="border border-gray-300 rounded-md px-2 py-1.5 text-sm"
              />
            </div>
          </div>
        )}
        {rangeMode === 'monthly' && (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">{t('Month')}</label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="border border-gray-300 rounded-md px-2 py-1.5 text-sm"
            />
          </div>
        )}
      </Card>

      {error && (
        <Card className="p-4 bg-red-50 border-red-200 text-red-800 text-sm flex items-center gap-2">
          <ExclamationTriangleIcon className="w-4 h-4 flex-shrink-0" />
          {error}
        </Card>
      )}

      {loading ? (
        <Card className="p-6 text-center text-sm text-gray-500">{t('Loading…')}</Card>
      ) : !data ? null : (
        <>
          <Section title={t('Discipline Overview')}>
            <SubSection title={t('Lateness')} count={data.discipline.lateness.length}>
              <DataTable
                headers={[t('Student'), t('Matricule'), t('Class'), t('Date')]}
                rows={data.discipline.lateness.map((r) => [
                  r.studentName, r.matricule ?? '—', `${r.className} · ${r.subClassName}`, r.date,
                ])}
                empty={t('No lateness recorded in this range.')}
              />
            </SubSection>
            <SubSection title={t('Class Absences')} count={data.discipline.absences.length}>
              <DataTable
                headers={[t('Student'), t('Matricule'), t('Class'), t('Date')]}
                rows={data.discipline.absences.map((r) => [
                  r.studentName, r.matricule ?? '—', `${r.className} · ${r.subClassName}`, r.date,
                ])}
                empty={t('No class absences recorded in this range.')}
              />
            </SubSection>
            <SubSection title={t('Sanctions')} count={data.discipline.sanctions.length}>
              <DataTable
                headers={[t('Student'), t('Matricule'), t('Class'), t('Offence'), t('Reason'), t('Status'), t('Date')]}
                rows={data.discipline.sanctions.map((r) => [
                  r.studentName, r.matricule ?? '—', `${r.className} · ${r.subClassName}`,
                  r.actionType, r.reason ?? '—', r.status, r.date,
                ])}
                empty={t('No sanctions recorded in this range.')}
              />
            </SubSection>
            <SubSection title={t('Students of Interest')} count={data.discipline.personsOfInterest.length}>
              <DataTable
                headers={[t('Student'), t('Matricule'), t('Class'), t('Absences'), t('Lateness'), t('Sanctions'), t('Total')]}
                rows={data.discipline.personsOfInterest.map((r) => [
                  r.studentName, r.matricule ?? '—', `${r.className} · ${r.subClassName}`,
                  String(r.classAbsences), String(r.lateness), String(r.sanctions),
                  <span key="total" className="font-semibold text-gray-900">{r.totalOffences}</span>,
                ])}
                empty={t('No students crossed the offence threshold in this range.')}
              />
            </SubSection>
          </Section>

          <Section title={t('Teaching Statistics')}>
            <h3 className="text-sm font-semibold text-gray-700 mb-1.5 border-b border-gray-200 pb-1">
              {t('Hours Taught')}
            </h3>
            <DataTable
              headers={[t('Name'), t('Expected Hrs'), t('Hrs Taught'), t('Hrs Not Taught'), t('Hour Rate'), t('Socials'), t('Total')]}
              rows={data.teaching.map((row) => [
                row.name,
                row.expectedHours.toFixed(1),
                row.hoursTaught.toFixed(1),
                row.hoursNotTaught.toFixed(1),
                fmtMoney(row.hourRate),
                fmtMoney(row.socials),
                <span key="total" className="font-semibold text-gray-900">{fmtMoney(row.total)}</span>,
              ])}
              empty={t('No teaching data for this range.')}
            />
          </Section>

          <Section title={t('Work Coverage')}>
            <DataTable
              headers={[t('Class'), t('Sub Class'), t('% Coverage')]}
              rows={data.workCoverage.map((c) => [
                c.className, c.subClassName,
                <span key="pct" className="font-semibold text-gray-900">{c.coveragePercent}%</span>,
              ])}
              empty={t('No scheme-of-work data available.')}
            />
          </Section>

          <Section title={t('Financial')}>
            <DataTable
              headers={[t('Sub Class'), t('Students Owing'), t('Collected This Range'), t('Total Collected'), t('1st Installment Outstanding'), t('% Collected')]}
              rows={data.financial.subClasses.map((f) => [
                `${f.className} · ${f.subClassName}`,
                String(f.studentsOwing),
                fmtMoney(f.collectedThisRange),
                fmtMoney(f.totalCollected),
                fmtMoney(f.outstandingInstallment1),
                <span key="pct" className="font-semibold text-gray-900">{f.percentCollected}%</span>,
              ])}
              empty={t('No financial data for this range.')}
            />
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-1.5 border-b border-gray-200 pb-1">
                {t('Students of Interest')} — {t('Top')} {data.financial.personsOfInterest.length} {t('Owing')}
              </h3>
              <DataTable
                headers={['#', t('Student'), t('Matricule'), t('Class'), t('Outstanding')]}
                rows={data.financial.personsOfInterest.map((p, i) => [
                  String(i + 1), p.studentName, p.matricule ?? '—', `${p.className} · ${p.subClassName}`,
                  <span key="amt" className="font-semibold text-red-700">{fmtMoney(p.outstandingAmount)}</span>,
                ])}
                empty={t('No students owing fees.')}
              />
            </div>
          </Section>
        </>
      )}
    </div>
  );
}
