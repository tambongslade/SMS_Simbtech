'use client';

import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import { toast } from 'react-hot-toast';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { Badge, Button, Input, Modal, Select, TextArea } from '@/components/ui';
import apiService from '@/lib/apiService';

// Backend model: every staff member has a SalaryProfile that is either
// TEACHER_HOURLY (paid per hour) or ADMIN_FIXED (fixed monthly salary).
// Salary changes go through POST /salary/change-requests with the profile id;
// for the Super Manager the change is auto-approved and applied immediately.
interface SalaryProfile {
    id: number;
    profileType?: string | null; // TEACHER_HOURLY | ADMIN_FIXED
    type?: string | null;        // tolerated alias
    hourlyRate?: number | null;
    baseSalary?: number | null;
    user?: { id: number; name?: string; matricule?: string } | null;
    userName?: string | null;
    userId?: number;
}

type SalaryAction = 'set-salary' | 'allowance' | 'withholding';

const TYPE_FILTERS = [
    { value: 'all', label: 'All Profiles' },
    { value: 'TEACHER_HOURLY', label: 'Teachers (Hourly)' },
    { value: 'ADMIN_FIXED', label: 'Admin Staff (Fixed)' },
];

const fetcher = (url: string) => apiService.get(url);

const formatMoney = (amount?: number | null) =>
    amount == null ? null : `FCFA ${amount.toLocaleString()}`;

const formatLabel = (value: string) =>
    value.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

const profileType = (p: SalaryProfile) => (p.profileType ?? p.type ?? '').toUpperCase();
const isHourly = (p: SalaryProfile) => profileType(p).includes('HOURLY');
const profileName = (p: SalaryProfile) =>
    p.user?.name ?? p.userName ?? (p.userId ? `User #${p.userId}` : 'Unknown staff');
const currentPay = (p: SalaryProfile) => (isHourly(p) ? p.hourlyRate : p.baseSalary);

