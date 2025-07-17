'use client';

import CommunicationPage from '@/components/messaging/CommunicationPage';

export default function HODMessagingPage() {
    return (
        <CommunicationPage
            userRole="HOD"
            defaultTab="messages"
        />
    );
} 