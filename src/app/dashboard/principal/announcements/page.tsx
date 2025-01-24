'use client';

import { useState } from 'react';

interface Announcement {
  id: string;
  title: string;
  content: string;
  type: 'general' | 'academic' | 'event' | 'urgent';
  audience: string[];
  createdAt: string;
  createdBy: string;
  status: 'draft' | 'published' | 'archived';
}

export default function Announcements() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [showNewForm, setShowNewForm] = useState(false);

  // Dummy data - will be replaced with API calls
  const announcements: Announcement[] = [
    {
      id: 'A001',
      title: 'End of Term Examination Schedule',
      content: 'The end of term examinations will begin on Monday, 15th March 2024. All students are required to check the detailed schedule posted on the notice board.',
      type: 'academic',
      audience: ['students', 'teachers', 'parents'],
      createdAt: '2024-02-28T10:00:00',
      createdBy: 'Principal',
      status: 'published',
    },
    {
      id: 'A002',
      title: 'Parent-Teacher Meeting',
      content: 'A parent-teacher meeting is scheduled for Saturday, 20th March 2024, from 9 AM to 2 PM. All parents are requested to attend.',
      type: 'event',
      audience: ['parents', 'teachers'],
      createdAt: '2024-02-27T14:30:00',
      createdBy: 'Principal',
      status: 'published',
    },
    // Add more dummy data as needed
  ];

  const filteredAnnouncements = announcements.filter(announcement => {
    const matchesSearch = announcement.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      announcement.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === 'all' || announcement.type === selectedType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Announcements</h1>
        <button
          onClick={() => setShowNewForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
        >
          Create Announcement
        </button>
      </div>

      {/* Filters and Search */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="col-span-2">
          <input
            type="text"
            placeholder="Search announcements..."
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
        >
          <option value="all">All Types</option>
          <option value="general">General</option>
          <option value="academic">Academic</option>
          <option value="event">Event</option>
          <option value="urgent">Urgent</option>
        </select>
      </div>

      {/* Announcements List */}
      <div className="space-y-4">
        {filteredAnnouncements.map((announcement) => (
          <div key={announcement.id} className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-800">{announcement.title}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    announcement.type === 'urgent' ? 'bg-red-100 text-red-800' :
                    announcement.type === 'academic' ? 'bg-blue-100 text-blue-800' :
                    announcement.type === 'event' ? 'bg-purple-100 text-purple-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {announcement.type.charAt(0).toUpperCase() + announcement.type.slice(1)}
                  </span>
                  <span className="text-sm text-gray-500">
                    Posted by {announcement.createdBy} on {new Date(announcement.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="text-blue-600 hover:text-blue-900">Edit</button>
                <button className="text-red-600 hover:text-red-900">Delete</button>
              </div>
            </div>
            <p className="text-gray-600 mb-4">{announcement.content}</p>
            <div className="flex flex-wrap gap-2">
              {announcement.audience.map((group) => (
                <span
                  key={group}
                  className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full"
                >
                  {group.charAt(0).toUpperCase() + group.slice(1)}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* New Announcement Form Modal */}
      {showNewForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Create New Announcement</h2>
            <form className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter announcement title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
                <textarea
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={4}
                  placeholder="Enter announcement content"
                ></textarea>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="general">General</option>
                    <option value="academic">Academic</option>
                    <option value="event">Event</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="draft">Draft</option>
                    <option value="published">Publish Now</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Audience</label>
                <div className="space-x-4">
                  <label className="inline-flex items-center">
                    <input type="checkbox" className="form-checkbox" />
                    <span className="ml-2">Students</span>
                  </label>
                  <label className="inline-flex items-center">
                    <input type="checkbox" className="form-checkbox" />
                    <span className="ml-2">Teachers</span>
                  </label>
                  <label className="inline-flex items-center">
                    <input type="checkbox" className="form-checkbox" />
                    <span className="ml-2">Parents</span>
                  </label>
                </div>
              </div>
              <div className="flex justify-end gap-4 mt-6">
                <button
                  type="button"
                  onClick={() => setShowNewForm(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Create Announcement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
} 