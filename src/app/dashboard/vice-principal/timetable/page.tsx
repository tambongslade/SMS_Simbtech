"use client";

import React, { useState, useEffect } from 'react';
import { TimetableProvider, useTimetable } from './components/TimetableContext';
import { TimetableGrid } from './components/TimetableGrid';
import SchoolTimetableView from './components/SchoolTimetableView';
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui";
import { Select, Button } from "@/components/ui";
import { ArrowDownTrayIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import { downloadSubclassTimetablePdf, downloadFullSchoolTimetablePdf } from '@/lib/timetablePdf';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://192.168.1.103:4000/api/v1';

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
    autoSaveStatus,
    isLoadingTimetable,
    timetables,
    academicYears,
    selectedAcademicYearId,
    setSelectedAcademicYearId,
  } = useTimetable();
  const [selectedSubClassId, setSelectedSubClassId] = useState<string>('');
  const [viewMode, setViewMode] = useState<'class' | 'school'>('class');
  const [isZoomed, setIsZoomed] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // Fetch timetable when subclass selection or academic year changes
  useEffect(() => {
    if (selectedAcademicYearId) {
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
    setSelectedSubClassId('');
  };

  // Handle class selection from the school-wide view
  const handleClassSelect = (subClassId: string) => {
    setSelectedSubClassId(subClassId);
    setViewMode('class');
  };

  // Export timetable as Excel
  const handleExport = async (type: 'subclass' | 'school') => {
    const token = localStorage.getItem('token');
    if (!token) {
      toast.error('Authentication token not found.');
      return;
    }

    setIsExporting(true);
    try {
      let url: string;
      let filename: string;

      if (type === 'subclass') {
        if (!selectedSubClassId) {
          toast.error('Please select a subclass first.');
          return;
        }
        url = `${API_BASE_URL}/timetables/subclass/${selectedSubClassId}/export`;
        const subClassName = subClasses.find(sc => sc.id === selectedSubClassId)?.name || 'subclass';
        filename = `timetable-${subClassName}.xlsx`;
      } else {
        url = `${API_BASE_URL}/timetables/export`;
        filename = `school-timetable.xlsx`;
      }

      if (selectedAcademicYearId) {
        url += `?academicYearId=${selectedAcademicYearId}`;
      }

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(errorData.message || `Export failed (${response.status})`);
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
      toast.success('Timetable exported successfully!');
    } catch (err: any) {
      const message = err instanceof Error ? err.message : 'Export failed';
      console.error('Export error:', err);
      toast.error(`Export failed: ${message}`);
    } finally {
      setIsExporting(false);
    }
  };

  // Export timetable as a print-ready PDF (rendered server-side)
  const handleExportPdf = async (type: 'subclass' | 'school') => {
    if (type === 'subclass' && !selectedSubClassId) {
      toast.error('Please select a subclass first.');
      return;
    }

    setIsExportingPdf(true);
    try {
      if (type === 'subclass') {
        const subClassName = subClasses.find(sc => sc.id === selectedSubClassId)?.name;
        await downloadSubclassTimetablePdf(selectedSubClassId, subClassName, selectedAcademicYearId);
      } else {
        const yearName = academicYears.find(y => y.id === selectedAcademicYearId)?.name;
        await downloadFullSchoolTimetablePdf(yearName, selectedAcademicYearId);
      }
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Check if timetable data exists for the selected subclass
  const hasTimetableData = selectedSubClassId && timetables[selectedSubClassId];

  return (
    <div className={`p-4 sm:p-6 space-y-4 sm:space-y-6 ${isZoomed ? 'fixed inset-0 bg-white z-[100] overflow-auto' : ''}`}>
      <div className="flex flex-col gap-3 md:flex-row md:justify-between md:items-center">
        <h1 className="text-2xl sm:text-3xl font-bold">Timetable Management</h1>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          {academicYears.length > 0 && selectedAcademicYearId && (
            <div className="flex items-center gap-2">
              <label htmlFor="academic-year-select" className="shrink-0 text-gray-700 text-sm font-medium">Academic Year:</label>
              <Select
                id="academic-year-select"
                value={selectedAcademicYearId}
                onChange={handleAcademicYearChange}
                options={academicYears.map(year => ({
                  value: year.id,
                  label: year.name
                }))}
                className="flex-1 sm:flex-none sm:w-40"
              />
            </div>
          )}
          {/* Fullscreen only makes sense where there is a window to fill */}
          <Button
            onClick={() => setIsZoomed(!isZoomed)}
            color="secondary"
            className="hidden md:inline-flex"
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
          <div className="grid grid-cols-2 gap-2 sm:flex sm:gap-2">
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
              School-Wide
            </Button>
          </div>
        </div>
      </div>

      {viewMode === 'class' ? (
        /* Class Timetable View */
        <div className="space-y-4 sm:space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-4">
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
            <div className="grid grid-cols-2 gap-2 sm:flex sm:gap-4">
              <Button
                onClick={() => handleExport('subclass')}
                disabled={!selectedSubClassId || isExporting || !hasTimetableData}
                color="secondary"
                title="Export this class timetable as Excel"
              >
                <ArrowDownTrayIcon className="h-5 w-5 mr-1 inline" />
                {isExporting ? 'Exporting...' : 'Excel'}
              </Button>
              <Button
                onClick={() => handleExportPdf('subclass')}
                disabled={!selectedSubClassId || isExportingPdf || !hasTimetableData}
                color="secondary"
                title="Download this class timetable as a print-ready PDF"
              >
                <DocumentArrowDownIcon className="h-5 w-5 mr-1 inline" />
                {isExportingPdf ? 'Preparing...' : 'PDF'}
              </Button>
              {/* Assignments save on selection. The button stays as a
                  manual re-sync — useful after an auto-save failure, and
                  it still forces a full refetch from the server. */}
              <Button
                onClick={() => saveChanges(selectedSubClassId)}
                disabled={!selectedSubClassId || isLoadingTimetable || !hasTimetableData}
                color={autoSaveStatus === 'error' ? 'primary' : 'secondary'}
                title="Re-send any unsaved changes and reload from the server"
              >
                {isLoadingTimetable
                  ? 'Saving...'
                  : autoSaveStatus === 'error'
                    ? 'Retry save'
                    : 'Sync'}
              </Button>
            </div>
          </div>

          <div className="relative min-h-[300px]">
            {isLoadingTimetable && selectedSubClassId && (
              <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10 rounded-lg">
                <p className="text-xl font-semibold text-gray-700">Loading Timetable...</p>
              </div>
            )}

            {selectedSubClassId ? (
              <Card className={`${isLoadingTimetable ? 'opacity-50' : ''}`}>
                <CardBody className="px-2 pt-4 sm:px-6 sm:pt-6">
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
            <SchoolTimetableView
              onClassSelect={handleClassSelect}
              onExportSchool={() => handleExport('school')}
              isExporting={isExporting}
              onExportSchoolPdf={() => handleExportPdf('school')}
              isExportingPdf={isExportingPdf}
            />
          </CardBody>
        </Card>
      )}
    </div>
  );
};

export default TimetablePage;
