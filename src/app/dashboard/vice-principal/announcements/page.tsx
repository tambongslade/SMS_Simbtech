'use client';

import CommunicationPage from '@/components/messaging/CommunicationPage';

export default function VicePrincipalAnnouncementsPage() {
    return (
        <CommunicationPage 
            userRole="VICE_PRINCIPAL"
            defaultTab="announcements"
        />
    );
} 