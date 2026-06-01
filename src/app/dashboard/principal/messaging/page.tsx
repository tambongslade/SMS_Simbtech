'use client';

import CommunicationPage from '@/components/messaging/CommunicationPage';

export default function PrincipalMessagingPage() {
    return (
        <CommunicationPage
            userRole="PRINCIPAL"
            defaultTab="messages"
        />
    );
} 