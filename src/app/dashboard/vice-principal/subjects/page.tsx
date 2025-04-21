'use client';

import React, { useState } from 'react';
import { Plus, Edit, Trash2 } from 'lucide-react';

export default function SubjectsManagement() {
  const [subjects, setSubjects] = useState([
    { 
      id: 1, 
      name: 'Mathematics', 
      code: 'MATH101',
      description: 'Core mathematics curriculum for secondary education',
      department: 'Mathematics',
      assignedTeachers: ['John Doe', 'Jane Smith']
    },
  ]);

  const [isAddingSubject, setIsAddingSubject] = useState(false);
  const [newSubject, setNewSubject] = useState({
    name: '',
    code: '',
    description: '',
    department: '',
    assignedTeachers: []
  });

  const departments = [
    'Mathematics',
    'Sciences',
    'Languages',
    'Humanities',
    'Arts',
    'Physical Education'
  ];

  const handleAddSubject = () => {
    if (newSubject.name && newSubject.code) {
      setSubjects([...subjects, {
        id: subjects.length + 1,
        ...newSubject
      }]);
      setNewSubject({
        name: '',
        code: '',
        description: '',
        department: '',
        assignedTeachers: []
      });
      setIsAddingSubject(false);
    }
  };

  const handleDeleteSubject = (id: number) => {
    setSubjects(subjects.filter(s => s.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Subject Management</h1>
        <button
          onClick={() => setIsAddingSubject(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <Plus className="h-4 w-4" />
          Add New Subject
        </button>
      </div>

      {/* Modal/Dialog */}
      {isAddingSubject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Add New Subject</h2>
                <button
                  onClick={() => setIsAddingSubject(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="subjectName" className="block text-sm font-medium text-gray-700">
                    Subject Name
                  </label>
                  <input
                    id="subjectName"
                    type="text"
                    value={newSubject.name}
                    onChange={(e) => setNewSubject({...newSubject, name: e.target.value})}
                    placeholder="e.g., Mathematics"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="code" className="block text-sm font-medium text-gray-700">
                    Subject Code
                  </label>
                  <input
                    id="code"
                    type="text"
                    value={newSubject.code}
                    onChange={(e) => setNewSubject({...newSubject, code: e.target.value})}
                    placeholder="e.g., MATH101"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <textarea
                    id="description"
                    value={newSubject.description}
                    onChange={(e) => setNewSubject({...newSubject, description: e.target.value})}
                    placeholder="Enter subject description"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="department" className="block text-sm font-medium text-gray-700">
                    Department
                  </label>
                  <select
                    id="department"
                    value={newSubject.department}
                    onChange={(e) => setNewSubject({...newSubject, department: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select department</option>
                    {departments.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={handleAddSubject}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Add Subject
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Card */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">Subjects Overview</h2>
        </div>
        <div className="p-6">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned Teachers</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {subjects.map((subject) => (
                  <tr key={subject.id}>
                    <td className="px-6 py-4 whitespace-nowrap">{subject.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{subject.code}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{subject.department}</td>
                    <td className="px-6 py-4 max-w-xs truncate">{subject.description}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{subject.assignedTeachers.join(', ') || 'None'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex justify-end gap-2">
                        <button className="p-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100">
                          <Edit className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteSubject(subject.id)}
                          className="p-2 text-red-600 hover:text-red-900 rounded-lg hover:bg-red-100"
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
    </div>
  );
}