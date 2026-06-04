'use client';

import { BrokenPropertyPanel } from '@/components/discipline';

export default function FeeAuditorBrokenPropertyPage() {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <BrokenPropertyPanel readOnly />
    </div>
  );
}
