"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { Button } from "@/components/ui";
import { toast } from "react-hot-toast";
import { useTimetable } from './TimetableContext';
import AssignmentModal from './AssignmentModal';

// --- Helper function to shorten names ---
const shortenSubClassName = (name: string): string => {
    const match = name.match(/^FORM ([1-5])(.*)$/i); // Match "FORM " followed by 1-5, then capture the rest
    if (match) {
        // Reconstruct: the number (match[1]) + the rest (match[2], trimmed)
        return `${match[1]}${match[2].trim()}`;
    }
    // If no match (e.g., "LSA", "Upper Sixth"), return original name
    return name;
};

// Period times mapping (same as in TimetableGrid)
const PERIOD_TIMES: { [key: string]: string } = {
  'Period 1': '07:30-8:25',
  'Period 2': '8:25-09:20',
  'Period 3': '09:20-10:15',
  'Period 4': '10:15-10:30', // Break
  'Period 5': '10:30-11:25',
  'Period 6': '11:25-12:20',
  'Lunch': '12:20-12:50', // Break
  'Period 7': '12:50-1:45',
  'Period 8': '1:45-2:40',
  'Period 9': '2:40-3:25',
  'Period 10': '3:35-3:45', // Break
  'Period 11': '3:45-4:45',
  'Period 12': '4:45-5:30',
};

// Days of the week for the timetable
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

interface SchoolTimetableViewProps {
  onClassSelect?: (subClassId: string) => void;
}

// --- Modal Data Type ---
interface SelectedCellDataType {
  day: string;
  periodName: string;
  subClassId: string;
  initialSubjectId: string | null;
  initialTeacherId: string | null;
}

