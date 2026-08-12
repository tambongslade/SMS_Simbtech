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
  periodSetId?: string | null;
}

// Added SubClass type
interface SubClass {
  id: string;
  name: string;
  classId: string; // ID of the parent class
  className?: string; // Optional name of parent class
  level?: number; // Add level to subclass for sorting
}

/**
 * A row of the grid. Periods belong to a bell schedule (period set), not to
 * the school as a whole — the first cycle (F1–F4) and the second cycle
 * (F5/LS/US) break at different times, so the same `sequence` sits at
 * different clock times depending on the class.
 */
export type PeriodType = 'TEACHING' | 'BREAK' | 'PREP';

export interface PeriodDefinition {
  id: string;
  name: string;
  dayOfWeek: string;
  startTime: string; // "HH:MM:SS"
  endTime: string;
  sequence: number;  // 1..N for the day, within its set
  type: PeriodType;
  isBreak: boolean;  // legacy mirror of type === 'BREAK'
  periodSetId: string | null;
}

/** The bell schedule a class follows. */
export interface PeriodSetInfo {
  id: string;
  code: string;
  name: string;
}

// A single subject+teacher assignment within a slot
export interface SlotAssignment {
  subjectId: string | null;
  teacherId: string | null;
  subjectName: string | null;
  teacherName: string | null;
}

export interface TimetableSlot {
  day: string;
  periodId: string;
  periodName: string;
  sequence: number;
  type: PeriodType;
  startTime: string;
  endTime: string;
  assignments: SlotAssignment[];
}

export interface Timetable {
  subClassId: string;
  classId: string | null;
  /// null means the class has no bell schedule attached yet — nothing can be
  /// scheduled for it until one is assigned.
  periodSet: PeriodSetInfo | null;
  periods: PeriodDefinition[];
  slots: TimetableSlot[];
}

interface TimetablesState {
  [subClassId: string]: Timetable;
}

interface AcademicYear {
  id: string;
  name: string;
}

/**
 * A teacher double-booking reported by the API. The slot IS saved — the
 * backend records the clash and lets the scheduler resolve it rather than
 * blocking the edit. Clashes are detected by time overlap, so a teacher
 * booked across the two cycles is caught even though the period ids and
 * sequence numbers differ.
 */
export interface ClashWarning {
  periodId: number;
  type: 'TEACHER_CLASH' | string;
  message: string;
  clashWith?: {
    subClassId: number;
    subClassName: string;
    day: string;
    periodName: string;
    periodStartTime?: string;
    periodEndTime?: string;
    periodSetCode?: string;
  };
}

interface TimetableContextType {
  classes: Class[];
  subClasses: SubClass[];
  subjects: Subject[];
  teachers: Teacher[];
  /// Every bell schedule defined for the selected academic year.
  periodSets: PeriodSetInfo[];
  daysOfWeek: string[];
  timetables: TimetablesState;
  originalTimetables: TimetablesState;
  isLoading: boolean;
  isLoadingTimetable: boolean;
  fetchTimetableForSubclass: (subClassId: string) => Promise<void>;
  fetchFullSchoolTimetable: () => Promise<void>;
  /// Attaches a bell schedule to a class (or detaches it with null).
  assignPeriodSetToClass: (classId: string, periodSetId: string | null) => Promise<void>;
  updateSlotAssignment: (
    subClassId: string,
    periodId: string,
    assignmentIndex: number,
    subjectId: string | null,
    teacherId: string | null
  ) => void;
  addSlotAssignment: (
    subClassId: string,
    periodId: string,
    subjectId: string | null,
    teacherId: string | null
  ) => void;
  removeSlotAssignment: (
    subClassId: string,
    periodId: string,
    assignmentIndex: number
  ) => void;
  saveChanges: (subClassId: string) => Promise<void>;
  /// Auto-save state for the whole timetable editor. Assignments persist
  /// on selection; this is what the UI reports instead of a Save button.
  autoSaveStatus: 'idle' | 'saving' | 'saved' | 'error';
  retryAutoSave: () => void;
  getTeachersBySubject: (subjectId: string) => Teacher[];
  /// Cross-cycle safe: compares wall-clock times, not period ids, so a
  /// teacher taking Form 2 and Upper Sixth at overlapping times is flagged.
  isTeacherAssignedElsewhere: (
    teacherId: string,
    day: string,
    startTime: string,
    endTime: string,
    excludeSubClassId: string
  ) => string | null;
  /// Teacher clashes reported by the last save, keyed by subclass id.
  clashWarnings: Record<string, ClashWarning[]>;
  getClashWarning: (subClassId: string, periodId?: number | string | null) => ClashWarning | null;
  error: string | null;
  academicYears: AcademicYear[];
  selectedAcademicYearId: string | null;
  setSelectedAcademicYearId: (id: string | null) => void;
}

