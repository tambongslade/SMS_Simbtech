'use client';

import CommunicationPage from '@/components/messaging/CommunicationPage';

export default function PrincipalAnnouncementsPage() {
  return (
    <CommunicationPage
      userRole="PRINCIPAL"
      defaultTab="announcements"
    />
  );
} 