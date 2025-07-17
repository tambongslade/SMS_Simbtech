'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { SequenceForm } from './components/SequenceForm';
import apiService from '../../../../lib/apiService';

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
    sequences?: Sequence[];
};

type Sequence = {
    id: number;
    sequence_number: number;
    term_id: number;
    start_date?: string;
    end_date?: string;
    status?: 'OPEN' | 'CLOSED' | 'FINALIZED' | 'REPORTS_GENERATING' | 'REPORTS_AVAILABLE' | 'REPORTS_FAILED';
};

type SequenceStatusUpdate = {
    status: 'OPEN' | 'CLOSED' | 'FINALIZED' | 'REPORTS_GENERATING' | 'REPORTS_AVAILABLE' | 'REPORTS_FAILED';
};

// --- API Configuration ---
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

// Status Update Modal Component
const StatusUpdateModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    sequence: Sequence | null;
    onUpdateStatus: (sequenceId: number, status: SequenceStatusUpdate['status']) => Promise<void>;
    isLoading: boolean;
}> = ({ isOpen, onClose, sequence, onUpdateStatus, isLoading }) => {
    const [selectedStatus, setSelectedStatus] = useState<SequenceStatusUpdate['status']>('OPEN');

    useEffect(() => {
        if (sequence) {
            setSelectedStatus(sequence.status || 'OPEN');
        }
    }, [sequence]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!sequence) return;

        try {
            await onUpdateStatus(sequence.id, selectedStatus);
            onClose();
        } catch (error) {
            // Error is handled in the parent component
        }
    };

    const statusOptions = [
        { value: 'OPEN', label: 'Open', description: 'Sequence is open for submissions and marking' },
        { value: 'CLOSED', label: 'Closed', description: 'Sequence is closed, no more submissions allowed' },
        { value: 'FINALIZED', label: 'Finalized', description: 'All marks are finalized and locked' },
        { value: 'REPORTS_GENERATING', label: 'Reports Generating', description: 'Report cards are being generated' },
        { value: 'REPORTS_AVAILABLE', label: 'Reports Available', description: 'Report cards are ready and available' },
        { value: 'REPORTS_FAILED', label: 'Reports Failed', description: 'Report generation failed, needs attention' }
    ] as const;

    if (!sequence) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <div className="p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Update Status - Sequence {sequence.sequence_number}
                </h3>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Select Status
                        </label>
                        <div className="space-y-2">
                            {statusOptions.map((option) => (
                                <label key={option.value} className="flex items-start">
                                    <input
                                        type="radio"
                                        name="status"
                                        value={option.value}
                                        checked={selectedStatus === option.value}
                                        onChange={(e) => setSelectedStatus(e.target.value as SequenceStatusUpdate['status'])}
                                        className="mt-1 mr-3"
                                        disabled={isLoading}
                                    />
                                    <div>
                                        <div className="font-medium text-gray-900">{option.label}</div>
                                        <div className="text-sm text-gray-500">{option.description}</div>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end space-x-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isLoading}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50"
                        >
                            {isLoading ? 'Updating...' : 'Update Status'}
                        </button>
                    </div>
                </form>
            </div>
        </Modal>
    );
};

