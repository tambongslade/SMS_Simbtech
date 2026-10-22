'use client';

import { LogbookReviewPage } from '@/components/logbook/LogbookReviewPage';

// HOD sees only their department's logbook entries (subjects they head).
export default function Page() {
  return <LogbookReviewPage department="mine" />;
}
