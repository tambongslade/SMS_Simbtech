"use client";

import { useEffect, useRef, useState } from "react";
// Assuming Class and Term types are available or imported
import { Class, SubClass } from "@/app/dashboard/super-manager/classes/types/class"; // Assuming SubClass is exported here
import { AcademicYear, ExamSequence } from "@/app/dashboard/super-manager/academic-years/types/academic-year";
import { DocumentArrowDownIcon, TableCellsIcon, ChartBarIcon, DocumentTextIcon, ChevronDownIcon } from '@heroicons/react/24/outline'; // Import icons

interface FiltersProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedClass: string; // Should hold the selected SubClass ID or 'all'
  setSelectedClass: (classId: string) => void;
  selectedAcademicYear: string; // Should hold the selected Academic Year ID or 'active'
  setSelectedAcademicYear: (yearId: string) => void;
  selectedPaymentStatus: string; // Add status prop
  setSelectedPaymentStatus: (status: string) => void; // Add status setter prop
  handleExportPDF: () => void; // Add PDF handler prop
  handleExportExcel: () => void; // Add Excel handler prop
  handleExportEnhanced?: (format: 'csv' | 'pdf' | 'xlsx' | 'docx', reportType?: 'detailed' | 'summary' | 'analytics') => void; // Fee report export handler
  onShowSubclassSummary?: (subClassId: string) => void; // Subclass summary handler
  viewMode: "list" | "cards";
  setViewMode: (mode: "list" | "cards") => void;
  classes: Class[]; // Receive the list of classes (with subclasses)
  academicYears: AcademicYear[]; // Receive the list of academic years
  isLoadingClasses: boolean; // Receive loading state for classes
}

export const Filters = ({
  searchQuery,
  setSearchQuery,
  selectedClass,
  setSelectedClass,
  selectedAcademicYear,
  setSelectedAcademicYear,
  selectedPaymentStatus, // Destructure status prop
  setSelectedPaymentStatus, // Destructure status setter prop
  handleExportEnhanced, // Enhanced export handler
  onShowSubclassSummary, // Subclass summary handler
  viewMode,
  setViewMode,
  classes,
  academicYears,
  isLoadingClasses,
}: FiltersProps) => {
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  // Close the export menu when clicking outside it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(event.target as Node)) {
        setShowExportDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Prepare class options (top-level classes only)
  const allClasses = classes;

  const handleSubclassSummary = () => {
    if (selectedClass && selectedClass !== 'all' && onShowSubclassSummary) {
      onShowSubclassSummary(selectedClass);
    }
  };

  return (
    <div className="space-y-4">
      {/* Filter Row 1 - Academic Year and Sequence */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Academic Year Filter */}
        <select
          value={selectedAcademicYear}
          onChange={(e) => setSelectedAcademicYear(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="active">Current Academic Year</option>
          {academicYears.map((year) => (
            <option key={year.id} value={year.id}>
              {year.name} {year.isCurrent ? '(Current)' : ''}
            </option>
          ))}
        </select>

        {/* Sequence Filter */}
        {/* Removed Sequence Filter */}
      </div>

      {/* Filter Row 2 - Class, Status, Search, and View Mode */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Search Input */}
        <input
          type="text"
          placeholder="Search student or admission number..."
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />

        {/* Class Filter - Top-level classes */}
        <select
          value={selectedClass} // Expects Class ID
          onChange={(e) => setSelectedClass(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          disabled={isLoadingClasses} // Disable while loading
        >
          <option value="all">All Classes</option>
          {isLoadingClasses ? (
            <option value="" disabled>Loading classes...</option>
          ) : (
            allClasses.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name}
              </option>
            ))
          )}
        </select>

        {/* Payment Status Filter */}
        <select
          value={selectedPaymentStatus}
          onChange={(e) => setSelectedPaymentStatus(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Statuses</option>
          <option value="paid">Paid</option>
          <option value="partial">Partial</option>
          <option value="unpaid">Unpaid</option>
        </select>

        {/* View Mode Toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode("list")}
            className={`px-4 py-2 rounded-lg ${viewMode === "list"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-600"
              }`}
          >
            List View
          </button>
          <button
            onClick={() => setViewMode("cards")}
            className={`px-4 py-2 rounded-lg ${viewMode === "cards"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-600"
              }`}
          >
            Card View
          </button>
        </div>
      </div>

      {/* Actions Row */}
      <div className="flex justify-between items-center">
        {/* Left side - Class Summary (optional) */}
        <div>
          {selectedClass && selectedClass !== 'all' && onShowSubclassSummary && (
            <button
              onClick={handleSubclassSummary}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <ChartBarIcon className="h-5 w-5" />
              Class Summary
            </button>
          )}
        </div>

        {/* Right side - single Export button with a format menu */}
        <div ref={exportRef} className="relative">
          <button
            onClick={() => setShowExportDropdown(prev => !prev)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            <DocumentArrowDownIcon className="h-5 w-5" />
            Export
            <ChevronDownIcon className={`h-4 w-4 transition-transform ${showExportDropdown ? 'rotate-180' : ''}`} />
          </button>
          {showExportDropdown && (
            <div className="absolute right-0 z-30 mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
              {([
                { format: 'xlsx' as const, reportType: 'detailed' as const, label: 'Student list — Excel', Icon: TableCellsIcon },
                { format: 'pdf' as const, reportType: 'detailed' as const, label: 'Student list — PDF', Icon: DocumentArrowDownIcon },
                { format: 'docx' as const, reportType: 'detailed' as const, label: 'Student list — Word', Icon: DocumentTextIcon },
                { format: 'csv' as const, reportType: 'detailed' as const, label: 'Student list — CSV', Icon: DocumentTextIcon },
                { format: 'xlsx' as const, reportType: 'summary' as const, label: 'Class summary — Excel', Icon: TableCellsIcon },
                { format: 'xlsx' as const, reportType: 'analytics' as const, label: 'Payment methods — Excel', Icon: TableCellsIcon },
              ]).map(({ format, reportType, label, Icon }, index) => (
                <button
                  key={`${reportType}-${format}`}
                  onClick={() => {
                    handleExportEnhanced?.(format, reportType);
                    setShowExportDropdown(false);
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 text-left ${index === 4 ? 'border-t border-gray-100' : ''}`}
                >
                  <Icon className="h-4 w-4 text-gray-400" />
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};