export const DAYS_ORDER = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];

// Base URL and Auth Token retrieval (assuming similar setup as other pages)
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://192.168.1.103:4000/api/v1';
const getAuthToken = () => localStorage.getItem('token');

// ── Period helpers ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const normalizePeriod = (p: any): PeriodDefinition => {
  const rawType = p?.type;
  const type: PeriodType =
    rawType === 'BREAK' || rawType === 'PREP' || rawType === 'TEACHING'
      ? rawType
      : p?.isBreak
        ? 'BREAK'
        : 'TEACHING';

  return {
    id: String(p.id),
    name: p.name ?? '',
    dayOfWeek: p.dayOfWeek ?? '',
    startTime: p.startTime ?? '',
    endTime: p.endTime ?? '',
    sequence: Number(p.sequence ?? 0),
    type,
    isBreak: p.isBreak ?? type === 'BREAK',
    periodSetId: p.periodSetId != null ? String(p.periodSetId) : null,
  };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const normalizePeriodSet = (ps: any): PeriodSetInfo | null =>
  ps ? { id: String(ps.id), code: ps.code ?? '', name: ps.name ?? ps.code ?? '' } : null;

/// Only TEACHING periods take assignments — breaks and preps are labels.
export const isAssignablePeriod = (type: PeriodType) => type === 'TEACHING';

/// "HH:MM" or "HH:MM:SS" → minutes since midnight. Returns null for junk so
/// callers can decide what an unknown time means rather than treating it as 0.
export const timeToMinutes = (time?: string | null): number | null => {
  if (!time) return null;
  const parts = time.split(':');
  const hours = Number(parts[0]);
  const minutes = Number(parts[1] ?? 0);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  return hours * 60 + minutes;
};

/// Half-open interval overlap — [start, end). Matches the backend's clash rule,
/// so back-to-back periods (…10:30 / 10:30…) never count as a clash.
export const periodsOverlap = (
  aStart?: string | null,
  aEnd?: string | null,
  bStart?: string | null,
  bEnd?: string | null,
): boolean => {
  const a1 = timeToMinutes(aStart);
  const a2 = timeToMinutes(aEnd);
  const b1 = timeToMinutes(bStart);
  const b2 = timeToMinutes(bEnd);
  if (a1 === null || a2 === null || b1 === null || b2 === null) return false;
  return a1 < b2 && b1 < a2;
};

export const formatTimeRange = (start?: string | null, end?: string | null): string =>
  `${start?.substring(0, 5) || ''} - ${end?.substring(0, 5) || ''}`;

/// Rows of a grid: one entry per `sequence` in the set, with the periods for
/// each day keyed by day name. Every day of a set has the same shape, but this
/// tolerates a day that doesn't.
export interface PeriodRow {
  sequence: number;
  label: PeriodDefinition; // representative period, for name/time/type
  byDay: Record<string, PeriodDefinition | undefined>;
}

export const buildPeriodRows = (periods: PeriodDefinition[]): PeriodRow[] => {
  const bySequence = new Map<number, PeriodRow>();

  [...periods]
    .sort((a, b) => a.sequence - b.sequence || a.startTime.localeCompare(b.startTime))
    .forEach(period => {
      let row = bySequence.get(period.sequence);
      if (!row) {
        row = { sequence: period.sequence, label: period, byDay: {} };
        bySequence.set(period.sequence, row);
      }
      row.byDay[period.dayOfWeek] = period;
      // Prefer Monday as the label so times read consistently.
      if (period.dayOfWeek === 'MONDAY') row.label = period;
    });

  return Array.from(bySequence.values()).sort((a, b) => a.sequence - b.sequence);
};

