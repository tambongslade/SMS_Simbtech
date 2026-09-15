"use client";

import React from 'react';
import { useTimetable } from './TimetableContext';
import { Select } from "@/components/ui";
import { useLanguage } from '@/components/context/LanguageContext';

interface ClassSelectorProps {
  selectedClass: string;
  onClassChange: (className: string) => void;
}

const ClassSelector: React.FC<ClassSelectorProps> = ({ 
  selectedClass, 
  onClassChange 
}) => {
  const { classes, isLoading } = useTimetable();
  const { t } = useLanguage();

  return (
    <div className="w-72">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {t('Select Class')}
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