// Type for brief subject info (e.g., for listing assignments)
export type SubjectBrief = {
    id: number;
    name: string;
    // Add category if needed for display
};

// Assuming a base User type exists elsewhere or define necessary fields
export type Teacher = {
    id: number;
    name: string;
    email: string;
    gender?: string;
    phone?: string;
    address?: string;
    photo?: string | null;
    // Add other relevant user fields
    subjects?: SubjectBrief[]; // Subjects assigned to the teacher
}; 