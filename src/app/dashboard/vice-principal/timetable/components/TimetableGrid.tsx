"use client";

import React, { useState, useMemo } from 'react';
import { Button } from "@/components/ui";
import { Modal, ModalHeader, ModalBody, ModalFooter } from "@/components/ui";
import { Select } from "@/components/ui";
import { toast } from "react-hot-toast";
import { useTimetable } from './TimetableContext';

// Define the props for the TimetableGrid component
interface TimetableGridProps {
  selectedClassId: string;
}

// Days of the week for the timetable
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

// Period times mapping
const PERIOD_TIMES: { [key: string]: string } = {
  'Period 1': '07:30-8:25',
  'Period 2': '8:25-09:20',
  'Period 3': '09:20-10:15',
  'Period 4': '10:15-10:30',
  'Period 5': '10:30-11:25',
  'Period 6': '11:25-12:20',
  'Lunch': '12:20-12:50',
  'Period 7': '12:50-1:45',
  'Period 8': '1:45-2:40',
  'Period 9': '2:40-3:25',
  'Period 10': '3:35-3:45',
  'Period 11': '3:45-4:45',
  'Period 12': '4:45-5:30',
};

// TimetableGrid component for displaying and editing timetable slots
export const TimetableGrid: React.FC<TimetableGridProps> = ({ selectedClassId }) => {
  const { 
    timetables, 
    subjects, 
    updateTimetableSlot, 
    saveChanges, 
    getTeachersBySubject, 
    isTeacherAssignedElsewhere 
  } = useTimetable();

  // State for the edit modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingDay, setEditingDay] = useState('');
  const [editingPeriod, setEditingPeriod] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [availableTeachers, setAvailableTeachers] = useState<{ id: string; name: string }[]>([]);

  // Get the current timetable for the selected class
  const currentTimetable = timetables[selectedClassId];

  // Get unique periods from the timetable slots, sorted in order
  const periods = useMemo(() => {
    if (!currentTimetable) return [];
    
    const uniquePeriods = Array.from(
      new Set(currentTimetable.slots.map(slot => slot.period))
    );
    
    // Custom sort to ensure periods are in the correct order
    return uniquePeriods.sort((a, b) => {
      // Keep "Lunch" after Period 6
      if (a === "Lunch") return b.startsWith("Period") && parseInt(b.replace("Period ", "")) <= 6 ? 1 : -1;
      if (b === "Lunch") return a.startsWith("Period") && parseInt(a.replace("Period ", "")) <= 6 ? -1 : 1;
      
      // Standard period sorting - extract numbers for proper numeric sorting
      const aNum = a.startsWith("Period") ? parseInt(a.replace("Period ", "")) : 999;
      const bNum = b.startsWith("Period") ? parseInt(b.replace("Period ", "")) : 999;
      return aNum - bNum;
    });
  }, [currentTimetable]);

  // Function to get a slot for a specific day and period
  const getSlot = (day: string, period: string) => {
    if (!currentTimetable) return null;
    // Only filter by day and period - allow all slots to be assigned
    return currentTimetable.slots.find(slot => 
      slot.day === day && 
      slot.period === period
    ) || null;
  };

  // Function to get the subject name for a given subject ID
  const getSubjectName = (subjectId?: string) => {
    if (!subjectId) return "";
    const subject = subjects.find(s => s.id === subjectId);
    return subject ? subject.name : "";
  };

  // Function to get the teacher name for a given teacher ID
  const getTeacherName = (teacherId?: string) => {
    if (!teacherId) return "";
    const teachers = availableTeachers;
    const teacher = teachers.find(t => t.id === teacherId);
    return teacher ? teacher.name : "";
  };

  // Function to open the edit modal for a slot
  const handleEditSlot = (day: string, period: string) => {
    const slot = getSlot(day, period);
    if (!slot || slot.isBreak) return;

    setEditingDay(day);
    setEditingPeriod(period);
    setSelectedSubject(slot.subjectId || '');
    setSelectedTeacher(slot.teacherId || '');
    setEditModalOpen(true);

    // Update available teachers based on selected subject
    if (slot.subjectId) {
      const teachers = getTeachersBySubject(slot.subjectId);
      setAvailableTeachers(teachers);
    } else {
      setAvailableTeachers([]);
    }
  };

  // Function to handle subject change in the edit modal
  const handleSubjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const subjectId = e.target.value;
    setSelectedSubject(subjectId);
    setSelectedTeacher(''); // Reset teacher when subject changes
    
    // Update available teachers based on selected subject
    const teachers = getTeachersBySubject(subjectId);
    setAvailableTeachers(teachers);
  };

  // Function to save the edited slot
  const handleSaveSlot = () => {
    if (!selectedSubject || !selectedTeacher) {
      toast.error("Please select both subject and teacher");
      return;
    }

    // Check if teacher is already assigned elsewhere
    const conflictClass = isTeacherAssignedElsewhere(
      selectedTeacher,
      editingDay,
      editingPeriod,
      selectedClassId
    );

    if (conflictClass) {
      toast.error(`Teacher is already assigned to ${conflictClass} during this time`);
      return;
    }

    // Update the timetable slot
    updateTimetableSlot(
      selectedClassId,
      editingDay,
      editingPeriod,
      selectedSubject,
      selectedTeacher
    );

    // Close the modal
    setEditModalOpen(false);
    toast.success("Timetable slot updated");
  };

  // Function to save the entire timetable
  const handleSaveTimetable = () => {
    saveChanges();
    toast.success("Timetable saved successfully");
  };

  // Generate the cell content for a timetable slot
  const renderCellContent = (day: string, period: string) => {
    const slot = getSlot(day, period);
    if (!slot) return null;

    if (slot.isBreak) {
      return (
        <div className="bg-gray-100 p-2 text-center font-medium">
          Lunch Break
        </div>
      );
    }

    // Allow assignment for all slots, including Monday first period
    if (slot.subjectId && slot.teacherId) {
      return (
        <div 
          className="p-2 hover:bg-gray-50 cursor-pointer h-full"
          onClick={() => handleEditSlot(day, period)}
        >
          <div className="font-medium">{getSubjectName(slot.subjectId)}</div>
          <div className="text-sm text-gray-500">
            {getTeachersBySubject(slot.subjectId).find(t => t.id === slot.teacherId)?.name || slot.teacherId}
          </div>
        </div>
      );
    }

    return (
      <div 
        className="p-2 hover:bg-gray-50 cursor-pointer h-full flex items-center justify-center text-gray-400"
        onClick={() => handleEditSlot(day, period)}
      >
        Click to assign
      </div>
    );
  };

  // If there's no timetable for the selected class, show a loading state or empty message
  if (!currentTimetable) {
    return <div className="p-4">No timetable available for the selected class</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Class Timetable</h2>
        <Button onClick={handleSaveTimetable}>Save Timetable</Button>
      </div>

      {/* Timetable Grid */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 border-b border-r">Period / Day</th>
              {DAYS.map(day => (
                <th key={day} className="p-2 border-b border-r">{day}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {periods.map(period => (
              <tr key={period} className="border-b">
                <th className="p-2 border-r bg-gray-50">
                  <div>{period}</div>
                  <div className="text-xs text-gray-500 font-normal">{PERIOD_TIMES[period] || ''}</div>
                </th>
                {DAYS.map(day => (
                  <td key={`${day}-${period}`} className="border-r h-20">
                    {renderCellContent(day, period)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      <Modal 
        isOpen={editModalOpen} 
        onClose={() => setEditModalOpen(false)}
        title={`Edit Timetable Slot - ${editingDay}, ${editingPeriod}`}
      >
        <ModalBody>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Subject</label>
              <Select
                value={selectedSubject}
                onChange={handleSubjectChange}
                options={subjects.map(subject => ({
                  value: subject.id,
                  label: subject.name
                }))}
              />
            </div>

            {/* Only show teacher dropdown if a subject is selected */}
            {selectedSubject && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Teacher</label>
                <Select
                  value={selectedTeacher}
                  onChange={(e) => setSelectedTeacher(e.target.value)}
                  disabled={availableTeachers.length === 0}
                  options={availableTeachers.map(teacher => ({
                    value: teacher.id,
                    label: teacher.name
                  }))}
                />
                {availableTeachers.length === 0 && (
                  <p className="text-sm text-red-500">No teachers available for this subject</p>
                )}
              </div>
            )}
          </div>
        </ModalBody>
        <ModalFooter>
          <Button onClick={() => setEditModalOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSaveSlot} disabled={!selectedSubject || !selectedTeacher}>
            Save
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}; 