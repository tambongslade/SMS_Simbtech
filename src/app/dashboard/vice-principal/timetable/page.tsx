"use client";

import React, { useState } from 'react';
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
  const { classes } = useTimetable();
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [viewMode, setViewMode] = useState<'class' | 'school'>('class');

  // Handle class selection from the school-wide view
  const handleClassSelect = (classId: string) => {
    setSelectedClassId(classId);
    setViewMode('class');
  };

  return (
    <div className="p-6 space-y-6">
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
          <Card>
            <CardHeader>
              <CardTitle>Select Class</CardTitle>
            </CardHeader>
            <CardBody>
              <Select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                options={classes.map((classItem: ClassItem) => ({
                  value: classItem.id,
                  label: classItem.name
                }))}
              />
            </CardBody>
          </Card>

          {selectedClassId && (
            <Card>
              <CardBody className="pt-6">
                <TimetableGrid selectedClassId={selectedClassId} />
              </CardBody>
            </Card>
          )}
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