export interface Term {
    id?: string;
    name: string;
    startDate: string;
    endDate: string;
    feeDeadline: string;
  }
  
  export interface AcademicYear {
    id?: string;
    name: string;
    startDate: string;
    endDate: string;
    isActive: boolean;
    terms: Term[];
  }