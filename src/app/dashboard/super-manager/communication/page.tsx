'use client';

import CommunicationPage from '@/components/messaging/CommunicationPage';

export default function SuperManagerCommunicationPage() {
    return (
        <CommunicationPage 
            userRole="SUPER_MANAGER"
            defaultTab="announcements"
        />
    );
} 