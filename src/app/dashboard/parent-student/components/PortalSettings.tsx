'use client';

import { useState } from 'react';
import { Card, CardBody, CardHeader, Button, Input } from '@/components/ui';
import {
    UserGroupIcon,
    DevicePhoneMobileIcon,
    ArrowRightStartOnRectangleIcon,
    PlusIcon,
    XMarkIcon,
    IdentificationIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '@/components/context/AuthContext';
import { useParentDashboard } from '../hooks/useParentDashboard';

// Settings for the password-free parent portal. There is no parent account on
// the server — everything here manages what this device remembers.
export default function PortalSettings() {
    const { logout } = useAuth();
    const { data, isLoading, addChild, removeChild } = useParentDashboard();

    const [newMatricule, setNewMatricule] = useState('');
    const [isAdding, setIsAdding] = useState(false);

    const remembered = (() => {
        try {
            const saved = JSON.parse(localStorage.getItem('rememberedLogin') || 'null');
            return saved?.type === 'matricule' ? String(saved.identifier || '') : '';
        } catch {
            return '';
        }
    })();
    const [rememberedShown, setRememberedShown] = useState(remembered);

    const handleAdd = async () => {
        if (!newMatricule.trim()) return;
        setIsAdding(true);
        const ok = await addChild(newMatricule);
        setIsAdding(false);
        if (ok) setNewMatricule('');
    };

    const forgetDevice = () => {
        try { localStorage.removeItem('rememberedLogin'); } catch { /* ignore */ }
        setRememberedShown('');
    };

    const children = data?.children ?? [];

    return (
        <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-5">
            <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Settings</h1>
                <p className="text-sm text-gray-500 mt-1">
                    Manage the children and sign-in saved on this device.
                </p>
            </div>

            {/* My children */}
            <Card>
                <CardHeader>
                    <h2 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                        <UserGroupIcon className="w-5 h-5 text-gray-400" />
                        My Children
                    </h2>
                </CardHeader>
                <CardBody className="space-y-4">
                    {isLoading ? (
                        <div className="space-y-2">
                            {[0, 1].map(i => <div key={i} className="h-10 rounded bg-gray-100 animate-pulse" />)}
                        </div>
                    ) : children.length === 0 ? (
                        <p className="text-sm text-gray-400">No children added yet.</p>
                    ) : (
                        <ul className="divide-y divide-gray-100">
                            {children.map(child => (
                                <li key={child.matricule ?? child.id} className="py-2.5 flex items-center justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-gray-900 truncate">{child.name}</p>
                                        <p className="text-xs text-gray-500">
                                            {child.matricule}
                                            {child.className ? ` · ${child.className}${child.subclassName ? ` ${child.subclassName}` : ''}` : ''}
                                        </p>
                                    </div>
                                    {children.length > 1 && child.matricule && (
                                        <button
                                            onClick={() => removeChild(child.matricule!)}
                                            className="shrink-0 p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                                            title="Remove from this device"
                                        >
                                            <XMarkIcon className="w-4 h-4" />
                                        </button>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}

                    <div className="flex flex-col sm:flex-row gap-3 sm:items-end pt-1">
                        <div className="flex-1">
                            <Input
                                label="Add a child"
                                placeholder="Enter another child's matricule"
                                value={newMatricule}
                                onChange={(e) => setNewMatricule(e.target.value)}
                                leftIcon={<IdentificationIcon className="h-4 w-4 text-gray-400" />}
                            />
                        </div>
                        <Button onClick={handleAdd} disabled={!newMatricule.trim() || isAdding} className="shrink-0">
                            <PlusIcon className="w-4 h-4 mr-1" />
                            {isAdding ? 'Checking…' : 'Add Child'}
                        </Button>
                    </div>
                </CardBody>
            </Card>

            {/* This device */}
            <Card>
                <CardHeader>
                    <h2 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                        <DevicePhoneMobileIcon className="w-5 h-5 text-gray-400" />
                        This Device
                    </h2>
                </CardHeader>
                <CardBody className="space-y-4">
                    {rememberedShown ? (
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <p className="text-sm text-gray-900">One-tap sign-in is on</p>
                                <p className="text-xs text-gray-500">
                                    This device remembers matricule <span className="font-medium">{rememberedShown}</span> for quick access.
                                </p>
                            </div>
                            <Button variant="outline" color="danger" size="sm" onClick={forgetDevice}>
                                Forget
                            </Button>
                        </div>
                    ) : (
                        <p className="text-sm text-gray-500">
                            No saved sign-in on this device. Tick “Remember me on this device” next time you sign in for one-tap access.
                        </p>
                    )}

                    <div className="border-t border-gray-100 pt-4">
                        <Button variant="outline" color="danger" onClick={logout}>
                            <ArrowRightStartOnRectangleIcon className="w-4 h-4 mr-1.5" />
                            Sign Out
                        </Button>
                        <p className="text-xs text-gray-400 mt-2">
                            Signing out removes all children and saved sign-in from this device.
                        </p>
                    </div>
                </CardBody>
            </Card>

            {/* No account note */}
            <p className="text-xs text-gray-400">
                The parent portal is matricule-based — there is no account or password to manage.
                To update your contact details held by the school, please contact the school office.
            </p>
        </div>
    );
}
