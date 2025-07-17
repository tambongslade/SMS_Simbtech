'use client';

import CommunicationPage from '@/components/messaging/CommunicationPage';

export default function ParentStudentMessagesPage() {
    return (
        <CommunicationPage
            userRole="PARENT"
            defaultTab="messages"
        />
    );
} 