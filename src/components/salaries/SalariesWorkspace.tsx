'use client';

import { useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import useSWR from 'swr';
import { toast } from 'react-hot-toast';
import { BanknotesIcon, PlusIcon } from '@heroicons/react/24/outline';
import { Card, CardBody, CardHeader, Badge } from '@/components/ui';
import { useAuth } from '@/components/context/AuthContext';
import apiService from '@/lib/apiService';
import StaffSalariesTab from './StaffSalariesTab';

type SalaryTab = 'staff' | 'change-requests' | 'allowances' | 'withholdings';

// Tolerant shape — the backend's exact fields vary per entity, so unknown
// extras are simply ignored and missing ones fall back gracefully.
interface SalaryItem {
    id: number;
    status?: string;
    amount?: number | null;
    newSalary?: number | null;
    currentSalary?: number | null;
    reason?: string | null;
    description?: string | null;
    type?: string | null;
    createdAt?: string;
    effectiveDate?: string | null;
    userId?: number;
    user?: { id: number; name?: string } | null;
    staff?: { id: number; name?: string } | null;
    userName?: string | null;
    staffName?: string | null;
    requestedBy?: { id: number; name?: string } | null;
}

const LIST_TABS: { key: SalaryTab; label: string; base: string }[] = [
    { key: 'change-requests', label: 'Change Requests', base: '/salary/change-requests' },
    { key: 'allowances', label: 'Allowances & Bonuses', base: '/salary/allowances' },
    { key: 'withholdings', label: 'Withholdings', base: '/salary/withholdings' },
];

const STAFF_TAB = { key: 'staff' as SalaryTab, label: 'Staff Salaries' };

const STATUS_FILTERS = ['PENDING', 'APPROVED', 'REJECTED', 'ALL'] as const;

const fetcher = (url: string) => apiService.get(url);

const formatMoney = (amount?: number | null) =>
    amount == null ? '—' : `FCFA ${amount.toLocaleString()}`;

const formatLabel = (value: string) =>
    value.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

const statusColor = (status?: string): 'green' | 'yellow' | 'red' | 'gray' => {
    switch (status) {
        case 'APPROVED': return 'green';
        case 'PENDING': return 'yellow';
        case 'REJECTED': return 'red';
        default: return 'gray';
    }
};

const itemName = (item: SalaryItem) =>
    item.user?.name ?? item.staff?.name ?? item.userName ?? item.staffName
    ?? (item.userId ? `User #${item.userId}` : 'Unknown staff');

const itemAmount = (item: SalaryItem) => item.amount ?? item.newSalary ?? null;

export default function SalariesWorkspace() {
    const pathname = usePathname();
    const canApprove = pathname.includes('/super-manager/');
    // Managers also manage staff salaries, but their changes need approval
    const canManage = canApprove || pathname.includes('/manager/');
    const { selectedAcademicYear } = useAuth();

    const [activeTab, setActiveTab] = useState<SalaryTab>(canManage ? 'staff' : 'change-requests');
    const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>('PENDING');
    const [actingId, setActingId] = useState<number | null>(null);

    const visibleTabs = canManage ? [STAFF_TAB, ...LIST_TABS] : LIST_TABS;
    // Fall back to change-requests for the fetch key while the staff tab is active.
    const tab = LIST_TABS.find(t => t.key === activeTab) ?? LIST_TABS[0];

    // ── Bursar cash summary ──
    const yearParam = selectedAcademicYear?.id ? `?academicYearId=${selectedAcademicYear.id}` : '';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: cashRes } = useSWR<{ data?: Record<string, any> }>(
        `/salary/bursar-cash/summary${yearParam}`,
        fetcher,
        { onError: () => { /* card stays hidden */ } }
    );
    const cashSummary = cashRes?.data;

    // ── Items for the active tab ──
    const listKey = `${tab.base}${statusFilter !== 'ALL' ? `?status=${statusFilter}` : ''}`;
    const { data: listRes, error: listError, isLoading, mutate } = useSWR<{ data?: SalaryItem[] }>(
        listKey,
        fetcher,
        { onError: (err) => { if (err?.message !== 'Unauthorized') toast.error(`Failed to load ${tab.label.toLowerCase()}`); } }
    );
    const items = useMemo(() => {
        const raw = listRes?.data;
        // Some list endpoints nest as data.data
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return Array.isArray(raw) ? raw : ((raw as any)?.data ?? []);
    }, [listRes]) as SalaryItem[];

    const act = async (item: SalaryItem, action: 'approve' | 'reject') => {
        setActingId(item.id);
        try {
            await apiService.post(`${tab.base}/${item.id}/${action}`, {});
            toast.success(action === 'approve' ? 'Approved.' : 'Rejected.');
            mutate();
        } catch (error) {
            console.error(`${action} failed:`, error);
            toast.error(`Failed to ${action}. Please try again.`);
        } finally {
            setActingId(null);
        }
    };

    return (
        <div className="p-4 sm:p-6 space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Salary Management</h1>
                <p className="text-gray-600">
                    {canApprove
                        ? 'Configure staff salaries, allowances and withholdings, and approve change requests.'
                        : canManage
                            ? 'Propose staff salary changes, allowances and withholdings — the Super Manager approves them.'
                            : 'Track salary change requests, allowances and withholdings.'}
                    {selectedAcademicYear ? ` · ${selectedAcademicYear.name}` : ''}
                </p>
            </div>

            {/* Bursar cash summary (renders only when the endpoint responds) */}
            {cashSummary && Object.keys(cashSummary).length > 0 && (
                <Card>
                    <CardHeader>
                        <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                            <BanknotesIcon className="h-5 w-5 text-gray-400" />
                            Bursar Cash Summary
                        </h3>
                    </CardHeader>
                    <CardBody>
                        <dl className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {Object.entries(cashSummary)
                                .filter(([, value]) => typeof value === 'number' || typeof value === 'string')
                                // Ids and counts are metadata, not money — don't show them as FCFA
                                .filter(([key]) => !/id$|count$/i.test(key))
                                .slice(0, 8)
                                .map(([key, value]) => (
                                    <div key={key} className="bg-gray-50 rounded-lg p-3">
                                        <dt className="text-xs text-gray-500">{formatLabel(key)}</dt>
                                        <dd className="mt-0.5 text-sm font-semibold text-gray-900 break-words">
                                            {typeof value === 'number' ? formatMoney(value) : String(value)}
                                        </dd>
                                    </div>
                                ))}
                        </dl>
                    </CardBody>
                </Card>
            )}

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex gap-6 overflow-x-auto">
                    {visibleTabs.map((t) => (
                        <button
                            key={t.key}
                            onClick={() => setActiveTab(t.key)}
                            className={`whitespace-nowrap border-b-2 px-1 pb-3 text-sm font-medium transition-colors ${
                                activeTab === t.key
                                    ? 'border-blue-600 text-blue-700'
                                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                            }`}
                        >
                            {t.label}
                        </button>
                    ))}
                </nav>
            </div>

            {activeTab === 'staff' ? (
                <StaffSalariesTab
                    requiresApproval={!canApprove}
                    onCreated={(created) => {
                        // Super Manager salary changes are auto-approved and applied
                        // immediately, so stay on the staff list. Manager changes are
                        // pending — jump to the matching tab to show the new item.
                        if (created === 'set-salary') {
                            if (canApprove) return;
                            setStatusFilter('PENDING');
                            setActiveTab('change-requests');
                            return;
                        }
                        setStatusFilter('PENDING');
                        setActiveTab(created === 'allowance' ? 'allowances' : 'withholdings');
                    }}
                />
            ) : (
                <>
            {/* Status filter */}
            <div className="flex flex-wrap items-center gap-2">
                {STATUS_FILTERS.map((status) => (
                    <button
                        key={status}
                        onClick={() => setStatusFilter(status)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                            statusFilter === status
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                        {status === 'ALL' ? 'All' : formatLabel(status)}
                    </button>
                ))}
            </div>

            {/* Items */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                {isLoading ? (
                    <div className="p-6 space-y-3">
                        {[0, 1, 2, 3].map(i => <div key={i} className="h-12 rounded bg-gray-100 animate-pulse" />)}
                    </div>
                ) : listError ? (
                    <p className="p-6 text-sm text-gray-500">
                        Could not load {tab.label.toLowerCase()}. The salary API may not be available yet.
                    </p>
                ) : items.length === 0 ? (
                    <p className="p-6 text-sm text-gray-500">
                        No {statusFilter === 'ALL' ? '' : `${formatLabel(statusFilter).toLowerCase()} `}{tab.label.toLowerCase()} found.
                    </p>
                ) : (
                    <ul className="divide-y divide-gray-100">
                        {items.map((item) => (
                            <li key={item.id} className="px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-medium text-gray-900 truncate">{itemName(item)}</p>
                                        <Badge color={statusColor(item.status)} size="sm">{formatLabel(item.status || 'Unknown')}</Badge>
                                        {item.type && <Badge color="gray" size="sm">{formatLabel(item.type)}</Badge>}
                                    </div>
                                    <p className="mt-0.5 text-xs text-gray-500 truncate">
                                        {item.reason || item.description || 'No reason provided'}
                                        {item.createdAt ? ` · ${new Date(item.createdAt).toLocaleDateString()}` : ''}
                                        {item.effectiveDate ? ` · effective ${new Date(item.effectiveDate).toLocaleDateString()}` : ''}
                                    </p>
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                    <div className="text-right">
                                        {activeTab === 'change-requests' && item.currentSalary != null && (
                                            <p className="text-xs text-gray-400 line-through">{formatMoney(item.currentSalary)}</p>
                                        )}
                                        <p className="text-sm font-semibold text-gray-900">{formatMoney(itemAmount(item))}</p>
                                    </div>
                                    {canApprove && item.status === 'PENDING' && (
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => act(item, 'approve')}
                                                disabled={actingId === item.id}
                                                className="px-2.5 py-1.5 text-xs font-medium rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                                            >
                                                Approve
                                            </button>
                                            <button
                                                onClick={() => act(item, 'reject')}
                                                disabled={actingId === item.id}
                                                className="px-2.5 py-1.5 text-xs font-medium rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                                            >
                                                Reject
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
                </>
            )}

            {!canManage && (
                <p className="text-xs text-gray-500 flex items-center gap-1">
                    <PlusIcon className="h-3.5 w-3.5" />
                    New salary items are created from staff workflows; the Super Manager approves them and you&apos;ll be notified of the outcome.
                </p>
            )}
        </div>
    );
}
