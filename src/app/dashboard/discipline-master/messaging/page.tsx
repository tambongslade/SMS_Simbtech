'use client';

import CommunicationPage from '@/components/messaging/CommunicationPage';

export default function DisciplineMasterMessagingPage() {
    return (
        <CommunicationPage
            userRole="DISCIPLINE_MASTER"
            defaultTab="messages"
        />
    );
} 