export default function StaffSalariesTab({ onCreated }: { onCreated?: (action: SalaryAction) => void }) {
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');

    const [action, setAction] = useState<SalaryAction | null>(null);
    const [selectedProfile, setSelectedProfile] = useState<SalaryProfile | null>(null);
    const [amount, setAmount] = useState('');
    const [reason, setReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const handle = setTimeout(() => setDebouncedSearch(search.trim().toLowerCase()), 300);
        return () => clearTimeout(handle);
    }, [search]);

    const { data: profilesRes, error, isLoading, mutate } = useSWR('/salary/profiles', fetcher, {
        onError: (err) => { if (err?.message !== 'Unauthorized') toast.error('Failed to load salary profiles.'); },
    });

    const profiles = useMemo(() => {
        const raw = profilesRes?.data;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const list: SalaryProfile[] = Array.isArray(raw) ? raw : ((raw as any)?.data ?? []);
        return (Array.isArray(list) ? list : []).filter((p) => {
            if (typeFilter !== 'all' && profileType(p) !== typeFilter) return false;
            if (!debouncedSearch) return true;
            const haystack = `${profileName(p)} ${p.user?.matricule ?? ''}`.toLowerCase();
            return haystack.includes(debouncedSearch);
        });
    }, [profilesRes, typeFilter, debouncedSearch]);

    const openModal = (profile: SalaryProfile, nextAction: SalaryAction) => {
        setSelectedProfile(profile);
        setAction(nextAction);
        setAmount('');
        setReason('');
    };

    const closeModal = () => {
        if (isSubmitting) return;
        setAction(null);
        setSelectedProfile(null);
    };

    const submit = async () => {
        if (!action || !selectedProfile) return;
        const parsedAmount = Number(amount);
        if (!amount || Number.isNaN(parsedAmount) || parsedAmount < 0) {
            toast.error('Enter a valid amount.');
            return;
        }

        setIsSubmitting(true);
        try {
            if (action === 'set-salary') {
                // Super Manager requests are auto-approved and applied immediately;
                // reason is optional and auto-filled server-side when omitted.
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const payload: Record<string, any> = { salaryProfileId: selectedProfile.id };
                if (isHourly(selectedProfile)) payload.newHourlyRate = parsedAmount;
                else payload.newBaseSalary = parsedAmount;
                if (reason.trim()) payload.reason = reason.trim();
                await apiService.post('/salary/change-requests', payload);
                toast.success(`Salary updated for ${profileName(selectedProfile)}.`);
            } else {
                const base = action === 'allowance' ? '/salary/allowances' : '/salary/withholdings';
                await apiService.post(base, {
                    salaryProfileId: selectedProfile.id,
                    userId: selectedProfile.user?.id ?? selectedProfile.userId,
                    amount: parsedAmount,
                    description: reason.trim() || undefined,
                    reason: reason.trim() || undefined,
                });
                toast.success(`${action === 'allowance' ? 'Allowance' : 'Withholding'} added for ${profileName(selectedProfile)}.`);
            }
            setAction(null);
            setSelectedProfile(null);
            mutate();
            onCreated?.(action);
        } catch (err) {
            console.error(`${action} submission failed:`, err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const modalTitle = action === 'set-salary'
        ? (selectedProfile && isHourly(selectedProfile) ? 'Change Hourly Rate' : 'Change Base Salary')
        : action === 'allowance' ? 'Add Allowance / Bonus' : 'Add Withholding';

    const amountLabel = action === 'set-salary'
        ? (selectedProfile && isHourly(selectedProfile) ? 'New Hourly Rate (FCFA)' : 'New Monthly Salary (FCFA)')
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

            {/* Salary profiles */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                {isLoading ? (
                    <div className="p-6 space-y-3">
                        {[0, 1, 2, 3].map((i) => <div key={i} className="h-12 rounded bg-gray-100 animate-pulse" />)}
                    </div>
                ) : error ? (
                    <p className="p-6 text-sm text-gray-500">Could not load salary profiles. Please try again.</p>
                ) : profiles.length === 0 ? (
                    <p className="p-6 text-sm text-gray-500">No salary profiles found.</p>
                ) : (
                    <ul className="divide-y divide-gray-100">
                        {profiles.map((profile) => (
                            <li key={profile.id} className="px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <p className="text-sm font-medium text-gray-900 truncate">{profileName(profile)}</p>
                                        {profileType(profile) && (
                                            <Badge color={isHourly(profile) ? 'blue' : 'purple'} size="sm">
                                                {formatLabel(profileType(profile))}
                                            </Badge>
                                        )}
                                    </div>
                                    <p className="mt-0.5 text-xs text-gray-500">
                                        {profile.user?.matricule ? `${profile.user.matricule} · ` : ''}
                                        {currentPay(profile) != null
                                            ? `${formatMoney(currentPay(profile))}${isHourly(profile) ? ' / hour' : ' / month'}`
                                            : 'Salary not set'}
                                    </p>
                                </div>
                                <div className="flex gap-2 shrink-0">
                                    <button
                                        onClick={() => openModal(profile, 'set-salary')}
                                        className="px-2.5 py-1.5 text-xs font-medium rounded bg-blue-600 text-white hover:bg-blue-700"
                                    >
                                        {isHourly(profile) ? 'Set Rate' : 'Set Salary'}
                                    </button>
                                    <button
                                        onClick={() => openModal(profile, 'allowance')}
                                        className="px-2.5 py-1.5 text-xs font-medium rounded bg-gray-100 text-gray-700 hover:bg-gray-200"
                                    >
                                        Allowance
                                    </button>
                                    <button
                                        onClick={() => openModal(profile, 'withholding')}
                                        className="px-2.5 py-1.5 text-xs font-medium rounded bg-gray-100 text-gray-700 hover:bg-gray-200"
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
            <Modal isOpen={!!action && !!selectedProfile} onClose={closeModal} title={modalTitle} size="sm">
                {action && selectedProfile && (
                    <div className="space-y-4">
                        <div className="bg-gray-50 rounded-lg p-3">
                            <p className="text-sm font-medium text-gray-900">{profileName(selectedProfile)}</p>
                            <p className="text-xs text-gray-500">
                                {profileType(selectedProfile) ? formatLabel(profileType(selectedProfile)) : 'Staff'}
                                {currentPay(selectedProfile) != null
                                    ? ` · Current: ${formatMoney(currentPay(selectedProfile))}${isHourly(selectedProfile) ? ' / hour' : ' / month'}`
                                    : ''}
                            </p>
                        </div>

                        <Input
                            label={amountLabel}
                            type="number"
                            min="0"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder={isHourly(selectedProfile) && action === 'set-salary' ? 'e.g. 1500' : 'e.g. 150000'}
                        />

                        <TextArea
                            label={action === 'set-salary' ? 'Reason (optional)' : 'Description'}
                            rows={2}
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder={action === 'set-salary'
                                ? 'e.g. Annual salary review'
                                : action === 'allowance' ? 'e.g. Transport allowance' : 'e.g. Salary advance recovery'}
                        />

                        {action === 'set-salary' && (
                            <p className="text-xs text-gray-500">
                                As Super Manager, this change is applied immediately — no separate approval step.
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
                                {action === 'set-salary' ? 'Apply Change' : action === 'allowance' ? 'Add Allowance' : 'Add Withholding'}
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
