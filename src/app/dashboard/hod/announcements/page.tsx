'use client';

import CommunicationPage from '@/components/messaging/CommunicationPage';

export default function HODAnnouncementsPage() {
    return (
        <CommunicationPage
            userRole="HOD"
            defaultTab="announcements"
        />
    );
} 