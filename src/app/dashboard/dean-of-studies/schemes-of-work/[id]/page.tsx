'use client';

import { useParams } from 'next/navigation';
import { SchemeDetailPage } from '@/components/schemes/SchemeDetailPage';

export default function Page() {
  const params = useParams();
  const id = Number(Array.isArray(params?.id) ? params.id[0] : params?.id);
  return <SchemeDetailPage schemeId={id} basePath="/dashboard/dean-of-studies/schemes-of-work" />;
}
