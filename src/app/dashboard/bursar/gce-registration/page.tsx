'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import {
  BanknotesIcon,
  CheckCircleIcon,
  ClipboardDocumentCheckIcon,
  ExclamationTriangleIcon,
  LockClosedIcon,
  ListBulletIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '@/components/context/AuthContext';
import { useLanguage } from '@/components/context/LanguageContext';
import { Button, Input, Select, Modal } from '@/components/ui';
import { enumLabel } from '@/lib/enumLabels';
import apiService from '@/lib/apiService';
import { sortSubClassesByLevel } from '@/lib/classOrdering';
import {
  getGceRoster,
  getGceRegistration,
  saveGceRegistrationSubjects,
  recordGceRegistrationPayment,
  getGceRegistrationPayments,
  previewGceFee,
  fmtMoney,
  PAYMENT_METHODS,
  O_LEVEL_SUBJECT_COUNT,
  A_LEVEL_MIN_SUBJECTS,
  A_LEVEL_MAX_SUBJECTS,
  type GceRosterRow,
  type GceRegistrationState,
  type GceExamLevel,
  type GcePaymentMethod,
  type GceRegistrationPayment,
} from '@/lib/gceRegistrationApi';

type ClassInfo = { id: number; name: string };
type SubClassInfo = { id: number; name: string; classId?: number };
type SubjectOption = { id: number; name: string; category: string };

const todayStr = () => new Date().toISOString().split('T')[0];

const resolveExamLevel = (className: string): GceExamLevel | null => {
  const normalized = className.trim().toUpperCase();
  if (normalized === 'FORM 5') return 'O_LEVEL';
  if (normalized.includes('UPPER SIXTH')) return 'A_LEVEL';
  return null;
};

function statusBadge(row: GceRosterRow, t: (k: string) => string) {
  if (!row.registrationId) {
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">{t('Not registered')}</span>;
  }
  if (row.balance <= 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-800">
        <CheckCircleIcon className="h-3.5 w-3.5" /> {t('Fully paid')}
      </span>
    );
  }
  if (row.amountPaid > 0) {
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-800">{t('Partially paid')}</span>;
  }
  return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-800">{t('Registered — unpaid')}</span>;
}

