import jsPDF from 'jspdf';
import { toast } from 'react-hot-toast';

// Client-side timetable PDF renderer.
//
// One landscape A4 page per subclass, laid out so the whole week fits without
// overflow regardless of how many periods are in the bell schedule. The layout
// is fully deterministic: cell height = usable_height / period_count, so no
// scaling or clipping is ever needed.

export type PdfPeriodType = 'TEACHING' | 'BREAK' | 'PREP';

export interface PdfPeriod {
    id: string;
    name: string;
    dayOfWeek: string;
    startTime: string;
    endTime: string;
    sequence: number;
    type: PdfPeriodType;
}

export interface PdfAssignment {
    subjectName: string | null;
    teacherName: string | null;
}

export interface PdfSlot {
    periodId: string;
    assignments: PdfAssignment[];
}

export interface PdfSubclassTimetable {
    subClassId: string;
    subClassName: string;
    className?: string;
    periods: PdfPeriod[];
    slots: PdfSlot[];
}

const DAYS_ORDER = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];
const DAY_LABEL: Record<string, string> = {
    MONDAY: 'Monday',
    TUESDAY: 'Tuesday',
    WEDNESDAY: 'Wednesday',
    THURSDAY: 'Thursday',
    FRIDAY: 'Friday',
};

interface PeriodRow {
    sequence: number;
    label: PdfPeriod;
    byDay: Record<string, PdfPeriod | undefined>;
}

const buildRows = (periods: PdfPeriod[]): PeriodRow[] => {
    const bySeq = new Map<number, PeriodRow>();
    [...periods]
        .sort((a, b) => a.sequence - b.sequence || a.startTime.localeCompare(b.startTime))
        .forEach((p) => {
            let row = bySeq.get(p.sequence);
            if (!row) {
                row = { sequence: p.sequence, label: p, byDay: {} };
                bySeq.set(p.sequence, row);
            }
            row.byDay[p.dayOfWeek] = p;
            if (p.dayOfWeek === 'MONDAY') row.label = p;
        });
    return Array.from(bySeq.values()).sort((a, b) => a.sequence - b.sequence);
};

const formatTimeRange = (start: string, end: string) =>
    `${start.substring(0, 5)} - ${end.substring(0, 5)}`;

const slugify = (s: string) =>
    s.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'timetable';

// Shrink a string to fit inside `maxWidth` (in mm at the current font size),
// truncating with an ellipsis if it can't fit.
const clipText = (pdf: jsPDF, text: string, maxWidth: number): string => {
    if (!text) return '';
    if (pdf.getTextWidth(text) <= maxWidth) return text;
    const ell = '…';
    let s = text;
    while (s.length > 1 && pdf.getTextWidth(s + ell) > maxWidth) s = s.slice(0, -1);
    return s + ell;
};

