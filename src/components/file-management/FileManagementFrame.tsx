'use client';

// File Management: the school's file-sharing app (send files to colleagues, shared ARCHIVES) shown inside the SMS.
// The SMS backend checks who is signed in, works out which ARCHIVES folders their role may open, and proxies the
// file app. An iframe cannot send the login token, so we first ask for a short-lived link that sets a cookie for it.

import { useCallback, useEffect, useState } from 'react';
import apiService from '@/lib/apiService';
import { Button } from '@/components/ui';

type State =
    | { kind: 'loading' }
    | { kind: 'ready'; src: string }
    | { kind: 'error'; message: string };

// In production the API base is relative ("/api/v1"); in development it can be absolute.
const apiOrigin = (): string => {
    const base = process.env.NEXT_PUBLIC_API_BASE_URL || '';
    try { return /^https?:/i.test(base) ? new URL(base).origin : ''; } catch { return ''; }
};

// page: 'files' opens file sharing (send to colleagues); 'archives' opens the ARCHIVES explorer directly.
export default function FileManagementFrame({ page = 'files' }: { page?: 'files' | 'archives' }) {
    const title = page === 'archives' ? 'Archives' : 'File Management';
    const [state, setState] = useState<State>({ kind: 'loading' });
    const open = useCallback(async () => {
        setState({ kind: 'loading' });
        try {
            const res = await apiService.post<{ success: boolean; data?: { url: string }; error?: string }>(`/file-management/session${page === 'archives' ? '?page=archives' : ''}`, {});
            if (!res?.data?.url) throw new Error(res?.error || 'This page could not be opened.');
            setState({ kind: 'ready', src: apiOrigin() + res.data.url });
        } catch (e) {
            const status = (e as { status?: number })?.status;
            setState({
                kind: 'error',
                message: status === 403
                    ? 'Your account does not have access to File Management.'
                    : status === 503
                        ? 'File Management is not available right now. Please try again later.'
                        : (e as Error)?.message || 'File Management could not be opened.',
            });
        }
    }, [page]);

    useEffect(() => { open(); }, [open]);

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
                <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
                <Button variant="outline" onClick={open}>Reload</Button>
            </div>

            {state.kind === 'loading' && (
                <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">Opening {title}…</div>
            )}

            {state.kind === 'error' && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-700">{state.message}</div>
            )}

            {state.kind === 'ready' && (
                <iframe
                    key={state.src}
                    src={state.src}
                    title={title}
                    className="w-full rounded-lg border border-gray-200 bg-white"
                    style={{ height: 'calc(100vh - 170px)', minHeight: 520 }}
                    allow="clipboard-write"
                />
            )}
        </div>
    );
}
