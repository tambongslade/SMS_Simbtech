'use client'
import { useState } from 'react';
import { Table, Button, Input, Select, Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui';

const roles = [
  { value: 'supermanager', label: 'Super Manager' },
  { value: 'manager', label: 'Manager' },
  { value: 'principal', label: 'Principal' },
  { value: 'teacher', label: 'Teacher' },
  { value: 'bursar', label: 'Bursar' },
  { value: 'disciplinemaster', label: 'Discipline Master' },
  { value: 'guidancecounselor', label: 'Guidance Counselor' },
  { value: 'parentstudent', label: 'Parent/Student' },
];

type Personnel = {
  id: number;
  name: string;
  role: string;
  username: string;
  password: string;
};

export default function PersonnelManagement() {
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Personnel>>({ name: '', role: '', username: '', password: '' });

  const handleAddPersonnel = () => {
    setIsModalOpen(true);
  };

  const handleSavePersonnel = () => {
    if (formData.name && formData.role && formData.username && formData.password) {
      setPersonnel([...personnel, { ...formData, id: Date.now() } as Personnel]);
      setFormData({ name: '', role: '', username: '', password: '' });
      setIsModalOpen(false);
    }
  };

  const handleEditPersonnel = (id: number) => {
    const person = personnel.find((p) => p.id === id);
    if (person) {
      setFormData(person);
      setIsModalOpen(true);
    }
  };

  const handleUpdatePersonnel = () => {
    setPersonnel(personnel.map((p) => (p.id === formData.id ? formData as Personnel : p)));
    setFormData({ name: '', role: '', username: '', password: '' });
    setIsModalOpen(false);
  };

  const handleDeletePersonnel = (id: number) => {
    setPersonnel(personnel.filter((p) => p.id !== id));
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">Personnel Management</h1>
      <p>Manage personnel, assign roles, and create user login information.</p>

      <div className="mt-6">
        <Button onClick={handleAddPersonnel} className="mb-4">Add Personnel</Button>
        <Button onClick={() => alert('Download Report Card Template')} className="mb-4">Generate Report Card</Button>
        <Table
          data={personnel}
          columns={[
            { key: 'name', header: 'Name' },
            { key: 'role', header: 'Role', render: (value) => <Select options={roles} value={value} onChange={(e) => setFormData({ ...formData, role: e.target.value })} /> },
            { key: 'username', header: 'Username' },
            { key: 'actions', header: 'Actions', render: (_, item) => (
              <div className="flex space-x-2">
                <Button onClick={() => handleEditPersonnel(item.id)}>Edit</Button>
                <Button onClick={() => handleDeletePersonnel(item.id)} variant="danger">Delete</Button>
              </div>
            ) },
          ]}
        />
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <ModalHeader>{formData.id ? 'Edit Personnel' : 'Create Personnel'}</ModalHeader>
        <ModalBody>
          <Input
            label="Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="mb-4"
          />
          <Select
            label="Role"
            options={roles}
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            className="mb-4"
          />
          <Input
            label="Username"
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            className="mb-4"
          />
          <Input
            label="Password"
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            className="mb-4"
          />
        </ModalBody>
        <ModalFooter>
          <Button onClick={formData.id ? handleUpdatePersonnel : handleSavePersonnel}>
            {formData.id ? 'Update' : 'Save'}
          </Button>
          <Button onClick={() => setIsModalOpen(false)} variant="ghost">Cancel</Button>
        </ModalFooter>
      </Modal>
    </div>
  );
} 