const renderPage = (
    pdf: jsPDF,
    sub: PdfSubclassTimetable,
    meta: { schoolName?: string; academicYearName?: string },
) => {
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const margin = 8;

    pdf.setTextColor(0);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    const title = sub.className ? `${sub.className} — ${sub.subClassName}` : sub.subClassName;
    pdf.text(title, pageW / 2, margin + 5, { align: 'center' });

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    const subtitle = ['Weekly Timetable', meta.academicYearName].filter(Boolean).join(' • ');
    if (subtitle) pdf.text(subtitle, pageW / 2, margin + 10, { align: 'center' });

    const gridTop = margin + 14;
    const gridLeft = margin;
    const gridRight = pageW - margin;
    const gridBottom = pageH - margin - 4;
    const gridW = gridRight - gridLeft;
    const gridH = gridBottom - gridTop;

    const rows = buildRows(sub.periods);
    if (rows.length === 0) {
        pdf.setFontSize(11);
        pdf.text('No timetable data for this class.', pageW / 2, gridTop + 20, { align: 'center' });
        return;
    }

    const timeColW = 32;
    const dayColW = (gridW - timeColW) / DAYS_ORDER.length;
    const headerH = 9;
    const bodyH = gridH - headerH;
    const rowH = bodyH / rows.length;

    // Header row
    pdf.setFillColor(30, 64, 175);
    pdf.rect(gridLeft, gridTop, gridW, headerH, 'F');
    pdf.setTextColor(255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.text('Period / Time', gridLeft + timeColW / 2, gridTop + headerH / 2 + 1.2, { align: 'center' });
    DAYS_ORDER.forEach((day, i) => {
        pdf.text(
            DAY_LABEL[day] ?? day,
            gridLeft + timeColW + dayColW * i + dayColW / 2,
            gridTop + headerH / 2 + 1.2,
            { align: 'center' },
        );
    });

    const slotsByPeriod = new Map<string, PdfSlot>();
    sub.slots.forEach((s) => slotsByPeriod.set(s.periodId, s));

    const bodyTop = gridTop + headerH;

    rows.forEach((row, ri) => {
        const y = bodyTop + rowH * ri;
        const isEven = ri % 2 === 0;

        // Row background stripe
        if (isEven) {
            pdf.setFillColor(248, 250, 252);
            pdf.rect(gridLeft, y, gridW, rowH, 'F');
        }

        // Time column
        pdf.setFillColor(238, 242, 255);
        pdf.rect(gridLeft, y, timeColW, rowH, 'F');
        pdf.setTextColor(30, 41, 59);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(9);
        const name = clipText(pdf, row.label.name || `Period ${row.label.sequence}`, timeColW - 3);
        pdf.text(name, gridLeft + timeColW / 2, y + rowH / 2 - 1, { align: 'center' });
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        pdf.text(
            formatTimeRange(row.label.startTime, row.label.endTime),
            gridLeft + timeColW / 2,
            y + rowH / 2 + 3,
            { align: 'center' },
        );

        // Day cells
        DAYS_ORDER.forEach((day, di) => {
            const x = gridLeft + timeColW + dayColW * di;
            const period = row.byDay[day];

            if (!period) return;

            if (period.type !== 'TEACHING') {
                pdf.setFillColor(226, 232, 240);
                pdf.rect(x, y, dayColW, rowH, 'F');
                pdf.setFont('helvetica', 'italic');
                pdf.setFontSize(9);
                pdf.setTextColor(71, 85, 105);
                pdf.text(
                    period.type === 'PREP' ? 'Preps' : 'Break',
                    x + dayColW / 2,
                    y + rowH / 2 + 1,
                    { align: 'center' },
                );
                return;
            }

            const slot = slotsByPeriod.get(period.id);
            const assignments = slot?.assignments ?? [];
            if (assignments.length === 0) return;

            const padX = 1.5;
            const innerW = dayColW - padX * 2;
            const subjSize = rowH < 8 ? 7 : rowH < 12 ? 8 : 9;
            const teachSize = subjSize - 1;
            const lineH = subjSize * 0.42;

            let ty = y + lineH + 1;
            const maxY = y + rowH - 1;

            assignments.forEach((a, idx) => {
                if (ty > maxY) return;

                if (idx > 0 && ty + lineH < maxY) {
                    pdf.setDrawColor(226, 232, 240);
                    pdf.line(x + padX, ty - lineH + 0.5, x + dayColW - padX, ty - lineH + 0.5);
                }

                pdf.setFont('helvetica', 'bold');
                pdf.setFontSize(subjSize);
                pdf.setTextColor(15, 23, 42);
                pdf.text(clipText(pdf, a.subjectName ?? '—', innerW), x + padX, ty);
                ty += lineH;

                if (ty > maxY) return;
                pdf.setFont('helvetica', 'normal');
                pdf.setFontSize(teachSize);
                pdf.setTextColor(71, 85, 105);
                pdf.text(clipText(pdf, a.teacherName ?? '', innerW), x + padX, ty);
                ty += lineH + 0.6;
            });
        });
    });

    // Grid outer + separators
    pdf.setDrawColor(148, 163, 184);
    pdf.setLineWidth(0.2);
    pdf.rect(gridLeft, gridTop, gridW, gridH);
    // Vertical column dividers
    pdf.line(gridLeft + timeColW, gridTop, gridLeft + timeColW, gridBottom);
    DAYS_ORDER.forEach((_, i) => {
        const x = gridLeft + timeColW + dayColW * (i + 1);
        pdf.line(x, gridTop, x, gridBottom);
    });
    // Horizontal row dividers
    pdf.line(gridLeft, gridTop + headerH, gridRight, gridTop + headerH);
    rows.forEach((_, ri) => {
        const y = bodyTop + rowH * (ri + 1);
        pdf.line(gridLeft, y, gridRight, y);
    });

    // Footer
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    pdf.setTextColor(148, 163, 184);
    pdf.text(
        `Generated ${new Date().toLocaleDateString()}`,
        pageW - margin,
        pageH - margin,
        { align: 'right' },
    );
    if (meta.schoolName) {
        pdf.text(meta.schoolName, margin, pageH - margin);
    }
};

export const downloadTimetablesPdf = async (
    subs: PdfSubclassTimetable[],
    meta: { schoolName?: string; academicYearName?: string } = {},
): Promise<boolean> => {
    if (subs.length === 0) {
        toast.error('Pick at least one class to print.');
        return false;
    }

    const toastId = toast.loading(
        subs.length === 1 ? 'Preparing timetable PDF...' : `Preparing ${subs.length} timetables...`,
    );

    try {
        const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
        subs.forEach((sub, i) => {
            if (i > 0) pdf.addPage();
            renderPage(pdf, sub, meta);
        });

        const filename =
            subs.length === 1
                ? `timetable_${slugify(subs[0].subClassName)}.pdf`
                : `timetables_${subs.length}_classes.pdf`;
        pdf.save(filename);
        toast.success(
            subs.length === 1 ? 'Timetable PDF downloaded.' : `${subs.length} timetables downloaded.`,
            { id: toastId },
        );
        return true;
    } catch (err) {
        const message = err instanceof Error ? err.message : 'PDF generation failed';
        console.error('Client timetable PDF failed:', err);
        toast.error(`Could not create PDF. ${message}`, { id: toastId });
        return false;
    }
};
