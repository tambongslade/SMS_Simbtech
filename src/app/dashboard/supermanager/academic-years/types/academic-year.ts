export interface Semester {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    feePaymentDeadline: string;
  }
  
  export interface AcademicYear {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    isActive: boolean;
    semesters: Semester[];
    registrationFees: {
      newStudent: number;
      returningStudent: number;
    };
  }