'use client';

import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import { toast } from 'react-hot-toast';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { Badge, Button, Input, Modal, Select, TextArea } from '@/components/ui';
import apiService from '@/lib/apiService';

// Every staff member appears here, whether or not they already have a
// SalaryProfile (TEACHER_HOURLY or ADMIN_FIXED). Staff without a profile get
// one created on first "Set Salary"; staff with one go through
// POST /salary/change-requests (auto-approved for the Super Manager).

interface SalaryProfile {
    id: number;
    profileType?: string | null;
    type?: string | null;
    hourlyRate?: number | null;
    baseSalary?: number | null;
    user?: { id: number; name?: string; matricule?: string } | null;
    userId?: number;
}

interface StaffRow {
    userId: number;
    name: string;
    matricule?: string;
    roles: string[];
    profile: SalaryProfile | null;
}

type SalaryAction = 'set-salary' | 'allowance' | 'withholding';

const NON_STAFF_ROLES = new Set(['PARENT', 'STUDENT']);

const TYPE_FILTERS = [
    { value: 'all', label: 'All Staff' },
    { value: 'TEACHER_HOURLY', label: 'Teachers (Hourly)' },
    { value: 'ADMIN_FIXED', label: 'Admin Staff (Fixed)' },
    { value: 'none', label: 'No Salary Set' },
];

const PROFILE_TYPE_OPTIONS = [
    { value: 'ADMIN_FIXED', label: 'Fixed monthly salary (admin staff)' },
    { value: 'TEACHER_HOURLY', label: 'Hourly rate (teachers)' },
];

const fetcher = (url: string) => apiService.get(url);

const formatMoney = (amount?: number | null) =>
    amount == null ? null : `FCFA ${amount.toLocaleString()}`;

const formatLabel = (value: string) =>
    value.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

const profileType = (p?: SalaryProfile | null) => (p?.profileType ?? p?.type ?? '').toUpperCase();
const isHourly = (p?: SalaryProfile | null) => profileType(p).includes('HOURLY');
const currentPay = (p?: SalaryProfile | null) =>
    p ? (isHourly(p) ? p.hourlyRate : p.baseSalary) : null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const unwrapList = (raw: any): any[] =>
    Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : []);

