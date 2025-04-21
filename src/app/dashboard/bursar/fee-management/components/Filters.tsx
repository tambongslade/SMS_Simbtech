"use client";

import { useState } from "react";

interface FiltersProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedClass: string;
  setSelectedClass: (className: string) => void;
  selectedTerm: string;
  setSelectedTerm: (term: string) => void;
  viewMode: "list" | "cards";
  setViewMode: (mode: "list" | "cards") => void;
}

export const Filters = ({
  searchQuery,
  setSearchQuery,
  selectedClass,
  setSelectedClass,
  selectedTerm,
  setSelectedTerm,
  viewMode,
  setViewMode,
}: FiltersProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {/* Search Input */}
      <input
        type="text"
        placeholder="Search student or admission number..."
        className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />

      {/* Class Filter */}
      <select
        value={selectedClass}
        onChange={(e) => setSelectedClass(e.target.value)}
        className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="all">All Classes</option>
        <option value="10A">Class 10A</option>
        <option value="9B">Class 9B</option>
      </select>

      {/* Term Filter */}
      <select
        value={selectedTerm}
        onChange={(e) => setSelectedTerm(e.target.value)}
        className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="2023-2024-2">Term 2 (2023-2024)</option>
        <option value="2023-2024-1">Term 1 (2023-2024)</option>
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
  );
};