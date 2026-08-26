'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import {
    ArrowLeftIcon,
    DocumentArrowDownIcon,
    EnvelopeIcon,
    PhoneIcon,
    IdentificationIcon,
    CalendarIcon,
    UserIcon,
    MapPinIcon,
    ClockIcon,
} from '@heroicons/react/24/outline';
import apiService, { ApiError } from '@/lib/apiService';
import { useAuth } from '@/components/context/AuthContext';
import { downloadTeacherTimetablePdf } from '@/lib/timetablePdf';
import { mapTeacher, searchTeachers, type TeacherSearchItem } from '@/lib/teacherSearchApi';

interface TeacherProfileViewProps {
    teacherId: number;
    /** Route to the teacher listing this profile was reached from. */
    backHref: string;
    backLabel?: string;
}

type Loader = { state: 'loading' } | { state: 'ready'; teacher: TeacherSearchItem } | { state: 'error'; message: string };

const formatDate = (iso?: string): string => {
    if (!iso) return '—';
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
};

const Field: React.FC<{ icon: React.ComponentType<{ className?: string }>; label: string; children: React.ReactNode }> = ({
    icon: Icon,
    label,
    children,
}) => (
    <div className="flex items-start gap-3">
        <Icon className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
        <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
            <p className="text-sm text-gray-900 break-words">{children}</p>
        </div>
    </div>
);

const Chip: React.FC<{ children: React.ReactNode; tone?: 'gray' | 'indigo' | 'emerald' }> = ({ children, tone = 'gray' }) => {
    const tones = {
        gray: 'bg-gray-100 text-gray-700',
        indigo: 'bg-indigo-100 text-indigo-700',
        emerald: 'bg-emerald-100 text-emerald-700',
    };
    return <span className={`text-xs px-2 py-1 rounded-full inline-block ${tones[tone]}`}>{children}</span>;
};

/**
 * Fetches a teacher for display. Uses the enriched search endpoint (subjects,
 * HOD/CM roles, hours) with an `id` filter fallback via matricule if needed.
 * Falls back to /users/:id for bio-only view when the search endpoint can't
 * pinpoint the row.
 */
const fetchTeacher = async (teacherId: number): Promise<TeacherSearchItem> => {
    // Base bio from /users/:id — always available, tells us name/matricule/etc.
    const baseResult = await apiService.get(`/users/${teacherId}`);
    const base = baseResult?.data;
    if (!base) throw new Error('Teacher not found.');

    // Try to enrich with subjects / HOD / class-master info from the search endpoint.
    // Matricule is unique per user; email is a good secondary lookup.
    const enrichKey = base.matricule || base.email;
    if (enrichKey) {
        try {
            const search = await searchTeachers({ q: enrichKey, limit: 5 });
            const match = search.data.find((t) => t.id === base.id);
            if (match) return match;
        } catch {
            // Enrichment is best-effort; fall through to bio-only view.
        }
    }
    return mapTeacher(base);
};

