import React, { createContext, useState } from "react";
import { AcademicYear } from "@/app/dashboard/supermanager/academic-years/types/academic-year";

interface AcademicYearContextProps {
  academicYears: AcademicYear[];
  addAcademicYear: (year: AcademicYear) => void;
  updateAcademicYear: (id: number, updatedYear: AcademicYear) => void;
  deleteAcademicYear: (id: number) => void;
}

export const AcademicYearContext = createContext<AcademicYearContextProps | null>(null);

export const AcademicYearProvider = ({ children }: { children: React.ReactNode }) => {
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);

  const addAcademicYear = (year: AcademicYear) => {
    // Use crypto.randomUUID or a counter to avoid hydration mismatch
    const newId = academicYears.length > 0 ? Math.max(...academicYears.map(y => y.id)) + 1 : 1;
    setAcademicYears([...academicYears, { ...year, id: newId }]);
  };

  const updateAcademicYear = (id: number, updatedYear: AcademicYear) => {
    setAcademicYears(academicYears.map((year) => (year.id === id ? updatedYear : year)));
  };

  const deleteAcademicYear = (id: number) => {
    setAcademicYears(academicYears.filter((year) => year.id !== id));
  };

  return (
    <AcademicYearContext.Provider value={{ academicYears, addAcademicYear, updateAcademicYear, deleteAcademicYear }}>
      {children}
    </AcademicYearContext.Provider>
  );
};
