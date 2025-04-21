'use client';

import React, { useState, useEffect } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { PlusIcon, UserPlusIcon } from '@heroicons/react/24/outline'; // Added UserPlusIcon

// TODO: Define types based on actual API response
interface ClassInfo {
  id: string; // Or number
  name: string;
  subClasses: SubClassInfo[];
}
interface SubClassInfo {
  id: string; // Or number
  name: string;
}
interface PeriodInfo {
  id: string; // Or number
  name: string; // e.g., "Period 1", "Period 2"
}
interface PeriodLatenessRecord {
  id: string; // Or number (record ID)
  studentId: string; // Or number
  studentName: string;
  date: string; // ISO date string
  periodId: string; // Or number
  periodName?: string; // Optional depending on API
  subClassName?: string; // Optional
  className?: string;    // Optional
  recordedBy?: string; // Optional
}

// Mock data fetching functions (replace with actual API calls)
const fetchClasses = async (): Promise<ClassInfo[]> => {
  await new Promise(res => setTimeout(res, 200)); // Simulate delay
  return [
    { id: 'c1', name: 'JSS 1', subClasses: [{ id: 'sc1a', name: 'JSS 1A' }, { id: 'sc1b', name: 'JSS 1B' }] },
    { id: 'c2', name: 'JSS 2', subClasses: [{ id: 'sc2a', name: 'JSS 2A' }, { id: 'sc2b', name: 'JSS 2B' }] },
    { id: 'c3', name: 'SSS 1', subClasses: [{ id: 'sc3a', name: 'SSS 1A' }] },
  ];
};
const fetchPeriods = async (): Promise<PeriodInfo[]> => {
  await new Promise(res => setTimeout(res, 100)); // Simulate delay
  return [
    { id: 'p1', name: 'Period 1' },
    { id: 'p2', name: 'Period 2' },
    { id: 'p3', name: 'Period 3' },
    { id: 'p4', name: 'Period 4' },
    { id: 'p5', name: 'Period 5' },
    { id: 'p6', name: 'Period 6' },
    { id: 'p7', name: 'Period 7' },
    { id: 'p8', name: 'Period 8' },
  ];
};

