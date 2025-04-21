'use client';

import React, { useState, useEffect } from 'react';
import { PlusIcon } from '@heroicons/react/24/outline';
import toast, { Toaster } from 'react-hot-toast';

// TODO: Define types for LatenessList and LatenessEntry based on API
interface LatenessList {
  id: string; // Or number, depending on API
  name: string; // e.g., "Latecomers - 2024-07-26", "Assembly Lateness"
  createdAt: string; // ISO date string
  entries: LatenessEntry[];
}

interface LatenessEntry {
  id: string; // Or number
  studentName: string; // Or studentId + fetch details?
  // Add other relevant fields like time, reason, etc.
}

const LatenessManagementPage: React.FC = () => {
  const [latenessLists, setLatenessLists] = useState<LatenessList[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedList, setSelectedList] = useState<LatenessList | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [newListName, setNewListName] = useState<string>('');
  const [isAddingName, setIsAddingName] = useState<boolean>(false);
  const [newEntryName, setNewEntryName] = useState<string>('');

  // TODO: Fetch Lateness Lists from API
  useEffect(() => {
    const fetchLists = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // --- Replace with actual API call ---
        // const response = await fetch('/api/discipline-master/lateness-lists'); // Example endpoint
        // if (!response.ok) throw new Error('Failed to fetch lateness lists');
        // const data = await response.json();
        // setLatenessLists(data);

        // --- Mock Data --- 
        await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
        setLatenessLists([
            { id: '1', name: 'Latecomers - 2024-07-25', createdAt: new Date().toISOString(), entries: [{id: 'e1', studentName: 'Alice Smith'}, {id: 'e2', studentName: 'Bob Johnson'}] },
            { id: '2', name: 'Assembly Lateness - Week 30', createdAt: new Date().toISOString(), entries: [{id: 'e3', studentName: 'Charlie Brown'}] },
        ]);
        // --- End Mock Data ---

      } catch (err) {
        const message = err instanceof Error ? err.message : 'An unknown error occurred';
        setError(message);
        toast.error(`Error fetching lists: ${message}`);
        console.error("Fetch error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLists();
  }, []);

  // --- Handlers --- 

  const handleCreateList = async () => {
    if (!newListName.trim()) {
      toast.error('List name cannot be empty');
      return;
    }
    // TODO: Implement API call to create list
    console.log('Creating list:', newListName);
    // --- Mock Implementation ---
    const newList: LatenessList = {
        id: String(Date.now()), // Temporary ID
        name: newListName,
        createdAt: new Date().toISOString(),
        entries: []
    };
    setLatenessLists(prev => [newList, ...prev]);
    toast.success('List created successfully!');
    // --- End Mock --- 
    setNewListName('');
    setIsCreateModalOpen(false);
  };

  const handleAddNameToList = async (listId: string) => {
      if (!newEntryName.trim()) {
          toast.error('Name cannot be empty');
          return;
      }
      // TODO: Implement API call to add name to the specific list
      console.log(`Adding name '${newEntryName}' to list ${listId}`);
      // --- Mock Implementation --- 
      setLatenessLists(prevLists => 
          prevLists.map(list => {
              if (list.id === listId) {
                  const newEntry: LatenessEntry = {
                      id: String(Date.now()), // Temp ID
                      studentName: newEntryName
                  };
                  return { ...list, entries: [...list.entries, newEntry] };
              }
              return list;
          })
      );
      // Update selected list view if it's the one being modified
      setSelectedList(prevSelected => 
          prevSelected && prevSelected.id === listId 
          ? { ...prevSelected, entries: [...prevSelected.entries, { id: String(Date.now()), studentName: newEntryName }] }
          : prevSelected
      );
      toast.success(`Added ${newEntryName} to the list.`);
      // --- End Mock ---
      setNewEntryName('');
      setIsAddingName(false); // Close input section if needed, or just clear
  };

  const openListDetails = (list: LatenessList) => {
      setSelectedList(list);
      // Potentially fetch detailed entries here if not loaded initially
  };

  // --- Render Logic --- 

  return (
    <div className="container mx-auto p-4 md:p-6">
      <Toaster position="top-center" reverseOrder={false} />

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">Lateness Management</h1>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded inline-flex items-center transition duration-150 ease-in-out"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Create New List
        </button>
      </div>

      {/* Create List Modal (Simplified) */} 
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
          <div className="relative bg-white p-8 rounded-lg shadow-xl w-full max-w-md mx-auto">
            <h2 className="text-xl font-semibold mb-4">Create New Lateness List</h2>
            <input
              type="text"
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              placeholder="Enter list name (e.g., Latecomers - YYYY-MM-DD)"
              className="w-full px-3 py-2 border border-gray-300 rounded-md mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex justify-end space-x-3">
              <button 
                onClick={() => setIsCreateModalOpen(false)}
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded transition duration-150 ease-in-out"
              >
                Cancel
              </button>
              <button 
                onClick={handleCreateList}
                className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded transition duration-150 ease-in-out"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */} 
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* List of Lateness Lists */}
        <div className="md:col-span-1 bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-3 border-b pb-2">Lateness Lists</h2>
          {isLoading && <p className="text-gray-500">Loading lists...</p>}
          {error && <p className="text-red-500">Error: {error}</p>}
          {!isLoading && !error && latenessLists.length === 0 && (
            <p className="text-gray-500 italic">No lateness lists found. Create one to get started.</p>
          )}
          {!isLoading && !error && latenessLists.length > 0 && (
            <ul className="space-y-2 max-h-96 overflow-y-auto">
              {latenessLists.map((list) => (
                <li key={list.id}>
                  <button
                    onClick={() => openListDetails(list)}
                    className={`w-full text-left px-3 py-2 rounded hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-300 ${selectedList?.id === list.id ? 'bg-blue-100 font-medium' : ''}`}
                  >
                    {list.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Selected List Details & Add Name */}
        <div className="md:col-span-2 bg-white p-4 rounded-lg shadow">
          {selectedList ? (
            <div>
              <h2 className="text-xl font-semibold mb-3 border-b pb-2">{selectedList.name}</h2>
              
              {/* Add Name Section */} 
              <div className="mb-4">
                <h3 className="text-md font-medium mb-2">Add Name to List</h3>
                <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={newEntryName}
                      onChange={(e) => setNewEntryName(e.target.value)}
                      placeholder="Enter student name or ID"
                      className="flex-grow px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={() => handleAddNameToList(selectedList.id)}
                      disabled={isAddingName} // TODO: Add loading state for API call
                      className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-2 px-3 rounded inline-flex items-center transition duration-150 ease-in-out disabled:opacity-50"
                    >
                      <PlusIcon className="h-5 w-5 mr-1" />
                      Add
                    </button>
                </div>
              </div>

              {/* List of Names */} 
              <h3 className="text-md font-medium mb-2">Recorded Names ({selectedList.entries.length})</h3>
              {selectedList.entries.length === 0 ? (
                <p className="text-gray-500 italic">No names added to this list yet.</p>
              ) : (
                <ul className="space-y-1 list-disc list-inside max-h-80 overflow-y-auto">
                  {selectedList.entries.map((entry) => (
                    <li key={entry.id} className="text-gray-700">
                      {entry.studentName}
                      {/* TODO: Add actions like remove */} 
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
                 <p className="text-gray-500 italic">Select a list from the left to view details and add names.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LatenessManagementPage; 