'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { CalendarDaysIcon, ClockIcon, AcademicCapIcon, BuildingLibraryIcon, ViewColumnsIcon, CalendarIcon } from '@heroicons/react/24/outline';
import { Card, CardBody, CardHeader, CardTitle, Badge, Button } from "@/components/ui";
import apiService from '../../../../lib/apiService';
import { toast } from 'react-hot-toast';
import useSWR from 'swr';

const DAYS_ORDER = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];
const DAY_NAMES = {
    'MONDAY': 'Monday',
    'TUESDAY': 'Tuesday',
    'WEDNESDAY': 'Wednesday',
    'THURSDAY': 'Thursday',
    'FRIDAY': 'Friday'
};

interface TimeSlot {
    id: number;
    teacherId: number;
    subjectId: number;
    periodId: number;
    academicYearId: number;
    assignedById: number;
    subClassId: number;
    period: {
        id: number;
        dayOfWeek: string;
        startTime: string;
        endTime: string;
        isBreak: boolean;
        name: string;
    };
    subject: {
        id: number;
        name: string;
        category: string;
    };
    subClass: {
        id: number;
        name: string;
        currentStudents: number;
        classId: number;
        class: {
            id: number;
            name: string;
        };
    };
}

interface Period {
    id: number;
    name: string;
    dayOfWeek: string;
    startTime: string;
    endTime: string;
    isBreak: boolean;
}

interface TimetableStats {
    totalClasses: number;
    totalSubjects: number;
    weeklyHours: number;
    todayClasses: number;
}

interface TeacherTimetableResponse {
    success: boolean;
    data: {
        summary: TimetableStats;
        schedule: TimeSlot[];
    }
}

type ViewMode = 'daily' | 'weekly';

