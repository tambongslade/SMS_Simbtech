// Defines the structure for a SubClass
export interface SubClass {
  id?: string | number; // Assuming ID can be string or number, optional for creation
  name: string;
  classId?: string | number; // ID of the parent Class
  studentCount?: number; // Optional student count from API
  classMasterId?: number | null; // Added optional Class Master ID
  classMasterName?: string | null; // Added optional Class Master Name
  // Add other relevant subclass fields if provided by API
}

// Defines the structure for a Class, including its SubClasses
export interface Class {
  id?: string | number; // Assuming ID can be string or number, optional for creation
  name: string;
  level: number | string; // Level might be number or string - adjust based on API/needs
  firstTermFee: number;
  secondTermFee: number;
  thirdTermFee?: number; // Optional third term fee
  newStudentAddFee: number; // Corresponds to Registration for new students
  oldStudentAddFee: number; // Corresponds to Registration for old students
  miscellaneousFee: number;
  studentCount?: number; // Optional student count from API
  subClasses?: SubClass[]; // Array of associated subclasses - make optional as it might not always be fetched/present
  // Add other relevant class fields if provided by API
}
