'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useMemo } from 'react';
import useSWR from 'swr';
import { toast } from 'react-hot-toast';
import {
  ArrowLeftIcon,
  AcademicCapIcon,
  CurrencyDollarIcon,
  ClipboardDocumentListIcon,
  CalendarDaysIcon,
  ExclamationTriangleIcon,
  UserGroupIcon,
  UserIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { StudentPhoto } from '@/components/ui';

// --- Types matching the full-profile API response ---
interface ParentInfo {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  address?: string;
  relationship?: string;
}

interface Enrollment {
  id: number;
  academicYearId: number;
  academicYearName?: string;
  subClassId: number;
  subClassName?: string;
  className?: string;
  repeater?: boolean;
  status?: string;
}

interface FeeTransaction {
  id: number;
  amount: number;
  date: string;
  method?: string;
  reference?: string;
  description?: string;
}

interface FeeRecord {
  id: number;
  type?: string;
  totalAmount: number;
  paidAmount: number;
  balance: number;
  status?: string;
  academicYearName?: string;
  transactions?: FeeTransaction[];
}

interface MarkRecord {
  id: number;
  score: number | null;
  subjectId: number;
  subjectName: string;
  examSequenceId: number;
  examSequenceName?: string;
  termName?: string;
  teacherName?: string;
}

interface AttendanceSummary {
  totalDays: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  attendanceRate: number;
  punctualityRate: number;
}

interface DisciplineRecord {
  id: number;
  type?: string;
  description: string;
  date: string;
  severity?: string;
  actionTaken?: string;
  reportedBy?: string;
}

interface StudentProfile {
  id: number;
  name: string;
  matricule?: string;
  gender?: string;
  date_of_birth?: string;
  place_of_birth?: string;
  residence?: string;
  former_school?: string;
  is_new_student?: boolean;
  photo?: string | null;
  createdAt?: string;
  parents: ParentInfo[];
  enrollments: Enrollment[];
  fees: FeeRecord[];
  controlFees: FeeRecord[];
  marks: MarkRecord[];
  attendance: AttendanceSummary | null;
  discipline: DisciplineRecord[];
}

// --- API ---
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://192.168.1.103:4000/api/v1';
const getAuthToken = () => typeof window !== 'undefined' ? localStorage.getItem('token') : null;

const fetcher = async (url: string) => {
  const token = getAuthToken();
  if (!token) throw new Error('Not authenticated');
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || `Request failed (${res.status})`);
  }
  return res.json();
};

// --- Helpers ---
function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-CM', { style: 'currency', currency: 'XAF', minimumFractionDigits: 0 }).format(amount);
}

// --- Section Components ---

function SectionCard({ title, icon: Icon, children, badge }: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  badge?: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="w-5 h-5 text-gray-500" />
          <h3 className="font-semibold text-gray-900">{title}</h3>
        </div>
        {badge}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between py-2 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-900 text-right">{value || '-'}</span>
    </div>
  );
}

