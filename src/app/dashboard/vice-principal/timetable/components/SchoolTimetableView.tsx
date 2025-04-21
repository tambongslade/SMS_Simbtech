"use client";

import React, { useState, useMemo } from 'react';
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
  onClassSelect?: (classId: string) => void;
}

const SchoolTimetableView: React.FC<SchoolTimetableViewProps> = ({ onClassSelect }) => {
  const { 
    classes, 
    subjects,
    teachers,
    timetables, 
    getTeachersBySubject,
    isTeacherAssignedElsewhere
  } = useTimetable();

  const [activeClass, setActiveClass] = useState<string | null>(null);
  const [showConflictsOnly, setShowConflictsOnly] = useState<boolean>(false);
  const [compactView, setCompactView] = useState<boolean>(true);

  // Get all periods from all timetables
  const periods = useMemo(() => {
    const allPeriods = new Set<string>();
    
    // Collect all unique periods from all timetables
    Object.values(timetables).forEach(timetable => {
      timetable.slots.forEach(slot => {
        allPeriods.add(slot.period);
      });
    });
    
    // Sort periods
    return Array.from(allPeriods).sort((a, b) => {
      // Keep "Lunch" after Period 6
      if (a === "Lunch") return b.startsWith("Period") && parseInt(b.replace("Period ", "")) <= 6 ? 1 : -1;
      if (b === "Lunch") return a.startsWith("Period") && parseInt(a.replace("Period ", "")) <= 6 ? -1 : 1;
      
      // Standard period sorting - extract numbers for proper numeric sorting
      const aNum = a.startsWith("Period") ? parseInt(a.replace("Period ", "")) : 999;
      const bNum = b.startsWith("Period") ? parseInt(b.replace("Period ", "")) : 999;
      return aNum - bNum;
    });
  }, [timetables]);

  // Find teacher conflicts
  const teacherConflicts = useMemo(() => {
    const conflicts: { [day: string]: { [period: string]: { [teacherId: string]: string[] } } } = {};
    
    // Initialize the days and periods
    DAYS.forEach(day => {
      conflicts[day] = {};
      periods.forEach(period => {
        conflicts[day][period] = {};
      });
    });
    
    // Check each timetable for conflicts
    Object.entries(timetables).forEach(([classId, timetable]) => {
      timetable.slots.forEach(slot => {
        if (slot.teacherId && !slot.isBreak) {
          // If this teacher is already assigned to this time slot in another class, add to conflicts
          if (!conflicts[slot.day][slot.period][slot.teacherId]) {
            conflicts[slot.day][slot.period][slot.teacherId] = [classId];
          } else {
            conflicts[slot.day][slot.period][slot.teacherId].push(classId);
          }
        }
      });
    });
    
    return conflicts;
  }, [timetables, periods]);
  
  // Function to get the subject and teacher for a specific class, day, and period
  const getSlotInfo = (classId: string, day: string, period: string) => {
    const timetable = timetables[classId];
    if (!timetable) return { subjectId: '', teacherId: '' };
    
    const slot = timetable.slots.find(s => s.day === day && s.period === period);
    if (!slot) return { subjectId: '', teacherId: '' };
    
    return { 
      subjectId: slot.subjectId || '', 
      teacherId: slot.teacherId || '',
      isBreak: slot.isBreak
    };
  };
  
  // Function to get the subject name
  const getSubjectName = (subjectId: string) => {
    const subject = subjects.find(s => s.id === subjectId);
    return subject ? subject.name : '';
  };
  
  // Function to get the teacher name
  const getTeacherName = (teacherId: string) => {
    const teacher = teachers.find(t => t.id === teacherId);
    return teacher ? teacher.name : '';
  };
  
  // Function to check if a teacher has a conflict
  const hasConflict = (day: string, period: string, teacherId: string) => {
    return teacherConflicts[day]?.[period]?.[teacherId]?.length > 1;
  };

  // Filter classes based on conflicts if showConflictsOnly is true
  const filteredClasses = useMemo(() => {
    if (!showConflictsOnly) return classes;
    
    // Find classes that have conflicts for any teacher
    return classes.filter(cls => {
      for (const day of DAYS) {
        for (const period of periods) {
          const { teacherId } = getSlotInfo(cls.id, day, period);
          if (teacherId && hasConflict(day, period, teacherId)) {
            return true;
          }
        }
      }
      return false;
    });
  }, [classes, showConflictsOnly, teacherConflicts, periods, hasConflict, getSlotInfo]);

  // Render a compact cell for the school-wide grid
  const renderCompactCell = (day: string, period: string, classId: string) => {
    const { subjectId, teacherId, isBreak } = getSlotInfo(classId, day, period);
    
    if (isBreak) {
      return <div className="bg-gray-200 w-full h-full"></div>;
    }
    
    if (!subjectId || !teacherId) {
      return <div className="w-full h-full"></div>;
    }
    
    const conflict = hasConflict(day, period, teacherId);
    const bgColor = conflict ? 'bg-red-200' : 'bg-blue-100';
    const subjectName = getSubjectName(subjectId);
    const teacherName = getTeacherName(teacherId);
    const title = `${subjectName} - ${teacherName}${conflict ? ' (CONFLICT)' : ''}`;
    
    return (
      <div 
        className={`w-full h-full ${bgColor} cursor-pointer flex items-center justify-center text-xs`}
        title={title}
        onClick={() => {
          if (conflict) {
            // Get conflict classes for this teacher
            const conflictClasses = teacherConflicts[day][period][teacherId]
              .map(cId => classes.find(c => c.id === cId)?.name || cId)
              .join(', ');
              
            toast.error(
              `Conflict: ${teacherName} (${subjectName}) is assigned to multiple classes: ${conflictClasses}`,
              { duration: 5000 }
            );
            
            // Optionally select this class for editing
            onClassSelect?.(classId);
          } else {
            toast.success(`${subjectName} taught by ${teacherName}`, { duration: 3000 });
          }
        }}
      >
        {subjectId.substring(0, 3)}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
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
        <div className="relative">
          {/* Legend */}
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
            // Compact school-wide view (matches the image)
            <div className="border rounded">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="p-1 border">Time</th>
                    {filteredClasses.map(cls => (
                      <th 
                        key={cls.id} 
                        className="p-1 border whitespace-nowrap cursor-pointer"
                        onClick={() => onClassSelect?.(cls.id)}
                      >
                        {cls.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {periods.map(period => (
                    <tr key={period} className="border-b">
                      <th className="p-1 border bg-gray-50 text-left">
                        <div className="font-semibold">{period}</div>
                        <div className="text-gray-500">{PERIOD_TIMES[period]}</div>
                      </th>
                      {filteredClasses.map(cls => (
                        <td key={`${period}-${cls.id}`} className="p-0 border h-8">
                          <div className="grid grid-cols-5 h-full">
                            {DAYS.map(day => (
                              <div key={`${period}-${cls.id}-${day}`} className="h-full">
                                {renderCompactCell(day, period, cls.id)}
                              </div>
                            ))}
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            // Detailed conflict overview
            <div className="mt-8 space-y-2">
              <h3 className="text-xl font-bold">Conflict Overview</h3>
              <p className="text-sm text-gray-600">
                Red cells indicate teacher scheduling conflicts.
              </p>
              
              <div className="border rounded-lg overflow-hidden mt-4">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="p-2 border">Period / Day</th>
                      {DAYS.map(day => (
                        <th key={day} className="p-2 border">{day}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {periods.map(period => (
                      <tr key={period} className="border-b">
                        <th className="p-2 border bg-gray-50">
                          <div>{period}</div>
                          <div className="text-xs text-gray-500 font-normal">{PERIOD_TIMES[period] || ''}</div>
                        </th>
                        {DAYS.map(day => {
                          // Count conflicts for this day and period
                          const periodConflicts = teacherConflicts[day]?.[period] || {};
                          const conflictCount = Object.values(periodConflicts)
                            .filter(classIds => classIds.length > 1)
                            .length;
                          
                          return (
                            <td 
                              key={`${day}-${period}`} 
                              className={`p-1 border text-center ${
                                conflictCount > 0 ? 'bg-red-100' : ''
                              }`}
                            >
                              {conflictCount > 0 ? (
                                <div className="font-medium text-red-600">
                                  {conflictCount} conflict{conflictCount > 1 ? 's' : ''}
                                </div>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Class Selector */}
      <div className="mt-6">
        <h3 className="text-lg font-semibold mb-2">Select Class to Edit</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
          {classes.map(cls => (
            <Button
              key={cls.id}
              onClick={() => onClassSelect?.(cls.id)}
              variant={activeClass === cls.id ? 'solid' : 'outline'}
              size="sm"
            >
              {cls.name}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SchoolTimetableView; 