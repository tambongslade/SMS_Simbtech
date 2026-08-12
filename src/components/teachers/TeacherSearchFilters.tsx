'use client';

import React, { useState } from 'react';
import {
    MagnifyingGlassIcon,
    AdjustmentsHorizontalIcon,
    XMarkIcon,
    UsersIcon,
} from '@heroicons/react/24/outline';
import type { UseTeacherSearchResult, FilterOption, SubClassOption } from '@/hooks/useTeacherSearch';

interface TeacherSearchFiltersProps {
    search: UseTeacherSearchResult;
    subjects: FilterOption[];
    subClasses: SubClassOption[];
    /** Hide filters the current role cannot act on. */
    showAdvanced?: boolean;
    searchPlaceholder?: string;
}

const selectClass =
    'block w-full pl-3 pr-10 py-2 border border-gray-300 bg-white rounded-md shadow-sm text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500';
const labelClass = 'block text-sm font-medium text-gray-700 mb-1.5';

/** Tri-state select: '' = any, 'true'/'false' = the boolean filter. */
const boolValue = (value?: boolean) => (value === undefined ? '' : String(value));
const parseBool = (value: string): boolean | undefined => (value === '' ? undefined : value === 'true');

export const TeacherSearchFilters: React.FC<TeacherSearchFiltersProps> = ({
    search,
    subjects,
    subClasses,
    showAdvanced = true,
    searchPlaceholder = 'Search by name, email, matricule or phone…',
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const { filters, setFilter, meta, isLoading, searchHint } = search;

    return (
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 mb-6 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center gap-3">
                {/* The input is never disabled — disabling it mid-request steals focus
                    and makes the page feel like it reloaded on every keystroke. */}
                <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                        id="teacher-search"
                        type="search"
                        autoComplete="off"
                        placeholder={searchPlaceholder}
                        value={search.searchInput}
                        onChange={(e) => search.setSearchInput(e.target.value)}
                        onKeyDown={(e) => {
                            // Some browsers submit/reload on Enter inside a form.
                            if (e.key === 'Enter') e.preventDefault();
                        }}
                        className="block w-full pl-10 pr-9 py-2 border border-gray-300 rounded-md bg-white placeholder-gray-500 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                    {search.searchInput && (
                        <button
                            type="button"
                            onClick={() => search.setSearchInput('')}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                            aria-label="Clear search"
                        >
                            <XMarkIcon className="h-4 w-4" />
                        </button>
                    )}
                </div>

                {showAdvanced && (
                    <button
                        type="button"
                        onClick={() => setIsExpanded((open) => !open)}
                        className="inline-flex items-center justify-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                        <AdjustmentsHorizontalIcon className="h-4 w-4 mr-1.5" />
                        {isExpanded ? 'Hide filters' : 'Filters'}
                    </button>
                )}

                <div className="flex items-center text-sm text-gray-600 md:justify-end md:min-w-[9rem]">
                    {isLoading ? (
                        <>
                            <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-500 mr-2" />
                            <span className="italic">Searching…</span>
                        </>
                    ) : (
                        <>
                            <UsersIcon className="h-4 w-4 text-gray-400 mr-1.5" />
                            <span className="font-medium">{meta.total}</span>
                            <span className="ml-1">teacher{meta.total === 1 ? '' : 's'} found</span>
                        </>
                    )}
                </div>
            </div>

            {searchHint && <p className="text-xs text-gray-500">{searchHint}</p>}
            {search.degraded && (
                <p className="text-xs text-amber-600">
                    Advanced teacher search is unavailable on this server — showing basic results.
                </p>
            )}

            {showAdvanced && isExpanded && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-gray-100">
                    <div>
                        <label className={labelClass} htmlFor="filter-subject">Subject</label>
                        <select
                            id="filter-subject"
                            className={selectClass}
                            value={filters.subjectId ?? ''}
                            onChange={(e) => setFilter('subjectId', e.target.value ? Number(e.target.value) : undefined)}
                        >
                            <option value="">All subjects</option>
                            {subjects.map((s) => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className={labelClass} htmlFor="filter-subclass">Class</label>
                        <select
                            id="filter-subclass"
                            className={selectClass}
                            value={filters.subClassId ?? ''}
                            onChange={(e) => setFilter('subClassId', e.target.value ? Number(e.target.value) : undefined)}
                        >
                            <option value="">All classes</option>
                            {subClasses.map((sc) => (
                                <option key={sc.id} value={sc.id}>
                                    {sc.className ? `${sc.className} — ${sc.name}` : sc.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className={labelClass} htmlFor="filter-status">Status</label>
                        <select
                            id="filter-status"
                            className={selectClass}
                            value={filters.status ?? ''}
                            onChange={(e) => setFilter('status', (e.target.value || undefined) as never)}
                        >
                            <option value="">Any status</option>
                            <option value="ACTIVE">Active</option>
                            <option value="INACTIVE">Inactive</option>
                            <option value="SUSPENDED">Suspended</option>
                        </select>
                    </div>

                    <div>
                        <label className={labelClass} htmlFor="filter-gender">Gender</label>
                        <select
                            id="filter-gender"
                            className={selectClass}
                            value={filters.gender ?? ''}
                            onChange={(e) => setFilter('gender', (e.target.value || undefined) as never)}
                        >
                            <option value="">Any gender</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                        </select>
                    </div>

                    <div>
                        <label className={labelClass} htmlFor="filter-hod">Head of Department</label>
                        <select
                            id="filter-hod"
                            className={selectClass}
                            value={boolValue(filters.isHod)}
                            onChange={(e) => setFilter('isHod', parseBool(e.target.value))}
                        >
                            <option value="">All teachers</option>
                            <option value="true">HODs only</option>
                            <option value="false">Exclude HODs</option>
                        </select>
                    </div>

                    <div>
                        <label className={labelClass} htmlFor="filter-classmaster">Class master</label>
                        <select
                            id="filter-classmaster"
                            className={selectClass}
                            value={boolValue(filters.isClassMaster)}
                            onChange={(e) => setFilter('isClassMaster', parseBool(e.target.value))}
                        >
                            <option value="">All teachers</option>
                            <option value="true">Class masters only</option>
                            <option value="false">Exclude class masters</option>
                        </select>
                    </div>

                    <div>
                        <label className={labelClass} htmlFor="filter-assignments">Assignments</label>
                        <select
                            id="filter-assignments"
                            className={selectClass}
                            value={boolValue(filters.hasAssignments)}
                            onChange={(e) => setFilter('hasAssignments', parseBool(e.target.value))}
                        >
                            <option value="">Any</option>
                            <option value="true">With assignments</option>
                            <option value="false">Without assignments</option>
                        </select>
                    </div>

                    <div>
                        <label className={labelClass} htmlFor="filter-sort">Sort by</label>
                        <div className="flex gap-2">
                            <select
                                id="filter-sort"
                                className={selectClass}
                                value={filters.sortBy ?? 'name'}
                                onChange={(e) => setFilter('sortBy', e.target.value as never)}
                            >
                                <option value="name">Name</option>
                                <option value="matricule">Matricule</option>
                                <option value="email">Email</option>
                                <option value="totalHoursPerWeek">Hours / week</option>
                                <option value="createdAt">Date added</option>
                                <option value="lastSeenAt">Last seen</option>
                            </select>
                            <select
                                aria-label="Sort order"
                                className={selectClass}
                                value={filters.sortOrder ?? 'asc'}
                                onChange={(e) => setFilter('sortOrder', e.target.value as never)}
                            >
                                <option value="asc">Asc</option>
                                <option value="desc">Desc</option>
                            </select>
                        </div>
                    </div>

                    <div className="sm:col-span-2 lg:col-span-2">
                        <label className={labelClass}>Weekly hours</label>
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                min={0}
                                placeholder="Min"
                                value={filters.minHoursPerWeek ?? ''}
                                onChange={(e) => setFilter('minHoursPerWeek', e.target.value ? Number(e.target.value) : undefined)}
                                className="block w-full py-2 px-3 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                            />
                            <span className="text-gray-400">–</span>
                            <input
                                type="number"
                                min={0}
                                placeholder="Max"
                                value={filters.maxHoursPerWeek ?? ''}
                                onChange={(e) => setFilter('maxHoursPerWeek', e.target.value ? Number(e.target.value) : undefined)}
                                className="block w-full py-2 px-3 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                    </div>

                    <div className="flex items-end sm:col-span-2 lg:col-span-2">
                        <button
                            type="button"
                            onClick={search.resetFilters}
                            disabled={!search.hasActiveFilters}
                            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                        >
                            <XMarkIcon className="h-4 w-4 mr-1.5" />
                            Clear all filters
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
