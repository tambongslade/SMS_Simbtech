'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { sortClassesByLevel } from '@/lib/classOrdering';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import {
  MagnifyingGlassIcon,
  UserPlusIcon,
  PhotoIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  EyeIcon,
  PencilSquareIcon,
  ArrowsRightLeftIcon,
  UserMinusIcon,
  TrashIcon,
  Squares2X2Icon,
  ListBulletIcon,
  EllipsisVerticalIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '@/components/context/AuthContext';
import { Button, Input, Select, Modal, StudentPhoto, BulkPhotoUploadModal } from '@/components/ui';
import StudentExtrasModal from '@/components/students/StudentExtrasModal';
import {
  fetchStudents,
  searchStudents,
  fetchSubClasses,
  fetchClasses,
  createStudentWithParent,
  enrollStudentInSubclass,
  changeStudentClass,
  unenrollStudent,
  updateReamOfPaper,
  updateStudent,
  updateParentContact,
  deleteStudent,
  fetchStudentProfile,
  searchAvailableParents,
  linkExistingParent,
  createParentForStudent,
  type AvailableParent,
  type Relationship,
  type SecretaryStudent,
  type SubClassInfo,
  type ClassInfo,
  type CreateStudentPayload,
  type ParentContactPayload,
} from '../lib/secretaryApi';

const emptyParent: ParentContactPayload = {
  name: '',
  phone: '',
  address: '',
  phoneIsWhatsapp: true,
  whatsapp: '',
  relationship: undefined,
};

const emptyForm: CreateStudentPayload = {
  studentNom: '',
  studentPrenom: '',
  dateOfBirth: '',
  placeOfBirth: '',
  gender: '',
  residence: '',
  formerSchool: '',
  classId: 0,
  academicYearId: 0,
  isNewStudent: true,
  reamOfPaperCollected: false,
  parents: [{ ...emptyParent }],
};

const LIMIT = 20;

// Edit form mirrors the registration form fields (all editable to fix mistakes).
type EditFormState = {
  nom: string;
  prenom: string;
  matricule: string;
  dateOfBirth: string;
  placeOfBirth: string;
  gender: string;
  residence: string;
  formerSchool: string;
  isNewStudent: boolean;
  reamOfPaperCollected: boolean;
};

const emptyEditForm: EditFormState = {
  nom: '',
  prenom: '',
  matricule: '',
  dateOfBirth: '',
  placeOfBirth: '',
  gender: '',
  residence: '',
  formerSchool: '',
  isNewStudent: true,
  reamOfPaperCollected: false,
};

// A linked parent contact being edited; `orig` lets us send only changed fields.
type EditParentContact = {
  id: number;
  name: string;
  phone: string;
  address: string;
  orig: { name: string; phone: string; address: string };
};

