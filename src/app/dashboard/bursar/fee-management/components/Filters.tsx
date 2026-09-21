"use client";

import { useEffect, useRef, useState } from "react";
// Assuming Class and Term types are available or imported
import { Class, SubClass } from "@/app/dashboard/super-manager/classes/types/class"; // Assuming SubClass is exported here
import { DocumentArrowDownIcon, TableCellsIcon, ChartBarIcon, DocumentTextIcon, ChevronDownIcon } from '@heroicons/react/24/outline'; // Import icons
import { sortClassesByLevel } from '@/lib/classOrdering';
import { useLanguage } from '@/components/context/LanguageContext';

interface FiltersProps {
  sortMode?: 'latest' | 'name' | 'balance';
  setSortMode?: (mode: 'latest' | 'name' | 'balance') => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedClass: string; // Should hold the selected SubClass ID or 'all'
  setSelectedClass: (classId: string) => void;
  selectedPaymentStatus: string; // Add status prop
  setSelectedPaymentStatus: (status: string) => void; // Add status setter prop
  handleExportEnhanced?: (format: 'csv' | 'pdf' | 'xlsx' | 'docx', reportType?: 'detailed' | 'summary' | 'analytics') => void; // Fee report export handler
  onShowSubclassSummary?: (subClassId: string) => void; // Subclass summary handler
  viewMode: "list" | "cards";
  setViewMode: (mode: "list" | "cards") => void;
  classes: Class[]; // Receive the list of classes (with subclasses)
  isLoadingClasses: boolean; // Receive loading state for classes
}

type ExportFormat = 'xlsx' | 'pdf' | 'docx' | 'csv';
type ExportReportType = 'detailed' | 'summary' | 'analytics';

export const Filters = ({
  searchQuery,
  setSearchQuery,
  selectedClass,
  setSelectedClass,
  selectedPaymentStatus, // Destructure status prop
  setSelectedPaymentStatus, // Destructure status setter prop
  sortMode,
  setSortMode,
  handleExportEnhanced, // Enhanced export handler
  onShowSubclassSummary, // Subclass summary handler
  viewMode,
  setViewMode,
  classes,
  isLoadingClasses,
}: FiltersProps) => {
  const { t } = useLanguage();
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  const EXPORT_OPTIONS: { format: ExportFormat; reportType: ExportReportType; label: string; icon: typeof TableCellsIcon }[] = [
    { format: 'xlsx', reportType: 'detailed', label: t('Student list — Excel'), icon: TableCellsIcon },
    { format: 'pdf', reportType: 'detailed', label: t('Student list — PDF'), icon: DocumentArrowDownIcon },
    { format: 'docx', reportType: 'detailed', label: t('Student list — Word'), icon: DocumentTextIcon },
    { format: 'csv', reportType: 'detailed', label: t('Student list — CSV'), icon: DocumentTextIcon },
    { format: 'xlsx', reportType: 'summary', label: t('Class summary — Excel'), icon: TableCellsIcon },
    { format: 'xlsx', reportType: 'analytics', label: t('Payment methods — Excel'), icon: TableCellsIcon },
  ];

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

  // Use top-level classes for filter
  const allClasses = sortClassesByLevel(classes);

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

      {/* Filter Row 2 - Class, Status, Sort, Search, and View Mode */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {/* Search Input */}
        <input
          type="text"
          placeholder={t('Search student or admission number...')}
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
          <option value="all">{t('All Classes')}</option>
          {isLoadingClasses ? (
            <option value="" disabled>{t('Loading classes...')}</option>
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
          <option value="all">{t('All Statuses')}</option>
          <option value="paid">{t('Paid')}</option>
          <option value="partial">{t('Partial')}</option>
          <option value="unpaid">{t('Unpaid')}</option>
        </select>

        {/* Sort */}
        {setSortMode && (
          <select
            value={sortMode || 'latest'}
            onChange={(e) => setSortMode(e.target.value as 'latest' | 'name' | 'balance')}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            title={t('Sort order')}
          >
            <option value="latest">{t('Latest registered first')}</option>
            <option value="name">{t('Name (A–Z)')}</option>
            <option value="balance">{t('Highest balance first')}</option>
          </select>
        )}

        {/* View Mode Toggle (desktop only — phones always show cards) */}
        <div className="hidden md:flex gap-2">
          <button
            onClick={() => setViewMode("list")}
            className={`px-4 py-2 rounded-lg ${viewMode === "list"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-600"
              }`}
          >
            {t('List View')}
          </button>
          <button
            onClick={() => setViewMode("cards")}
            className={`px-4 py-2 rounded-lg ${viewMode === "cards"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-600"
              }`}
          >
            {t('Card View')}
          </button>
        </div>
      </div>

      {/* Actions Row */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        {/* Left side - Subclass Summary */}
        <div>
          {selectedClass && selectedClass !== 'all' && (
            <button
              onClick={handleSubclassSummary}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <ChartBarIcon className="h-5 w-5" />
              {t('Subclass Summary')}
            </button>
          )}
        </div>

        {/* Right side - single Export button with a format menu */}
        <div ref={exportRef} className="relative">
          <button
            onClick={() => setShowExportDropdown(prev => !prev)}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            <DocumentArrowDownIcon className="h-5 w-5" />
            {t('Export')}
            <ChevronDownIcon className={`h-4 w-4 transition-transform ${showExportDropdown ? 'rotate-180' : ''}`} />
          </button>
          {showExportDropdown && (
            <div className="absolute right-0 z-30 mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
              {EXPORT_OPTIONS.map(({ format, reportType, label, icon: Icon }, index) => (
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