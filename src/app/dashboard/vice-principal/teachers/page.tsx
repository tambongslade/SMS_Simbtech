'use client';

import React, { useState } from 'react';
import { Plus, Edit, Trash2 } from 'lucide-react';

export default function TeachersManagement() {
  const [teachers, setTeachers] = useState([
    { 
      id: 1, 
      name: 'John Doe', 
      email: 'john.doe@school.com',
      subject: 'Mathematics',
      assignedClass: 'Form 1A',
      status: 'Active'
    },
  ]);

  const [isAddingTeacher, setIsAddingTeacher] = useState(false);
  const [newTeacher, setNewTeacher] = useState({
    name: '',
    email: '',
    subject: '',
    assignedClass: '',
    status: 'Active'
  });

  const subjects = ['Mathematics', 'English', 'Science', 'History', 'Geography'];
  const classes = ['Form 1A', 'Form 1B', 'Form 2A', 'Form 2B'];

  const handleAddTeacher = () => {
    if (newTeacher.name && newTeacher.email) {
      setTeachers([...teachers, {
        id: teachers.length + 1,
        ...newTeacher
      }]);
      setNewTeacher({
        name: '',
        email: '',
        subject: '',
        assignedClass: '',
        status: 'Active'
      });
      setIsAddingTeacher(false);
    }
  };

  const handleDeleteTeacher = (id: number) => {
    setTeachers(teachers.filter(t => t.id !== id));
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Teacher Management</h1>
        <button
          className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
          onClick={() => setIsAddingTeacher(true)}
        >
          <Plus className="h-4 w-4" />
          Add New Teacher
        </button>
      </div>

      {isAddingTeacher && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg w-96">
            <h2 className="text-xl font-bold mb-4">Add New Teacher</h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="teacherName" className="block text-sm font-medium text-gray-700">Full Name</label>
                <input
                  id="teacherName"
                  type="text"
                  value={newTeacher.name}
                  onChange={(e) => setNewTeacher({...newTeacher, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  id="email"
                  type="email"
                  value={newTeacher.email}
                  onChange={(e) => setNewTeacher({...newTeacher, email: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="subject" className="block text-sm font-medium text-gray-700">Subject</label>
                <select
                  id="subject"
                  value={newTeacher.subject}
                  onChange={(e) => setNewTeacher({...newTeacher, subject: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">Select subject</option>
                  {subjects.map((subject) => (
                    <option key={subject} value={subject}>
                      {subject}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label htmlFor="class" className="block text-sm font-medium text-gray-700">Assigned Class</label>
                <select
                  id="class"
                  value={newTeacher.assignedClass}
                  onChange={(e) => setNewTeacher({...newTeacher, assignedClass: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">Select class</option>
                  {classes.map((cls) => (
                    <option key={cls} value={cls}>
                      {cls}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleAddTeacher}
                className="w-full bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
              >
                Add Teacher
              </button>
              <button
                onClick={() => setIsAddingTeacher(false)}
                className="w-full bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white shadow rounded-lg">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold">Teachers Overview</h2>
        </div>
        <div className="p-6">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned Class</th>
                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {teachers.map((teacher) => (
                <tr key={teacher.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{teacher.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{teacher.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{teacher.subject}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{teacher.assignedClass || 'Not Assigned'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{teacher.status}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      <button className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200">
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                        onClick={() => handleDeleteTeacher(teacher.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}