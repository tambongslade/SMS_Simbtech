"use client";

import React, { useState, useMemo } from 'react';
import { Button } from "@/components/ui";
import { Modal, ModalHeader, ModalBody, ModalFooter } from "@/components/ui";
import { Select } from "@/components/ui";
import { toast } from "react-hot-toast";
import { useTimetable } from './TimetableContext';

// Define the props for the TimetableGrid component
interface TimetableGridProps {
  selectedSubClassId: string;
}

// TimetableGrid component for displaying and editing timetable slots
export const TimetableGrid: React.FC<TimetableGridProps> = ({ selectedSubClassId }) => {
  const { 
    timetables, 
    allWeeklySlots,
    uniquePeriodNames,
    daysOfWeek,
    subjects, 
    teachers,
    updateTimetableSlot, 
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
  const currentTimetable = timetables[selectedSubClassId];
  const slots = currentTimetable?.slots || [];

  // Function to get a slot assignment for a specific day and period name
  const getSlotAssignment = (day: string, periodName: string) => {
    // Find the assignment in the timetable state
    return slots.find(slot => slot.day === day && slot.period === periodName) || null;
  };

  // Function to get the *definition* of a weekly slot (for times, isBreak)
  const getWeeklySlotDefinition = (day: string, periodName: string) => {
    return allWeeklySlots.find(ws => ws.dayOfWeek === day && ws.name === periodName);
  };

  // Function to open the edit modal for a slot
  const handleEditSlot = (day: string, periodName: string) => {
    const assignment = getSlotAssignment(day, periodName);
    const slotDefinition = getWeeklySlotDefinition(day, periodName);

    // Cannot edit if definition not found or if it's a break
    if (!slotDefinition || slotDefinition.isBreak) return; 

    setEditingDay(day);
    setEditingPeriod(periodName); 
    // Use assignment data if it exists
    setSelectedSubject(assignment?.subjectId || '');
    setSelectedTeacher(assignment?.teacherId || '');
    
    const initialSubjectId = assignment?.subjectId;
    const initialTeachers = initialSubjectId ? getTeachersBySubject(initialSubjectId) : [];
    setAvailableTeachers(initialTeachers.map(t => ({ id: t.id, name: t.name })));
    
    setEditModalOpen(true);
  };

  // Function to handle subject change in the edit modal
  const handleSubjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const subjectId = e.target.value;
    setSelectedSubject(subjectId);
    setSelectedTeacher('');
    
    const teachersForSubject = getTeachersBySubject(subjectId);
    setAvailableTeachers(teachersForSubject.map(t => ({ id: t.id, name: t.name })));
  };

  // Function to save the edited slot
  const handleSaveSlot = () => {
    if (selectedTeacher) {
      const conflictClass = isTeacherAssignedElsewhere(
        selectedTeacher,
        editingDay,
        editingPeriod,
        selectedSubClassId
      );

      if (conflictClass) {
        toast.error(`Teacher is already assigned to ${conflictClass} during this time`);
        return;
      }
    }

    updateTimetableSlot(
      selectedSubClassId,
      editingDay,
      editingPeriod,
      selectedSubject || null,
      selectedTeacher || null
    );

    setEditModalOpen(false);
    toast.success("Timetable slot updated locally. Remember to save changes.");
  };

  // Generate the cell content for a timetable slot
  const renderCellContent = (day: string, periodName: string) => {
    const assignment = getSlotAssignment(day, periodName);
    const slotDefinition = getWeeklySlotDefinition(day, periodName);

    if (!slotDefinition) return <td key={`${day}-${periodName}`} className="border-r h-20 text-red-500">Error: Slot?</td>;
    
    if (slotDefinition.isBreak) {
      return (
        <td key={`${day}-${periodName}`} className="border-r h-20 bg-gray-100 text-center text-gray-600 font-medium align-middle">
          {slotDefinition.name}
        </td>
      );
    }

    return (
      <td 
        key={`${day}-${periodName}`}
        className="border-r h-20 p-1 hover:bg-blue-50 cursor-pointer align-top"
        onClick={() => handleEditSlot(day, periodName)}
      >
        {assignment?.subjectId ? (
          <div>
            <div className="font-medium text-sm truncate">{assignment.subjectName || '(No Subject Name)'}</div>
            <div className="text-xs text-gray-500 truncate">{assignment.teacherName || '(No Teacher Name)'}</div>
          </div>
        ) : (
          <div className="text-center text-gray-400 text-xs pt-1">Assign</div>
        )}
      </td>
    );
  };

  // If essential data hasn't loaded
  if (uniquePeriodNames.length === 0 || daysOfWeek.length === 0) {
    return <div className="p-4 text-center text-gray-500">Loading timetable structure...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Timetable Grid */}
      <div className="border rounded-lg overflow-hidden shadow-sm">
        <table className="w-full text-xs md:text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="bg-gray-100">
              <th className="p-2 border-b border-r font-semibold text-gray-700 text-left sticky left-0 bg-gray-100 z-20 min-w-[100px]">Time / Period</th>
              {daysOfWeek.map(day => (
                <th key={day} className="p-2 border-b border-r font-semibold text-gray-700 capitalize">{day.toLowerCase()}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {uniquePeriodNames.map(periodName => {
              const representativeSlotDef = allWeeklySlots.find(ws => ws.name === periodName);
              return (
                <tr key={periodName} className="border-b hover:bg-gray-50">
                  <th className="p-1 border-r bg-gray-50 font-medium text-gray-800 sticky left-0 z-10 min-w-[100px]">
                    <div className="text-center">{periodName}</div>
                    {(representativeSlotDef?.startTime || representativeSlotDef?.endTime) && (
                      <div className="text-[10px] text-gray-500 font-normal text-center">
                        {representativeSlotDef.startTime?.substring(0, 5)} - {representativeSlotDef.endTime?.substring(0, 5)}
                      </div>
                    )}
                  </th>
                  {daysOfWeek.map(day => renderCellContent(day, periodName))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Edit Slot Modal */}
      {editModalOpen && (
        <Modal isOpen={editModalOpen} onClose={() => setEditModalOpen(false)} size="lg">
          <ModalHeader>Edit Slot ({editingDay} - {editingPeriod})</ModalHeader>
          <ModalBody className="space-y-4">
            <div>
              <label htmlFor="subjectSelect" className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
              <Select 
                id="subjectSelect" 
                value={selectedSubject}
                onChange={handleSubjectChange}
                options={[{ value: '', label: '-- Select Subject --' }, ...subjects.map(s => ({ value: s.id, label: s.name }))]} 
                placeholder="Select a subject"
              />
            </div>
            <div>
              <label htmlFor="teacherSelect" className="block text-sm font-medium text-gray-700 mb-1">Teacher</label>
              <Select 
                id="teacherSelect" 
                value={selectedTeacher}
                onChange={(e) => setSelectedTeacher(e.target.value)}
                options={[{ value: '', label: '-- Select Teacher --' }, ...availableTeachers.map(t => ({ value: t.id, label: t.name }))]} 
                placeholder={selectedSubject ? "Select a teacher" : "Select subject first"}
                disabled={!selectedSubject}
              />
            </div>
          </ModalBody>
          <ModalFooter>
            <Button 
                color="secondary" 
                onClick={() => {
                  setSelectedSubject(''); 
                  setSelectedTeacher(''); 
                  handleSaveSlot();
                }}
                className="mr-auto"
              >
                Clear Assignment
              </Button>
            <Button color="secondary" onClick={() => setEditModalOpen(false)}>Cancel</Button>
            <Button 
                color="primary" 
                onClick={handleSaveSlot} 
                disabled={!selectedSubject || !selectedTeacher}
            >
              Update Slot
            </Button>
          </ModalFooter>
        </Modal>
      )}
    </div>
  );
}; 