'use client';

import { BrokenPropertyPanel } from '@/components/discipline';

export default function BursarBrokenPropertyPage() {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <BrokenPropertyPanel readOnly />
    </div>
  );
}
