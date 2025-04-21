"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { Button } from "@/components/ui";
import { toast } from "react-hot-toast";
import { useTimetable } from './TimetableContext';

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
  } = useTimetable();

  const [showConflictsOnly, setShowConflictsOnly] = useState<boolean>(false);
  const [compactView, setCompactView] = useState<boolean>(true);

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

  const renderCompactCell = (day: string, periodName: string, subClassId: string) => {
    const assignment = getSlotAssignmentInfo(subClassId, day, periodName);
    const slotDefinition = getSlotDefinition(day, periodName);

    if (!slotDefinition) return <div className="w-full h-full bg-gray-50" title="Slot undefined">?</div>;
    if (slotDefinition.isBreak) {
      return <div className="bg-gray-200 w-full h-full"></div>;
    }

    if (!assignment.subjectId || !assignment.teacherId) {
      return <div className="w-full h-full"></div>;
    }

    const conflict = hasConflict(day, periodName, assignment.teacherId);
    const bgColor = conflict ? 'bg-red-200 hover:bg-red-300' : 'bg-blue-100 hover:bg-blue-200';
    const subjectName = assignment.subjectName || subjects.find(s => s.id === assignment.subjectId)?.name || 'Unknown Sub';
    const teacherName = assignment.teacherName || teachers.find(t => t.id === assignment.teacherId)?.name || 'Unknown Teach';
    const title = `${subjectName} - ${teacherName}${conflict ? ' (CONFLICT!)' : ''}`;

    return (
      <div
        className={`w-full h-full ${bgColor} cursor-pointer flex items-center justify-center text-[9px] md:text-[10px] text-center leading-tight p-[1px]`}
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
            onClassSelect?.(subClassId);
          } else {
            toast.success(`${subjectName} - ${teacherName}`, { duration: 2000 });
            onClassSelect?.(subClassId);
          }
        }}
      >
        <span>{teacherName.split(' ').map(n => n[0]).join('') || '?'}</span>
        <span className="mx-px">/</span>
        <span>{subjectName.substring(0, 3).toUpperCase() || '?'}</span>
      </div>
    );
  };

  if (isLoadingTimetable && Object.keys(timetables).length < subClasses.length) {
       return <div className="p-4 text-center">Loading school-wide timetable data...</div>;
   }

  if (uniquePeriodNames.length === 0 || daysOfWeek.length === 0) {
      return <div className="p-4 text-center text-gray-500">Timetable structure not available.</div>;
  }

  return (
    <div className="space-y-6">
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

          {compactView ? (
            <div className="border rounded">
              <table className="w-full border-collapse text-xs table-fixed">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="p-1 border sticky left-0 bg-gray-50 z-20 min-w-[80px] md:min-w-[100px]">Time</th>
                    {filteredSubClasses.map(subClass => (
                      <th
                        key={subClass.id}
                        className="p-1 border whitespace-nowrap cursor-pointer hover:bg-gray-100 truncate"
                        title={`View timetable for ${subClass.name}`}
                        onClick={() => onClassSelect?.(subClass.id)}
                      >
                        {subClass.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                   {uniquePeriodNames.map(periodName => {
                       const representativeSlotDef = allWeeklySlots.find(ws => ws.name === periodName);
                       const isBreakPeriod = allWeeklySlots.some(ws => ws.name === periodName && ws.isBreak);
                       const rowBg = isBreakPeriod ? 'bg-gray-100' : 'hover:bg-gray-50';

                       return (
                           <tr key={periodName} className={`border-b ${rowBg}`}>
                               <th className="p-1 border sticky left-0 z-10 font-medium text-gray-800 min-w-[80px] md:min-w-[100px] bg-gray-50">
                                   <div className="text-center text-xs md:text-sm">{periodName}</div>
                                   {(representativeSlotDef?.startTime || representativeSlotDef?.endTime) && (
                                     <div className="text-[9px] md:text-[10px] text-gray-500 font-normal text-center">
                                        {representativeSlotDef.startTime?.substring(0, 5)} - {representativeSlotDef.endTime?.substring(0, 5)}
                                     </div>
                                   )}
                               </th>
                               {filteredSubClasses.map(subClass => (
                                    <td key={`${subClass.id}-${periodName}`} className="border h-8 md:h-10 p-0">
                                        {renderCompactCell("MONDAY", periodName, subClass.id)}
                                    </td>
                               ))}
                           </tr>
                       );
                   })}
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
    </div>
  );
};

export default SchoolTimetableView; 