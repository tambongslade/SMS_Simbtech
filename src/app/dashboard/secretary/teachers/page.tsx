'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import { MagnifyingGlassIcon, UserPlusIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/components/context/AuthContext';
import { Button, Input, Select, Modal } from '@/components/ui';
import {
  fetchTeachers,
  createTeacher,
  type SecretaryTeacher,
  type CreateTeacherPayload,
} from '../lib/secretaryApi';

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

  const [teachers, setTeachers] = useState<SecretaryTeacher[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [form, setForm] = useState<CreateTeacherPayload>(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadTeachers = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetchTeachers({ academicYearId: selectedAcademicYear?.id, limit: 200 });
      setTeachers(res.data || []);
    } catch {
      setTeachers([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedAcademicYear?.id]);

  useEffect(() => {
    loadTeachers();
  }, [loadTeachers]);

  const filteredTeachers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return teachers;
    return teachers.filter(
      (t) =>
        t.name?.toLowerCase().includes(term) ||
        t.email?.toLowerCase().includes(term) ||
        t.matricule?.toLowerCase().includes(term),
    );
  }, [teachers, searchTerm]);

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
      loadTeachers();
    } catch (error: any) {
      if (error?.message !== 'Unauthorized') {
        toast.error(error?.message || 'Failed to create teacher.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Teachers</h1>
          <p className="text-gray-600 mt-1">Create and view teacher accounts.</p>
        </div>
        <Button color="primary" leftIcon={UserPlusIcon} onClick={() => setIsCreateOpen(true)}>
          Add Teacher
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="max-w-md">
          <Input
            label="Search"
            placeholder="Search by name, email or matricule"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            leftIcon={<MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />}
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Gender</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subjects</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    Loading teachers…
                  </td>
                </tr>
              ) : filteredTeachers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    No teachers found.
                  </td>
                </tr>
              ) : (
                filteredTeachers.map((teacher) => (
                  <tr key={teacher.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{teacher.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{teacher.email || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{teacher.phone || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{teacher.gender || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {teacher.subjects && teacher.subjects.length > 0
                        ? teacher.subjects.map((s) => s.name).join(', ')
                        : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

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
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
            <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" color="primary" isLoading={isSubmitting}>
              Create Teacher
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
