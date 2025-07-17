'use client';

import CommunicationPage from '@/components/messaging/CommunicationPage';

export default function ParentStudentAnnouncementsPage() {
  return (
    <CommunicationPage
      userRole="PARENT"
      defaultTab="announcements"
    />
  );
} 