export default function GceRegistrationPage() {
  const { selectedAcademicYear } = useAuth();
  const { t } = useLanguage();

  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [subClasses, setSubClasses] = useState<SubClassInfo[]>([]);
  const [roster, setRoster] = useState<GceRosterRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [filterExamLevel, setFilterExamLevel] = useState<string>('all');
  const [filterClassId, setFilterClassId] = useState<string>('');
  const [filterSubClassId, setFilterSubClassId] = useState<string>('');

  // Subject picker modal
  const [subjectsRow, setSubjectsRow] = useState<GceRosterRow | null>(null);
  const [subjectOptions, setSubjectOptions] = useState<SubjectOption[]>([]);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<number[]>([]);
  const [registrationState, setRegistrationState] = useState<GceRegistrationState | null>(null);
  const [subjectsLoading, setSubjectsLoading] = useState(false);
  const [savingSubjects, setSavingSubjects] = useState(false);

  // Payment modal
  const [paymentRow, setPaymentRow] = useState<GceRosterRow | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payDate, setPayDate] = useState(todayStr());
  const [payMethod, setPayMethod] = useState<GcePaymentMethod>('CASH');
  const [payReceipt, setPayReceipt] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [isRecording, setIsRecording] = useState(false);

  // Payment history modal
  const [historyRow, setHistoryRow] = useState<GceRosterRow | null>(null);
  const [history, setHistory] = useState<GceRegistrationPayment[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const gceClasses = useMemo(() => classes.filter((c) => resolveExamLevel(c.name) !== null), [classes]);
  const gceClassIds = useMemo(() => new Set(gceClasses.map((c) => c.id)), [gceClasses]);
  const visibleSubClasses = useMemo(
    () => subClasses.filter((sc) => !filterClassId || String(sc.classId) === filterClassId),
    [subClasses, filterClassId],
  );

  const loadRoster = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getGceRoster({
        academicYearId: selectedAcademicYear?.id,
        examLevel: filterExamLevel !== 'all' ? (filterExamLevel as GceExamLevel) : undefined,
        classId: filterClassId ? Number(filterClassId) : undefined,
        subClassId: filterSubClassId ? Number(filterSubClassId) : undefined,
      });
      setRoster(data);
    } catch {
      setRoster([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedAcademicYear?.id, filterExamLevel, filterClassId, filterSubClassId]);

  useEffect(() => {
    loadRoster();
  }, [loadRoster]);

  useEffect(() => {
    apiService
      .get<{ data: ClassInfo[] }>('/classes?limit=200')
      .then((r) => setClasses(r.data || []))
      .catch(() => setClasses([]));
    apiService
      .get<{ data: SubClassInfo[] }>('/classes/sub-classes?limit=200')
      .then((r) => setSubClasses(sortSubClassesByLevel(r.data || [])))
      .catch(() => setSubClasses([]));
  }, []);

  // ---- Subject picker ----
  const openSubjects = async (row: GceRosterRow) => {
    setSubjectsRow(row);
    setSubjectOptions([]);
    setSelectedSubjectIds([]);
    setRegistrationState(null);
    if (!row.subClass) {
      toast.error(t('This student has no subclass assigned yet.'));
      return;
    }
    setSubjectsLoading(true);
    try {
      const [subjectsRes, state] = await Promise.all([
        apiService.get<{ data: SubjectOption[] }>(`/classes/sub-classes/${row.subClass.id}/subjects`),
        getGceRegistration(row.enrollmentId),
      ]);
      setSubjectOptions(subjectsRes.data || []);
      setRegistrationState(state);
      setSelectedSubjectIds((state.registration?.subjects || []).map((s) => s.subjectId));
    } catch (error: any) {
      if (error?.message !== 'Unauthorized') toast.error(error?.message || t('Failed to load subjects.'));
    } finally {
      setSubjectsLoading(false);
    }
  };

  const toggleSubject = (id: number) => {
    setSelectedSubjectIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const selectedSubjects = useMemo(
    () => subjectOptions.filter((s) => selectedSubjectIds.includes(s.id)),
    [subjectOptions, selectedSubjectIds],
  );

  const feePreview = useMemo(() => {
    if (!subjectsRow) return null;
    return previewGceFee(subjectsRow.examLevel, selectedSubjects);
  }, [subjectsRow, selectedSubjects]);

  const handleSaveSubjects = async () => {
    if (!subjectsRow) return;
    setSavingSubjects(true);
    try {
      await saveGceRegistrationSubjects(subjectsRow.enrollmentId, selectedSubjectIds);
      toast.success(t('Subjects saved.'));
      setSubjectsRow(null);
      loadRoster();
    } catch (error: any) {
      if (error?.message !== 'Unauthorized') toast.error(error?.message || t('Failed to save subjects.'));
    } finally {
      setSavingSubjects(false);
    }
  };

  // ---- Payment ----
  const openPayment = (row: GceRosterRow) => {
    setPaymentRow(row);
    setPayAmount(row.balance > 0 ? String(row.balance) : '');
    setPayDate(todayStr());
    setPayMethod('CASH');
    setPayReceipt('');
    setPayNotes('');
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentRow?.registrationId) return;
    const amountNum = Number(payAmount);
    if (!amountNum || amountNum <= 0) {
      toast.error(t('Amount must be greater than 0.'));
      return;
    }
    setIsRecording(true);
    try {
      await recordGceRegistrationPayment(paymentRow.registrationId, {
        amount: amountNum,
        paymentDate: payDate,
        paymentMethod: payMethod,
        receiptNumber: payReceipt.trim() || undefined,
        notes: payNotes.trim() || undefined,
      });
      toast.success(t('Payment recorded.'));
      setPaymentRow(null);
      loadRoster();
    } catch (error: any) {
      if (error?.message !== 'Unauthorized') toast.error(error?.message || t('Failed to record payment.'));
    } finally {
      setIsRecording(false);
    }
  };

  // ---- Payment history ----
  const openHistory = async (row: GceRosterRow) => {
    setHistoryRow(row);
    setHistory([]);
    if (!row.registrationId) return;
    setHistoryLoading(true);
    try {
      const data = await getGceRegistrationPayments(row.registrationId);
      setHistory(data);
    } catch {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const classOptions = gceClasses.map((c) => ({ value: String(c.id), label: c.name }));
  const subClassOptions = visibleSubClasses.map((sc) => ({ value: String(sc.id), label: sc.name }));

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('GCE Registration')}</h1>
          <p className="text-gray-600 mt-1">
            {t('Register FORM 5 (O Level) and UPPER SIXTH (A Level) students and collect the GCE fee.')}
            {selectedAcademicYear ? ` · ${selectedAcademicYear.name}` : ''}
          </p>
        </div>
      </div>

      {/* Fee structure reference */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h2 className="text-sm font-semibold text-gray-900 mb-2">{t('FORM 5 · O Level')}</h2>
          <p className="text-xs text-gray-500 mb-2">{t('Exactly 11 subjects required.')}</p>
          <ul className="text-sm text-gray-700 space-y-0.5">
            <li>{t('11 subjects × 1,000')} = {fmtMoney(11000)}</li>
            <li>{t('Registration')}: {fmtMoney(8000)}</li>
            <li>{t('Stamps')}: {fmtMoney(1500)}</li>
            <li>{t('Handling')}: {fmtMoney(4000)}</li>
            <li>{t('ICT practicals')}: {fmtMoney(5000)}</li>
            <li className="font-semibold pt-1 border-t border-gray-100 mt-1">{t('Total')}: {fmtMoney(29500)}</li>
          </ul>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h2 className="text-sm font-semibold text-gray-900 mb-2">{t('UPPER SIXTH · A Level')}</h2>
          <p className="text-xs text-gray-500 mb-2">{t('3 to 5 subjects.')}</p>
          <ul className="text-sm text-gray-700 space-y-0.5">
            <li>{t('Registration')}: {fmtMoney(9000)}</li>
            <li>{t('Stamps')}: {fmtMoney(1500)}</li>
            <li>{t('Handling')}: {fmtMoney(4000)}</li>
            <li>{t('Per subject')}: {fmtMoney(2000)}</li>
            <li>{t('Practical surcharge (Physics, Chemistry, Biology, ICT/Computer Science)')}: +{fmtMoney(5000)} {t('per subject')}</li>
          </ul>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex flex-wrap gap-3 items-end">
        <div className="min-w-[180px]">
          <Select
            label={t('Exam Level')}
            value={filterExamLevel}
            onChange={(e) => setFilterExamLevel(e.target.value)}
            options={[
              { value: 'all', label: t('All') },
              { value: 'O_LEVEL', label: t('O Level (FORM 5)') },
              { value: 'A_LEVEL', label: t('A Level (UPPER SIXTH)') },
            ]}
          />
        </div>
        <div className="min-w-[200px]">
          <Select
            label={t('Class')}
            value={filterClassId}
            onChange={(e) => {
              setFilterClassId(e.target.value);
              setFilterSubClassId('');
            }}
            options={[{ value: '', label: t('All GCE classes') }, ...classOptions]}
          />
        </div>
        <div className="min-w-[200px]">
          <Select
            label={t('Subclass')}
            value={filterSubClassId}
            onChange={(e) => setFilterSubClassId(e.target.value)}
            options={[{ value: '', label: t('All subclasses') }, ...subClassOptions]}
          />
        </div>
      </div>

      {/* Roster table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('Student')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('Class')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('Level')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('Subjects')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('Expected')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('Paid')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('Balance')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('Status')}</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-500">{t('Loading…')}</td>
                </tr>
              ) : roster.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-500">{t('No FORM 5 / UPPER SIXTH students found.')}</td>
                </tr>
              ) : (
                roster.map((row) => (
                  <tr key={row.enrollmentId} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900">{row.student.name}</div>
                      <div className="text-xs text-gray-500">{row.student.matricule}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {row.class.name}
                      {row.subClass && <span className="text-gray-400"> · {row.subClass.name}</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {row.examLevel === 'O_LEVEL' ? t('O Level') : t('A Level')}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {row.subjectCount} / {row.examLevel === 'O_LEVEL' ? O_LEVEL_SUBJECT_COUNT : `${A_LEVEL_MIN_SUBJECTS}-${A_LEVEL_MAX_SUBJECTS}`}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-800">{row.amountExpected ? fmtMoney(row.amountExpected) : '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-800">{fmtMoney(row.amountPaid)}</td>
                    <td className="px-4 py-3 text-sm text-gray-800">{row.registrationId ? fmtMoney(row.balance) : '—'}</td>
                    <td className="px-4 py-3">{statusBadge(row, t)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2 flex-wrap">
                        <Button
                          size="xs"
                          variant="outline"
                          leftIcon={row.isLocked ? LockClosedIcon : ClipboardDocumentCheckIcon}
                          onClick={() => openSubjects(row)}
                        >
                          {row.isLocked ? t('View Subjects') : t('Select Subjects')}
                        </Button>
                        <Button
                          size="xs"
                          color="primary"
                          leftIcon={BanknotesIcon}
                          onClick={() => openPayment(row)}
                          disabled={!row.registrationId || row.balance <= 0}
                        >
                          {t('Pay')}
                        </Button>
                        <Button size="xs" variant="outline" leftIcon={ListBulletIcon} onClick={() => openHistory(row)} disabled={!row.registrationId}>
                          {t('Payments')}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="md:hidden divide-y divide-gray-100">
          {isLoading ? (
            <div className="px-4 py-8 text-center text-gray-500">{t('Loading…')}</div>
          ) : roster.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500">{t('No FORM 5 / UPPER SIXTH students found.')}</div>
          ) : (
            roster.map((row) => (
              <div key={row.enrollmentId} className="p-4 space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold text-gray-900">{row.student.name}</div>
                    <div className="text-xs text-gray-500">{row.student.matricule} · {row.class.name}{row.subClass ? ` · ${row.subClass.name}` : ''}</div>
                  </div>
                  {statusBadge(row, t)}
                </div>
                <div className="flex items-start justify-between gap-3">
                  <span className="text-xs text-gray-500">{t('Subjects')}</span>
                  <span className="text-sm text-gray-900">{row.subjectCount} / {row.examLevel === 'O_LEVEL' ? O_LEVEL_SUBJECT_COUNT : `${A_LEVEL_MIN_SUBJECTS}-${A_LEVEL_MAX_SUBJECTS}`}</span>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <span className="text-xs text-gray-500">{t('Expected / Paid / Balance')}</span>
                  <span className="text-sm text-gray-900 text-right">{fmtMoney(row.amountExpected)} / {fmtMoney(row.amountPaid)} / {row.registrationId ? fmtMoney(row.balance) : '—'}</span>
                </div>
                <div className="flex flex-wrap gap-2 pt-1.5">
                  <Button size="xs" variant="outline" leftIcon={row.isLocked ? LockClosedIcon : ClipboardDocumentCheckIcon} onClick={() => openSubjects(row)}>
                    {row.isLocked ? t('View Subjects') : t('Select Subjects')}
                  </Button>
                  <Button size="xs" color="primary" leftIcon={BanknotesIcon} onClick={() => openPayment(row)} disabled={!row.registrationId || row.balance <= 0}>
                    {t('Pay')}
                  </Button>
                  <Button size="xs" variant="outline" leftIcon={ListBulletIcon} onClick={() => openHistory(row)} disabled={!row.registrationId}>
                    {t('Payments')}
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Subject picker modal */}
      <Modal
        isOpen={!!subjectsRow}
        onClose={() => setSubjectsRow(null)}
        title={`${t('GCE Subjects')} · ${subjectsRow?.student.name ?? ''}`}
        size="lg"
      >
        {subjectsRow && (
          <div className="space-y-4">
            {subjectsLoading ? (
              <p className="text-sm text-gray-500">{t('Loading subjects…')}</p>
            ) : (
              <>
                {registrationState?.isLocked && (
                  <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 flex items-start gap-2">
                    <LockClosedIcon className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-900">
                      {t('A payment has already been recorded, so the subject list is locked.')}
                    </p>
                  </div>
                )}
                <p className="text-sm text-gray-600">
                  {subjectsRow.examLevel === 'O_LEVEL'
                    ? t(`Select exactly ${O_LEVEL_SUBJECT_COUNT} subjects.`)
                    : t(`Select between ${A_LEVEL_MIN_SUBJECTS} and ${A_LEVEL_MAX_SUBJECTS} subjects. Physics, Chemistry, Biology and ICT/Computer Science carry a practical surcharge.`)}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 max-h-72 overflow-y-auto border border-gray-100 rounded-lg p-3">
                  {subjectOptions.map((s) => (
                    <label key={s.id} className="flex items-center gap-2 text-sm text-gray-700 py-0.5">
                      <input
                        type="checkbox"
                        checked={selectedSubjectIds.includes(s.id)}
                        disabled={!!registrationState?.isLocked}
                        onChange={() => toggleSubject(s.id)}
                      />
                      {s.name}
                      {subjectsRow.examLevel === 'A_LEVEL' && selectedSubjectIds.includes(s.id) && previewGceFee('A_LEVEL', [s]).practicalSubjectCount > 0 && (
                        <span className="text-xs text-amber-700">({t('practical')})</span>
                      )}
                    </label>
                  ))}
                </div>

                {feePreview && (
                  <div className="rounded-lg bg-gray-50 p-3 text-sm flex items-center justify-between">
                    <span className="text-gray-600">
                      {selectedSubjectIds.length} {t('subject(s) selected')}
                      {!feePreview.isValidCount && (
                        <span className="text-red-600 ml-2">
                          <ExclamationTriangleIcon className="h-4 w-4 inline -mt-0.5" /> {t('Invalid count for this level')}
                        </span>
                      )}
                    </span>
                    <span className="font-semibold text-gray-900">{t('Fee')}: {fmtMoney(feePreview.amountExpected)}</span>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
                  <Button type="button" variant="outline" onClick={() => setSubjectsRow(null)} disabled={savingSubjects}>
                    {t('Cancel')}
                  </Button>
                  {!registrationState?.isLocked && (
                    <Button
                      type="button"
                      color="primary"
                      isLoading={savingSubjects}
                      disabled={!feePreview?.isValidCount}
                      onClick={handleSaveSubjects}
                    >
                      {t('Save Subjects')}
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </Modal>

      {/* Payment modal */}
      <Modal isOpen={!!paymentRow} onClose={() => setPaymentRow(null)} title={`${t('Record Payment')} · ${paymentRow?.student.name ?? ''}`} size="lg">
        {paymentRow && (
          <form onSubmit={handleRecordPayment} className="space-y-4">
            <div className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
              {t('Expected')}: <span className="font-medium">{fmtMoney(paymentRow.amountExpected)}</span> ·{' '}
              {t('Paid')}: <span className="font-medium">{fmtMoney(paymentRow.amountPaid)}</span> ·{' '}
              {t('Balance')}: <span className="font-medium">{fmtMoney(paymentRow.balance)}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label={t('Amount (XAF) *')} type="number" min={1} value={payAmount} onChange={(e) => setPayAmount(e.target.value)} required />
              <Input label={t('Payment Date *')} type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} required />
              <Select label={t('Method *')} value={payMethod} onChange={(e) => setPayMethod(e.target.value as GcePaymentMethod)} options={PAYMENT_METHODS} />
              <Input label={t('Receipt Number')} value={payReceipt} onChange={(e) => setPayReceipt(e.target.value)} />
            </div>
            <Input label={t('Notes')} value={payNotes} onChange={(e) => setPayNotes(e.target.value)} />
            <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
              <Button type="button" variant="outline" onClick={() => setPaymentRow(null)} disabled={isRecording}>
                {t('Cancel')}
              </Button>
              <Button type="submit" color="primary" isLoading={isRecording}>
                {t('Record Payment')}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Payment history modal */}
      <Modal isOpen={!!historyRow} onClose={() => setHistoryRow(null)} title={`${t('Payment History')} · ${historyRow?.student.name ?? ''}`} size="lg">
        {historyLoading ? (
          <p className="text-sm text-gray-500">{t('Loading…')}</p>
        ) : history.length === 0 ? (
          <p className="text-sm text-gray-500">{t('No payments recorded yet.')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-gray-400">
                  <th className="py-2 pr-4">{t('Date')}</th>
                  <th className="py-2 pr-4">{t('Amount')}</th>
                  <th className="py-2 pr-4">{t('Method')}</th>
                  <th className="py-2 pr-4">{t('Receipt')}</th>
                  <th className="py-2 pr-4">{t('Recorded By')}</th>
                </tr>
              </thead>
              <tbody>
                {history.map((p) => (
                  <tr key={p.id} className="border-t border-gray-100">
                    <td className="py-2 pr-4 text-gray-600">{p.paymentDate?.split('T')[0]}</td>
                    <td className="py-2 pr-4 text-gray-800">{fmtMoney(p.amount)}</td>
                    <td className="py-2 pr-4 text-gray-600">{enumLabel(p.paymentMethod)}</td>
                    <td className="py-2 pr-4 text-gray-600">{p.receiptNumber || '—'}</td>
                    <td className="py-2 pr-4 text-gray-600">{p.recordedBy?.name || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Modal>
    </div>
  );
}