export default function TeacherTimetablePage() {
    const [isMounted, setIsMounted] = useState(false);
    const [viewMode, setViewMode] = useState<ViewMode>('weekly');
    const [selectedDate, setSelectedDate] = useState(new Date());

    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Get current day name
    const getCurrentDay = () => {
        const today = new Date();
        const dayName = today.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
        return dayName;
    };

    // Fetch teacher's timetable
    const {
        data: timetableResponse,
        error: timetableError,
        isLoading: isLoadingTimetable,
    } = useSWR<TeacherTimetableResponse>(
        '/teachers/me/timetable',
        (url: string) => apiService.get(url)
    );

    // Fetch all school periods to build the grid
    const {
        data: periodsData,
        error: periodsError,
        isLoading: isLoadingPeriods,
    } = useSWR<{ success: boolean; data: Period[] }>(
        '/periods',
        (url: string) => apiService.get(url)
    );

    const schedule = timetableResponse?.data?.schedule || [];
    const summary = timetableResponse?.data?.summary;
    const allPeriods = periodsData?.data || [];

    // Process errors
    useEffect(() => {
        if (timetableError) {
            console.error('Timetable Fetch Error:', timetableError);
            toast.error('Failed to load your timetable.');
        }
        if (periodsError) {
            console.error('Periods Fetch Error:', periodsError);
            toast.error('Failed to load timetable structure.');
        }
    }, [timetableError, periodsError]);

    // Group all periods by time range to create unique rows, sorted by time
    const uniqueTimeSlots = useMemo(() => {
        const timeGroups: { [timeRange: string]: any } = {};
        allPeriods.forEach(slot => {
            const timeRange = `${slot.startTime}-${slot.endTime}`;
            if (!timeGroups[timeRange]) {
                timeGroups[timeRange] = {
                    startTime: slot.startTime,
                    endTime: slot.endTime,
                    isBreak: slot.isBreak,
                    timeRange: timeRange,
                };
            }
        });
        return Object.values(timeGroups).sort((a, b) => a.startTime.localeCompare(b.startTime));
    }, [allPeriods]);

    // Get today's schedule for daily view - group by time slots
    const todaySchedule = useMemo(() => {
        const currentDay = getCurrentDay();
        const todayClasses = schedule.filter(slot => slot.period.dayOfWeek === currentDay);

        // Group classes by time slot
        const timeSlotGroups: { [timeRange: string]: TimeSlot[] } = {};
        todayClasses.forEach(classItem => {
            const timeRange = `${classItem.period.startTime}-${classItem.period.endTime}`;
            if (!timeSlotGroups[timeRange]) {
                timeSlotGroups[timeRange] = [];
            }
            timeSlotGroups[timeRange].push(classItem);
        });

        // Convert to array and sort by time
        return Object.entries(timeSlotGroups)
            .map(([timeRange, classes]) => ({
                timeRange,
                startTime: classes[0].period.startTime,
                endTime: classes[0].period.endTime,
                classes
            }))
            .sort((a, b) => a.startTime.localeCompare(b.startTime));
    }, [schedule]);

    const getSubjectColor = (subjectName: string): string => {
        const colors = [
            'bg-blue-100 text-blue-800 border-blue-500',
            'bg-green-100 text-green-800 border-green-500',
            'bg-purple-100 text-purple-800 border-purple-500',
            'bg-yellow-100 text-yellow-800 border-yellow-500',
            'bg-red-100 text-red-800 border-red-500',
            'bg-indigo-100 text-indigo-800 border-indigo-500',
            'bg-pink-100 text-pink-800 border-pink-500',
        ];
        const hash = subjectName.split('').reduce((a, b) => {
            a = ((a << 5) - a) + b.charCodeAt(0);
            return a & a;
        }, 0);
        return colors[Math.abs(hash) % colors.length];
    };

    const renderCellContent = (day: string, timeSlot: any) => {
        const assignedSlots = schedule.filter(slot =>
            slot.period.dayOfWeek === day &&
            slot.period.startTime === timeSlot.startTime &&
            slot.period.endTime === timeSlot.endTime
        );

        if (timeSlot.isBreak) {
            return (
                <td key={`${day}-${timeSlot.timeRange}`} className="border h-20 bg-gray-100 text-center text-gray-600 font-medium align-middle">
                    <div className="text-xs">Break</div>
                </td>
            );
        }

        if (assignedSlots.length === 0) {
            return <td key={`${day}-${timeSlot.timeRange}`} className="border h-20 bg-white"></td>;
        }

        if (assignedSlots.length === 1) {
            const assignedSlot = assignedSlots[0];
            const subjectName = assignedSlot.subject.name;
            const subClassName = assignedSlot.subClass.class ? `${assignedSlot.subClass.class.name} - ${assignedSlot.subClass.name}` : assignedSlot.subClass.name;

            return (
                <td key={`${day}-${timeSlot.timeRange}`} className={`border h-20 p-1 align-top ${getSubjectColor(subjectName)}`}>
                    <div className="h-full flex flex-col justify-center text-center">
                        <div className="font-semibold text-xs truncate px-1">{subjectName}</div>
                        <div className="text-xs text-gray-600 truncate px-1">{subClassName}</div>
                    </div>
                </td>
            );
        }

        // Handle multiple classes in the same time slot
        const slot1 = assignedSlots[0];
        const slot2 = assignedSlots[1];

        const subject1Name = slot1.subject.name;
        const subject2Name = slot2.subject.name;

        const class1Name = slot1.subClass.class ? `${slot1.subClass.class.name} - ${slot1.subClass.name}` : slot1.subClass.name;
        const class2Name = slot2.subClass.class ? `${slot2.subClass.class.name} - ${slot2.subClass.name}` : slot2.subClass.name;

        const color1 = getSubjectColor(subject1Name);
        const color2 = getSubjectColor(subject2Name);

        return (
            <td key={`${day}-${timeSlot.timeRange}`} className="border h-20 p-0 relative overflow-hidden">
                {/* Split diagonal background */}
                <div className="absolute inset-0">
                    <div
                        className={`absolute inset-0 ${color1}`}
                        style={{
                            clipPath: 'polygon(0 0, 100% 0, 0 100%)'
                        }}
                    ></div>
                    <div
                        className={`absolute inset-0 ${color2}`}
                        style={{
                            clipPath: 'polygon(100% 0, 100% 100%, 0 100%)'
                        }}
                    ></div>
                </div>

                {/* Diagonal line */}
                <div
                    className="absolute border-t-2 border-gray-700 transform rotate-45 origin-center"
                    style={{
                        width: '141%', // sqrt(2) * 100% to cover diagonal
                        top: '50%',
                        left: '-20%',
                        transformOrigin: 'center'
                    }}
                ></div>

                {/* Content for first class (top-left) */}
                <div className="absolute top-0 left-0 w-full h-1/2 flex flex-col justify-center items-start p-1">
                    <div className="text-xs font-semibold truncate max-w-full">{subject1Name}</div>
                    <div className="text-xs text-gray-600 truncate max-w-full">{class1Name}</div>
                </div>

                {/* Content for second class (bottom-right) */}
                <div className="absolute bottom-0 right-0 w-full h-1/2 flex flex-col justify-center items-end p-1">
                    <div className="text-xs font-semibold truncate max-w-full text-right">{subject2Name}</div>
                    <div className="text-xs text-gray-600 truncate max-w-full text-right">{class2Name}</div>
                </div>

                {/* Show additional classes indicator if more than 2 */}
                {assignedSlots.length > 2 && (
                    <div className="absolute top-1 right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
                        +{assignedSlots.length - 2}
                    </div>
                )}
            </td>
        );
    };

    // Daily View Component
    const DailyView = () => {
        const currentDay = getCurrentDay();
        const dayName = DAY_NAMES[currentDay as keyof typeof DAY_NAMES] || currentDay;

        return (
            <div className="bg-white rounded-lg shadow">
                <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-semibold text-gray-900">
                            Today's Schedule - {dayName}
                        </h2>
                        <div className="text-sm text-gray-500">
                            {new Date().toLocaleDateString('en-US', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                            })}
                        </div>
                    </div>

                    {todaySchedule.length === 0 ? (
                        <div className="text-center py-12">
                            <CalendarIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No Classes Today</h3>
                            <p className="text-gray-500">You have no scheduled classes for today.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {todaySchedule.map((timeSlotGroup) => {
                                const timeRange = `${timeSlotGroup.startTime.substring(0, 5)} - ${timeSlotGroup.endTime.substring(0, 5)}`;

                                if (timeSlotGroup.classes.length === 1) {
                                    // Single class in this time slot
                                    const classItem = timeSlotGroup.classes[0];
                                    const subjectName = classItem.subject.name;
                                    const className = classItem.subClass.class ?
                                        `${classItem.subClass.class.name} - ${classItem.subClass.name}` :
                                        classItem.subClass.name;

                                    return (
                                        <div key={timeSlotGroup.timeRange} className={`border border-l-4 rounded-lg p-4 ${getSubjectColor(subjectName).replace('border-', 'border-l-')}`}>
                                            <div className="flex items-center justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center space-x-3">
                                                        <ClockIcon className="h-5 w-5 text-gray-500" />
                                                        <span className="font-semibold text-gray-900">{timeRange}</span>
                                                    </div>
                                                    <div className="mt-2">
                                                        <h3 className="text-lg font-bold text-gray-900">{subjectName}</h3>
                                                        <p className="text-gray-600">{className}</p>
                                                        <p className="text-sm text-gray-500">{classItem.subClass.currentStudents} students</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <Badge variant="outline" className="text-xs">
                                                        {classItem.subject.category.replace(/_/g, ' ')}
                                                    </Badge>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                } else {
                                    // Multiple classes in the same time slot
                                    const class1 = timeSlotGroup.classes[0];
                                    const class2 = timeSlotGroup.classes[1];
                                    const subject1Name = class1.subject.name;
                                    const subject2Name = class2.subject.name;
                                    const class1Name = class1.subClass.class ? `${class1.subClass.class.name} - ${class1.subClass.name}` : class1.subClass.name;
                                    const class2Name = class2.subClass.class ? `${class2.subClass.class.name} - ${class2.subClass.name}` : class2.subClass.name;
                                    const color1 = getSubjectColor(subject1Name);
                                    const color2 = getSubjectColor(subject2Name);

                                    return (
                                        <div key={timeSlotGroup.timeRange} className="border rounded-lg overflow-hidden relative">
                                            {/* Time header */}
                                            <div className="bg-gray-50 p-3 border-b">
                                                <div className="flex items-center space-x-3">
                                                    <ClockIcon className="h-5 w-5 text-gray-500" />
                                                    <span className="font-semibold text-gray-900">{timeRange}</span>
                                                    {timeSlotGroup.classes.length > 2 && (
                                                        <Badge variant="outline" className="text-xs">
                                                            +{timeSlotGroup.classes.length - 2} more
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Split content area */}
                                            <div className="h-24 relative">
                                                {/* Split diagonal background */}
                                                <div className="absolute inset-0">
                                                    <div
                                                        className={`absolute inset-0 ${color1}`}
                                                        style={{
                                                            clipPath: 'polygon(0 0, 100% 0, 0 100%)'
                                                        }}
                                                    ></div>
                                                    <div
                                                        className={`absolute inset-0 ${color2}`}
                                                        style={{
                                                            clipPath: 'polygon(100% 0, 100% 100%, 0 100%)'
                                                        }}
                                                    ></div>
                                                </div>

                                                {/* Diagonal line */}
                                                <div
                                                    className="absolute border-t-2 border-gray-700 transform rotate-45 origin-center"
                                                    style={{
                                                        width: '141%',
                                                        top: '50%',
                                                        left: '-20%',
                                                        transformOrigin: 'center'
                                                    }}
                                                ></div>

                                                {/* Content for first class (top-left) */}
                                                <div className="absolute top-0 left-0 w-full h-full flex flex-col justify-center items-start p-3">
                                                    <div className="text-sm font-bold truncate max-w-[70%]">{subject1Name}</div>
                                                    <div className="text-xs text-gray-600 truncate max-w-[70%]">{class1Name}</div>
                                                    <div className="text-xs text-gray-500">{class1.subClass.currentStudents} students</div>
                                                </div>

                                                {/* Content for second class (bottom-right) */}
                                                <div className="absolute bottom-0 right-0 w-full h-full flex flex-col justify-center items-end p-3">
                                                    <div className="text-sm font-bold truncate max-w-[70%] text-right">{subject2Name}</div>
                                                    <div className="text-xs text-gray-600 truncate max-w-[70%] text-right">{class2Name}</div>
                                                    <div className="text-xs text-gray-500 text-right">{class2.subClass.currentStudents} students</div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                }
                            })}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    // Weekly View Component  
    const WeeklyView = () => (
        <div className="bg-white rounded-lg shadow w-full">
            <div className="p-4">
                <div className="w-full border rounded-lg">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 text-xs">
                            <thead className="bg-gray-50 sticky top-0 z-10">
                                <tr>
                                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r sticky left-0 bg-gray-50 z-20 min-w-[120px]">
                                        Period / Time
                                    </th>
                                    {DAYS_ORDER.map(day => (
                                        <th key={day} className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-r min-w-[140px]">
                                            {DAY_NAMES[day as keyof typeof DAY_NAMES]}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {uniqueTimeSlots.map((timeSlot, index) => {
                                    const periodNumber = index + 1;
                                    const timeRange = `${timeSlot.startTime?.substring(0, 5) || ''} - ${timeSlot.endTime?.substring(0, 5) || ''}`;

                                    return (
                                        <tr key={timeSlot.timeRange} className="border-b hover:bg-gray-50">
                                            <th className="px-2 py-2 border-r bg-gray-50 font-medium text-gray-800 sticky left-0 z-10 min-w-[120px]">
                                                <div className="text-center text-sm font-semibold">Period {periodNumber}</div>
                                                <div className="text-xs text-gray-500 font-normal text-center mt-1">
                                                    {timeRange}
                                                </div>
                                                {timeSlot.isBreak && (
                                                    <div className="text-xs text-blue-600 font-normal text-center mt-1">
                                                        (Break)
                                                    </div>
                                                )}
                                            </th>
                                            {DAYS_ORDER.map(day => renderCellContent(day, timeSlot))}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );

    // Prevent hydration mismatch by not rendering dynamic content until mounted
    if (!isMounted || isLoadingTimetable || isLoadingPeriods) {
        return (
            <div className="p-6 space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold">My Timetable</h1>
                        <p className="text-gray-600">View your class schedule and teaching assignments</p>
                    </div>
                </div>
                <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-500">Loading timetable...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header with View Toggle */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">My Timetable</h1>
                    <p className="text-gray-600">View your class schedule and teaching assignments</p>
                </div>
                <div className="flex items-center space-x-2">
                    <Button
                        variant={viewMode === 'daily' ? 'solid' : 'outline'}
                        size="sm"
                        onClick={() => setViewMode('daily')}
                        className="flex items-center space-x-2"
                    >
                        <CalendarIcon className="h-4 w-4" />
                        <span>Daily</span>
                    </Button>
                    <Button
                        variant={viewMode === 'weekly' ? 'solid' : 'outline'}
                        size="sm"
                        onClick={() => setViewMode('weekly')}
                        className="flex items-center space-x-2"
                    >
                        <ViewColumnsIcon className="h-4 w-4" />
                        <span>Weekly</span>
                    </Button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardBody className="flex items-center">
                        <CalendarDaysIcon className="h-8 w-8 text-blue-600 mr-3" />
                        <div>
                            <p className="text-sm text-gray-600">Total Classes</p>
                            <p className="text-2xl font-bold">{summary?.totalClasses || 0}</p>
                        </div>
                    </CardBody>
                </Card>
                <Card>
                    <CardBody className="flex items-center">
                        <AcademicCapIcon className="h-8 w-8 text-green-600 mr-3" />
                        <div>
                            <p className="text-sm text-gray-600">Subjects</p>
                            <p className="text-2xl font-bold">{summary?.totalSubjects || 0}</p>
                        </div>
                    </CardBody>
                </Card>
                <Card>
                    <CardBody className="flex items-center">
                        <ClockIcon className="h-8 w-8 text-purple-600 mr-3" />
                        <div>
                            <p className="text-sm text-gray-600">Weekly Hours</p>
                            <p className="text-2xl font-bold">{`${summary?.weeklyHours.toFixed(1) || 0}h`}</p>
                        </div>
                    </CardBody>
                </Card>
                <Card>
                    <CardBody className="flex items-center">
                        <BuildingLibraryIcon className="h-8 w-8 text-orange-600 mr-3" />
                        <div>
                            <p className="text-sm text-gray-600">Today's Classes</p>
                            <p className="text-2xl font-bold">{summary?.todayClasses || 0}</p>
                        </div>
                    </CardBody>
                </Card>
            </div>

            {/* Timetable Content */}
            {schedule.length === 0 && !isLoadingTimetable && !isLoadingPeriods ? (
                <Card>
                    <CardBody className="text-center py-12">
                        <CalendarDaysIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No Timetable Available</h3>
                        <p className="text-gray-500">Your timetable has not been assigned yet. Please contact the administration.</p>
                    </CardBody>
                </Card>
            ) : (
                <>
                    {viewMode === 'daily' ? <DailyView /> : <WeeklyView />}
                </>
            )}
        </div>
    );
} 