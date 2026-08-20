export interface ExamSequence {
    id: number;
    sequenceNumber: number;
    academicYearId: number;
    termId: number;
    status: "OPEN" | "CLOSED" | "FINALIZED";
    createdAt: string;
    updatedAt: string;
  }

  export interface Term {
    id?: number;
    name: string;
    startDate: string;
    endDate: string;
    feeDeadline: string;
    academicYearId?: number;
    // Marks the term as a holiday period. Holiday terms require classIds.
    isHoliday?: boolean;
    // Class IDs the term applies to. Empty on a non-holiday term = all classes.
    classIds?: number[];
  }

  export interface AcademicYear {
    id: number;
    name: string;
    startDate: string;
    endDate: string;
    isCurrent?: boolean;
    isActive?: boolean;
    reportDeadline?: string;
    createdAt?: string;
    updatedAt?: string;
    terms: Term[];
    examSequences?: ExamSequence[];
  }
