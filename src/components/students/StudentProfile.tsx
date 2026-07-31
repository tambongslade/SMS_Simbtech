'use client';

import { useEffect, useState, useCallback } from 'react';
import { sortClassesByLevel } from '@/lib/classOrdering';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import {
  ArrowLeftIcon,
  ArrowsRightLeftIcon,
  UserGroupIcon,
  AcademicCapIcon,
  ClipboardDocumentListIcon,
  CurrencyDollarIcon,
  CalendarDaysIcon,
  ExclamationTriangleIcon,
  ReceiptRefundIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '@/components/context/AuthContext';
import { Button, Select, Modal, StudentPhoto } from '@/components/ui';
import apiService from '@/lib/apiService';
import { getStudentFeeStatus, type StudentFeeStatus } from '@/lib/feeStatusApi';
import { listRefunds, type Refund } from '@/lib/refundsApi';

type ClassInfo = { id: number; name: string };
type SubClassInfo = { id: number; name: string; classId?: number };

// ---- Self-contained API helpers (shared across dashboards) ----
const fetchStudentProfile = async (id: number, academicYearId?: number): Promise<any> => {
  const qs = academicYearId ? `?academicYearId=${academicYearId}` : '';
  const res = await apiService.get<{ data: any }>(`/students/${id}/full-profile${qs}`);
  return res.data;
};
const fetchClasses = async (): Promise<ClassInfo[]> => {
  const res = await apiService.get<{ data: ClassInfo[] }>(`/classes?limit=100`);
  return res.data || [];
};
const fetchSubClasses = async (): Promise<SubClassInfo[]> => {
  const res = await apiService.get<{ data: SubClassInfo[] }>(`/classes/sub-classes?limit=100`);
  return res.data || [];
};
const changeStudentClass = async (
  id: number,
  opts: { classId?: number; subClassId?: number; academicYearId?: number },
) => {
  if (opts.subClassId) {
    return apiService.post(`/students/${id}/enroll`, {
      subClassId: opts.subClassId,
      ...(opts.academicYearId ? { academicYearId: opts.academicYearId } : {}),
    });
  }
  if (opts.classId) {
    return apiService.post(`/students/${id}/assign-class`, {
      classId: opts.classId,
      ...(opts.academicYearId ? { academicYearId: opts.academicYearId } : {}),
    });
  }
  throw new Error('Select a class or subclass.');
};

// ---- Defensive accessors — the full-profile payload uses snake_case nesting ----
const ay = (e: any) => e?.academic_year ?? e?.academicYear;
const cls = (e: any) => e?.class ?? e?.subClass?.class ?? e?.sub_class?.class;
const sub = (e: any) => e?.sub_class ?? e?.subClass;
const seqAverages = (e: any): any[] => e?.student_sequence_averages ?? e?.studentSequenceAverages ?? [];
const seqLabel = (a: any) => {
  const s = a?.exam_sequence ?? a?.examSequence ?? {};
  return s.name ?? `Sequence ${s.sequence_number ?? s.sequenceNumber ?? ''}`.trim();
};
const seqTerm = (a: any) => {
  const s = a?.exam_sequence ?? a?.examSequence ?? {};
  return s?.term?.name ?? s?.term_name ?? null;
};
const seqAvg = (a: any) => a?.average ?? a?.average_mark ?? a?.averageMark;
const seqRank = (a: any) => a?.rank ?? a?.position;
const enrollmentPhoto = (e: any) => e?.photo_url ?? e?.photoUrl ?? e?.photo;

const num = (v: any) => (v == null || isNaN(Number(v)) ? null : Number(v));
const fmtMoney = (v: any) => {
  const n = num(v);
  return n == null ? '—' : n.toLocaleString(undefined, { maximumFractionDigits: 0 });
};
const feeExpected = (f: any) =>
  num(f?.amount_expected ?? f?.amountExpected ?? f?.expected_amount ?? f?.expectedAmount ?? f?.amount);
const feePaidField = (f: any) => num(f?.amount_paid ?? f?.amountPaid ?? f?.paid_amount ?? f?.paidAmount);
const feeTransactions = (f: any): any[] => f?.payment_transactions ?? f?.paymentTransactions ?? [];
const txAmount = (t: any) => t?.amount ?? t?.amount_paid ?? t?.amountPaid;
const txDate = (t: any) => t?.payment_date ?? t?.paymentDate ?? t?.created_at ?? t?.createdAt;
const txMethod = (t: any) => t?.payment_method ?? t?.paymentMethod ?? t?.method;
const txRef = (t: any) => t?.receipt_number ?? t?.receiptNumber ?? t?.reference ?? t?.id;
const personLabel = (p: any) =>
  p ? `${p.name ?? 'Unknown'}${p.matricule ? ` (${p.matricule})` : ''}` : '—';
const humanize = (k: string) => k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export default function StudentProfile({
  studentId,
  backHref,
}: {
  studentId: number;
  backHref: string;
}) {
  const router = useRouter();
  const { selectedAcademicYear } = useAuth();

  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [subClasses, setSubClasses] = useState<SubClassInfo[]>([]);
  const [feeStatus, setFeeStatus] = useState<StudentFeeStatus | null>(null);
  const [refunds, setRefunds] = useState<Refund[]>([]);

  const [isChangeOpen, setIsChangeOpen] = useState(false);
  const [changeClassId, setChangeClassId] = useState('');
  const [changeSubClassId, setChangeSubClassId] = useState('');
  const [isChanging, setIsChanging] = useState(false);

  const loadProfile = useCallback(async () => {
    if (!studentId) return;
    setIsLoading(true);
    setNotFound(false);
    try {
      const data = await fetchStudentProfile(studentId, selectedAcademicYear?.id);
      setProfile(data);
    } catch {
      setNotFound(true);
    } finally {
      setIsLoading(false);
    }
  }, [studentId, selectedAcademicYear?.id]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    fetchClasses().then((c) => setClasses(sortClassesByLevel(c))).catch(() => setClasses([]));
    fetchSubClasses().then(setSubClasses).catch(() => setSubClasses([]));
  }, []);

  // Authoritative school-fee status (drives the report-card readiness badge).
  useEffect(() => {
    if (!studentId) return;
    let active = true;
    getStudentFeeStatus(studentId, selectedAcademicYear?.id)
      .then((s) => active && setFeeStatus(s))
      .catch(() => active && setFeeStatus(null));
    return () => {
      active = false;
    };
  }, [studentId, selectedAcademicYear?.id]);

  // Refund history (audit trail).
  useEffect(() => {
    if (!studentId) return;
    let active = true;
    listRefunds({ studentId, academicYearId: selectedAcademicYear?.id, limit: 100 })
      .then((res) => active && setRefunds(res.data))
      .catch(() => active && setRefunds([]));
    return () => {
      active = false;
    };
  }, [studentId, selectedAcademicYear?.id]);

  const enrollments: any[] = profile?.enrollments ?? [];
  const currentEnrollment =
    profile?.current_enrollment ??
    profile?.currentEnrollment ??
    enrollments.find((e) => String(ay(e)?.id ?? e?.academicYearId) === String(selectedAcademicYear?.id)) ??
    enrollments[enrollments.length - 1];

  const firstYear = profile?.first_enrollment_year ?? profile?.firstEnrollmentYear;
  const interviewMarks = profile?.interview_marks ?? profile?.interviewMarks;
  const parents: any[] = Array.isArray(profile?.parents) ? profile.parents : [];
  const fees: any[] = Array.isArray(profile?.fees) ? profile.fees : [];
  const discipline: any[] = Array.isArray(profile?.discipline) ? profile.discipline : [];
  const attendance = profile?.attendance_summary ?? profile?.attendanceSummary;
  const marksCount = profile?.marks_count ?? profile?.marksCount;

  const allTransactions = fees.flatMap((f) => feeTransactions(f));
  const totalExpected = fees.reduce((s, f) => s + (feeExpected(f) ?? 0), 0);
  const totalPaid =
    allTransactions.reduce((s, t) => s + (num(txAmount(t)) ?? 0), 0) ||
    fees.reduce((s, f) => s + (feePaidField(f) ?? 0), 0);
  const balance = totalExpected - totalPaid;
  const attRate = num(attendance?.rate ?? attendance?.attendance_rate ?? attendance?.attendanceRate);

  const subClassesForClass = (classIdStr: string) =>
    classIdStr ? subClasses.filter((sc) => String(sc.classId) === classIdStr) : [];

  const openChange = () => {
    const c = cls(currentEnrollment);
    const s = sub(currentEnrollment);
    setChangeClassId(c?.id ? String(c.id) : currentEnrollment?.classId ? String(currentEnrollment.classId) : '');
    setChangeSubClassId(s?.id ? String(s.id) : '');
    setIsChangeOpen(true);
  };

  const handleChangeClass = async () => {
    if (!changeClassId && !changeSubClassId) {
      toast.error('Select a class or subclass.');
      return;
    }
    setIsChanging(true);
    try {
      await changeStudentClass(studentId, {
        classId: changeClassId ? Number(changeClassId) : undefined,
        subClassId: changeSubClassId ? Number(changeSubClassId) : undefined,
        academicYearId: selectedAcademicYear?.id,
      });
      toast.success('Class updated.');
      setIsChangeOpen(false);
      loadProfile();
    } catch (error: any) {
      if (error?.message !== 'Unauthorized') {
        toast.error(error?.message || 'Failed to change class.');
      }
    } finally {
      setIsChanging(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center text-gray-500">
          Loading profile…
        </div>
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="max-w-5xl mx-auto space-y-4">
        <Button variant="outline" leftIcon={ArrowLeftIcon} onClick={() => router.push(backHref)}>
          Back to Students
        </Button>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center text-gray-500">
          Could not load this student&apos;s profile.
        </div>
      </div>
    );
  }

  const dob = (profile.dateOfBirth ?? profile.date_of_birth)?.split?.('T')?.[0];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Button variant="outline" leftIcon={ArrowLeftIcon} onClick={() => router.push(backHref)}>
          Back to Students
        </Button>
        <Button color="secondary" variant="outline" leftIcon={ArrowsRightLeftIcon} onClick={openChange}>
          Change Class
        </Button>
      </div>

      {/* Header card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row gap-6">
          <StudentPhoto
            studentId={studentId}
            photo={enrollmentPhoto(currentEnrollment)}
            size="xl"
            showUploadButton
            canUpload
            fetchPhoto
            studentName={profile.name}
            onPhotoUpdate={() => loadProfile()}
          />
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{profile.name}</h1>
              {profile.status && (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {profile.status}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-0.5">{profile.matricule || 'No matricule'}</p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3 mt-4 text-sm">
              <Field label="Gender" value={profile.gender} />
              <Field label="Date of Birth" value={dob} />
              <Field label="Place of Birth" value={profile.placeOfBirth ?? profile.place_of_birth} />
              <Field label="Residence" value={profile.residence} />
              <Field label="Former School" value={profile.formerSchool ?? profile.former_school} />
              <Field label="New Student" value={(profile.isNewStudent ?? profile.is_new_student) ? 'Yes' : 'No'} />
              <Field label="First Enrolled" value={firstYear?.name} />
            </div>
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatBox label="Marks Recorded" value={marksCount != null ? String(marksCount) : '—'} />
        <StatBox label="Attendance Rate" value={attRate != null ? `${attRate.toFixed(0)}%` : '—'} />
        <StatBox
          label="Fees Balance"
          value={
            feeStatus?.hasFeesRecord
              ? fmtMoney(feeStatus.shortfall)
              : fees.length
                ? fmtMoney(balance)
                : '—'
          }
          tone={
            feeStatus?.hasFeesRecord
              ? feeStatus.shortfall > 0
                ? 'danger'
                : 'success'
              : 'default'
          }
        />
        <StatBox label="Discipline Records" value={String(discipline.length)} />
      </div>

      {/* Current enrollment */}
      <Section title="Current Enrollment" icon={AcademicCapIcon}>
        {currentEnrollment ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-3 text-sm">
            <Field label="Academic Year" value={ay(currentEnrollment)?.name ?? selectedAcademicYear?.name} />
            <Field label="Class" value={cls(currentEnrollment)?.name} />
            <Field label="Subclass" value={sub(currentEnrollment)?.name} />
            <Field label="Repeater" value={currentEnrollment.repeater ? 'Yes' : 'No'} />
          </div>
        ) : (
          <p className="text-sm text-gray-500">Not enrolled for the current year.</p>
        )}
      </Section>

      {/* Attendance summary */}
      {attendance && (
        <Section title="Attendance Summary" icon={CalendarDaysIcon}>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-6 gap-y-3 text-sm">
            {Object.entries(attendance)
              .filter(([, v]) => v == null || typeof v !== 'object')
              .map(([k, v]) => (
                <Field
                  key={k}
                  label={humanize(k)}
                  value={v == null ? '—' : /rate/i.test(k) ? `${Number(v).toFixed(0)}%` : String(v)}
                />
              ))}
          </div>
        </Section>
      )}

      {/* Fees */}
      <Section title="School Fees" icon={CurrencyDollarIcon} badge={<FeeStatusBadge status={feeStatus} />}>
        {fees.length > 0 ? (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <StatBox label="Expected" value={fmtMoney(totalExpected)} />
              <StatBox label="Paid" value={fmtMoney(totalPaid)} />
              <StatBox label="Balance" value={fmtMoney(balance)} tone={balance > 0 ? 'danger' : 'success'} />
            </div>
            {allTransactions.length > 0 && (
              <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase text-gray-400">
                      <th className="py-1 pr-4">Date</th>
                      <th className="py-1 pr-4">Amount</th>
                      <th className="py-1 pr-4">Method</th>
                      <th className="py-1 pr-4">Reference</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allTransactions.map((t, i) => (
                      <tr key={i} className="border-t border-gray-100">
                        <td className="py-1.5 pr-4 text-gray-600">{txDate(t)?.split?.('T')?.[0] || '—'}</td>
                        <td className="py-1.5 pr-4 text-gray-800">{fmtMoney(txAmount(t))}</td>
                        <td className="py-1.5 pr-4 text-gray-600">{txMethod(t) || '—'}</td>
                        <td className="py-1.5 pr-4 text-gray-600">{txRef(t) ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {allTransactions.length > 0 && (
              <div className="md:hidden divide-y divide-gray-100">
                {allTransactions.map((t, i) => (
                  <div key={i} className="p-4 space-y-1.5">
                    <div className="text-sm font-semibold text-gray-900 break-words">
                      {txDate(t)?.split?.('T')?.[0] || '—'}
                    </div>
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-xs text-gray-500">Amount</span>
                      <span className="text-sm text-gray-900 text-right break-words">{fmtMoney(txAmount(t))}</span>
                    </div>
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-xs text-gray-500">Method</span>
                      <span className="text-sm text-gray-900 text-right break-words">{txMethod(t) || '—'}</span>
                    </div>
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-xs text-gray-500">Reference</span>
                      <span className="text-sm text-gray-900 text-right break-words">{txRef(t) ?? '—'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No fees recorded.</p>
        )}
      </Section>

      {/* Refunds */}
      {refunds.length > 0 && (
        <Section title="Refunds" icon={ReceiptRefundIcon}>
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-gray-400">
                  <th className="py-1 pr-4">Date</th>
                  <th className="py-1 pr-4">Amount</th>
                  <th className="py-1 pr-4">Method</th>
                  <th className="py-1 pr-4">Reason</th>
                  <th className="py-1 pr-4">Recorded By</th>
                </tr>
              </thead>
              <tbody>
                {refunds.map((r) => (
                  <tr key={r.id} className="border-t border-gray-100">
                    <td className="py-1.5 pr-4 text-gray-600">{r.refundDate?.split('T')[0]}</td>
                    <td className="py-1.5 pr-4 text-gray-800">{fmtMoney(r.amount)}</td>
                    <td className="py-1.5 pr-4 text-gray-600">{String(r.refundMethod).replace(/_/g, ' ')}</td>
                    <td className="py-1.5 pr-4 text-gray-700">
                      {r.reason}
                      {r.notes ? <span className="text-gray-400"> · {r.notes}</span> : null}
                    </td>
                    <td className="py-1.5 pr-4 text-gray-600">{r.recordedBy?.name || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="md:hidden divide-y divide-gray-100">
            {refunds.map((r) => (
              <div key={r.id} className="p-4 space-y-1.5">
                <div className="text-sm font-semibold text-gray-900 break-words">{r.refundDate?.split('T')[0]}</div>
                <div className="flex items-start justify-between gap-3">
                  <span className="text-xs text-gray-500">Amount</span>
                  <span className="text-sm text-gray-900 text-right break-words">{fmtMoney(r.amount)}</span>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <span className="text-xs text-gray-500">Method</span>
                  <span className="text-sm text-gray-900 text-right break-words">
                    {String(r.refundMethod).replace(/_/g, ' ')}
                  </span>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <span className="text-xs text-gray-500">Reason</span>
                  <span className="text-sm text-gray-900 text-right break-words">
                    {r.reason}
                    {r.notes ? <span className="text-gray-400"> · {r.notes}</span> : null}
                  </span>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <span className="text-xs text-gray-500">Recorded By</span>
                  <span className="text-sm text-gray-900 text-right break-words">{r.recordedBy?.name || '—'}</span>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Discipline */}
      <Section title="Discipline Records" icon={ExclamationTriangleIcon}>
        {discipline.length > 0 ? (
          <>
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-gray-400">
                  <th className="py-1 pr-4">Date</th>
                  <th className="py-1 pr-4">Issue</th>
                  <th className="py-1 pr-4">Description</th>
                  <th className="py-1 pr-4">Reported By</th>
                  <th className="py-1 pr-4">Reviewed By</th>
                  <th className="py-1 pr-4">Class</th>
                </tr>
              </thead>
              <tbody>
                {discipline.map((d, i) => {
                  const e = d?.enrollment;
                  const classCtx = [e?.class?.name, e?.sub_class?.name ?? e?.subClass?.name]
                    .filter(Boolean)
                    .join(' · ');
                  return (
                    <tr key={d?.id ?? i} className="border-t border-gray-100 align-top">
                      <td className="py-1.5 pr-4 text-gray-600">
                        {(d?.created_at ?? d?.createdAt)?.split?.('T')?.[0] || '—'}
                      </td>
                      <td className="py-1.5 pr-4">
                        <span className="px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-800">
                          {d?.issue_type ?? d?.issueType ?? 'Issue'}
                        </span>
                      </td>
                      <td className="py-1.5 pr-4 text-gray-700 max-w-xs">{d?.description || '—'}</td>
                      <td className="py-1.5 pr-4 text-gray-600">{personLabel(d?.assigned_by ?? d?.assignedBy)}</td>
                      <td className="py-1.5 pr-4 text-gray-600">{personLabel(d?.reviewed_by ?? d?.reviewedBy)}</td>
                      <td className="py-1.5 pr-4 text-gray-600">{classCtx || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="md:hidden divide-y divide-gray-100">
            {discipline.map((d, i) => {
              const e = d?.enrollment;
              const classCtx = [e?.class?.name, e?.sub_class?.name ?? e?.subClass?.name]
                .filter(Boolean)
                .join(' · ');
              return (
                <div key={d?.id ?? i} className="p-4 space-y-1.5">
                  <div className="text-sm font-semibold text-gray-900 break-words">
                    {(d?.created_at ?? d?.createdAt)?.split?.('T')?.[0] || '—'}
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-xs text-gray-500">Issue</span>
                    <span className="text-sm text-right">
                      <span className="px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-800">
                        {d?.issue_type ?? d?.issueType ?? 'Issue'}
                      </span>
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-xs text-gray-500">Description</span>
                    <span className="text-sm text-gray-900 text-right break-words">{d?.description || '—'}</span>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-xs text-gray-500">Reported By</span>
                    <span className="text-sm text-gray-900 text-right break-words">
                      {personLabel(d?.assigned_by ?? d?.assignedBy)}
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-xs text-gray-500">Reviewed By</span>
                    <span className="text-sm text-gray-900 text-right break-words">
                      {personLabel(d?.reviewed_by ?? d?.reviewedBy)}
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-xs text-gray-500">Class</span>
                    <span className="text-sm text-gray-900 text-right break-words">{classCtx || '—'}</span>
                  </div>
                </div>
              );
            })}
          </div>
          </>
        ) : (
          <p className="text-sm text-gray-500">No discipline records.</p>
        )}
      </Section>

      {/* Parents */}
      <Section title="Parents / Guardians" icon={UserGroupIcon}>
        {parents.length > 0 ? (
          <>
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-gray-400">
                  <th className="py-1 pr-4">Name</th>
                  <th className="py-1 pr-4">Phone</th>
                  <th className="py-1 pr-4">Email</th>
                  <th className="py-1 pr-4">Matricule</th>
                </tr>
              </thead>
              <tbody>
                {parents.map((p, i) => {
                  const pr = p?.parent ?? p;
                  return (
                    <tr key={i} className="border-t border-gray-100">
                      <td className="py-1.5 pr-4 font-medium text-gray-800">{pr?.name || '—'}</td>
                      <td className="py-1.5 pr-4 text-gray-600">{pr?.phone || '—'}</td>
                      <td className="py-1.5 pr-4 text-gray-600">{pr?.email || '—'}</td>
                      <td className="py-1.5 pr-4 text-gray-600">{pr?.matricule || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="md:hidden divide-y divide-gray-100">
            {parents.map((p, i) => {
              const pr = p?.parent ?? p;
              return (
                <div key={i} className="p-4 space-y-1.5">
                  <div className="text-sm font-semibold text-gray-900 break-words">{pr?.name || '—'}</div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-xs text-gray-500">Phone</span>
                    <span className="text-sm text-gray-900 text-right break-words">{pr?.phone || '—'}</span>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-xs text-gray-500">Email</span>
                    <span className="text-sm text-gray-900 text-right break-words">{pr?.email || '—'}</span>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-xs text-gray-500">Matricule</span>
                    <span className="text-sm text-gray-900 text-right break-words">{pr?.matricule || '—'}</span>
                  </div>
                </div>
              );
            })}
          </div>
          </>
        ) : (
          <p className="text-sm text-gray-500">No parents linked.</p>
        )}
      </Section>

      {/* Interview marks */}
      {interviewMarks != null && (!Array.isArray(interviewMarks) || interviewMarks.length > 0) && (
        <Section title="Interview Marks" icon={ClipboardDocumentListIcon}>
          <InterviewMarks data={interviewMarks} />
        </Section>
      )}

      {/* Enrollment history */}
      <Section title="Enrollment History" icon={AcademicCapIcon}>
        {enrollments.length > 0 ? (
          <div className="space-y-4">
            {enrollments
              .slice()
              .sort((a, b) => (ay(b)?.id ?? b?.academicYearId ?? 0) - (ay(a)?.id ?? a?.academicYearId ?? 0))
              .map((e, idx) => {
                const averages = seqAverages(e);
                return (
                  <div key={e?.id ?? idx} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-medium text-gray-800">{ay(e)?.name || 'Unknown year'}</div>
                      <div className="text-sm text-gray-500">
                        {cls(e)?.name || 'No class'}
                        {sub(e)?.name ? ` · ${sub(e)?.name}` : ''}
                        {e?.repeater ? ' · Repeater' : ''}
                      </div>
                    </div>
                    {averages.length > 0 ? (
                      <>
                      <div className="hidden md:block overflow-x-auto mt-3">
                        <table className="min-w-full text-sm">
                          <thead>
                            <tr className="text-left text-xs uppercase text-gray-400">
                              <th className="py-1 pr-4">Sequence</th>
                              <th className="py-1 pr-4">Term</th>
                              <th className="py-1 pr-4">Average</th>
                              <th className="py-1 pr-4">Rank</th>
                            </tr>
                          </thead>
                          <tbody>
                            {averages.map((a, i) => (
                              <tr key={i} className="border-t border-gray-100">
                                <td className="py-1.5 pr-4 text-gray-800">{seqLabel(a)}</td>
                                <td className="py-1.5 pr-4 text-gray-600">{seqTerm(a) || '—'}</td>
                                <td className="py-1.5 pr-4 text-gray-600">
                                  {seqAvg(a) != null ? Number(seqAvg(a)).toFixed(2) : '—'}
                                </td>
                                <td className="py-1.5 pr-4 text-gray-600">{seqRank(a) ?? '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="md:hidden divide-y divide-gray-100">
                        {averages.map((a, i) => (
                          <div key={i} className="p-4 space-y-1.5">
                            <div className="text-sm font-semibold text-gray-900 break-words">{seqLabel(a)}</div>
                            <div className="flex items-start justify-between gap-3">
                              <span className="text-xs text-gray-500">Term</span>
                              <span className="text-sm text-gray-900 text-right break-words">{seqTerm(a) || '—'}</span>
                            </div>
                            <div className="flex items-start justify-between gap-3">
                              <span className="text-xs text-gray-500">Average</span>
                              <span className="text-sm text-gray-900 text-right break-words">
                                {seqAvg(a) != null ? Number(seqAvg(a)).toFixed(2) : '—'}
                              </span>
                            </div>
                            <div className="flex items-start justify-between gap-3">
                              <span className="text-xs text-gray-500">Rank</span>
                              <span className="text-sm text-gray-900 text-right break-words">{seqRank(a) ?? '—'}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                      </>
                    ) : (
                      <p className="text-xs text-gray-400 mt-2">No sequence averages recorded.</p>
                    )}
                  </div>
                );
              })}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No enrollment history.</p>
        )}
      </Section>

      {/* Change class modal */}
      <Modal isOpen={isChangeOpen} onClose={() => setIsChangeOpen(false)} title="Change Class" size="md">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Updating class for <span className="font-medium">{profile.name}</span>
            {selectedAcademicYear ? ` · ${selectedAcademicYear.name}` : ''}.
          </p>
          <Select
            label="Class"
            value={changeClassId}
            onChange={(e) => {
              setChangeClassId(e.target.value);
              setChangeSubClassId('');
            }}
            options={[
              { value: '', label: 'Select class' },
              ...classes.map((c) => ({ value: String(c.id), label: c.name })),
            ]}
          />
          <Select
            label="Subclass"
            value={changeSubClassId}
            onChange={(e) => setChangeSubClassId(e.target.value)}
            disabled={!changeClassId}
            options={[
              { value: '', label: changeClassId ? 'Select subclass (optional)' : 'Select a class first' },
              ...subClassesForClass(changeClassId).map((sc) => ({ value: String(sc.id), label: sc.name })),
            ]}
          />
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
            <Button variant="outline" onClick={() => setIsChangeOpen(false)} disabled={isChanging}>
              Cancel
            </Button>
            <Button color="primary" isLoading={isChanging} onClick={handleChangeClass}>
              Save Class
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-gray-400">{label}</dt>
      <dd className="text-gray-800">{value || '—'}</dd>
    </div>
  );
}

function StatBox({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string;
  tone?: 'default' | 'success' | 'danger';
}) {
  const valueColor =
    tone === 'danger' ? 'text-red-600' : tone === 'success' ? 'text-green-600' : 'text-gray-900';
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="text-xs uppercase tracking-wide text-gray-400">{label}</div>
      <div className={`text-xl font-semibold mt-1 ${valueColor}`}>{value}</div>
    </div>
  );
}

function Section({
  title,
  icon: Icon,
  children,
  badge,
}: {
  title: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  children: React.ReactNode;
  badge?: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between gap-2 mb-4">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
          <Icon className="h-5 w-5 text-blue-600" />
          {title}
        </h2>
        {badge}
      </div>
      {children}
    </div>
  );
}

function FeeStatusBadge({ status }: { status: StudentFeeStatus | null }) {
  if (!status) return null;
  if (!status.hasEnrollment) {
    return <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">Not enrolled</span>;
  }
  if (!status.hasFeesRecord) {
    return <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">No fees record</span>;
  }
  if (status.paidInFull) {
    return <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">✓ Paid in full · cleared for report cards</span>;
  }
  return (
    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
      Outstanding: XAF {Number(status.shortfall).toLocaleString()}
    </span>
  );
}

function InterviewMarks({ data }: { data: any }) {
  if (Array.isArray(data)) {
    return (
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <tbody>
            {data.map((item: any, i: number) => {
              const label = item?.markName ?? item?.subject ?? item?.name ?? `Mark ${i + 1}`;
              const value = item?.mark ?? item?.score ?? item?.value ?? item?.average;
              const comment = item?.comment ?? item?.remark;
              return (
                <tr key={i} className="border-t border-gray-100">
                  <td className="py-1.5 pr-4 font-medium text-gray-800">{label}</td>
                  <td className="py-1.5 pr-4 text-gray-600">{value != null ? String(value) : '—'}</td>
                  <td className="py-1.5 pr-4 text-gray-500">{comment || ''}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }
  if (typeof data === 'object' && data !== null) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2 text-sm">
        {Object.entries(data)
          .filter(([, v]) => v == null || typeof v !== 'object')
          .map(([k, v]) => (
            <Field key={k} label={humanize(k)} value={v == null ? '—' : String(v)} />
          ))}
      </div>
    );
  }
  return <p className="text-sm text-gray-700">{String(data)}</p>;
}
