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
    id: number;
    name: string;
    startDate: string;
    endDate: string;
    feeDeadline: string;
    academicYearId: number;
  }
  
  export interface AcademicYear {
    id: number;
    name: string;
    startDate: string;
    endDate: string;
    isCurrent: boolean;
    reportDeadline: string;
    createdAt: string;
    updatedAt: string;
    terms: Term[];
    examSequences: ExamSequence[];
  }