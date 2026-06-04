import apiService from './apiService';

export interface StudentFeeStatus {
  paidInFull: boolean;
  amountExpected: number;
  amountPaid: number;
  shortfall: number;
  schoolFeesId?: number;
  enrollmentId?: number;
  academicYearId?: number;
  hasEnrollment: boolean;
  hasFeesRecord: boolean;
}

export interface SubclassFeeStudent {
  studentId: number;
  enrollmentId: number;
  name: string;
  matricule: string;
  amountExpected: number;
  amountPaid: number;
  shortfall: number;
  paidInFull: boolean;
}

export interface SubclassFeeStatus {
  subClassId: number;
  academicYearId: number;
  totalStudents: number;
  paidInFullCount: number;
  unpaidCount: number;
  students: SubclassFeeStudent[];
}

export const getStudentFeeStatus = async (
  studentId: number,
  academicYearId?: number,
): Promise<StudentFeeStatus> => {
  const qs = academicYearId ? `?academicYearId=${academicYearId}` : '';
  const res = await apiService.get<{ data: StudentFeeStatus }>(`/fees/student/${studentId}/status${qs}`);
  return res.data;
};

export const getSubclassFeeStatus = async (
  subClassId: number,
  academicYearId?: number,
): Promise<SubclassFeeStatus> => {
  const qs = academicYearId ? `?academicYearId=${academicYearId}` : '';
  const res = await apiService.get<{ data: SubclassFeeStatus }>(`/fees/subclass/${subClassId}/status${qs}`);
  return res.data;
};
