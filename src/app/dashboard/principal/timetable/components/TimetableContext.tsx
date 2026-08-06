"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { sortClassesByLevel } from '@/lib/classOrdering';
import { toast } from 'react-hot-toast';
import { useAuth } from '@/components/context/AuthContext';

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
  level: number;
}

// Added SubClass type
interface SubClass {
  id: string;
  name: string;
  classId: string; // ID of the parent class
  className?: string; // Optional name of parent class
  level?: number; // Add level to subclass for sorting
}

// Added PeriodInfo type
interface PeriodInfo {
  id: string; // Or number
  name: string; // e.g., "Period 1", "Break"
  startTime?: string; // Optional
  endTime?: string;   // Optional
  isBreak?: boolean; // Optional flag from API
  dayOfWeek?: string; // Added dayOfWeek field
}

// A single subject+teacher assignment within a slot
export interface SlotAssignment {
  subjectId: string | null;
  teacherId: string | null;
  subjectName: string | null;
  teacherName: string | null;
}

interface TimetableSlot {
  day: string;
  period: string;
  periodId?: string; // Persist specific weekly slot ID for reliable saves
  assignments: SlotAssignment[];
  isBreak?: boolean;
  isAssembly?: boolean;
}

interface Timetable {
  classId: string;
  slots: TimetableSlot[];
}

interface TimetablesState {
  [subClassId: string]: Timetable;
}

interface AcademicYear {
  id: string;
  name: string;
}

interface TimetableContextType {
  classes: Class[];
  subClasses: SubClass[];
  subjects: Subject[];
  teachers: Teacher[];
  allWeeklySlots: PeriodInfo[];
  uniquePeriodNames: string[];
  daysOfWeek: string[];
  timetables: TimetablesState;
  originalTimetables: TimetablesState;
  isLoading: boolean;
  isLoadingTimetable: boolean;
  fetchTimetableForSubclass: (subClassId: string) => Promise<void>;
  fetchFullSchoolTimetable: () => Promise<void>;
  updateSlotAssignment: (
    subClassId: string,
    day: string,
    period: string,
    assignmentIndex: number,
    subjectId: string | null,
    teacherId: string | null
  ) => void;
  addSlotAssignment: (
    subClassId: string,
    day: string,
    period: string,
    subjectId: string | null,
    teacherId: string | null
  ) => void;
  removeSlotAssignment: (
    subClassId: string,
    day: string,
    period: string,
    assignmentIndex: number
  ) => void;
  saveChanges: (subClassId: string) => Promise<void>;
  /// Auto-save state for the whole timetable editor. Assignments persist
  /// on selection; this is what the UI reports instead of a Save button.
  autoSaveStatus: 'idle' | 'saving' | 'saved' | 'error';
  retryAutoSave: () => void;
  getTeachersBySubject: (subjectId: string) => Teacher[];
  isTeacherAssignedElsewhere: (
    teacherId: string,
    day: string,
    period: string,
    excludeSubClassId: string
  ) => string | null;
  error: string | null;
  academicYears: AcademicYear[];
  selectedAcademicYearId: string | null;
  setSelectedAcademicYearId: (id: string | null) => void;
}

