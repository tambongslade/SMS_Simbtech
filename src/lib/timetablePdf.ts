import { toast } from 'react-hot-toast';
import apiService from '@/lib/apiService';

// Server-rendered timetable PDFs (landscape A4 grids). The backend owns the
// layout; the frontend only asks for the right endpoint and saves the blob.
//
//   GET /timetables/subclass/:subclassId/export/pdf   any authenticated user
//   GET /timetables/full-school/export/pdf            SM / PRINCIPAL / VP / MANAGER / DEAN
//   GET /teachers/me/timetable/export/pdf             TEACHER
//   GET /timetables/teacher/:teacherId/export/pdf     SM / PRINCIPAL / VP / MANAGER / DEAN
//
// All of them accept an optional ?academicYearId and default to the current year.

const fileNamePart = (value: string | undefined | null, fallback: string): string => {
    const cleaned = (value ?? '').trim().replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    return cleaned || fallback;
};

const saveBlob = (blob: Blob, filename: string) => {
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(downloadUrl);
};

const downloadPdf = async (
    endpoint: string,
    filename: string,
    academicYearId?: string | number | null,
): Promise<void> => {
    // `silent` keeps apiService from toasting as well — the caller below owns
    // the single loading -> success/error toast for the whole download.
    const options = {
        silent: true,
        ...(academicYearId ? { params: { academicYearId: String(academicYearId) } } : {}),
    };
    const blob = await apiService.get<Blob>(endpoint, options, 'blob');

    if (!(blob instanceof Blob) || blob.size === 0) {
        throw new Error('The server returned an empty file.');
    }
    saveBlob(blob, filename);
};

/** Wraps a download in a single loading/success/error toast. Never throws. */
const withToast = async (task: Promise<void>, label: string): Promise<boolean> => {
    const toastId = toast.loading(`Preparing ${label} PDF...`);
    try {
        await task;
        toast.success(`${label} PDF downloaded.`, { id: toastId });
        return true;
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Download failed';
        console.error(`Timetable PDF export failed (${label}):`, error);
        toast.error(`Could not download the ${label} PDF. ${message}`, { id: toastId });
        return false;
    }
};

/** One subclass's weekly timetable. */
export const downloadSubclassTimetablePdf = (
    subClassId: string | number,
    subClassName?: string,
    academicYearId?: string | number | null,
) => withToast(
    downloadPdf(
        `/timetables/subclass/${subClassId}/export/pdf`,
        `timetable_${fileNamePart(subClassName, `subclass_${subClassId}`)}.pdf`,
        academicYearId,
    ),
    'timetable',
);

/** Every subclass in the school, one page each. */
export const downloadFullSchoolTimetablePdf = (
    academicYearName?: string | null,
    academicYearId?: string | number | null,
) => withToast(
    downloadPdf(
        '/timetables/full-school/export/pdf',
        `timetable_full_school${academicYearName ? `_${fileNamePart(academicYearName, 'year')}` : ''}.pdf`,
        academicYearId,
    ),
    'full school timetable',
);

/** The signed-in teacher's own timetable. */
export const downloadMyTimetablePdf = (academicYearId?: string | number | null) => withToast(
    downloadPdf('/teachers/me/timetable/export/pdf', 'my_timetable.pdf', academicYearId),
    'timetable',
);

/** Any teacher's timetable — management roles only. */
export const downloadTeacherTimetablePdf = (
    teacherId: string | number,
    teacherName?: string,
    academicYearId?: string | number | null,
) => withToast(
    downloadPdf(
        `/timetables/teacher/${teacherId}/export/pdf`,
        `timetable_teacher_${fileNamePart(teacherName, String(teacherId))}.pdf`,
        academicYearId,
    ),
    'teacher timetable',
);
