import apiService, { ApiError } from './apiService';

export interface FeeDeductionEnrollment {
  id: number;
  student: { id: number; name: string; matricule?: string };
  class?: { id: number; name: string } | null;
  subClass?: { id: number; name: string } | null;
  academicYear?: { id: number; name: string } | null;
}

export interface FeeDeductionRecord {
  id: number;
  enrollmentId: number;
  schoolFeesId: number;
  amount: number;
  amountExpectedBefore: number;
  amountExpectedAfter: number;
  isPersonnelChild: boolean;
  personnelId: number | null;
  reason: string | null;
  createdById: number;
  createdAt: string;
  enrollment: FeeDeductionEnrollment;
  personnel: { id: number; name: string; matricule?: string } | null;
  createdBy: { id: number; name: string };
}

export interface ApplyFeeDeductionInput {
  amount: number;
  isPersonnelChild: boolean;
  personnelId?: number;
  reason?: string;
  confirmDuplicate?: boolean;
}

export interface PaginatedDeductions {
  data: FeeDeductionRecord[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

/** Thrown when the fee already has an active deduction and confirmDuplicate wasn't sent. */
export class DuplicateDeductionError extends Error {
  existing: FeeDeductionRecord[];
  constructor(message: string, existing: FeeDeductionRecord[]) {
    super(message);
    this.name = 'DuplicateDeductionError';
    this.existing = existing;
  }
}

export const applyFeeDeduction = async (
  feeId: number,
  input: ApplyFeeDeductionInput,
): Promise<FeeDeductionRecord> => {
  try {
    const res = await apiService.post<{ data: FeeDeductionRecord }>(
      `/fees/${feeId}/deduction`,
      input,
      { silent: true },
    );
    return res.data;
  } catch (error) {
    if (error instanceof ApiError && error.status === 409 && error.data?.code === 'DEDUCTION_ALREADY_APPLIED') {
      throw new DuplicateDeductionError(error.data.error || error.message, error.data.existing || []);
    }
    throw error;
  }
};

export const listFeeDeductions = async (params: {
  studentId?: number;
  enrollmentId?: number;
  academicYearId?: number;
  page?: number;
  limit?: number;
}): Promise<PaginatedDeductions> => {
  // URLSearchParams stringifies `undefined` literally, so only forward set values.
  const cleanParams = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null),
  );
  const res = await apiService.get<PaginatedDeductions>('/fees/deductions', { params: cleanParams });
  return res;
};

export const deleteFeeDeduction = async (id: number): Promise<void> => {
  await apiService.delete(`/fees/deductions/${id}`);
};
