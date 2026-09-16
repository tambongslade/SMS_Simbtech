'use client';

// Printable-forms hub for the bursar/secretary. Only "Attendance Form" exists
// for now (see FORM_TYPES below) -- the form-type picker is a plain radio
// list rather than a hardcoded page specifically so a second form type is a
// one-line addition later, not a redesign.
//
// Attendance form: pick one or more classes -> one register PDF per class
// (each class gets its own download, not one combined PDF, so a class
// teacher only ever has to print their own sheet), Monday-Saturday across
// the top, an empty box per student per day for a manual present/absent
// mark, and a blank "Week: ____" line at the top filled in by hand -- this
// is a paper form, not a digital attendance record, so nothing here is
// saved back to the server.

import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import jsPDF from 'jspdf';
import {
    ClipboardDocumentCheckIcon,
    PrinterIcon,
    DocumentTextIcon,
} from '@heroicons/react/24/outline';
import { Card, CardHeader, CardTitle, CardBody, Button } from '@/components/ui';
import { useAuth } from '@/components/context/AuthContext';
import apiService from '@/lib/apiService';
import { sortClassesByLevel } from '@/lib/classOrdering';

interface SubClassBrief {
    id: number;
    name: string;
}
interface ClassBrief {
    id: number;
    name: string;
    subClasses: SubClassBrief[];
}

interface EnrolledStudent {
    student: {
        id: number;
        name: string;
        matricule: string;
    };
}

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

const FORM_TYPES = [
    {
        key: 'attendance',
        label: 'Attendance Form',
        description: 'Monday–Saturday register, one empty box per student per day for a manual present/absent mark.',
    },
    // Future form types go here.
] as const;
type FormTypeKey = typeof FORM_TYPES[number]['key'];

const slug = (v: string) => v.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

function generateAttendancePdf(opts: {
    className: string;
    subClassName: string;
    academicYearName?: string;
    students: EnrolledStudent[];
}) {
    const { className, subClassName, academicYearName, students } = opts;

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = 210;
    const pageHeight = 297;
    const marginX = 12;
    const usableWidth = pageWidth - marginX * 2;
    const bottomMargin = 16;
    let y = 16;

    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('ATTENDANCE FORM', marginX, y);
    y += 7;
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(
        `${className} · ${subClassName}${academicYearName ? ` · ${academicYearName}` : ''}`,
        marginX, y,
    );
    y += 9;

    // Blank line for the class teacher to fill in by hand.
    pdf.setFontSize(11);
    pdf.text('Week:', marginX, y);
    pdf.setDrawColor(120);
    pdf.line(marginX + 14, y + 1, marginX + 90, y + 1);
    y += 10;

    // Columns: # | Matricule | Student Name | Mon..Sat (one box each)
    const numW = 8;
    const matW = 26;
    const nameW = 56;
    const dayW = (usableWidth - numW - matW - nameW) / DAYS.length;
    const cols = [
        { label: '#', width: numW },
        { label: 'Matricule', width: matW },
        { label: 'Student Name', width: nameW },
        ...DAYS.map(d => ({ label: d, width: dayW })),
    ];
    const colX: number[] = [];
    let cursorX = marginX;
    for (const c of cols) { colX.push(cursorX); cursorX += c.width; }

    const rowHeight = 8;
    const boxSize = 4.5;

    const drawHeader = () => {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(8);
        cols.forEach((c, i) => {
            if (i < 3) {
                pdf.text(c.label, colX[i], y);
            } else {
                // Center the day label over its box column.
                const textWidth = pdf.getTextWidth(c.label);
                pdf.text(c.label, colX[i] + (c.width - textWidth) / 2, y);
            }
        });
        y += 2;
        pdf.setDrawColor(160);
        pdf.line(marginX, y, marginX + usableWidth, y);
        y += 6;
        pdf.setFont('helvetica', 'normal');
    };

    drawHeader();

    if (students.length === 0) {
        pdf.setFontSize(9);
        pdf.setTextColor(120);
        pdf.text('No enrolled students found for this class.', marginX, y);
        pdf.setTextColor(0);
    }

    students.forEach((s, i) => {
        if (y > pageHeight - bottomMargin) {
            pdf.addPage();
            y = 16;
            drawHeader();
        }
        pdf.setFontSize(8);
        const name = s.student.name.length > 34 ? `${s.student.name.slice(0, 32)}…` : s.student.name;
        pdf.text(String(i + 1), colX[0], y);
        pdf.text(s.student.matricule || '—', colX[1], y);
        pdf.text(name, colX[2], y);

        pdf.setDrawColor(150);
        DAYS.forEach((_, di) => {
            const colIndex = 3 + di;
            const boxX = colX[colIndex] + (cols[colIndex].width - boxSize) / 2;
            const boxY = y - boxSize + 1.5;
            pdf.rect(boxX, boxY, boxSize, boxSize);
        });

        y += rowHeight;
    });

    pdf.save(`attendance-form-${slug(className)}-${slug(subClassName)}.pdf`);
}

