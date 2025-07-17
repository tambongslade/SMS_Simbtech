"use client";

import React, { useState, useMemo } from 'react';
import { Button } from "@/components/ui";
import { Modal, ModalHeader, ModalBody, ModalFooter } from "@/components/ui";
import { Select } from "@/components/ui";
import { toast } from "react-hot-toast";
import { useTimetable } from './TimetableContext';

// Days of the week for the timetable (ordered)
const DAYS_ORDER = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];

// Define the props for the TimetableGrid component
interface TimetableGridProps {
  selectedSubClassId: string;
}

// TimetableGrid component for displaying and editing timetable slots
export const TimetableGrid: React.FC<TimetableGridProps> = ({ selectedSubClassId }) => {
  const {
    timetables,
    allWeeklySlots,
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

  // Get all unique periods sorted by time
  const allPeriods = useMemo(() => {
    // Group periods by time range (startTime-endTime)
    const timeGroups: { [timeRange: string]: any } = {};

    allWeeklySlots.forEach(slot => {
      const timeRange = `${slot.startTime}-${slot.endTime}`;
      if (!timeGroups[timeRange]) {
        timeGroups[timeRange] = {
          startTime: slot.startTime,
          endTime: slot.endTime,
          isBreak: slot.isBreak,
          timeRange: timeRange,
          // Store one representative slot for reference
          representativeSlot: slot
        };
      }
    });

    // Convert to array and sort by start time
    const uniquePeriods = Object.values(timeGroups).sort((a, b) => {
      if (!a.startTime && !b.startTime) return 0;
      if (!a.startTime) return 1;
      if (!b.startTime) return -1;
      return a.startTime.localeCompare(b.startTime);
    });

    return uniquePeriods;
  }, [allWeeklySlots]);

  // Get the current timetable for the selected class from full school data
  const currentTimetable = timetables[selectedSubClassId];
  const slots = currentTimetable?.slots || [];

  // Function to get a slot assignment for a specific day and period name
  const getSlotAssignment = (day: string, periodName: string) => {
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
  const renderCellContent = (day: string, timeSlot: any) => {
    // Find the specific period name for this day and time
    const dayPeriod = allWeeklySlots.find(slot =>
      slot.dayOfWeek === day &&
      slot.startTime === timeSlot.startTime &&
      slot.endTime === timeSlot.endTime
    );

    if (!dayPeriod) {
      return (
        <td key={`${day}-${timeSlot.timeRange}`} className="border-r h-20 text-gray-400 text-center text-xs">
          <div className="h-full flex items-center justify-center"></div>
        </td>
      );
    }

    const periodName = dayPeriod.name;
    const assignment = getSlotAssignment(day, periodName);

    // Determine background color based on assignment and conflicts
    const conflict = assignment?.teacherId ? isTeacherAssignedElsewhere(assignment.teacherId, day, periodName, selectedSubClassId) : null;
    let bgColor = 'bg-white hover:bg-blue-50'; // Default for unassigned slots
    if (assignment?.subjectId) {
      bgColor = conflict ? 'bg-red-200 hover:bg-red-300' : 'bg-blue-100 hover:bg-blue-200';
    }

    if (dayPeriod.isBreak) {
      return (
        <td key={`${day}-${timeSlot.timeRange}`} className="border-r h-20 bg-gray-100 text-center text-gray-600 font-medium align-middle">
          <div className="text-xs">Break</div>
        </td>
      );
    }

    return (
      <td
        key={`${day}-${timeSlot.timeRange}`}
        className={`border-r h-20 p-1 cursor-pointer align-top ${bgColor}`}
        onClick={() => handleEditSlot(day, periodName)}
      >
        {assignment?.subjectId ? (
          <div className="h-full flex flex-col justify-center text-center">
            <div className="font-semibold text-xs truncate px-1">{assignment.subjectName || '(No Subject Name)'}</div>
            <div className="text-xs text-gray-600 truncate px-1">{assignment.teacherName || '(No Teacher Name)'}</div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-400 text-xs">
            <div>Click to assign</div>
          </div>
        )}
      </td>
    );
  };

  // If essential data hasn't loaded
  if (allPeriods.length === 0) {
    return <div className="p-4 text-center text-gray-500">Loading timetable structure...</div>;
  }

  if (!selectedSubClassId) {
    return <div className="p-4 text-center text-gray-500">Please select a subclass to view its timetable.</div>;
  }

  return (
    <div className="space-y-4 w-full">
      {/* Timetable Grid */}
      <div className="bg-white rounded-lg shadow w-full">
        <div className="p-4">
          <div className="w-full border rounded-lg">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-xs">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r sticky left-0 bg-gray-50 z-20 min-w-[120px]">
                      Period / Time
                    </th>
                    {DAYS_ORDER.map(day => (
                      <th key={day} className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-r min-w-[140px]">
                        {day.charAt(0) + day.slice(1).toLowerCase()}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {allPeriods.map((timeSlot, index) => {
                    const periodNumber = index + 1;
                    const timeRange = `${timeSlot.startTime?.substring(0, 5) || ''} - ${timeSlot.endTime?.substring(0, 5) || ''}`;

                    return (
                      <tr key={timeSlot.timeRange} className="border-b hover:bg-gray-50">
                        <th className="px-2 py-2 border-r bg-gray-50 font-medium text-gray-800 sticky left-0 z-10 min-w-[120px]">
                          <div className="text-center text-sm font-semibold">Period {periodNumber}</div>
                          <div className="text-xs text-gray-500 font-normal text-center mt-1">
                            {timeRange}
                          </div>
                          {timeSlot.isBreak && (
                            <div className="text-xs text-blue-600 font-normal text-center mt-1">
                              (Break)
                            </div>
                          )}
                        </th>
                        {DAYS_ORDER.map(day => renderCellContent(day, timeSlot))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
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
              />
            </div>
            <div>
              <label htmlFor="teacherSelect" className="block text-sm font-medium text-gray-700 mb-1">Teacher</label>
              <Select
                id="teacherSelect"
                value={selectedTeacher}
                onChange={(e) => setSelectedTeacher(e.target.value)}
                options={[{ value: '', label: '-- Select Teacher --' }, ...availableTeachers.map(t => ({ value: t.id, label: t.name }))]}
                disabled={!selectedSubject}
              />
            </div>
            {selectedTeacher && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> Changes will be saved locally. Click "Save Changes" button above to persist to the server.
                </p>
              </div>
            )}
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