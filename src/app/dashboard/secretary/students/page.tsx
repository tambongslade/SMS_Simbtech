'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import {
  MagnifyingGlassIcon,
  UserPlusIcon,
  PhotoIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  EyeIcon,
  ArrowsRightLeftIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '@/components/context/AuthContext';
import { Button, Input, Select, Modal, StudentPhoto, BulkPhotoUploadModal } from '@/components/ui';
import {
  fetchStudents,
  searchStudents,
  fetchSubClasses,
  fetchClasses,
  createStudentWithParent,
  enrollStudentInSubclass,
  changeStudentClass,
  type SecretaryStudent,
  type SubClassInfo,
  type ClassInfo,
  type CreateStudentPayload,
} from '../lib/secretaryApi';

const emptyForm: CreateStudentPayload = {
  studentName: '',
  dateOfBirth: '',
  placeOfBirth: '',
  gender: '',
  residence: '',
  formerSchool: '',
  classId: 0,
  academicYearId: 0,
  isNewStudent: true,
  parentName: '',
  parentPhone: '',
  parentWhatsapp: '',
  parentEmail: '',
  parentAddress: '',
  relationship: 'PARENT',
};

const LIMIT = 20;

export default function SecretaryStudentsPage() {
  const { selectedAcademicYear } = useAuth();
  const router = useRouter();

  const [students, setStudents] = useState<SecretaryStudent[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const [subClasses, setSubClasses] = useState<SubClassInfo[]>([]);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [subClassFilter, setSubClassFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Create student
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [form, setForm] = useState<CreateStudentPayload>(emptyForm);
  const [createSubClassId, setCreateSubClassId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Bulk photos
  const [isBulkOpen, setIsBulkOpen] = useState(false);

  // Change class
  const [changingStudent, setChangingStudent] = useState<SecretaryStudent | null>(null);
  const [changeClassId, setChangeClassId] = useState('');
  const [changeSubClassId, setChangeSubClassId] = useState('');
  const [isChanging, setIsChanging] = useState(false);

  // Debounce the search input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 400);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const loadStudents = useCallback(async () => {
    setIsLoading(true);
    try {
      const academicYearId = selectedAcademicYear?.id;
      const res = debouncedSearch
        ? await searchStudents({ q: debouncedSearch, academicYearId, page, limit: LIMIT })
        : await fetchStudents({ academicYearId, subClassId: subClassFilter, page, limit: LIMIT });
      setStudents(res.data || []);
      setTotal(res.meta?.total ?? res.data?.length ?? 0);
    } catch {
      setStudents([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedAcademicYear?.id, subClassFilter, page, debouncedSearch]);

  useEffect(() => {
    fetchSubClasses().then(setSubClasses).catch(() => setSubClasses([]));
    fetchClasses().then(setClasses).catch(() => setClasses([]));
  }, []);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  // Reset to first page when the filter or search changes
  useEffect(() => {
    setPage(1);
  }, [subClassFilter, debouncedSearch]);

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  const classNameFor = useCallback(
    (student: SecretaryStudent) =>
      student.className || classes.find((c) => c.id === student.classId)?.name,
    [classes],
  );

  const subClassesForClass = useCallback(
    (classIdStr: string) =>
      classIdStr ? subClasses.filter((sc) => String(sc.classId) === classIdStr) : [],
    [subClasses],
  );

  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAcademicYear) {
      toast.error('Please select an academic year first.');
      return;
    }
    if (!form.studentName || !form.classId || !form.parentName || !form.parentPhone || !form.parentAddress) {
      toast.error('Student name, class, parent name, parent phone and parent address are required.');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await createStudentWithParent({
        ...form,
        classId: Number(form.classId),
        academicYearId: selectedAcademicYear.id,
        isNewStudent: true,
      });
      const newStudentId = res?.data?.student?.id;
      if (createSubClassId && newStudentId) {
        try {
          await enrollStudentInSubclass(newStudentId, Number(createSubClassId), selectedAcademicYear.id);
        } catch {
          toast.error('Student created, but assigning the subclass failed. You can set it via Change Class.');
        }
      }
      toast.success('Student registered successfully.');
      setIsCreateOpen(false);
      setForm(emptyForm);
      setCreateSubClassId('');
      setPage(1);
      loadStudents();
    } catch (error: any) {
      if (error?.message !== 'Unauthorized') {
        toast.error(error?.message || 'Failed to register student.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const openChangeClass = (student: SecretaryStudent) => {
    setChangingStudent(student);
    setChangeClassId(student.classId ? String(student.classId) : '');
    setChangeSubClassId(student.subClassId ? String(student.subClassId) : '');
  };

  const handleChangeClass = async () => {
    if (!changingStudent) return;
    if (!changeClassId && !changeSubClassId) {
      toast.error('Select a class or subclass.');
      return;
    }
    setIsChanging(true);
    try {
      await changeStudentClass(changingStudent.id, {
        classId: changeClassId ? Number(changeClassId) : undefined,
        subClassId: changeSubClassId ? Number(changeSubClassId) : undefined,
        academicYearId: selectedAcademicYear?.id,
      });
      toast.success(`Class updated for ${changingStudent.name}.`);
      setChangingStudent(null);
      loadStudents();
    } catch (error: any) {
      if (error?.message !== 'Unauthorized') {
        toast.error(error?.message || 'Failed to change class.');
      }
    } finally {
      setIsChanging(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Students</h1>
          <p className="text-gray-600 mt-1">
            Register students, view profiles and manage classes &amp; photos.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            color="primary"
            leftIcon={PhotoIcon}
            onClick={() => {
              if (students.length === 0) {
                toast.error('No students loaded to upload photos for.');
                return;
              }
              setIsBulkOpen(true);
            }}
          >
            Bulk Photos
          </Button>
          <Button color="primary" leftIcon={UserPlusIcon} onClick={() => setIsCreateOpen(true)}>
            Register Student
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[240px]">
          <Input
            label="Search"
            placeholder="Name, matricule, parent, class, residence…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            leftIcon={<MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />}
            helperText="Searches all students on the server."
          />
        </div>
        <div className="min-w-[200px]">
          <Select
            label="Subclass"
            value={subClassFilter}
            onChange={(e) => setSubClassFilter(e.target.value)}
            disabled={!!debouncedSearch}
            helperText={debouncedSearch ? 'Clear search to filter by subclass' : undefined}
            options={[
              { value: 'all', label: 'All subclasses' },
              ...subClasses.map((sc) => ({ value: String(sc.id), label: sc.name })),
            ]}
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Photo</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Matricule</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Class</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subclass</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Gender</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    Loading students…
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    No students found.
                  </td>
                </tr>
              ) : (
                students.map((student) => (
                  <tr
                    key={student.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => router.push(`/dashboard/secretary/students/${student.id}`)}
                  >
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <StudentPhoto
                        studentId={student.id}
                        photo={student.photo}
                        size="sm"
                        showUploadButton
                        canUpload
                        fetchPhoto
                        studentName={student.name}
                        onPhotoUpdate={() => loadStudents()}
                      />
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{student.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{student.matricule || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{classNameFor(student) || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{student.subClassName || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{student.gender || '—'}</td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="xs"
                          leftIcon={EyeIcon}
                          onClick={() => router.push(`/dashboard/secretary/students/${student.id}`)}
                        >
                          View
                        </Button>
                        <Button
                          variant="outline"
                          size="xs"
                          color="secondary"
                          leftIcon={ArrowsRightLeftIcon}
                          onClick={() => openChangeClass(student)}
                        >
                          Change Class
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
          <span className="text-sm text-gray-600">
            {total} student{total === 1 ? '' : 's'} · Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={ChevronLeftIcon}
              disabled={page <= 1 || isLoading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              rightIcon={ChevronRightIcon}
              disabled={page >= totalPages || isLoading}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      {/* Create student modal */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Register Student" size="lg">
        <form onSubmit={handleCreate} className="space-y-5">
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Student Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Full Name *" name="studentName" value={form.studentName} onChange={handleFormChange} required />
              <Input label="Date of Birth" name="dateOfBirth" type="date" value={form.dateOfBirth} onChange={handleFormChange} />
              <Input label="Place of Birth" name="placeOfBirth" value={form.placeOfBirth} onChange={handleFormChange} />
              <Select
                label="Gender"
                name="gender"
                value={form.gender}
                onChange={handleFormChange}
                options={[
                  { value: '', label: 'Select gender' },
                  { value: 'MALE', label: 'Male' },
                  { value: 'FEMALE', label: 'Female' },
                ]}
              />
              <Select
                label="Class *"
                name="classId"
                value={String(form.classId || '')}
                onChange={(e) => {
                  handleFormChange(e);
                  setCreateSubClassId('');
                }}
                options={[
                  { value: '', label: 'Select class' },
                  ...classes.map((c) => ({ value: String(c.id), label: c.name })),
                ]}
              />
              <Select
                label="Subclass"
                value={createSubClassId}
                onChange={(e) => setCreateSubClassId(e.target.value)}
                disabled={!form.classId}
                options={[
                  { value: '', label: form.classId ? 'Select subclass (optional)' : 'Select a class first' },
                  ...subClassesForClass(String(form.classId || '')).map((sc) => ({
                    value: String(sc.id),
                    label: sc.name,
                  })),
                ]}
              />
              <Input label="Former School" name="formerSchool" value={form.formerSchool} onChange={handleFormChange} />
              <Input label="Residence" name="residence" value={form.residence} onChange={handleFormChange} />
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Parent / Guardian</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Parent Name *" name="parentName" value={form.parentName} onChange={handleFormChange} required />
              <Input label="Parent Phone *" name="parentPhone" value={form.parentPhone} onChange={handleFormChange} required />
              <Input label="Parent WhatsApp" name="parentWhatsapp" value={form.parentWhatsapp} onChange={handleFormChange} />
              <Input label="Parent Email" name="parentEmail" type="email" value={form.parentEmail} onChange={handleFormChange} />
              <Input label="Parent Address *" name="parentAddress" value={form.parentAddress} onChange={handleFormChange} required />
              <Select
                label="Relationship"
                name="relationship"
                value={form.relationship}
                onChange={handleFormChange}
                options={[
                  { value: 'PARENT', label: 'Parent' },
                  { value: 'GUARDIAN', label: 'Guardian' },
                ]}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
            <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" color="primary" isLoading={isSubmitting}>
              Register Student
            </Button>
          </div>
        </form>
      </Modal>

      {/* Change class modal */}
      <Modal
        isOpen={!!changingStudent}
        onClose={() => setChangingStudent(null)}
        title="Change Class"
        size="md"
      >
        {changingStudent && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Updating class for <span className="font-medium">{changingStudent.name}</span>
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
                ...subClassesForClass(changeClassId).map((sc) => ({
                  value: String(sc.id),
                  label: sc.name,
                })),
              ]}
            />
            <p className="text-xs text-gray-500">
              Choosing a subclass assigns the student to it (and its class). Choosing only a
              class assigns the class without a subclass.
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
              <Button variant="outline" onClick={() => setChangingStudent(null)} disabled={isChanging}>
                Cancel
              </Button>
              <Button color="primary" isLoading={isChanging} onClick={handleChangeClass}>
                Save Class
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Bulk photo upload modal */}
      <BulkPhotoUploadModal
        isOpen={isBulkOpen}
        onClose={() => setIsBulkOpen(false)}
        students={students}
        onUploadComplete={() => {
          setIsBulkOpen(false);
          loadStudents();
        }}
      />
    </div>
  );
}
