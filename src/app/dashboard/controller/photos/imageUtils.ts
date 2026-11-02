import apiService from '@/lib/apiService';

// Student photos are square, the standard 4 x 4 inch format: always exactly 1200 x 1200 px (300 dpi). Phone
// cameras produce 3-8 MB frames, which the backend rejects above 5 MB and which are slow over the school
// Wi-Fi, so every photo is cropped to the centre square and resized first.
const OUTPUT_SIZE = 1200;
const TARGET_RATIO = 1;

function cropToJpeg(source: CanvasImageSource, width: number, height: number): Promise<Blob> {
  let sw = width;
  let sh = height;
  let sx = 0;
  let sy = 0;
  if (width / height > TARGET_RATIO) {
    sw = Math.round(height * TARGET_RATIO);
    sx = Math.round((width - sw) / 2);
  } else {
    sh = Math.round(width / TARGET_RATIO);
    sy = Math.round((height - sh) / 2);
  }
  const canvas = document.createElement('canvas');
  canvas.width = OUTPUT_SIZE;
  canvas.height = OUTPUT_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return Promise.reject(new Error('Canvas is not available'));
  ctx.drawImage(source, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not encode the photo'))), 'image/jpeg', 0.85);
  });
}

/** Crop the centre of a live <video> frame to a square JPEG. */
export function videoFrameToJpeg(video: HTMLVideoElement): Promise<Blob> {
  return cropToJpeg(video, video.videoWidth, video.videoHeight);
}

/** Crop and shrink a picked/captured image file to a square JPEG (honours EXIF rotation). */
export async function fileToJpeg(file: File): Promise<Blob> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
      try {
        return await cropToJpeg(bitmap, bitmap.width, bitmap.height);
      } finally {
        bitmap.close();
      }
    } catch {
      /* fall through to the <img> path */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return await cropToJpeg(img, img.naturalWidth, img.naturalHeight);
  } finally {
    URL.revokeObjectURL(url);
  }
}

interface UploadResponse {
  success: boolean;
  data?: { filename?: string };
}

/** Upload the photo, then make it the student's photo for the given academic year. Returns the stored filename. */
export async function saveStudentPhoto(studentId: number, photo: Blob, academicYearId: number): Promise<string> {
  const form = new FormData();
  form.append('photo', new File([photo], `student-${studentId}.jpg`, { type: 'image/jpeg' }));
  const uploaded = await apiService.post<UploadResponse>(`/students/${studentId}/photo`, form);
  const filename = uploaded?.data?.filename;
  if (!uploaded?.success || !filename) throw new Error('The photo could not be uploaded');
  await apiService.put(`/students/${studentId}/enrollment-photo`, {
    photo_filename: filename,
    academic_year_id: academicYearId,
  });
  return filename;
}

/** Delete the student's photo for the given academic year. */
export async function deleteStudentPhoto(studentId: number, academicYearId: number): Promise<void> {
  await apiService.delete(`/students/${studentId}/enrollment-photo?academic_year_id=${academicYearId}`);
}
