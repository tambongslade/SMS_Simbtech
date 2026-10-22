'use client';

import { Fragment, useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import apiService from '@/lib/apiService';

// --- Types (mirror GET /sync-overview, camelCased) ---
type TableStatus = 'in_sync' | 'local_ahead' | 'online_ahead' | 'unknown';

type TableComparison = {
    table: string;
    local: number | null;
    online: number | null;
    difference: number | null;
    status: TableStatus;
    localLatest: string | null;
    onlineLatest: string | null;
};

type CategoryComparison = {
    key: string;
    label: string;
    status: 'in_sync' | 'out_of_sync' | 'unknown';
    tables: TableComparison[];
};

type SyncOverview = {
    generatedAt: string;
    localServerId: string;
    online: { reachable: boolean; serverId: string | null; error: string | null };
    summary: { categories: number; inSync: number; outOfSync: number; unknown: number };
    categories: CategoryComparison[];
};

const REFRESH_MS = 60_000;

const CATEGORY_BADGE: Record<CategoryComparison['status'], { label: string; className: string }> = {
    in_sync: { label: 'Synchronized', className: 'bg-green-100 text-green-800' },
    out_of_sync: { label: 'Not synchronized', className: 'bg-amber-100 text-amber-800' },
    unknown: { label: 'Unknown', className: 'bg-gray-100 text-gray-600' },
};

const TABLE_TEXT: Record<TableStatus, { label: string; className: string }> = {
    in_sync: { label: 'Synchronized', className: 'text-green-700' },
    local_ahead: { label: 'Local has more – waiting to reach online', className: 'text-amber-700' },
    online_ahead: { label: 'Online has more – waiting to reach local', className: 'text-amber-700' },
    unknown: { label: 'Unknown', className: 'text-gray-500' },
};

// "SchoolFees" -> "School Fees"
const tableLabel = (name: string) => name.replace(/([a-z])([A-Z])/g, '$1 $2');
const formatCount = (n: number | null) => (n === null ? '–' : n.toLocaleString());
const formatTime = (iso: string | null) => (iso ? new Date(iso).toLocaleString() : '–');

export default function SyncStatusPage() {
    const [data, setData] = useState<SyncOverview | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [expanded, setExpanded] = useState<Set<string>>(new Set());

    const load = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const res = await apiService.get<{ success: boolean; data: SyncOverview; error?: string }>('/sync-overview');
            if (!res.success) throw new Error(res.error || 'Failed to load the sync overview');
            setData(res.data);
            setError(null);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to load the sync overview';
            setError(message);
            if (!silent) toast.error(message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
        const timer = setInterval(() => load(true), REFRESH_MS);
        return () => clearInterval(timer);
    }, [load]);

    const toggle = (key: string) =>
        setExpanded(prev => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });

    return (
        <div className="container mx-auto p-4 md:p-6">
            <div className="flex items-center justify-between mb-4 gap-3">
                <div>
                    <h1 className="text-2xl font-bold">Sync Status</h1>
                    <p className="text-sm text-gray-500">
                        Records held by this (local) server compared with the online server, by area.
                    </p>
                </div>
                <button
                    onClick={() => load()}
                    disabled={loading}
                    className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                >
                    <ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            {error && <div className="mb-4 p-3 rounded bg-red-50 text-red-700 text-sm">{error}</div>}
            {loading && !data && <div className="py-10 text-center text-gray-600">Comparing servers...</div>}

            {data && (
                <>
                    {!data.online.reachable && (
                        <div className="mb-4 p-3 rounded bg-amber-50 text-amber-800 text-sm">
                            Cannot compare with the online server: {data.online.error}
                        </div>
                    )}

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                        <div className="p-3 rounded bg-white shadow">
                            <div className="text-xs text-gray-500">Areas</div>
                            <div className="text-xl font-semibold">{data.summary.categories}</div>
                        </div>
                        <div className="p-3 rounded bg-green-50 shadow">
                            <div className="text-xs text-gray-500">Synchronized</div>
                            <div className="text-xl font-semibold text-green-700">{data.summary.inSync}</div>
                        </div>
                        <div className="p-3 rounded bg-amber-50 shadow">
                            <div className="text-xs text-gray-500">Not synchronized</div>
                            <div className="text-xl font-semibold text-amber-700">{data.summary.outOfSync}</div>
                        </div>
                        <div className="p-3 rounded bg-gray-50 shadow">
                            <div className="text-xs text-gray-500">Unknown</div>
                            <div className="text-xl font-semibold text-gray-600">{data.summary.unknown}</div>
                        </div>
                    </div>

                    <div className="bg-white rounded shadow overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    {['Area', 'Local server', 'Online server', 'Difference', 'Status'].map(h => (
                                        <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {data.categories.map(category => {
                                    const open = expanded.has(category.key);
                                    const sum = (pick: (t: TableComparison) => number | null) =>
                                        category.tables.reduce((acc, t) => acc + (pick(t) ?? 0), 0);
                                    const local = sum(t => t.local);
                                    const online = data.online.reachable ? sum(t => t.online) : null;
                                    const badge = CATEGORY_BADGE[category.status];
                                    return (
                                        <Fragment key={category.key}>
                                            <tr onClick={() => toggle(category.key)} className="cursor-pointer hover:bg-gray-50">
                                                <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                                    <span className="inline-block w-4 text-gray-400">{open ? '▾' : '▸'}</span>
                                                    {category.label}
                                                    <span className="ml-2 text-xs text-gray-400">{category.tables.length} tables</span>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-700">{formatCount(local)}</td>
                                                <td className="px-4 py-3 text-sm text-gray-700">{formatCount(online)}</td>
                                                <td className="px-4 py-3 text-sm text-gray-700">
                                                    {online === null ? '–' : (local - online).toLocaleString()}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badge.className}`}>{badge.label}</span>
                                                </td>
                                            </tr>
                                            {open && (
                                                <tr className="bg-gray-50">
                                                    <td colSpan={5} className="px-4 py-3">
                                                        <table className="min-w-full text-sm">
                                                            <thead>
                                                                <tr className="text-xs text-gray-500 text-left">
                                                                    <th className="py-1 pr-4 font-medium">Entry</th>
                                                                    <th className="py-1 pr-4 font-medium">Local</th>
                                                                    <th className="py-1 pr-4 font-medium">Online</th>
                                                                    <th className="py-1 pr-4 font-medium">Difference</th>
                                                                    <th className="py-1 pr-4 font-medium">Last change (local / online)</th>
                                                                    <th className="py-1 font-medium">Status</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {category.tables.map(t => (
                                                                    <tr key={t.table} className="border-t border-gray-200">
                                                                        <td className="py-1.5 pr-4 text-gray-800">{tableLabel(t.table)}</td>
                                                                        <td className="py-1.5 pr-4">{formatCount(t.local)}</td>
                                                                        <td className="py-1.5 pr-4">{formatCount(t.online)}</td>
                                                                        <td className="py-1.5 pr-4">{t.difference === null ? '–' : t.difference.toLocaleString()}</td>
                                                                        <td className="py-1.5 pr-4 text-xs text-gray-500">
                                                                            {formatTime(t.localLatest)} / {formatTime(t.onlineLatest)}
                                                                        </td>
                                                                        <td className={`py-1.5 ${TABLE_TEXT[t.status].className}`}>{TABLE_TEXT[t.status].label}</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </td>
                                                </tr>
                                            )}
                                        </Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    <p className="mt-3 text-xs text-gray-400">
                        Checked {formatTime(data.generatedAt)} · refreshes every minute · counts are compared per table; a few
                        tables legitimately differ (for example accounts that only exist on one server).
                    </p>
                </>
            )}
        </div>
    );
}