export default function StaffSalariesTab({
    onCreated,
    requiresApproval = false,
}: {
    onCreated?: (action: SalaryAction) => void;
    // Managers propose changes (reason required, pending approval);
    // the Super Manager's changes apply immediately.
    requiresApproval?: boolean;
}) {
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');

    const [action, setAction] = useState<SalaryAction | null>(null);
    const [selectedStaff, setSelectedStaff] = useState<StaffRow | null>(null);
    const [newProfileType, setNewProfileType] = useState('ADMIN_FIXED');
    const [amount, setAmount] = useState('');
    const [reason, setReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const handle = setTimeout(() => setDebouncedSearch(search.trim().toLowerCase()), 300);
        return () => clearTimeout(handle);
    }, [search]);

    // All personnel (parents/students excluded client-side) + existing profiles
    const { data: usersRes, error: usersError, isLoading: usersLoading, mutate: mutateUsers } = useSWR(
        '/users?page=1&limit=200',
        fetcher,
        { onError: (err) => { if (err?.message !== 'Unauthorized') toast.error('Failed to load personnel.'); } }
    );
    const { data: profilesRes, mutate: mutateProfiles } = useSWR('/salary/profiles', fetcher, {
        onError: () => { /* profiles are optional — staff simply show "no salary set" */ },
    });

    const staff = useMemo((): StaffRow[] => {
        const users = unwrapList(usersRes?.data);
        const profiles = unwrapList(profilesRes?.data) as SalaryProfile[];
        const profileByUser = new Map<number, SalaryProfile>();
        profiles.forEach(p => {
            const uid = p.user?.id ?? p.userId;
            if (uid != null) profileByUser.set(uid, p);
        });

        return users
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .map((user: any): StaffRow => ({
                userId: user.id,
                name: user.name,
                matricule: user.matricule,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                roles: (user.userRoles?.map((r: any) => r.role) ?? user.roles ?? [])
                    .filter((r: string) => !NON_STAFF_ROLES.has(r)),
                profile: profileByUser.get(user.id) ?? null,
            }))
            .filter(s => s.roles.length > 0)
            .filter(s => {
                if (typeFilter === 'none') return !s.profile;
                if (typeFilter !== 'all') return profileType(s.profile) === typeFilter;
                return true;
            })
            .filter(s => {
                if (!debouncedSearch) return true;
                return `${s.name} ${s.matricule ?? ''}`.toLowerCase().includes(debouncedSearch);
            });
    }, [usersRes, profilesRes, typeFilter, debouncedSearch]);

    const openModal = (row: StaffRow, nextAction: SalaryAction) => {
        setSelectedStaff(row);
        setAction(nextAction);
        setNewProfileType(row.roles.includes('TEACHER') ? 'TEACHER_HOURLY' : 'ADMIN_FIXED');
        setAmount('');
        setReason('');
    };

    const closeModal = () => {
        if (isSubmitting) return;
        setAction(null);
        setSelectedStaff(null);
    };

    const submit = async () => {
        if (!action || !selectedStaff) return;
        const parsedAmount = Number(amount);
        if (!amount || Number.isNaN(parsedAmount) || parsedAmount < 0) {
            toast.error('Enter a valid amount.');
            return;
        }
        // The backend requires a reason for manager-submitted change requests
        if (requiresApproval && action === 'set-salary' && !reason.trim()) {
            toast.error('Please provide a reason for the salary change.');
            return;
        }

        setIsSubmitting(true);
        try {
            const profile = selectedStaff.profile;
            if (action === 'set-salary') {
                if (profile) {
                    // Existing profile → change request (auto-approved for Super Manager)
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const payload: Record<string, any> = { salaryProfileId: profile.id };
                    if (isHourly(profile)) payload.newHourlyRate = parsedAmount;
                    else payload.newBaseSalary = parsedAmount;
                    if (reason.trim()) payload.reason = reason.trim();
                    await apiService.post('/salary/change-requests', payload);
                } else {
                    // First salary for this staff member → create the profile
                    const hourly = newProfileType === 'TEACHER_HOURLY';
                    await apiService.post('/salary/profiles', {
                        userId: selectedStaff.userId,
                        profileType: newProfileType,
                        ...(hourly ? { hourlyRate: parsedAmount } : { baseSalary: parsedAmount }),
                    });
                }
                toast.success(requiresApproval
                    ? `Change request submitted for ${selectedStaff.name} — awaiting Super Manager approval.`
                    : `Salary ${profile ? 'updated' : 'set'} for ${selectedStaff.name}.`);
            } else {
                if (!profile) {
                    toast.error('Set a salary for this staff member first.');
                    return;
                }
                const base = action === 'allowance' ? '/salary/allowances' : '/salary/withholdings';
                await apiService.post(base, {
                    salaryProfileId: profile.id,
                    userId: selectedStaff.userId,
                    amount: parsedAmount,
                    description: reason.trim() || undefined,
                    reason: reason.trim() || undefined,
                });
                toast.success(`${action === 'allowance' ? 'Allowance' : 'Withholding'} added for ${selectedStaff.name}.`);
            }
            setAction(null);
            setSelectedStaff(null);
            mutateProfiles();
            mutateUsers();
            onCreated?.(action);
        } catch (err) {
            console.error(`${action} submission failed:`, err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const modalProfile = selectedStaff?.profile ?? null;
    const modalIsHourly = modalProfile ? isHourly(modalProfile) : newProfileType === 'TEACHER_HOURLY';
    const modalTitle = action === 'set-salary'
        ? (modalProfile ? (modalIsHourly ? 'Change Hourly Rate' : 'Change Base Salary') : 'Set Salary')
        : action === 'allowance' ? 'Add Allowance / Bonus' : 'Add Withholding';
    const amountLabel = action === 'set-salary'
        ? (modalIsHourly ? 'Hourly Rate (FCFA)' : 'Monthly Salary (FCFA)')
        : action === 'allowance' ? 'Allowance Amount (FCFA)' : 'Withholding Amount (FCFA)';

    return (
        <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                    <Input
                        placeholder="Search staff by name or matricule..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        leftIcon={<MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />}
                    />
                </div>
                <div className="sm:w-56">
                    <Select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        options={TYPE_FILTERS}
                    />
                </div>
            </div>

            {/* Staff list */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                {usersLoading ? (
                    <div className="p-6 space-y-3">
                        {[0, 1, 2, 3].map((i) => <div key={i} className="h-12 rounded bg-gray-100 animate-pulse" />)}
                    </div>
                ) : usersError ? (
                    <p className="p-6 text-sm text-gray-500">Could not load personnel. Please try again.</p>
                ) : staff.length === 0 ? (
                    <p className="p-6 text-sm text-gray-500">No staff members found.</p>
                ) : (
                    <ul className="divide-y divide-gray-100">
                        {staff.map((row) => (
                            <li key={row.userId} className="px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <p className="text-sm font-medium text-gray-900 truncate">{row.name}</p>
                                        {row.roles.slice(0, 3).map((role) => (
                                            <Badge key={role} color="gray" size="sm">{formatLabel(role)}</Badge>
                                        ))}
                                        {row.profile && (
                                            <Badge color={isHourly(row.profile) ? 'blue' : 'purple'} size="sm">
                                                {formatLabel(profileType(row.profile))}
                                            </Badge>
                                        )}
                                    </div>
                                    <p className="mt-0.5 text-xs text-gray-500">
                                        {row.matricule ? `${row.matricule} · ` : ''}
                                        {currentPay(row.profile) != null
                                            ? `${formatMoney(currentPay(row.profile))}${isHourly(row.profile) ? ' / hour' : ' / month'}`
                                            : 'No salary set yet'}
                                    </p>
                                </div>
                                <div className="flex gap-2 shrink-0">
                                    <button
                                        onClick={() => openModal(row, 'set-salary')}
                                        className="px-2.5 py-1.5 text-xs font-medium rounded bg-blue-600 text-white hover:bg-blue-700"
                                    >
                                        {row.profile ? (isHourly(row.profile) ? 'Change Rate' : 'Change Salary') : 'Set Salary'}
                                    </button>
                                    <button
                                        onClick={() => openModal(row, 'allowance')}
                                        disabled={!row.profile}
                                        className="px-2.5 py-1.5 text-xs font-medium rounded bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed"
                                        title={row.profile ? undefined : 'Set a salary first'}
                                    >
                                        Allowance
                                    </button>
                                    <button
                                        onClick={() => openModal(row, 'withholding')}
                                        disabled={!row.profile}
                                        className="px-2.5 py-1.5 text-xs font-medium rounded bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed"
                                        title={row.profile ? undefined : 'Set a salary first'}
                                    >
                                        Withholding
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {/* Action modal */}
            <Modal isOpen={!!action && !!selectedStaff} onClose={closeModal} title={modalTitle} size="sm">
                {action && selectedStaff && (
                    <div className="space-y-4">
                        <div className="bg-gray-50 rounded-lg p-3">
                            <p className="text-sm font-medium text-gray-900">{selectedStaff.name}</p>
                            <p className="text-xs text-gray-500">
                                {selectedStaff.roles.map(formatLabel).join(', ') || 'Staff'}
                                {currentPay(modalProfile) != null
                                    ? ` · Current: ${formatMoney(currentPay(modalProfile))}${isHourly(modalProfile) ? ' / hour' : ' / month'}`
                                    : ' · No salary set yet'}
                            </p>
                        </div>

                        {action === 'set-salary' && !modalProfile && (
                            <Select
                                label="Salary Type"
                                value={newProfileType}
                                onChange={(e) => setNewProfileType(e.target.value)}
                                options={PROFILE_TYPE_OPTIONS}
                            />
                        )}

                        <Input
                            label={amountLabel}
                            type="number"
                            min="0"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder={modalIsHourly && action === 'set-salary' ? 'e.g. 1500' : 'e.g. 150000'}
                        />

                        <TextArea
                            label={action === 'set-salary' ? (requiresApproval ? 'Reason' : 'Reason (optional)') : 'Description'}
                            rows={2}
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder={action === 'set-salary'
                                ? 'e.g. Annual salary review'
                                : action === 'allowance' ? 'e.g. Transport allowance' : 'e.g. Salary advance recovery'}
                        />

                        {action === 'set-salary' && (
                            <p className="text-xs text-gray-500">
                                {requiresApproval
                                    ? 'Your change will be sent to the Super Manager for approval.'
                                    : 'As Super Manager, this change is applied immediately — no separate approval step.'}
                            </p>
                        )}

                        <div className="flex justify-end gap-2 pt-2">
                            <button
                                onClick={closeModal}
                                disabled={isSubmitting}
                                className="px-4 py-2 text-sm font-medium rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <Button onClick={submit} isLoading={isSubmitting}>
                                {action === 'set-salary' ? (modalProfile ? 'Apply Change' : 'Set Salary')
                                    : action === 'allowance' ? 'Add Allowance' : 'Add Withholding'}
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
