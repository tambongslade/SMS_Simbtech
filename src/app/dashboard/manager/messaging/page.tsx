'use client';

import CommunicationPage from '@/components/messaging/CommunicationPage';

export default function ManagerMessagingPage() {
    return (
        <CommunicationPage
            userRole="MANAGER"
            defaultTab="messages"
        />
    );
} 