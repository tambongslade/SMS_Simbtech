'use client';

import CommunicationPage from '@/components/messaging/CommunicationPage';

export default function VicePrincipalMessagingPage() {
    return (
        <CommunicationPage
            userRole="VICE_PRINCIPAL"
            defaultTab="messages"
        />
    );
} 