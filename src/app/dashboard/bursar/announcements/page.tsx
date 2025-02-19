'use client';
import { useState, useEffect } from 'react';
import { PlusIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface Announcement {
  id: string;
  title: string;
  message: string;
  date: string;
}

const AnnouncementsPage = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [showModal, setShowModal] = useState(false);

  // Fetch announcements (Backend Integration Placeholder)
  useEffect(() => {
    // TODO: Replace with API call
    setAnnouncements([
      { id: '1', title: 'Fee Payment Deadline', message: 'Please ensure all fees are paid by the end of this month.', date: '2024-02-15' },
      { id: '2', title: 'Parent-Teacher Meeting', message: 'The next parent-teacher meeting is scheduled for next week.', date: '2024-02-20' }
    ]);
  }, []);

  // Create new announcement (Backend Integration Placeholder)
  const handleCreateAnnouncement = async () => {
    if (!title || !message) return;

    const newAnnouncement: Announcement = {
      id: `${Date.now()}`,
      title,
      message,
      date: new Date().toISOString().split('T')[0]
    };

    setAnnouncements([newAnnouncement, ...announcements]);
    setTitle('');
    setMessage('');
    setShowModal(false);

    // TODO: Replace with API call to save announcement
  };

  // Delete announcement (Backend Integration Placeholder)
  const handleDeleteAnnouncement = async (id: string) => {
    setAnnouncements(announcements.filter(a => a.id !== id));

    // TODO: Replace with API call to delete announcement
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Page Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Announcements</h1>
        <button onClick={() => setShowModal(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center">
          <PlusIcon className="w-5 h-5 mr-2" />
          New Announcement
        </button>
      </div>

      {/* Announcement List */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-lg font-semibold mb-4">Recent Announcements</h2>
        {announcements.length > 0 ? (
          <div className="space-y-4">
            {announcements.map((announcement) => (
              <div key={announcement.id} className="border-b pb-4 flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-lg">{announcement.title}</h3>
                  <p className="text-sm text-gray-500">{announcement.date}</p>
                  <p className="mt-2 text-gray-700">{announcement.message}</p>
                </div>
                <button
                  onClick={() => handleDeleteAnnouncement(announcement.id)}
                  className="text-red-600 hover:text-red-800"
                  title="Delete"
                >
                  <TrashIcon className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No announcements available.</p>
        )}
      </div>

      {/* Announcement Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-lg">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Create Announcement</h2>
              <button onClick={() => setShowModal(false)}>
                <XMarkIcon className="w-6 h-6 text-gray-500 hover:text-gray-700" />
              </button>
            </div>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Title"
                className="p-2 border rounded w-full focus:ring focus:ring-blue-300"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <textarea
                placeholder="Message"
                className="p-2 border rounded w-full focus:ring focus:ring-blue-300"
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
              <button
                onClick={handleCreateAnnouncement}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Post Announcement
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnnouncementsPage;
