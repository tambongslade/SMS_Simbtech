'use client';

import { useState, useEffect } from 'react';
import { canCreateAnnouncements } from '@/lib/announcements-api';
import { getUnreadNotificationCount } from '@/lib/notifications-api';
import AnnouncementList from './AnnouncementList';
import CreateAnnouncementModal from './CreateAnnouncementModal';
import MessageList from './MessageList';
import ComposeMessageModal from './ComposeMessageModal';
import NotificationsList from './NotificationsList';
import {
    SpeakerWaveIcon,
    ChatBubbleLeftIcon,
    BellIcon
} from '@heroicons/react/24/outline';

interface CommunicationPageProps {
    userRole: string;
    defaultTab?: 'announcements' | 'messages' | 'notifications';
}

export default function CommunicationPage({
    userRole,
    defaultTab = 'announcements'
}: CommunicationPageProps) {
    const [activeTab, setActiveTab] = useState(defaultTab);
    const [showCreateAnnouncement, setShowCreateAnnouncement] = useState(false);
    const [showComposeMessage, setShowComposeMessage] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    const canCreate = canCreateAnnouncements(userRole);

    const fetchUnreadCount = async () => {
        try {
            const result = await getUnreadNotificationCount();
            if (result.success && result.data) {
                setUnreadCount(result.data.unreadCount);
            }
        } catch (error) {
            console.error('Failed to fetch unread count:', error);
        }
    };

    useEffect(() => {
        fetchUnreadCount();

        // Poll for updates every 30 seconds
        const interval = setInterval(fetchUnreadCount, 30000);
        return () => clearInterval(interval);
    }, []);

    const handleAnnouncementSuccess = () => {
        setShowCreateAnnouncement(false);
        // Could trigger refresh of announcements list here
    };

    const handleMessageSuccess = () => {
        setShowComposeMessage(false);
        // Could trigger refresh of messages list here
    };

    const handleNotificationUpdate = () => {
        fetchUnreadCount();
    };

    const tabs = [
        {
            id: 'announcements',
            name: 'Announcements',
            icon: SpeakerWaveIcon,
            color: 'text-blue-600'
        },
        {
            id: 'messages',
            name: 'Messages',
            icon: ChatBubbleLeftIcon,
            color: 'text-green-600'
        },
        {
            id: 'notifications',
            name: 'Notifications',
            icon: BellIcon,
            color: 'text-purple-600',
            badge: unreadCount > 0 ? unreadCount : undefined
        }
    ];

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Communication</h1>
                        <p className="text-gray-600 mt-1">
                            {canCreate
                                ? 'Manage announcements, messages, and notifications'
                                : 'View announcements, send messages, and check notifications'
                            }
                        </p>
                    </div>

                    {/* Quick Actions */}
                    <div className="flex space-x-3">
                        {canCreate && (
                            <button
                                onClick={() => setShowCreateAnnouncement(true)}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
                            >
                                <SpeakerWaveIcon className="h-4 w-4" />
                                <span>New Announcement</span>
                            </button>
                        )}
                        <button
                            onClick={() => setShowComposeMessage(true)}
                            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
                        >
                            <ChatBubbleLeftIcon className="h-4 w-4" />
                            <span>Compose Message</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="border-b border-gray-200">
                    <nav className="-mb-px flex space-x-8 px-6">
                        {tabs.map((tab) => {
                            const IconComponent = tab.icon;
                            const isActive = activeTab === tab.id;

                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors ${isActive
                                            ? `border-blue-500 ${tab.color}`
                                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                        }`}
                                >
                                    <IconComponent className="h-5 w-5" />
                                    <span>{tab.name}</span>
                                    {tab.badge && (
                                        <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5 ml-1">
                                            {tab.badge}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </nav>
                </div>

                {/* Tab Content */}
                <div className="p-6">
                    {activeTab === 'announcements' && (
                        <AnnouncementList
                            userRole={userRole}
                            onCreateClick={() => setShowCreateAnnouncement(true)}
                            showCreateButton={false} // We have it in the header
                        />
                    )}

                    {activeTab === 'messages' && (
                        <MessageList
                            onComposeClick={() => setShowComposeMessage(true)}
                            showComposeButton={false} // We have it in the header
                        />
                    )}

                    {activeTab === 'notifications' && (
                        <NotificationsList
                            onNotificationUpdate={handleNotificationUpdate}
                        />
                    )}
                </div>
            </div>

            {/* Modals */}
            <CreateAnnouncementModal
                isOpen={showCreateAnnouncement}
                onClose={() => setShowCreateAnnouncement(false)}
                onSuccess={handleAnnouncementSuccess}
            />

            <ComposeMessageModal
                isOpen={showComposeMessage}
                onClose={() => setShowComposeMessage(false)}
                onSuccess={handleMessageSuccess}
            />
        </div>
    );
} 