"use client";

import React, { useState, useMemo } from 'react';
import { Button } from "@/components/ui";
import { Modal, ModalHeader, ModalBody, ModalFooter } from "@/components/ui";
import { Select } from "@/components/ui";
import { toast } from "react-hot-toast";
import { useTimetable, SlotAssignment } from './TimetableContext';
import { PlusIcon, XMarkIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';

// Days of the week for the timetable (ordered)
const DAYS_ORDER = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];

interface SchoolTimetableViewProps {
  onClassSelect?: (subClassId: string) => void;
  onExportSchool?: () => void;
  isExporting?: boolean;
}

const SchoolTimetableView: React.FC<SchoolTimetableViewProps> = ({ onClassSelect, onExportSchool, isExporting }) => {
  const {
    allWeeklySlots,
    subClasses,
    subjects,
    teachers,
    timetables,
    originalTimetables,
    isLoadingTimetable,
    addSlotAssignment,
    updateSlotAssignment,
    removeSlotAssignment,
    saveChanges,
    getTeachersBySubject,
    isTeacherAssignedElsewhere
  } = useTimetable();

  const [showConflictsOnly, setShowConflictsOnly] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Helper: check if assignments arrays are equal
  const assignmentsEqual = (a: SlotAssignment[], b: SlotAssignment[]): boolean => {
    if (a.length !== b.length) return false;
    return a.every((aItem, i) =>
      aItem.subjectId === b[i].subjectId && aItem.teacherId === b[i].teacherId
    );
  };

  // Function to detect changed subclasses
  const getModifiedSubclasses = useMemo(() => {
    const modifiedIds: string[] = [];

    Object.keys(timetables).forEach(subClassId => {
      const current = timetables[subClassId];
      const original = originalTimetables[subClassId];

      if (!original || !current) return;

      const hasChanges = current.slots.some(currentSlot => {
        const originalSlot = original.slots.find(origSlot =>
          origSlot.day === currentSlot.day && origSlot.period === currentSlot.period
        );
        return !originalSlot || !assignmentsEqual(currentSlot.assignments, originalSlot.assignments);
      });

      if (hasChanges) {
        modifiedIds.push(subClassId);
      }
    });

    return modifiedIds;
  }, [timetables, originalTimetables]);

  // Function to save all changes
  const handleSaveAllChanges = async () => {
    if (getModifiedSubclasses.length === 0) {
      toast("No changes detected to save.");
      return;
    }

    setIsSaving(true);

    try {
      for (const subClassId of getModifiedSubclasses) {
        await saveChanges(subClassId);
      }
      toast.success(`Successfully saved changes for ${getModifiedSubclasses.length} classes!`);
    } catch (error) {
      console.error("Error saving changes:", error);
      toast.error("Failed to save some changes. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // Modal state for assignment
  const [manageModalOpen, setManageModalOpen] = useState(false);
  const [editingSubClassId, setEditingSubClassId] = useState('');
  const [editingDay, setEditingDay] = useState('');
  const [editingPeriod, setEditingPeriod] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [newTeacher, setNewTeacher] = useState('');
  const [newTeacherOptions, setNewTeacherOptions] = useState<{ id: string; name: string }[]>([]);

  // Organize periods by day and sort by time, deduplicating by name
  const organizedPeriods = useMemo(() => {
    const dayGroups: { [day: string]: any[] } = {};

    // If periods don't have dayOfWeek, build a single set of unique periods
    // and use it for every day
    const hasDayOfWeek = allWeeklySlots.some(slot => slot.dayOfWeek);

    if (hasDayOfWeek) {
      DAYS_ORDER.forEach(day => {
        const daySlots = allWeeklySlots.filter(slot => slot.dayOfWeek === day);

        // Deduplicate by period name
        const seen = new Set<string>();
        const uniqueSlots = daySlots.filter(slot => {
          if (seen.has(slot.name)) return false;
          seen.add(slot.name);
          return true;
        });

        dayGroups[day] = uniqueSlots.sort((a, b) => {
          if (!a.startTime && !b.startTime) return 0;
          if (!a.startTime) return 1;
          if (!b.startTime) return -1;
          return a.startTime.localeCompare(b.startTime);
        });
      });
    } else {
      // Periods are day-agnostic — deduplicate globally by name and reuse for each day
      const seen = new Set<string>();
      const uniqueSlots = allWeeklySlots.filter(slot => {
        if (seen.has(slot.name)) return false;
        seen.add(slot.name);
        return true;
      }).sort((a, b) => {
        if (!a.startTime && !b.startTime) return 0;
        if (!a.startTime) return 1;
        if (!b.startTime) return -1;
        return a.startTime.localeCompare(b.startTime);
      });

      DAYS_ORDER.forEach(day => {
        dayGroups[day] = uniqueSlots;
      });
    }

    // Debug: log period counts per day
    console.log("SchoolTimetableView organizedPeriods:", Object.entries(dayGroups).map(([day, periods]) => `${day}: ${periods.length} periods`));

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
        if (slotDef?.isBreak) return;

        // Check all assignments in this slot for conflicts
        slot.assignments.forEach(assignment => {
          if (!assignment.teacherId) return;
          const day = slot.day;
          const period = slot.period;
          if (!conflicts[day]?.[period]) return;

          if (!conflicts[day][period][assignment.teacherId]) {
            conflicts[day][period][assignment.teacherId] = [subClassId];
          } else {
            if (!conflicts[day][period][assignment.teacherId].includes(subClassId)) {
              conflicts[day][period][assignment.teacherId].push(subClassId);
            }
          }
        });
      });
    });

    return conflicts;
  }, [timetables, allWeeklySlots]);

  const getSlotAssignments = (subClassId: string, day: string, periodName: string): SlotAssignment[] => {
    const timetable = timetables[subClassId];
    if (!timetable || !timetable.slots) return [];
    const slot = timetable.slots.find(s => s.day === day && s.period === periodName);
    return slot?.assignments || [];
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
        for (const assignment of slot.assignments) {
          if (assignment.teacherId && hasConflict(slot.day, slot.period, assignment.teacherId)) {
            return true;
          }
        }
      }
      return false;
    });
  }, [subClasses, showConflictsOnly, teacherConflicts, timetables]);

  // Get live assignments for the currently editing slot
  const currentSlotAssignments = useMemo(() => {
    if (!manageModalOpen || !editingSubClassId || !editingDay || !editingPeriod) return [];
    return getSlotAssignments(editingSubClassId, editingDay, editingPeriod);
  }, [manageModalOpen, editingSubClassId, editingDay, editingPeriod, timetables]);

  // Function to open the manage modal for a slot
  const handleManageSlot = (subClassId: string, day: string, periodName: string) => {
    const slotDefinition = allWeeklySlots.find(ws => ws.dayOfWeek === day && ws.name === periodName);
    if (!slotDefinition || slotDefinition.isBreak) return;

    setEditingSubClassId(subClassId);
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

    const conflictClass = isTeacherAssignedElsewhere(
      newTeacher,
      editingDay,
      editingPeriod,
      editingSubClassId
    );
    if (conflictClass) {
      toast.error(`Teacher is already assigned to ${conflictClass} during this time`);
      return;
    }

    addSlotAssignment(editingSubClassId, editingDay, editingPeriod, newSubject, newTeacher);
    setNewSubject('');
    setNewTeacher('');
    setNewTeacherOptions([]);
    toast.success("Assignment added. Remember to save changes.");
  };

  // Remove an assignment from the current slot
  const handleRemoveAssignment = (index: number) => {
    removeSlotAssignment(editingSubClassId, editingDay, editingPeriod, index);
    toast.success("Assignment removed. Remember to save changes.");
  };

  const renderCell = (day: string, periodName: string, subClassId: string, period: any) => {
    const assignments = getSlotAssignments(subClassId, day, periodName);

    if (period.isBreak) {
      return (
        <td key={`${subClassId}-${periodName}`} className="px-2 py-2 text-center text-xs text-gray-600 border-r bg-gray-100 h-20">
          <div className="truncate">Break</div>
        </td>
      );
    }

    if (assignments.length === 0) {
      return (
        <td
          key={`${subClassId}-${periodName}`}
          className="px-2 py-2 border-r bg-white cursor-pointer hover:bg-blue-50 h-20"
          onClick={() => handleManageSlot(subClassId, day, periodName)}
        >
          <div className="text-center text-gray-400 text-xs"></div>
        </td>
      );
    }

    // Check for conflicts across all assignments
    const hasAnyConflict = assignments.some(a => hasConflict(day, periodName, a.teacherId));
    const bgColor = hasAnyConflict ? 'bg-red-200 hover:bg-red-300' : 'bg-blue-100 hover:bg-blue-200';

    // Build title showing all assignments
    const titleParts = assignments.map(a => {
      const subjectName = a.subjectName || subjects.find(s => s.id === a.subjectId)?.name || 'Unknown';
      const teacherName = a.teacherName || teachers.find(t => t.id === a.teacherId)?.name || 'Unknown';
      const conflict = hasConflict(day, periodName, a.teacherId);
      return `${subjectName} - ${teacherName}${conflict ? ' (CONFLICT!)' : ''}`;
    });
    const title = titleParts.join('\n');

    return (
      <td
        key={`${subClassId}-${periodName}`}
        className={`px-1 py-2 ${bgColor} cursor-pointer text-center text-xs border-r h-20`}
        title={title}
        onClick={() => handleManageSlot(subClassId, day, periodName)}
      >
        {assignments.length === 1 ? (
          <div className="space-y-1 flex flex-col justify-center h-full">
            <div className="truncate text-xs font-semibold leading-tight px-1">
              {assignments[0].subjectName || subjects.find(s => s.id === assignments[0].subjectId)?.name || 'Unknown'}
            </div>
            <div className="truncate text-xs text-gray-500 leading-tight px-1">
              {assignments[0].teacherName || teachers.find(t => t.id === assignments[0].teacherId)?.name || 'Unknown'}
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col justify-center gap-0.5">
            {assignments.map((a, i) => {
              const subjectName = a.subjectName || subjects.find(s => s.id === a.subjectId)?.name || '?';
              const teacherName = a.teacherName || teachers.find(t => t.id === a.teacherId)?.name || '?';
              return (
                <div key={i} className={`${i > 0 ? 'border-t border-blue-200 pt-0.5' : ''}`}>
                  <div className="truncate text-[10px] font-semibold leading-tight px-0.5">{subjectName}</div>
                  <div className="truncate text-[10px] text-gray-500 leading-tight px-0.5">{teacherName}</div>
                </div>
              );
            })}
          </div>
        )}
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
        <div className="flex items-center space-x-4">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={showConflictsOnly}
              onChange={(e) => setShowConflictsOnly(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm font-medium text-gray-700">Show classes with conflicts only</span>
          </label>

          {onExportSchool && (
            <Button
              onClick={onExportSchool}
              disabled={isExporting}
              color="secondary"
              title="Export full school timetable as Excel"
            >
              <ArrowDownTrayIcon className="h-4 w-4 mr-1 inline" />
              {isExporting ? 'Exporting...' : 'Export All'}
            </Button>
          )}

          {getModifiedSubclasses.length > 0 && (
            <Button
              onClick={handleSaveAllChanges}
              disabled={isSaving || isLoadingTimetable}
              color="primary"
              className="flex items-center space-x-2"
            >
              {isSaving ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </>
              ) : (
                <>
                  <span>Save Changes</span>
                  <span className="bg-white bg-opacity-20 text-xs px-2 py-1 rounded-full">
                    {getModifiedSubclasses.length}
                  </span>
                </>
              )}
            </Button>
          )}
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
                      {filteredSubClasses.map((subClass) => {
                        const hasChanges = getModifiedSubclasses.includes(subClass.id);
                        return (
                          <th
                            key={subClass.id}
                            className={`px-2 py-2 text-left text-xs font-medium uppercase tracking-wider border-r cursor-pointer hover:bg-gray-100 ${
                              hasChanges
                                ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                                : 'text-gray-500'
                            }`}
                            title={`${hasChanges ? '[MODIFIED] ' : ''}View timetable for ${subClass.name}`}
                            onClick={() => onClassSelect?.(subClass.id)}
                            style={{
                              minWidth: '100px',
                              width: '150px',
                              maxWidth: '150px'
                            }}
                          >
                            <div className="truncate flex items-center space-x-1">
                              <span>{subClass.name}</span>
                              {hasChanges && (
                                <span className="w-2 h-2 bg-yellow-400 rounded-full flex-shrink-0" title="Has unsaved changes"></span>
                              )}
                            </div>
                          </th>
                        );
                      })}
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

      {/* Manage Slot Modal */}
      {manageModalOpen && (
        <Modal isOpen={manageModalOpen} onClose={() => setManageModalOpen(false)} size="lg">
          <ModalHeader>
            Manage Assignment - {subClasses.find(sc => sc.id === editingSubClassId)?.name} ({editingDay} - {editingPeriod})
          </ModalHeader>
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
                  <strong>Note:</strong> Changes are saved locally. Use the &quot;Save Changes&quot; button at the top to persist all changes to the server.
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

export default SchoolTimetableView;
