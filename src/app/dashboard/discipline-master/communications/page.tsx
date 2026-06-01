'use client';

import CommunicationPage from '@/components/messaging/CommunicationPage';

export default function DisciplineMasterCommunicationsPage() {
    return (
        <CommunicationPage
            userRole="DISCIPLINE_MASTER"
            defaultTab="announcements"
        />
    );
}