const PeriodLatenessPage: React.FC = () => {
  // Data state
  const [lateRecords, setLateRecords] = useState<PeriodLatenessRecord[]>([]);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [periods, setPeriods] = useState<PeriodInfo[]>([]);
  
  // Filter state
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedSubClassId, setSelectedSubClassId] = useState<string>('');
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('');

  // UI state
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAddingStudent, setIsAddingStudent] = useState<boolean>(false);
  const [newLateStudentName, setNewLateStudentName] = useState<string>(''); // Simplified: use name directly
  const [error, setError] = useState<string | null>(null);

  // Fetch initial filter data (classes, periods)
  useEffect(() => {
    const loadFilterData = async () => {
      try {
        const [classesData, periodsData] = await Promise.all([
          fetchClasses(),
          fetchPeriods(),
        ]);
        setClasses(classesData);
        setPeriods(periodsData);
        // Optionally set default selections
        if (classesData.length > 0) {
          setSelectedClassId(classesData[0].id);
          if (classesData[0].subClasses.length > 0) {
             setSelectedSubClassId(classesData[0].subClasses[0].id);
          }
        }
        if (periodsData.length > 0) {
          setSelectedPeriodId(periodsData[0].id);
        }
      } catch (err) {
        toast.error('Failed to load class/period data');
        console.error('Filter data fetch error:', err);
      }
    };
    loadFilterData();
  }, []);

  // Fetch lateness records when filters change
  useEffect(() => {
    // Only fetch if all required filters are selected
    if (!selectedDate || !selectedSubClassId || !selectedPeriodId) {
      setLateRecords([]); // Clear records if filters are incomplete
      setIsLoading(false);
      return;
    }

    const fetchLateRecords = async () => {
      setIsLoading(true);
      setError(null);
      console.log(`Fetching late records for: Date=${selectedDate}, Subclass=${selectedSubClassId}, Period=${selectedPeriodId}`);
      try {
        // --- Mock Data --- 
        await new Promise(resolve => setTimeout(resolve, 400));
        let mockData: PeriodLatenessRecord[] = [];
        const key = `${selectedSubClassId}-${selectedPeriodId}`;

        // Add more diverse mock data scenarios
        switch (key) {
            case 'sc1a-p1': // JSS 1A, Period 1
                mockData = [
                    { id: 'lr1', studentId: 's102', studentName: 'Bob Johnson', date: selectedDate, periodId: selectedPeriodId, subClassName: 'JSS 1A' },
                ];
                break;
            case 'sc1b-p2': // JSS 1B, Period 2
                mockData = [
                    { id: 'lr2', studentId: 's103', studentName: 'Charlie Brown', date: selectedDate, periodId: selectedPeriodId, subClassName: 'JSS 1B' },
                    { id: 'lr3', studentId: 's104', studentName: 'Diana Prince', date: selectedDate, periodId: selectedPeriodId, subClassName: 'JSS 1B' },
                ];
                break;
            case 'sc2a-p3': // JSS 2A, Period 3
                mockData = [
                    { id: 'lr4', studentId: 's201', studentName: 'Ethan Hunt', date: selectedDate, periodId: selectedPeriodId, subClassName: 'JSS 2A' },
                ];
                break;
            case 'sc1a-p8': // JSS 1A, Period 8
                 mockData = [
                     { id: 'lr5', studentId: 's101', studentName: 'Alice Smith', date: selectedDate, periodId: selectedPeriodId, subClassName: 'JSS 1A' },
                 ];
                 break;
            // Add more cases as needed or default to empty
            default:
                mockData = []; // No records found for other combinations in mock
        }
        setLateRecords(mockData);
        // --- End Mock Data ---

      } catch (err) {
        const message = err instanceof Error ? err.message : 'An unknown error occurred';
        setError(message);
        toast.error(`Error fetching records: ${message}`);
        console.error("Fetch error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLateRecords();
  }, [selectedDate, selectedSubClassId, selectedPeriodId]);

  // --- Handlers --- 

  const handleDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(event.target.value);
  };

  const handleClassChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newClassId = event.target.value;
    setSelectedClassId(newClassId);
    // Reset subclass and potentially auto-select the first one
    const selectedClass = classes.find(c => c.id === newClassId);
    if (selectedClass && selectedClass.subClasses.length > 0) {
      setSelectedSubClassId(selectedClass.subClasses[0].id);
    } else {
      setSelectedSubClassId('');
    }
  };

  const handleSubClassChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedSubClassId(event.target.value);
  };

  const handlePeriodChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedPeriodId(event.target.value);
  };

  const handleAddLateStudent = async () => {
    if (!newLateStudentName.trim()) {
      toast.error('Please enter the student\'s name.');
      return;
    }
    if (!selectedDate || !selectedSubClassId || !selectedPeriodId) {
        toast.error('Please ensure Date, Subclass, and Period are selected.');
        return;
    }
    
    setIsAddingStudent(true);
    console.log(`Adding late student: ${newLateStudentName} for Date=${selectedDate}, Subclass=${selectedSubClassId}, Period=${selectedPeriodId}`);
    try {
        // --- Replace with actual API call ---
        // const response = await fetch('/api/discipline-master/period-lateness', {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify({ 
        //         studentName: newLateStudentName, // Or studentId if using search
        //         date: selectedDate,
        //         subClassId: selectedSubClassId,
        //         periodId: selectedPeriodId
        //      })
        // });
        // if (!response.ok) throw new Error('Failed to add late student');
        // const newRecord = await response.json();
        // setLateRecords(prev => [...prev, newRecord]);

        // --- Mock Implementation ---
        await new Promise(resolve => setTimeout(resolve, 300)); 
        const mockNewRecord: PeriodLatenessRecord = {
            id: `lr${Date.now()}`,
            studentId: `s${Date.now()}`,
            studentName: newLateStudentName,
            date: selectedDate,
            periodId: selectedPeriodId,
            subClassName: classes.find(c => c.id === selectedClassId)?.subClasses.find(sc => sc.id === selectedSubClassId)?.name || 'N/A',
        };
        setLateRecords(prev => [...prev, mockNewRecord]);
        setNewLateStudentName(''); // Clear input
        toast.success(`${mockNewRecord.studentName} added to lateness list.`);
        // --- End Mock ---

    } catch (err) {
        const message = err instanceof Error ? err.message : 'An unknown error occurred';
        toast.error(`Error adding student: ${message}`);
        console.error("Add student error:", err);
    } finally {
        setIsAddingStudent(false);
    }
  };

  // Get current list of subclasses for the selected class
  const currentSubclasses = classes.find(c => c.id === selectedClassId)?.subClasses || [];

  // --- Render Logic --- 

  return (
    <div className="container mx-auto p-4 md:p-6">
      <Toaster position="top-center" reverseOrder={false} />

      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">Period Lateness Recording</h1>
      </div>

      {/* Filters Section */} 
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 p-4 bg-white rounded-lg shadow">
        {/* Date Picker */} 
        <div>
          <label htmlFor="attendance-date" className="block text-sm font-medium text-gray-700 mb-1">Date:</label>
          <input 
            type="date" 
            id="attendance-date"
            value={selectedDate}
            onChange={handleDateChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        {/* Class Dropdown */} 
        <div>
          <label htmlFor="class-select" className="block text-sm font-medium text-gray-700 mb-1">Class:</label>
          <select 
            id="class-select"
            value={selectedClassId}
            onChange={handleClassChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            disabled={classes.length === 0}
          >
            <option value="" disabled={selectedClassId !== ''}>-- Select Class --</option>
            {classes.map(cls => (
              <option key={cls.id} value={cls.id}>{cls.name}</option>
            ))}
          </select>
        </div>
        {/* Subclass Dropdown */} 
        <div>
          <label htmlFor="subclass-select" className="block text-sm font-medium text-gray-700 mb-1">Subclass:</label>
          <select 
            id="subclass-select"
            value={selectedSubClassId}
            onChange={handleSubClassChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            disabled={!selectedClassId || currentSubclasses.length === 0}
          >
            <option value="" disabled={selectedSubClassId !== ''}>-- Select Subclass --</option>
            {currentSubclasses.map(subcls => (
              <option key={subcls.id} value={subcls.id}>{subcls.name}</option>
            ))}
          </select>
        </div>
        {/* Period Dropdown */} 
        <div>
          <label htmlFor="period-select" className="block text-sm font-medium text-gray-700 mb-1">Period:</label>
          <select 
            id="period-select"
            value={selectedPeriodId}
            onChange={handlePeriodChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            disabled={periods.length === 0}
          >
             <option value="" disabled={selectedPeriodId !== ''}>-- Select Period --</option>
            {periods.map(period => (
              <option key={period.id} value={period.id}>{period.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Add Late Student Section */} 
       <div className="mb-6 p-4 bg-white rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-3">Add Late Student</h2>
          <div className="flex items-end space-x-3">
             <div className="flex-grow">
                 <label htmlFor="student-name" className="block text-sm font-medium text-gray-700 mb-1">Student Name/ID:</label>
                 {/* TODO: Replace with a student search/autocomplete component */} 
                 <input 
                    type="text" 
                    id="student-name"
                    value={newLateStudentName}
                    onChange={(e) => setNewLateStudentName(e.target.value)}
                    placeholder="Enter student name to add..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={!selectedSubClassId || !selectedPeriodId}
                 />
             </div>
             <button
                onClick={handleAddLateStudent}
                disabled={isAddingStudent || !selectedSubClassId || !selectedPeriodId || !newLateStudentName.trim()}
                className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-2 px-4 rounded inline-flex items-center transition duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <UserPlusIcon className="h-5 w-5 mr-2" />
                {isAddingStudent ? 'Adding...' : 'Add to List'}
              </button>
          </div>
          {!selectedSubClassId || !selectedPeriodId && (
             <p className="text-xs text-gray-500 mt-1 italic">Please select a Subclass and Period before adding students.</p>
          )}
       </div>

      {/* Lateness Records Table/List */} 
      <div className="bg-white p-4 rounded-lg shadow overflow-x-auto">
         <h2 className="text-lg font-semibold mb-4">
            Late Students for {classes.find(c => c.id === selectedClassId)?.name} 
            {' '}{currentSubclasses.find(sc => sc.id === selectedSubClassId)?.name} 
            - Period {periods.find(p => p.id === selectedPeriodId)?.name || '?'} 
            ({selectedDate})
         </h2>
         {isLoading && <p className="text-gray-500">Loading records...</p>}
         {error && <p className="text-red-500">Error: {error}</p>}
         {!isLoading && !error && lateRecords.length === 0 && (
           <p className="text-gray-500 italic">No students recorded late for this period yet.</p>
         )}
         {!isLoading && !error && lateRecords.length > 0 && (
           <table className="min-w-full divide-y divide-gray-200">
             <thead className="bg-gray-50">
               <tr>
                 <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student Name</th>
                 <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student ID</th>
                 {/* Add other relevant columns if needed, e.g., Recorded By */}
                 <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
               </tr>
             </thead>
             <tbody className="bg-white divide-y divide-gray-200">
               {lateRecords.map((record) => (
                 <tr key={record.id}>
                   <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{record.studentName}</td>
                   <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{record.studentId}</td>
                   <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {/* TODO: Add action like Remove */} 
                      <button 
                         // onClick={() => handleRemoveLateStudent(record.id)} 
                         className="text-red-600 hover:text-red-900 text-xs"
                         title="Remove Student (Not Implemented)"
                      >
                         Remove
                      </button>
                   </td>
                 </tr>
               ))}
             </tbody>
           </table>
         )}
      </div>
    </div>
  );
};

export default PeriodLatenessPage; 