'use client';

import CommunicationPage from '@/components/messaging/CommunicationPage';

export default function BursarMessagingPage() {
    return (
        <CommunicationPage
            userRole="BURSAR"
            defaultTab="messages"
        />
    );
} 