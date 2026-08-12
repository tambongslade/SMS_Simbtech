'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { UserPlusIcon, ChevronLeftIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/components/context/AuthContext';
import { Button, Input, Select, Modal } from '@/components/ui';
import { useTeacherSearch, useTeacherFilterOptions } from '@/hooks/useTeacherSearch';
import { TeacherSearchFilters } from '@/components/teachers/TeacherSearchFilters';
import { TeacherTable } from '@/components/teachers/TeacherTable';
import { TeacherPagination } from '@/components/teachers/TeacherPagination';
import { createTeacher, type CreateTeacherPayload } from '../lib/secretaryApi';

const emptyForm: CreateTeacherPayload = {
  name: '',
  email: '',
  phone: '',
  gender: '',
  date_of_birth: '',
  address: '',
  password: '',
};

export default function SecretaryTeachersPage() {
  const { selectedAcademicYear } = useAuth();

  const search = useTeacherSearch({
    academicYearId: selectedAcademicYear?.id,
    initialFilters: { sortBy: 'name', sortOrder: 'asc' },
  });
  const { subjects, subClasses } = useTeacherFilterOptions();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [form, setForm] = useState<CreateTeacherPayload>(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.gender || !form.date_of_birth || !form.password) {
      toast.error('Name, email, gender, date of birth and password are required.');
      return;
    }
    setIsSubmitting(true);
    try {
      await createTeacher(
        {
          ...form,
          phone: form.phone || undefined,
          address: form.address || undefined,
        },
        selectedAcademicYear?.id,
      );
      toast.success('Teacher created successfully.');
      setIsCreateOpen(false);
      setForm(emptyForm);
      search.refresh();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '';
      if (message !== 'Unauthorized') {
        toast.error(message || 'Failed to create teacher.');
      }
    } finally {
      setIsSubmitting(false);
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
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Teachers</h1>
          <p className="text-sm text-gray-600 mt-1">Create and view teacher accounts.</p>
        </div>
        <Button
          color="primary"
          leftIcon={UserPlusIcon}
          className="w-full sm:w-auto justify-center"
          onClick={() => setIsCreateOpen(true)}
        >
          Add Teacher
        </Button>
      </div>

      <TeacherSearchFilters search={search} subjects={subjects} subClasses={subClasses} />

      <TeacherTable teachers={search.teachers} isLoading={search.isLoading} emptyMessage="No teachers found." />

      <TeacherPagination meta={search.meta} onPageChange={search.setPage} isLoading={search.isLoading} />

      {/* Create teacher modal */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Add Teacher" size="lg">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Full Name *" name="name" value={form.name} onChange={handleFormChange} required />
            <Input label="Email *" name="email" type="email" value={form.email} onChange={handleFormChange} required />
            <Input label="Phone" name="phone" value={form.phone} onChange={handleFormChange} />
            <Select
              label="Gender *"
              name="gender"
              value={form.gender}
              onChange={handleFormChange}
              options={[
                { value: '', label: 'Select gender' },
                { value: 'MALE', label: 'Male' },
                { value: 'FEMALE', label: 'Female' },
              ]}
            />
            <Input label="Date of Birth *" name="date_of_birth" type="date" value={form.date_of_birth} onChange={handleFormChange} required />
            <Input label="Address" name="address" value={form.address} onChange={handleFormChange} />
            <Input label="Temporary Password *" name="password" type="password" value={form.password} onChange={handleFormChange} required />
          </div>
          <p className="text-xs text-gray-500">
            The teacher will be created and assigned the Teacher role for
            {selectedAcademicYear ? ` ${selectedAcademicYear.name}` : ' the current academic year'}.
          </p>
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2 border-t border-gray-200">
            <Button type="button" variant="outline" className="w-full sm:w-auto justify-center" onClick={() => setIsCreateOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" color="primary" className="w-full sm:w-auto justify-center" isLoading={isSubmitting}>
              Create Teacher
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
