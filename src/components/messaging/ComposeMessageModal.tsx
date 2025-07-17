'use client';

import { useState, useEffect } from 'react';
import { sendMessage, getContacts, MESSAGE_CATEGORIES, Contact } from '@/lib/messaging-api';
import { toast } from 'react-hot-toast';
import { XMarkIcon, MagnifyingGlassIcon, UserIcon } from '@heroicons/react/24/outline';
import Modal from '@/components/ui/Modal';

interface ComposeMessageModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    preselectedRecipient?: Contact;
}

export default function ComposeMessageModal({
    isOpen,
    onClose,
    onSuccess,
    preselectedRecipient
}: ComposeMessageModalProps) {
    const [formData, setFormData] = useState({
        receiverId: 0,
        subject: '',
        content: '',
        category: 'GENERAL' as 'ACADEMIC' | 'FINANCIAL' | 'DISCIPLINARY' | 'GENERAL'
    });
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [loadingContacts, setLoadingContacts] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [showContactList, setShowContactList] = useState(false);

    // Fetch contacts on modal open
    useEffect(() => {
        if (isOpen) {
            fetchContacts();

            // Set preselected recipient if provided
            if (preselectedRecipient) {
                setSelectedContact(preselectedRecipient);
                setFormData(prev => ({ ...prev, receiverId: preselectedRecipient.id }));
            }
        }
    }, [isOpen, preselectedRecipient]);

    // Filter contacts based on search term
    useEffect(() => {
        if (searchTerm) {
            const filtered = contacts.filter(contact =>
                contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                contact.role.toLowerCase().includes(searchTerm.toLowerCase())
            );
            setFilteredContacts(filtered);
        } else {
            setFilteredContacts(contacts);
        }
    }, [searchTerm, contacts]);

    const fetchContacts = async () => {
        setLoadingContacts(true);
        try {
            const result = await getContacts();
            if (result.success && result.data) {
                const fetchedContacts = result.data.contacts || [];
                setContacts(fetchedContacts);
                setFilteredContacts(fetchedContacts);
            } else {
                toast.error(result.error || 'Failed to fetch contacts');
                setContacts([]);
                setFilteredContacts([]);
            }
        } catch (error) {
            toast.error('Failed to fetch contacts');
            setContacts([]);
            setFilteredContacts([]);
        } finally {
            setLoadingContacts(false);
        }
    };

    const validateForm = () => {
        const newErrors: Record<string, string> = {};

        if (!formData.receiverId) {
            newErrors.receiverId = 'Please select a recipient';
        }

        if (!formData.subject.trim()) {
            newErrors.subject = 'Subject is required';
        } else if (formData.subject.length > 200) {
            newErrors.subject = 'Subject must be less than 200 characters';
        }

        if (!formData.content.trim()) {
            newErrors.content = 'Message content is required';
        } else if (formData.content.length > 1000) {
            newErrors.content = 'Message must be less than 1000 characters';
        }

        if (!formData.category) {
            newErrors.category = 'Please select a category';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setIsSubmitting(true);
        try {
            const result = await sendMessage(formData);

            if (result.success) {
                toast.success('Message sent successfully!');
                handleClose();
                onSuccess?.();
            } else {
                toast.error(result.error || 'Failed to send message');
            }
        } catch (error) {
            toast.error('Failed to send message');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleInputChange = (field: string, value: string | number) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        // Clear error when user starts typing
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }
    };

    const handleContactSelect = (contact: Contact) => {
        setSelectedContact(contact);
        setFormData(prev => ({ ...prev, receiverId: contact.id }));
        setShowContactList(false);
        setSearchTerm('');
        if (errors.receiverId) {
            setErrors(prev => ({ ...prev, receiverId: '' }));
        }
    };

    const handleClose = () => {
        if (!isSubmitting) {
            setFormData({ receiverId: 0, subject: '', content: '', category: 'GENERAL' });
            setSelectedContact(null);
            setSearchTerm('');
            setErrors({});
            setShowContactList(false);
            onClose();
        }
    };

    const getRoleColor = (role: string) => {
        const colors: Record<string, string> = {
            'TEACHER': 'bg-blue-100 text-blue-800',
            'PRINCIPAL': 'bg-purple-100 text-purple-800',
            'VICE_PRINCIPAL': 'bg-purple-100 text-purple-800',
            'PARENT': 'bg-green-100 text-green-800',
            'BURSAR': 'bg-yellow-100 text-yellow-800',
            'GUIDANCE_COUNSELOR': 'bg-pink-100 text-pink-800',
            'DISCIPLINE_MASTER': 'bg-red-100 text-red-800',
            'HOD': 'bg-indigo-100 text-indigo-800'
        };
        return colors[role] || 'bg-gray-100 text-gray-800';
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} size="lg">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Compose Message</h2>
            </div>

            {/* Form Content */}
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Recipient Selection */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        To *
                    </label>

                    {selectedContact ? (
                        <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-300 rounded-lg">
                            <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                                    {selectedContact.name[0]}
                                </div>
                                <div>
                                    <p className="font-medium text-gray-900">{selectedContact.name}</p>
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getRoleColor(selectedContact.role)}`}>
                                        {selectedContact.role.replace('_', ' ')}
                                    </span>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setSelectedContact(null);
                                    setFormData(prev => ({ ...prev, receiverId: 0 }));
                                    setShowContactList(true);
                                }}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <XMarkIcon className="h-5 w-5" />
                            </button>
                        </div>
                    ) : showContactList ? (
                        <div className="space-y-3">
                            {/* Search */}
                            <div className="relative">
                                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Search contacts..."
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>

                            {/* Contact List */}
                            <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg">
                                {loadingContacts ? (
                                    <div className="p-3 text-center text-gray-500">Loading contacts...</div>
                                ) : filteredContacts.length > 0 ? (
                                    filteredContacts.map((contact) => (
                                        <button
                                            key={contact.id}
                                            type="button"
                                            onClick={() => handleContactSelect(contact)}
                                            className="w-full flex items-center space-x-3 p-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                                        >
                                            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                                                {contact.name[0]}
                                            </div>
                                            <div className="flex-1 text-left">
                                                <p className="font-medium text-gray-900">{contact.name}</p>
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getRoleColor(contact.role)}`}>
                                                    {contact.role.replace('_', ' ')}
                                                </span>
                                            </div>
                                        </button>
                                    ))
                                ) : (
                                    <div className="p-3 text-center text-gray-500">
                                        {searchTerm ? 'No contacts found' : 'No contacts available'}
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={() => setShowContactList(true)}
                            className="w-full p-3 border border-gray-300 rounded-lg text-left text-gray-500 hover:border-gray-400 transition-colors"
                        >
                            <div className="flex items-center space-x-2">
                                <UserIcon className="h-5 w-5" />
                                <span>Select a recipient</span>
                            </div>
                        </button>
                    )}
                    {errors.receiverId && (
                        <p className="mt-1 text-sm text-red-600">{errors.receiverId}</p>
                    )}
                </div>

                {/* Subject */}
                <div>
                    <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
                        Subject *
                    </label>
                    <input
                        type="text"
                        id="subject"
                        value={formData.subject}
                        onChange={(e) => handleInputChange('subject', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                            errors.subject ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder="Enter message subject"
                        maxLength={200}
                        disabled={isSubmitting}
                    />
                    {errors.subject && (
                        <p className="mt-1 text-sm text-red-600">{errors.subject}</p>
                    )}
                    <p className="mt-1 text-sm text-gray-500">
                        {formData.subject.length}/200 characters
                    </p>
                </div>

                {/* Category */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                        Category *
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                        {MESSAGE_CATEGORIES.map((category) => (
                            <label
                                key={category.value}
                                className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                                    formData.category === category.value
                                        ? 'border-blue-500 bg-blue-50'
                                        : 'border-gray-200 hover:border-gray-300'
                                }`}
                            >
                                <input
                                    type="radio"
                                    name="category"
                                    value={category.value}
                                    checked={formData.category === category.value}
                                    onChange={(e) => handleInputChange('category', e.target.value)}
                                    className="text-blue-600 focus:ring-blue-500"
                                    disabled={isSubmitting}
                                />
                                <div className="ml-3">
                                    <div className="flex items-center space-x-2">
                                        <span className="text-lg">{category.icon}</span>
                                        <span className="font-medium text-gray-900">{category.label}</span>
                                    </div>
                                </div>
                            </label>
                        ))}
                    </div>
                    {errors.category && (
                        <p className="mt-1 text-sm text-red-600">{errors.category}</p>
                    )}
                </div>

                {/* Message Content */}
                <div>
                    <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
                        Message *
                    </label>
                    <textarea
                        id="content"
                        value={formData.content}
                        onChange={(e) => handleInputChange('content', e.target.value)}
                        rows={6}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none ${
                            errors.content ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder="Enter your message..."
                        maxLength={1000}
                        disabled={isSubmitting}
                    />
                    {errors.content && (
                        <p className="mt-1 text-sm text-red-600">{errors.content}</p>
                    )}
                    <p className="mt-1 text-sm text-gray-500">
                        {formData.content.length}/1000 characters
                    </p>
                </div>

                {/* Submit Button */}
                <div className="flex justify-end space-x-3 pt-4">
                    <button
                        type="button"
                        onClick={handleClose}
                        disabled={isSubmitting}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitting || !formData.receiverId || !formData.subject.trim() || !formData.content.trim()}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                    >
                        {isSubmitting && (
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        )}
                        <span>{isSubmitting ? 'Sending...' : 'Send Message'}</span>
                    </button>
                </div>
            </form>
        </Modal>
    );
} 