// Mock data - in a real application, this would come from an API
const MOCK_CLASSES: Class[] = [
  { id: 'class1', name: 'Class 6A', level: 6 },
  { id: 'class2', name: 'Class 7B', level: 7 },
  { id: 'class3', name: 'Class 8C', level: 8 },
  { id: 'class4', name: 'Class 9D', level: 9 },
  { id: 'class5', name: 'Class 10E', level: 10 },
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

// Base URL and Auth Token retrieval (assuming similar setup as other pages)
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://192.168.1.103:4000/api/v1';
const getAuthToken = () => localStorage.getItem('token');

// Create empty timetable structure
const createInitialTimetableStructure = (subClassId: string, weeklySlots: PeriodInfo[]): Timetable => {
  const slots: TimetableSlot[] = weeklySlots.map(ws => ({
    day: ws.dayOfWeek || '',
    period: ws.name,
    periodId: String(ws.id),
    assignments: [],
    isBreak: ws.isBreak,
  }));
  return {
    classId: subClassId,
    slots
  };
};

// Deep clone a timetables state (needed because assignments are nested arrays)
const deepCloneTimetablesState = (state: TimetablesState): TimetablesState => {
  const clone: TimetablesState = {};
  for (const key in state) {
    clone[key] = {
      classId: state[key].classId,
      slots: state[key].slots.map(slot => ({
        ...slot,
        assignments: slot.assignments.map(a => ({ ...a })),
      })),
    };
  }
  return clone;
};

// Initialize mock timetables - may need revision or removal
const initializeMockTimetables = (): TimetablesState => {
  const timetables: TimetablesState = {};
  MOCK_CLASSES.forEach(cls => {
    timetables[cls.id] = createInitialTimetableStructure(cls.id, []);
  });
  return timetables;
};

// Create context
const TimetableContext = createContext<TimetableContextType | undefined>(undefined);

// Provider component
export const TimetableProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { selectedAcademicYear: authSelectedAcademicYear } = useAuth();
  const [classes, setClasses] = useState<Class[]>([]);
  const [subClasses, setSubClasses] = useState<SubClass[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [allWeeklySlots, setAllWeeklySlots] = useState<PeriodInfo[]>([]);
  const [uniquePeriodNames, setUniquePeriodNames] = useState<string[]>([]);
  const [daysOfWeek, setDaysOfWeek] = useState<string[]>([]);
  const [timetables, setTimetables] = useState<TimetablesState>({});
  const [originalTimetables, setOriginalTimetables] = useState<TimetablesState>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingTimetable, setIsLoadingTimetable] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState<string | null>(null);

  // Set initial selectedAcademicYearId from AuthContext once available
  useEffect(() => {
    if (authSelectedAcademicYear && !selectedAcademicYearId) {
      setSelectedAcademicYearId(String(authSelectedAcademicYear.id));
    }
  }, [authSelectedAcademicYear, selectedAcademicYearId]);

  // Fetch initial data (Classes, SubClasses, Periods, Subjects, Teachers, Academic Years from API)
  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoading(true);
      setError(null);
      const token = getAuthToken();
      if (!token) {
        toast.error("Authentication token not found.");
        setIsLoading(false);
        setTeachers(MOCK_TEACHERS);
        return;
      }

      try {
        console.log("Fetching initial timetable dependency data from API...");
        const [classResponse, subClassResponse, subjectResponse, periodResponse, teacherResponse, academicYearResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/classes`, { method: 'GET', headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' } }),
          fetch(`${API_BASE_URL}/classes/sub-classes?limit=40`, { method: 'GET', headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' } }),
          fetch(`${API_BASE_URL}/subjects`, { method: 'GET', headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' } }),
          fetch(`${API_BASE_URL}/periods`, { method: 'GET', headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' } }),
          fetch(`${API_BASE_URL}/users/teachers`, { method: 'GET', headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' } }),
          fetch(`${API_BASE_URL}/academic-years`, { method: 'GET', headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' } }),
        ].map(p => p.catch(e => e)));

        const checkResponse = async (response: Response | Error, entity: string) => {
          if (response instanceof Error) {
            throw new Error(`Network error fetching ${entity}: ${response.message}`);
          }
          if (!response.ok) {
            if (entity === 'periods' && response.status === 404) {
              console.warn('/periods endpoint not found (404). Using empty array.');
              return { data: [] };
            }
            const errorData = await response.json().catch(() => ({ message: response.statusText }));
            throw new Error(errorData.message || `Failed to fetch ${entity} (${response.status})`);
          }
          return response.json();
        };

        const [classResult, subClassResult, subjectResult, periodResult, teacherResult, academicYearResult] = await Promise.all([
          checkResponse(classResponse, 'classes'),
          checkResponse(subClassResponse, 'subClasses'),
          checkResponse(subjectResponse, 'subjects'),
          checkResponse(periodResponse, 'periods'),
          checkResponse(teacherResponse, 'teachers'),
          checkResponse(academicYearResponse, 'academic years'),
        ]);

        console.log("Classes API response:", classResult);
        const fetchedClasses: Class[] = classResult.data?.map((cls: any) => ({
          id: String(cls.id),
          name: cls.name,
          level: cls.level
        })) || [];
        setClasses(sortClassesByLevel(fetchedClasses));

        console.log("SubClasses API response:", subClassResult);
        let fetchedSubClasses: SubClass[] = subClassResult.data?.map((sc: any) => ({
          id: String(sc.id),
          name: sc.name,
          classId: String(sc.class?.id),
          className: sc.class?.name,
          level: fetchedClasses.find(c => c.id === String(sc.class?.id))?.level
        })) || [];

        fetchedSubClasses.sort((a, b) => {
          if (a.level === b.level) {
            return a.name.localeCompare(b.name);
          }
          return (a.level || 0) - (b.level || 0);
        });

        setSubClasses(fetchedSubClasses);

        console.log("Subjects API response:", subjectResult);
        const fetchedSubjects = subjectResult.data?.map((sub: any) => ({ id: String(sub.id), name: sub.name })) || [];
        setSubjects(fetchedSubjects);

        // Process Periods (now expecting weekly slot structure)
        console.log("Periods API response (Weekly Slots):", periodResult);
        const fetchedWeeklySlots: PeriodInfo[] = periodResult.data?.map((p: any) => ({
          id: String(p.id),
          name: p.name,
          dayOfWeek: p.dayOfWeek,
          startTime: p.startTime,
          endTime: p.endTime,
          isBreak: p.isBreak || false
        })) || [];
        setAllWeeklySlots(fetchedWeeklySlots);

        // Derive unique period names and days
        const uniqueNamesSet = new Set<string>();
        const daysSet = new Set<string>();
        fetchedWeeklySlots.forEach((slot: PeriodInfo) => {
          uniqueNamesSet.add(slot.name);
          if (slot.dayOfWeek) daysSet.add(slot.dayOfWeek);
        });

        // Custom sort for period names based on start time
        const sortedUniqueNames = Array.from(uniqueNamesSet).sort((nameA, nameB) => {
          const slotA = fetchedWeeklySlots.find((slot: PeriodInfo) => slot.name === nameA);
          const slotB = fetchedWeeklySlots.find((slot: PeriodInfo) => slot.name === nameB);

          const timeA = slotA?.startTime;
          const timeB = slotB?.startTime;

          if (!timeA && !timeB) return 0;
          if (!timeA) return 1;
          if (!timeB) return -1;

          return timeA.localeCompare(timeB);
        });

        // Sort days (using a predefined order)
        const dayOrder = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"];
        const sortedDays = Array.from(daysSet).sort((dayA, dayB) => {
          return dayOrder.indexOf(dayA) - dayOrder.indexOf(dayB);
        });

        setUniquePeriodNames(sortedUniqueNames);
        setDaysOfWeek(sortedDays);

        console.log("Sorted Unique Periods:", sortedUniqueNames);
        console.log("Sorted Days:", sortedDays);

        console.log("Teachers API response:", teacherResult);
        const fetchedTeachers = teacherResult.data?.map((t: any) => ({ id: String(t.id), name: t.name, subjects: t.subjects?.map((s: any) => String(s.id)) || [] })) || [];
        setTeachers(fetchedTeachers);

        console.log("Academic Years API response:", academicYearResult);
        const fetchedAcademicYears = academicYearResult.data?.map((ay: any) => ({ id: String(ay.id), name: ay.name })) || [];
        setAcademicYears(fetchedAcademicYears);

        if (authSelectedAcademicYear && fetchedAcademicYears.some((ay: any) => ay.id === String(authSelectedAcademicYear.id))) {
          setSelectedAcademicYearId(String(authSelectedAcademicYear.id));
        } else if (fetchedAcademicYears.length > 0) {
          setSelectedAcademicYearId(fetchedAcademicYears[0].id);
        }

        setTimetables({});
        setOriginalTimetables({});

      } catch (err: any) {
        const message = err instanceof Error ? err.message : 'An unknown error occurred';
        console.error("Failed to fetch initial timetable data:", err);
        setError(message);
        toast.error(`Error loading initial data: ${message}`);
        setClasses([]);
        setSubClasses([]);
        setSubjects([]);
        setTeachers([]);
        setAllWeeklySlots([]);
        setUniquePeriodNames([]);
        setDaysOfWeek([]);
        setTimetables({});
        setOriginalTimetables({});
        setAcademicYears([]);
        setSelectedAcademicYearId(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialData();
  }, [authSelectedAcademicYear]);

  // Function to fetch assigned slots for a specific subclass
  const fetchTimetableForSubclass = useCallback(async (subClassId: string) => {
    if (!subClassId || !selectedAcademicYearId) return;
    console.log(`Fetching timetable for subClassId: ${subClassId} for academic year: ${selectedAcademicYearId}`);
    setIsLoadingTimetable(true);
    setError(null);
    const token = getAuthToken();
    if (!token) {
      toast.error("Authentication token not found.");
      setIsLoadingTimetable(false);
      return;
    }

    try {
      // 1. Get the base structure from allWeeklySlots
      const baseStructure = createInitialTimetableStructure(subClassId, allWeeklySlots);

      // Set base structure immediately to render grid
      setTimetables(prev => ({ ...prev, [subClassId]: baseStructure }));
      setOriginalTimetables(prev => ({ ...prev, [subClassId]: deepCloneTimetablesState({ [subClassId]: baseStructure })[subClassId] }));

      // 2. Fetch assigned slots from API
      const response = await fetch(`${API_BASE_URL}/timetables/subclass/${subClassId}?academicYearId=${selectedAcademicYearId}`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(errorData.message || `Failed to fetch timetable for ${subClassId}`);
      }

      const result = await response.json();
      const assignedApiSlots: any[] = result.data?.slots || [];
      console.log(`Assigned slots for ${subClassId}:`, assignedApiSlots);

      // 3. Merge assigned slots into the base structure
      // Multiple API slots can map to the same (day, period) — push to assignments array
      const mergedSlots = baseStructure.slots.map(baseSlot => {
        const weeklySlotDef = allWeeklySlots.find(ws =>
          ws.dayOfWeek === baseSlot.day && ws.name === baseSlot.period
        );
        if (!weeklySlotDef) return baseSlot;

        // Find ALL assignments from API data that match this weekly slot
        const matchingAssignments = assignedApiSlots.filter(
          (apiSlot) => String(apiSlot.periodId) === String(weeklySlotDef.id)
        );

        const assignments: SlotAssignment[] = matchingAssignments.map(assignment => {
          const subject = subjects.find(s => String(s.id) === String(assignment.subjectId));
          const teacher = teachers.find(t => String(t.id) === String(assignment.teacherId));
          return {
            subjectId: assignment.subjectId ? String(assignment.subjectId) : null,
            teacherId: assignment.teacherId ? String(assignment.teacherId) : null,
            subjectName: subject?.name || null,
            teacherName: teacher?.name || null,
          };
        });

        return {
          ...baseSlot,
          assignments,
        };
      });

      // 4. Update the state
      const newTimetableState = { ...baseStructure, slots: mergedSlots };
      setTimetables(prev => ({ ...prev, [subClassId]: newTimetableState }));
      setOriginalTimetables(prev => ({ ...prev, [subClassId]: deepCloneTimetablesState({ [subClassId]: newTimetableState })[subClassId] }));

    } catch (err: any) {
      const message = err instanceof Error ? err.message : 'An unknown error occurred';
      console.error(`Failed to fetch timetable for ${subClassId}:`, err);
      setError(message);
      toast.error(`Error loading timetable: ${message}`);
    } finally {
      setIsLoadingTimetable(false);
    }
  }, [allWeeklySlots, subjects, teachers, selectedAcademicYearId]);

  // New function to fetch the full school timetable
  const fetchFullSchoolTimetable = useCallback(async () => {
    if (!selectedAcademicYearId) return;
    setIsLoadingTimetable(true);
    setError(null);
    const token = getAuthToken();
    if (!token) {
      toast.error("Authentication token not found.");
      setIsLoadingTimetable(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/timetables/full-school?academicYearId=${selectedAcademicYearId}`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(errorData.message || `Failed to fetch full school timetable (${response.status})`);
      }

      const result = await response.json();
      const fullTimetableSlots: any[] = result.data?.timetableSlots || [];
      console.log("Full school timetable API response:", fullTimetableSlots);

      const newTimetablesState: TimetablesState = {};

      // FIRST: Initialize base structure for ALL subclasses
      subClasses.forEach(subClass => {
        newTimetablesState[subClass.id] = createInitialTimetableStructure(subClass.id, allWeeklySlots);
      });

      // SECOND: Apply assigned slots from API response
      // Multiple API slots can map to the same (subClassId, day, periodName) — push to assignments array
      fullTimetableSlots.forEach(apiSlot => {
        const subClassId = String(apiSlot.subClassId);

        if (!newTimetablesState[subClassId]) {
          newTimetablesState[subClassId] = createInitialTimetableStructure(subClassId, allWeeklySlots);
        }

        newTimetablesState[subClassId].classId = String(apiSlot.classId);

        const targetSlot = newTimetablesState[subClassId].slots.find(baseSlot =>
          baseSlot.day === apiSlot.day && baseSlot.period === apiSlot.periodName
        );

        if (targetSlot) {
          const subject = subjects.find(s => String(s.id) === String(apiSlot.subjectId));
          const teacher = teachers.find(t => String(t.id) === String(apiSlot.teacherId));
          targetSlot.assignments.push({
            subjectId: apiSlot.subjectId ? String(apiSlot.subjectId) : null,
            teacherId: apiSlot.teacherId ? String(apiSlot.teacherId) : null,
            subjectName: subject?.name || null,
            teacherName: teacher?.name || null,
          });
        } else {
          console.warn(`Could not find slot for ${apiSlot.day} - ${apiSlot.periodName} in subclass ${subClassId}`);
        }
      });

      console.log("Final timetables state:", newTimetablesState);
      setTimetables(newTimetablesState);
      setOriginalTimetables(deepCloneTimetablesState(newTimetablesState));

    } catch (err: any) {
      const message = err instanceof Error ? err.message : 'An unknown error occurred';
      console.error("Failed to fetch full school timetable:", err);
      setError(message);
      toast.error(`Error loading school timetable: ${message}`);
    } finally {
      setIsLoadingTimetable(false);
    }
  }, [allWeeklySlots, subjects, teachers, selectedAcademicYearId, subClasses]);

  // ── Auto-save ──
  // Assignments persist as soon as they're chosen. Edits mark their
  // subclass dirty; a short debounce coalesces a burst (picking a
  // subject then a teacher then removing a row) into one request.
  const AUTO_SAVE_DELAY_MS = 700;
  const [autoSaveStatus, setAutoSaveStatus] =
    useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const dirtySubClassIds = useRef<Set<string>>(new Set());
  const [dirtyTick, setDirtyTick] = useState(0);

  const markDirty = useCallback((subClassId: string) => {
    dirtySubClassIds.current.add(subClassId);
    setDirtyTick(tick => tick + 1);
  }, []);

  // Function to update a specific assignment within a slot
  const updateSlotAssignment = useCallback((
    subClassId: string,
    day: string,
    period: string,
    assignmentIndex: number,
    subjectId: string | null,
    teacherId: string | null
  ) => {
    const subjectName = subjectId ? subjects.find(s => String(s.id) === String(subjectId))?.name || null : null;
    const teacherName = teacherId ? teachers.find(t => String(t.id) === String(teacherId))?.name || null : null;

    setTimetables(prev => {
      const classTimetable = prev[subClassId];
      if (!classTimetable) return prev;

      const updatedSlots = classTimetable.slots.map(slot => {
        if (slot.day === day && slot.period === period) {
          const newAssignments = [...slot.assignments];
          if (assignmentIndex >= 0 && assignmentIndex < newAssignments.length) {
            newAssignments[assignmentIndex] = { subjectId, teacherId, subjectName, teacherName };
          }
          return { ...slot, assignments: newAssignments };
        }
        return slot;
      });

      return {
        ...prev,
        [subClassId]: { ...classTimetable, slots: updatedSlots },
      };
    });
    markDirty(subClassId);
  }, [subjects, teachers, markDirty]);

  // Function to add a new assignment to a slot
  const addSlotAssignment = useCallback((
    subClassId: string,
    day: string,
    period: string,
    subjectId: string | null,
    teacherId: string | null
  ) => {
    const subjectName = subjectId ? subjects.find(s => String(s.id) === String(subjectId))?.name || null : null;
    const teacherName = teacherId ? teachers.find(t => String(t.id) === String(teacherId))?.name || null : null;

    setTimetables(prev => {
      const classTimetable = prev[subClassId];
      if (!classTimetable) return prev;

      const updatedSlots = classTimetable.slots.map(slot => {
        if (slot.day === day && slot.period === period) {
          return {
            ...slot,
            assignments: [...slot.assignments, { subjectId, teacherId, subjectName, teacherName }],
          };
        }
        return slot;
      });

      return {
        ...prev,
        [subClassId]: { ...classTimetable, slots: updatedSlots },
      };
    });
    markDirty(subClassId);
  }, [subjects, teachers, markDirty]);

  // Function to remove an assignment from a slot
  const removeSlotAssignment = useCallback((
    subClassId: string,
    day: string,
    period: string,
    assignmentIndex: number
  ) => {
    setTimetables(prev => {
      const classTimetable = prev[subClassId];
      if (!classTimetable) return prev;

      const updatedSlots = classTimetable.slots.map(slot => {
        if (slot.day === day && slot.period === period) {
          const newAssignments = slot.assignments.filter((_, i) => i !== assignmentIndex);
          return { ...slot, assignments: newAssignments };
        }
        return slot;
      });

      return {
        ...prev,
        [subClassId]: { ...classTimetable, slots: updatedSlots },
      };
    });
    markDirty(subClassId);
  }, [markDirty]);

  // Helper: check if assignments arrays are equal
  const assignmentsEqual = (a: SlotAssignment[], b: SlotAssignment[]): boolean => {
    if (a.length !== b.length) return false;
    return a.every((aItem, i) =>
      aItem.subjectId === b[i].subjectId && aItem.teacherId === b[i].teacherId
    );
  };

  // Persists one subclass's changed slots.
  //
  // `silent` is the auto-save path: it skips the success toast, leaves the
  // global loading flag alone (so the grid doesn't dim on every pick), and
  // syncs the baseline locally instead of refetching the whole school.
  // The explicit Save button still takes the loud path.
  const persistSubClass = useCallback(async (
    subClassId: string,
    options?: { silent?: boolean }
  ) => {
    const silent = options?.silent ?? false;
    const currentTimetable = timetables[subClassId];
    const originalTimetable = originalTimetables[subClassId];

    if (!currentTimetable) {
      if (!silent) toast.error("No timetable data loaded for this subclass to save.");
      return;
    }
    if (!originalTimetable) {
      console.error("Original timetable state missing for comparison.");
      if (!silent) toast.error("Cannot determine changes to save.");
      return;
    }

    const currentSlots = currentTimetable.slots;
    const originalSlots = originalTimetable.slots;

    // Find changed slots (excluding breaks)
    // For each changed slot, send ALL its current assignments
    const changedSlotsPayload: { periodId: number; subjectId: number | null; teacherId: number | null }[] = [];

    currentSlots.forEach(currentSlot => {
      if (currentSlot.isBreak) return;

      const originalSlot = originalSlots.find(origSlot =>
        origSlot.day === currentSlot.day && origSlot.period === currentSlot.period
      );

      const isChanged = !originalSlot || !assignmentsEqual(currentSlot.assignments, originalSlot.assignments);

      if (isChanged) {
        const specificPeriodId = currentSlot.periodId || allWeeklySlots.find(ws => ws.dayOfWeek === currentSlot.day && ws.name === currentSlot.period)?.id || null;

        if (!specificPeriodId) {
          console.warn(`Could not find period ID for ${currentSlot.day} - ${currentSlot.period}`);
          return;
        }

        const periodIdNum = Number(specificPeriodId);

        if (currentSlot.assignments.length === 0) {
          // Slot was cleared — send null to remove all assignments
          changedSlotsPayload.push({
            periodId: periodIdNum,
            subjectId: null,
            teacherId: null,
          });
        } else {
          // Send all current assignments for this slot
          currentSlot.assignments.forEach(assignment => {
            changedSlotsPayload.push({
              periodId: periodIdNum,
              subjectId: assignment.subjectId ? Number(assignment.subjectId) : null,
              teacherId: assignment.teacherId ? Number(assignment.teacherId) : null,
            });
          });
        }
      }
    });

    if (changedSlotsPayload.length === 0) {
      if (!silent) toast("No changes detected to save.");
      return;
    }

    const payload: { subClassId: number; academicYearId?: number; slots: any[]; } = {
      subClassId: Number(subClassId),
      slots: changedSlotsPayload,
    };
    if (selectedAcademicYearId) {
      payload.academicYearId = Number(selectedAcademicYearId);
    }

    console.log("Saving changed timetable slots:", payload);
    if (!silent) setIsLoadingTimetable(true);
    setError(null);
    const token = getAuthToken();
    if (!token) {
      toast.error("Authentication token not found.");
      if (!silent) setIsLoadingTimetable(false);
      throw new Error("Authentication token not found.");
    }

    try {
      const response = await fetch(`${API_BASE_URL}/timetables/bulk-update`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        if (result.errors && Array.isArray(result.errors) && result.errors.length > 0) {
          const errorMessages = result.errors.map((e: any) =>
            `Period ID: ${e.periodId} - ${e.error}`
          ).join('; ');
          console.error("Detailed save errors (partial success):", result.errors);
          throw new Error(`Save failed: ${result.message || 'Some errors occurred'}. Details: ${errorMessages}`);
        } else {
          throw new Error(result.error || result.message || 'Failed to save timetable (Unknown error structure)');
        }
      }

      console.log(`Timetable save summary: Updated ${result.data?.updated || 0}, Created ${result.data?.created || 0}, Deleted ${result.data?.deleted || 0}`);

      if (silent) {
        // Move the baseline forward to exactly what we just sent, so the
        // next diff is empty and the same slot isn't posted twice. Uses
        // the snapshot the payload was built from, not the live state —
        // an edit made mid-request must stay dirty.
        setOriginalTimetables(prev => ({
          ...prev,
          [subClassId]: JSON.parse(JSON.stringify(currentTimetable)),
        }));
      } else {
        toast.success(result.message || 'Timetable saved successfully!');
        // Refetch the full school timetable to ensure UI is synchronized with server
        await fetchFullSchoolTimetable();
      }

    } catch (err: any) {
      const message = err instanceof Error ? err.message : 'An unknown error occurred';
      console.error("Failed to save timetable:", err);
      setError(message);
      if (!silent) toast.error(`Save failed: ${message}`);
      throw err;
    } finally {
      if (!silent) setIsLoadingTimetable(false);
    }
  }, [timetables, originalTimetables, allWeeklySlots, selectedAcademicYearId, fetchFullSchoolTimetable]);

  // The explicit Save button — unchanged behaviour, and still useful as a
  // manual retry when an auto-save failed.
  const saveChanges = useCallback(async (subClassId: string) => {
    try {
      await persistSubClass(subClassId);
    } catch {
      // persistSubClass already reported it.
    }
  }, [persistSubClass]);

  // Flushes dirty subclasses after the debounce settles.
  //
  // persistSubClass's identity changes on every edit (it closes over
  // `timetables`), so this effect re-runs and restarts the timer — which
  // is exactly the debounce we want. Once the save clears the set, the
  // re-run from the baseline update finds nothing to do and returns.
  useEffect(() => {
    if (dirtySubClassIds.current.size === 0) return;

    const handle = setTimeout(async () => {
      const ids = Array.from(dirtySubClassIds.current);
      dirtySubClassIds.current.clear();
      setAutoSaveStatus('saving');
      try {
        for (const id of ids) {
          await persistSubClass(id, { silent: true });
        }
        setAutoSaveStatus('saved');
      } catch (err) {
        // Put them back so a retry (or the next edit) picks them up, and
        // never silently drop a change the user believes is saved.
        ids.forEach(id => dirtySubClassIds.current.add(id));
        setAutoSaveStatus('error');
        const message = err instanceof Error ? err.message : 'Unknown error';
        toast.error(`Auto-save failed: ${message}`);
      }
    }, AUTO_SAVE_DELAY_MS);

    return () => clearTimeout(handle);
  }, [dirtyTick, persistSubClass]);

  // Manual retry after a failed auto-save.
  const retryAutoSave = useCallback(() => {
    if (dirtySubClassIds.current.size === 0) return;
    setDirtyTick(tick => tick + 1);
  }, []);

  // Function to get teachers who can teach a specific subject
  const getTeachersBySubject = useCallback((subjectId: string): Teacher[] => {
    return teachers.filter(teacher => teacher.subjects.includes(subjectId));
  }, [teachers]);

  // Function to check if a teacher is assigned elsewhere during a specific time slot
  const isTeacherAssignedElsewhere = useCallback((
    teacherId: string,
    day: string,
    period: string,
    excludeSubClassId: string
  ): string | null => {
    for (const subClassId in timetables) {
      if (subClassId === excludeSubClassId) continue;

      const classTimetable = timetables[subClassId];
      const conflict = classTimetable.slots.some(
        slot =>
          slot.day === day &&
          slot.period === period &&
          slot.assignments.some(a => a.teacherId === teacherId)
      );

      if (conflict) {
        const conflictClass = subClasses.find(c => c.id === subClassId);
        return conflictClass ? conflictClass.name : subClassId;
      }
    }

    return null;
  }, [timetables, subClasses]);

  return (
    <TimetableContext.Provider value={{
      classes,
      subClasses,
      subjects,
      teachers,
      allWeeklySlots,
      uniquePeriodNames,
      daysOfWeek,
      timetables,
      originalTimetables,
      isLoading,
      isLoadingTimetable,
      fetchTimetableForSubclass,
      fetchFullSchoolTimetable,
      updateSlotAssignment,
      addSlotAssignment,
      removeSlotAssignment,
      saveChanges,
      autoSaveStatus,
      retryAutoSave,
      getTeachersBySubject,
      isTeacherAssignedElsewhere,
      error,
      academicYears,
      selectedAcademicYearId,
      setSelectedAcademicYearId,
    }}>
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
