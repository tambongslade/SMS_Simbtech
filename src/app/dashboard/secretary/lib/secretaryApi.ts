import apiService from '@/lib/apiService';
import { sortClassesByLevel, sortSubClassesByLevel } from '@/lib/classOrdering';

// ---- Shared types for the Secretary dashboard ----

// Parent/guardian relationship is now a validated enum on the backend.
export type Relationship = 'FATHER' | 'MOTHER' | 'SIBLING' | 'GUARDIAN';

export type SecretaryStudent = {
  id: number;
  name: string;
  nom?: string;
  prenom?: string;
  matricule?: string;
  className?: string;
  classId?: number;
  subClassName?: string;
  subClassId?: number;
  academicYearId?: number;
  date_of_birth?: string;
  place_of_birth?: string;
  gender?: string;
  residence?: string;
  former_school?: string;
  status?: string;
  is_new_student?: boolean;
  photo?: string | null;
  photoUrl?: string | null;
  hasPhoto?: boolean;
  reamOfPaperCollected?: boolean;
};

export type SecretaryTeacher = {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  gender?: string;
  matricule?: string;
  subjects?: { id: number; name: string }[];
};

export type ClassInfo = { id: number; name: string };
export type SubClassInfo = { id: number; name: string; classId?: number };

export type Paginated<T> = { data: T[]; meta?: { total?: number } };

// ---- Create payloads ----

// A parent/guardian contact. name, phone and address are required; the rest are
// optional. When phoneIsWhatsapp is true the backend copies phone into the
// WhatsApp number, so whatsapp can be omitted. No email is collected.
export interface ParentContactPayload {
  name: string;
  phone: string;
  address: string;
  phoneIsWhatsapp?: boolean;
  whatsapp?: string;
  relationship?: Relationship;
}

export interface CreateStudentPayload {
  studentNom: string;
  studentPrenom: string;
  dateOfBirth: string;
  placeOfBirth: string;
  gender: 'MALE' | 'FEMALE' | '';
  residence: string;
  formerSchool: string;
  classId: number;
  academicYearId: number;
  isNewStudent: boolean;
  // Only meaningful for new students; the server forces false for old students.
  reamOfPaperCollected?: boolean;
  // 1 required, 2 max. The backend also accepts legacy single-parent fields.
  parents: ParentContactPayload[];
}

export interface CreateTeacherPayload {
  name: string;
  email: string;
  phone?: string;
  gender: string;
  date_of_birth: string;
  address?: string;
  password: string;
}

// ---- Fetch helpers ----

export const fetchClasses = async (): Promise<ClassInfo[]> => {
  const res = await apiService.get<Paginated<ClassInfo>>('/classes?limit=100');
  return sortClassesByLevel(res.data || []);
};

export const fetchSubClasses = async (): Promise<SubClassInfo[]> => {
  const res = await apiService.get<Paginated<SubClassInfo>>('/classes/sub-classes?limit=100');
  return sortSubClassesByLevel(res.data || []);
};

// The /students endpoint nests class/subclass under enrollments[]; flatten the
// enrollment for the requested academic year (or the most recent one).
const mapStudent = (s: any, academicYearId?: number): SecretaryStudent => {
  const enrollments: any[] = s.enrollments || [];
  const current =
    enrollments.find(
      (e: any) => String(e.academicYearId ?? e.academic_year_id) === String(academicYearId),
    ) || enrollments[enrollments.length - 1] || enrollments[0];

  // subClass may be absent when the student is only assigned to a class.
  const subClass = current?.subClass ?? current?.sub_class;

  return {
    id: s.id,
    name: s.name,
    nom: s.nom,
    prenom: s.prenom,
    matricule: s.matricule,
    gender: s.gender,
    status: s.status,
    date_of_birth: s.dateOfBirth ?? s.date_of_birth,
    place_of_birth: s.placeOfBirth ?? s.place_of_birth,
    residence: s.residence,
    former_school: s.formerSchool ?? s.former_school,
    is_new_student: s.isNewStudent ?? s.is_new_student,
    subClassName: subClass?.name,
    subClassId: subClass?.id,
    className: subClass?.class?.name ?? current?.class?.name,
    classId: current?.classId ?? current?.class_id,
    academicYearId: current?.academicYearId ?? current?.academic_year_id,
    photo: s.photo ?? current?.photo,
    photoUrl: s.photoUrl,
    hasPhoto: s.hasPhoto,
    reamOfPaperCollected: current?.reamOfPaperCollected ?? false,
  };
};

