'use client';

import CommunicationPage from '@/components/messaging/CommunicationPage';

export default function ManagerAnnouncementsPage() {
    return (
        <CommunicationPage
            userRole="MANAGER"
            defaultTab="announcements"
        />
    );
} 