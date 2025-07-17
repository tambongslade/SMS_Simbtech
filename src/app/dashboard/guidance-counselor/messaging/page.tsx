'use client';

import CommunicationPage from '@/components/messaging/CommunicationPage';

export default function GuidanceCounselorMessagingPage() {
    return (
        <CommunicationPage
            userRole="GUIDANCE_COUNSELOR"
            defaultTab="messages"
        />
    );
} 