'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Select, Button, Modal } from '@/components/ui'; // Assuming Modal component exists

// --- Types --- 
// Re-define or import types if necessary (Subject, Teacher, SelectedCellDataType)
interface Subject {
  id: string;
  name: string;
}

interface Teacher {
  id: string;
  name: string;
  subjects: string[]; 
}

interface SelectedCellDataType {
  day: string;
  periodName: string;
  subClassId: string;
  initialSubjectId: string | null;
  initialTeacherId: string | null;
}

interface AssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  cellData: SelectedCellDataType | null;
  subjects: Subject[];
  teachers: Teacher[]; // All teachers passed down
  getTeachersBySubject: (subjectId: string) => Teacher[]; // Function to filter teachers
  onSave: (subClassId: string, day: string, periodName: string, subjectId: string | null, teacherId: string | null) => void;
}

const AssignmentModal: React.FC<AssignmentModalProps> = ({ 
    isOpen, 
    onClose, 
    cellData, 
    subjects, 
    teachers, 
    getTeachersBySubject,
    onSave 
}) => {
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);

  // Reset state when modal opens with new data
  useEffect(() => {
    if (isOpen && cellData) {
      setSelectedSubjectId(cellData.initialSubjectId);
      setSelectedTeacherId(cellData.initialTeacherId);
    } else if (!isOpen) {
      // Optionally reset when closing
      setSelectedSubjectId(null);
      setSelectedTeacherId(null);
    }
  }, [isOpen, cellData]);

  // Derive qualified teachers based on selected subject
  const qualifiedTeachers = useMemo(() => {
    if (!selectedSubjectId) return [];
    return getTeachersBySubject(selectedSubjectId);
    // NOTE: No conflict filtering here, as requested
  }, [selectedSubjectId, getTeachersBySubject]);

  // Handle subject change - reset teacher if new subject selected
  const handleSubjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSubjectId = e.target.value || null;
    setSelectedSubjectId(newSubjectId);
    // Reset teacher selection if subject changes
    setSelectedTeacherId(null); 
  };

  const handleTeacherChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      setSelectedTeacherId(e.target.value || null);
  }

  const handleSaveClick = () => {
    if (!cellData) return; // Should not happen if modal is open
    
    // Pass null if "" (empty value) is selected
    const subjectToSave = selectedSubjectId === "" ? null : selectedSubjectId;
    const teacherToSave = selectedTeacherId === "" ? null : selectedTeacherId;
    
    onSave(cellData.subClassId, cellData.day, cellData.periodName, subjectToSave, teacherToSave);
    onClose();
  };

  // Prevent rendering if not open or no data
  if (!isOpen || !cellData) {
    return null;
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Assign Slot: ${cellData.day} - ${cellData.periodName}`}> 
      <div className="space-y-4 p-4">
        {/* Subject Select */}
        <div>
          <label htmlFor="subject-select" className="block text-sm font-medium text-gray-700 mb-1">
            Subject
          </label>
          <Select
            id="subject-select"
            value={selectedSubjectId ?? ''}
            onChange={handleSubjectChange}
            options={[
                { value: '', label: '--- Select Subject ---' }, // Default/Unassign option
                ...subjects.map(s => ({ value: s.id, label: s.name }))
            ]}
            placeholder="Select Subject"
          />
        </div>

        {/* Teacher Select - Enabled only if subject is selected */}
        <div>
          <label htmlFor="teacher-select" className="block text-sm font-medium text-gray-700 mb-1">
            Teacher
          </label>
          <Select
            id="teacher-select"
            value={selectedTeacherId ?? ''}
            onChange={handleTeacherChange}
            disabled={!selectedSubjectId} // Disable if no subject selected
            options={[
                { value: '', label: selectedSubjectId ? '--- Select Teacher ---' : 'Select Subject First' }, // Default/Unassign
                ...qualifiedTeachers.map(t => ({ value: t.id, label: t.name }))
            ]}
            placeholder="Select Teacher"
          />
           {!selectedSubjectId && (
               <p className="text-xs text-gray-500 mt-1">Please select a subject to see available teachers.</p>
           )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 pt-4">
          <Button color="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button 
             color="primary" 
             onClick={handleSaveClick}
             // Disable save if subject is selected but teacher is not (unless unassigning both)
             disabled={!!selectedSubjectId && !selectedTeacherId} 
          >
            Save Assignment
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default AssignmentModal; 