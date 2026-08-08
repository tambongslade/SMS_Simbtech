'use client';

import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
    UserIcon,
    BellIcon,
    ShieldCheckIcon,
    InformationCircleIcon,
    EyeIcon,
    EyeSlashIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon,
    ArrowRightOnRectangleIcon,
    SwatchIcon,
} from '@heroicons/react/24/outline';
import { Card, CardHeader, CardTitle, CardBody, Button, Input, Select } from '@/components/ui';
import { useAuth } from '@/components/context/AuthContext';
import { apiService } from '@/lib/apiService';
import { getPushState, setPushEnabled, type PushState } from '@/lib/push';
import {
    fetchMe,
    updateMe,
    fetchUserSettings,
    updateUserSettings,
    loadLocalPrefs,
    saveLocalPrefs,
    isValidTime,
    NOTIFICATION_CATEGORIES,
    CATEGORY_LABELS,
    type MeProfile,
    type UserSettings,
    type NotificationCategory,
    type LocalPrefs,
    type Theme,
} from '@/lib/userSettings';

// Settings shared by every signed-in role. Roles differ enormously across this
// app, but "who am I, what's my password, what do I get notified about" does
// not — so this lives at /dashboard/settings rather than being copied per role.

type TabId = 'profile' | 'security' | 'notifications' | 'preferences' | 'about';

const TABS: { id: TabId; label: string; icon: typeof UserIcon }[] = [
    { id: 'profile', label: 'Profile', icon: UserIcon },
    { id: 'security', label: 'Password', icon: ShieldCheckIcon },
    { id: 'notifications', label: 'Notifications', icon: BellIcon },
    { id: 'preferences', label: 'Preferences', icon: SwatchIcon },
    { id: 'about', label: 'About', icon: InformationCircleIcon },
];

