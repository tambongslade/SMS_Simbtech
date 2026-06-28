'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ControllerPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/dashboard/controller/fee-management');
  }, [router]);
  return null;
}
