import { useState, useEffect, useRef } from 'react';
import { SubClass } from '../types/class';

// Local Teacher type definition for the props
type Teacher = {
  id: number;
  name: string;
};

interface SubClassFormProps {
  initialData?: Partial<SubClass>; // Add initialData for editing
  onSubmit: (data: { name: string; classMasterId: number | null }) => void; // Keep onSubmit simple, handle logic in parent
  isLoading?: boolean;
  onCancel: () => void;
  className?: string; // Optional class name for context
  teachers: Teacher[]; // Add teachers list to props
}

export function SubClassForm({ initialData, onSubmit, isLoading, onCancel, className, teachers }: SubClassFormProps) {
  const [name, setName] = useState(initialData?.name || '');
  const [classMasterId, setClassMasterId] = useState<number | null>(initialData?.classMasterId || null);

  // State for the searchable dropdown
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredTeachers, setFilteredTeachers] = useState<Teacher[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initialize search term with the current master's name if available
    const initialMaster = teachers.find(t => t.id === initialData?.classMasterId);
    setSearchTerm(initialMaster?.name || '');
    setName(initialData?.name || '');
    setClassMasterId(initialData?.classMasterId || null);
  }, [initialData, teachers]);

  useEffect(() => {
    // Handle clicks outside of the dropdown to close it
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [searchRef]);


  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setSearchTerm(term);
    if (term) {
      setFilteredTeachers(
        teachers.filter(t => t.name.toLowerCase().includes(term.toLowerCase()))
      );
      setIsDropdownOpen(true);
    } else {
      setFilteredTeachers([]);
      setIsDropdownOpen(false);
      setClassMasterId(null); // Clear selection if search is cleared
    }
  };

  const handleTeacherSelect = (teacher: Teacher) => {
    setClassMasterId(teacher.id);
    setSearchTerm(teacher.name);
    setIsDropdownOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      alert('Subclass name cannot be empty.'); // Use toast in real app
      return;
    }
    onSubmit({
      name: trimmedName,
      classMasterId: classMasterId
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-800">
        {initialData?.id ? 'Edit Subclass' : `Add New Subclass${className ? ` to ${className}` : ''}`}
      </h3>
      <div>
        <label htmlFor="subclassName" className="block text-sm font-medium text-gray-700">Subclass Name *</label>
        <input
          type="text"
          id="subclassName"
          name="subclassName"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          placeholder="e.g., A, B, Blue, Gold"
        />
      </div>

      {/* Class Master Selection */}
      <div className="relative" ref={searchRef}>
        <label htmlFor="classMasterSearch" className="block text-sm font-medium text-gray-700">Class Master (Optional)</label>
        <input
          type="text"
          id="classMasterSearch"
          name="classMasterSearch"
          value={searchTerm}
          onChange={handleSearchChange}
          onFocus={() => setIsDropdownOpen(!!searchTerm)}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          placeholder="Search for a teacher..."
          disabled={isLoading || teachers.length === 0}
          autoComplete="off"
        />
        {isDropdownOpen && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
            {filteredTeachers.length > 0 ? (
              <ul>
                {filteredTeachers.map(teacher => (
                  <li
                    key={teacher.id}
                    onClick={() => handleTeacherSelect(teacher)}
                    className="px-4 py-2 cursor-pointer hover:bg-gray-100"
                  >
                    {teacher.name}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="px-4 py-2 text-gray-500">No teachers found.</div>
            )}
          </div>
        )}
        {teachers.length === 0 && !isLoading && (
          <p className="text-xs text-red-600 mt-1">Teacher list unavailable.</p>
        )}
      </div>

      {/* Form actions */}
      <div className="flex justify-end space-x-3 pt-4 border-t">
        <button
          type="button"
          onClick={onCancel}
          className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
          disabled={isLoading}
        >
          Cancel
        </button>
        <button
          type="submit"
          className={`text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 ${initialData?.id ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'}`}
          disabled={isLoading}
        >
          {isLoading ? 'Saving...' : (initialData?.id ? 'Update Subclass' : 'Add Subclass')}
        </button>
      </div>
    </form>
  );
}