// --- Main Component ---
export default function StudentProfilePage() {
  const params = useParams();
  const router = useRouter();
  const studentId = params.id as string;
  const [activeTab, setActiveTab] = useState<'overview' | 'marks' | 'fees' | 'discipline'>('overview');

  const { data: result, isLoading, error } = useSWR<{ data: StudentProfile }>(
    studentId ? `${API_BASE_URL}/students/${studentId}/full-profile` : null,
    fetcher
  );

  const profile = result?.data;

  // Group marks by exam sequence
  const marksBySequence = useMemo(() => {
    if (!profile?.marks) return [];
    const grouped = new Map<string, { sequenceName: string; termName?: string; marks: MarkRecord[] }>();
    profile.marks.forEach(mark => {
      const key = mark.examSequenceName || `Sequence ${mark.examSequenceId}`;
      if (!grouped.has(key)) {
        grouped.set(key, { sequenceName: key, termName: mark.termName, marks: [] });
      }
      grouped.get(key)!.marks.push(mark);
    });
    return Array.from(grouped.values());
  }, [profile?.marks]);

  // Calculate marks average
  const marksAverage = useMemo(() => {
    if (!profile?.marks?.length) return null;
    const scored = profile.marks.filter(m => m.score !== null);
    if (scored.length === 0) return null;
    const sum = scored.reduce((acc, m) => acc + (m.score || 0), 0);
    return (sum / scored.length).toFixed(2);
  }, [profile?.marks]);

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-48"></div>
          <div className="h-40 bg-gray-200 rounded"></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-4">
          <ArrowLeftIcon className="w-4 h-4" /> Back
        </button>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <ExclamationTriangleIcon className="w-10 h-10 text-red-400 mx-auto mb-2" />
          <p className="text-red-700">{error.message}</p>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  const currentEnrollment = profile.enrollments?.[0];
  const allFees = [...(profile.fees || []), ...(profile.controlFees || [])];

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Back Button */}
      <button onClick={() => router.back()} className="flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm">
        <ArrowLeftIcon className="w-4 h-4" /> Back to Students
      </button>

      {/* Profile Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col sm:flex-row items-start gap-6">
          <div className="flex-shrink-0">
            <StudentPhoto
              studentId={profile.id}
              photo={profile.photo}
              size="lg"
              studentName={profile.name}
              fetchPhoto={!profile.photo}
            />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-gray-900">{profile.name}</h1>
            <div className="flex flex-wrap gap-3 mt-2">
              {profile.matricule && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {profile.matricule}
                </span>
              )}
              {profile.gender && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                  {profile.gender}
                </span>
              )}
              {currentEnrollment && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  {currentEnrollment.subClassName || currentEnrollment.className}
                </span>
              )}
              {profile.is_new_student && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                  New Student
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-sm">
              <div>
                <span className="text-gray-500">Date of Birth</span>
                <p className="font-medium text-gray-900">{formatDate(profile.date_of_birth)}</p>
              </div>
              <div>
                <span className="text-gray-500">Place of Birth</span>
                <p className="font-medium text-gray-900">{profile.place_of_birth || '-'}</p>
              </div>
              <div>
                <span className="text-gray-500">Residence</span>
                <p className="font-medium text-gray-900">{profile.residence || '-'}</p>
              </div>
              <div>
                <span className="text-gray-500">Former School</span>
                <p className="font-medium text-gray-900">{profile.former_school || '-'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { key: 'overview', label: 'Overview' },
            { key: 'marks', label: 'Academic Marks' },
            { key: 'fees', label: 'Fees & Payments' },
            { key: 'discipline', label: 'Discipline' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`py-3 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Parents */}
          <SectionCard title="Parents / Guardians" icon={UserGroupIcon}>
            {profile.parents.length === 0 ? (
              <p className="text-sm text-gray-400 italic">No parents linked</p>
            ) : (
              <div className="space-y-3">
                {profile.parents.map(parent => (
                  <div key={parent.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="bg-blue-100 rounded-full p-2 flex-shrink-0">
                      <UserIcon className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900">{parent.name}</p>
                      {parent.relationship && <p className="text-xs text-gray-500">{parent.relationship}</p>}
                      {parent.phone && <p className="text-xs text-gray-600 mt-1">{parent.phone}</p>}
                      {parent.email && <p className="text-xs text-gray-600">{parent.email}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          {/* Enrollment History */}
          <SectionCard title="Enrollment History" icon={AcademicCapIcon}>
            {profile.enrollments.length === 0 ? (
              <p className="text-sm text-gray-400 italic">No enrollment records</p>
            ) : (
              <div className="space-y-2">
                {profile.enrollments.map((enr, i) => (
                  <div key={enr.id} className={`flex items-center justify-between p-3 rounded-lg ${i === 0 ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'}`}>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{enr.subClassName || enr.className || 'Unknown'}</p>
                      <p className="text-xs text-gray-500">{enr.academicYearName || `Year ID: ${enr.academicYearId}`}</p>
                    </div>
                    <div className="text-right">
                      {enr.repeater && <span className="text-xs text-orange-600 font-medium">Repeater</span>}
                      {i === 0 && <span className="inline-flex ml-2 items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Current</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          {/* Attendance Summary */}
          <SectionCard title="Attendance Summary" icon={CalendarDaysIcon}>
            {!profile.attendance ? (
              <p className="text-sm text-gray-400 italic">No attendance data available</p>
            ) : (
              <div>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <p className="text-lg font-bold text-green-700">{profile.attendance.present}</p>
                    <p className="text-xs text-green-600">Present</p>
                  </div>
                  <div className="text-center p-3 bg-red-50 rounded-lg">
                    <p className="text-lg font-bold text-red-700">{profile.attendance.absent}</p>
                    <p className="text-xs text-red-600">Absent</p>
                  </div>
                  <div className="text-center p-3 bg-yellow-50 rounded-lg">
                    <p className="text-lg font-bold text-yellow-700">{profile.attendance.late}</p>
                    <p className="text-xs text-yellow-600">Late</p>
                  </div>
                </div>
                <InfoRow label="Total Days" value={profile.attendance.totalDays} />
                <InfoRow label="Excused" value={profile.attendance.excused} />
                <InfoRow label="Attendance Rate" value={`${Math.round(profile.attendance.attendanceRate)}%`} />
                <InfoRow label="Punctuality Rate" value={`${Math.round(profile.attendance.punctualityRate)}%`} />
              </div>
            )}
          </SectionCard>

          {/* Academic Summary */}
          <SectionCard
            title="Academic Summary"
            icon={ClipboardDocumentListIcon}
            badge={marksAverage ? (
              <span className="text-sm font-bold text-blue-700">Avg: {marksAverage}/20</span>
            ) : undefined}
          >
            {profile.marks.length === 0 ? (
              <p className="text-sm text-gray-400 italic">No marks recorded</p>
            ) : (
              <div>
                <InfoRow label="Total Subjects Assessed" value={new Set(profile.marks.map(m => m.subjectId)).size} />
                <InfoRow label="Total Marks Entries" value={profile.marks.filter(m => m.score !== null).length} />
                <InfoRow label="Exam Sequences" value={marksBySequence.length} />
                {marksAverage && (
                  <div className="mt-3 p-3 bg-blue-50 rounded-lg text-center">
                    <p className="text-2xl font-bold text-blue-700">{marksAverage}</p>
                    <p className="text-xs text-blue-600">Overall Average (out of 20)</p>
                  </div>
                )}
              </div>
            )}
          </SectionCard>
        </div>
      )}

      {/* Marks Tab */}
      {activeTab === 'marks' && (
        <div className="space-y-6">
          {marksBySequence.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
              No marks recorded for this student.
            </div>
          ) : (
            marksBySequence.map((group) => (
              <div key={group.sequenceName} className="bg-white rounded-lg shadow overflow-hidden">
                <div className="px-5 py-3 border-b bg-gray-50 flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-gray-900">{group.sequenceName}</h4>
                    {group.termName && <p className="text-xs text-gray-500">{group.termName}</p>}
                  </div>
                  <span className="text-sm text-gray-600">
                    {group.marks.filter(m => m.score !== null).length} / {group.marks.length} graded
                  </span>
                </div>
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-5 py-2 text-left text-xs font-medium text-gray-500 uppercase">Subject</th>
                      <th className="px-5 py-2 text-left text-xs font-medium text-gray-500 uppercase">Score</th>
                      <th className="px-5 py-2 text-left text-xs font-medium text-gray-500 uppercase">Teacher</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {group.marks.map(mark => (
                      <tr key={mark.id} className="hover:bg-gray-50">
                        <td className="px-5 py-2.5 font-medium text-gray-900">{mark.subjectName}</td>
                        <td className="px-5 py-2.5">
                          {mark.score !== null ? (
                            <span className={`font-semibold ${mark.score >= 10 ? 'text-green-700' : 'text-red-600'}`}>
                              {mark.score} / 20
                            </span>
                          ) : (
                            <span className="text-gray-400 italic">Not graded</span>
                          )}
                        </td>
                        <td className="px-5 py-2.5 text-gray-600">{mark.teacherName || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))
          )}
        </div>
      )}

      {/* Fees Tab */}
      {activeTab === 'fees' && (
        <div className="space-y-6">
          {allFees.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
              No fee records found for this student.
            </div>
          ) : (
            allFees.map(fee => {
              const paidPct = fee.totalAmount > 0 ? Math.round((fee.paidAmount / fee.totalAmount) * 100) : 0;
              return (
                <div key={fee.id} className="bg-white rounded-lg shadow overflow-hidden">
                  <div className="px-5 py-4 border-b flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-gray-900">{fee.type || 'School Fees'}</h4>
                      {fee.academicYearName && <p className="text-xs text-gray-500">{fee.academicYearName}</p>}
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      fee.balance <= 0 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {fee.balance <= 0 ? 'Paid' : `${formatCurrency(fee.balance)} remaining`}
                    </span>
                  </div>
                  <div className="p-5">
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-gray-500">Total</p>
                        <p className="text-lg font-bold text-gray-900">{formatCurrency(fee.totalAmount)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Paid</p>
                        <p className="text-lg font-bold text-green-700">{formatCurrency(fee.paidAmount)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Balance</p>
                        <p className={`text-lg font-bold ${fee.balance <= 0 ? 'text-green-700' : 'text-red-600'}`}>
                          {formatCurrency(fee.balance)}
                        </p>
                      </div>
                    </div>
                    {/* Progress bar */}
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                      <div
                        className={`h-2 rounded-full ${paidPct >= 100 ? 'bg-green-500' : paidPct > 50 ? 'bg-yellow-500' : 'bg-red-400'}`}
                        style={{ width: `${Math.min(paidPct, 100)}%` }}
                      />
                    </div>
                    {/* Transactions */}
                    {fee.transactions && fee.transactions.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase mb-2">Payment History</p>
                        <div className="space-y-2">
                          {fee.transactions.map(tx => (
                            <div key={tx.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0 text-sm">
                              <div>
                                <p className="text-gray-900">{formatCurrency(tx.amount)}</p>
                                <p className="text-xs text-gray-500">{tx.method} {tx.reference && `- ${tx.reference}`}</p>
                              </div>
                              <span className="text-xs text-gray-500">{formatDate(tx.date)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Discipline Tab */}
      {activeTab === 'discipline' && (
        <div className="space-y-4">
          {profile.discipline.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
              <CheckCircleIcon className="w-10 h-10 text-green-400 mx-auto mb-2" />
              No discipline issues recorded.
            </div>
          ) : (
            profile.discipline.map(record => (
              <div key={record.id} className="bg-white rounded-lg shadow p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className={`rounded-full p-2 flex-shrink-0 ${
                      record.severity === 'HIGH' || record.severity === 'SEVERE'
                        ? 'bg-red-100' : record.severity === 'MEDIUM'
                        ? 'bg-yellow-100' : 'bg-orange-100'
                    }`}>
                      <ExclamationTriangleIcon className={`w-4 h-4 ${
                        record.severity === 'HIGH' || record.severity === 'SEVERE'
                          ? 'text-red-600' : record.severity === 'MEDIUM'
                          ? 'text-yellow-600' : 'text-orange-600'
                      }`} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{record.description}</p>
                      {record.type && <p className="text-xs text-gray-500 mt-0.5">{record.type}</p>}
                      {record.actionTaken && (
                        <p className="text-xs text-blue-600 mt-1">Action: {record.actionTaken}</p>
                      )}
                      {record.reportedBy && (
                        <p className="text-xs text-gray-400 mt-1">Reported by: {record.reportedBy}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-4">
                    <p className="text-xs text-gray-500">{formatDate(record.date)}</p>
                    {record.severity && (
                      <span className={`inline-flex mt-1 items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        record.severity === 'HIGH' || record.severity === 'SEVERE'
                          ? 'bg-red-100 text-red-700'
                          : record.severity === 'MEDIUM'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {record.severity}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
