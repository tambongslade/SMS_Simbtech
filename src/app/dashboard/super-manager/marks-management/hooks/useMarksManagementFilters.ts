'use client';

import { useMemo } from 'react';
import useSWR from 'swr';
import { toast } from 'react-hot-toast';

// --- Types --- (Should match or be imported)
type ExamSequence = {
    id: number;
    name: string;
    // other fields...
};

type Subject = {
    id: number;
    name: string;
    // other fields...
};

type SubClass = {
    id: number;
    name: string;
    subjects: Subject[];
    // other fields...
};

type AcademicYear = {
    id: number;
    name: string;
    terms: any[]; // Keep if needed for sequence filtering logic
    examSequences: ExamSequence[];
    // other fields...
};

// --- API Configuration ---
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://192.168.1.103:4000/api/v1';
// Assuming global fetcher is configured via SWRProvider

export const useMarksManagementFilters = (selectedYearId: number | '', selectedSubClassId: number | '') => {

    // --- SWR Data Fetching --- 
    const ACADEMIC_YEARS_ENDPOINT = `${API_BASE_URL}/academic-years`;
    const SUBCLASSES_ENDPOINT = `${API_BASE_URL}/classes/sub-classes?includeSubjects=true`;

    // 1. Fetch Academic Years (with nested sequences)
    const { 
        data: yearsResult, 
        error: yearsError, 
        isLoading: isLoadingYears 
    } = useSWR<{ data: any[] }>(ACADEMIC_YEARS_ENDPOINT);

    // 2. Fetch Subclasses (with nested subjects)
    const { 
        data: subClassesResult, 
        error: subClassesError, 
        isLoading: isLoadingSubClasses 
    } = useSWR<{ data: any[] }>(SUBCLASSES_ENDPOINT);

    // --- Process SWR Data --- 
    const academicYears = useMemo((): AcademicYear[] => {
        if (!yearsResult?.data) return [];
        return yearsResult.data.map((year: any) => ({
            id: year.id,
            name: year.name,
            // Map other essential fields if needed
            terms: year.terms || [],
            examSequences: (year.examSequences || []).map((seq: any) => ({
                id: seq.id,
                name: seq.name || `Sequence ${seq.sequenceNumber}`, // Handle potential missing names
                // Map other sequence fields if needed
                sequenceNumber: seq.sequenceNumber, 
                academicYearId: seq.academicYearId,
                termId: seq.termId
            }))
        }));
    }, [yearsResult]);

    const subClasses = useMemo((): SubClass[] => {
        if (!subClassesResult?.data) return [];
        return subClassesResult.data.map((sc: any) => ({
            id: sc.id,
            name: sc.name,
            classId: sc.classId,
            className: sc.class?.name,
            // Map other essential fields if needed
            subjects: (sc.subjects || []).map((subj: any) => ({ 
                id: subj.id, 
                name: subj.name 
                // Map other subject fields if needed
            }))
        }));
    }, [subClassesResult]);

    // --- Derive Dependent Options --- 
    const derivedExamSequences = useMemo((): ExamSequence[] => {
        if (!selectedYearId) return [];
        const selectedYear = academicYears.find(year => year.id === selectedYearId);
        return selectedYear?.examSequences || [];
    }, [selectedYearId, academicYears]);

    const derivedSubjects = useMemo((): Subject[] => {
        if (!selectedSubClassId) return [];
        const selectedSubClass = subClasses.find(sc => sc.id === selectedSubClassId);
        return selectedSubClass?.subjects || [];
    }, [selectedSubClassId, subClasses]);

    // --- Consolidated Loading & Error --- 
    const isLoadingFilters = isLoadingYears || isLoadingSubClasses;
    const filterError = useMemo(() => {
        if (yearsError) return `Failed to load academic years: ${yearsError.message}`;
        if (subClassesError) return `Failed to load subclasses: ${subClassesError.message}`;
        return null;
    }, [yearsError, subClassesError]);

    // Optional: Display error toast once
    useMemo(() => {
        if (filterError) {
            toast.error(filterError);
        }
    }, [filterError]);

    // --- Return Values --- 
    return {
        academicYears,          // List for Year dropdown
        subClasses,             // List for SubClass dropdown
        derivedExamSequences,   // Filtered list for Sequence dropdown
        derivedSubjects,        // Filtered list for Subject dropdown
        isLoadingFilters,       // Combined loading state for filter data
        filterError,            // Combined error state for filter data
    };
}; 