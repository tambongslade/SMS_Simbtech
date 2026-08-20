"use client";

import React, { useState, useMemo } from 'react';
import { Button } from "@/components/ui";
import { Modal, ModalHeader, ModalBody, ModalFooter } from "@/components/ui";
import { Select } from "@/components/ui";
import { toast } from "react-hot-toast";
import {
  useTimetable,
  buildPeriodRows,
  formatTimeRange,
  isAssignablePeriod,
  periodsOverlap,
  DAYS_ORDER,
  PeriodDefinition,
  PeriodRow,
  PeriodSetInfo,
  SlotAssignment,
} from './TimetableContext';
import { PlusIcon, XMarkIcon, ArrowDownTrayIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline';

interface SchoolTimetableViewProps {
  onClassSelect?: (subClassId: string) => void;
  onExportSchool?: () => void;
  isExporting?: boolean;
  onExportSchoolPdf?: () => void;
  isExportingPdf?: boolean;
}

// One booking of a teacher's time, used for cross-cycle clash detection.
interface Booking {
  subClassId: string;
  startTime: string;
  endTime: string;
}

const SchoolTimetableView: React.FC<SchoolTimetableViewProps> = ({ onClassSelect, onExportSchool, isExporting, onExportSchoolPdf, isExportingPdf }) => {
  const {
    subClasses,
    subjects,
    teachers,
    timetables,
    originalTimetables,
    isLoadingTimetable,
    addSlotAssignment,
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

      const originalByPeriodId = new Map(original.slots.map(slot => [slot.periodId, slot]));
      const hasChanges = current.slots.some(currentSlot => {
        const originalSlot = originalByPeriodId.get(currentSlot.periodId);
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
  const [editingPeriodId, setEditingPeriodId] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [newTeacher, setNewTeacher] = useState('');
  const [newTeacherOptions, setNewTeacherOptions] = useState<{ id: string; name: string }[]>([]);

  // Every booked teacher-hour in the school, keyed by day then teacher. Clashes
  // are found by comparing wall-clock times, because the two cycles put
  // different period ids (and different sequence numbers) at the same hour.
  const teacherBookings = useMemo(() => {
    const byDay: Record<string, Map<string, Booking[]>> = {};

    Object.entries(timetables).forEach(([subClassId, timetable]) => {
      timetable.slots.forEach(slot => {
        if (!isAssignablePeriod(slot.type)) return;
        slot.assignments.forEach(assignment => {
          if (!assignment.teacherId) return;
          const forDay = byDay[slot.day] ?? (byDay[slot.day] = new Map());
          const forTeacher = forDay.get(assignment.teacherId) ?? [];
          forTeacher.push({ subClassId, startTime: slot.startTime, endTime: slot.endTime });
          forDay.set(assignment.teacherId, forTeacher);
        });
      });
    });

    return byDay;
  }, [timetables]);

  const hasConflict = (
    day: string,
    startTime: string,
    endTime: string,
    teacherId: string | null,
    subClassId: string,
  ): boolean => {
    if (!teacherId) return false;
    const bookings = teacherBookings[day]?.get(teacherId) || [];
    return bookings.some(booking =>
      booking.subClassId !== subClassId &&
      periodsOverlap(startTime, endTime, booking.startTime, booking.endTime)
    );
  };

  const getSlot = (subClassId: string, periodId: string) =>
    timetables[subClassId]?.slots.find(s => s.periodId === periodId);

  const subClassHasConflict = (subClassId: string): boolean => {
    const timetable = timetables[subClassId];
    if (!timetable) return false;
    return timetable.slots.some(slot =>
      isAssignablePeriod(slot.type) &&
      slot.assignments.some(a => hasConflict(slot.day, slot.startTime, slot.endTime, a.teacherId, subClassId))
    );
  };

  const filteredSubClasses = useMemo(() => {
    if (!showConflictsOnly) return subClasses;
    return subClasses.filter(subClass => subClassHasConflict(subClass.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subClasses, showConflictsOnly, teacherBookings, timetables]);

  /**
   * Classes are grouped by the bell schedule they follow: one matrix per
   * cycle. A single school-wide column set would be wrong — first-cycle
   * period 3 (09:35) and second-cycle period 3 (09:20) are not the same row.
   */
  const groups = useMemo(() => {
    const bySet = new Map<string, {
      periodSet: PeriodSetInfo;
      rows: PeriodRow[];
      subClassIds: string[];
    }>();
    const unscheduled: string[] = [];

    filteredSubClasses.forEach(subClass => {
      const timetable = timetables[subClass.id];
      const periodSet = timetable?.periodSet;
      if (!timetable || !periodSet || timetable.periods.length === 0) {
        unscheduled.push(subClass.id);
        return;
      }

      const existing = bySet.get(periodSet.id);
      if (existing) {
        existing.subClassIds.push(subClass.id);
      } else {
        bySet.set(periodSet.id, {
          periodSet,
          rows: buildPeriodRows(timetable.periods),
          subClassIds: [subClass.id],
        });
      }
    });

    return { grouped: Array.from(bySet.values()), unscheduled };
  }, [filteredSubClasses, timetables]);

  // Per-class summary used by the mobile list (the full matrix is unreadable
  // on a phone, so mobile gets a class list that drills into the class view).
  const subClassSummaries = useMemo(() => {
    return filteredSubClasses.map(subClass => {
      const timetable = timetables[subClass.id];
      const slots = timetable?.slots || [];
      let assigned = 0;
      let conflicts = 0;

      slots.forEach(slot => {
        if (!isAssignablePeriod(slot.type)) return;
        if (slot.assignments.length > 0) assigned++;
        if (slot.assignments.some(a => hasConflict(slot.day, slot.startTime, slot.endTime, a.teacherId, subClass.id))) {
          conflicts++;
        }
      });

      return {
        id: subClass.id,
        name: subClass.name,
        periodSetName: timetable?.periodSet?.name ?? null,
        assigned,
        conflicts,
        modified: getModifiedSubclasses.includes(subClass.id),
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredSubClasses, timetables, teacherBookings, getModifiedSubclasses]);

  const editingPeriod = useMemo(
    () => timetables[editingSubClassId]?.periods.find(p => p.id === editingPeriodId) || null,
    [timetables, editingSubClassId, editingPeriodId],
  );

  // Get live assignments for the currently editing slot
  const currentSlotAssignments = useMemo(() => {
    if (!manageModalOpen || !editingSubClassId || !editingPeriodId) return [];
    return getSlot(editingSubClassId, editingPeriodId)?.assignments || [];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manageModalOpen, editingSubClassId, editingPeriodId, timetables]);

  // Function to open the manage modal for a slot
  const handleManageSlot = (subClassId: string, period?: PeriodDefinition) => {
    if (!period || !isAssignablePeriod(period.type)) return;

    setEditingSubClassId(subClassId);
    setEditingPeriodId(period.id);
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

  // Add a new assignment to the current slot. Teacher is optional; clashes
  // are allowed and surfaced as warnings after the save.
  const handleAddAssignment = () => {
    if (!newSubject || !editingPeriod) return;

    if (newTeacher) {
      const conflictClass = isTeacherAssignedElsewhere(
        newTeacher,
        editingPeriod.dayOfWeek,
        editingPeriod.startTime,
        editingPeriod.endTime,
        editingSubClassId
      );
      if (conflictClass) {
        toast(`Teacher is also booked in ${conflictClass} during this time — saved with a warning`, { icon: '⚠️' });
      }
    }

    addSlotAssignment(editingSubClassId, editingPeriod.id, newSubject, newTeacher || null);
    setNewSubject('');
    setNewTeacher('');
    setNewTeacherOptions([]);
    toast.success(newTeacher ? "Assignment added" : "Subject added without teacher");
  };

  // Remove an assignment from the current slot
  const handleRemoveAssignment = (index: number) => {
    if (!editingPeriod) return;
    removeSlotAssignment(editingSubClassId, editingPeriod.id, index);
    toast.success("Assignment removed");
  };

  const renderCell = (subClassId: string, period?: PeriodDefinition) => {
    if (!period) {
      return (
        <td key={`${subClassId}-none`} className="px-2 py-2 text-center text-xs text-gray-300 border-r h-20">
          —
        </td>
      );
    }

    if (!isAssignablePeriod(period.type)) {
      return (
        <td key={`${subClassId}-${period.id}`} className="px-2 py-2 text-center text-xs text-gray-600 border-r bg-gray-100 h-20">
          <div className="truncate">{period.type === 'PREP' ? 'Preps' : 'Break'}</div>
        </td>
      );
    }

    const assignments = getSlot(subClassId, period.id)?.assignments || [];

    if (assignments.length === 0) {
      return (
        <td
          key={`${subClassId}-${period.id}`}
          className="px-2 py-2 border-r bg-white cursor-pointer hover:bg-blue-50 h-20"
          onClick={() => handleManageSlot(subClassId, period)}
        >
          <div className="text-center text-gray-400 text-xs"></div>
        </td>
      );
    }

    const conflictOf = (a: SlotAssignment) =>
      hasConflict(period.dayOfWeek, period.startTime, period.endTime, a.teacherId, subClassId);

    const hasAnyConflict = assignments.some(conflictOf);
    const bgColor = hasAnyConflict ? 'bg-red-200 hover:bg-red-300' : 'bg-blue-100 hover:bg-blue-200';

    // Build title showing all assignments
    const title = assignments.map(a => {
      const subjectName = a.subjectName || subjects.find(s => s.id === a.subjectId)?.name || 'Unknown';
      const teacherName = a.teacherName || teachers.find(t => t.id === a.teacherId)?.name || 'Unknown';
      return `${subjectName} - ${teacherName}${conflictOf(a) ? ' (CONFLICT!)' : ''}`;
    }).join('\n');

    return (
      <td
        key={`${subClassId}-${period.id}`}
        className={`px-1 py-2 ${bgColor} cursor-pointer text-center text-xs border-r h-20`}
        title={title}
        onClick={() => handleManageSlot(subClassId, period)}
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

  // One full matrix for a single bell schedule.
  const renderGroup = (group: { periodSet: PeriodSetInfo; rows: PeriodRow[]; subClassIds: string[] }) => {
    const columns = group.subClassIds
      .map(id => subClasses.find(sc => sc.id === id))
      .filter((sc): sc is NonNullable<typeof sc> => Boolean(sc));

    return (
      <div key={group.periodSet.id} className="space-y-2">
        <div className="flex items-baseline gap-2">
          <h3 className="text-sm font-semibold text-gray-900">{group.periodSet.name}</h3>
          <span className="text-xs text-gray-500">
            {columns.length} class{columns.length === 1 ? '' : 'es'}
          </span>
        </div>

        <div className="w-full border rounded-lg">
          <div className="overflow-x-auto">
            <div className="inline-block min-w-full">
              <table className="min-w-full divide-y divide-gray-200 text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r w-24">
                      Period
                    </th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r w-20">
                      Time
                    </th>
                    {columns.map((subClass) => {
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
                          style={{ minWidth: '100px', width: '150px', maxWidth: '150px' }}
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
                  {DAYS_ORDER.map(day => (
                    <React.Fragment key={day}>
                      {/* Day Header */}
                      <tr className="bg-blue-50">
                        <td
                          colSpan={2 + columns.length}
                          className="px-4 py-3 text-center text-sm font-bold text-blue-900 border-b"
                        >
                          {day.charAt(0) + day.slice(1).toLowerCase()}
                        </td>
                      </tr>

                      {/* Periods for this day, in this bell schedule */}
                      {group.rows.map(row => {
                        const period = row.byDay[day];
                        return (
                          <tr key={`${day}-${row.sequence}`} className="hover:bg-gray-50">
                            <td className="px-2 py-2 text-center text-xs font-medium border-r w-24">
                              {(period ?? row.label).name}
                            </td>
                            <td className="px-2 py-2 text-center text-xs text-gray-600 border-r w-20">
                              <div className="truncate">
                                {formatTimeRange((period ?? row.label).startTime, (period ?? row.label).endTime)}
                              </div>
                            </td>
                            {columns.map(subClass => renderCell(subClass.id, period))}
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (isLoadingTimetable && Object.keys(timetables).length === 0) {
    return <div className="p-4 text-center text-gray-500">Loading school-wide timetable data...</div>;
  }

  return (
    <div className="space-y-4 sm:space-y-6 w-full">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:flex-wrap md:gap-4">
        <h2 className="text-xl sm:text-2xl font-bold">School-Wide Timetable View</h2>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
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
              {isExporting ? 'Exporting...' : 'Export All (Excel)'}
            </Button>
          )}

          {onExportSchoolPdf && (
            <Button
              onClick={onExportSchoolPdf}
              disabled={isExportingPdf}
              color="secondary"
              title="Download every subclass timetable as one PDF (a page per class)"
            >
              <DocumentArrowDownIcon className="h-4 w-4 mr-1 inline" />
              {isExportingPdf ? 'Preparing...' : 'Export All (PDF)'}
            </Button>
          )}

          {getModifiedSubclasses.length > 0 && (
            <Button
              onClick={handleSaveAllChanges}
              disabled={isSaving || isLoadingTimetable}
              color="primary"
              className="flex items-center justify-center space-x-2"
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

      {/* Mobile: class list — tap a class to open its full timetable */}
      <div className="md:hidden bg-white rounded-lg shadow w-full overflow-hidden">
        {subClassSummaries.length === 0 ? (
          <p className="p-4 text-center text-sm text-gray-500">
            {showConflictsOnly ? 'No classes with conflicts.' : 'No classes available.'}
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {subClassSummaries.map(summary => (
              <li key={summary.id}>
                <button
                  onClick={() => onClassSelect?.(summary.id)}
                  className="w-full flex items-center gap-3 px-3 py-3 text-left active:bg-gray-50"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold text-gray-900 truncate">{summary.name}</span>
                      {summary.modified && (
                        <span className="shrink-0 w-2 h-2 bg-yellow-400 rounded-full" title="Has unsaved changes"></span>
                      )}
                    </div>
                    <div className="text-[11px] text-gray-500 mt-0.5">
                      {summary.periodSetName
                        ? `${summary.periodSetName} · ${summary.assigned} period${summary.assigned === 1 ? '' : 's'} assigned`
                        : 'No bell schedule assigned'}
                    </div>
                  </div>
                  {summary.conflicts > 0 && (
                    <span className="shrink-0 text-[10px] font-medium text-red-700 bg-red-100 rounded-full px-2 py-0.5">
                      {summary.conflicts} conflict{summary.conflicts === 1 ? '' : 's'}
                    </span>
                  )}
                  <span className="shrink-0 text-gray-300">&rsaquo;</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Desktop: one class-by-period matrix per bell schedule */}
      <div className="hidden md:block bg-white rounded-lg shadow w-full">
        <div className="p-4 space-y-6">
          <div className="flex justify-end space-x-4">
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
              <span className="text-xs">Break / Preps</span>
            </div>
          </div>

          {groups.grouped.length === 0 && groups.unscheduled.length === 0 && (
            <p className="text-center text-sm text-gray-500 py-6">
              {showConflictsOnly ? 'No classes with conflicts.' : 'No classes available.'}
            </p>
          )}

          {groups.grouped.map(renderGroup)}

          {groups.unscheduled.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="text-sm font-medium text-amber-900">
                No bell schedule assigned
              </p>
              <p className="text-xs text-amber-800 mt-1">
                These classes have no period times, so they cannot be scheduled yet. Open one to
                assign the cycle it follows:{' '}
                {groups.unscheduled.map((id, i) => {
                  const subClass = subClasses.find(sc => sc.id === id);
                  return (
                    <React.Fragment key={id}>
                      {i > 0 && ', '}
                      <button
                        onClick={() => onClassSelect?.(id)}
                        className="font-medium underline hover:text-amber-950"
                      >
                        {subClass?.name || id}
                      </button>
                    </React.Fragment>
                  );
                })}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Manage Slot Modal */}
      {manageModalOpen && editingPeriod && (
        <Modal isOpen={manageModalOpen} onClose={() => setManageModalOpen(false)} size="lg">
          <ModalHeader>
            Manage Assignment - {subClasses.find(sc => sc.id === editingSubClassId)?.name} (
            {editingPeriod.dayOfWeek} - {editingPeriod.name},{' '}
            {formatTimeRange(editingPeriod.startTime, editingPeriod.endTime)})
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
                  <label htmlFor="newTeacherSelect" className="block text-sm font-medium text-gray-700 mb-1">
                    Teacher <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <Select
                    id="newTeacherSelect"
                    value={newTeacher}
                    onChange={(e) => setNewTeacher(e.target.value)}
                    options={[{ value: '', label: '-- No teacher yet --' }, ...newTeacherOptions.map(t => ({ value: t.id, label: t.name }))]}
                    disabled={!newSubject}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Leave blank to reserve the slot for a subject you'll assign a teacher to later.
                  </p>
                </div>
                <Button
                  color="primary"
                  onClick={handleAddAssignment}
                  disabled={!newSubject}
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
                  <strong>Note:</strong> Assignments save automatically as soon as you choose them.
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