export const fetchStudents = async (params: {
  academicYearId?: number;
  subClassId?: number | string;
  page?: number;
  limit?: number;
}): Promise<Paginated<SecretaryStudent>> => {
  const qs = new URLSearchParams();
  qs.append('page', String(params.page ?? 1));
  qs.append('limit', String(params.limit ?? 20));
  if (params.academicYearId) qs.append('academicYearId', String(params.academicYearId));
  if (params.subClassId && params.subClassId !== 'all') qs.append('subClassId', String(params.subClassId));
  const res = await apiService.get<{ data: any[]; meta?: { total?: number } }>(`/students?${qs.toString()}`);
  return {
    data: (res.data || []).map((s) => mapStudent(s, params.academicYearId)),
    meta: res.meta,
  };
};

// Server-side search across name, matricule, parents, class/subclass, etc.
// Response is double-nested: { data: { data: [...], meta } }.
export const searchStudents = async (params: {
  q: string;
  academicYearId?: number;
  page?: number;
  limit?: number;
}): Promise<Paginated<SecretaryStudent>> => {
  const qs = new URLSearchParams();
  qs.append('q', params.q);
  qs.append('page', String(params.page ?? 1));
  qs.append('limit', String(params.limit ?? 20));
  if (params.academicYearId) qs.append('academicYearId', String(params.academicYearId));
  const res = await apiService.get<{ data: { data: any[]; meta?: { total?: number } } }>(
    `/students/search?${qs.toString()}`,
  );
  const inner = res.data || ({} as { data: any[]; meta?: { total?: number } });
  return {
    data: (inner.data || []).map((s) => mapStudent(s, params.academicYearId)),
    meta: inner.meta,
  };
};

export const fetchTeachers = async (params: {
  academicYearId?: number;
  page?: number;
  limit?: number;
}): Promise<Paginated<SecretaryTeacher>> => {
  const qs = new URLSearchParams();
  qs.append('role', 'TEACHER');
  qs.append('page', String(params.page ?? 1));
  qs.append('limit', String(params.limit ?? 50));
  if (params.academicYearId) qs.append('academicYearId', String(params.academicYearId));
  return apiService.get<Paginated<SecretaryTeacher>>(`/users?${qs.toString()}`);
};

// ---- Create helpers ----

export const createStudentWithParent = (payload: CreateStudentPayload) =>
  apiService.post<{ data: { student?: { id: number }; enrollment?: { id: number } } }>(
    '/bursar/create-parent-with-student',
    payload,
  );

// ---- Class / subclass assignment ----

export const assignStudentClass = (
  id: number,
  classId: number,
  academicYearId?: number,
  reamOfPaperCollected?: boolean,
) =>
  apiService.post(`/students/${id}/assign-class`, {
    classId,
    ...(academicYearId ? { academicYearId } : {}),
    ...(reamOfPaperCollected !== undefined ? { reamOfPaperCollected } : {}),
  });

export const enrollStudentInSubclass = (
  id: number,
  subClassId: number,
  academicYearId?: number,
  reamOfPaperCollected?: boolean,
) =>
  apiService.post(`/students/${id}/enroll`, {
    subClassId,
    ...(academicYearId ? { academicYearId } : {}),
    ...(reamOfPaperCollected !== undefined ? { reamOfPaperCollected } : {}),
  });

/**
 * Sets a student's class/subclass for the academic year. Enrolling into a
 * subclass also sets its parent class; if only a class is given we assign it.
 */
export const changeStudentClass = async (
  id: number,
  opts: { classId?: number; subClassId?: number; academicYearId?: number; reamOfPaperCollected?: boolean },
) => {
  if (opts.subClassId) {
    return enrollStudentInSubclass(id, opts.subClassId, opts.academicYearId, opts.reamOfPaperCollected);
  }
  if (opts.classId) {
    return assignStudentClass(id, opts.classId, opts.academicYearId, opts.reamOfPaperCollected);
  }
  throw new Error('Select a class or subclass.');
};

// Editable student detail fields (mistake corrections). PUT /students/:id
// accepts these; the server resyncs name = "${nom} ${prenom}".
export interface UpdateStudentPayload {
  nom: string;
  prenom: string;
  matricule?: string | null;
  dateOfBirth?: string | null;
  placeOfBirth?: string | null;
  gender?: string | null;
  residence?: string | null;
  former_school?: string | null;
  is_new_student?: boolean;
  // Enrollment-scoped: only send when the student is enrolled for a year,
  // otherwise the backend rejects the whole update.
  reamOfPaperCollected?: boolean;
  academicYearId?: number;
}

export const updateStudent = (id: number, payload: UpdateStudentPayload) =>
  apiService.put(`/students/${id}`, {
    name: `${payload.nom} ${payload.prenom}`.trim(),
    ...payload,
  });

// Parents are separate user accounts linked to the student; contact fixes go
// through the user update endpoint. Only send the fields that changed.
export const updateParentContact = (
  parentId: number,
  patch: { name?: string; phone?: string; address?: string },
) => apiService.put(`/users/${parentId}`, patch);

