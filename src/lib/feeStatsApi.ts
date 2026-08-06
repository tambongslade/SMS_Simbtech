import apiService from './apiService';

// ---------------------------------------------------------------------------
// Paid / not-paid statistics, per class and per subclass.
//
// The API has /fees/subclass/:id/summary and /fees/subclass/:id/status but no
// class-level equivalent, so asking per subclass would mean one request per
// subclass and no way to roll up. Instead we pull the year's fee records once
// (one per enrollment) and aggregate both levels in a single pass — the same
// approach the super-manager fees overview already uses.
//
// Caveat worth surfacing in the UI: a student with no fee record for the year
// has nothing to count, so they appear in neither the paid nor the unpaid
// bucket. That matches the API's own `totalStudentsWithFees` wording.
// ---------------------------------------------------------------------------

export type PaymentState = 'PAID' | 'PARTIAL' | 'UNPAID';

export interface FeeStudentRow {
  studentId: number;
  name: string;
  matricule: string;
  classId: number | null;
  className: string;
  subClassId: number | null;
  subClassName: string;
  expected: number;
  paid: number;
  balance: number;
  state: PaymentState;
  /** Paid in full — the split the report is built around. */
  paidInFull: boolean;
}

export interface FeeGroupStats {
  id: number | null;
  name: string;
  studentCount: number;
  paidCount: number;
  unpaidCount: number;
  /** Of the unpaid, how many have paid something. */
  partialCount: number;
  expected: number;
  collected: number;
  outstanding: number;
  /** Share of students paid in full, 0-100. */
  paidRate: number;
  /** Share of money collected, 0-100. */
  collectionRate: number;
}

export interface ClassFeeStats extends FeeGroupStats {
  subClasses: FeeGroupStats[];
}

export interface FeeStatsResult {
  totals: FeeGroupStats;
  classes: ClassFeeStats[];
  students: FeeStudentRow[];
}

const PAGE_LIMIT = 500;
const MAX_PAGES = 40;

const pct = (part: number, whole: number) => (whole > 0 ? (part / whole) * 100 : 0);

const emptyGroup = (id: number | null, name: string): FeeGroupStats => ({
  id,
  name,
  studentCount: 0,
  paidCount: 0,
  unpaidCount: 0,
  partialCount: 0,
  expected: 0,
  collected: 0,
  outstanding: 0,
  paidRate: 0,
  collectionRate: 0,
});

const addRow = (group: FeeGroupStats, row: FeeStudentRow) => {
  group.studentCount += 1;
  if (row.paidInFull) group.paidCount += 1;
  else {
    group.unpaidCount += 1;
    if (row.state === 'PARTIAL') group.partialCount += 1;
  }
  group.expected += row.expected;
  group.collected += row.paid;
  group.outstanding += row.balance;
};

const finalize = (group: FeeGroupStats): FeeGroupStats => ({
  ...group,
  paidRate: pct(group.paidCount, group.studentCount),
  collectionRate: pct(group.collected, group.expected),
});

/** Every fee record for the year. One per enrollment, so the volume is modest. */
const fetchAllFeeRecords = async (academicYearId: number): Promise<any[]> => {
  let records: any[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const res = await apiService.get<any>(
      `/fees?academicYearId=${academicYearId}&page=${page}&limit=${PAGE_LIMIT}`,
    );
    // The endpoint double-nests: { data: { data: [...], meta } }.
    const batch = res?.data?.data ?? res?.data ?? [];
    if (!Array.isArray(batch) || batch.length === 0) break;
    records = records.concat(batch);
    const total = res?.data?.meta?.total ?? res?.meta?.total ?? records.length;
    if (records.length >= total) break;
  }
  return records;
};

interface NameLookup {
  classNameById: Map<number, string>;
  subClassById: Map<number, { name: string; classId: number | null; className: string }>;
}

const fetchNames = async (): Promise<NameLookup> => {
  const classNameById = new Map<number, string>();
  const subClassById = new Map<number, { name: string; classId: number | null; className: string }>();

  const [classesRes, subClassesRes] = await Promise.all([
    apiService.get<{ data: any[] }>('/classes?limit=100').catch(() => ({ data: [] })),
    apiService.get<{ data: any[] }>('/classes/sub-classes?limit=200').catch(() => ({ data: [] })),
  ]);

  (classesRes.data || []).forEach((c: any) => classNameById.set(c.id, c.name));
  (subClassesRes.data || []).forEach((sc: any) => {
    const classId = sc.class?.id ?? sc.classId ?? null;
    subClassById.set(sc.id, {
      name: sc.name,
      classId,
      className: sc.class?.name ?? (classId != null ? classNameById.get(classId) ?? '' : ''),
    });
  });

  return { classNameById, subClassById };
};

const toRow = (record: any, names: NameLookup): FeeStudentRow => {
  const enrollment = record.enrollment ?? {};
  const student = enrollment.student ?? {};
  const subClassId = enrollment.subClassId ?? enrollment.subClass?.id ?? null;
  const subClassInfo = subClassId != null ? names.subClassById.get(subClassId) : undefined;

  const classId = enrollment.classId ?? enrollment.class?.id ?? subClassInfo?.classId ?? null;
  const expected = Number(record.amountExpected) || 0;
  const paid = Number(record.amountPaid) || 0;

  return {
    studentId: student.id ?? record.id,
    name: student.name || 'Unknown student',
    matricule: student.matricule || '—',
    classId,
    className:
      enrollment.class?.name ||
      (classId != null ? names.classNameById.get(classId) : undefined) ||
      subClassInfo?.className ||
      'Unassigned',
    subClassId,
    subClassName: enrollment.subClass?.name || subClassInfo?.name || 'No subclass',
    expected,
    paid,
    balance: Math.max(0, expected - paid),
    // Treated as fully paid when nothing is owed — matches the API's paidInFull.
    state: paid >= expected && expected > 0 ? 'PAID' : paid > 0 ? 'PARTIAL' : 'UNPAID',
    paidInFull: expected > 0 ? paid >= expected : false,
  };
};

export const fetchFeeStats = async (academicYearId: number): Promise<FeeStatsResult> => {
  const [records, names] = await Promise.all([fetchAllFeeRecords(academicYearId), fetchNames()]);
  const students = records.map((r) => toRow(r, names));

  const totals = emptyGroup(null, 'All classes');
  const classMap = new Map<string, ClassFeeStats>();
  const subClassMaps = new Map<string, Map<string, FeeGroupStats>>();

  students.forEach((row) => {
    addRow(totals, row);

    const classKey = String(row.classId ?? 'unassigned');
    if (!classMap.has(classKey)) {
      classMap.set(classKey, { ...emptyGroup(row.classId, row.className), subClasses: [] });
      subClassMaps.set(classKey, new Map());
    }
    addRow(classMap.get(classKey)!, row);

    const subMap = subClassMaps.get(classKey)!;
    const subKey = String(row.subClassId ?? 'none');
    if (!subMap.has(subKey)) subMap.set(subKey, emptyGroup(row.subClassId, row.subClassName));
    addRow(subMap.get(subKey)!, row);
  });

  const classes = Array.from(classMap.entries())
    .map(([key, cls]) => ({
      ...finalize(cls),
      subClasses: Array.from(subClassMaps.get(key)!.values())
        .map(finalize)
        .sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return { totals: finalize(totals), classes, students };
};

export const fmtMoney = (v?: number | null) =>
  `FCFA ${(v ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

export const fmtPct = (v: number) => `${v.toFixed(1)}%`;
