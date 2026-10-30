'use client';

import Link from 'next/link';
import { EnvelopeIcon, CurrencyDollarIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { Card, CardBody } from '@/components/ui';

// Landing page for the "Parent Mailing" section (Bursar + Secretary). Each mailing
// type gets its own card here; add new ones as they're built.
const MAILING_TYPES = [
    {
        href: '/dashboard/parent-mailing/fee-defaulters',
        icon: CurrencyDollarIcon,
        title: 'Fee Defaulters Mailings',
        description: 'Send a letter to the parents of students with outstanding fees, on the school letterhead.',
    },
];

export default function ParentMailingPage() {
    return (
        <div className="p-4 sm:p-6 space-y-6">
            <div className="flex items-center gap-3">
                <EnvelopeIcon className="w-7 h-7 text-blue-600" />
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Parent Mailing</h1>
                    <p className="text-gray-600">Send letters to parents, filled in automatically from the system&apos;s data</p>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {MAILING_TYPES.map((m) => (
                    <Link key={m.href} href={m.href}>
                        <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                            <CardBody className="flex items-center gap-4">
                                <div className="p-3 rounded-lg bg-blue-50 text-blue-600 flex-shrink-0">
                                    <m.icon className="w-6 h-6" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-gray-900">{m.title}</p>
                                    <p className="text-sm text-gray-500">{m.description}</p>
                                </div>
                                <ChevronRightIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
                            </CardBody>
                        </Card>
                    </Link>
                ))}
            </div>
        </div>
    );
}
