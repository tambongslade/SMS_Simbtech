"use client";

import React, { useState, useMemo } from 'react';
import { Button } from "@/components/ui";
import { Modal, ModalHeader, ModalBody, ModalFooter } from "@/components/ui";
import { Select } from "@/components/ui";
import { toast } from "react-hot-toast";
import { useTimetable } from './TimetableContext';

// Days of the week for the timetable (ordered)
const DAYS_ORDER = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];

interface SchoolTimetableViewProps {
  onClassSelect?: (subClassId: string) => void;
}

const SchoolTimetableView: React.FC<SchoolTimetableViewProps> = ({ onClassSelect }) => {
  const {
    allWeeklySlots,
    subClasses,
    subjects,
    teachers,
    timetables,
    isLoadingTimetable,
    updateTimetableSlot,
    getTeachersBySubject,
    isTeacherAssignedElsewhere
  } = useTimetable();

  const [showConflictsOnly, setShowConflictsOnly] = useState<boolean>(false);

  // Modal state for assignment
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingSubClassId, setEditingSubClassId] = useState('');
  const [editingDay, setEditingDay] = useState('');
  const [editingPeriod, setEditingPeriod] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [availableTeachers, setAvailableTeachers] = useState<{ id: string; name: string }[]>([]);

  // Organize periods by day and sort by time
  const organizedPeriods = useMemo(() => {
    const dayGroups: { [day: string]: any[] } = {};

    DAYS_ORDER.forEach(day => {
      dayGroups[day] = allWeeklySlots
        .filter(slot => slot.dayOfWeek === day)
        .sort((a, b) => {
          // Sort by start time
          if (!a.startTime && !b.startTime) return 0;
          if (!a.startTime) return 1;
          if (!b.startTime) return -1;
          return a.startTime.localeCompare(b.startTime);
        });
    });

    return dayGroups;
  }, [allWeeklySlots]);

  // Calculate teacher conflicts
  const teacherConflicts = useMemo(() => {
    const conflicts: { [day: string]: { [period: string]: { [teacherId: string]: string[] } } } = {};

    DAYS_ORDER.forEach(day => {
      conflicts[day] = {};
      allWeeklySlots.forEach(slot => {
        if (slot.dayOfWeek === day) {
          conflicts[day][slot.name] = {};
        }
      });
    });

    Object.entries(timetables).forEach(([subClassId, timetable]) => {
      if (!timetable || !timetable.slots) return;
      timetable.slots.forEach(slot => {
        const slotDef = allWeeklySlots.find(ws => ws.dayOfWeek === slot.day && ws.name === slot.period);
        if (slot.teacherId && !slotDef?.isBreak) {
          const day = slot.day;
          const period = slot.period;
          if (!conflicts[day]?.[period]) {
            return;
          }
          if (!conflicts[day][period][slot.teacherId]) {
            conflicts[day][period][slot.teacherId] = [subClassId];
          } else {
            if (!conflicts[day][period][slot.teacherId].includes(subClassId)) {
              conflicts[day][period][slot.teacherId].push(subClassId);
            }
          }
        }
      });
    });

    return conflicts;
  }, [timetables, allWeeklySlots]);

  const getSlotAssignmentInfo = (subClassId: string, day: string, periodName: string) => {
    const timetable = timetables[subClassId];
    if (!timetable || !timetable.slots) return { subjectId: null, teacherId: null, subjectName: null, teacherName: null };

    const slot = timetable.slots.find(s => s.day === day && s.period === periodName);
    return slot || { subjectId: null, teacherId: null, subjectName: null, teacherName: null };
  };

  const hasConflict = (day: string, period: string, teacherId: string | null) => {
    if (!teacherId) return false;
    return teacherConflicts[day]?.[period]?.[teacherId]?.length > 1;
  };

  const filteredSubClasses = useMemo(() => {
    if (!showConflictsOnly) return subClasses;

    return subClasses.filter(subClass => {
      const timetable = timetables[subClass.id];
      if (!timetable || !timetable.slots) return false;

      for (const slot of timetable.slots) {
        if (slot.teacherId && hasConflict(slot.day, slot.period, slot.teacherId)) {
          return true;
        }
      }
      return false;
    });
  }, [subClasses, showConflictsOnly, teacherConflicts, timetables]);

  // Function to open the edit modal for a slot
  const handleEditSlot = (subClassId: string, day: string, periodName: string) => {
    const assignment = getSlotAssignmentInfo(subClassId, day, periodName);
    const slotDefinition = allWeeklySlots.find(ws => ws.dayOfWeek === day && ws.name === periodName);

    // Cannot edit if definition not found or if it's a break
    if (!slotDefinition || slotDefinition.isBreak) return;

    setEditingSubClassId(subClassId);
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
        editingSubClassId
      );

      if (conflictClass) {
        toast.error(`Teacher is already assigned to ${conflictClass} during this time`);
        return;
      }
    }

    updateTimetableSlot(
      editingSubClassId,
      editingDay,
      editingPeriod,
      selectedSubject || null,
      selectedTeacher || null
    );

    setEditModalOpen(false);
    toast.success("Timetable slot updated locally. Remember to save changes.");
  };

  const renderCell = (day: string, periodName: string, subClassId: string, period: any) => {
    const assignment = getSlotAssignmentInfo(subClassId, day, periodName);

    if (period.isBreak) {
      return (
        <td key={`${subClassId}-${periodName}`} className="px-2 py-2 text-center text-xs text-gray-600 border-r bg-gray-100 h-20">
          <div className="truncate">Break</div>
        </td>
      );
    }

    if (!assignment.subjectId || !assignment.teacherId) {
      return (
        <td
          key={`${subClassId}-${periodName}`}
          className="px-2 py-2 border-r bg-white cursor-pointer hover:bg-blue-50 h-20"
          onClick={() => handleEditSlot(subClassId, day, periodName)}
        >
          <div className="text-center text-gray-400 text-xs"></div>
        </td>
      );
    }

    const conflict = hasConflict(day, periodName, assignment.teacherId);
    const bgColor = conflict ? 'bg-red-200 hover:bg-red-300' : 'bg-blue-100 hover:bg-blue-200';
    const subjectName = assignment.subjectName || subjects.find(s => s.id === assignment.subjectId)?.name || 'Unknown';
    const teacherName = assignment.teacherName || teachers.find(t => t.id === assignment.teacherId)?.name || 'Unknown';
    const title = `${subjectName} - ${teacherName}${conflict ? ' (CONFLICT!)' : ''}`;

    return (
      <td
        key={`${subClassId}-${periodName}`}
        className={`px-1 py-2 ${bgColor} cursor-pointer text-center text-xs border-r h-20`}
        title={title}
        onClick={() => {
          if (conflict && assignment.teacherId) {
            const conflictClasses = (teacherConflicts[day]?.[periodName]?.[assignment.teacherId] || [])
              .map(cId => subClasses.find(sc => sc.id === cId)?.name || cId)
              .join(', ');

            toast.error(
              `Conflict: ${teacherName} (${subjectName}) in ${conflictClasses || 'multiple classes'}`,
              { duration: 5000 }
            );
            // Also open edit modal
            handleEditSlot(subClassId, day, periodName);
          } else {
            // Open edit modal for assignment
            handleEditSlot(subClassId, day, periodName);
          }
        }}
      >
        <div className="space-y-1 flex flex-col justify-center h-full">
          <div className="truncate text-xs font-semibold leading-tight px-1">{subjectName}</div>
          <div className="truncate text-xs text-gray-500 leading-tight px-1">{teacherName}</div>
        </div>
      </td>
    );
  };

  if (isLoadingTimetable && Object.keys(timetables).length === 0) {
    return <div className="p-4 text-center text-gray-500">Loading school-wide timetable data...</div>;
  }

  if (allWeeklySlots.length === 0) {
    return <div className="p-4 text-center text-gray-500">Timetable structure not available. Please ensure periods are defined.</div>;
  }

  return (
    <div className="space-y-6 w-full">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="text-2xl font-bold">School-Wide Timetable View</h2>
        <div className="flex space-x-4">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={showConflictsOnly}
              onChange={(e) => setShowConflictsOnly(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm font-medium text-gray-700">Show classes with conflicts only</span>
          </label>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow w-full">
        <div className="p-4">
          <div className="flex justify-end mb-4 space-x-4">
            <div className="flex items-center space-x-1">
              <div className="w-4 h-4 bg-blue-100"></div>
              <span className="text-xs">Assigned</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-4 h-4 bg-red-200"></div>
              <span className="text-xs">Conflict</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-4 h-4 bg-gray-200"></div>
              <span className="text-xs">Break</span>
            </div>
          </div>

          {/* Constrained table container */}
          <div className="w-full border rounded-lg">
            <div className="overflow-x-auto">
              <div className="inline-block min-w-full">
                <table className="min-w-full divide-y divide-gray-200 text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r w-12">
                        Period
                      </th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r w-20">
                        Time
                      </th>
                      {filteredSubClasses.map((subClass) => (
                        <th
                          key={subClass.id}
                          className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r cursor-pointer hover:bg-gray-100"
                          title={`View timetable for ${subClass.name}`}
                          onClick={() => onClassSelect?.(subClass.id)}
                          style={{
                            minWidth: '100px',
                            width: '150px',
                            maxWidth: '150px'
                          }}
                        >
                          <div className="truncate">
                            {subClass.name}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {DAYS_ORDER.map(day => {
                      const dayPeriods = organizedPeriods[day] || [];

                      return (
                        <React.Fragment key={day}>
                          {/* Day Header */}
                          <tr className="bg-blue-50">
                            <td
                              colSpan={2 + filteredSubClasses.length}
                              className="px-4 py-3 text-center text-sm font-bold text-blue-900 border-b"
                            >
                              {day.charAt(0) + day.slice(1).toLowerCase()}
                            </td>
                          </tr>

                          {/* Periods for this day */}
                          {dayPeriods.map((period, index) => {
                            const periodNumber = index + 1;
                            const timeRange = `${period.startTime?.substring(0, 5) || ''} - ${period.endTime?.substring(0, 5) || ''}`;

                            return (
                              <tr key={`${day}-${period.id}`} className="hover:bg-gray-50">
                                <td className="px-2 py-2 text-center text-xs font-medium border-r w-12">
                                  {periodNumber}
                                </td>
                                <td className="px-2 py-2 text-center text-xs text-gray-600 border-r w-20">
                                  <div className="truncate">
                                    {timeRange}
                                  </div>
                                </td>
                                {filteredSubClasses.map(subClass =>
                                  renderCell(day, period.name, subClass.id, period)
                                )}
                              </tr>
                            );
                          })}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Slot Modal */}
      {editModalOpen && (
        <Modal isOpen={editModalOpen} onClose={() => setEditModalOpen(false)} size="lg">
          <ModalHeader>
            Edit Assignment - {subClasses.find(sc => sc.id === editingSubClassId)?.name} ({editingDay} - {editingPeriod})
          </ModalHeader>
          <ModalBody>
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
                  <strong>Note:</strong> Changes will be saved locally. Use the "Save Changes" button in the class view to persist to the server.
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

export default SchoolTimetableView; 