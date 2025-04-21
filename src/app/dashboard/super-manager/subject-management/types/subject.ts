export enum SubjectCategory {
    SCIENCE_AND_TECHNOLOGY = 'SCIENCE_AND_TECHNOLOGY',
    LANGUAGES_AND_LITERATURE = 'LANGUAGES_AND_LITERATURE',
    HUMAN_AND_SOCIAL_SCIENCE = 'HUMAN_AND_SOCIAL_SCIENCE',
    OTHERS = 'OTHERS',
}

// Type for nested assignment data expected from API
export type SubjectAssignment = {
    subClassId: number;
    subClassName: string;
    classId: number;
    className: string;
    coefficient: number;
};

// Type for nested teacher data
export type SubjectTeacher = {
    teacherId: number;
    teacherName: string;
    // Add other teacher details if needed
};

export type Subject = {
    id: number;
    name: string;
    coefficient?: number;
    category: SubjectCategory;
    assignments?: SubjectAssignment[]; // Keep this structure for frontend use
    teachers?: SubjectTeacher[];      // Add optional teachers array
}; 