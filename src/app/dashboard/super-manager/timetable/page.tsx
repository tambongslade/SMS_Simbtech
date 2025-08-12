"use client";

import React, { useState, useEffect } from 'react';
import { TimetableProvider, useTimetable } from './components/TimetableContext';
import { TimetableGrid } from './components/TimetableGrid';
import SchoolTimetableView from './components/SchoolTimetableView';
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui";
import { Select, Button } from "@/components/ui";

// Define interface for class items
interface ClassItem {
  id: string;
  name: string;
}

const TimetablePage = () => {
  return (
    <TimetableProvider>
      <TimetableContent />
    </TimetableProvider>
  );
};

const TimetableContent = () => {
  const {
    subClasses,
    fetchTimetableForSubclass,
    fetchFullSchoolTimetable,
    saveChanges,
    isLoadingTimetable,
    timetables,
    academicYears, // Added
    selectedAcademicYearId, // Added
    setSelectedAcademicYearId, // Added
  } = useTimetable();
  const [selectedSubClassId, setSelectedSubClassId] = useState<string>('');
  const [viewMode, setViewMode] = useState<'class' | 'school'>('class');
  const [isZoomed, setIsZoomed] = useState(false);

  // Fetch timetable when subclass selection or academic year changes
  useEffect(() => {
    if (selectedAcademicYearId) { // Only fetch if an academic year is selected
      // Always use full school timetable data for both views
      fetchFullSchoolTimetable();
    }
  }, [selectedAcademicYearId, fetchFullSchoolTimetable]);

  // Auto-select first subclass when timetables are loaded
  useEffect(() => {
    if (viewMode === 'class' && !selectedSubClassId && subClasses.length > 0 && Object.keys(timetables).length > 0) {
      console.log("Auto-selecting first subclass:", subClasses[0].id);
      setSelectedSubClassId(subClasses[0].id);
    }
  }, [viewMode, selectedSubClassId, subClasses, timetables]);

  // Handle academic year change
  const handleAcademicYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newAcademicYearId = e.target.value;
    setSelectedAcademicYearId(newAcademicYearId);
    setSelectedSubClassId(''); // Clear selected subclass when academic year changes
    // Force re-fetch based on new academic year via useEffect
  };

  // Handle class selection from the school-wide view
  const handleClassSelect = (subClassId: string) => {
    setSelectedSubClassId(subClassId);
    setViewMode('class');
  };

  // Check if timetable data exists for the selected subclass
  const hasTimetableData = selectedSubClassId && timetables[selectedSubClassId];

  return (
    <div className={`p-6 space-y-6 ${isZoomed ? 'fixed inset-0 bg-white z-[100] overflow-auto' : ''}`}>
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Timetable Management</h1>
        <div className="flex items-center space-x-4">
          {academicYears.length > 0 && selectedAcademicYearId && (
            <div className="flex items-center space-x-2">
              <label htmlFor="academic-year-select" className="text-gray-700 text-sm font-medium">Academic Year:</label>
              <Select
                id="academic-year-select"
                value={selectedAcademicYearId}
                onChange={handleAcademicYearChange}
                options={academicYears.map(year => ({
                  value: year.id,
                  label: year.name
                }))}
                className="w-40"
              />
            </div>
          )}
          <Button
            onClick={() => setIsZoomed(!isZoomed)}
            color="secondary"
            title={isZoomed ? "Exit Fullscreen" : "Enter Fullscreen"}
          >
            {isZoomed ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 1v4m0 0h-4m4 0l-5-5" />
              </svg>
            )}
          </Button>
          <div className="flex space-x-2">
            <Button
              onClick={() => setViewMode('class')}
              color={viewMode === 'class' ? 'primary' : 'secondary'}
            >
              Class View
            </Button>
            <Button
              onClick={() => setViewMode('school')}
              color={viewMode === 'school' ? 'primary' : 'secondary'}
            >
              School-Wide View
            </Button>
          </div>
        </div>
      </div>

      {viewMode === 'class' ? (
        /* Class Timetable View */
        <div className="space-y-6">
          <div className="flex items-end space-x-4">
            <Card className="flex-grow">
              <CardHeader>
                <CardTitle>Select Subclass</CardTitle>
              </CardHeader>
              <CardBody>
                <Select
                  value={selectedSubClassId}
                  onChange={(e) => setSelectedSubClassId(e.target.value)}
                  options={subClasses.map((subClassItem: any) => ({
                    value: subClassItem.id,
                    label: subClassItem.name
                  }))}
                />
              </CardBody>
            </Card>
            <Button
              onClick={() => saveChanges(selectedSubClassId)}
              disabled={!selectedSubClassId || isLoadingTimetable || !hasTimetableData}
              color="primary"
            >
              {isLoadingTimetable ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>

          <div className="relative min-h-[300px]">
            {isLoadingTimetable && selectedSubClassId && (
              <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10 rounded-lg">
                <p className="text-xl font-semibold text-gray-700">Loading Timetable...</p>
              </div>
            )}

            {selectedSubClassId ? (
              <Card className={`${isLoadingTimetable ? 'opacity-50' : ''}`}>
                <CardBody className="pt-6">
                  <TimetableGrid 
                    key={`${selectedSubClassId}-${hasTimetableData ? 'loaded' : 'empty'}`}
                    selectedSubClassId={selectedSubClassId} 
                  />
                </CardBody>
              </Card>
            ) : (
              <Card className="text-center text-gray-500 py-10">
                <p>Please select a subclass to view or edit its timetable.</p>
              </Card>
            )}
          </div>
        </div>
      ) : (
        /* School-Wide Timetable View */
        <Card>
          <CardBody>
            <SchoolTimetableView onClassSelect={handleClassSelect} />
          </CardBody>
        </Card>
      )}
    </div>
  );
};

export default TimetablePage; 