export default function BursarFormsPage() {
    const { selectedAcademicYear } = useAuth();

    const [formType, setFormType] = useState<FormTypeKey>('attendance');
    const [classes, setClasses] = useState<ClassBrief[]>([]);
    const [isLoadingClasses, setIsLoadingClasses] = useState(true);
    const [selectedSubclassIds, setSelectedSubclassIds] = useState<number[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);

    useEffect(() => {
        let cancelled = false;
        setIsLoadingClasses(true);
        apiService
            .get<{ success: boolean; data: (ClassBrief & { sub_classes?: SubClassBrief[] })[] }>(
                '/classes?includeSubClasses=true'
            )
            .then((res) => {
                if (cancelled) return;
                const raw = res?.data ?? [];
                // Some endpoints in this codebase still answer snake_case on
                // older builds -- tolerate sub_classes as a fallback.
                const normalised = raw.map((c) => ({
                    id: c.id,
                    name: c.name,
                    subClasses: c.subClasses ?? c.sub_classes ?? [],
                }));
                setClasses(sortClassesByLevel(normalised));
            })
            .catch((err: unknown) => {
                if (!cancelled) toast.error(err instanceof Error ? err.message : 'Failed to load classes.');
            })
            .finally(() => {
                if (!cancelled) setIsLoadingClasses(false);
            });
        return () => { cancelled = true; };
    }, []);

    const handleClassCheckboxChange = (cls: ClassBrief, isChecked: boolean) => {
        const subIds = cls.subClasses.map(s => s.id);
        setSelectedSubclassIds(prev => {
            const withoutClass = prev.filter(id => !subIds.includes(id));
            return isChecked ? [...withoutClass, ...subIds] : withoutClass;
        });
    };

    const handleSubclassCheckboxChange = (subClassId: number, isChecked: boolean) => {
        setSelectedSubclassIds(prev => {
            if (isChecked) return prev.includes(subClassId) ? prev : [...prev, subClassId];
            return prev.filter(id => id !== subClassId);
        });
    };

    const handleGenerate = async () => {
        if (selectedSubclassIds.length === 0) {
            toast.error('Select at least one class first.');
            return;
        }

        // Selection order follows academic class order, not click order, so
        // multiple downloads come out Form 1 -> Form 5 regardless of how they
        // were ticked.
        const targets: { subClassId: number; className: string; subClassName: string }[] = [];
        for (const cls of classes) {
            for (const sub of cls.subClasses) {
                if (selectedSubclassIds.includes(sub.id)) {
                    targets.push({ subClassId: sub.id, className: cls.name, subClassName: sub.name });
                }
            }
        }

        setIsGenerating(true);
        const toastId = toast.loading(`Preparing ${targets.length} PDF${targets.length === 1 ? '' : 's'}...`);
        let succeeded = 0;
        const failed: string[] = [];

        for (const target of targets) {
            try {
                const params = selectedAcademicYear?.id
                    ? `?academic_year_id=${selectedAcademicYear.id}`
                    : '';
                const res = await apiService.get<{ success: boolean; data: EnrolledStudent[] }>(
                    `/students/subclass/${target.subClassId}${params}`
                );
                const students = (res?.data ?? []).slice().sort((a, b) =>
                    (a.student?.name || '').localeCompare(b.student?.name || '', undefined, { sensitivity: 'base' })
                );
                generateAttendancePdf({
                    className: target.className,
                    subClassName: target.subClassName,
                    academicYearName: selectedAcademicYear?.name,
                    students,
                });
                succeeded++;
            } catch {
                failed.push(`${target.className} ${target.subClassName}`);
            }
        }

        setIsGenerating(false);
        if (failed.length === 0) {
            toast.success(`Downloaded ${succeeded} PDF${succeeded === 1 ? '' : 's'}.`, { id: toastId });
        } else if (succeeded > 0) {
            toast.error(`Downloaded ${succeeded}, failed: ${failed.join(', ')}`, { id: toastId });
        } else {
            toast.error('Failed to generate PDFs.', { id: toastId });
        }
    };

    return (
        <div className="p-4 md:p-6 space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <DocumentTextIcon className="w-7 h-7 text-indigo-600" />
                    Forms
                </h1>
                <p className="text-sm text-gray-500 mt-1">Generate printable forms for class teachers to fill in by hand.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Form Type</CardTitle>
                </CardHeader>
                <CardBody className="space-y-2">
                    {FORM_TYPES.map(ft => (
                        <label
                            key={ft.key}
                            className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${formType === ft.key ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:bg-gray-50'
                                }`}
                        >
                            <input
                                type="radio"
                                name="formType"
                                checked={formType === ft.key}
                                onChange={() => setFormType(ft.key)}
                                className="mt-1 h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                            />
                            <span>
                                <span className="flex items-center gap-1.5 font-medium text-gray-800">
                                    <ClipboardDocumentCheckIcon className="w-4 h-4 text-gray-500" />
                                    {ft.label}
                                </span>
                                <span className="block text-xs text-gray-500 mt-0.5">{ft.description}</span>
                            </span>
                        </label>
                    ))}
                    <p className="text-xs text-gray-400 pt-1">More form types will appear here later.</p>
                </CardBody>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Select Class(es)</CardTitle>
                </CardHeader>
                <CardBody>
                    <p className="text-xs text-gray-500 mb-2">
                        Ticking a class selects <span className="font-medium">all its subclasses</span> — untick individual ones below if you only need some. Each class gets its own PDF.
                    </p>
                    {isLoadingClasses ? (
                        <p className="text-sm text-gray-500 bg-gray-50 p-3 rounded-md">Loading classes...</p>
                    ) : classes.length === 0 ? (
                        <p className="text-sm text-gray-500 bg-gray-50 p-3 rounded-md">No classes found.</p>
                    ) : (
                        <div className="max-h-80 overflow-y-auto border border-gray-300 rounded-md p-3 space-y-3 bg-white">
                            {classes.map(cls => {
                                const subIds = cls.subClasses.map(s => s.id);
                                const selectedCount = subIds.filter(id => selectedSubclassIds.includes(id)).length;
                                const allSelected = subIds.length > 0 && selectedCount === subIds.length;
                                const partiallySelected = selectedCount > 0 && !allSelected;
                                return (
                                    <div key={cls.id}>
                                        <div className="flex items-center">
                                            <input
                                                type="checkbox"
                                                id={`forms-class-${cls.id}`}
                                                checked={allSelected}
                                                ref={(el) => { if (el) el.indeterminate = partiallySelected; }}
                                                onChange={(e) => handleClassCheckboxChange(cls, e.target.checked)}
                                                disabled={isGenerating || subIds.length === 0}
                                                className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                            />
                                            <label htmlFor={`forms-class-${cls.id}`} className="ml-2 block text-sm font-medium text-gray-800 cursor-pointer">
                                                {cls.name}
                                                <span className="ml-1.5 text-xs font-normal text-gray-500">
                                                    {subIds.length === 0 ? '(no subclasses)' : `(${selectedCount}/${subIds.length})`}
                                                </span>
                                            </label>
                                        </div>
                                        {subIds.length > 0 && (
                                            <div className="ml-6 mt-1.5 flex flex-wrap gap-x-4 gap-y-1.5">
                                                {cls.subClasses.map(sub => (
                                                    <div key={sub.id} className="flex items-center">
                                                        <input
                                                            type="checkbox"
                                                            id={`forms-subclass-${sub.id}`}
                                                            checked={selectedSubclassIds.includes(sub.id)}
                                                            onChange={(e) => handleSubclassCheckboxChange(sub.id, e.target.checked)}
                                                            disabled={isGenerating}
                                                            className="h-3.5 w-3.5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                                        />
                                                        <label htmlFor={`forms-subclass-${sub.id}`} className="ml-1.5 block text-xs text-gray-600 cursor-pointer">
                                                            {sub.name}
                                                        </label>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardBody>
            </Card>

            <div className="flex justify-end">
                <Button
                    color="primary"
                    leftIcon={PrinterIcon}
                    isLoading={isGenerating}
                    disabled={isGenerating || selectedSubclassIds.length === 0}
                    onClick={handleGenerate}
                >
                    {isGenerating
                        ? 'Generating…'
                        : `Generate PDF${selectedSubclassIds.length === 1 ? '' : 's'} (${selectedSubclassIds.length})`}
                </Button>
            </div>
        </div>
    );
}
