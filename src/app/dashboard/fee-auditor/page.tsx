'use client';

import {
  ArchiveBoxIcon,
  BanknotesIcon,
  ChatBubbleLeftRightIcon,
  ClipboardDocumentListIcon,
  ReceiptRefundIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '@/components/context/AuthContext';
import { QuickActionGrid, type QuickAction } from '@/components/dashboard/QuickActionGrid';

const quickActions: QuickAction[] = [
  {
    label: 'Finance Requests',
    description: "Approvals & verifications",
    href: '/dashboard/fee-auditor/finance-requests',
    icon: BanknotesIcon,
    color: 'amber',
  },
  {
    label: 'Expenditures',
    description: "Review school spending",
    href: '/dashboard/fee-auditor/expenditures',
    icon: ReceiptRefundIcon,
    color: 'rose',
  },
  {
    label: 'Broken Property',
    description: "Damaged property charges",
    href: '/dashboard/fee-auditor/broken-property',
    icon: ClipboardDocumentListIcon,
    color: 'purple',
  },
  {
    label: 'Chat',
    description: "Message staff in real time",
    href: '/dashboard/fee-auditor/chat',
    icon: ChatBubbleLeftRightIcon,
    color: 'green',
  },
  {
    label: 'Inventory',
    description: "Your stock & transfers",
    href: '/dashboard/fee-auditor/inventory',
    icon: ArchiveBoxIcon,
    color: 'blue',
  },
];

export default function FeeAuditorMenu() {
  const { selectedAcademicYear, user } = useAuth();

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
          Welcome{user?.name ? `, ${user.name.split(' ')[0]}` : ''}
        </h1>
        <p className="text-sm text-gray-600 mt-0.5">
          What would you like to do?
          {selectedAcademicYear ? ` · ${selectedAcademicYear.name}` : ''}
        </p>
      </div>

      <QuickActionGrid actions={quickActions} />
    </div>
  );
}
