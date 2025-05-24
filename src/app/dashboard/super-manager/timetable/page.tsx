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
    classes, 
    subClasses, 
    fetchTimetableForSubclass, 
    saveChanges, 
    isLoadingTimetable, 
    timetables
  } = useTimetable();
  const [selectedSubClassId, setSelectedSubClassId] = useState<string>('');
  const [viewMode, setViewMode] = useState<'class' | 'school'>('class');

  // Fetch timetable when subclass selection changes
  useEffect(() => {
    if (selectedSubClassId) {
      fetchTimetableForSubclass(selectedSubClassId);
    }
  }, [selectedSubClassId, fetchTimetableForSubclass]);

  // Handle class selection from the school-wide view
  const handleClassSelect = (classId: string) => {
    setSelectedSubClassId(classId);
    setViewMode('class');
  };

  // Check if timetable data exists for the selected subclass
  const hasTimetableData = selectedSubClassId && timetables[selectedSubClassId];

  return (
    <div className="p-4 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Timetable Management</h1>
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
                  placeholder="Select a subclass..."
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
                  <TimetableGrid selectedSubClassId={selectedSubClassId} />
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