export const TeacherProfileView: React.FC<TeacherProfileViewProps> = ({ teacherId, backHref, backLabel = 'Back to teachers' }) => {
    const { selectedAcademicYear } = useAuth();
    const [loader, setLoader] = useState<Loader>({ state: 'loading' });
    const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

    useEffect(() => {
        let cancelled = false;
        setLoader({ state: 'loading' });
        fetchTeacher(teacherId)
            .then((teacher) => {
                if (!cancelled) setLoader({ state: 'ready', teacher });
            })
            .catch((error: unknown) => {
                if (cancelled) return;
                const message =
                    error instanceof ApiError && error.status === 404
                        ? 'Teacher not found.'
                        : error instanceof Error
                            ? error.message
                            : 'Failed to load teacher profile.';
                setLoader({ state: 'error', message });
                toast.error(message);
            });
        return () => {
            cancelled = true;
        };
    }, [teacherId]);

    const handleDownloadPdf = async (teacher: TeacherSearchItem) => {
        setIsDownloadingPdf(true);
        try {
            await downloadTeacherTimetablePdf(teacher.id, teacher.name, selectedAcademicYear?.id);
        } finally {
            setIsDownloadingPdf(false);
        }
    };

    if (loader.state === 'loading') {
        return (
            <div className="max-w-4xl mx-auto p-4 sm:p-6">
                <div className="animate-pulse space-y-4">
                    <div className="h-8 bg-gray-200 rounded w-1/3" />
                    <div className="h-40 bg-white rounded-lg shadow-sm" />
                    <div className="h-60 bg-white rounded-lg shadow-sm" />
                </div>
            </div>
        );
    }

    if (loader.state === 'error') {
        return (
            <div className="max-w-4xl mx-auto p-4 sm:p-6">
                <Link
                    href={backHref}
                    className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
                >
                    <ArrowLeftIcon className="h-4 w-4 mr-1" />
                    {backLabel}
                </Link>
                <div className="bg-white rounded-lg shadow-sm p-6 text-center text-gray-600">{loader.message}</div>
            </div>
        );
    }

    const { teacher } = loader;

    return (
        <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-4">
            <Link
                href={backHref}
                className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
            >
                <ArrowLeftIcon className="h-4 w-4 mr-1" />
                {backLabel}
            </Link>

            {/* Header card */}
            <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                    <div className="h-20 w-20 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
                        {teacher.photo ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={teacher.photo} alt={teacher.name} className="h-full w-full object-cover" />
                        ) : (
                            <svg className="h-full w-full text-gray-300" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h1 className="text-2xl font-bold text-gray-900 break-words">{teacher.name}</h1>
                        <div className="mt-1 flex flex-wrap gap-2">
                            {teacher.status && <Chip>{teacher.status}</Chip>}
                            {teacher.isHod && (
                                <Chip tone="indigo">
                                    HOD{teacher.hodSubjects.length > 0 ? ` · ${teacher.hodSubjects.map((s) => s.name).join(', ')}` : ''}
                                </Chip>
                            )}
                            {teacher.isClassMaster && (
                                <Chip tone="emerald">
                                    Class Master{teacher.classMasterOf.length > 0 ? ` · ${teacher.classMasterOf.map((c) => c.name).join(', ')}` : ''}
                                </Chip>
                            )}
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => handleDownloadPdf(teacher)}
                        disabled={isDownloadingPdf}
                        className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-60"
                    >
                        <DocumentArrowDownIcon className="h-5 w-5 mr-2" />
                        {isDownloadingPdf ? 'Preparing...' : 'Download Timetable PDF'}
                    </button>
                </div>
            </div>

            {/* Contact & bio */}
            <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Profile</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field icon={IdentificationIcon} label="Matricule">{teacher.matricule || '—'}</Field>
                    <Field icon={EnvelopeIcon} label="Email">{teacher.email || '—'}</Field>
                    <Field icon={PhoneIcon} label="Phone">{teacher.phone || '—'}</Field>
                    <Field icon={PhoneIcon} label="WhatsApp">{teacher.whatsappNumber || '—'}</Field>
                    <Field icon={UserIcon} label="Gender">{teacher.gender || '—'}</Field>
                    <Field icon={CalendarIcon} label="Date of Birth">{formatDate(teacher.dateOfBirth)}</Field>
                    <Field icon={MapPinIcon} label="Address">{teacher.address || '—'}</Field>
                    <Field icon={ClockIcon} label="Weekly Hours">{`${teacher.totalHoursPerWeek ?? 0} h`}</Field>
                </div>
            </div>

            {/* Assignments */}
            <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Teaching Assignments</h2>
                {teacher.subjects.length === 0 ? (
                    <p className="text-sm text-gray-500 italic">No subjects assigned.</p>
                ) : (
                    <div className="flex flex-wrap gap-2">
                        {teacher.subjects.map((s) => (
                            <Chip key={s.id} tone="indigo">{s.name}</Chip>
                        ))}
                    </div>
                )}

                {teacher.subClasses.length > 0 && (
                    <div className="mt-4">
                        <h3 className="text-sm font-medium text-gray-700 mb-2">Sub-classes taught</h3>
                        <div className="flex flex-wrap gap-2">
                            {teacher.subClasses.map((sc) => (
                                <Chip key={sc.id}>
                                    {sc.class ? `${sc.class.name} - ${sc.name}` : sc.name}
                                </Chip>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Timetable section */}
            <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">Timetable</h2>
                <p className="text-sm text-gray-600 mb-4">
                    Download this teacher&apos;s weekly timetable as a print-ready PDF.
                    {selectedAcademicYear && ` Academic year: ${selectedAcademicYear.name}.`}
                </p>
                <button
                    type="button"
                    onClick={() => handleDownloadPdf(teacher)}
                    disabled={isDownloadingPdf}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-60"
                >
                    <DocumentArrowDownIcon className="h-5 w-5 mr-2" />
                    {isDownloadingPdf ? 'Preparing PDF...' : 'Download Timetable PDF'}
                </button>
            </div>
        </div>
    );
};

export default TeacherProfileView;
