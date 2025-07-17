'use client'

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardBody, Button, Input } from '@/components/ui';
import { 
  Cog6ToothIcon,
  UserIcon,
  BellIcon,
  ShieldCheckIcon,
  UserGroupIcon,
  DevicePhoneMobileIcon,
  EnvelopeIcon,
  KeyIcon,
  EyeIcon,
  EyeSlashIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { useParentSettings } from '../hooks/useParentSettings';

interface ParentProfile {
  id: number;
  name: string;
  email: string;
  phone: string;
  whatsapp?: string;
  address: string;
  emergencyContact: {
    name: string;
    phone: string;
    relationship: string;
  };
  preferredLanguage: string;
  timezone: string;
}

interface NotificationPreferences {
  emailNotifications: boolean;
  smsNotifications: boolean;
  pushNotifications: boolean;
  whatsappNotifications: boolean;
  priority: {
    low: boolean;
    medium: boolean;
    high: boolean;
    urgent: boolean;
  };
  categories: {
    general: boolean;
    academic: boolean;
    disciplinary: boolean;
    financial: boolean;
    administrative: boolean;
    emergency: boolean;
  };
  quietHours: {
    enabled: boolean;
    startTime: string;
    endTime: string;
  };
  digestFrequency: 'IMMEDIATE' | 'HOURLY' | 'DAILY' | 'WEEKLY' | 'DISABLED';
}

export default function ParentSettingsPage() {
  const { profile, preferences, isLoading, error, updateProfile, updatePreferences } = useParentSettings();
  const [activeTab, setActiveTab] = useState('profile');
  const [showPassword, setShowPassword] = useState(false);
  const [profileData, setProfileData] = useState<ParentProfile>({
    id: 1,
    name: 'John Doe',
    email: 'john.doe@email.com',
    phone: '+237677123456',
    whatsapp: '+237677123456',
    address: '123 Main Street, Douala, Cameroon',
    emergencyContact: {
      name: 'Jane Doe',
      phone: '+237699987654',
      relationship: 'Spouse'
    },
    preferredLanguage: 'English',
    timezone: 'Africa/Douala'
  });
  
  const [notificationData, setNotificationData] = useState<NotificationPreferences>({
    emailNotifications: true,
    smsNotifications: true,
    pushNotifications: true,
    whatsappNotifications: false,
    priority: {
      low: false,
      medium: true,
      high: true,
      urgent: true
    },
    categories: {
      general: true,
      academic: true,
      disciplinary: true,
      financial: true,
      administrative: false,
      emergency: true
    },
    quietHours: {
      enabled: true,
      startTime: '22:00',
      endTime: '07:00'
    },
    digestFrequency: 'IMMEDIATE'
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const tabs = [
    { id: 'profile', label: 'Profile', icon: UserIcon },
    { id: 'notifications', label: 'Notifications', icon: BellIcon },
    { id: 'security', label: 'Security', icon: ShieldCheckIcon },
    { id: 'children', label: 'Children', icon: UserGroupIcon },
  ];

  const handleProfileUpdate = async () => {
    try {
      await updateProfile(profileData);
    } catch (error) {
      console.error('Failed to update profile:', error);
    }
  };

  const handleNotificationUpdate = async () => {
    try {
      await updatePreferences(notificationData);
    } catch (error) {
      console.error('Failed to update notifications:', error);
    }
  };

  const handlePasswordChange = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('New passwords do not match');
      return;
    }
    
    if (passwordData.newPassword.length < 8) {
      alert('Password must be at least 8 characters long');
      return;
    }

    try {
      // API call to change password
      console.log('Changing password...');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      console.error('Failed to change password:', error);
    }
  };

  const validatePassword = (password: string) => {
    const checks = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };
    return checks;
  };

  const passwordChecks = validatePassword(passwordData.newPassword);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
          <Cog6ToothIcon className="w-7 h-7 mr-2" />
          Settings
        </h1>
        <p className="text-gray-600">Manage your profile, notifications, and security preferences</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const IconComponent = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <IconComponent className="w-4 h-4 mr-2" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                  <Input
                    value={profileData.name}
                    onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                    placeholder="Enter your full name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                  <Input
                    type="email"
                    value={profileData.email}
                    onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                    placeholder="Enter your email"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                  <Input
                    value={profileData.phone}
                    onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                    placeholder="+237 XXX XXX XXX"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">WhatsApp Number</label>
                  <Input
                    value={profileData.whatsapp || ''}
                    onChange={(e) => setProfileData({ ...profileData, whatsapp: e.target.value })}
                    placeholder="+237 XXX XXX XXX"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                  <textarea
                    value={profileData.address}
                    onChange={(e) => setProfileData({ ...profileData, address: e.target.value })}
                    rows={3}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="Enter your address"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Preferred Language</label>
                  <select
                    value={profileData.preferredLanguage}
                    onChange={(e) => setProfileData({ ...profileData, preferredLanguage: e.target.value })}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="English">English</option>
                    <option value="French">French</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Timezone</label>
                  <select
                    value={profileData.timezone}
                    onChange={(e) => setProfileData({ ...profileData, timezone: e.target.value })}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="Africa/Douala">Africa/Douala (GMT+1)</option>
                    <option value="Africa/Lagos">Africa/Lagos (GMT+1)</option>
                    <option value="UTC">UTC (GMT+0)</option>
                  </select>
                </div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Emergency Contact</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Contact Name</label>
                  <Input
                    value={profileData.emergencyContact.name}
                    onChange={(e) => setProfileData({
                      ...profileData,
                      emergencyContact: { ...profileData.emergencyContact, name: e.target.value }
                    })}
                    placeholder="Emergency contact name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                  <Input
                    value={profileData.emergencyContact.phone}
                    onChange={(e) => setProfileData({
                      ...profileData,
                      emergencyContact: { ...profileData.emergencyContact, phone: e.target.value }
                    })}
                    placeholder="+237 XXX XXX XXX"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Relationship</label>
                  <select
                    value={profileData.emergencyContact.relationship}
                    onChange={(e) => setProfileData({
                      ...profileData,
                      emergencyContact: { ...profileData.emergencyContact, relationship: e.target.value }
                    })}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="Spouse">Spouse</option>
                    <option value="Parent">Parent</option>
                    <option value="Sibling">Sibling</option>
                    <option value="Friend">Friend</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
            </CardBody>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleProfileUpdate}>
              Save Profile Changes
            </Button>
          </div>
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Methods</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <EnvelopeIcon className="w-5 h-5 text-gray-600" />
                    <div>
                      <div className="font-medium">Email Notifications</div>
                      <div className="text-sm text-gray-500">Receive notifications via email</div>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notificationData.emailNotifications}
                      onChange={(e) => setNotificationData({
                        ...notificationData,
                        emailNotifications: e.target.checked
                      })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <DevicePhoneMobileIcon className="w-5 h-5 text-gray-600" />
                    <div>
                      <div className="font-medium">SMS Notifications</div>
                      <div className="text-sm text-gray-500">Receive notifications via SMS</div>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notificationData.smsNotifications}
                      onChange={(e) => setNotificationData({
                        ...notificationData,
                        smsNotifications: e.target.checked
                      })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <BellIcon className="w-5 h-5 text-gray-600" />
                    <div>
                      <div className="font-medium">Push Notifications</div>
                      <div className="text-sm text-gray-500">Receive browser push notifications</div>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notificationData.pushNotifications}
                      onChange={(e) => setNotificationData({
                        ...notificationData,
                        pushNotifications: e.target.checked
                      })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Priority Levels</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(notificationData.priority).map(([level, enabled]) => (
                  <label key={level} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={(e) => setNotificationData({
                        ...notificationData,
                        priority: { ...notificationData.priority, [level]: e.target.checked }
                      })}
                      className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200"
                    />
                    <span className="text-sm capitalize">{level}</span>
                  </label>
                ))}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Categories</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {Object.entries(notificationData.categories).map(([category, enabled]) => (
                  <label key={category} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={(e) => setNotificationData({
                        ...notificationData,
                        categories: { ...notificationData.categories, [category]: e.target.checked }
                      })}
                      className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200"
                    />
                    <span className="text-sm capitalize">{category.replace('_', ' ')}</span>
                  </label>
                ))}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quiet Hours</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="space-y-4">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notificationData.quietHours.enabled}
                    onChange={(e) => setNotificationData({
                      ...notificationData,
                      quietHours: { ...notificationData.quietHours, enabled: e.target.checked }
                    })}
                    className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200"
                  />
                  <span className="text-sm">Enable quiet hours</span>
                </label>
                
                {notificationData.quietHours.enabled && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Start Time</label>
                      <input
                        type="time"
                        value={notificationData.quietHours.startTime}
                        onChange={(e) => setNotificationData({
                          ...notificationData,
                          quietHours: { ...notificationData.quietHours, startTime: e.target.value }
                        })}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">End Time</label>
                      <input
                        type="time"
                        value={notificationData.quietHours.endTime}
                        onChange={(e) => setNotificationData({
                          ...notificationData,
                          quietHours: { ...notificationData.quietHours, endTime: e.target.value }
                        })}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                )}
              </div>
            </CardBody>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleNotificationUpdate}>
              Save Notification Preferences
            </Button>
          </div>
        </div>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="space-y-4 max-w-md">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Current Password</label>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                      placeholder="Enter current password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      {showPassword ? (
                        <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                      ) : (
                        <EyeIcon className="h-5 w-5 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    placeholder="Enter new password"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Confirm New Password</label>
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    placeholder="Confirm new password"
                  />
                </div>

                {passwordData.newPassword && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-700">Password Requirements:</h4>
                    <div className="space-y-1">
                      {Object.entries(passwordChecks).map(([check, passed]) => (
                        <div key={check} className="flex items-center space-x-2 text-sm">
                          {passed ? (
                            <CheckCircleIcon className="w-4 h-4 text-green-500" />
                          ) : (
                            <ExclamationTriangleIcon className="w-4 h-4 text-red-500" />
                          )}
                          <span className={passed ? 'text-green-700' : 'text-red-700'}>
                            {check === 'length' && 'At least 8 characters'}
                            {check === 'uppercase' && 'At least one uppercase letter'}
                            {check === 'lowercase' && 'At least one lowercase letter'}
                            {check === 'number' && 'At least one number'}
                            {check === 'special' && 'At least one special character'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Button 
                  onClick={handlePasswordChange}
                  disabled={!Object.values(passwordChecks).every(Boolean) || 
                           passwordData.newPassword !== passwordData.confirmPassword ||
                           !passwordData.currentPassword}
                >
                  Change Password
                </Button>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Account Security</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <CheckCircleIcon className="w-5 h-5 text-green-600" />
                    <div>
                      <div className="font-medium text-green-800">Two-Factor Authentication</div>
                      <div className="text-sm text-green-600">Enabled via SMS</div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    Manage
                  </Button>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <KeyIcon className="w-5 h-5 text-gray-600" />
                    <div>
                      <div className="font-medium text-gray-800">Login Sessions</div>
                      <div className="text-sm text-gray-600">Manage active sessions</div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    View Sessions
                  </Button>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <ShieldCheckIcon className="w-5 h-5 text-gray-600" />
                    <div>
                      <div className="font-medium text-gray-800">Privacy Settings</div>
                      <div className="text-sm text-gray-600">Control data sharing and privacy</div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    Configure
                  </Button>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Children Tab */}
      {activeTab === 'children' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Linked Children</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <UserIcon className="w-8 h-8 text-blue-600" />
                    <div>
                      <div className="font-medium text-blue-800">John Doe Jr.</div>
                      <div className="text-sm text-blue-600">Form 5A - Science Stream</div>
                      <div className="text-xs text-blue-500">Student ID: STU2024001</div>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm">
                      View Details
                    </Button>
                    <Button variant="outline" size="sm">
                      Permissions
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <UserIcon className="w-8 h-8 text-green-600" />
                    <div>
                      <div className="font-medium text-green-800">Mary Doe</div>
                      <div className="text-sm text-green-600">Form 3B - General Studies</div>
                      <div className="text-xs text-green-500">Student ID: STU2024002</div>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm">
                      View Details
                    </Button>
                    <Button variant="outline" size="sm">
                      Permissions
                    </Button>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-800 mb-2">Link Additional Child</h4>
                <p className="text-sm text-gray-600 mb-4">
                  Contact the school administration to link additional children to your account.
                </p>
                <Button variant="outline">
                  Contact School Office
                </Button>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Permissions & Access</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">View Academic Records</div>
                    <div className="text-sm text-gray-500">Access to grades, reports, and academic progress</div>
                  </div>
                  <span className="text-green-600 text-sm font-medium">Granted</span>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Financial Information</div>
                    <div className="text-sm text-gray-500">Access to fee records and payment history</div>
                  </div>
                  <span className="text-green-600 text-sm font-medium">Granted</span>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Discipline Records</div>
                    <div className="text-sm text-gray-500">Access to behavioral and discipline information</div>
                  </div>
                  <span className="text-green-600 text-sm font-medium">Granted</span>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Communication Access</div>
                    <div className="text-sm text-gray-500">Ability to message teachers and staff</div>
                  </div>
                  <span className="text-green-600 text-sm font-medium">Granted</span>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  );
} 