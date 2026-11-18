'use client';

// Live CCTV (Super Manager, Manager, Principal, Vice Principal, Dean of Discipline, Discipline Coordinator): the NVR's cameras in a grid, click one to watch it large.
// Works at school and online; see CameraPlayer for how the video gets here.

import { useEffect, useMemo, useState } from 'react';
import {
    ArrowsPointingOutIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    VideoCameraIcon,
    XMarkIcon,
} from '@heroicons/react/24/outline';
import apiService from '@/lib/apiService';
import CameraPlayer from '@/components/cameras/CameraPlayer';

interface Camera {
    channel: number;
    name: string;
}

// Each low-res camera stream is about 0.5 Mbit/s of the school's upload when watched from
// outside, so the number of tiles on screen is the bandwidth control.
const LAYOUTS = [
    { perPage: 1, cols: 'grid-cols-1', label: '1' },
    { perPage: 4, cols: 'grid-cols-1 sm:grid-cols-2', label: '4' },
    { perPage: 9, cols: 'grid-cols-2 sm:grid-cols-3', label: '9' },
    { perPage: 12, cols: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4', label: '12' },
];

const LAYOUT_KEY = 'ssic.cameras.layout';

export default function CamerasPage() {
    const [cameras, setCameras] = useState<Camera[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [layoutIndex, setLayoutIndex] = useState(1);
    const [page, setPage] = useState(0);
    const [focused, setFocused] = useState<Camera | null>(null);
    const [hd, setHd] = useState(false);

    useEffect(() => {
        try {
            const saved = Number(localStorage.getItem(LAYOUT_KEY));
            if (saved >= 0 && saved < LAYOUTS.length) setLayoutIndex(saved);
        } catch { /* storage unavailable */ }

        (async () => {
            try {
                const res = await apiService.get<{ success: boolean; data: Camera[] }>('/cameras', { silent: true });
                setCameras(res?.data ?? []);
            } catch {
                setError('Could not load the cameras.');
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const layout = LAYOUTS[layoutIndex];
    const pageCount = Math.max(1, Math.ceil(cameras.length / layout.perPage));
    const visible = useMemo(
        () => cameras.slice(page * layout.perPage, (page + 1) * layout.perPage),
        [cameras, page, layout.perPage],
    );

    const chooseLayout = (i: number) => {
        setLayoutIndex(i);
        setPage(0);
        try { localStorage.setItem(LAYOUT_KEY, String(i)); } catch { /* ignore */ }
    };

    const openCamera = (cam: Camera) => {
        setHd(false);
        setFocused(cam);
    };

    return (
        <div className="p-4 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <VideoCameraIcon className="h-6 w-6 text-gray-700" />
                    <h1 className="text-xl font-semibold text-gray-900">Cameras</h1>
                    <span className="ml-2 inline-flex items-center gap-1 text-xs text-red-600">
                        <span className="h-2 w-2 rounded-full bg-red-600 animate-pulse" /> Live
                    </span>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 text-sm">
                        <span className="text-gray-500 mr-1">Cameras per screen</span>
                        {LAYOUTS.map((l, i) => (
                            <button
                                key={l.label}
                                onClick={() => chooseLayout(i)}
                                className={`px-2.5 py-1 rounded border text-sm ${i === layoutIndex
                                    ? 'bg-blue-600 border-blue-600 text-white'
                                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                            >
                                {l.label}
                            </button>
                        ))}
                    </div>

                    {pageCount > 1 && (
                        <div className="flex items-center gap-1 text-sm">
                            <button
                                onClick={() => setPage(p => (p - 1 + pageCount) % pageCount)}
                                className="p-1 rounded border border-gray-300 bg-white hover:bg-gray-50"
                                aria-label="Previous cameras"
                            >
                                <ChevronLeftIcon className="h-4 w-4" />
                            </button>
                            <span className="px-1 text-gray-600">{page + 1} / {pageCount}</span>
                            <button
                                onClick={() => setPage(p => (p + 1) % pageCount)}
                                className="p-1 rounded border border-gray-300 bg-white hover:bg-gray-50"
                                aria-label="Next cameras"
                            >
                                <ChevronRightIcon className="h-4 w-4" />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {loading && <p className="text-sm text-gray-500">Loading cameras…</p>}
            {error && <p className="text-sm text-red-600">{error}</p>}

            {!loading && !error && !focused && (
                <div className={`grid gap-2 ${layout.cols}`}>
                    {visible.map(cam => (
                        <div key={cam.channel} className="relative group rounded overflow-hidden">
                            <CameraPlayer stream={`cam${cam.channel}`} className="aspect-video" />
                            <div className="absolute top-0 inset-x-0 flex items-center justify-between px-2 py-1 bg-gradient-to-b from-black/70 to-transparent">
                                <span className="text-xs font-medium text-white">{cam.name}</span>
                                <button
                                    onClick={() => openCamera(cam)}
                                    className="p-1 rounded text-white/80 hover:text-white hover:bg-white/20"
                                    aria-label={`Open ${cam.name}`}
                                >
                                    <ArrowsPointingOutIcon className="h-4 w-4" />
                                </button>
                            </div>
                            <button
                                onClick={() => openCamera(cam)}
                                className="absolute inset-0 top-8 cursor-zoom-in"
                                aria-label={`Watch ${cam.name}`}
                            />
                        </div>
                    ))}
                </div>
            )}

            {focused && (
                <div className="fixed inset-0 z-50 bg-black/90 flex flex-col">
                    <div className="flex items-center justify-between px-4 py-2 text-white">
                        <span className="font-medium">{focused.name}</span>
                        <div className="flex items-center gap-3">
                            <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={hd}
                                    onChange={e => setHd(e.target.checked)}
                                    className="rounded"
                                />
                                HD
                            </label>
                            <button
                                onClick={() => setFocused(null)}
                                className="p-1 rounded hover:bg-white/20"
                                aria-label="Close"
                            >
                                <XMarkIcon className="h-6 w-6" />
                            </button>
                        </div>
                    </div>
                    <div className="flex-1 min-h-0 px-2 pb-2">
                        <CameraPlayer
                            key={`${focused.channel}-${hd}`}
                            stream={`cam${focused.channel}${hd ? '_hd' : ''}`}
                            className="w-full h-full"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
