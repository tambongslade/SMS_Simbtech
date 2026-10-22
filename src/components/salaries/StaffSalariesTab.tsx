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
    // Backend field is salaryType; profileType/type kept as tolerant fallbacks.
    salaryType?: string | null;
    profileType?: string | null;
    status?: string | null; // PENDING_APPROVAL | ACTIVE | INACTIVE | REJECTED
    rejectionReason?: string | null;
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


const formatMoney = (amount?: number | null) =>
    amount == null ? null : `FCFA ${amount.toLocaleString()}`;

const formatLabel = (value: string) =>
    value.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

const profileType = (p?: SalaryProfile | null) =>
    (p?.salaryType ?? p?.profileType ?? p?.type ?? '').toUpperCase();
const isPending = (p?: SalaryProfile | null) => p?.status === 'PENDING_APPROVAL';
const profileStatusBadge = (p?: SalaryProfile | null): { color: 'yellow' | 'red' | 'gray'; text: string } | null => {
    switch (p?.status) {
        case 'PENDING_APPROVAL': return { color: 'yellow', text: 'Pending approval' };
        case 'REJECTED': return { color: 'red', text: 'Rejected' };
        case 'INACTIVE': return { color: 'gray', text: 'Inactive' };
        default: return null;
    }
};
const isHourly = (p?: SalaryProfile | null) => profileType(p).includes('HOURLY');
const currentPay = (p?: SalaryProfile | null) =>
    p ? (isHourly(p) ? p.hourlyRate : p.baseSalary) : null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const unwrapList = (raw: any): any[] =>
    Array.isArray(raw) ? raw
        : Array.isArray(raw?.items) ? raw.items
        : Array.isArray(raw?.data) ? raw.data
        : [];

