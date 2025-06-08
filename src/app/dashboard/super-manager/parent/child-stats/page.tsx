import React from 'react';

const mockChildren = [
  { id: 1, name: 'John Doe', attendance: '-', averageGrade: '-', quizzesTaken: '-' },
  { id: 2, name: 'Jane Doe', attendance: '-', averageGrade: '-', quizzesTaken: '-' },
];

export default function ChildStatsPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Child Statistics</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {mockChildren.map(child => (
          <div key={child.id} className="bg-white rounded-lg shadow p-4">
            <h2 className="text-lg font-semibold mb-2">{child.name}</h2>
            <div className="mb-2 text-sm text-gray-600">Attendance: <span className="font-bold text-gray-900">{child.attendance}</span></div>
            <div className="mb-2 text-sm text-gray-600">Average Grade: <span className="font-bold text-gray-900">{child.averageGrade}</span></div>
            <div className="mb-2 text-sm text-gray-600">Quizzes Taken: <span className="font-bold text-gray-900">{child.quizzesTaken}</span></div>
          </div>
        ))}
      </div>
    </div>
  );
} 