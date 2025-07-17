"use client";

import React from 'react';
import { useTimetable } from './TimetableContext';
import { Select } from "@/components/ui";

interface ClassSelectorProps {
  selectedClass: string;
  onClassChange: (className: string) => void;
}

const ClassSelector: React.FC<ClassSelectorProps> = ({ 
  selectedClass, 
  onClassChange 
}) => {
  const { classes, isLoading } = useTimetable();

  return (
    <div className="w-72">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Select Class
      </label>
      <Select
        disabled={isLoading}
        value={selectedClass}
        onChange={(e) => onClassChange(e.target.value)}
        options={classes.map(classItem => ({
          value: classItem.id,
          label: classItem.name
        }))}
      />
    </div>
  );
};

export default ClassSelector; 