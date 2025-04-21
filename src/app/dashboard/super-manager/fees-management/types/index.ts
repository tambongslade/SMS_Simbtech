export interface Student {
    id: string;
    name: string;
    class: string;
    expectedFees: number;
    paidFees: number;
    lastPaymentDate?: string;
    status: 'Paid' | 'Partial' | 'Unpaid';
    email?: string;
    parentName?: string;
    parentPhone?: string;
    admissionNumber: string;
    balance: number;
    dateOfBirth?: string;
    placeOfBirth?: string;
    photo?: string;
    parentContacts?: {
      name: string;
      phone: string;
      email?: string;
    }[];
    feeId: string;
  }
  
  export interface Payment {
    id: string;
    studentId: string;
    amount: number;
    date: string;
    paymentMethod: string;
    receiptNumber: string;
    term: string;
    academicYear: string;
    description: string;
    semester: number;
  }
  
  export interface FeeStructure {
    id: string;
    class: string;
    term: string;
    academicYear: string;
    tuitionFee: number;
    libraryFee: number;
    sportsFee: number;
    laboratoryFee: number;
    registrationFee: number;
    totalFee: number;
    isNewStudent: boolean;
    semesterDeadlines: {
      semester: number;
      deadline: string;
    }[];
  }
  
  export interface NewStudent {
    name: string;
    class: string;
    admissionNumber?: string;
    email?: string;
    parentName?: string;
    parentPhone?: string;
    dateOfBirth?: string;
    gender?: string;
    placeOfBirth?: string;
    residence?: string;
    former_school?: string;
    phone?: string;
  }