function SecretaryStudentsPageInner() {
  const { selectedAcademicYear } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [students, setStudents] = useState<SecretaryStudent[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const [subClasses, setSubClasses] = useState<SubClassInfo[]>([]);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [subClassFilter, setSubClassFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [mobileView, setMobileView] = useState<'cards' | 'list'>('list');
  const [expandedListRow, setExpandedListRow] = useState<number | null>(null);

  // Create student
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [form, setForm] = useState<CreateStudentPayload>(emptyForm);
  const [createSubClassId, setCreateSubClassId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Bulk photos
  const [isBulkOpen, setIsBulkOpen] = useState(false);

  // Edit student details (mirrors the registration form)
  const [editingStudent, setEditingStudent] = useState<SecretaryStudent | null>(null);
  const [editForm, setEditForm] = useState<EditFormState>(emptyEditForm);
  const [editClassId, setEditClassId] = useState('');
  const [editSubClassId, setEditSubClassId] = useState('');
  const [editParents, setEditParents] = useState<EditParentContact[]>([]);
  const [isLoadingEditExtras, setIsLoadingEditExtras] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [extrasStudent, setExtrasStudent] = useState<SecretaryStudent | null>(null);

  // Link an additional parent from the edit modal
  const [parentSearch, setParentSearch] = useState('');
  const [parentResults, setParentResults] = useState<AvailableParent[]>([]);
  const [isSearchingParents, setIsSearchingParents] = useState(false);
  const [linkRelationship, setLinkRelationship] = useState<Relationship | ''>('');
  const [linkingParentId, setLinkingParentId] = useState<number | null>(null);

  // Change class
  const [changingStudent, setChangingStudent] = useState<SecretaryStudent | null>(null);
  const [changeClassId, setChangeClassId] = useState('');
  const [changeSubClassId, setChangeSubClassId] = useState('');
  const [isChanging, setIsChanging] = useState(false);

  // Unenroll (dismiss)
  const [unenrollTarget, setUnenrollTarget] = useState<SecretaryStudent | null>(null);
  const [isUnenrolling, setIsUnenrolling] = useState(false);

  // Create-a-new-parent-for-existing-student form (inside the edit modal).
  const [newParentForm, setNewParentForm] = useState({
    name: '',
    phone: '',
    address: '',
    phoneIsWhatsapp: true,
    whatsapp: '',
    relationship: '' as Relationship | '',
  });
  const [isCreatingParent, setIsCreatingParent] = useState(false);
  const emptyNewParent = {
    name: '',
    phone: '',
    address: '',
    phoneIsWhatsapp: true,
    whatsapp: '',
    relationship: '' as Relationship | '',
  };

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<SecretaryStudent | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Open the registration form directly when launched from the quick actions menu.
  useEffect(() => {
    if (searchParams.get('create') === '1') {
      setIsCreateOpen(true);
      router.replace('/dashboard/secretary/students');
    }
  }, [searchParams, router]);

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
    fetchClasses().then((c) => setClasses(sortClassesByLevel(c))).catch(() => setClasses([]));
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

  // Update a single field on one parent contact.
  const updateParent = (index: number, patch: Partial<ParentContactPayload>) => {
    setForm((prev) => ({
      ...prev,
      parents: prev.parents.map((p, i) => (i === index ? { ...p, ...patch } : p)),
    }));
  };

  const addParent = () => {
    setForm((prev) =>
      prev.parents.length >= 2 ? prev : { ...prev, parents: [...prev.parents, { ...emptyParent }] },
    );
  };

  const removeParent = (index: number) => {
    setForm((prev) => ({ ...prev, parents: prev.parents.filter((_, i) => i !== index) }));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAcademicYear) {
      toast.error('Please select an academic year first.');
      return;
    }
    const first = form.parents[0];
    if (!form.studentNom || !form.studentPrenom || !form.classId || !first?.name || !first?.phone || !first?.address) {
      toast.error('Family name, given name, class, and the first contact’s name, phone and address are required.');
      return;
    }
    // Keep only filled contacts and strip the WhatsApp field when the phone is
    // flagged as the WhatsApp number (the backend copies the phone).
    const parents: ParentContactPayload[] = form.parents
      .filter((p) => p.name && p.phone && p.address)
      .map((p) => ({
        name: p.name,
        phone: p.phone,
        address: p.address,
        phoneIsWhatsapp: !!p.phoneIsWhatsapp,
        whatsapp: p.phoneIsWhatsapp ? undefined : p.whatsapp || undefined,
        relationship: p.relationship || undefined,
      }));
    setIsSubmitting(true);
    try {
      const res = await createStudentWithParent({
        ...form,
        classId: Number(form.classId),
        academicYearId: selectedAcademicYear.id,
        // Ream only matters for new students.
        reamOfPaperCollected: form.isNewStudent ? form.reamOfPaperCollected : false,
        parents,
      });
      const newStudentId = res?.data?.student?.id;
      if (createSubClassId && newStudentId) {
        try {
          await enrollStudentInSubclass(
            newStudentId,
            Number(createSubClassId),
            selectedAcademicYear.id,
            form.isNewStudent ? form.reamOfPaperCollected : false,
          );
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

  const openEdit = (student: SecretaryStudent) => {
    setEditingStudent(student);
    // Fall back to splitting the display name when nom/prenom are missing.
    const [fallbackNom, ...rest] = (student.name || '').split(' ');
    setEditForm({
      nom: student.nom || fallbackNom || '',
      prenom: student.prenom || rest.join(' ') || '',
      matricule: student.matricule || '',
      dateOfBirth: student.date_of_birth ? student.date_of_birth.split('T')[0] : '',
      placeOfBirth: student.place_of_birth || '',
      gender: (student.gender || '').toUpperCase(),
      residence: student.residence || '',
      formerSchool: student.former_school || '',
      isNewStudent: student.is_new_student ?? true,
      reamOfPaperCollected: !!student.reamOfPaperCollected,
    });
    setEditClassId(student.classId ? String(student.classId) : '');
    setEditSubClassId(student.subClassId ? String(student.subClassId) : '');
    setEditParents([]);
    setParentSearch('');
    setParentResults([]);
    setLinkRelationship('');
    setNewParentForm(emptyNewParent);
    // The list rows don't carry new-student status or parent contacts; pull
    // them from the full profile.
    loadEditExtras(student.id);
  };

  const loadEditExtras = (studentId: number) => {
    setIsLoadingEditExtras(true);
    fetchStudentProfile(studentId, selectedAcademicYear?.id)
      .then((profile) => {
        const isNew =
          profile?.is_new_student ??
          profile?.isNewStudent ??
          profile?.student?.is_new_student ??
          profile?.student?.isNewStudent;
        if (isNew !== undefined && isNew !== null) {
          setEditForm((prev) => ({ ...prev, isNewStudent: !!isNew }));
        }
        const parents: any[] = Array.isArray(profile?.parents) ? profile.parents : [];
        setEditParents(
          parents
            .map((p) => p?.parent ?? p)
            .filter((pr) => pr?.id)
            .map((pr) => {
              const orig = {
                name: pr.name || '',
                phone: pr.phone || '',
                address: pr.address || '',
              };
              return { id: pr.id, ...orig, orig };
            }),
        );
      })
      .catch(() => setEditParents([]))
      .finally(() => setIsLoadingEditExtras(false));
  };

  const handleEditFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const updateEditParent = (index: number, patch: Partial<EditParentContact>) => {
    setEditParents((prev) => prev.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  };

  // Debounced search of existing parent accounts (new parent accounts can only
  // be created during student registration).
  useEffect(() => {
    if (!editingStudent || parentSearch.trim().length < 2) {
      setParentResults([]);
      return;
    }
    const t = setTimeout(() => {
      setIsSearchingParents(true);
      searchAvailableParents(parentSearch.trim())
        .then(setParentResults)
        .catch(() => setParentResults([]))
        .finally(() => setIsSearchingParents(false));
    }, 400);
    return () => clearTimeout(t);
  }, [parentSearch, editingStudent]);

  const handleLinkParent = async (parent: AvailableParent) => {
    if (!editingStudent) return;
    setLinkingParentId(parent.id);
    try {
      await linkExistingParent(editingStudent.id, parent.id, linkRelationship || undefined);
      toast.success(`${parent.name} linked to ${editingStudent.name}.`);
      setParentSearch('');
      setParentResults([]);
      loadEditExtras(editingStudent.id);
    } catch (error: any) {
      if (error?.message !== 'Unauthorized') {
        toast.error(error?.message || 'Failed to link parent.');
      }
    } finally {
      setLinkingParentId(null);
    }
  };

  const handleCreateParentForStudent = async () => {
    if (!editingStudent) return;
    if (editParents.length >= 2) {
      toast.error('A student can have at most 2 linked contacts.');
      return;
    }
    if (!newParentForm.name.trim() || !newParentForm.phone.trim()) {
      toast.error('Parent name and phone are required.');
      return;
    }
    setIsCreatingParent(true);
    try {
      await createParentForStudent({
        studentId: editingStudent.id,
        name: newParentForm.name.trim(),
        phone: newParentForm.phone.trim(),
        address: newParentForm.address.trim() || undefined,
        phoneIsWhatsapp: newParentForm.phoneIsWhatsapp,
        whatsapp: newParentForm.phoneIsWhatsapp ? undefined : (newParentForm.whatsapp.trim() || undefined),
        relationship: newParentForm.relationship || undefined,
        academicYearId: selectedAcademicYear?.id,
      });
      toast.success(`${newParentForm.name.trim()} created and linked to ${editingStudent.name}.`);
      setNewParentForm(emptyNewParent);
      loadEditExtras(editingStudent.id);
    } catch (error: any) {
      if (error?.message !== 'Unauthorized') {
        toast.error(error?.message || 'Failed to create parent.');
      }
    } finally {
      setIsCreatingParent(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    if (!editForm.nom || !editForm.prenom) {
      toast.error('Family name (Nom) and given name (Prénom) are required.');
      return;
    }
    setIsSavingEdit(true);
    try {
      // Ream-of-paper lives on the enrollment row; only send it when the
      // student is enrolled for a year, otherwise the update is rejected.
      const enrollmentYearId = editingStudent.academicYearId ?? selectedAcademicYear?.id;
      await updateStudent(editingStudent.id, {
        nom: editForm.nom,
        prenom: editForm.prenom,
        matricule: editForm.matricule || null,
        dateOfBirth: editForm.dateOfBirth || null,
        placeOfBirth: editForm.placeOfBirth || null,
        gender: editForm.gender || null,
        residence: editForm.residence || null,
        former_school: editForm.formerSchool || null,
        is_new_student: editForm.isNewStudent,
        ...(editingStudent.classId && enrollmentYearId
          ? {
              reamOfPaperCollected: editForm.isNewStudent ? editForm.reamOfPaperCollected : false,
              academicYearId: enrollmentYearId,
            }
          : {}),
      });

      // Re-assign class/subclass only when it actually changed.
      const classChanged = editClassId !== (editingStudent.classId ? String(editingStudent.classId) : '');
      const subClassChanged = editSubClassId !== (editingStudent.subClassId ? String(editingStudent.subClassId) : '');
      if ((classChanged || subClassChanged) && (editClassId || editSubClassId)) {
        try {
          await changeStudentClass(editingStudent.id, {
            classId: editClassId ? Number(editClassId) : undefined,
            subClassId: editSubClassId ? Number(editSubClassId) : undefined,
            academicYearId: selectedAcademicYear?.id,
          });
        } catch (error: any) {
          toast.error(error?.message || 'Details saved, but changing the class failed.');
        }
      }

      // Update only the parent contacts (and fields) that changed.
      for (const parent of editParents) {
        const patch: { name?: string; phone?: string; address?: string } = {};
        if (parent.name.trim() && parent.name !== parent.orig.name) patch.name = parent.name.trim();
        if (parent.phone.trim() && parent.phone !== parent.orig.phone) patch.phone = parent.phone.trim();
        if (parent.address.trim() && parent.address !== parent.orig.address) patch.address = parent.address.trim();
        if (Object.keys(patch).length === 0) continue;
        try {
          await updateParentContact(parent.id, patch);
        } catch {
          toast.error(`Failed to update contact "${parent.orig.name || parent.name}".`);
        }
      }

      toast.success(`${editForm.nom} ${editForm.prenom} updated successfully.`);
      setEditingStudent(null);
      loadStudents();
    } catch (error: any) {
      if (error?.message !== 'Unauthorized') {
        toast.error(error?.message || 'Failed to update student.');
      }
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleUnenroll = async () => {
    if (!unenrollTarget) return;
    setIsUnenrolling(true);
    try {
      // Prefer the year tied to this enrollment row; otherwise fall back to the selected year
      // (the backend defaults to the current year when none is given).
      await unenrollStudent(
        unenrollTarget.id,
        unenrollTarget.academicYearId ?? selectedAcademicYear?.id,
      );
      toast.success(`${unenrollTarget.name} unenrolled successfully.`);
      setUnenrollTarget(null);
      loadStudents();
    } catch (error: any) {
      // apiService already surfaces the message (incl. the 409 history-protection blocks).
      if (error?.message !== 'Unauthorized') {
        toast.error(error?.message || 'Failed to unenroll student.');
      }
    } finally {
      setIsUnenrolling(false);
    }
  };

  const canDelete = (student: SecretaryStudent) => {
    if (!student.classId) return true; // not enrolled
    const name = (student.className || '').toLowerCase();
    return name.startsWith('form 1') || name === 'form 1';
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteStudent(deleteTarget.id);
      toast.success(`${deleteTarget.name} deleted successfully.`);
      setDeleteTarget(null);
      loadStudents();
    } catch (error: any) {
      if (error?.message !== 'Unauthorized') {
        toast.error(error?.message || 'Failed to delete student.');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleReamToggle = async (student: SecretaryStudent, value: boolean) => {
    // Optimistic update
    setStudents((prev) =>
      prev.map((s) => (s.id === student.id ? { ...s, reamOfPaperCollected: value } : s)),
    );
    try {
      await updateReamOfPaper(student.id, value, student.academicYearId ?? selectedAcademicYear?.id);
    } catch {
      // Revert on failure
      setStudents((prev) =>
        prev.map((s) => (s.id === student.id ? { ...s, reamOfPaperCollected: !value } : s)),
      );
      toast.error('Failed to update ream of paper status.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            href="/dashboard/secretary"
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-1.5 sm:hidden"
          >
            <ChevronLeftIcon className="h-4 w-4 mr-1" />
            Menu
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Students</h1>
          <p className="text-sm text-gray-600 mt-1">
            Register students, view profiles and manage classes &amp; photos.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            color="primary"
            leftIcon={PhotoIcon}
            className="w-full sm:w-auto justify-center"
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
          <Button
            color="primary"
            leftIcon={UserPlusIcon}
            className="w-full sm:w-auto justify-center"
            onClick={() => setIsCreateOpen(true)}
          >
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

      {/* Mobile view toggle */}
      <div className="md:hidden flex items-center justify-between bg-white rounded-lg shadow-sm border border-gray-200 px-3 py-2">
        <span className="text-xs text-gray-600">
          {isLoading ? 'Loading…' : `${students.length} shown · ${total} total`}
        </span>
        <div className="inline-flex rounded-md border border-gray-200 overflow-hidden">
          <button
            type="button"
            onClick={() => setMobileView('list')}
            className={`px-2.5 py-1.5 text-xs inline-flex items-center gap-1 ${
              mobileView === 'list' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'
            }`}
            aria-pressed={mobileView === 'list'}
          >
            <ListBulletIcon className="h-4 w-4" /> List
          </button>
          <button
            type="button"
            onClick={() => setMobileView('cards')}
            className={`px-2.5 py-1.5 text-xs inline-flex items-center gap-1 border-l border-gray-200 ${
              mobileView === 'cards' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'
            }`}
            aria-pressed={mobileView === 'cards'}
          >
            <Squares2X2Icon className="h-4 w-4" /> Cards
          </button>
        </div>
      </div>

      {/* Mobile list view */}
      {mobileView === 'list' && (
        <div className="md:hidden bg-white rounded-lg shadow-sm border border-gray-200 divide-y divide-gray-100 overflow-hidden">
          {isLoading ? (
            <div className="px-4 py-8 text-center text-gray-500">Loading students…</div>
          ) : students.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500">No students found.</div>
          ) : (
            students.map((student) => (
              <div key={student.id}>
                <div
                  className="flex items-center gap-3 px-3 py-2.5 active:bg-gray-50"
                  onClick={() => router.push(`/dashboard/secretary/students/${student.id}`)}
                >
                  <div onClick={(e) => e.stopPropagation()}>
                    <StudentPhoto
                      studentId={student.id}
                      photo={student.photo}
                      size="sm"
                      fetchPhoto
                      studentName={student.name}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{student.name}</p>
                    <p className="text-xs text-gray-500 truncate">
                      {student.matricule || 'No matricule'}
                      {student.subClassName ? ` · ${student.subClassName}` : (classNameFor(student) ? ` · ${classNameFor(student)}` : '')}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedListRow((cur) => (cur === student.id ? null : student.id));
                    }}
                    className="p-2 -mr-1 rounded-md text-gray-500 hover:bg-gray-100"
                    aria-label="Actions"
                    aria-expanded={expandedListRow === student.id}
                  >
                    <EllipsisVerticalIcon className="h-5 w-5" />
                  </button>
                </div>
                {expandedListRow === student.id && (
                  <div className="grid grid-cols-3 gap-2 px-3 pb-3" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="outline"
                      size="xs"
                      leftIcon={EyeIcon}
                      className="justify-center"
                      onClick={() => router.push(`/dashboard/secretary/students/${student.id}`)}
                    >
                      View
                    </Button>
                    <Button
                      variant="outline"
                      size="xs"
                      color="primary"
                      leftIcon={PencilSquareIcon}
                      className="justify-center"
                      onClick={() => openEdit(student)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="xs"
                      className="justify-center"
                      onClick={() => setExtrasStudent(student)}
                    >
                      Extras
                    </Button>
                    <Button
                      variant="outline"
                      size="xs"
                      color="secondary"
                      leftIcon={ArrowsRightLeftIcon}
                      className="justify-center"
                      onClick={() => openChangeClass(student)}
                    >
                      Change
                    </Button>
                    {student.subClassName && (
                      <Button
                        variant="outline"
                        size="xs"
                        color="warning"
                        leftIcon={UserMinusIcon}
                        className="justify-center"
                        onClick={() => setUnenrollTarget(student)}
                      >
                        Unenroll
                      </Button>
                    )}
                    {canDelete(student) && (
                      <Button
                        variant="outline"
                        size="xs"
                        color="danger"
                        leftIcon={TrashIcon}
                        className="justify-center"
                        onClick={() => setDeleteTarget(student)}
                      >
                        Delete
                      </Button>
                    )}
                    <label
                      className="col-span-3 flex items-center gap-2 text-xs text-gray-600 px-1 pt-1"
                    >
                      <input
                        type="checkbox"
                        checked={!!student.reamOfPaperCollected}
                        onChange={(e) => handleReamToggle(student, e.target.checked)}
                        className="h-3.5 w-3.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      Ream of paper collected
                    </label>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Mobile card list */}
      <div className={`md:hidden space-y-3 ${mobileView === 'cards' ? '' : 'hidden'}`}>
        {isLoading ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 px-4 py-8 text-center text-gray-500">
            Loading students…
          </div>
        ) : students.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 px-4 py-8 text-center text-gray-500">
            No students found.
          </div>
        ) : (
          students.map((student) => (
            <div
              key={student.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-4"
              onClick={() => router.push(`/dashboard/secretary/students/${student.id}`)}
            >
              <div className="flex items-center gap-3">
                <div onClick={(e) => e.stopPropagation()}>
                  <StudentPhoto
                    studentId={student.id}
                    photo={student.photo}
                    size="md"
                    showUploadButton
                    canUpload
                    fetchPhoto
                    studentName={student.name}
                    onPhotoUpdate={() => loadStudents()}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900 truncate">{student.name}</p>
                  <p className="text-xs text-gray-500 truncate">{student.matricule || 'No matricule'}</p>
                  <p className="text-xs text-gray-600 mt-0.5 truncate">
                    {classNameFor(student) || '—'}
                    {student.subClassName ? ` · ${student.subClassName}` : ''}
                    {student.gender ? ` · ${student.gender}` : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-2" onClick={(e) => e.stopPropagation()}>
                <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={!!student.reamOfPaperCollected}
                    onChange={(e) => handleReamToggle(student, e.target.checked)}
                    className="h-3.5 w-3.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  Ream of paper collected
                </label>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-2" onClick={(e) => e.stopPropagation()}>
                <Button
                  variant="outline"
                  size="xs"
                  leftIcon={EyeIcon}
                  className="justify-center"
                  onClick={() => router.push(`/dashboard/secretary/students/${student.id}`)}
                >
                  View
                </Button>
                <Button
                  variant="outline"
                  size="xs"
                  color="primary"
                  leftIcon={PencilSquareIcon}
                  className="justify-center"
                  onClick={() => openEdit(student)}
                >
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="xs"
                  className="justify-center"
                  onClick={() => setExtrasStudent(student)}
                >
                  Extras
                </Button>
                <Button
                  variant="outline"
                  size="xs"
                  color="secondary"
                  leftIcon={ArrowsRightLeftIcon}
                  className="justify-center"
                  onClick={() => openChangeClass(student)}
                >
                  Change
                </Button>
                {student.subClassName && (
                  <Button
                    variant="outline"
                    size="xs"
                    color="warning"
                    leftIcon={UserMinusIcon}
                    className="justify-center"
                    onClick={() => setUnenrollTarget(student)}
                  >
                    Unenroll
                  </Button>
                )}
                {canDelete(student) && (
                  <Button
                    variant="outline"
                    size="xs"
                    color="danger"
                    leftIcon={TrashIcon}
                    className="justify-center"
                    onClick={() => setDeleteTarget(student)}
                  >
                    Delete
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Mobile pagination (shared by list & cards views) */}
      <div className="md:hidden flex items-center justify-between bg-white rounded-lg shadow-sm border border-gray-200 px-4 py-3">
        <span className="text-xs text-gray-600">
          Page {page} of {totalPages}
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

      {/* Table (desktop) */}
      <div className="hidden md:block bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
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
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Ream of Paper</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    Loading students…
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
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
                    <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={!!student.reamOfPaperCollected}
                        onChange={(e) => handleReamToggle(student, e.target.checked)}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                        title={student.reamOfPaperCollected ? 'Collected' : 'Not collected'}
                      />
                    </td>
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
                          color="primary"
                          leftIcon={PencilSquareIcon}
                          onClick={() => openEdit(student)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => setExtrasStudent(student)}
                        >
                          Extras
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
                        {student.subClassName && (
                          <Button
                            variant="outline"
                            size="xs"
                            color="warning"
                            leftIcon={UserMinusIcon}
                            onClick={() => setUnenrollTarget(student)}
                          >
                            Unenroll
                          </Button>
                        )}
                        {canDelete(student) && (
                          <Button
                            variant="outline"
                            size="xs"
                            color="danger"
                            leftIcon={TrashIcon}
                            onClick={() => setDeleteTarget(student)}
                          >
                            Delete
                          </Button>
                        )}
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
              <Input label="Family Name (Nom) *" name="studentNom" value={form.studentNom} onChange={handleFormChange} required />
              <Input label="Given Name(s) (Prénom) *" name="studentPrenom" value={form.studentPrenom} onChange={handleFormChange} required />
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
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 mt-4">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={!!form.isNewStudent}
                  onChange={(e) => setForm((prev) => ({ ...prev, isNewStudent: e.target.checked }))}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                New student
              </label>
              {form.isNewStudent && (
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={!!form.reamOfPaperCollected}
                    onChange={(e) => setForm((prev) => ({ ...prev, reamOfPaperCollected: e.target.checked }))}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  Ream of paper collected
                </label>
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700">Contacts</h3>
              {form.parents.length < 2 && (
                <Button type="button" variant="outline" size="xs" leftIcon={UserPlusIcon} onClick={addParent}>
                  Add contact
                </Button>
              )}
            </div>
            <div className="space-y-4">
              {form.parents.map((parent, index) => (
                <div key={index} className="rounded-lg border border-gray-200 p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-500 uppercase">
                      Contact {index + 1}{index === 0 ? ' (required)' : ''}
                    </span>
                    {index > 0 && (
                      <button
                        type="button"
                        onClick={() => removeParent(index)}
                        className="text-xs text-red-600 hover:text-red-700"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Relationship is chosen first. */}
                    <Select
                      label="Relationship"
                      value={parent.relationship ?? ''}
                      onChange={(e) =>
                        updateParent(index, { relationship: (e.target.value || undefined) as ParentContactPayload['relationship'] })
                      }
                      options={[
                        { value: '', label: 'Select relationship' },
                        { value: 'FATHER', label: 'Father' },
                        { value: 'MOTHER', label: 'Mother' },
                        { value: 'GUARDIAN', label: 'Guardian' },
                        { value: 'SIBLING', label: 'Sibling' },
                      ]}
                    />
                    <Input
                      label={index === 0 ? 'Name *' : 'Name'}
                      value={parent.name}
                      onChange={(e) => updateParent(index, { name: e.target.value })}
                      required={index === 0}
                    />
                    <Input
                      label={index === 0 ? 'Phone *' : 'Phone'}
                      value={parent.phone}
                      onChange={(e) => updateParent(index, { phone: e.target.value })}
                      required={index === 0}
                    />
                    {!parent.phoneIsWhatsapp && (
                      <Input
                        label="WhatsApp"
                        value={parent.whatsapp}
                        onChange={(e) => updateParent(index, { whatsapp: e.target.value })}
                      />
                    )}
                    <Input
                      label={index === 0 ? 'Address *' : 'Address'}
                      value={parent.address}
                      onChange={(e) => updateParent(index, { address: e.target.value })}
                      required={index === 0}
                    />
                  </div>
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={!!parent.phoneIsWhatsapp}
                      onChange={(e) => updateParent(index, { phoneIsWhatsapp: e.target.checked })}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    This phone number is also the WhatsApp number
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2 border-t border-gray-200">
            <Button type="button" variant="outline" className="w-full sm:w-auto justify-center" onClick={() => setIsCreateOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" color="primary" className="w-full sm:w-auto justify-center" isLoading={isSubmitting}>
              Register Student
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit student modal (same fields as registration) */}
      <Modal
        isOpen={!!editingStudent}
        onClose={() => setEditingStudent(null)}
        title="Edit Student"
        size="lg"
      >
        {editingStudent && (
          <form onSubmit={handleSaveEdit} className="space-y-5">
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Student Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Family Name (Nom) *" name="nom" value={editForm.nom} onChange={handleEditFormChange} required />
                <Input label="Given Name(s) (Prénom) *" name="prenom" value={editForm.prenom} onChange={handleEditFormChange} required />
                <Input label="Matricule" name="matricule" value={editForm.matricule} onChange={handleEditFormChange} />
                <Input label="Date of Birth" name="dateOfBirth" type="date" value={editForm.dateOfBirth} onChange={handleEditFormChange} />
                <Input label="Place of Birth" name="placeOfBirth" value={editForm.placeOfBirth} onChange={handleEditFormChange} />
                <Select
                  label="Gender"
                  name="gender"
                  value={editForm.gender}
                  onChange={handleEditFormChange}
                  options={[
                    { value: '', label: 'Select gender' },
                    { value: 'MALE', label: 'Male' },
                    { value: 'FEMALE', label: 'Female' },
                  ]}
                />
                <Select
                  label="Class"
                  value={editClassId}
                  onChange={(e) => {
                    setEditClassId(e.target.value);
                    setEditSubClassId('');
                  }}
                  options={[
                    { value: '', label: 'Select class' },
                    ...classes.map((c) => ({ value: String(c.id), label: c.name })),
                  ]}
                />
                <Select
                  label="Subclass"
                  value={editSubClassId}
                  onChange={(e) => setEditSubClassId(e.target.value)}
                  disabled={!editClassId}
                  options={[
                    { value: '', label: editClassId ? 'Select subclass (optional)' : 'Select a class first' },
                    ...subClassesForClass(editClassId).map((sc) => ({
                      value: String(sc.id),
                      label: sc.name,
                    })),
                  ]}
                />
                <Input label="Former School" name="formerSchool" value={editForm.formerSchool} onChange={handleEditFormChange} />
                <Input label="Residence" name="residence" value={editForm.residence} onChange={handleEditFormChange} />
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 mt-4">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={!!editForm.isNewStudent}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, isNewStudent: e.target.checked }))}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  New student
                </label>
                {editForm.isNewStudent && (
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={!!editForm.reamOfPaperCollected}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, reamOfPaperCollected: e.target.checked }))}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    Ream of paper collected
                  </label>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Contacts</h3>
              {isLoadingEditExtras ? (
                <p className="text-sm text-gray-500">Loading contacts…</p>
              ) : editParents.length === 0 ? (
                <p className="text-sm text-gray-500">No contacts linked to this student.</p>
              ) : (
                <div className="space-y-4">
                  {editParents.map((parent, index) => (
                    <div key={parent.id} className="rounded-lg border border-gray-200 p-4 space-y-4">
                      <span className="text-xs font-medium text-gray-500 uppercase">
                        Contact {index + 1}
                      </span>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                          label="Name"
                          value={parent.name}
                          onChange={(e) => updateEditParent(index, { name: e.target.value })}
                        />
                        <Input
                          label="Phone"
                          value={parent.phone}
                          onChange={(e) => updateEditParent(index, { phone: e.target.value })}
                        />
                        <Input
                          label="Address"
                          value={parent.address}
                          onChange={(e) => updateEditParent(index, { address: e.target.value })}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Create a brand-new parent for this student */}
              {editParents.length < 2 && (
                <div className="mt-4 rounded-lg border border-dashed border-blue-300 bg-blue-50/40 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <UserPlusIcon className="h-4 w-4 text-blue-600" />
                    <span className="text-xs font-medium text-blue-700 uppercase">Create a new contact</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Input
                      label="Name *"
                      value={newParentForm.name}
                      onChange={(e) => setNewParentForm((p) => ({ ...p, name: e.target.value }))}
                      placeholder="Full name"
                    />
                    <Input
                      label="Phone *"
                      value={newParentForm.phone}
                      onChange={(e) => setNewParentForm((p) => ({ ...p, phone: e.target.value }))}
                      placeholder="e.g. +237 6XX XXX XXX"
                    />
                    <Input
                      label="Address"
                      value={newParentForm.address}
                      onChange={(e) => setNewParentForm((p) => ({ ...p, address: e.target.value }))}
                      placeholder="Optional"
                    />
                    <Select
                      label="Relationship"
                      value={newParentForm.relationship}
                      onChange={(e) => setNewParentForm((p) => ({ ...p, relationship: e.target.value as Relationship | '' }))}
                      options={[
                        { value: '', label: 'Select relationship (optional)' },
                        { value: 'FATHER', label: 'Father' },
                        { value: 'MOTHER', label: 'Mother' },
                        { value: 'GUARDIAN', label: 'Guardian' },
                        { value: 'SIBLING', label: 'Sibling' },
                      ]}
                    />
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <label className="flex items-center gap-2 text-xs text-gray-600">
                      <input
                        type="checkbox"
                        checked={newParentForm.phoneIsWhatsapp}
                        onChange={(e) => setNewParentForm((p) => ({ ...p, phoneIsWhatsapp: e.target.checked }))}
                        className="h-3.5 w-3.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      Phone number is also WhatsApp
                    </label>
                    {!newParentForm.phoneIsWhatsapp && (
                      <Input
                        label="WhatsApp"
                        value={newParentForm.whatsapp}
                        onChange={(e) => setNewParentForm((p) => ({ ...p, whatsapp: e.target.value }))}
                        placeholder="WhatsApp number"
                      />
                    )}
                    <Button
                      type="button"
                      color="primary"
                      leftIcon={UserPlusIcon}
                      isLoading={isCreatingParent}
                      onClick={handleCreateParentForStudent}
                      className="w-full sm:w-auto justify-center"
                    >
                      Create &amp; Link
                    </Button>
                  </div>
                  <p className="text-[11px] text-gray-500">
                    A new parent account is created with a default password (<code>defaultPassword123</code>) that they can change on first login.
                  </p>
                </div>
              )}

              {/* Link an additional parent contact */}
              <div className="mt-4 rounded-lg border border-dashed border-gray-300 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <UserPlusIcon className="h-4 w-4 text-gray-500" />
                  <span className="text-xs font-medium text-gray-500 uppercase">Or link an existing contact</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Search existing parents"
                    placeholder="Name or phone…"
                    value={parentSearch}
                    onChange={(e) => setParentSearch(e.target.value)}
                    leftIcon={<MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />}
                  />
                  <Select
                    label="Relationship"
                    value={linkRelationship}
                    onChange={(e) => setLinkRelationship(e.target.value as Relationship | '')}
                    options={[
                      { value: '', label: 'Select relationship (optional)' },
                      { value: 'FATHER', label: 'Father' },
                      { value: 'MOTHER', label: 'Mother' },
                      { value: 'GUARDIAN', label: 'Guardian' },
                      { value: 'SIBLING', label: 'Sibling' },
                    ]}
                  />
                </div>
                {isSearchingParents ? (
                  <p className="text-sm text-gray-500">Searching…</p>
                ) : parentResults.length > 0 ? (
                  <ul className="divide-y divide-gray-100 rounded-md border border-gray-200">
                    {parentResults
                      .filter((p) => !editParents.some((ep) => ep.id === p.id))
                      .map((p) => (
                        <li key={p.id} className="flex items-center justify-between gap-3 px-3 py-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                            <p className="text-xs text-gray-500 truncate">
                              {p.phone || 'No phone'}
                              {p.childrenCount ? ` · ${p.childrenCount} child${p.childrenCount === 1 ? '' : 'ren'}` : ''}
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="xs"
                            color="primary"
                            isLoading={linkingParentId === p.id}
                            onClick={() => handleLinkParent(p)}
                          >
                            Link
                          </Button>
                        </li>
                      ))}
                  </ul>
                ) : parentSearch.trim().length >= 2 ? (
                  <p className="text-sm text-gray-500">No matching parents found.</p>
                ) : (
                  <p className="text-xs text-gray-400">
                    Type at least 2 characters to search. Brand-new parent accounts can only be
                    created while registering a student.
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2 border-t border-gray-200">
              <Button type="button" variant="outline" className="w-full sm:w-auto justify-center" onClick={() => setEditingStudent(null)} disabled={isSavingEdit}>
                Cancel
              </Button>
              <Button type="submit" color="primary" className="w-full sm:w-auto justify-center" isLoading={isSavingEdit}>
                Save Changes
              </Button>
            </div>
          </form>
        )}
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
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2 border-t border-gray-200">
              <Button variant="outline" className="w-full sm:w-auto justify-center" onClick={() => setChangingStudent(null)} disabled={isChanging}>
                Cancel
              </Button>
              <Button color="primary" className="w-full sm:w-auto justify-center" isLoading={isChanging} onClick={handleChangeClass}>
                Save Class
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Unenroll (dismiss) modal */}
      <Modal
        isOpen={!!unenrollTarget}
        onClose={() => setUnenrollTarget(null)}
        title="Unenroll student"
        size="md"
      >
        {unenrollTarget && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              This removes <span className="font-medium text-gray-900">{unenrollTarget.name}</span>
              {unenrollTarget.matricule ? ` (${unenrollTarget.matricule})` : ''} from
              {selectedAcademicYear ? ` ${selectedAcademicYear.name}` : ' the current academic year'}.
              The student account is kept and they can be re-enrolled later.
            </p>
            <p className="text-xs text-gray-500">
              If the student already has marks, attendance, discipline, or payment records for this
              year, the unenrollment is blocked to protect their history.
            </p>
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2 border-t border-gray-200">
              <Button variant="outline" className="w-full sm:w-auto justify-center" onClick={() => setUnenrollTarget(null)} disabled={isUnenrolling}>
                Cancel
              </Button>
              <Button color="warning" className="w-full sm:w-auto justify-center" isLoading={isUnenrolling} onClick={handleUnenroll}>
                Unenroll
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-lg shadow-xl w-full sm:max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-full bg-red-100">
                <TrashIcon className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">Delete Student</h3>
                <p className="mt-1 text-sm text-gray-600">
                  Are you sure you want to permanently delete <span className="font-medium">{deleteTarget.name}</span>? This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="mt-5 flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={isDeleting}>
                Cancel
              </Button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
              >
                {isDeleting && <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />}
                {isDeleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* Student extras: health conditions, previous schools, siblings */}
      {extrasStudent && (
        <StudentExtrasModal
          isOpen={!!extrasStudent}
          onClose={() => setExtrasStudent(null)}
          studentId={extrasStudent.id}
          studentName={extrasStudent.name}
          initialHealthConditions={(extrasStudent as any).healthConditions || []}
          initialMedicalNotes={(extrasStudent as any).medicalNotes || ''}
          initialAdmissionAcademicYearId={(extrasStudent as any).admissionAcademicYearId || null}
          onSaved={() => loadStudents()}
        />
      )}
    </div>
  );
}

export default function SecretaryStudentsPage() {
  return (
    <Suspense fallback={<div className="text-center text-gray-500 py-10">Loading…</div>}>
      <SecretaryStudentsPageInner />
    </Suspense>
  );
}
