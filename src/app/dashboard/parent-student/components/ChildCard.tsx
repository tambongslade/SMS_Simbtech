'use client';

import { FC, useState } from 'react';
import { Child } from '../hooks/useParentDashboard';
import {
    AcademicCapIcon,
    CurrencyDollarIcon,
    ExclamationCircleIcon,
    CheckCircleIcon,
    CameraIcon,
    UserCircleIcon,
    ChevronRightIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui';
import { useLanguage } from '@/components/context/LanguageContext';
import { formatMoney, getPhotoAbsoluteUrl } from '@/lib/parentPortalApi';
import ChildPhotoCapture from './ChildPhotoCapture';

interface ChildCardProps {
    child: Child;
    onViewDetails: (childId: number) => void;
    compact?: boolean;
}

const STATUS_STYLE: Record<string, string> = {
    ENROLLED:          'bg-emerald-50 text-emerald-700 ring-emerald-100',
    ASSIGNED_TO_CLASS: 'bg-blue-50 text-blue-700 ring-blue-100',
    GRADUATED:         'bg-emerald-50 text-emerald-700 ring-emerald-100',
    TRANSFERRED:       'bg-rose-50 text-rose-700 ring-rose-100',
    SUSPENDED:         'bg-amber-50 text-amber-700 ring-amber-100',
};

function statusLabel(status: string, t: (s: string) => string) {
    const map: Record<string, string> = {
        ENROLLED:          t('Enrolled'),
        ASSIGNED_TO_CLASS: t('Assigned to Class'),
        GRADUATED:         t('Graduated'),
        TRANSFERRED:       t('Transferred'),
        SUSPENDED:         t('Suspended'),
    };
    return map[status] || String(status || '').replace(/_/g, ' ');
}

function attendanceRing(rate: number) {
    if (rate >= 90) return 'text-emerald-600';
    if (rate >= 75) return 'text-amber-600';
    return 'text-rose-600';
}

// ─── Avatar with hover camera overlay ────────────────────────────────────────
const PhotoWithCamera: FC<{
    photoUrl: string | null;
    name: string;
    size: 'sm' | 'md' | 'lg';
    canCapture: boolean;
    onCameraClick: () => void;
}> = ({ photoUrl, name, size, canCapture, onCameraClick }) => {
    const sizeCls = size === 'lg' ? 'w-20 h-20' : size === 'md' ? 'w-16 h-16' : 'w-12 h-12';
    const iconCls = size === 'lg' ? 'w-6 h-6' : size === 'md' ? 'w-5 h-5' : 'w-4 h-4';
    return (
        <div className={`relative group ${sizeCls} shrink-0`}>
            <div className={`${sizeCls} rounded-2xl overflow-hidden bg-slate-100 ring-1 ring-slate-200/70`}>
                {photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photoUrl} alt={name} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
                        <UserCircleIcon className="w-3/4 h-3/4 text-slate-300" />
                    </div>
                )}
            </div>
            {canCapture && (
                <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onCameraClick(); }}
                    className={`absolute -bottom-1 -right-1 rounded-full bg-slate-900 text-white p-1.5 shadow-md ring-2 ring-white hover:bg-slate-700 transition-transform hover:scale-105`}
                    aria-label="Take or upload photo"
                    title="Take or upload photo"
                >
                    <CameraIcon className={iconCls} />
                </button>
            )}
        </div>
    );
};

