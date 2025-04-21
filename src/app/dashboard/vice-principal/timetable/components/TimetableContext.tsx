"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { toast } from 'react-hot-toast';

// Types
interface Teacher {
  id: string;
  name: string;
  subjects: string[]; // Array of subject IDs the teacher can teach
}

interface Subject {
  id: string;
  name: string;
}

interface Class {
  id: string;
  name: string;
}

interface TimetableSlot {
  day: string;
  period: string;
  subjectId?: string;
  teacherId?: string;
  isBreak?: boolean;
  isAssembly?: boolean;
}

interface Timetable {
  classId: string;
  slots: TimetableSlot[];
}

interface TimetablesState {
  [classId: string]: Timetable;
}

interface TimetableContextType {
  classes: Class[];
  subjects: Subject[];
  teachers: Teacher[];
  timetables: TimetablesState;
  isLoading: boolean;
  updateTimetableSlot: (
    classId: string,
    day: string,
    period: string,
    subjectId: string,
    teacherId: string
  ) => void;
  saveChanges: () => void;
  getTeachersBySubject: (subjectId: string) => Teacher[];
  isTeacherAssignedElsewhere: (
    teacherId: string,
    day: string,
    period: string,
    excludeClassId: string
  ) => string | null;
}

// Mock data - in a real application, this would come from an API
const MOCK_CLASSES: Class[] = [
  { id: 'class1', name: 'Class 6A' },
  { id: 'class2', name: 'Class 7B' },
  { id: 'class3', name: 'Class 8C' },
  { id: 'class4', name: 'Class 9D' },
  { id: 'class5', name: 'Class 10E' },
];

const MOCK_SUBJECTS: Subject[] = [
  { id: 'sub1', name: 'Mathematics' },
  { id: 'sub2', name: 'English' },
  { id: 'sub3', name: 'Science' },
  { id: 'sub4', name: 'Social Studies' },
  { id: 'sub5', name: 'Physical Education' },
  { id: 'sub6', name: 'Computer Science' },
];

const MOCK_TEACHERS: Teacher[] = [
  { id: 'teacher1', name: 'Mr. Johnson', subjects: ['sub1', 'sub3'] },
  { id: 'teacher2', name: 'Mrs. Smith', subjects: ['sub2', 'sub4'] },
  { id: 'teacher3', name: 'Ms. Davis', subjects: ['sub3', 'sub6'] },
  { id: 'teacher4', name: 'Mr. Wilson', subjects: ['sub4', 'sub5'] },
  { id: 'teacher5', name: 'Mrs. Brown', subjects: ['sub1', 'sub6'] },
];

// Create empty timetable structure
const createEmptyTimetable = (classId: string): Timetable => {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const periods = [
    'Period 1',  // 07:30-8:25
    'Period 2',  // 8:25-09:20
    'Period 3',  // 09:20-10:15
    'Period 4',  // 10:15-10:30 (Break)
    'Period 5',  // 10:30-11:25
    'Period 6',  // 11:25-12:20
    'Lunch',     // 12:20-12:50 (Break)
    'Period 7',  // 12:50-1:45
    'Period 8',  // 1:45-2:40
    'Period 9',  // 2:40-3:25
    'Period 10', // 3:35-3:45 (Break)
    'Period 11', // 3:45-4:45
    'Period 12', // 4:45-5:30
  ];
  
  const slots: TimetableSlot[] = [];
  
  days.forEach(day => {
    periods.forEach(period => {
      // Add break periods
      if (period === 'Period 4' || period === 'Period 10') {
        slots.push({
          day,
          period,
          isBreak: true
        });
        return;
      }
      
      if (period === 'Lunch') {
        slots.push({
          day,
          period,
          isBreak: true
        });
        return;
      }
      
      // Add random subject and teacher assignments for testing
      // For test purposes, create deliberate conflicts
      let subjectId = undefined;
      let teacherId = undefined;
      
      // DELIBERATE CONFLICT 1: teacher1 assigned to multiple classes on Monday Period 1
      if (day === 'Monday' && period === 'Period 1' && (classId === 'class1' || classId === 'class2')) {
        subjectId = 'sub1';
        teacherId = 'teacher1';
      }
      // DELIBERATE CONFLICT 2: teacher5 assigned to multiple classes on Tuesday Period 3
      else if (day === 'Tuesday' && period === 'Period 3' && (classId === 'class3' || classId === 'class4')) {
        subjectId = 'sub6';
        teacherId = 'teacher5';
      }
      // DELIBERATE CONFLICT 3: teacher3 assigned to multiple classes on Thursday Period 8
      else if (day === 'Thursday' && period === 'Period 8' && (classId === 'class1' || classId === 'class5')) {
        subjectId = 'sub3';
        teacherId = 'teacher3';
      }
      // Regular slot with no assignment yet
      else {
        // Fill with random assignments for testing
        const subjectIndex = (parseInt(classId.replace('class', '')) + periods.indexOf(period)) % MOCK_SUBJECTS.length;
        subjectId = MOCK_SUBJECTS[subjectIndex].id;
        
        const teacherOptions = MOCK_TEACHERS.filter(t => t.subjects.includes(subjectId));
        if (teacherOptions.length > 0) {
          const teacherIndex = (parseInt(classId.replace('class', '')) + days.indexOf(day) + periods.indexOf(period)) % teacherOptions.length;
          teacherId = teacherOptions[teacherIndex].id;
        }
      }
      
      slots.push({
        day,
        period,
        subjectId,
        teacherId
      });
    });
  });
  
  return {
    classId,
    slots
  };
};

