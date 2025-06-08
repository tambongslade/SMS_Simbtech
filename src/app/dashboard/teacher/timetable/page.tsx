'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui";
import apiService from '../../../../lib/apiService';
import { toast } from 'react-hot-toast';

interface TimeSlot {
    id: number;
    day: string;
    periodId: number;
    subjectId: number;
    teacherId: number;
    subClassId: number;
    subject: {
        name: string;
    };
    period: {
        startTime: string;
        endTime: string;
        name: string;
    };
    subClass: {
        name: string;
    };
}

export default function TeacherTimetablePage() {
    const [timetable, setTimetable] = useState<TimeSlot[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

    useEffect(() => {
        const fetchTeacherTimetable = async () => {
            setIsLoading(true);
            try {
                // Get the current user's timetable
                const response = await apiService.get('/timetables?view=teacher');
                setTimetable(response.data || []);
            } catch (error) {
                console.error('Error fetching timetable:', error);
                toast.error('Failed to load timetable');
            } finally {
                setIsLoading(false);
            }
        };

        fetchTeacherTimetable();
    }, []);

    // Group time slots by day
    const timeSlotsByDay = days.reduce((acc, day) => {
        acc[day] = timetable.filter(slot => slot.day === day)
            .sort((a, b) => {
                // Sort by period start time
                const timeA = a.period.startTime;
                const timeB = b.period.startTime;
                return timeA.localeCompare(timeB);
            });
        return acc;
    }, {} as Record<string, TimeSlot[]>);

    return (
        <div className="p-6 space-y-6">
            <h1 className="text-3xl font-bold">My Timetable</h1>

            {isLoading ? (
                <div className="text-center py-10">
                    <p className="text-gray-500">Loading timetable...</p>
                </div>
            ) : (
                <div className="grid gap-6">
                    {days.map(day => (
                        <Card key={day}>
                            <CardHeader>
                                <CardTitle>{day}</CardTitle>
                            </CardHeader>
                            <CardBody>
                                {timeSlotsByDay[day]?.length > 0 ? (
                                    <div className="space-y-3">
                                        {timeSlotsByDay[day].map((slot, index) => (
                                            <div
                                                key={slot.id || index}
                                                className="p-4 bg-gray-50 rounded-lg flex flex-col sm:flex-row sm:items-center sm:justify-between"
                                            >
                                                <div className="flex-1">
                                                    <h3 className="font-semibold text-gray-900">{slot.subject.name}</h3>
                                                    <p className="text-sm text-gray-600">{slot.subClass.name}</p>
                                                </div>
                                                <div className="mt-2 sm:mt-0 text-sm text-gray-500">
                                                    {slot.period.startTime} - {slot.period.endTime}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-gray-500 text-center py-4">No classes scheduled</p>
                                )}
                            </CardBody>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
} 