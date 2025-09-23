"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
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

interface TimetableSlot {
  day: string;
  period: string;
  subjectId?: string | null; // Allow null for clearing
  teacherId?: string | null; // Allow null for clearing
  isBreak?: boolean;
  isAssembly?: boolean;
  // Add derived fields for easier display (optional)
  subjectName?: string | null;
  teacherName?: string | null;
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
  allWeeklySlots: PeriodInfo[]; // Renamed from periods
  uniquePeriodNames: string[]; // Added
  daysOfWeek: string[]; // Added
  timetables: TimetablesState;
  isLoading: boolean;
  isLoadingTimetable: boolean; // Added loading state for specific timetable fetch
  fetchTimetableForSubclass: (subClassId: string) => Promise<void>; // Added function signature
  fetchFullSchoolTimetable: () => Promise<void>; // Added
  updateTimetableSlot: (
    subClassId: string,
    day: string,
    period: string,
    subjectId: string | null, // Allow null
    teacherId: string | null  // Allow null
  ) => void;
  saveChanges: (subClassId: string) => Promise<void>; // Pass subClassId
  getTeachersBySubject: (subjectId: string) => Teacher[];
  isTeacherAssignedElsewhere: (
    teacherId: string,
    day: string,
    period: string,
    excludeSubClassId: string // Changed from excludeClassId
  ) => string | null;
  error: string | null; // Added error state type
  academicYears: AcademicYear[]; // Added
  selectedAcademicYearId: string | null; // Added
  setSelectedAcademicYearId: (id: string | null) => void; // Added
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

// Base URL and Auth Token retrieval (assuming similar setup as other pages)
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://192.168.1.103:4000/api/v1';
const getAuthToken = () => localStorage.getItem('token');

// Create empty timetable structure - Less critical now, structure derived from allWeeklySlots
const createInitialTimetableStructure = (subClassId: string, weeklySlots: PeriodInfo[]): Timetable => {
  const slots: TimetableSlot[] = weeklySlots.map(ws => ({
    day: ws.dayOfWeek || '', // Assuming dayOfWeek field from example
    period: ws.name,
    subjectId: undefined,
    teacherId: undefined,
    isBreak: ws.isBreak,
  }));
  return {
    classId: subClassId,
    slots
  };
};

// Initialize mock timetables - may need revision or removal
// This is now only used as a fallback on API error
const initializeMockTimetables = (): TimetablesState => {
  const timetables: TimetablesState = {};
  // Use MOCK_CLASSES as fallback keys if needed
  MOCK_CLASSES.forEach(cls => {
    // Needs mock periods if createEmptyTimetable relies on it
    // If API fails, periods state will be empty, so pass empty array
    timetables[cls.id] = createInitialTimetableStructure(cls.id, []);
  });
  return timetables;
};

// Create context
const TimetableContext = createContext<TimetableContextType | undefined>(undefined);

// Provider component
export const TimetableProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { selectedAcademicYear: authSelectedAcademicYear } = useAuth(); // Get from AuthContext
  const [classes, setClasses] = useState<Class[]>([]);
  const [subClasses, setSubClasses] = useState<SubClass[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [allWeeklySlots, setAllWeeklySlots] = useState<PeriodInfo[]>([]); // Renamed state
  const [uniquePeriodNames, setUniquePeriodNames] = useState<string[]>([]); // Added state
  const [daysOfWeek, setDaysOfWeek] = useState<string[]>([]); // Added state
  const [timetables, setTimetables] = useState<TimetablesState>({});
  const [originalTimetables, setOriginalTimetables] = useState<TimetablesState>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingTimetable, setIsLoadingTimetable] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]); // Added
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState<string | null>(null); // Added

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
        setTeachers(MOCK_TEACHERS); // Fallback
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
          fetch(`${API_BASE_URL}/academic-years`, { method: 'GET', headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' } }), // Fetch academic years
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
          checkResponse(academicYearResponse, 'academic years'), // Process academic years
        ]);

        console.log("Classes API response:", classResult);
        const fetchedClasses: Class[] = classResult.data?.map((cls: any) => ({
          id: String(cls.id),
          name: cls.name,
          level: cls.level
        })) || [];
        setClasses(fetchedClasses);

        console.log("SubClasses API response:", subClassResult);
        let fetchedSubClasses: SubClass[] = subClassResult.data?.map((sc: any) => ({
          id: String(sc.id),
          name: sc.name,
          classId: String(sc.class?.id),
          className: sc.class?.name,
          level: fetchedClasses.find(c => c.id === String(sc.class?.id))?.level
        })) || [];

        // Sort subclasses by level, then by name
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
          // Fix Linter Error: Add type to slot
          const slotA = fetchedWeeklySlots.find((slot: PeriodInfo) => slot.name === nameA);
          // Fix Linter Error: Add type to slot
          const slotB = fetchedWeeklySlots.find((slot: PeriodInfo) => slot.name === nameB);

          const timeA = slotA?.startTime;
          const timeB = slotB?.startTime;

          // Diagnostic Log for Sorting
          console.log(`SORTING: Comparing "${nameA}" (Time: ${timeA || 'N/A'}) vs "${nameB}" (Time: ${timeB || 'N/A'})`);

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

        // If authSelectedAcademicYear is available and fetched academic years include it, set it as selected
        if (authSelectedAcademicYear && fetchedAcademicYears.some((ay: any) => ay.id === String(authSelectedAcademicYear.id))) {
          setSelectedAcademicYearId(String(authSelectedAcademicYear.id));
        } else if (fetchedAcademicYears.length > 0) {
          // Otherwise, select the first available academic year
          setSelectedAcademicYearId(fetchedAcademicYears[0].id);
        }

        // Don't initialize timetables here, wait for specific fetch
        setTimetables({});
        setOriginalTimetables({}); // Initialize original state too

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
        setOriginalTimetables({}); // Clear original state on error too
        setAcademicYears([]);
        setSelectedAcademicYearId(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialData();
  }, [authSelectedAcademicYear]); // Add authSelectedAcademicYear to dependency array

  // Function to fetch assigned slots for a specific subclass
  const fetchTimetableForSubclass = useCallback(async (subClassId: string) => {
    if (!subClassId || !selectedAcademicYearId) return; // Ensure academic year is selected
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
      const baseStructure = createInitialTimetableStructure(subClassId, allWeeklySlots); // Use allWeeklySlots

      // Set base structure immediately to render grid
      setTimetables(prev => ({ ...prev, [subClassId]: baseStructure }));
      setOriginalTimetables(prev => ({ ...prev, [subClassId]: { ...baseStructure } })); // Also set original

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
      // Match based on day and periodId from the API assignment
      const mergedSlots = baseStructure.slots.map(baseSlot => {
        // Find the weekly slot definition matching baseSlot day/period name
        const weeklySlotDef = allWeeklySlots.find(ws =>
          ws.dayOfWeek === baseSlot.day && ws.name === baseSlot.period
        );
        if (!weeklySlotDef) return baseSlot; // Should not happen if baseStructure is correct

        // Find the assignment from API data that matches the weekly slot ID
        const assignment = assignedApiSlots.find(
          (apiSlot) => String(apiSlot.periodId) === String(weeklySlotDef.id) // Match API periodId to weekly slot ID
        );

        if (assignment) {
          const subject = subjects.find(s => String(s.id) === String(assignment.subjectId));
          const teacher = teachers.find(t => String(t.id) === String(assignment.teacherId));
          return {
            ...baseSlot,
            subjectId: assignment.subjectId ? String(assignment.subjectId) : null,
            teacherId: assignment.teacherId ? String(assignment.teacherId) : null,
            subjectName: subject?.name || null,
            teacherName: teacher?.name || null,
          };
        } else {
          return { ...baseSlot }; // Keep base slot if no assignment found
        }
      });

      // 4. Update the state
      const newTimetableState = { ...baseStructure, slots: mergedSlots };
      setTimetables(prev => ({ ...prev, [subClassId]: newTimetableState }));
      setOriginalTimetables(prev => ({ ...prev, [subClassId]: { ...newTimetableState } }));

    } catch (err: any) {
      const message = err instanceof Error ? err.message : 'An unknown error occurred';
      console.error(`Failed to fetch timetable for ${subClassId}:`, err);
      setError(message);
      toast.error(`Error loading timetable: ${message}`);
      // Optionally clear the timetable for this subclass on error
      // setTimetables(prev => ({ ...prev, [subClassId]: createEmptyTimetable(subClassId, periods) })); 
    } finally {
      setIsLoadingTimetable(false);
    }
  }, [allWeeklySlots, subjects, teachers, selectedAcademicYearId, setIsLoadingTimetable, setError, setTimetables, setOriginalTimetables]);

  // New function to fetch the full school timetable
  const fetchFullSchoolTimetable = useCallback(async () => {
    if (!selectedAcademicYearId) return; // Ensure academic year is selected
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

      // Group slots by subClassId to fit the TimetablesState structure
      fullTimetableSlots.forEach(apiSlot => {
        const subClassId = String(apiSlot.subClassId);
        if (!newTimetablesState[subClassId]) {
          // Initialize the base structure using allWeeklySlots for consistency
          newTimetablesState[subClassId] = createInitialTimetableStructure(subClassId, allWeeklySlots);
          newTimetablesState[subClassId].classId = String(apiSlot.classId); // Ensure classId is set
        }

        const targetSlotIndex = newTimetablesState[subClassId].slots.findIndex(baseSlot =>
          baseSlot.day === apiSlot.day && baseSlot.period === apiSlot.periodName
        );

        if (targetSlotIndex !== -1) {
          const subject = subjects.find(s => String(s.id) === String(apiSlot.subjectId));
          const teacher = teachers.find(t => String(t.id) === String(apiSlot.teacherId));
          newTimetablesState[subClassId].slots[targetSlotIndex] = {
            ...newTimetablesState[subClassId].slots[targetSlotIndex],
            subjectId: apiSlot.subjectId ? String(apiSlot.subjectId) : null,
            teacherId: apiSlot.teacherId ? String(apiSlot.teacherId) : null,
            subjectName: subject?.name || null,
            teacherName: teacher?.name || null,
          };
        }
      });

      setTimetables(newTimetablesState);
      setOriginalTimetables(newTimetablesState);

    } catch (err: any) {
      const message = err instanceof Error ? err.message : 'An unknown error occurred';
      console.error("Failed to fetch full school timetable:", err);
      setError(message);
      toast.error(`Error loading school timetable: ${message}`);
    } finally {
      setIsLoadingTimetable(false);
    }
  }, [allWeeklySlots, subjects, teachers, selectedAcademicYearId, setIsLoadingTimetable, setError, setTimetables, setOriginalTimetables]);

  // Function to update a single timetable slot locally
  const updateTimetableSlot = useCallback((
    subClassId: string,
    day: string,
    period: string,
    subjectId: string | null,
    teacherId: string | null
  ) => {
    setTimetables(prev => {
      const classTimetable = prev[subClassId];
      if (!classTimetable) return prev;

      // Find names for display
      const subjectName = subjects.find(s => String(s.id) === subjectId)?.name || null;
      const teacherName = teachers.find(t => String(t.id) === teacherId)?.name || null;

      const updatedSlots = classTimetable.slots.map(slot => {
        if (slot.day === day && slot.period === period) {
          return {
            ...slot,
            subjectId,
            teacherId,
            subjectName, // Update derived name
            teacherName, // Update derived name
          };
        }
        return slot;
      });

      return {
        ...prev,
        [subClassId]: {
          ...classTimetable,
          slots: updatedSlots,
        },
      };
    });
  }, [setTimetables, subjects, teachers]);

  // Function to save changes for a specific subclass to the backend
  const saveChanges = useCallback(async (subClassId: string) => {
    const currentTimetable = timetables[subClassId];
    const originalTimetable = originalTimetables[subClassId]; // Get original state

    if (!currentTimetable) {
      toast.error("No timetable data loaded for this subclass to save.");
      return;
    }
    if (!originalTimetable) {
      console.error("Original timetable state missing for comparison.");
      toast.error("Cannot determine changes to save.");
      return;
    }

    const currentSlots = currentTimetable.slots;
    const originalSlots = originalTimetable.slots;

    // Find changed slots (excluding breaks)
    const changedSlotsPayload = currentSlots
      .filter(currentSlot => {
        const periodInfo = allWeeklySlots.find(p => p.name === currentSlot.period);
        if (periodInfo?.isBreak) return false;

        const originalSlot = originalSlots.find(origSlot =>
          origSlot.day === currentSlot.day && origSlot.period === currentSlot.period
        );

        return !originalSlot ||
          currentSlot.subjectId !== originalSlot.subjectId ||
          currentSlot.teacherId !== originalSlot.teacherId;
      })
      .map(slot => {
        // ** CRUCIAL MAPPING **
        // Find the specific weekly slot ID from allWeeklySlots based on day and period name
        const weeklySlot = allWeeklySlots.find(ws => ws.dayOfWeek === slot.day && ws.name === slot.period);
        const specificPeriodId = weeklySlot ? weeklySlot.id : null; // Get the unique ID for this day/period combo

        // DIAGNOSTIC LOG:
        console.log(`SAVE MAPPING: Day=${slot.day}, PeriodName=${slot.period}, FoundPeriodID=${specificPeriodId}, Slot=`, slot);

        return {
          periodId: specificPeriodId ? Number(specificPeriodId) : null,
          subjectId: slot.subjectId ? Number(slot.subjectId) : null,
          teacherId: slot.teacherId ? Number(slot.teacherId) : null,
        }
      })
      .filter(slot => slot.periodId !== null); // Filter out slots where period ID mapping failed

    if (changedSlotsPayload.length === 0) {
      toast("No changes detected to save.");
      return;
    }

    // Check if any slots failed the periodId lookup after filtering non-changes
    const slotsWithMappingErrors = changedSlotsPayload.filter(slot => slot.periodId === null);
    if (slotsWithMappingErrors.length > 0) {
      console.error("Could not find period ID for one or more changed slots", slotsWithMappingErrors);
      toast.error("Internal error: Could not map period names to IDs for saving.");
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
    setIsLoadingTimetable(true);
    setError(null);
    const token = getAuthToken();
    if (!token) {
      toast.error("Authentication token not found.");
      setIsLoadingTimetable(false);
      return;
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
        // Handle detailed errors from partial success (HTTP 207)
        if (result.errors && Array.isArray(result.errors) && result.errors.length > 0) {
          const errorMessages = result.errors.map((e: any) =>
            `Period ID: ${e.periodId} - ${e.error}`
          ).join('; ');
          console.error("Detailed save errors (partial success):", result.errors);
          throw new Error(`Save failed: ${result.message || 'Some errors occurred'}. Details: ${errorMessages}`);
        }
        // Handle other standard errors (400, 401, 403, 404, 409, 500, 503)
        // The 'error' property will contain the specific conflict message for 409.
        else {
          throw new Error(result.error || result.message || 'Failed to save timetable (Unknown error structure)');
        }
      }

      toast.success(result.message || 'Timetable saved successfully!');

      // Log successful counts for debugging/confirmation
      console.log(`Timetable save summary: Updated ${result.data?.updated || 0}, Created ${result.data?.created || 0}, Deleted ${result.data?.deleted || 0}`);

      // IMPORTANT: Update original state on successful save
      setOriginalTimetables(prev => ({
        ...prev,
        [subClassId]: { ...currentTimetable } // Set original to current working copy
      }));

    } catch (err: any) {
      const message = err instanceof Error ? err.message : 'An unknown error occurred';
      console.error("Failed to save timetable:", err);
      setError(message);
      toast.error(`Save failed: ${message}`);
    } finally {
      setIsLoadingTimetable(false);
    }
  }, [timetables, originalTimetables, allWeeklySlots, selectedAcademicYearId, setIsLoadingTimetable, setError, setOriginalTimetables]);

  // Function to get teachers who can teach a specific subject - WRAP IN useCallback
  const getTeachersBySubject = useCallback((subjectId: string): Teacher[] => {
    return teachers.filter(teacher => teacher.subjects.includes(subjectId));
  }, [teachers]);

  // Function to check if a teacher is assigned elsewhere during a specific time slot - WRAP IN useCallback
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
          slot.teacherId === teacherId
      );

      if (conflict) {
        const conflictClass = subClasses.find(c => c.id === subClassId);
        return conflictClass ? conflictClass.name : subClassId;
      }
    }

    return null;
  }, [timetables, subClasses]);

  const value = {
    classes,
    subClasses,
    subjects,
    teachers,
    allWeeklySlots, // Pass new state
    uniquePeriodNames, // Pass new state
    daysOfWeek, // Pass new state
    timetables,
    isLoading,
    isLoadingTimetable,
    fetchTimetableForSubclass,
    fetchFullSchoolTimetable, // Added
    updateTimetableSlot,
    saveChanges,
    getTeachersBySubject,
    isTeacherAssignedElsewhere,
    error,
    academicYears, // Added
    selectedAcademicYearId, // Added
    setSelectedAcademicYearId, // Added
  };

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
      isLoading,
      isLoadingTimetable,
      fetchTimetableForSubclass,
      fetchFullSchoolTimetable, // Ensure this is included in the returned object
      updateTimetableSlot,
      saveChanges,
      getTeachersBySubject,
      isTeacherAssignedElsewhere,
      error,
      academicYears, // Added
      selectedAcademicYearId, // Added
      setSelectedAcademicYearId, // Added
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