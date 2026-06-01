'use client';

import CommunicationPage from '@/components/messaging/CommunicationPage';

export default function TeacherAnnouncementsPage() {
    return (
        <CommunicationPage
            userRole="TEACHER"
            defaultTab="announcements"
        />
    );
} 