// Build the empty grid for a subclass from its own bell schedule.
const buildSlots = (periods: PeriodDefinition[]): TimetableSlot[] =>
  periods.map(period => ({
    day: period.dayOfWeek,
    periodId: period.id,
    periodName: period.name,
    sequence: period.sequence,
    type: period.type,
    startTime: period.startTime,
    endTime: period.endTime,
    assignments: [],
  }));

// Deep clone a timetables state (needed because assignments are nested arrays)
const deepCloneTimetablesState = (state: TimetablesState): TimetablesState => {
  const clone: TimetablesState = {};
  for (const key in state) {
    clone[key] = {
      ...state[key],
      periods: state[key].periods.map(p => ({ ...p })),
      slots: state[key].slots.map(slot => ({
        ...slot,
        assignments: slot.assignments.map(a => ({ ...a })),
      })),
    };
  }
  return clone;
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
  const [clashWarnings, setClashWarnings] = useState<Record<string, ClashWarning[]>>({});
  const [periodSets, setPeriodSets] = useState<PeriodSetInfo[]>([]);
  const [daysOfWeek, setDaysOfWeek] = useState<string[]>(DAYS_ORDER);
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

  // Fetch initial data (Classes, SubClasses, Subjects, Teachers, Academic Years).
  //
  // Periods are deliberately NOT fetched here: they belong to a bell schedule,
  // and each subclass's grid rows arrive with its own timetable response.
  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoading(true);
      setError(null);
      const token = getAuthToken();
      if (!token) {
        toast.error("Authentication token not found.");
        setIsLoading(false);
        return;
      }

      try {
        const [classResponse, subClassResponse, subjectResponse, teacherResponse, academicYearResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/classes`, { method: 'GET', headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' } }),
          fetch(`${API_BASE_URL}/classes/sub-classes?limit=40`, { method: 'GET', headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' } }),
          fetch(`${API_BASE_URL}/subjects`, { method: 'GET', headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' } }),
          fetch(`${API_BASE_URL}/users/teachers`, { method: 'GET', headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' } }),
          fetch(`${API_BASE_URL}/academic-years`, { method: 'GET', headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' } }),
        ].map(p => p.catch(e => e)));

        const checkResponse = async (response: Response | Error, entity: string) => {
          if (response instanceof Error) {
            throw new Error(`Network error fetching ${entity}: ${response.message}`);
          }
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: response.statusText }));
            throw new Error(errorData.message || `Failed to fetch ${entity} (${response.status})`);
          }
          return response.json();
        };

        const [classResult, subClassResult, subjectResult, teacherResult, academicYearResult] = await Promise.all([
          checkResponse(classResponse, 'classes'),
          checkResponse(subClassResponse, 'subClasses'),
          checkResponse(subjectResponse, 'subjects'),
          checkResponse(teacherResponse, 'teachers'),
          checkResponse(academicYearResponse, 'academic years'),
        ]);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const fetchedClasses: Class[] = classResult.data?.map((cls: any) => ({
          id: String(cls.id),
          name: cls.name,
          level: cls.level,
          periodSetId: cls.periodSetId != null ? String(cls.periodSetId) : null,
        })) || [];
        setClasses(sortClassesByLevel(fetchedClasses));

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const fetchedSubClasses: SubClass[] = subClassResult.data?.map((sc: any) => ({
          id: String(sc.id),
          name: sc.name,
          classId: String(sc.class?.id ?? sc.classId),
          className: sc.class?.name,
          level: fetchedClasses.find(c => c.id === String(sc.class?.id ?? sc.classId))?.level
        })) || [];

        fetchedSubClasses.sort((a, b) => {
          if (a.level === b.level) {
            return a.name.localeCompare(b.name);
          }
          return (a.level || 0) - (b.level || 0);
        });

        setSubClasses(fetchedSubClasses);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const fetchedSubjects = subjectResult.data?.map((sub: any) => ({ id: String(sub.id), name: sub.name })) || [];
        setSubjects(fetchedSubjects);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const fetchedTeachers = teacherResult.data?.map((t: any) => ({ id: String(t.id), name: t.name, subjects: t.subjects?.map((s: any) => String(s.id)) || [] })) || [];
        setTeachers(fetchedTeachers);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const fetchedAcademicYears = academicYearResult.data?.map((ay: any) => ({ id: String(ay.id), name: ay.name })) || [];
        setAcademicYears(fetchedAcademicYears);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (authSelectedAcademicYear && fetchedAcademicYears.some((ay: any) => ay.id === String(authSelectedAcademicYear.id))) {
          setSelectedAcademicYearId(String(authSelectedAcademicYear.id));
        } else if (fetchedAcademicYears.length > 0) {
          setSelectedAcademicYearId(fetchedAcademicYears[0].id);
        }

        setTimetables({});
        setOriginalTimetables({});

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        const message = err instanceof Error ? err.message : 'An unknown error occurred';
        console.error("Failed to fetch initial timetable data:", err);
        setError(message);
        toast.error(`Error loading initial data: ${message}`);
        setClasses([]);
        setSubClasses([]);
        setSubjects([]);
        setTeachers([]);
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

  // The bell schedules available for the selected year — needed to offer a
  // choice when a class has none attached.
  useEffect(() => {
    if (!selectedAcademicYearId) return;
    const token = getAuthToken();
    if (!token) return;

    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/periods/period-sets?academicYearId=${selectedAcademicYearId}`,
          { method: 'GET', headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' } },
        );
        if (!response.ok) return; // Optional data — the grids don't depend on it.
        const result = await response.json();
        if (cancelled) return;
        setPeriodSets(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (result.data || []).map((ps: any) => normalizePeriodSet(ps)).filter(Boolean) as PeriodSetInfo[],
        );
      } catch (err) {
        console.warn('Could not load period sets:', err);
      }
    })();

    return () => { cancelled = true; };
  }, [selectedAcademicYearId]);

  const buildTimetableFromApi = useCallback((
    subClassId: string,
    classId: string | null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    periodSet: any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    apiPeriods: any[],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    apiSlots: any[],
  ): Timetable => {
    const periods = (apiPeriods || []).map(normalizePeriod);
    const slots = buildSlots(periods);
    const slotByPeriodId = new Map(slots.map(slot => [slot.periodId, slot]));

    (apiSlots || []).forEach(apiSlot => {
      const slot = slotByPeriodId.get(String(apiSlot.periodId));
      if (!slot) {
        console.warn(`Slot references period ${apiSlot.periodId}, which is not in this class's bell schedule.`);
        return;
      }
      const subject = subjects.find(s => s.id === String(apiSlot.subjectId));
      const teacher = teachers.find(t => t.id === String(apiSlot.teacherId));
      slot.assignments.push({
        subjectId: apiSlot.subjectId != null ? String(apiSlot.subjectId) : null,
        teacherId: apiSlot.teacherId != null ? String(apiSlot.teacherId) : null,
        subjectName: apiSlot.subjectName ?? subject?.name ?? null,
        teacherName: apiSlot.teacherName ?? teacher?.name ?? null,
      });
    });

    return {
      subClassId,
      classId,
      periodSet: normalizePeriodSet(periodSet),
      periods,
      slots,
    };
  }, [subjects, teachers]);

  // Function to fetch one subclass's bell schedule and assigned slots
  const fetchTimetableForSubclass = useCallback(async (subClassId: string) => {
    if (!subClassId || !selectedAcademicYearId) return;
    setIsLoadingTimetable(true);
    setError(null);
    const token = getAuthToken();
    if (!token) {
      toast.error("Authentication token not found.");
      setIsLoadingTimetable(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/timetables/subclass/${subClassId}?academicYearId=${selectedAcademicYearId}`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(errorData.message || `Failed to fetch timetable for ${subClassId}`);
      }

      const result = await response.json();
      const classId = result.data?.class?.id != null ? String(result.data.class.id) : null;
      const timetable = buildTimetableFromApi(
        subClassId,
        classId,
        result.periodSet ?? result.data?.periodSet,
        result.periods ?? result.data?.periods ?? [],
        result.slots ?? result.data?.slots ?? [],
      );

      setTimetables(prev => ({ ...prev, [subClassId]: timetable }));
      setOriginalTimetables(prev => ({ ...prev, [subClassId]: deepCloneTimetablesState({ [subClassId]: timetable })[subClassId] }));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      const message = err instanceof Error ? err.message : 'An unknown error occurred';
      console.error(`Failed to fetch timetable for ${subClassId}:`, err);
      setError(message);
      toast.error(`Error loading timetable: ${message}`);
    } finally {
      setIsLoadingTimetable(false);
    }
  }, [selectedAcademicYearId, buildTimetableFromApi]);

  // The whole school. Each subclass block carries its own periods, because the
  // two cycles don't share a column set.
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const blocks: any[] = result.data?.subclasses || [];

      const newTimetablesState: TimetablesState = {};
      const daysSeen = new Set<string>();

      blocks.forEach(block => {
        const subClassId = String(block.subClass?.id);
        if (!subClassId || subClassId === 'undefined') return;

        const timetable = buildTimetableFromApi(
          subClassId,
          block.subClass?.classId != null ? String(block.subClass.classId) : null,
          block.periodSet,
          block.periods || [],
          block.slots || [],
        );
        timetable.periods.forEach(p => { if (p.dayOfWeek) daysSeen.add(p.dayOfWeek); });
        newTimetablesState[subClassId] = timetable;
      });

      if (daysSeen.size > 0) {
        setDaysOfWeek(DAYS_ORDER.filter(day => daysSeen.has(day)));
      }

      const fetchedSets: PeriodSetInfo[] = (result.data?.periodSets || [])
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((ps: any) => normalizePeriodSet(ps))
        .filter(Boolean);
      if (fetchedSets.length > 0) setPeriodSets(fetchedSets);

      setTimetables(newTimetablesState);
      setOriginalTimetables(deepCloneTimetablesState(newTimetablesState));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      const message = err instanceof Error ? err.message : 'An unknown error occurred';
      console.error("Failed to fetch full school timetable:", err);
      setError(message);
      toast.error(`Error loading school timetable: ${message}`);
    } finally {
      setIsLoadingTimetable(false);
    }
  }, [selectedAcademicYearId, buildTimetableFromApi]);

  // Attaches a bell schedule to a class. Every subclass under it gains a grid,
  // so the affected timetables are refetched.
  const assignPeriodSetToClass = useCallback(async (classId: string, periodSetId: string | null) => {
    const token = getAuthToken();
    if (!token) {
      toast.error("Authentication token not found.");
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/classes/${classId}/period-set`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ periodSetId: periodSetId ? Number(periodSetId) : null }),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.success === false) {
        throw new Error(result.error || result.message || `Failed to assign bell schedule (${response.status})`);
      }

      setClasses(prev => prev.map(c => (c.id === classId ? { ...c, periodSetId } : c)));
      toast.success(periodSetId ? 'Bell schedule assigned.' : 'Bell schedule removed.');
      await fetchFullSchoolTimetable();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      const message = err instanceof Error ? err.message : 'An unknown error occurred';
      console.error('Failed to assign period set:', err);
      toast.error(message);
    }
  }, [fetchFullSchoolTimetable]);

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

  // Applies a change to one slot, addressed by period id. Period ids are unique
  // per (set, day, sequence), so no day argument is needed — and a first-cycle
  // id can never land on a second-cycle grid.
  const mutateSlot = useCallback((
    subClassId: string,
    periodId: string,
    mutate: (assignments: SlotAssignment[]) => SlotAssignment[],
  ) => {
    setTimetables(prev => {
      const classTimetable = prev[subClassId];
      if (!classTimetable) return prev;

      const updatedSlots = classTimetable.slots.map(slot =>
        slot.periodId === periodId ? { ...slot, assignments: mutate(slot.assignments) } : slot
      );

      return { ...prev, [subClassId]: { ...classTimetable, slots: updatedSlots } };
    });
    markDirty(subClassId);
  }, [markDirty]);

  const resolveNames = useCallback((subjectId: string | null, teacherId: string | null): SlotAssignment => ({
    subjectId,
    teacherId,
    subjectName: subjectId ? subjects.find(s => s.id === subjectId)?.name ?? null : null,
    teacherName: teacherId ? teachers.find(t => t.id === teacherId)?.name ?? null : null,
  }), [subjects, teachers]);

  const updateSlotAssignment = useCallback((
    subClassId: string,
    periodId: string,
    assignmentIndex: number,
    subjectId: string | null,
    teacherId: string | null
  ) => {
    const assignment = resolveNames(subjectId, teacherId);
    mutateSlot(subClassId, periodId, assignments => {
      if (assignmentIndex < 0 || assignmentIndex >= assignments.length) return assignments;
      const next = [...assignments];
      next[assignmentIndex] = assignment;
      return next;
    });
  }, [mutateSlot, resolveNames]);

  const addSlotAssignment = useCallback((
    subClassId: string,
    periodId: string,
    subjectId: string | null,
    teacherId: string | null
  ) => {
    const assignment = resolveNames(subjectId, teacherId);
    mutateSlot(subClassId, periodId, assignments => [...assignments, assignment]);
  }, [mutateSlot, resolveNames]);

  const removeSlotAssignment = useCallback((
    subClassId: string,
    periodId: string,
    assignmentIndex: number
  ) => {
    mutateSlot(subClassId, periodId, assignments => assignments.filter((_, i) => i !== assignmentIndex));
  }, [mutateSlot]);

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
    if (!currentTimetable.periodSet) {
      if (!silent) toast.error("This class has no bell schedule assigned. Assign one before scheduling.");
      return;
    }

    const originalByPeriodId = new Map(originalTimetable.slots.map(slot => [slot.periodId, slot]));

    // Only TEACHING slots are sent — the server rejects writes to BREAK/PREP.
    const changedSlotsPayload: { periodId: number; subjectId: number | null; teacherId: number | null }[] = [];

    currentTimetable.slots.forEach(currentSlot => {
      if (!isAssignablePeriod(currentSlot.type)) return;

      const originalSlot = originalByPeriodId.get(currentSlot.periodId);
      const isChanged = !originalSlot || !assignmentsEqual(currentSlot.assignments, originalSlot.assignments);
      if (!isChanged) return;

      const periodIdNum = Number(currentSlot.periodId);

      if (currentSlot.assignments.length === 0) {
        // Slot was cleared — send null to remove all assignments
        changedSlotsPayload.push({ periodId: periodIdNum, subjectId: null, teacherId: null });
      } else {
        currentSlot.assignments.forEach(assignment => {
          changedSlotsPayload.push({
            periodId: periodIdNum,
            subjectId: assignment.subjectId ? Number(assignment.subjectId) : null,
            teacherId: assignment.teacherId ? Number(assignment.teacherId) : null,
          });
        });
      }
    });

    if (changedSlotsPayload.length === 0) {
      if (!silent) toast("No changes detected to save.");
      return;
    }

    const payload: { academicYearId?: number; slots: typeof changedSlotsPayload } = {
      slots: changedSlotsPayload,
    };
    if (selectedAcademicYearId) {
      payload.academicYearId = Number(selectedAcademicYearId);
    }

    if (!silent) setIsLoadingTimetable(true);
    setError(null);
    const token = getAuthToken();
    if (!token) {
      toast.error("Authentication token not found.");
      if (!silent) setIsLoadingTimetable(false);
      throw new Error("Authentication token not found.");
    }

    try {
      const response = await fetch(`${API_BASE_URL}/timetables/subclass/${subClassId}/bulk-update`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      const result = await response.json();

      // A batch can be saved and still report teacher clashes. Record them for
      // the affected periods either way — including alongside hard errors.
      const savedPeriodIds = new Set(changedSlotsPayload.map(slot => slot.periodId));
      const incomingWarnings: ClashWarning[] = Array.isArray(result.warnings) ? result.warnings : [];
      setClashWarnings(prev => ({
        ...prev,
        // Drop stale warnings for the periods we just re-sent — if a clash was
        // resolved, the new response simply won't mention it.
        [subClassId]: [
          ...(prev[subClassId] || []).filter(w => !savedPeriodIds.has(w.periodId)),
          ...incomingWarnings,
        ],
      }));

      if (!response.ok || !result.success) {
        if (result.errors && Array.isArray(result.errors) && result.errors.length > 0) {
          // Name the period rather than its id — "Period ID: 412" means nothing
          // to a scheduler looking at a grid.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const errorMessages = result.errors.map((e: any) => {
            const slot = currentTimetable.slots.find(s => s.periodId === String(e.periodId));
            const where = slot
              ? `${slot.day} ${slot.periodName} (${formatTimeRange(slot.startTime, slot.endTime)})`
              : `Period ID ${e.periodId}`;
            return `${where}: ${e.error}`;
          }).join('; ');
          console.error("Detailed save errors (partial success):", result.errors);
          throw new Error(`Save failed: ${result.message || 'Some errors occurred'}. ${errorMessages}`);
        } else {
          throw new Error(result.error || result.message || 'Failed to save timetable (Unknown error structure)');
        }
      }

      if (silent) {
        // Move the baseline forward to exactly what we just sent, so the
        // next diff is empty and the same slot isn't posted twice. Uses
        // the snapshot the payload was built from, not the live state —
        // an edit made mid-request must stay dirty.
        setOriginalTimetables(prev => ({
          ...prev,
          [subClassId]: deepCloneTimetablesState({ [subClassId]: currentTimetable })[subClassId],
        }));
      } else {
        toast.success(result.message || 'Timetable saved successfully!');
        // Refetch the full school timetable to ensure UI is synchronized with server
        await fetchFullSchoolTimetable();
      }

      // Saved, but a teacher is double-booked. Worth saying out loud even on a
      // silent auto-save; a fixed toast id keeps it from stacking up.
      if (incomingWarnings.length > 0) {
        toast(
          incomingWarnings.length === 1
            ? incomingWarnings[0].message
            : `${incomingWarnings.length} teacher clashes — saved, but check the flagged periods.`,
          { id: 'timetable-clash', icon: '⚠️', duration: 6000 },
        );
      }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      const message = err instanceof Error ? err.message : 'An unknown error occurred';
      console.error("Failed to save timetable:", err);
      setError(message);
      if (!silent) toast.error(`Save failed: ${message}`);
      throw err;
    } finally {
      if (!silent) setIsLoadingTimetable(false);
    }
  }, [timetables, originalTimetables, selectedAcademicYearId, fetchFullSchoolTimetable]);

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

  const getClashWarning = useCallback((
    subClassId: string,
    periodId?: number | string | null,
  ): ClashWarning | null => {
    if (!periodId) return null;
    const id = Number(periodId);
    return (clashWarnings[subClassId] || []).find(w => w.periodId === id) || null;
  }, [clashWarnings]);

  const getTeachersBySubject = useCallback((subjectId: string): Teacher[] => {
    return teachers.filter(teacher => teacher.subjects.includes(subjectId));
  }, [teachers]);

  // Local mirror of the server's clash rule: same day, overlapping wall-clock
  // times, any other subclass. Period ids and sequence numbers can't be
  // compared across bell schedules, so only the times are.
  const isTeacherAssignedElsewhere = useCallback((
    teacherId: string,
    day: string,
    startTime: string,
    endTime: string,
    excludeSubClassId: string
  ): string | null => {
    for (const subClassId in timetables) {
      if (subClassId === excludeSubClassId) continue;

      const conflict = timetables[subClassId].slots.some(slot =>
        slot.day === day &&
        periodsOverlap(startTime, endTime, slot.startTime, slot.endTime) &&
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
      periodSets,
      daysOfWeek,
      timetables,
      originalTimetables,
      isLoading,
      isLoadingTimetable,
      fetchTimetableForSubclass,
      fetchFullSchoolTimetable,
      assignPeriodSetToClass,
      updateSlotAssignment,
      addSlotAssignment,
      removeSlotAssignment,
      saveChanges,
      autoSaveStatus,
      retryAutoSave,
      getTeachersBySubject,
      isTeacherAssignedElsewhere,
      clashWarnings,
      getClashWarning,
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
