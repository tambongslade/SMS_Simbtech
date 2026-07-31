'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    PlusIcon,
    Cog6ToothIcon,
    ArrowRightStartOnRectangleIcon,
    IdentificationIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '@/components/context/AuthContext';
import { useParentDashboard, type Child } from '../hooks/useParentDashboard';

// Full-screen "who do you want to check on?" picker — the parent portal's
// landing screen. One big card per child (like streaming-app profiles);
// tapping a child opens their snapshot.

const AVATAR_COLORS = [
    'from-blue-500 to-indigo-600',
    'from-emerald-500 to-teal-600',
    'from-amber-500 to-orange-600',
    'from-rose-500 to-pink-600',
    'from-violet-500 to-purple-600',
    'from-cyan-500 to-sky-600',
];

const avatarColor = (name: string) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

const initials = (name: string) =>
    name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join('');

export default function ChildPicker() {
    const router = useRouter();
    const { logout } = useAuth();
    const { data, isLoading, addChild } = useParentDashboard();

    const [showAdd, setShowAdd] = useState(false);
    const [newMatricule, setNewMatricule] = useState('');
    const [isAdding, setIsAdding] = useState(false);

    const children = data?.children ?? [];

    const openChild = (child: Child) => {
        if (!child.matricule) return;
        router.push(`/dashboard/parent-student/child-snapshot?matricule=${encodeURIComponent(child.matricule)}`);
    };

    const handleAdd = async () => {
        if (!newMatricule.trim()) return;
        setIsAdding(true);
        const ok = await addChild(newMatricule);
        setIsAdding(false);
        if (ok) {
            setNewMatricule('');
            setShowAdd(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] bg-gray-950 overflow-y-auto">
            <div className="min-h-full flex flex-col items-center justify-center px-6 py-12">
                <h1 className="text-2xl sm:text-3xl font-semibold text-white text-center">
                    Who do you want to check on?
                </h1>
                <p className="mt-2 text-sm text-gray-400 text-center">
                    Choose a child to see their results, fees and more.
                </p>

                {isLoading ? (
                    <div className="mt-12 flex gap-6">
                        {[0, 1].map(i => (
                            <div key={i} className="w-28 h-28 sm:w-36 sm:h-36 rounded-2xl bg-gray-800 animate-pulse" />
                        ))}
                    </div>
                ) : (
                    <div className="mt-10 sm:mt-12 flex flex-wrap items-start justify-center gap-6 sm:gap-8 max-w-3xl">
                        {children.map(child => (
                            <button
                                key={child.matricule ?? child.id}
                                onClick={() => openChild(child)}
                                className="group w-28 sm:w-36 text-center focus:outline-none"
                            >
                                {child.photo ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={child.photo}
                                        alt={child.name}
                                        className="w-28 h-28 sm:w-36 sm:h-36 rounded-2xl object-cover ring-2 ring-transparent group-hover:ring-white group-focus:ring-white transition-all group-hover:scale-105"
                                    />
                                ) : (
                                    <div className={`w-28 h-28 sm:w-36 sm:h-36 rounded-2xl bg-gradient-to-br ${avatarColor(child.name)} flex items-center justify-center ring-2 ring-transparent group-hover:ring-white group-focus:ring-white transition-all group-hover:scale-105`}>
                                        <span className="text-3xl sm:text-4xl font-bold text-white/95">{initials(child.name)}</span>
                                    </div>
                                )}
                                <p className="mt-3 text-sm sm:text-base font-medium text-gray-200 group-hover:text-white truncate">
                                    {child.name}
                                </p>
                                <p className="text-xs text-gray-500 truncate">
                                    {child.className ? `${child.className}${child.subclassName ? ` ${child.subclassName}` : ''}` : child.matricule}
                                </p>
                            </button>
                        ))}

                        {/* Add child */}
                        <button
                            onClick={() => setShowAdd(true)}
                            className="group w-28 sm:w-36 text-center focus:outline-none"
                        >
                            <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-2xl border-2 border-dashed border-gray-700 flex items-center justify-center group-hover:border-gray-400 group-hover:scale-105 transition-all">
                                <PlusIcon className="w-10 h-10 text-gray-600 group-hover:text-gray-300" />
                            </div>
                            <p className="mt-3 text-sm sm:text-base font-medium text-gray-400 group-hover:text-gray-200">
                                Add Child
                            </p>
                        </button>
                    </div>
                )}

                {/* Add child inline form */}
                {showAdd && (
                    <div className="mt-8 w-full max-w-sm bg-gray-900 border border-gray-800 rounded-xl p-4">
                        <label className="block text-sm text-gray-300 mb-2">Child&apos;s matricule</label>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <IdentificationIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                <input
                                    value={newMatricule}
                                    onChange={(e) => setNewMatricule(e.target.value)}
                                    placeholder="e.g. SS24STD0002"
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    autoFocus
                                />
                            </div>
                            <button
                                onClick={handleAdd}
                                disabled={!newMatricule.trim() || isAdding}
                                className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50"
                            >
                                {isAdding ? 'Checking…' : 'Add'}
                            </button>
                            <button
                                onClick={() => { setShowAdd(false); setNewMatricule(''); }}
                                className="px-3 py-2 text-sm rounded-lg text-gray-400 hover:text-white"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}

                {/* Footer actions */}
                <div className="mt-12 flex items-center gap-6">
                    <button
                        onClick={() => router.push('/dashboard/parent-student/settings')}
                        className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white"
                    >
                        <Cog6ToothIcon className="w-4 h-4" /> Settings
                    </button>
                    <button
                        onClick={logout}
                        className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white"
                    >
                        <ArrowRightStartOnRectangleIcon className="w-4 h-4" /> Sign Out
                    </button>
                </div>
            </div>
        </div>
    );
}
