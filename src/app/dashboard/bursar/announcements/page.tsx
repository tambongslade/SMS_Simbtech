'use client';

import CommunicationPage from '@/components/messaging/CommunicationPage';

export default function BursarAnnouncementsPage() {
  return (
    <CommunicationPage
      userRole="BURSAR"
      defaultTab="announcements"
    />
  );
}
