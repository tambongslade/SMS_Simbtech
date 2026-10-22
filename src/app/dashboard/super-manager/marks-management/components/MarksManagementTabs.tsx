'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

// The two Marks Management pages share this tab bar. The page is mounted under
// /dashboard/super-manager/marks-management and /dashboard/marks-management.
export default function MarksManagementTabs() {
    const pathname = usePathname() || '';
    const base = pathname.includes('/super-manager/') ? '/dashboard/super-manager/marks-management' : '/dashboard/marks-management';
    const onStatus = pathname.replace(/\/$/, '').endsWith('/submission-status');
    const tabs = [
        { href: base, label: 'Marks', active: !onStatus },
        { href: `${base}/submission-status`, label: 'Submission status', active: onStatus },
    ];
    return (
        <div className="mb-4 border-b border-gray-200 flex gap-6">
            {tabs.map(t => (
                <Link
                    key={t.href}
                    href={t.href}
                    className={`pb-2 text-sm font-medium border-b-2 -mb-px ${t.active ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                    {t.label}
                </Link>
            ))}
        </div>
    );
}
