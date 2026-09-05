'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { toast } from 'react-hot-toast';
import apiService from '@/lib/apiService';
import {
    ArrowPathIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon,
    XCircleIcon,
    SignalIcon,
    SignalSlashIcon,
    ServerStackIcon,
    ClockIcon,
} from '@heroicons/react/24/outline';

type SyncStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'PARTIAL' | 'FAILED';

interface SyncLogEntry {
    id: number;
    syncId: string;
    startTime: string;
    endTime: string | null;
    status: SyncStatus;
    direction: 'PUSH' | 'PULL' | 'BIDIRECTIONAL';
    recordsProcessed: number;
    conflicts: unknown[];
    errors: string[];
    createdAt: string;
}

interface SyncStatusResponse {
    lastSync: SyncLogEntry | null;
    isOnline: boolean;
    remotePeerConfigured: boolean;
    autoSyncEnabled: boolean;
    autoSyncIntervalMinutes: number | null;
    serverId: string;
    syncInFlight: boolean;
}

const statusStyles: Record<SyncStatus, { badge: string; label: string; Icon: React.ElementType }> = {
    PENDING: { badge: 'bg-gray-100 text-gray-700', label: 'Pending', Icon: ClockIcon },
    IN_PROGRESS: { badge: 'bg-blue-100 text-blue-700', label: 'In progress', Icon: ArrowPathIcon },
    COMPLETED: { badge: 'bg-green-100 text-green-700', label: 'Completed', Icon: CheckCircleIcon },
    PARTIAL: { badge: 'bg-yellow-100 text-yellow-800', label: 'Partial', Icon: ExclamationTriangleIcon },
    FAILED: { badge: 'bg-red-100 text-red-700', label: 'Failed', Icon: XCircleIcon },
};

