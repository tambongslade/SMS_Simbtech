'use client';

import React, { useState } from 'react';
import { Plus, Edit, Trash2 } from 'lucide-react';

export default function ClassesManagement() {
  const [classes, setClasses] = useState([
    { id: 1, name: 'Form 1A', capacity: 40, assignedTeacher: 'Mr. John Doe' },
    { id: 2, name: 'Form 1B', capacity: 35, assignedTeacher: 'Mrs. Jane Smith' },
  ]);

  const [isAddingClass, setIsAddingClass] = useState(false);
  const [newClass, setNewClass] = useState({
    name: '',
    capacity: '',
    assignedTeacher: ''
  });

  const handleAddClass = () => {
    if (newClass.name && newClass.capacity) {
      setClasses([...classes, {
        id: classes.length + 1,
        ...newClass
      }]);
      setNewClass({ name: '', capacity: '', assignedTeacher: '' });
      setIsAddingClass(false);
    }
  };

  const handleDeleteClass = (id: number) => {
    setClasses(classes.filter(c => c.id !== id));
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Class Management</h1>
        <button
          className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
          onClick={() => setIsAddingClass(true)}
        >
          <Plus className="h-4 w-4" />
          Add New Class
        </button>
      </div>

      {isAddingClass && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg w-96">
            <h2 className="text-xl font-bold mb-4">Add New Class</h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="className" className="block text-sm font-medium text-gray-700">Class Name</label>
                <input
                  id="className"
                  type="text"
                  value={newClass.name}
                  onChange={(e) => setNewClass({...newClass, name: e.target.value})}
                  placeholder="e.g., Form 1A"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="capacity" className="block text-sm font-medium text-gray-700">Capacity</label>
                <input
                  id="capacity"
                  type="number"
                  value={newClass.capacity}
                  onChange={(e) => setNewClass({...newClass, capacity: e.target.value})}
                  placeholder="e.g., 40"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <button
                onClick={handleAddClass}
                className="w-full bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
              >
                Add Class
              </button>
              <button
                onClick={() => setIsAddingClass(false)}
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
          <h2 className="text-xl font-bold">Classes Overview</h2>
        </div>
        <div className="p-6">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Class Name</th>
                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Capacity</th>
                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned Teacher</th>
                <th className="px-6 py-3 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {classes.map((cls) => (
                <tr key={cls.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{cls.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{cls.capacity}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{cls.assignedTeacher || 'Not Assigned'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      <button className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200">
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                        onClick={() => handleDeleteClass(cls.id)}
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