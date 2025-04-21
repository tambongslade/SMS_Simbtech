"use client";

import { useState } from "react";
// Assuming Class and Term types are available or imported
import { Class, SubClass } from "@/app/dashboard/super-manager/classes/types/class"; // Assuming SubClass is exported here
import { Term } from "@/app/dashboard/super-manager/academic-years/types/academic-year";
import { DocumentArrowDownIcon, TableCellsIcon } from '@heroicons/react/24/outline'; // Import icons

interface FiltersProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedClass: string; // Should hold the selected SubClass ID or 'all'
  setSelectedClass: (classId: string) => void;
  selectedTerm: string; // Should hold the selected Term ID or 'all'
  setSelectedTerm: (termId: string) => void;
  selectedPaymentStatus: string; // Add status prop
  setSelectedPaymentStatus: (status: string) => void; // Add status setter prop
  handleExportPDF: () => void; // Add PDF handler prop
  handleExportExcel: () => void; // Add Excel handler prop
  viewMode: "list" | "cards";
  setViewMode: (mode: "list" | "cards") => void;
  classes: Class[]; // Receive the list of classes (with subclasses)
  terms: Term[]; // Receive the list of terms
  isLoadingClasses: boolean; // Receive loading state for classes
}

export const Filters = ({
  searchQuery,
  setSearchQuery,
  selectedClass,
  setSelectedClass,
  selectedTerm,
  setSelectedTerm,
  selectedPaymentStatus, // Destructure status prop
  setSelectedPaymentStatus, // Destructure status setter prop
  handleExportPDF, // Destructure PDF handler
  handleExportExcel, // Destructure Excel handler
  viewMode,
  setViewMode,
  classes,
  terms,
  isLoadingClasses,
}: FiltersProps) => {
  // Flatten classes to get a list of all subclasses for the dropdown
  const allSubClasses: SubClass[] = classes.reduce((acc: SubClass[], currentClass) => {
    if (currentClass.subClasses && currentClass.subClasses.length > 0) {
      return acc.concat(currentClass.subClasses);
    }
    return acc;
  }, []);

  return (
    <div className="space-y-4">
      {/* Filter Row */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
              <option key={subClass.id} value={subClass.id}> {/* Use SubClass ID as value */}
                {subClass.name}
              </option>
            ))
          )}
        </select>

        {/* Term Filter - Populated from fetched data */}
        <select
          value={selectedTerm} // Expects Term ID
          onChange={(e) => setSelectedTerm(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          // Assuming terms load quickly with academic year, not disabling yet
        >
          <option value="all">All Terms</option>
          {terms && terms.map((term) => (
            <option key={term.id} value={term.id!}> {/* Use Term ID as value, assert non-null if confident */}
              {term.name}
            </option>
          ))}
        </select>

        {/* Payment Status Filter */}
        <select
          value={selectedPaymentStatus}
          onChange={(e) => setSelectedPaymentStatus(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Statuses</option>
          <option value="Paid">Paid</option>
          <option value="Partial">Partial</option>
          <option value="Unpaid">Unpaid</option>
        </select>

        {/* View Mode Toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode("list")}
            className={`px-4 py-2 rounded-lg ${
              viewMode === "list"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            List View
          </button>
          <button
            onClick={() => setViewMode("cards")}
            className={`px-4 py-2 rounded-lg ${
              viewMode === "cards"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            Card View
          </button>
        </div>
      </div>
      
      {/* Export Buttons Row */}
      <div className="flex justify-end gap-3">
        <button
          onClick={handleExportExcel}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50"
          // Add disabled state if needed, e.g., based on if data is loaded
        >
          <TableCellsIcon className="h-5 w-5" />
          Export Excel
        </button>
        <button
          onClick={handleExportPDF}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50"
           // Add disabled state if needed
        >
          <DocumentArrowDownIcon className="h-5 w-5" />
          Export PDF
        </button>
      </div>
    </div>
  );
};