function StatusBadge({ status }: { status: SyncStatus }) {
    const s = statusStyles[status] ?? statusStyles.PENDING;
    const Icon = s.Icon;
    return (
        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${s.badge}`}>
            <Icon className="h-3.5 w-3.5" />
            {s.label}
        </span>
    );
}

function formatDateTime(iso: string | null | undefined): string {
    if (!iso) return '—';
    try {
        return new Date(iso).toLocaleString();
    } catch {
        return iso;
    }
}

function formatDuration(start: string, end: string | null): string {
    if (!end) return '—';
    const ms = new Date(end).getTime() - new Date(start).getTime();
    if (!Number.isFinite(ms) || ms < 0) return '—';
    if (ms < 1000) return `${ms}ms`;
    const s = Math.floor(ms / 1000);
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${m}m ${rem}s`;
}

export default function DataSyncPage() {
    const [status, setStatus] = useState<SyncStatusResponse | null>(null);
    const [logs, setLogs] = useState<SyncLogEntry[]>([]);
    const [isLoadingStatus, setIsLoadingStatus] = useState(true);
    const [isLoadingLogs, setIsLoadingLogs] = useState(true);
    const [isTriggering, setIsTriggering] = useState(false);

    const fetchStatus = useCallback(async (silent = false) => {
        try {
            if (!silent) setIsLoadingStatus(true);
            const res = await apiService.get<{ success: boolean; data: SyncStatusResponse; error?: string }>(
                '/system/sync/status'
            );
            if (res?.success && res.data) {
                setStatus(res.data);
            } else if (!silent) {
                toast.error(res?.error || 'Failed to load sync status');
            }
        } catch (err: any) {
            if (!silent) toast.error(err?.message || 'Failed to load sync status');
        } finally {
            if (!silent) setIsLoadingStatus(false);
        }
    }, []);

    const fetchLogs = useCallback(async (silent = false) => {
        try {
            if (!silent) setIsLoadingLogs(true);
            const res = await apiService.get<{ success: boolean; data: SyncLogEntry[]; error?: string }>(
                '/system/sync/logs?limit=20'
            );
            if (res?.success && Array.isArray(res.data)) {
                setLogs(res.data);
            } else if (!silent) {
                toast.error(res?.error || 'Failed to load sync logs');
            }
        } catch (err: any) {
            if (!silent) toast.error(err?.message || 'Failed to load sync logs');
        } finally {
            if (!silent) setIsLoadingLogs(false);
        }
    }, []);

    useEffect(() => {
        fetchStatus();
        fetchLogs();
    }, [fetchStatus, fetchLogs]);

    // Poll status silently while a manual trigger is running so the UI reflects
    // completion without a hard refresh. Also refresh every 30s in general.
    useEffect(() => {
        const id = setInterval(() => {
            fetchStatus(true);
        }, status?.syncInFlight ? 3000 : 30000);
        return () => clearInterval(id);
    }, [fetchStatus, status?.syncInFlight]);

    const handleTrigger = async () => {
        if (isTriggering) return;
        setIsTriggering(true);
        toast.loading('Synchronising with remote server…', { id: 'sync-trigger' });
        try {
            const res = await apiService.post<
                { success: boolean; message?: string; data?: { syncLog: SyncLogEntry }; error?: string },
                Record<string, never>
            >('/system/sync/trigger', {});
            if (res?.success) {
                const outcome = res.data?.syncLog?.status ?? 'COMPLETED';
                if (outcome === 'FAILED') {
                    toast.error('Sync failed. See the log entry for details.', { id: 'sync-trigger' });
                } else if (outcome === 'PARTIAL') {
                    toast.error('Sync partially completed — some records failed.', { id: 'sync-trigger' });
                } else {
                    toast.success(res.message || 'Sync completed', { id: 'sync-trigger' });
                }
            } else {
                toast.error(res?.error || 'Failed to trigger sync', { id: 'sync-trigger' });
            }
        } catch (err: any) {
            toast.error(err?.message || 'Failed to trigger sync', { id: 'sync-trigger' });
        } finally {
            setIsTriggering(false);
            await Promise.all([fetchStatus(true), fetchLogs(true)]);
        }
    };

    const canTrigger =
        !isTriggering &&
        !status?.syncInFlight &&
        !!status?.remotePeerConfigured;

    const disabledReason = !status
        ? ''
        : !status.remotePeerConfigured
            ? 'Remote peer is not configured on this server (REMOTE_SYNC_URL missing).'
            : status.syncInFlight
                ? 'A sync run is already in progress.'
                : '';

    return (
        <div className="p-4 md:p-6 space-y-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900">Data Synchronisation</h1>
                    <p className="mt-1 text-sm text-gray-600">
                        Review the last sync with the online server and trigger a new run when needed.
                    </p>
                </div>
                <Button
                    color="primary"
                    leftIcon={ArrowPathIcon}
                    isLoading={isTriggering || status?.syncInFlight}
                    disabled={!canTrigger}
                    onClick={handleTrigger}
                    title={disabledReason || 'Run a synchronisation now'}
                >
                    {isTriggering || status?.syncInFlight ? 'Synchronising…' : 'Synchronise now'}
                </Button>
            </div>

            {/* Status cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                <Card>
                    <CardBody>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Last synchronisation</p>
                                <p className="mt-1 text-lg font-semibold text-gray-900">
                                    {isLoadingStatus
                                        ? 'Loading…'
                                        : formatDateTime(status?.lastSync?.startTime)}
                                </p>
                                {status?.lastSync && (
                                    <div className="mt-2">
                                        <StatusBadge status={status.lastSync.status} />
                                    </div>
                                )}
                            </div>
                            <div className="p-3 bg-gray-50 rounded-lg">
                                <ClockIcon className="h-6 w-6 text-gray-500" />
                            </div>
                        </div>
                    </CardBody>
                </Card>

                <Card>
                    <CardBody>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Records processed</p>
                                <p className="mt-1 text-3xl font-semibold text-gray-900">
                                    {isLoadingStatus ? '—' : (status?.lastSync?.recordsProcessed ?? 0).toLocaleString()}
                                </p>
                                <p className="mt-2 text-xs text-gray-500">
                                    Errors: {status?.lastSync?.errors?.length ?? 0}
                                </p>
                            </div>
                            <div className="p-3 bg-gray-50 rounded-lg">
                                <ServerStackIcon className="h-6 w-6 text-gray-500" />
                            </div>
                        </div>
                    </CardBody>
                </Card>

                <Card>
                    <CardBody>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Peer reachable</p>
                                <p className="mt-1 text-lg font-semibold text-gray-900">
                                    {isLoadingStatus ? '—' : status?.isOnline ? 'Online' : 'Offline'}
                                </p>
                                <p className="mt-2 text-xs text-gray-500">
                                    {status?.remotePeerConfigured
                                        ? 'Remote peer configured'
                                        : 'REMOTE_SYNC_URL not set'}
                                </p>
                            </div>
                            <div className="p-3 bg-gray-50 rounded-lg">
                                {status?.isOnline ? (
                                    <SignalIcon className="h-6 w-6 text-green-600" />
                                ) : (
                                    <SignalSlashIcon className="h-6 w-6 text-red-500" />
                                )}
                            </div>
                        </div>
                    </CardBody>
                </Card>

                <Card>
                    <CardBody>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Auto-sync</p>
                                <p className="mt-1 text-lg font-semibold text-gray-900">
                                    {status?.autoSyncEnabled ? 'Enabled' : 'Disabled'}
                                </p>
                                <p className="mt-2 text-xs text-gray-500">
                                    {status?.autoSyncEnabled && status.autoSyncIntervalMinutes
                                        ? `Every ${status.autoSyncIntervalMinutes} min`
                                        : 'No schedule'}
                                </p>
                                <p className="mt-1 text-xs text-gray-400">Server: {status?.serverId ?? '—'}</p>
                            </div>
                            <div className="p-3 bg-gray-50 rounded-lg">
                                <ArrowPathIcon className="h-6 w-6 text-gray-500" />
                            </div>
                        </div>
                    </CardBody>
                </Card>
            </div>

            {/* Last-run errors */}
            {status?.lastSync?.errors && status.lastSync.errors.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Errors from the last run</CardTitle>
                    </CardHeader>
                    <CardBody>
                        <ul className="space-y-1 text-sm text-red-700 list-disc list-inside">
                            {status.lastSync.errors.slice(0, 20).map((e, i) => (
                                <li key={i} className="break-words">{e}</li>
                            ))}
                            {status.lastSync.errors.length > 20 && (
                                <li className="text-red-500">
                                    …and {status.lastSync.errors.length - 20} more
                                </li>
                            )}
                        </ul>
                    </CardBody>
                </Card>
            )}

            {/* Recent runs table */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>Recent synchronisation runs</CardTitle>
                        <Button
                            variant="outline"
                            size="sm"
                            leftIcon={ArrowPathIcon}
                            onClick={() => { fetchStatus(); fetchLogs(); }}
                            isLoading={isLoadingLogs || isLoadingStatus}
                        >
                            Refresh
                        </Button>
                    </div>
                </CardHeader>
                <CardBody className="p-0">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-2 text-left font-medium text-gray-500">Started</th>
                                    <th className="px-4 py-2 text-left font-medium text-gray-500">Status</th>
                                    <th className="px-4 py-2 text-left font-medium text-gray-500">Direction</th>
                                    <th className="px-4 py-2 text-right font-medium text-gray-500">Records</th>
                                    <th className="px-4 py-2 text-right font-medium text-gray-500">Duration</th>
                                    <th className="px-4 py-2 text-right font-medium text-gray-500">Errors</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 bg-white">
                                {isLoadingLogs ? (
                                    <tr>
                                        <td colSpan={6} className="px-4 py-6 text-center text-gray-500">Loading…</td>
                                    </tr>
                                ) : logs.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-4 py-6 text-center text-gray-500">
                                            No sync runs recorded yet.
                                        </td>
                                    </tr>
                                ) : (
                                    logs.map((log) => (
                                        <tr key={log.id}>
                                            <td className="px-4 py-2 text-gray-900 whitespace-nowrap">
                                                {formatDateTime(log.startTime)}
                                            </td>
                                            <td className="px-4 py-2"><StatusBadge status={log.status} /></td>
                                            <td className="px-4 py-2 text-gray-700">{log.direction}</td>
                                            <td className="px-4 py-2 text-right text-gray-900">
                                                {log.recordsProcessed.toLocaleString()}
                                            </td>
                                            <td className="px-4 py-2 text-right text-gray-700">
                                                {formatDuration(log.startTime, log.endTime)}
                                            </td>
                                            <td className="px-4 py-2 text-right text-gray-700">
                                                {log.errors?.length ?? 0}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardBody>
            </Card>
        </div>
    );
}