// Initialize mock timetables
const initializeMockTimetables = (): TimetablesState => {
  const timetables: TimetablesState = {};
  
  MOCK_CLASSES.forEach(cls => {
    timetables[cls.id] = createEmptyTimetable(cls.id);
  });
  
  return timetables;
};

// Create context
const TimetableContext = createContext<TimetableContextType | undefined>(undefined);

// Provider component
export const TimetableProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [timetables, setTimetables] = useState<TimetablesState>({});
  const [isLoading, setIsLoading] = useState(true);

  // Simulate API call to fetch data
  useEffect(() => {
    const fetchData = async () => {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setClasses(MOCK_CLASSES);
      setSubjects(MOCK_SUBJECTS);
      setTeachers(MOCK_TEACHERS);
      setTimetables(initializeMockTimetables());
      setIsLoading(false);
    };
    
    fetchData();
  }, []);

  // Function to update a timetable slot
  const updateTimetableSlot = (
    classId: string,
    day: string,
    period: string,
    subjectId: string,
    teacherId: string
  ) => {
    setTimetables(prev => {
      const classTimetable = prev[classId];
      if (!classTimetable) return prev;
      
      const updatedSlots = classTimetable.slots.map(slot => {
        if (slot.day === day && slot.period === period) {
          return {
            ...slot,
            subjectId,
            teacherId,
          };
        }
        return slot;
      });
      
      return {
        ...prev,
        [classId]: {
          ...classTimetable,
          slots: updatedSlots,
        },
      };
    });
  };

  // Function to save changes to the backend
  const saveChanges = () => {
    // In a real application, this would make an API call to save the timetable
    toast.success('Timetable saved successfully!');
  };

  // Function to get teachers who can teach a specific subject
  const getTeachersBySubject = (subjectId: string): Teacher[] => {
    return teachers.filter(teacher => teacher.subjects.includes(subjectId));
  };

  // Function to check if a teacher is assigned elsewhere during a specific time slot
  const isTeacherAssignedElsewhere = (
    teacherId: string,
    day: string,
    period: string,
    excludeClassId: string
  ): string | null => {
    for (const classId in timetables) {
      // Skip the class we're currently editing
      if (classId === excludeClassId) continue;
      
      const classTimetable = timetables[classId];
      const conflict = classTimetable.slots.some(
        slot => 
          slot.day === day && 
          slot.period === period && 
          slot.teacherId === teacherId
      );
      
      if (conflict) {
        const conflictClass = classes.find(c => c.id === classId);
        return conflictClass ? conflictClass.name : classId;
      }
    }
    
    return null;
  };

  const value = {
    classes,
    subjects,
    teachers,
    timetables,
    isLoading,
    updateTimetableSlot,
    saveChanges,
    getTeachersBySubject,
    isTeacherAssignedElsewhere,
  };

  return (
    <TimetableContext.Provider value={value}>
      {children}
    </TimetableContext.Provider>
  );
};

// Custom hook for using the context
export const useTimetable = (): TimetableContextType => {
  const context = useContext(TimetableContext);
  if (context === undefined) {
    throw new Error('useTimetable must be used within a TimetableProvider');
  }
  return context;
}; 