// ---- Linking additional parents ----
// New parent accounts can only be created during student registration; for an
// existing student we search the existing parent accounts and link one.

export type AvailableParent = {
  id: number;
  matricule?: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  childrenCount?: number;
  children?: { id: number; name: string; className?: string }[];
};

export const searchAvailableParents = async (
  search: string,
  limit = 10,
): Promise<AvailableParent[]> => {
  const qs = new URLSearchParams();
  if (search) qs.append('search', search);
  qs.append('limit', String(limit));
  const res = await apiService.get<{ data: AvailableParent[] }>(
    `/bursar/available-parents?${qs.toString()}`,
  );
  return res.data || [];
};

export const linkExistingParent = (
  studentId: number,
  parentId: number,
  relationship?: Relationship,
) =>
  apiService.post('/bursar/link-existing-parent', {
    studentId,
    parentId,
    ...(relationship ? { relationship } : {}),
  });

export interface CreateParentForStudentPayload {
  studentId: number;
  name: string;
  phone: string;
  address?: string;
  phoneIsWhatsapp?: boolean;
  whatsapp?: string;
  relationship?: Relationship;
  academicYearId?: number;
}

export const createParentForStudent = (payload: CreateParentForStudentPayload) =>
  apiService.post('/bursar/create-parent-for-student', payload);

/**
 * Toggles ream-of-paper collected on the student's current-year enrollment.
 * Calls PUT /students/:id which writes to the enrollment row for the given year.
 */
export const updateReamOfPaper = (
  id: number,
  reamOfPaperCollected: boolean,
  academicYearId?: number,
) =>
  apiService.put(`/students/${id}`, {
    reamOfPaperCollected,
    ...(academicYearId ? { academicYearId } : {}),
  });

/**
 * Unenrolls (dismisses) a student from an academic year. Defaults to the current
 * year when academicYearId is omitted. The backend returns 409 if the student has
 * marks/attendance/discipline/payment records for that year (history is protected).
 */
export const unenrollStudent = (id: number, academicYearId?: number) =>
  apiService.post(`/students/${id}/unenroll`, academicYearId ? { academicYearId } : {});

export const deleteStudent = (id: number) =>
  apiService.delete(`/students/${id}`);

// ---- Student profile ----

export const fetchStudentProfile = async (id: number, academicYearId?: number): Promise<any> => {
  const qs = academicYearId ? `?academicYearId=${academicYearId}` : '';
  const res = await apiService.get<{ data: any }>(`/students/${id}/full-profile${qs}`);
  return res.data;
};

/**
 * Creates a teacher: registers the user then assigns the TEACHER role for the
 * current academic year (the same flow personnel management uses).
 */
export const createTeacher = async (payload: CreateTeacherPayload, academicYearId?: number) => {
  const res = await apiService.post<{ data: { id: number; name: string } }>('/auth/register', payload);
  const newUser = res.data;
  if (newUser?.id) {
    await apiService.put(`/users/${newUser.id}/roles/academic-year`, {
      roles: ['TEACHER'],
      ...(academicYearId ? { academicYearId } : {}),
    });
  }
  return newUser;
};

// ---- Export / download helpers ----

export const downloadBlob = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

const buildExportQuery = (format: string, academicYearId?: number) => {
  const qs = new URLSearchParams();
  qs.append('format', format);
  if (academicYearId) qs.append('academicYearId', String(academicYearId));
  return qs.toString();
};

// PDF uses the dedicated export/pdf endpoints; other formats use the generic
// export endpoint with a format query.
export const exportSubclassList = async (
  subClassId: number,
  format: 'pdf' | 'docx',
  academicYearId?: number,
): Promise<Blob> => {
  if (format === 'pdf') {
    const qs = academicYearId ? `?academicYearId=${academicYearId}` : '';
    return apiService.get<Blob>(`/students/subclass/${subClassId}/export/pdf${qs}`, undefined, 'blob');
  }
  return apiService.get<Blob>(
    `/students/subclass/${subClassId}/export?${buildExportQuery(format, academicYearId)}`,
    undefined,
    'blob',
  );
};

export const exportClassList = async (
  classId: number,
  format: 'pdf' | 'docx',
  academicYearId?: number,
): Promise<Blob> => {
  if (format === 'pdf') {
    const qs = academicYearId ? `?academicYearId=${academicYearId}` : '';
    return apiService.get<Blob>(`/students/class/${classId}/export/pdf${qs}`, undefined, 'blob');
  }
  return apiService.get<Blob>(
    `/students/class/${classId}/export?${buildExportQuery(format, academicYearId)}`,
    undefined,
    'blob',
  );
};
