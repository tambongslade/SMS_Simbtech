"use client";

import { useState } from "react";
// Assuming Class and Term types are available or imported
import { Class, SubClass } from "@/app/dashboard/super-manager/classes/types/class"; // Assuming SubClass is exported here
import { DocumentArrowDownIcon, TableCellsIcon, ChartBarIcon, DocumentTextIcon } from '@heroicons/react/24/outline'; // Import icons

interface FiltersProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedClass: string; // Should hold the selected SubClass ID or 'all'
  setSelectedClass: (classId: string) => void;
  selectedPaymentStatus: string; // Add status prop
  setSelectedPaymentStatus: (status: string) => void; // Add status setter prop
  handleExportPDF: () => void; // Add PDF handler prop
  handleExportExcel: () => void; // Add Excel handler prop
  handleExportEnhanced?: (format: 'csv' | 'pdf' | 'docx') => void; // Enhanced export handler
  onShowSubclassSummary?: (subClassId: string) => void; // Subclass summary handler
  viewMode: "list" | "cards";
  setViewMode: (mode: "list" | "cards") => void;
  classes: Class[]; // Receive the list of classes (with subclasses)
  isLoadingClasses: boolean; // Receive loading state for classes
}

export const Filters = ({
  searchQuery,
  setSearchQuery,
  selectedClass,
  setSelectedClass,
  selectedPaymentStatus, // Destructure status prop
  setSelectedPaymentStatus, // Destructure status setter prop
  handleExportPDF, // Destructure PDF handler
  handleExportExcel, // Destructure Excel handler
  handleExportEnhanced, // Enhanced export handler
  onShowSubclassSummary, // Subclass summary handler
  viewMode,
  setViewMode,
  classes,
  isLoadingClasses,
}: FiltersProps) => {
  const [showExportDropdown, setShowExportDropdown] = useState(false);

  // Flatten classes to get a list of all subclasses for the dropdown
  const allSubClasses: SubClass[] = classes.reduce((acc: SubClass[], currentClass) => {
    if (currentClass.subClasses && currentClass.subClasses.length > 0) {
      return acc.concat(currentClass.subClasses);
    }
    return acc;
  }, []);

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
        {/* Removed Academic Year Filter */}

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

        {/* Class Filter - Populated from fetched data */}
        <select
          value={selectedClass} // Expects SubClass ID
          onChange={(e) => setSelectedClass(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          disabled={isLoadingClasses} // Disable while loading
        >
          <option value="all">All Classes</option>
          {isLoadingClasses ? (
            <option value="" disabled>Loading classes...</option>
          ) : (
            allSubClasses.map((subClass) => (
              <option key={subClass.id} value={subClass.id}>
                {subClass.name}
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
        {/* Left side - Subclass Summary */}
        <div>
          {selectedClass && selectedClass !== 'all' && (
            <button
              onClick={handleSubclassSummary}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <ChartBarIcon className="h-5 w-5" />
              Subclass Summary
            </button>
          )}
        </div>

        {/* Right side - Export Options */}
        <div className="flex gap-3">

          {/* Legacy Export Buttons */}
          <button
            // onClick={handleExportExcel}
            onClick={() => {
              handleExportEnhanced?.('docx');
              setShowExportDropdown(false);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
          >
            <DocumentTextIcon className="h-5 w-5" />
            Export Word
          </button>
          {/* Legacy Export Buttons */}
          <button
            // onClick={handleExportExcel}
            onClick={() => {
              handleExportEnhanced?.('csv');
              setShowExportDropdown(false);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50"
          >
            <TableCellsIcon className="h-5 w-5" />
            Export Excel
          </button>
          <button
            // onClick={handleExportPDF}
            onClick={() => {
              handleExportEnhanced?.('pdf');
              setShowExportDropdown(false);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50"
          >
            <DocumentArrowDownIcon className="h-5 w-5" />
            Export PDF
          </button>
        </div>
      </div>
    </div>
  );
};