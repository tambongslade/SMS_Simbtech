'use client';

import CommunicationPage from '@/components/messaging/CommunicationPage';

export default function TeacherMessagingPage() {
    return (
        <CommunicationPage 
            userRole="TEACHER"
            defaultTab="messages"
        />
    );
} 