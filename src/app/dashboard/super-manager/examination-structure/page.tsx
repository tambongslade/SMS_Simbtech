'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { SequenceForm } from './components/SequenceForm'; // Import SequenceForm

// --- Types --- 
type AcademicYear = {
    id: number;
    name: string;
    start_date?: string;
    end_date?: string;
    is_active?: boolean;
};

type Term = {
    id: number;
    name: string;
    academic_year_id: number;
    start_date?: string;
    end_date?: string;
    sequences?: Sequence[]; // Nested sequences
};

type Sequence = {
    id: number;
    sequence_number: number;
    term_id: number;
    // Add other sequence details if needed
    start_date?: string;
    end_date?: string;
};

// --- API Configuration ---
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://192.168.1.103:4000/api/v1';
const getAuthToken = () => typeof window !== 'undefined' ? localStorage.getItem('token') : null;

// --- Modal Component (Assuming a basic one exists) ---
const Modal: React.FC<{ isOpen: boolean; onClose: () => void; children: React.ReactNode }> = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
      <div className="relative mx-auto p-6 border w-full max-w-md shadow-lg rounded-md bg-white">
        <button onClick={onClose} className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-2xl font-bold">&times;</button>
        {children}
      </div>
    </div>
  );
};

// --- Main Page Component ---
export default function ExaminationStructurePage() {
    const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
    const [selectedYearId, setSelectedYearId] = useState<number | ''>('');
    const [terms, setTerms] = useState<Term[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingTerms, setIsLoadingTerms] = useState(false);
    const [isSequenceModalOpen, setIsSequenceModalOpen] = useState(false); // State for sequence modal
    const [termForSequence, setTermForSequence] = useState<Term | null>(null); // State for which term to add sequence to

    // Fetch Academic Years for the dropdown
    const fetchAcademicYears = async () => {
        setIsLoading(true);
        const token = getAuthToken();
        if (!token) {
            toast.error("Authentication failed.");
            setIsLoading(false);
            return;
        }
        try {
            const response = await fetch(`${API_BASE_URL}/academic-years`, {
                headers: { 'Authorization': `Bearer ${token}` },
            });
            if (!response.ok) throw new Error('Failed to fetch academic years');
            const result = await response.json();
            console.log(result);
            setAcademicYears(result.data || []);
            // Optionally select the active year by default if available
            const activeYear = result.data?.find((y: AcademicYear) => y.is_active);
            if (activeYear) {
                setSelectedYearId(activeYear.id);
            }
        } catch (error: any) {
            toast.error(`Error fetching academic years: ${error.message}`);
            setAcademicYears([]);
        } finally {
            setIsLoading(false);
        }
    };

    // Fetch Terms and Sequences for the selected year
    const fetchTermsAndSequences = async (yearId: number) => {
        if (!yearId) {
            setTerms([]);
            return;
        }
        setIsLoadingTerms(true);
        const token = getAuthToken();
        if (!token) {
            toast.error("Authentication failed.");
            setIsLoadingTerms(false);
            return;
        }
        try {
            console.log(`Fetching data for Year ID: ${yearId}`); // Log Year ID

            // 1. Fetch Terms for the selected year
            const termsUrl = `${API_BASE_URL}/academic-years/${yearId}/terms`;
            const termsPromise = fetch(termsUrl, { headers: { 'Authorization': `Bearer ${token}` } });

            // 2. Fetch Sequences *filtered by academicYearId*
            const sequencesUrl = `${API_BASE_URL}/exams?academicYearId=${yearId}`; // Added filter parameter
            const sequencesPromise = fetch(sequencesUrl, { headers: { 'Authorization': `Bearer ${token}` } });

            const [termsResponse, sequencesResponse] = await Promise.all([termsPromise, sequencesPromise]);

            // Log raw responses
            const termsResult = await termsResponse.json();
            const sequencesResult = await sequencesResponse.json();
            console.log("Raw Terms Result:", JSON.stringify(termsResult, null, 2));
            console.log("Raw Sequences Result:", JSON.stringify(sequencesResult, null, 2));

            if (!termsResponse.ok) throw new Error(`Failed to fetch terms (Status: ${termsResponse.status})`);
            if (!sequencesResponse.ok) throw new Error(`Failed to fetch exams (Status: ${sequencesResponse.status})`);

            const fetchedTerms: Term[] = termsResult.data || [];
            // Log the content of fetched terms
            console.log("Mapped Terms (fetchedTerms):", JSON.stringify(fetchedTerms, null, 2));

            const allSequences: Sequence[] = (sequencesResult.data || []).map((seq: any) => ({
                id: seq.id,
                sequence_number: seq.sequence_number || seq.sequenceNumber,
                term_id: seq.term_id || seq.termId,
                start_date: seq.start_date || seq.startDate,
                end_date: seq.end_date || seq.endDate,
            }));
            console.log("Mapped Sequences (allSequences):", allSequences);

            // 3. Group sequences by term_id
            const sequencesByTermId = allSequences.reduce((acc, seq) => {
                const termId = seq.term_id;
                if (!termId) { // Add check for missing termId
                    console.warn("Sequence found without term_id:", seq);
                    return acc;
                }
                if (!acc[termId]) {
                    acc[termId] = [];
                }
                acc[termId].push(seq);
                return acc;
            }, {} as Record<number, Sequence[]>);
            console.log("Sequences Grouped by Term ID (sequencesByTermId):", sequencesByTermId);

            // 4. Combine terms with their grouped sequences
            const combinedTerms = fetchedTerms.map(term => {
                if (!term.id) { // Add check for missing term id
                    console.warn("Term found without id:", term);
                    return { ...term, sequences: [] }; // Return term but with empty sequences
                }
                return {
                    ...term,
                    sequences: sequencesByTermId[term.id] || [],
                };
            });
            console.log("Final Combined Terms (combinedTerms):", JSON.stringify(combinedTerms, null, 2)); // Log content

            setTerms(combinedTerms);

        } catch (error: any) {
            toast.error(`Error fetching terms/sequences: ${error.message}`);
            setTerms([]); // Clear terms on error
        } finally {
            setIsLoadingTerms(false);
        }
    };

    // Fetch years on initial load
    useEffect(() => {
        fetchAcademicYears();
    }, []);

    // Fetch terms when selected year changes
    useEffect(() => {
        if (selectedYearId) {
            fetchTermsAndSequences(selectedYearId);
        }
    }, [selectedYearId]);

    const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedYearId(Number(e.target.value));
    };

    // --- Sequence Modal Handlers ---
    const openSequenceModal = (term: Term) => {
        setTermForSequence(term);
        setIsSequenceModalOpen(true);
    };

    const closeSequenceModal = () => {
        setIsSequenceModalOpen(false);
        setTermForSequence(null);
    };

    // --- Handler to Create Sequence ---
    const handleCreateSequence = async (formData: { sequence_number: number }) => {
        if (!termForSequence || !selectedYearId) {
            toast.error('Cannot create sequence without term or academic year context.');
            return;
        }
        setIsLoading(true);
        const token = getAuthToken();
        if (!token) { /* ... */ return; }

        // Construct payload with only required fields
        const payload = {
            sequence_number: formData.sequence_number,
            term_id: termForSequence.id,
            academic_year_id: selectedYearId,
        };

        try {
            // Endpoint from api-tests.http: POST /exams
            const response = await fetch(`${API_BASE_URL}/exams`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                let errorMsg = 'Failed to create sequence';
                try {
                    const errorData = await response.json();
                    errorMsg = errorData.error || errorData.message || errorMsg;
                } catch (e) { /* Ignore */ }
                throw new Error(errorMsg);
            }

            toast.success('Sequence created successfully!');
            closeSequenceModal();
            fetchTermsAndSequences(selectedYearId); // Refresh terms to show the new sequence

        } catch (error: any) {
            toast.error(`Sequence creation failed: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    // --- TODO: Add Handlers for Add/Edit/Delete Term/Sequence Modals --- 

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-5xl mx-auto">
                <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 bg-white p-4 rounded-lg shadow-sm gap-4">
                    <h1 className="text-2xl font-bold text-gray-900">Examination Structure</h1>
                    {/* Academic Year Selector */}
                    <div className="w-full md:w-64">
                         <label htmlFor="academicYearSelect" className="block text-sm font-medium text-gray-700 mb-1">Academic Year</label>
                         <select
                             id="academicYearSelect"
                             value={selectedYearId}
                             onChange={handleYearChange}
                             disabled={isLoading}
                             className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-gray-100"
                         >
                             <option value="" disabled>{isLoading ? 'Loading Years...' : '-- Select Year --'}</option>
                             {academicYears.map((year) => (
                                 <option key={year.id} value={year.id}>{year.name}</option>
                             ))}
                         </select>
                     </div>
                </div>

                {/* Loading/Empty State for Terms */}
                {selectedYearId === '' && !isLoading && (
                     <p className="text-center text-gray-500 py-4 bg-white rounded-lg shadow-sm">Please select an academic year to view its structure.</p>
                )}
                {isLoadingTerms && (
                    <p className="text-center text-gray-500 py-4">Loading terms and sequences...</p>
                )}
                {!isLoadingTerms && selectedYearId !== '' && terms.length === 0 && (
                    <p className="text-center text-gray-500 py-4 bg-white rounded-lg shadow-sm">No terms found for the selected academic year.</p>
                    // TODO: Add button to create first term?
                )}

                {/* Terms and Sequences Display */}
                {!isLoadingTerms && terms.length > 0 && (
                    <div className="space-y-6">
                        {terms.map((term) => (
                            <div key={term.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                                {/* Term Header */} 
                                <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                                     <h2 className="text-lg font-semibold text-gray-800">{term.name}</h2>
                                     {/* Connect button to open sequence modal */}
                                     <button
                                        onClick={() => openSequenceModal(term)}
                                        className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50 flex items-center"
                                        disabled={isLoading || isLoadingTerms}
                                    >
                                         <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-1">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                        </svg>
                                        Add Sequence
                                    </button>
                                </div>
                                {/* Sequences List */}
                                <div className="p-4">
                                    {term.sequences && term.sequences.length > 0 ? (
                                        <ul className="space-y-2">
                                            {term.sequences.map(seq => (
                                                <li key={seq.id} className="p-3 border rounded-md flex justify-between items-center bg-gray-50">
                                                     <span className="font-medium text-gray-700">Sequence {seq.sequence_number}</span>
                                                     {/* TODO: Add Edit/Delete Sequence buttons */}
                                                     <div className="space-x-2">
                                                         <button className="text-xs text-blue-600 hover:underline disabled:opacity-50" disabled={isLoading}>Edit</button>
                                                         <button className="text-xs text-red-600 hover:underline disabled:opacity-50" disabled={isLoading}>Delete</button>
                                                     </div>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="text-sm text-gray-500 italic pl-2">No sequences defined for this term yet.</p>
                                    )}
                                </div>
                                {/* TODO: Add Edit/Delete Term actions here? */} 
                            </div>
                        ))}
                        {/* TODO: Add button to Add New Term to the selected year */} 
                        <div className="text-center mt-4">
                           <button className="text-sm text-green-600 hover:text-green-800 disabled:opacity-50 border border-green-300 px-4 py-2 rounded-md hover:bg-green-50" disabled={isLoading}>+ Add New Term</button>
                        </div>
                    </div>
                )}
            </div>

             {/* Sequence Add Modal */}
             <Modal isOpen={isSequenceModalOpen} onClose={closeSequenceModal}>
                {termForSequence && selectedYearId && (
                    <SequenceForm
                        termId={termForSequence.id}
                        academicYearId={selectedYearId}
                        onSubmit={handleCreateSequence}
                        onCancel={closeSequenceModal}
                        isLoading={isLoading}
                    />
                )}
             </Modal>

             {/* TODO: Add Modals for Term CRUD and Sequence CRUD */} 
        </div>
    );
} 