/** Small labelled on/off switch used throughout the notification tab. */
function Toggle({
    checked, onChange, label, description, disabled,
}: {
    checked: boolean;
    onChange: (next: boolean) => void;
    label: string;
    description?: string;
    disabled?: boolean;
}) {
    return (
        <div className="flex items-center justify-between gap-4 py-2">
            <div className="min-w-0">
                <p className="font-medium text-gray-900">{label}</p>
                {description && <p className="text-sm text-gray-500 mt-0.5">{description}</p>}
            </div>
            <button
                type="button"
                role="switch"
                aria-checked={checked}
                aria-label={label}
                disabled={disabled}
                onClick={() => onChange(!checked)}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${checked ? 'bg-blue-600' : 'bg-gray-300'
                    } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
                <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'
                        }`}
                />
            </button>
        </div>
    );
}

export default function SettingsPage() {
    const { user, selectedRole, logout } = useAuth();
    const [activeTab, setActiveTab] = useState<TabId>('profile');

    // ---- Profile -----------------------------------------------------------
    // `original` is kept so we can send only what actually changed.
    const [original, setOriginal] = useState<MeProfile | null>(null);
    const [profile, setProfile] = useState<MeProfile | null>(null);
    const [profileLoading, setProfileLoading] = useState(true);
    const [profileSaving, setProfileSaving] = useState(false);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const me = await fetchMe();
                if (!cancelled) { setOriginal(me); setProfile(me); }
            } catch {
                // Fall back to the cached auth user so the page still renders.
                if (!cancelled && user) {
                    const fallback: MeProfile = {
                        id: user.id,
                        name: user.name ?? '',
                        email: user.email ?? '',
                        phone: user.phone ?? '',
                        address: user.address ?? '',
                        matricule: user.matricule ?? '',
                    };
                    setOriginal(fallback);
                    setProfile(fallback);
                }
            } finally {
                if (!cancelled) setProfileLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [user]);

    const saveProfile = async () => {
        if (!profile || !original) return;
        if (!profile.name.trim()) {
            toast.error('Name cannot be empty.');
            return;
        }
        setProfileSaving(true);
        try {
            const { changed, profile: updated } = await updateMe(original, profile);
            if (!changed) {
                toast('Nothing to save.');
                return;
            }
            const next = updated ?? profile;
            setOriginal(next);
            setProfile(next);
            toast.success('Profile updated');
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Could not update your profile.');
        } finally {
            setProfileSaving(false);
        }
    };

    // ---- Password ----------------------------------------------------------
    const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
    const [showPw, setShowPw] = useState(false);
    const [pwSaving, setPwSaving] = useState(false);

    const changePassword = async () => {
        if (!pw.current || !pw.next) {
            toast.error('Fill in both your current and new password.');
            return;
        }
        if (pw.next.length < 8) {
            toast.error('Your new password must be at least 8 characters.');
            return;
        }
        if (pw.next !== pw.confirm) {
            toast.error('The new passwords do not match.');
            return;
        }
        if (pw.next === pw.current) {
            toast.error('Your new password must be different from the current one.');
            return;
        }
        setPwSaving(true);
        try {
            await apiService.post('/auth/change-password', {
                currentPassword: pw.current,
                newPassword: pw.next,
            });
            setPw({ current: '', next: '', confirm: '' });
            // The backend blacklists the current token, so every later request
            // would 401. Sign out deliberately rather than let the app break.
            toast.success('Password changed. Please sign in again.');
            setTimeout(() => logout(), 1200);
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Could not change your password.');
            setPwSaving(false);
        }
    };

    // ---- Server-side settings ---------------------------------------------
    const [settings, setSettings] = useState<UserSettings | null>(null);
    const [settingsLoading, setSettingsLoading] = useState(true);
    const [savingKey, setSavingKey] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const s = await fetchUserSettings();
                if (!cancelled) setSettings(s);
            } catch {
                if (!cancelled) setSettings(null);
            } finally {
                if (!cancelled) setSettingsLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    // Optimistic: flip locally, roll back if the server rejects it. The whole
    // preference set goes up each time — see updateUserSettings.
    const patchSettings = async (patch: Partial<UserSettings>, key: string) => {
        if (!settings) return;
        const previous = settings;
        const next = { ...settings, ...patch };
        setSettings(next);
        setSavingKey(key);
        try {
            setSettings(await updateUserSettings(next));
        } catch (e) {
            setSettings(previous);
            toast.error(e instanceof Error ? e.message : 'Could not save that setting.');
        } finally {
            setSavingKey(null);
        }
    };

    const toggleCategory = (category: NotificationCategory) => {
        if (!settings) return;
        const muted = settings.mutedCategories ?? [];
        const next = muted.includes(category)
            ? muted.filter(c => c !== category)
            : [...muted, category];
        patchSettings({ mutedCategories: next }, `cat-${category}`);
    };

    // ---- Device-local preferences -----------------------------------------
    const [localPrefs, setLocalPrefs] = useState<LocalPrefs>({ theme: 'SYSTEM', language: 'en' });
    useEffect(() => { setLocalPrefs(loadLocalPrefs()); }, []);

    const updateLocalPrefs = (patch: Partial<LocalPrefs>) => {
        const next = { ...localPrefs, ...patch };
        setLocalPrefs(next);
        saveLocalPrefs(next);
        toast.success('Preference saved');
    };

    // ---- Device push (OneSignal) ------------------------------------------
    const [push, setPush] = useState<PushState>({ supported: false, permission: 'unknown', optedIn: false });
    const [pushBusy, setPushBusy] = useState(false);

    const refreshPush = useCallback(async () => setPush(await getPushState()), []);
    useEffect(() => { refreshPush(); }, [refreshPush]);

    const togglePush = async (enabled: boolean) => {
        setPushBusy(true);
        try {
            const next = await setPushEnabled(enabled);
            setPush(next);
            if (enabled && next.permission === 'denied') {
                toast.error('Notifications are blocked in your device settings. Enable them there first.');
            } else {
                toast.success(enabled ? 'Notifications on' : 'Notifications off');
            }
        } catch {
            toast.error('Could not change your notification setting.');
        } finally {
            setPushBusy(false);
        }
    };

    // ---- Quiet hours (validated locally before sending) --------------------
    const [quiet, setQuiet] = useState({ start: '', end: '' });
    const quietStart = settings?.quietHoursStart ?? '';
    const quietEnd = settings?.quietHoursEnd ?? '';
    useEffect(() => {
        setQuiet({ start: quietStart, end: quietEnd });
    }, [quietStart, quietEnd]);

    const saveQuietHours = () => {
        if (!isValidTime(quiet.start) || !isValidTime(quiet.end)) {
            toast.error('Enter times as HH:MM, for example 22:00.');
            return;
        }
        patchSettings({ quietHoursStart: quiet.start, quietHoursEnd: quiet.end }, 'quiet');
    };

    return (
        <div className="p-4 sm:p-6 max-w-3xl mx-auto">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
                <p className="text-sm text-gray-500 mt-1">
                    Manage your account, password and notifications.
                </p>
            </div>

            <div className="flex gap-1 overflow-x-auto border-b border-gray-200 mb-6 -mx-4 px-4 sm:mx-0 sm:px-0">
                {TABS.map(tab => {
                    const Icon = tab.icon;
                    const active = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${active
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            <Icon className="h-4 w-4" />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {activeTab === 'profile' && (
                <Card>
                    <CardHeader><CardTitle>Your details</CardTitle></CardHeader>
                    <CardBody className="space-y-4">
                        {profileLoading ? (
                            <p className="text-sm text-gray-500">Loading…</p>
                        ) : !profile ? (
                            <p className="text-sm text-gray-500">Your profile could not be loaded.</p>
                        ) : (
                            <>
                                <Input
                                    label="Full name"
                                    value={profile.name}
                                    onChange={e => setProfile({ ...profile, name: e.target.value })}
                                />
                                {/* Email is deliberately read-only: the backend refuses to
                                    change it here, so an editable box would silently lie. */}
                                <Input
                                    label="Email"
                                    value={profile.email ?? ''}
                                    disabled
                                    helperText="Contact an administrator to change your email."
                                />
                                <Input
                                    label="Phone"
                                    value={profile.phone ?? ''}
                                    onChange={e => setProfile({ ...profile, phone: e.target.value })}
                                />
                                <Input
                                    label="WhatsApp number"
                                    value={profile.whatsappNumber ?? ''}
                                    onChange={e => setProfile({ ...profile, whatsappNumber: e.target.value })}
                                />
                                <Input
                                    label="Address"
                                    value={profile.address ?? ''}
                                    onChange={e => setProfile({ ...profile, address: e.target.value })}
                                />
                                <Input
                                    label="ID card number"
                                    value={profile.idCardNum ?? ''}
                                    onChange={e => setProfile({ ...profile, idCardNum: e.target.value })}
                                />
                                <Input
                                    label="Date of birth"
                                    type="date"
                                    value={(profile.dateOfBirth ?? '').slice(0, 10)}
                                    onChange={e => setProfile({ ...profile, dateOfBirth: e.target.value })}
                                />
                                <Select
                                    label="Gender"
                                    value={profile.gender ?? ''}
                                    onChange={e => setProfile({ ...profile, gender: e.target.value })}
                                    options={[
                                        { value: '', label: 'Not specified' },
                                        { value: 'Male', label: 'Male' },
                                        { value: 'Female', label: 'Female' },
                                    ]}
                                />
                                <div className="pt-2">
                                    <Button onClick={saveProfile} isLoading={profileSaving}>
                                        Save changes
                                    </Button>
                                </div>
                            </>
                        )}
                    </CardBody>
                </Card>
            )}

            {activeTab === 'security' && (
                <Card>
                    <CardHeader><CardTitle>Change password</CardTitle></CardHeader>
                    <CardBody className="space-y-4">
                        <div className="flex gap-3 p-4 bg-blue-50 rounded-lg">
                            <InformationCircleIcon className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                            <p className="text-sm text-blue-900">
                                You will be signed out after changing your password, and will need
                                to sign in again with the new one.
                            </p>
                        </div>
                        <Input
                            label="Current password"
                            type={showPw ? 'text' : 'password'}
                            value={pw.current}
                            autoComplete="current-password"
                            onChange={e => setPw({ ...pw, current: e.target.value })}
                        />
                        <Input
                            label="New password"
                            type={showPw ? 'text' : 'password'}
                            value={pw.next}
                            autoComplete="new-password"
                            helperText="At least 8 characters."
                            onChange={e => setPw({ ...pw, next: e.target.value })}
                        />
                        <Input
                            label="Confirm new password"
                            type={showPw ? 'text' : 'password'}
                            value={pw.confirm}
                            autoComplete="new-password"
                            onChange={e => setPw({ ...pw, confirm: e.target.value })}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPw(v => !v)}
                            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800"
                        >
                            {showPw ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                            {showPw ? 'Hide passwords' : 'Show passwords'}
                        </button>
                        <div className="pt-2">
                            <Button onClick={changePassword} isLoading={pwSaving}>
                                Update password
                            </Button>
                        </div>
                    </CardBody>
                </Card>
            )}

            {activeTab === 'notifications' && (
                <div className="space-y-6">
                    <Card>
                        <CardHeader><CardTitle>This device</CardTitle></CardHeader>
                        <CardBody className="space-y-4">
                            {!push.supported ? (
                                <div className="flex gap-3 p-4 bg-blue-50 rounded-lg">
                                    <InformationCircleIcon className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                                    <div className="text-sm text-blue-900">
                                        <p className="font-medium">Available in the mobile app</p>
                                        <p className="mt-1 text-blue-800">
                                            Install St Stephen International on your phone to get push
                                            notifications for messages, fees and results.
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <Toggle
                                        label="Allow notifications"
                                        description="Messages, fee reminders, results and announcements."
                                        checked={push.optedIn}
                                        disabled={pushBusy}
                                        onChange={togglePush}
                                    />
                                    {push.permission === 'denied' && (
                                        <div className="flex gap-3 p-4 bg-amber-50 rounded-lg">
                                            <ExclamationTriangleIcon className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                                            <div className="text-sm text-amber-900">
                                                <p className="font-medium">Blocked on this device</p>
                                                <p className="mt-1 text-amber-800">
                                                    Turn notifications back on in your device settings for
                                                    St Stephen International, then return here.
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                    {push.permission === 'granted' && push.optedIn && (
                                        <div className="flex items-center gap-2 text-sm text-green-700">
                                            <CheckCircleIcon className="h-4 w-4" />
                                            This device is registered for notifications.
                                        </div>
                                    )}
                                </>
                            )}
                        </CardBody>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle>How we reach you</CardTitle></CardHeader>
                        <CardBody>
                            {settingsLoading ? (
                                <p className="text-sm text-gray-500">Loading…</p>
                            ) : !settings ? (
                                <p className="text-sm text-gray-500">
                                    Your preferences could not be loaded. Please try again later.
                                </p>
                            ) : (
                                <div className="divide-y divide-gray-100">
                                    <Toggle
                                        label="Push notifications"
                                        description="Alerts on your phone."
                                        checked={settings.notificationsPush}
                                        disabled={savingKey === 'push'}
                                        onChange={v => patchSettings({ notificationsPush: v }, 'push')}
                                    />
                                    <Toggle
                                        label="Email"
                                        checked={settings.notificationsEmail}
                                        disabled={savingKey === 'email'}
                                        onChange={v => patchSettings({ notificationsEmail: v }, 'email')}
                                    />
                                    <Toggle
                                        label="SMS"
                                        checked={settings.notificationsSms}
                                        disabled={savingKey === 'sms'}
                                        onChange={v => patchSettings({ notificationsSms: v }, 'sms')}
                                    />
                                </div>
                            )}
                        </CardBody>
                    </Card>

                    {settings && (
                        <>
                            <Card>
                                <CardHeader><CardTitle>Quiet hours</CardTitle></CardHeader>
                                <CardBody className="space-y-4">
                                    <Toggle
                                        label="Pause notifications overnight"
                                        description="You will still see everything in the app."
                                        checked={settings.quietHoursEnabled}
                                        disabled={savingKey === 'quietEnabled'}
                                        onChange={v => patchSettings({ quietHoursEnabled: v }, 'quietEnabled')}
                                    />
                                    {settings.quietHoursEnabled && (
                                        <div className="flex flex-wrap items-end gap-3">
                                            <Input
                                                label="From"
                                                type="time"
                                                className="w-32"
                                                value={quiet.start}
                                                onChange={e => setQuiet({ ...quiet, start: e.target.value })}
                                            />
                                            <Input
                                                label="To"
                                                type="time"
                                                className="w-32"
                                                value={quiet.end}
                                                onChange={e => setQuiet({ ...quiet, end: e.target.value })}
                                            />
                                            <Button
                                                size="sm"
                                                onClick={saveQuietHours}
                                                isLoading={savingKey === 'quiet'}
                                            >
                                                Save
                                            </Button>
                                        </div>
                                    )}
                                </CardBody>
                            </Card>

                            <Card>
                                <CardHeader><CardTitle>What you hear about</CardTitle></CardHeader>
                                <CardBody>
                                    <p className="text-sm text-gray-500 mb-3">
                                        Turn off anything you would rather not be notified about.
                                    </p>
                                    <div className="divide-y divide-gray-100">
                                        {NOTIFICATION_CATEGORIES.map(category => (
                                            <Toggle
                                                key={category}
                                                label={CATEGORY_LABELS[category]}
                                                checked={!(settings.mutedCategories ?? []).includes(category)}
                                                disabled={savingKey === `cat-${category}`}
                                                onChange={() => toggleCategory(category)}
                                            />
                                        ))}
                                    </div>
                                </CardBody>
                            </Card>
                        </>
                    )}
                </div>
            )}

            {activeTab === 'preferences' && (
                <Card>
                    <CardHeader><CardTitle>Appearance and language</CardTitle></CardHeader>
                    <CardBody className="space-y-4">
                        <Select
                            label="Theme"
                            value={localPrefs.theme}
                            onChange={e => updateLocalPrefs({ theme: e.target.value as Theme })}
                            options={[
                                { value: 'SYSTEM', label: 'Match my device' },
                                { value: 'LIGHT', label: 'Light' },
                                { value: 'DARK', label: 'Dark' },
                            ]}
                        />
                        <Select
                            label="Language"
                            value={localPrefs.language}
                            onChange={e => updateLocalPrefs({ language: e.target.value })}
                            options={[
                                { value: 'en', label: 'English' },
                                { value: 'fr', label: 'Français' },
                            ]}
                        />
                        <p className="text-xs text-gray-500">
                            Saved on this device. Signing in elsewhere uses that device&apos;s own choice.
                        </p>
                    </CardBody>
                </Card>
            )}

            {activeTab === 'about' && (
                <Card>
                    <CardHeader><CardTitle>About</CardTitle></CardHeader>
                    <CardBody>
                        <dl className="divide-y divide-gray-100 text-sm">
                            {([
                                ['Signed in as', user?.name ?? '—'],
                                ['Role', selectedRole?.replace(/_/g, ' ').toLowerCase() ?? '—'],
                                ['Account ID', user?.id != null && user.id !== -1 ? String(user.id) : 'Parent portal'],
                                ['Platform', push.supported ? 'Mobile app' : 'Web browser'],
                                ['Device notifications', push.supported ? (push.optedIn ? 'On' : 'Off') : 'Not available'],
                                ['Timezone', Intl.DateTimeFormat().resolvedOptions().timeZone ?? '—'],
                            ] as [string, string][]).map(([label, value]) => (
                                <div key={label} className="flex justify-between gap-4 py-3">
                                    <dt className="text-gray-500">{label}</dt>
                                    <dd className="text-gray-900 font-medium text-right capitalize">{value}</dd>
                                </div>
                            ))}
                        </dl>
                        <div className="pt-5">
                            <Button variant="outline" color="danger" onClick={logout}>
                                <ArrowRightOnRectangleIcon className="h-4 w-4 mr-2" />
                                Log out
                            </Button>
                        </div>
                    </CardBody>
                </Card>
            )}
        </div>
    );
}
