// Talks to the school server's camera endpoints (/camera-stream/site/*): names, rename,
// pan/tilt. They live at school because only that server is on the cameras' network;
// online, the VPS forwards the same path down its tunnel. Like the video, they are
// authorised by a short-lived camera ticket from whichever server the page came from,
// not by the login token.

import apiService from '@/lib/apiService';

export interface Camera {
    channel: number;
    name: string;
}

export interface CameraSiteInfo {
    cameras: Camera[];
    canRename: boolean;
    canMove: boolean;
}

// Tickets last 2 minutes on the server; reuse one for a minute.
const TICKET_REUSE_MS = 60_000;
let cached: { ticket: string; at: number } | null = null;

export async function cameraTicket(fresh = false): Promise<string> {
    if (!fresh && cached && Date.now() - cached.at < TICKET_REUSE_MS) return cached.ticket;
    const res = await apiService.get<{ success: boolean; data: { ticket: string } }>('/cameras/stream-ticket', { silent: true });
    const ticket = res?.data?.ticket;
    if (!ticket) throw new Error('no ticket');
    cached = { ticket, at: Date.now() };
    return ticket;
}

async function site<T>(path: string, body?: unknown): Promise<T> {
    const send = async (fresh: boolean) => fetch(`/camera-stream/site/${path}`, {
        method: body === undefined ? 'GET' : 'POST',
        headers: {
            'X-Camera-Ticket': await cameraTicket(fresh),
            ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
    });
    let res = await send(false);
    if (res.status === 401) res = await send(true);
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.success) throw new Error(json?.error || 'The school camera server is not reachable.');
    return json.data as T;
}

export const loadCameraSite = () => site<CameraSiteInfo>('list');

export const renameCameraOnSite = (channel: number, name: string) =>
    site<Camera[]>('rename', { channel, name });

/** x = pan, y = tilt, each -1..1 (y > 0 is up); 0, 0 stops. */
export const moveCamera = (channel: number, x: number, y: number) =>
    site<void>('ptz', { channel, x, y });
