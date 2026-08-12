'use client';

import React from 'react';
import type { TeacherSearchItem } from '@/lib/teacherSearchApi';

interface TeacherTableProps {
    teachers: TeacherSearchItem[];
    isLoading: boolean;
    /** Row actions (buttons) rendered per teacher; omit for a read-only table. */
    renderActions?: (teacher: TeacherSearchItem) => React.ReactNode;
    emptyMessage?: string;
}

const Avatar: React.FC<{ teacher: TeacherSearchItem }> = ({ teacher }) => (
    <span className="inline-block h-8 w-8 rounded-full overflow-hidden bg-gray-100 mr-3 flex-shrink-0">
        {teacher.photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="h-full w-full object-cover" src={teacher.photo} alt="" />
        ) : (
            <svg className="h-full w-full text-gray-300" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
        )}
    </span>
);

const Chip: React.FC<{ children: React.ReactNode; tone?: 'gray' | 'indigo' | 'emerald' }> = ({
    children,
    tone = 'gray',
}) => {
    const tones = {
        gray: 'bg-gray-100 text-gray-700',
        indigo: 'bg-indigo-100 text-indigo-700',
        emerald: 'bg-emerald-100 text-emerald-700',
    };
    return (
        <span className={`text-xs px-2 py-0.5 rounded-full inline-block mr-1 mb-1 ${tones[tone]}`}>{children}</span>
    );
};

const RoleBadges: React.FC<{ teacher: TeacherSearchItem }> = ({ teacher }) => {
    if (!teacher.isHod && !teacher.isClassMaster) return null;
    return (
        <span className="ml-2 inline-flex flex-wrap">
            {teacher.isHod && (
                <Chip tone="indigo">
                    HOD{teacher.hodSubjects.length > 0 ? ` · ${teacher.hodSubjects.map((s) => s.name).join(', ')}` : ''}
                </Chip>
            )}
            {teacher.isClassMaster && (
                <Chip tone="emerald">
                    CM{teacher.classMasterOf.length > 0 ? ` · ${teacher.classMasterOf.map((c) => c.name).join(', ')}` : ''}
                </Chip>
            )}
        </span>
    );
};

const SubjectList: React.FC<{ subjects: TeacherSearchItem['subjects'] }> = ({ subjects }) =>
    subjects.length > 0 ? (
        <span className="inline-flex flex-wrap max-w-xs">
            {subjects.map((s) => (
                <Chip key={s.id}>{s.name}</Chip>
            ))}
        </span>
    ) : (
        <span className="text-gray-400 italic">None</span>
    );

export const TeacherTable: React.FC<TeacherTableProps> = ({
    teachers,
    isLoading,
    renderActions,
    emptyMessage = 'No teachers found matching your criteria',
}) => {
    const columnCount = renderActions ? 7 : 6;

    const body = () => {
        if (isLoading && teachers.length === 0) {
            return (
                <tr>
                    <td colSpan={columnCount} className="px-4 py-8 text-center text-gray-500">
                        Loading teachers…
                    </td>
                </tr>
            );
        }
        if (teachers.length === 0) {
            return (
                <tr>
                    <td colSpan={columnCount} className="px-4 py-8 text-center text-gray-500">
                        {emptyMessage}
                    </td>
                </tr>
            );
        }
        return teachers.map((teacher) => (
            <tr key={teacher.id} className="hover:bg-gray-50">
                <td className="px-4 py-4 text-sm font-medium text-gray-900">
                    <div className="flex items-center">
                        <Avatar teacher={teacher} />
                        <span>
                            {teacher.name}
                            <RoleBadges teacher={teacher} />
                        </span>
                    </div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{teacher.matricule || '—'}</td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{teacher.email || '—'}</td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{teacher.phone || '—'}</td>
                <td className="px-4 py-4 text-sm text-gray-500">
                    <SubjectList subjects={teacher.subjects} />
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    {teacher.totalHoursPerWeek ?? 0} h
                </td>
                {renderActions && (
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        {renderActions(teacher)}
                    </td>
                )}
            </tr>
        ));
    };

    return (
        <>
            {/* Desktop */}
            <div className={`hidden md:block bg-white shadow-md rounded-lg overflow-x-auto ${isLoading ? 'opacity-60' : ''}`}>
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            {['Name', 'Matricule', 'Email', 'Phone', 'Assigned Subjects', 'Hours/Week'].map((header) => (
                                <th
                                    key={header}
                                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                >
                                    {header}
                                </th>
                            ))}
                            {renderActions && (
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            )}
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">{body()}</tbody>
                </table>
            </div>

            {/* Mobile */}
            <div className={`md:hidden divide-y divide-gray-100 bg-white shadow-md rounded-lg ${isLoading ? 'opacity-60' : ''}`}>
                {isLoading && teachers.length === 0 ? (
                    <div className="px-4 py-8 text-center text-gray-500">Loading teachers…</div>
                ) : teachers.length === 0 ? (
                    <div className="px-4 py-8 text-center text-gray-500">{emptyMessage}</div>
                ) : (
                    teachers.map((teacher) => (
                        <div key={teacher.id} className="p-4 space-y-1.5">
                            <div className="flex items-center">
                                <Avatar teacher={teacher} />
                                <span className="text-sm font-semibold text-gray-900 break-words">{teacher.name}</span>
                            </div>
                            <div className="flex flex-wrap">
                                <RoleBadges teacher={teacher} />
                            </div>
                            {[
                                ['Matricule', teacher.matricule || '—'],
                                ['Email', teacher.email || '—'],
                                ['Phone', teacher.phone || '—'],
                                ['Hours/Week', `${teacher.totalHoursPerWeek ?? 0} h`],
                            ].map(([label, value]) => (
                                <div key={label} className="flex items-start justify-between gap-3">
                                    <span className="text-xs text-gray-500">{label}</span>
                                    <span className="text-sm text-gray-900 text-right break-words">{value}</span>
                                </div>
                            ))}
                            <div className="flex items-start justify-between gap-3">
                                <span className="text-xs text-gray-500">Subjects</span>
                                <span className="text-sm text-gray-900 text-right">
                                    <SubjectList subjects={teacher.subjects} />
                                </span>
                            </div>
                            {renderActions && <div className="flex flex-wrap gap-2 pt-1.5">{renderActions(teacher)}</div>}
                        </div>
                    ))
                )}
            </div>
        </>
    );
};
