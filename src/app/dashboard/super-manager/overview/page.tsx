'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import ModulesOverview from '@/components/overview/ModulesOverview';

function OverviewWithParams() {
    const params = useSearchParams();
    return <ModulesOverview showAudit initialModule={params.get('module')} />;
}

export default function SuperManagerOverviewPage() {
    return (
        <Suspense fallback={null}>
            <OverviewWithParams />
        </Suspense>
    );
}
