'use client';

import CommunicationPage from '@/components/messaging/CommunicationPage';

export default function GuidanceCounselorAnnouncementsPage() {
    return (
        <CommunicationPage
            userRole="GUIDANCE_COUNSELOR"
            defaultTab="announcements"
        />
    );
} 