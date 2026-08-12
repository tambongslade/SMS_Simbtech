'use client';

import React from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import type { TeacherSearchMeta } from '@/lib/teacherSearchApi';

interface TeacherPaginationProps {
    meta: TeacherSearchMeta;
    onPageChange: (page: number) => void;
    isLoading?: boolean;
}

export const TeacherPagination: React.FC<TeacherPaginationProps> = ({ meta, onPageChange, isLoading }) => {
    if (meta.total === 0) return null;

    const first = (meta.page - 1) * meta.limit + 1;
    const last = Math.min(meta.page * meta.limit, meta.total);
    const buttonClass =
        'inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed';

    return (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white rounded-lg shadow-sm px-4 py-3 mt-4">
            <p className="text-sm text-gray-600">
                Showing <span className="font-medium">{first}</span>–<span className="font-medium">{last}</span> of{' '}
                <span className="font-medium">{meta.total}</span>
            </p>
            <div className="flex items-center gap-2">
                <button
                    type="button"
                    className={buttonClass}
                    onClick={() => onPageChange(meta.page - 1)}
                    disabled={isLoading || meta.page <= 1}
                >
                    <ChevronLeftIcon className="h-4 w-4 mr-1" />
                    Previous
                </button>
                <span className="text-sm text-gray-600 px-1">
                    Page {meta.page} of {meta.totalPages}
                </span>
                <button
                    type="button"
                    className={buttonClass}
                    onClick={() => onPageChange(meta.page + 1)}
                    disabled={isLoading || meta.page >= meta.totalPages}
                >
                    Next
                    <ChevronRightIcon className="h-4 w-4 ml-1" />
                </button>
            </div>
        </div>
    );
};