// Status Badge Component
const StatusBadge: React.FC<{ status?: string }> = ({ status = 'OPEN' }) => {
    const getStatusStyles = (status: string) => {
        switch (status) {
            case 'OPEN':
                return 'bg-green-100 text-green-800 border-green-200';
            case 'CLOSED':
                return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'FINALIZED':
                return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'REPORTS_GENERATING':
                return 'bg-purple-100 text-purple-800 border-purple-200';
            case 'REPORTS_AVAILABLE':
                return 'bg-emerald-100 text-emerald-800 border-emerald-200';
            case 'REPORTS_FAILED':
                return 'bg-red-100 text-red-800 border-red-200';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusStyles(status)}`}>
            {status}
        </span>
    );
};

export default function ExaminationStructurePage() {
    const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
    const [selectedYearId, setSelectedYearId] = useState<number | ''>('');
    const [terms, setTerms] = useState<Term[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingTerms, setIsLoadingTerms] = useState(false);
    const [isSequenceModalOpen, setIsSequenceModalOpen] = useState(false);
    const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
    const [termForSequence, setTermForSequence] = useState<Term | null>(null);
    const [sequenceForStatusUpdate, setSequenceForStatusUpdate] = useState<Sequence | null>(null);
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

    const ACADEMIC_YEARS_ENDPOINT = '/academic-years';
    const EXAMS_ENDPOINT = '/exams';

    const fetchAcademicYears = async () => {
        setIsLoading(true);
        try {
            const result = await apiService.get<{ data: AcademicYear[] }>(ACADEMIC_YEARS_ENDPOINT);
            setAcademicYears(result.data || []);
            const activeYear = result.data?.find((y: AcademicYear) => y.is_active);
            if (activeYear) {
                setSelectedYearId(activeYear.id);
            }
        } catch (error: any) {
            console.error("Error fetching academic years:", error);
            setAcademicYears([]);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchTermsAndSequences = async (yearId: number) => {
        if (!yearId) {
            setTerms([]);
            return;
        }
        setIsLoadingTerms(true);
        try {
            const termsUrl = `${ACADEMIC_YEARS_ENDPOINT}/${yearId}/terms`;
            const sequencesUrl = `${EXAMS_ENDPOINT}?academicYearId=${yearId}`;

            const [termsResult, sequencesResult] = await Promise.all([
                apiService.get<{ data: Term[] }>(termsUrl),
                apiService.get<{ data: Sequence[] }>(sequencesUrl)
            ]);

            const fetchedTerms: Term[] = termsResult.data || [];
            const allSequences: Sequence[] = (sequencesResult.data || []).map((seq: any) => ({
                id: seq.id,
                sequence_number: seq.sequence_number || seq.sequenceNumber,
                term_id: seq.term_id || seq.termId,
                start_date: seq.start_date || seq.startDate,
                end_date: seq.end_date || seq.endDate,
                status: seq.status || 'OPEN',
            }));

            const sequencesByTermId = allSequences.reduce((acc, seq) => {
                const termId = seq.term_id;
                if (!termId) {
                    console.warn("Sequence found without term_id:", seq);
                    return acc;
                }
                if (!acc[termId]) acc[termId] = [];
                acc[termId].push(seq);
                return acc;
            }, {} as Record<number, Sequence[]>);

            const combinedTerms = fetchedTerms.map(term => ({
                ...term,
                sequences: term.id ? sequencesByTermId[term.id] || [] : [],
            }));
            setTerms(combinedTerms);
        } catch (error: any) {
            console.error(`Error fetching terms/sequences for year ${yearId}:`, error);
            setTerms([]);
        } finally {
            setIsLoadingTerms(false);
        }
    };

    const handleUpdateSequenceStatus = async (sequenceId: number, status: SequenceStatusUpdate['status']) => {
        setIsUpdatingStatus(true);
        try {
            await apiService.patch(`${EXAMS_ENDPOINT}/${sequenceId}/status`, { status });
            toast.success('Sequence status updated successfully!');

            // Refresh the data to show updated status
            if (selectedYearId) {
                await fetchTermsAndSequences(selectedYearId);
            }
        } catch (error: any) {
            console.error("Status update failed:", error);
            toast.error('Failed to update sequence status');
            throw error; // Re-throw to be handled by the modal
        } finally {
            setIsUpdatingStatus(false);
        }
    };

    useEffect(() => {
        fetchAcademicYears();
    }, []);

    useEffect(() => {
        if (selectedYearId) {
            fetchTermsAndSequences(selectedYearId);
        }
    }, [selectedYearId]);

    const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedYearId(Number(e.target.value));
    };

    const openSequenceModal = (term: Term) => {
        setTermForSequence(term);
        setIsSequenceModalOpen(true);
    };

    const closeSequenceModal = () => {
        setIsSequenceModalOpen(false);
        setTermForSequence(null);
    };

    const openStatusModal = (sequence: Sequence) => {
        setSequenceForStatusUpdate(sequence);
        setIsStatusModalOpen(true);
    };

    const closeStatusModal = () => {
        setIsStatusModalOpen(false);
        setSequenceForStatusUpdate(null);
    };

    const handleCreateSequence = async (formData: { sequence_number: number }) => {
        if (!termForSequence || !selectedYearId) {
            toast.error('Cannot create sequence without term or academic year context.');
            return;
        }
        setIsLoading(true);
        const payload = {
            sequence_number: formData.sequence_number,
            term_id: termForSequence.id,
            academic_year_id: selectedYearId,
        };
        try {
            await apiService.post(EXAMS_ENDPOINT, payload);
            toast.success('Sequence created successfully!');
            closeSequenceModal();
            if (selectedYearId) fetchTermsAndSequences(selectedYearId);
        } catch (error: any) {
            console.error("Sequence creation failed:", error);
        } finally {
            setIsLoading(false);
        }
    };

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
                )}

                {/* Terms and Sequences Display */}
                {!isLoadingTerms && terms.length > 0 && (
                    <div className="space-y-6">
                        {terms.map((term) => (
                            <div key={term.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                                {/* Term Header */}
                                <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                                    <h2 className="text-lg font-semibold text-gray-800">{term.name}</h2>
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
                                        <ul className="space-y-3">
                                            {term.sequences.map(seq => (
                                                <li key={seq.id} className="p-4 border rounded-md bg-gray-50">
                                                    <div className="flex justify-between items-start">
                                                        <div className="flex-1">
                                                            <div className="flex items-center space-x-3 mb-2">
                                                                <span className="font-medium text-gray-700">
                                                                    Sequence {seq.sequence_number}
                                                                </span>
                                                                <StatusBadge status={seq.status} />
                                                            </div>
                                                            {(seq.start_date || seq.end_date) && (
                                                                <div className="text-sm text-gray-500">
                                                                    {seq.start_date && `Start: ${new Date(seq.start_date).toLocaleDateString()}`}
                                                                    {seq.start_date && seq.end_date && ' | '}
                                                                    {seq.end_date && `End: ${new Date(seq.end_date).toLocaleDateString()}`}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="flex space-x-2 ml-4">
                                                            <button
                                                                onClick={() => openStatusModal(seq)}
                                                                className="text-xs text-purple-600 hover:text-purple-800 hover:underline disabled:opacity-50 px-2 py-1 border border-purple-200 rounded hover:bg-purple-50"
                                                                disabled={isLoading || isUpdatingStatus}
                                                            >
                                                                Update Status
                                                            </button>
                                                            <button
                                                                className="text-xs text-blue-600 hover:text-blue-800 hover:underline disabled:opacity-50 px-2 py-1 border border-blue-200 rounded hover:bg-blue-50"
                                                                disabled={isLoading}
                                                            >
                                                                Edit
                                                            </button>
                                                            <button
                                                                className="text-xs text-red-600 hover:text-red-800 hover:underline disabled:opacity-50 px-2 py-1 border border-red-200 rounded hover:bg-red-50"
                                                                disabled={isLoading}
                                                            >
                                                                Delete
                                                            </button>
                                                        </div>
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="text-sm text-gray-500 italic pl-2">No sequences defined for this term yet.</p>
                                    )}
                                </div>
                            </div>
                        ))}
                        {/* Add New Term Button */}
                        <div className="text-center mt-4">
                            <button className="text-sm text-green-600 hover:text-green-800 disabled:opacity-50 border border-green-300 px-4 py-2 rounded-md hover:bg-green-50" disabled={isLoading}>
                                + Add New Term
                            </button>
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

            {/* Status Update Modal */}
            <StatusUpdateModal
                isOpen={isStatusModalOpen}
                onClose={closeStatusModal}
                sequence={sequenceForStatusUpdate}
                onUpdateStatus={handleUpdateSequenceStatus}
                isLoading={isUpdatingStatus}
            />
        </div>
    );
} 