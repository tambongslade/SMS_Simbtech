'use client';

// Plays one camera live in the browser.
//
// The school server runs go2rtc, which reads each camera and re-packs the camera's H.264 (or
// H.265 for HD) into fragmented MP4 without re-encoding. This component opens go2rtc's
// WebSocket through nginx at /camera-stream/api/ws (same site as the page, at school and
// online alike), tells it which codecs this browser can play, and feeds what comes back
// into a <video> through Media Source Extensions.
//
// Every stream needs a fresh ticket from the backend: nginx asks the backend whether the
// ticket belongs to an active user allowed to watch before it connects the socket to go2rtc.

import { useEffect, useRef, useState } from 'react';
import { cameraTicket } from '@/lib/cameraSite';

export type CameraStatus = 'connecting' | 'playing' | 'error';

const CODECS = [
    'avc1.640029', 'avc1.64002A', 'avc1.640033', 'avc1.4D401F', 'avc1.42E01E',
    'hvc1.1.6.L153.B0', 'hev1.1.6.L153.B0',
    'mp4a.40.2', 'mp4a.40.5', 'opus', 'flac',
];

// Keep the picture live: drop what is more than a few seconds behind.
const MAX_BUFFER_SECONDS = 6;
const MAX_LAG_SECONDS = 1.5;
const RETRY_MS = 4000;

function mediaSourceClass(): typeof MediaSource | null {
    if (typeof window === 'undefined') return null;
    // iPhone Safari only has ManagedMediaSource.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    return w.ManagedMediaSource || w.MediaSource || null;
}

async function streamUrl(stream: string): Promise<string> {
    const ticket = await cameraTicket();
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${proto}//${window.location.host}/camera-stream/api/ws?src=${encodeURIComponent(stream)}&ticket=${encodeURIComponent(ticket)}`;
}

interface Props {
    stream: string; // go2rtc stream name, e.g. cam3 or cam3_hd
    className?: string;
    muted?: boolean; // the camera's microphone; tiles stay muted, the large view can unmute
}

export default function CameraPlayer({ stream, className, muted = true }: Props) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [status, setStatus] = useState<CameraStatus>('connecting');
    const [message, setMessage] = useState('');

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;
        video.muted = muted;
        if (!muted) video.play().catch(() => { /* needs a click first; the sound button is one */ });
    }, [muted]);

    useEffect(() => {
        const video = videoRef.current;
        const MS = mediaSourceClass();
        if (!video) return;
        if (!MS) {
            setStatus('error');
            setMessage('This browser cannot play live video.');
            return;
        }

        let stopped = false;
        let ws: WebSocket | null = null;
        let retry: ReturnType<typeof setTimeout> | null = null;

        const report = (s: CameraStatus, msg = '') => {
            if (stopped) return;
            setStatus(s);
            setMessage(msg);
        };

        const connect = async () => {
            report('connecting');
            let url: string;
            try {
                url = await streamUrl(stream);
            } catch {
                report('error', 'Not allowed or not connected.');
                retry = setTimeout(connect, RETRY_MS * 2);
                return;
            }
            if (stopped) return;

            const ms = new MS();
            let sb: SourceBuffer | null = null;
            const queue: ArrayBuffer[] = [];
            let gotData = false;

            const pump = () => {
                if (!sb || sb.updating || queue.length === 0) return;
                try {
                    sb.appendBuffer(queue.shift()!);
                } catch {
                    // Buffer full: drop old video so the next piece fits.
                    try {
                        const b = sb.buffered;
                        if (b.length) sb.remove(b.start(0), Math.max(b.start(0), b.end(b.length - 1) - 2));
                    } catch { /* ignore */ }
                }
            };

            const trim = () => {
                if (!sb || sb.updating) return;
                const b = sb.buffered;
                if (!b.length) return;
                const end = b.end(b.length - 1);
                const start = b.start(0);
                if (end - video.currentTime > MAX_LAG_SECONDS) video.currentTime = end - 0.3;
                if (end - start > MAX_BUFFER_SECONDS) {
                    try { sb.remove(start, end - MAX_BUFFER_SECONDS / 2); } catch { /* ignore */ }
                }
            };

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (video as any).disableRemotePlayback = true;
            video.src = URL.createObjectURL(ms);

            ms.addEventListener('sourceopen', () => {
                URL.revokeObjectURL(video.src);
                const socket = new WebSocket(url);
                ws = socket;
                socket.binaryType = 'arraybuffer';
                socket.onopen = () => {
                    const supported = CODECS.filter(c => MS.isTypeSupported(`video/mp4; codecs="${c}"`));
                    socket.send(JSON.stringify({ type: 'mse', value: supported.join(',') }));
                };
                socket.onmessage = ev => {
                    if (typeof ev.data === 'string') {
                        const msg = JSON.parse(ev.data);
                        if (msg.type === 'mse') {
                            try {
                                sb = ms.addSourceBuffer(msg.value);
                                sb.mode = 'segments';
                                sb.addEventListener('updateend', () => { trim(); pump(); });
                            } catch {
                                report('error', stream.endsWith('_hd')
                                    ? 'This browser cannot play the HD stream. Switch back to normal quality.'
                                    : 'This browser cannot play this camera.');
                                socket.onclose = null;
                                socket.close();
                            }
                        } else if (msg.type === 'error') {
                            report('error', 'Camera not reachable.');
                        }
                        return;
                    }
                    queue.push(ev.data as ArrayBuffer);
                    pump();
                    if (!gotData) {
                        gotData = true;
                        video.play().catch(() => { /* muted autoplay is allowed */ });
                        report('playing');
                    }
                };
                socket.onclose = () => {
                    if (stopped) return;
                    report('connecting', 'Reconnecting…');
                    retry = setTimeout(connect, RETRY_MS);
                };
            }, { once: true });
        };

        connect();

        return () => {
            stopped = true;
            if (retry) clearTimeout(retry);
            if (ws) { ws.onclose = null; ws.close(); }
            video.removeAttribute('src');
            video.load();
        };
    }, [stream]);

    return (
        <div className={`relative bg-black ${className ?? ''}`}>
            <video ref={videoRef} className="w-full h-full object-contain" muted playsInline autoPlay />
            {status !== 'playing' && (
                <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-300 text-center px-2">
                    {status === 'connecting' ? (message || 'Connecting…') : message}
                </div>
            )}
        </div>
    );
}
