"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { Button } from "@/components/ui";
import { Modal, ModalHeader, ModalBody, ModalFooter } from "@/components/ui";
import { Select } from "@/components/ui";
import { toast } from "react-hot-toast";
import { useTimetable, SlotAssignment } from './TimetableContext';
import { PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';

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
    addSlotAssignment,
    updateSlotAssignment,
    removeSlotAssignment,
    getTeachersBySubject,
    isTeacherAssignedElsewhere
  } = useTimetable();

  // Mobile: show one day at a time. Defaults to Monday, then jumps to today's
  // weekday client-side (in an effect to avoid SSR hydration mismatch).
  const [activeDay, setActiveDay] = useState('MONDAY');
  useEffect(() => {
    const todayIndex = new Date().getDay() - 1; // 0 = Monday
    if (todayIndex >= 0 && todayIndex < DAYS_ORDER.length) setActiveDay(DAYS_ORDER[todayIndex]);
  }, []);

  // State for the manage slot modal
  const [manageModalOpen, setManageModalOpen] = useState(false);
  const [editingDay, setEditingDay] = useState('');
  const [editingPeriod, setEditingPeriod] = useState('');
  // State for the "add new assignment" form within the modal
  const [newSubject, setNewSubject] = useState('');
  const [newTeacher, setNewTeacher] = useState('');
  const [newTeacherOptions, setNewTeacherOptions] = useState<{ id: string; name: string }[]>([]);

  // Get all unique periods sorted by time
  const allPeriods = useMemo(() => {
    const timeGroups: { [timeRange: string]: any } = {};

    allWeeklySlots.forEach(slot => {
      const timeRange = `${slot.startTime}-${slot.endTime}`;
      if (!timeGroups[timeRange]) {
        timeGroups[timeRange] = {
          startTime: slot.startTime,
          endTime: slot.endTime,
          isBreak: slot.isBreak,
          timeRange: timeRange,
          representativeSlot: slot
        };
      }
    });

    const uniquePeriods = Object.values(timeGroups).sort((a, b) => {
      if (!a.startTime && !b.startTime) return 0;
      if (!a.startTime) return 1;
      if (!b.startTime) return -1;
      return a.startTime.localeCompare(b.startTime);
    });

    return uniquePeriods;
  }, [allWeeklySlots]);

  // Get the current timetable for the selected class from full school data
  const currentTimetable = useMemo(() => {
    return timetables[selectedSubClassId];
  }, [timetables, selectedSubClassId]);

  const slots = useMemo(() => {
    return currentTimetable?.slots || [];
  }, [currentTimetable]);

  // Function to get a slot for a specific day and period name
  const getSlot = (day: string, periodName: string) => {
    return slots.find(slot => slot.day === day && slot.period === periodName) || null;
  };

  // Function to get the *definition* of a weekly slot (for times, isBreak)
  const getWeeklySlotDefinition = (day: string, periodName: string) => {
    return allWeeklySlots.find(ws => ws.dayOfWeek === day && ws.name === periodName);
  };

  // Get live assignments for the currently editing slot
  const currentSlotAssignments = useMemo(() => {
    if (!manageModalOpen || !editingDay || !editingPeriod) return [];
    const slot = getSlot(editingDay, editingPeriod);
    return slot?.assignments || [];
  }, [manageModalOpen, editingDay, editingPeriod, slots]);

  // Function to open the manage modal for a slot
  const handleManageSlot = (day: string, periodName: string) => {
    const slotDefinition = getWeeklySlotDefinition(day, periodName);
    if (!slotDefinition || slotDefinition.isBreak) return;

    setEditingDay(day);
    setEditingPeriod(periodName);
    setNewSubject('');
    setNewTeacher('');
    setNewTeacherOptions([]);
    setManageModalOpen(true);
  };

  // Handle subject change in the add form
  const handleNewSubjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const subjectId = e.target.value;
    setNewSubject(subjectId);
    setNewTeacher('');
    const teachersForSubject = subjectId ? getTeachersBySubject(subjectId) : [];
    setNewTeacherOptions(teachersForSubject.map(t => ({ id: t.id, name: t.name })));
  };

  // Add a new assignment to the current slot
  const handleAddAssignment = () => {
    if (!newSubject || !newTeacher) return;

    // Check for teacher conflict in other classes
    const conflictClass = isTeacherAssignedElsewhere(
      newTeacher,
      editingDay,
      editingPeriod,
      selectedSubClassId
    );
    if (conflictClass) {
      toast.error(`Teacher is already assigned to ${conflictClass} during this time`);
      return;
    }

    addSlotAssignment(selectedSubClassId, editingDay, editingPeriod, newSubject, newTeacher);
    setNewSubject('');
    setNewTeacher('');
    setNewTeacherOptions([]);
    toast.success("Assignment added. Remember to save changes.");
  };

  // Remove an assignment from the current slot
  const handleRemoveAssignment = (index: number) => {
    removeSlotAssignment(selectedSubClassId, editingDay, editingPeriod, index);
    toast.success("Assignment removed. Remember to save changes.");
  };

  // Generate the cell content for a timetable slot
  const renderCellContent = (day: string, timeSlot: any) => {
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
    const slot = getSlot(day, periodName);
    const assignments = slot?.assignments || [];

    if (dayPeriod.isBreak) {
      return (
        <td key={`${day}-${timeSlot.timeRange}`} className="border-r h-20 bg-gray-100 text-center text-gray-600 font-medium align-middle">
          <div className="text-xs">Break</div>
        </td>
      );
    }

    // Determine background color based on assignments and conflicts
    const hasAnyConflict = assignments.some(a =>
      a.teacherId ? isTeacherAssignedElsewhere(a.teacherId, day, periodName, selectedSubClassId) : false
    );
    let bgColor = 'bg-white hover:bg-blue-50';
    if (assignments.length > 0) {
      bgColor = hasAnyConflict ? 'bg-red-200 hover:bg-red-300' : 'bg-blue-100 hover:bg-blue-200';
    }

    return (
      <td
        key={`${day}-${timeSlot.timeRange}`}
        className={`border-r h-20 p-1 cursor-pointer align-top ${bgColor}`}
        onClick={() => handleManageSlot(day, periodName)}
      >
        {assignments.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-400 text-xs">
            <div>Click to assign</div>
          </div>
        ) : assignments.length === 1 ? (
          <div className="h-full flex flex-col justify-center text-center">
            <div className="font-semibold text-xs truncate px-1">{assignments[0].subjectName || '(No Subject)'}</div>
            <div className="text-xs text-gray-600 truncate px-1">{assignments[0].teacherName || '(No Teacher)'}</div>
          </div>
        ) : (
          <div className="h-full flex flex-col justify-center gap-0.5">
            {assignments.map((a, i) => (
              <div key={i} className={`text-center ${i > 0 ? 'border-t border-blue-200 pt-0.5' : ''}`}>
                <div className="font-semibold text-[10px] truncate px-0.5 leading-tight">{a.subjectName || '(No Subject)'}</div>
                <div className="text-[10px] text-gray-600 truncate px-0.5 leading-tight">{a.teacherName || '(No Teacher)'}</div>
              </div>
            ))}
          </div>
        )}
      </td>
    );
  };

  // Mobile row: one period of the active day as a tappable list item
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderMobileRow = (timeSlot: any, index: number) => {
    const periodNumber = index + 1;
    const timeRange = `${timeSlot.startTime?.substring(0, 5) || ''} - ${timeSlot.endTime?.substring(0, 5) || ''}`;
    const dayPeriod = allWeeklySlots.find(slot =>
      slot.dayOfWeek === activeDay &&
      slot.startTime === timeSlot.startTime &&
      slot.endTime === timeSlot.endTime
    );

    const timeCol = (
      <div className="w-20 shrink-0 text-center">
        <div className="text-xs font-semibold text-gray-800">P{periodNumber}</div>
        <div className="text-[10px] text-gray-500">{timeRange}</div>
      </div>
    );

    if (!dayPeriod) {
      return (
        <li key={timeSlot.timeRange} className="flex items-center gap-3 px-3 py-2.5">
          {timeCol}
          <div className="text-xs text-gray-300">—</div>
        </li>
      );
    }

    if (dayPeriod.isBreak) {
      return (
        <li key={timeSlot.timeRange} className="flex items-center gap-3 px-3 py-2.5 bg-gray-50">
          {timeCol}
          <div className="text-xs font-medium text-gray-500">Break</div>
        </li>
      );
    }

    const slot = getSlot(activeDay, dayPeriod.name);
    const assignments = slot?.assignments || [];
    const hasAnyConflict = assignments.some(a =>
      a.teacherId ? isTeacherAssignedElsewhere(a.teacherId, activeDay, dayPeriod.name, selectedSubClassId) : false
    );
    const bg = assignments.length === 0
      ? 'bg-white active:bg-blue-50'
      : hasAnyConflict ? 'bg-red-100 active:bg-red-200' : 'bg-blue-50 active:bg-blue-100';

    return (
      <li key={timeSlot.timeRange}>
        <button
          onClick={() => handleManageSlot(activeDay, dayPeriod.name)}
          className={`w-full flex items-center gap-3 px-3 py-2.5 text-left ${bg}`}
        >
          {timeCol}
          <div className="min-w-0 flex-1">
            {assignments.length === 0 ? (
              <span className="text-xs text-gray-400">Tap to assign</span>
            ) : (
              <div className="space-y-1">
                {assignments.map((a, i) => (
                  <div key={i} className="min-w-0">
                    <div className="text-xs font-semibold text-gray-900 truncate">{a.subjectName || '(No Subject)'}</div>
                    <div className="text-[11px] text-gray-600 truncate">{a.teacherName || '(No Teacher)'}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          {hasAnyConflict && (
            <span className="shrink-0 text-[10px] font-medium text-red-700 bg-red-200 rounded-full px-2 py-0.5">Conflict</span>
          )}
        </button>
      </li>
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
      {/* Mobile: one day at a time */}
      <div className="md:hidden w-full">
        <div className="flex gap-1.5 overflow-x-auto pb-2 -mx-1 px-1">
          {DAYS_ORDER.map(day => (
            <button
              key={day}
              onClick={() => setActiveDay(day)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                activeDay === day ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {day.charAt(0) + day.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
        <ul className="divide-y divide-gray-100 border rounded-lg overflow-hidden">
          {allPeriods.map((timeSlot, index) => renderMobileRow(timeSlot, index))}
        </ul>
      </div>

      {/* Desktop: full weekly grid */}
      <div className="hidden md:block bg-white rounded-lg shadow w-full">
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

      {/* Manage Slot Modal */}
      {manageModalOpen && (
        <Modal isOpen={manageModalOpen} onClose={() => setManageModalOpen(false)} size="lg">
          <ModalHeader>Manage Slot ({editingDay} - {editingPeriod})</ModalHeader>
          <ModalBody>
           <div className="space-y-4">
            {/* Current Assignments */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Current Assignments</h4>
              {currentSlotAssignments.length === 0 ? (
                <p className="text-sm text-gray-400 italic">No assignments yet.</p>
              ) : (
                <div className="space-y-2">
                  {currentSlotAssignments.map((assignment, index) => (
                    <div key={index} className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-gray-800">{assignment.subjectName || 'Unknown Subject'}</span>
                        <span className="text-sm text-gray-500 ml-2">- {assignment.teacherName || 'Unknown Teacher'}</span>
                      </div>
                      <button
                        onClick={() => handleRemoveAssignment(index)}
                        className="ml-2 p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded flex-shrink-0"
                        title="Remove assignment"
                      >
                        <XMarkIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Divider */}
            <hr className="border-gray-200" />

            {/* Add New Assignment */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
                <PlusIcon className="w-4 h-4" />
                Add New Assignment
              </h4>
              <div className="space-y-3">
                <div>
                  <label htmlFor="newSubjectSelect" className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                  <Select
                    id="newSubjectSelect"
                    value={newSubject}
                    onChange={handleNewSubjectChange}
                    options={[{ value: '', label: '-- Select Subject --' }, ...subjects.map(s => ({ value: s.id, label: s.name }))]}
                  />
                </div>
                <div>
                  <label htmlFor="newTeacherSelect" className="block text-sm font-medium text-gray-700 mb-1">Teacher</label>
                  <Select
                    id="newTeacherSelect"
                    value={newTeacher}
                    onChange={(e) => setNewTeacher(e.target.value)}
                    options={[{ value: '', label: '-- Select Teacher --' }, ...newTeacherOptions.map(t => ({ value: t.id, label: t.name }))]}
                    disabled={!newSubject}
                  />
                </div>
                <Button
                  color="primary"
                  onClick={handleAddAssignment}
                  disabled={!newSubject || !newTeacher}
                  className="w-full"
                >
                  <PlusIcon className="w-4 h-4 mr-1 inline" />
                  Add Assignment
                </Button>
              </div>
            </div>

            {currentSlotAssignments.length > 0 && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> Changes are saved locally. Click &quot;Save Changes&quot; button above to persist to the server.
                </p>
              </div>
            )}
           </div>
          </ModalBody>
          <ModalFooter>
            <Button color="secondary" onClick={() => setManageModalOpen(false)}>Close</Button>
          </ModalFooter>
        </Modal>
      )}
    </div>
  );
};