// GET /salary/profiles returns { data: { items, page, limit, total, totalPages } }
// (max 100 per page), so page through all of them — otherwise staff beyond the
// first page (or everyone, when only data.data was read) showed "No salary set yet".
const PROFILES_PAGE_SIZE = 100;
const fetchAllProfiles = async (): Promise<SalaryProfile[]> => {
    const first = await apiService.get(`/salary/profiles?page=1&limit=${PROFILES_PAGE_SIZE}`);
    const totalPages = first?.data?.totalPages ?? 1;
    const rows: SalaryProfile[] = [...unwrapList(first?.data)];
    if (totalPages > 1) {
        const rest = await Promise.all(
            Array.from({ length: totalPages - 1 }, (_, i) =>
                apiService.get(`/salary/profiles?page=${i + 2}&limit=${PROFILES_PAGE_SIZE}`))
        );
        rest.forEach((page) => rows.push(...unwrapList(page?.data)));
    }
    return rows;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const extractRoles = (user: any): string[] =>
    (user.userRoles?.map((r: any) => r.role) ?? user.roles ?? [])
        .filter((r: string) => !NON_STAFF_ROLES.has(r));

// /users?limit=200 mixed personnel in with students/parents and silently cut the
// list off at 200 rows, so on a school with more than ~200 accounts many (or all)
// teachers never made it into the salary list. /users/personnel/search already
// excludes PARENT/STUDENT server-side; page through every page (backend caps
// limit at 100) so this stays a complete personnel list no matter how big staff gets.
const PERSONNEL_PAGE_SIZE = 100;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fetchAllPersonnel = async (): Promise<any[]> => {
    const first = await apiService.get(`/users/personnel/search?page=1&limit=${PERSONNEL_PAGE_SIZE}`);
    const totalPages = first?.meta?.totalPages ?? 1;
    const rows = [...unwrapList(first?.data)];
    if (totalPages > 1) {
        const rest = await Promise.all(
            Array.from({ length: totalPages - 1 }, (_, i) =>
                apiService.get(`/users/personnel/search?page=${i + 2}&limit=${PERSONNEL_PAGE_SIZE}`))
        );
        rest.forEach((page) => rows.push(...unwrapList(page?.data)));
    }
    return rows;
};

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
    const [roleFilter, setRoleFilter] = useState('all');

    const [action, setAction] = useState<SalaryAction | null>(null);
    const [selectedStaff, setSelectedStaff] = useState<StaffRow | null>(null);
    const [newProfileType, setNewProfileType] = useState('ADMIN_FIXED');
    const [amount, setAmount] = useState('');
    const [reason, setReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [reviewingId, setReviewingId] = useState<number | null>(null);

    useEffect(() => {
        const handle = setTimeout(() => setDebouncedSearch(search.trim().toLowerCase()), 300);
        return () => clearTimeout(handle);
    }, [search]);

    // All personnel (parents/students already excluded server-side) + existing profiles
    const { data: personnelList, error: usersError, isLoading: usersLoading, mutate: mutateUsers } = useSWR(
        '/users/personnel/search?all=true',
        fetchAllPersonnel,
        { onError: (err) => { if (err?.message !== 'Unauthorized') toast.error('Failed to load personnel.'); } }
    );
    const { data: profilesList, mutate: mutateProfiles } = useSWR('/salary/profiles?all=true', fetchAllProfiles, {
        onError: (err) => { if (err?.message !== 'Unauthorized') toast.error('Failed to load salary profiles.'); },
    });

    // Every distinct staff role present in the loaded personnel, for the Role filter.
    // Computed from the full list (not the already-filtered `staff` below) so the
    // options don't shrink as soon as another filter narrows the visible rows.
    const roleOptions = useMemo(() => {
        const roles = new Set<string>();
        (personnelList ?? []).forEach((user) => extractRoles(user).forEach((r) => roles.add(r)));
        return [
            { value: 'all', label: 'All Roles' },
            ...Array.from(roles).sort().map((r) => ({ value: r, label: formatLabel(r) })),
        ];
    }, [personnelList]);

    const staff = useMemo((): StaffRow[] => {
        const users = personnelList ?? [];
        const profiles = profilesList ?? [];
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
                roles: extractRoles(user),
                profile: profileByUser.get(user.id) ?? null,
            }))
            .filter(s => s.roles.length > 0)
            .filter(s => roleFilter === 'all' || s.roles.includes(roleFilter))
            .filter(s => {
                if (typeFilter === 'none') return !s.profile;
                if (typeFilter !== 'all') return profileType(s.profile) === typeFilter;
                return true;
            })
            .filter(s => {
                if (!debouncedSearch) return true;
                return `${s.name} ${s.matricule ?? ''}`.toLowerCase().includes(debouncedSearch);
            });
    }, [personnelList, profilesList, typeFilter, roleFilter, debouncedSearch]);

    const openModal = (row: StaffRow, nextAction: SalaryAction) => {
        setSelectedStaff(row);
        setAction(nextAction);
        setNewProfileType(row.roles.includes('TEACHER') ? 'TEACHER_HOURLY' : 'ADMIN_FIXED');
        setAmount('');
        setReason('');
        setFormError(null);
    };

    // Super Manager approves/rejects a profile a Manager proposed.
    const reviewProfile = async (row: StaffRow, decision: 'approve' | 'reject') => {
        if (!row.profile) return;
        let rejectReason = '';
        if (decision === 'reject') {
            rejectReason = window.prompt(`Reason for rejecting ${row.name}'s salary profile:`)?.trim() ?? '';
            if (!rejectReason) return;
        }
        setReviewingId(row.profile.id);
        try {
            await apiService.post(
                `/salary/profiles/${row.profile.id}/${decision}`,
                decision === 'reject' ? { reason: rejectReason } : {}
            );
            toast.success(decision === 'approve'
                ? `Salary profile approved for ${row.name}.`
                : `Salary profile rejected for ${row.name}.`);
            await mutateProfiles();
        } catch (err) {
            console.error(`Profile ${decision} failed:`, err);
        } finally {
            setReviewingId(null);
        }
    };

    const closeModal = () => {
        if (isSubmitting) return;
        setAction(null);
        setSelectedStaff(null);
    };

    const submit = async () => {
        if (!action || !selectedStaff) return;
        const parsedAmount = Number(amount);
        setFormError(null);
        if (!amount || Number.isNaN(parsedAmount) || parsedAmount < 0) {
            setFormError('Enter a valid amount.');
            return;
        }
        // Allowances require a reason server-side
        if (action === 'allowance' && !reason.trim()) {
            setFormError('Please describe the allowance.');
            return;
        }
        // The backend requires a reason for manager-submitted change requests
        if (requiresApproval && action === 'set-salary' && selectedStaff.profile && !reason.trim()) {
            setFormError('Please provide a reason for the salary change.');
            return;
        }

        setIsSubmitting(true);
        // Errors are surfaced inline in the modal (and as a toast) — silent stops
        // apiService from also raising its generic toast.
        const quiet = { silent: true };
        let createdNewProfile = false;
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
                    await apiService.post('/salary/change-requests', payload, quiet);
                } else {
                    // First salary for this staff member → create the profile
                    const hourly = newProfileType === 'TEACHER_HOURLY';
                    // Backend field is salaryType (TEACHER_HOURLY | ADMIN_FIXED); sending
                    // profileType was the cause of "Invalid salary_type".
                    await apiService.post('/salary/profiles', {
                        userId: selectedStaff.userId,
                        salaryType: newProfileType,
                        ...(hourly ? { hourlyRate: parsedAmount } : { baseSalary: parsedAmount }),
                        ...(reason.trim() ? { notes: reason.trim() } : {}),
                    }, quiet);
                    createdNewProfile = true;
                }
                toast.success(requiresApproval
                    ? (profile
                        ? `Change request submitted for ${selectedStaff.name} — awaiting Super Manager approval.`
                        : `Salary submitted for ${selectedStaff.name} — awaiting Super Manager approval.`)
                    : `Salary ${profile ? 'updated' : 'set'} for ${selectedStaff.name}.`);
            } else {
                if (!profile) {
                    setFormError('Set a salary for this staff member first.');
                    return;
                }
                const base = action === 'allowance' ? '/salary/allowances' : '/salary/withholdings';
                await apiService.post(base, {
                    salaryProfileId: profile.id,
                    userId: selectedStaff.userId,
                    ...(action === 'allowance' ? { type: 'ALLOWANCE' } : {}),
                    amount: parsedAmount,
                    description: reason.trim() || undefined,
                    reason: reason.trim() || undefined,
                }, quiet);
                toast.success(`${action === 'allowance' ? 'Allowance' : 'Withholding'} added for ${selectedStaff.name}.`);
            }
            setAction(null);
            setSelectedStaff(null);
            await Promise.all([mutateProfiles(), mutateUsers()]);
            // A brand-new (pending) profile shows in this staff list, not under
            // Change Requests, so don't navigate away for it.
            if (!createdNewProfile) onCreated?.(action);
        } catch (err) {
            console.error(`${action} submission failed:`, err);
            const message = err instanceof Error && err.message
                ? err.message
                : 'Something went wrong. Please try again.';
            setFormError(message);
            if (message !== 'Unauthorized') toast.error(message, { id: 'salary-form-error' });
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
                <div className="sm:w-48">
                    <Select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        options={roleOptions}
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
                            <li key={row.userId} className="px-3 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
                                <div className="min-w-0 sm:flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <p className="text-sm font-medium text-gray-900 break-words">{row.name}</p>
                                        {row.roles.slice(0, 3).map((role) => (
                                            <Badge key={role} color="gray" size="sm">{formatLabel(role)}</Badge>
                                        ))}
                                        {row.profile && (
                                            <Badge color={isHourly(row.profile) ? 'blue' : 'purple'} size="sm">
                                                {formatLabel(profileType(row.profile))}
                                            </Badge>
                                        )}
                                        {profileStatusBadge(row.profile) && (
                                            <Badge color={profileStatusBadge(row.profile)!.color} size="sm">
                                                {profileStatusBadge(row.profile)!.text}
                                            </Badge>
                                        )}
                                    </div>
                                    <p className="mt-0.5 text-xs text-gray-500">
                                        {row.matricule ? `${row.matricule} · ` : ''}
                                        {currentPay(row.profile) != null
                                            ? `${formatMoney(currentPay(row.profile))}${isHourly(row.profile) ? ' / hour' : ' / month'}`
                                            : 'No salary set yet'}
                                        {isPending(row.profile) ? ' · awaiting Super Manager approval' : ''}
                                        {row.profile?.status === 'REJECTED' && row.profile.rejectionReason
                                            ? ` · rejected: ${row.profile.rejectionReason}` : ''}
                                    </p>
                                </div>
                                <div className="grid grid-cols-3 gap-2 sm:flex sm:shrink-0">
                                    {!requiresApproval && isPending(row.profile) && (
                                        <>
                                            <button
                                                onClick={() => reviewProfile(row, 'approve')}
                                                disabled={reviewingId === row.profile!.id}
                                                className="px-2.5 py-2 sm:py-1.5 text-xs font-medium rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                                            >
                                                Approve
                                            </button>
                                            <button
                                                onClick={() => reviewProfile(row, 'reject')}
                                                disabled={reviewingId === row.profile!.id}
                                                className="px-2.5 py-2 sm:py-1.5 text-xs font-medium rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                                            >
                                                Reject
                                            </button>
                                        </>
                                    )}
                                    <button
                                        onClick={() => openModal(row, 'set-salary')}
                                        className="px-2.5 py-2 sm:py-1.5 text-xs font-medium rounded bg-blue-600 text-white hover:bg-blue-700"
                                    >
                                        {row.profile ? (isHourly(row.profile) ? 'Change Rate' : 'Change Salary') : 'Set Salary'}
                                    </button>
                                    <button
                                        onClick={() => openModal(row, 'allowance')}
                                        disabled={!row.profile}
                                        className="px-2.5 py-2 sm:py-1.5 text-xs font-medium rounded bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed"
                                        title={row.profile ? undefined : 'Set a salary first'}
                                    >
                                        Allowance
                                    </button>
                                    <button
                                        onClick={() => openModal(row, 'withholding')}
                                        disabled={!row.profile}
                                        className="px-2.5 py-2 sm:py-1.5 text-xs font-medium rounded bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed"
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
                            label={action === 'set-salary'
                                ? (modalProfile ? (requiresApproval ? 'Reason' : 'Reason (optional)') : 'Notes (optional)')
                                : 'Description'}
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

                        {formError && (
                            <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                                {formError}
                            </p>
                        )}

                        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
                            <button
                                onClick={closeModal}
                                disabled={isSubmitting}
                                className="w-full sm:w-auto px-4 py-2 text-sm font-medium rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <Button onClick={submit} isLoading={isSubmitting} className="w-full sm:w-auto justify-center">
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
