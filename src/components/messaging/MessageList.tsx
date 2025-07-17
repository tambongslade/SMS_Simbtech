'use client';

import { useState, useEffect } from 'react';
import {
    Message,
    getMessages,
    markMessageAsRead,
    deleteMessage,
    MESSAGE_CATEGORIES
} from '@/lib/messaging-api';
import { toast } from 'react-hot-toast';
import {
    InboxIcon,
    PaperAirplaneIcon,
    PlusIcon,
    FunnelIcon,
    TrashIcon
} from '@heroicons/react/24/outline';

interface MessageListProps {
    onComposeClick?: () => void;
    showComposeButton?: boolean;
}

export default function MessageList({
    onComposeClick,
    showComposeButton = true
}: MessageListProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);
    const [messageType, setMessageType] = useState<'inbox' | 'sent'>('inbox');
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [filteredMessages, setFilteredMessages] = useState<Message[]>([]);

    const fetchMessages = async (type = messageType) => {
        setLoading(true);
        try {
            const result = await getMessages({ type });

            if (result.success && result.data) {
                setMessages(result.data);
            } else {
                toast.error(result.error || 'Failed to fetch messages');
                setMessages([]);
            }
        } catch (error) {
            toast.error('Failed to fetch messages');
            setMessages([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMessages(messageType);
    }, [messageType]);

    useEffect(() => {
        let currentMessages = [...messages];

        if (selectedCategory) {
            currentMessages = currentMessages.filter(
                (msg) => msg.category === selectedCategory
            );
        }

        setFilteredMessages(currentMessages);
    }, [messages, selectedCategory]);

    const handleMarkAsRead = async (messageId: number) => {
        try {
            const result = await markMessageAsRead(messageId);
            if (result.success) {
                setMessages(prev =>
                    prev.map(msg =>
                        msg.id === messageId ? { ...msg, isRead: true } : msg
                    )
                );
                toast.success('Message marked as read');
            } else {
                toast.error(result.error || 'Failed to mark message as read');
            }
        } catch (error) {
            toast.error('Failed to mark message as read');
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = now.getTime() - date.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
            return date.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit'
            });
        } else if (diffDays === 1) {
            return 'Yesterday';
        } else if (diffDays < 7) {
            return date.toLocaleDateString('en-US', { weekday: 'short' });
        } else {
            return date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric'
            });
        }
    };

    const getCategoryInfo = (category: string) => {
        return MESSAGE_CATEGORIES.find(cat => cat.value === category) || MESSAGE_CATEGORIES[3];
    };

    const handleDelete = async (messageId: number) => {
        // Optimistically remove the message from the list
        const originalMessages = [...messages];
        setMessages(prev => prev.filter(msg => msg.id !== messageId));

        try {
            const result = await deleteMessage(messageId);

            if (result.success) {
                toast.success(result.message || 'Message deleted successfully');
            } else {
                // If deletion fails, revert the change and show an error
                setMessages(originalMessages);
                toast.error(result.error || 'Failed to delete message');
            }
        } catch (error) {
            // Revert on network error as well
            setMessages(originalMessages);
            toast.error('Failed to delete message');
        }
    };

    const confirmDelete = (messageId: number) => {
        toast((t) => (
            <div className="flex flex-col space-y-3">
                <p className="font-medium">Are you sure you want to delete this message?</p>
                <div className="flex space-x-2">
                    <button
                        onClick={() => {
                            toast.dismiss(t.id);
                            handleDelete(messageId);
                        }}
                        className="w-full bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-md text-sm"
                    >
                        Confirm Delete
                    </button>
                    <button
                        onClick={() => toast.dismiss(t.id)}
                        className="w-full bg-gray-200 hover:bg-gray-300 px-3 py-1.5 rounded-md text-sm"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        ), {
            duration: 6000,
        });
    };

    if (loading) {
        return (
            <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 animate-pulse">
                        <div className="flex items-start space-x-3">
                            <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                            <div className="flex-1 space-y-2">
                                <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                                <div className="h-3 bg-gray-200 rounded w-full"></div>
                                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900">Messages</h2>

                {showComposeButton && onComposeClick && (
                    <button
                        onClick={onComposeClick}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
                    >
                        <PlusIcon className="h-4 w-4" />
                        <span>Compose</span>
                    </button>
                )}
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
                    {/* Message Type Toggle */}
                    <div className="flex bg-gray-100 rounded-lg p-1">
                        <button
                            onClick={() => setMessageType('inbox')}
                            className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${messageType === 'inbox'
                                ? 'bg-white text-blue-600 shadow-sm'
                                : 'text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            <InboxIcon className="h-4 w-4" />
                            <span>Inbox</span>
                            {messages.filter(m => !m.isRead).length > 0 && (
                                <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5 ml-1">
                                    {messages.filter(m => !m.isRead).length}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={() => setMessageType('sent')}
                            className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${messageType === 'sent'
                                ? 'bg-white text-blue-600 shadow-sm'
                                : 'text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            <PaperAirplaneIcon className="h-4 w-4" />
                            <span>Sent</span>
                        </button>
                    </div>

                    {/* Category Filter */}
                    <div className="flex items-center space-x-2">
                        <FunnelIcon className="h-4 w-4 text-gray-400" />
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="">All Categories</option>
                            {MESSAGE_CATEGORIES.map((category) => (
                                <option key={category.value} value={category.value}>
                                    {category.icon} {category.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Messages List */}
            {filteredMessages.length === 0 ? (
                <div className="text-center py-8 bg-white rounded-lg shadow-sm border border-gray-200">
                    <InboxIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                        No {selectedCategory ? 'matching' : ''} {messageType === 'inbox' ? 'messages' : 'sent messages'} found
                    </h3>
                    <p className="text-gray-500">
                        {messageType === 'inbox'
                            ? 'Your messages will appear here when you receive them.'
                            : 'Messages you send will appear here.'
                        }
                    </p>
                </div>
            ) : (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 divide-y divide-gray-200">
                    {filteredMessages.map((message) => {
                        const categoryInfo = getCategoryInfo(message.category);
                        return (
                            <div
                                key={message.id}
                                className={`p-4 hover:bg-gray-50 transition-colors ${!message.isRead && messageType === 'inbox' ? 'bg-blue-50' : ''
                                    }`}
                            >
                                <div className="flex items-start space-x-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-medium ${messageType === 'inbox' ? 'bg-blue-600' : 'bg-green-600'
                                        }`}>
                                        {(messageType === 'inbox' ? message.from[0] : message.to[0]) || '?'}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-2">
                                                <h4 className="text-sm font-medium text-gray-900 truncate">
                                                    {messageType === 'inbox' ? message.from : message.to}
                                                </h4>
                                                <span
                                                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-${categoryInfo.color}-100 text-${categoryInfo.color}-800`}
                                                >
                                                    {categoryInfo.label}
                                                </span>
                                            </div>
                                            <time className="text-xs text-gray-500 flex-shrink-0 ml-4">
                                                {formatDate(message.date)}
                                            </time>
                                        </div>
                                        <p className="text-sm text-gray-800 mt-1 font-semibold truncate">
                                            {message.subject}
                                        </p>
                                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                                            {message.content}
                                        </p>
                                        <div className="mt-2 flex items-center space-x-4">
                                            {!message.isRead && messageType === 'inbox' && (
                                                <button
                                                    onClick={() => handleMarkAsRead(message.id)}
                                                    className="text-xs font-medium text-blue-600 hover:text-blue-800"
                                                >
                                                    Mark as Read
                                                </button>
                                            )}
                                            <button
                                                onClick={() => confirmDelete(message.id)}
                                                className="flex items-center text-xs font-medium text-red-600 hover:text-red-800"
                                            >
                                                <TrashIcon className="h-4 w-4 mr-1" />
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
} 