const SchoolTimetableView: React.FC<SchoolTimetableViewProps> = ({ onClassSelect }) => {
  const {
    allWeeklySlots,
    uniquePeriodNames,
    daysOfWeek,
    subClasses,
    subjects,
    teachers,
    timetables,
    isLoadingTimetable,
    fetchTimetableForSubclass,
    updateTimetableSlot,
    getTeachersBySubject,
    saveAllTimetableChanges,
    isSavingAll,
    hasUnsavedChanges
  } = useTimetable();

  const [showConflictsOnly, setShowConflictsOnly] = useState<boolean>(false);
  const [compactView, setCompactView] = useState<boolean>(true);
  
  // --- State for Assignment Modal ---
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedCellData, setSelectedCellData] = useState<SelectedCellDataType | null>(null);

  useEffect(() => {
    console.log("School-Wide View: Checking and fetching timetables...");
    const fetchMissing = async () => {
      const promises: Promise<void>[] = [];
      subClasses.forEach(subClass => {
        if (!timetables[subClass.id]) {
          console.log(`   -> Fetching for ${subClass.name} (${subClass.id})`);
          promises.push(fetchTimetableForSubclass(subClass.id));
        }
      });
    };

    if (subClasses.length > 0) {
        fetchMissing();
    }
  }, [subClasses, fetchTimetableForSubclass, timetables]);

  const teacherConflicts = useMemo(() => {
    const conflicts: { [day: string]: { [period: string]: { [teacherId: string]: string[] } } } = {};

    daysOfWeek.forEach(day => {
      conflicts[day] = {};
      uniquePeriodNames.forEach(period => {
        conflicts[day][period] = {};
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
                    console.warn(`Conflict structure missing for ${day} - ${period}`);
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
  }, [timetables, daysOfWeek, uniquePeriodNames, allWeeklySlots]);

  const getSlotAssignmentInfo = (subClassId: string, day: string, periodName: string) => {
    const timetable = timetables[subClassId];
    if (!timetable || !timetable.slots) return { subjectId: null, teacherId: null, subjectName: null, teacherName: null };

    const slot = timetable.slots.find(s => s.day === day && s.period === periodName);
    return slot || { subjectId: null, teacherId: null, subjectName: null, teacherName: null };
  };

  const getSlotDefinition = (day: string, periodName: string) => {
     return allWeeklySlots.find(ws => ws.dayOfWeek === day && ws.name === periodName);
  }

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

  // Renamed from renderCompactCell
  const renderAssignmentCell = (day: string, periodName: string, subClassId: string) => {
    const assignment = getSlotAssignmentInfo(subClassId, day, periodName);
    const slotDefinition = getSlotDefinition(day, periodName);

    if (!slotDefinition) return <div className="w-full h-full bg-gray-50" title="Slot undefined">?</div>;
    if (slotDefinition.isBreak) {
      return <div className="bg-gray-200 w-full h-full" title={slotDefinition.name}></div>;
    }

    // Default empty cell look
    let cellContent = <div className="w-full h-full hover:bg-gray-50 cursor-pointer"></div>; 
    let bgColor = 'bg-white hover:bg-gray-50';
    let title = "Click to assign";

    // If assigned
    if (assignment.subjectId && assignment.teacherId) {
        const conflict = hasConflict(day, periodName, assignment.teacherId);
        bgColor = conflict ? 'bg-red-200 hover:bg-red-300' : 'bg-blue-100 hover:bg-blue-200';
        const subjectName = assignment.subjectName || subjects.find(s => String(s.id) === String(assignment.subjectId))?.name || 'Sub?';
        const teacherName = assignment.teacherName || teachers.find(t => String(t.id) === String(assignment.teacherId))?.name || 'Tch?';
        title = `${subjectName} - ${teacherName}${conflict ? ' (CONFLICT!)' : ''}`;

        cellContent = (
             <> {/* Use fragment to avoid extra div */} 
                 <span>{teacherName.split(' ').map(n => n[0]).join('') || '?'}</span>
                 <span className="mx-px">/</span>
                 <span>{subjectName.substring(0, 3).toUpperCase() || '?'}</span>
             </>
        );
    }

    return (
      <div
        className={`w-full h-full ${bgColor} cursor-pointer flex items-center justify-center text-[9px] md:text-[10px] text-center leading-tight p-[1px]`}
        title={title}
        onClick={() => {
            if (!slotDefinition.isBreak) {
                console.log(`Cell clicked: Day=${day}, Period=${periodName}, SubClass=${subClassId}`)
                // Prepare data for the modal
                const cellData: SelectedCellDataType = {
                    day: day,
                    periodName: periodName,
                    subClassId: subClassId,
                    initialSubjectId: assignment.subjectId ? String(assignment.subjectId) : null,
                    initialTeacherId: assignment.teacherId ? String(assignment.teacherId) : null,
                };
                setSelectedCellData(cellData);
                setIsModalOpen(true);
            } else {
                toast("Cannot assign during breaks.");
            }
        }}
      >
        {cellContent}
      </div>
    );
  };

  // --- Handlers ---
  const handleSaveAssignment = (subClassId: string, day: string, periodName: string, subjectId: string | null, teacherId: string | null) => {
    // Update the local state via context function
    updateTimetableSlot(subClassId, day, periodName, subjectId, teacherId);
    // Optionally add a toast message
    toast.success('Slot updated locally. Go to Class View to save permanently.'); 
  };
  
  const handleCloseModal = () => {
      setIsModalOpen(false);
      setSelectedCellData(null);
  }

  if (isLoadingTimetable && Object.keys(timetables).length < subClasses.length) {
       return <div className="p-4 text-center">Loading school-wide timetable data...</div>;
   }

  if (uniquePeriodNames.length === 0 || daysOfWeek.length === 0) {
      return <div className="p-4 text-center text-gray-500">Timetable structure not available.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
        <h2 className="text-2xl font-bold">School-Wide Timetable View</h2>
        <div className="flex items-center space-x-4">
           <Button 
             color="primary"
             onClick={saveAllTimetableChanges}
             disabled={!hasUnsavedChanges || isSavingAll}
           >
              {isSavingAll ? 'Saving...' : 'Save All Changes'}
           </Button>
          <label className="flex items-center space-x-2">
            <input 
              type="checkbox" 
              checked={showConflictsOnly} 
              onChange={(e) => setShowConflictsOnly(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm font-medium text-gray-700">Show classes with conflicts only</span>
          </label>
          <label className="flex items-center space-x-2">
            <input 
              type="checkbox" 
              checked={compactView} 
              onChange={(e) => setCompactView(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm font-medium text-gray-700">Compact view</span>
          </label>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-auto">
        <div className="relative p-2">
          <div className="flex justify-end mb-2 space-x-4">
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

          {/* Refactored Table Structure: Day/Period Rows, Subclass Columns */}
          {compactView ? (
            <div className="border rounded overflow-auto">
              <table className="w-full border-collapse text-xs table-fixed min-w-[1200px]">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="p-1 border sticky left-0 bg-gray-50 z-20 min-w-[120px]">Day/Period/Time</th>
                    {filteredSubClasses.map(subClass => (
                      <th
                        key={subClass.id}
                        className="p-1 border whitespace-nowrap cursor-pointer hover:bg-gray-100 truncate min-w-[70px]"
                        title={`View timetable for ${subClass.name}`}
                        onClick={() => onClassSelect?.(subClass.id)}
                      >
                        {shortenSubClassName(subClass.name)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {daysOfWeek.map(day => (
                    <React.Fragment key={day}> {/* Group rows by day */} 
                       {/* Add a Day Separator Row */} 
                       <tr className="bg-gray-200"> 
                           <td colSpan={filteredSubClasses.length + 1} className="p-1 border font-semibold text-center text-gray-700 text-sm capitalize">
                               {day.toLowerCase()} 
                           </td>
                       </tr>
                       
                       {uniquePeriodNames.map(periodName => {
                            const representativeSlotDef = allWeeklySlots.find(ws => ws.dayOfWeek === day && ws.name === periodName);
                            const isBreakPeriod = representativeSlotDef?.isBreak || false;
                            const rowBg = isBreakPeriod ? 'bg-gray-100' : 'bg-white hover:bg-gray-50'; // White background for non-break rows
                            const periodTime = representativeSlotDef ? `${representativeSlotDef.startTime?.substring(0, 5)}-${representativeSlotDef.endTime?.substring(0, 5)}` : 'N/A';

                            return (
                                <tr key={`${day}-${periodName}`} className={`border-b ${rowBg}`}>
                                    {/* Time Header Cell - Only show time */}
                                    <th className="p-1 border-r bg-gray-50 font-medium text-gray-800 sticky left-0 z-10 min-w-[100px]">
                                        {/* Removed Period Name Div */}
                                        {(representativeSlotDef?.startTime || representativeSlotDef?.endTime) && (
                                          <div className="text-[10px] text-gray-500 font-normal text-center">
                                            {representativeSlotDef.startTime?.substring(0, 5)} - {representativeSlotDef.endTime?.substring(0, 5)}
                                          </div>
                                        )}
                                        {/* Display period name subtly if needed, or remove completely */}
                                        {/* <div className="text-[9px] text-gray-400 text-center mt-0.5">({periodName})</div> */}
                                    </th>
                                    {/* Assignment Cells for each Subclass */}
                                    {filteredSubClasses.map(subClass => (
                                        <td key={`${subClass.id}-${day}-${periodName}`} className="border h-10 md:h-12 p-0">
                                            {/* Pass day, periodName, subClass.id to the cell renderer */} 
                                            {renderAssignmentCell(day, periodName, subClass.id)} {/* Use renamed function */} 
                                        </td>
                                    ))}
                                </tr>
                            );
                        })}
                    </React.Fragment>
                   ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-4 text-center text-gray-500">
                Detailed school-wide grid view not implemented yet. Use Compact View or Class View.
            </div>
          )}
        </div>
      </div>
      
      {/* Render the Assignment Modal */} 
      <AssignmentModal 
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        cellData={selectedCellData}
        subjects={subjects}
        teachers={teachers}
        getTeachersBySubject={getTeachersBySubject}
        onSave={handleSaveAssignment}
      />
    </div>
  );
};

export default SchoolTimetableView; 