export const ChildCard: FC<ChildCardProps> = ({ child, onViewDetails, compact = false }) => {
    const { t } = useLanguage();
    const [showCapture, setShowCapture] = useState(false);
    const [photoOverride, setPhotoOverride] = useState<string | null>(null);

    const photoUrl = photoOverride || getPhotoAbsoluteUrl(child.photo || null);
    const canCapture = !!child.matricule;
    const status = child.enrollmentStatus || 'ENROLLED';
    const statusCls = STATUS_STYLE[status] || 'bg-slate-100 text-slate-700 ring-slate-100';

    // ─── compact card (overview grid) ─────────────────────────────────────────
    if (compact) {
        return (
            <>
                <div className="group rounded-2xl bg-white/80 backdrop-blur border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all p-4 flex flex-col gap-3">
                    <div className="flex items-start gap-3">
                        <PhotoWithCamera
                            photoUrl={photoUrl}
                            name={child.name}
                            size="sm"
                            canCapture={canCapture}
                            onCameraClick={() => setShowCapture(true)}
                        />
                        <div className="min-w-0 flex-1">
                            <h3 className="text-sm font-semibold text-slate-900 truncate">{child.name}</h3>
                            <p className="text-xs text-slate-500 truncate">
                                {child.className || t('Not enrolled')}{child.subclassName ? ` · ${child.subclassName}` : ''}
                            </p>
                            <span className={`mt-1 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ring-1 ${statusCls}`}>
                                {statusLabel(status, t)}
                            </span>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className={`inline-flex items-center gap-1 ${attendanceRing(child.attendanceRate)}`}>
                            <CheckCircleIcon className="w-3.5 h-3.5" />
                            <span className="font-medium">{Number(child.attendanceRate).toFixed(0)}%</span>
                        </div>
                        <div className={`inline-flex items-center gap-1 justify-end ${child.pendingFees > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                            <CurrencyDollarIcon className="w-3.5 h-3.5" />
                            <span className="font-medium truncate">{formatMoney(child.pendingFees)}</span>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => onViewDetails(child.id)}
                        className="mt-1 inline-flex items-center justify-center gap-1 py-2 rounded-full text-xs font-medium bg-slate-900 text-white hover:bg-slate-800 transition"
                    >
                        {t('View')}
                        <ChevronRightIcon className="w-3.5 h-3.5" />
                    </button>
                </div>
                {canCapture && (
                    <ChildPhotoCapture
                        isOpen={showCapture}
                        matricule={child.matricule!}
                        childName={child.name}
                        onClose={() => setShowCapture(false)}
                        onUploaded={(url) => setPhotoOverride(url)}
                    />
                )}
            </>
        );
    }

    // ─── full card (children page grid) ───────────────────────────────────────
    return (
        <>
            <div className="group rounded-3xl bg-white border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all overflow-hidden">
                {/* Photo header */}
                <div className="relative bg-gradient-to-br from-slate-50 via-white to-blue-50/40 p-5 pb-4">
                    <div className="flex items-start gap-4">
                        <PhotoWithCamera
                            photoUrl={photoUrl}
                            name={child.name}
                            size="lg"
                            canCapture={canCapture}
                            onCameraClick={() => setShowCapture(true)}
                        />
                        <div className="flex-1 min-w-0 pt-1">
                            <h3 className="text-base font-semibold text-slate-900 leading-tight">{child.name}</h3>
                            {child.matricule && (
                                <p className="text-xs text-slate-500 mt-0.5 font-mono">{child.matricule}</p>
                            )}
                            <p className="text-sm text-slate-600 mt-1 truncate">
                                {child.className || t('Not enrolled')}
                                {child.subclassName ? ` · ${child.subclassName}` : ''}
                            </p>
                            <span className={`mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium ring-1 ${statusCls}`}>
                                {statusLabel(status, t)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Metrics */}
                <div className="px-5 py-4 border-t border-slate-100 space-y-3">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600 inline-flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-emerald-50 flex items-center justify-center">
                                <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-600" />
                            </span>
                            {t('Attendance')}
                        </span>
                        <span className={`text-sm font-semibold tabular-nums ${attendanceRing(child.attendanceRate)}`}>
                            {Number(child.attendanceRate).toFixed(0)}%
                        </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600 inline-flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center">
                                <AcademicCapIcon className="w-3.5 h-3.5 text-blue-600" />
                            </span>
                            {t('Latest Marks')}
                        </span>
                        <span className="text-sm font-medium text-slate-900">
                            {child.latestMarks.length > 0 ? `${child.latestMarks.length} ${t('subjects')}` : t('No marks')}
                        </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600 inline-flex items-center gap-2">
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center ${child.pendingFees > 0 ? 'bg-rose-50' : 'bg-emerald-50'}`}>
                                <CurrencyDollarIcon className={`w-3.5 h-3.5 ${child.pendingFees > 0 ? 'text-rose-600' : 'text-emerald-600'}`} />
                            </span>
                            {t('Pending Fees')}
                        </span>
                        <span className={`text-sm font-semibold tabular-nums ${child.pendingFees > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                            {formatMoney(child.pendingFees)}
                        </span>
                    </div>
                    {child.disciplineIssues > 0 && (
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-600 inline-flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-amber-50 flex items-center justify-center">
                                    <ExclamationCircleIcon className="w-3.5 h-3.5 text-amber-600" />
                                </span>
                                {t('Discipline Issues')}
                            </span>
                            <span className="text-sm font-semibold text-rose-600 tabular-nums">{child.disciplineIssues}</span>
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="px-5 pb-5">
                    <Button
                        className="w-full !rounded-full !bg-slate-900 hover:!bg-slate-800 !text-white justify-center inline-flex items-center gap-1"
                        onClick={() => onViewDetails(child.id)}
                    >
                        {t('View Details')}
                        <ChevronRightIcon className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            {canCapture && (
                <ChildPhotoCapture
                    isOpen={showCapture}
                    matricule={child.matricule!}
                    childName={child.name}
                    onClose={() => setShowCapture(false)}
                    onUploaded={(url) => setPhotoOverride(url)}
                />
            )}
        </>
    );
};
