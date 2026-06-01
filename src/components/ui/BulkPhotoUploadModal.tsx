import React, { useState, useRef, useCallback } from 'react';
import { XMarkIcon, PhotoIcon, CloudArrowUpIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import { uploadStudentPhoto, assignPhotoToEnrollment } from '../../lib/photoService';

type Student = {
    id: number;
    name: string;
    matricule?: string;
    subClassName?: string;
};

type PhotoMapping = {
    studentId: number;
    file: File | null;
    preview: string | null;
};

type UploadResult = {
    studentId: number;
    success: boolean;
    filename?: string;
    error?: string;
};

type BulkPhotoUploadModalProps = {
    isOpen: boolean;
    onClose: () => void;
    students: Student[];
    onUploadComplete: (results: UploadResult[]) => void;
};

export const BulkPhotoUploadModal: React.FC<BulkPhotoUploadModalProps> = ({
    isOpen,
    onClose,
    students,
    onUploadComplete
}) => {
    const [photoMappings, setPhotoMappings] = useState<PhotoMapping[]>(() =>
        students.map(student => ({
            studentId: student.id,
            file: null,
            preview: null
        }))
    );
    const [dragOver, setDragOver] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadResults, setUploadResults] = useState<UploadResult[]>([]);
    const [currentlyUploading, setCurrentlyUploading] = useState<string>('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelection = useCallback((files: FileList) => {
        const fileArray = Array.from(files);

        // Filter valid image files
        const validFiles = fileArray.filter(file => {
            const isImage = file.type.startsWith('image/');
            const isValidSize = file.size <= 5 * 1024 * 1024; // 5MB
            const isValidType = ['image/jpeg', 'image/jpg', 'image/png'].includes(file.type);

            if (!isImage || !isValidSize || !isValidType) {
                toast.error(`Invalid file: ${file.name}. Must be JPG, JPEG, or PNG under 5MB.`);
                return false;
            }
            return true;
        });

        // Auto-assign files to students (in order)
        setPhotoMappings(prev => {
            const updated = [...prev];
            validFiles.forEach((file, index) => {
                if (index < updated.length) {
                    // Create preview URL
                    const preview = URL.createObjectURL(file);
                    updated[index] = {
                        ...updated[index],
                        file,
                        preview
                    };
                }
            });
            return updated;
        });

        if (validFiles.length > 0) {
            toast.success(`${validFiles.length} photo(s) selected`);
        }
    }, []);

    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            handleFileSelection(e.target.files);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);

        if (e.dataTransfer.files) {
            handleFileSelection(e.dataTransfer.files);
        }
    };

    const handleIndividualFileSelect = (studentId: number, file: File | null) => {
        setPhotoMappings(prev => prev.map(mapping => {
            if (mapping.studentId === studentId) {
                // Revoke old preview URL to prevent memory leaks
                if (mapping.preview) {
                    URL.revokeObjectURL(mapping.preview);
                }

                return {
                    ...mapping,
                    file,
                    preview: file ? URL.createObjectURL(file) : null
                };
            }
            return mapping;
        }));
    };

    const removePhoto = (studentId: number) => {
        setPhotoMappings(prev => prev.map(mapping => {
            if (mapping.studentId === studentId && mapping.preview) {
                URL.revokeObjectURL(mapping.preview);
                return {
                    ...mapping,
                    file: null,
                    preview: null
                };
            }
            return mapping;
        }));
    };

    const handleBulkUpload = async () => {
        const mappingsWithFiles = photoMappings.filter(mapping => mapping.file);

        if (mappingsWithFiles.length === 0) {
            toast.error('Please select at least one photo to upload');
            return;
        }

        setIsUploading(true);
        setUploadProgress(0);
        setUploadResults([]);

        const results: UploadResult[] = [];

        for (let i = 0; i < mappingsWithFiles.length; i++) {
            const mapping = mappingsWithFiles[i];
            const student = students.find(s => s.id === mapping.studentId);

            setCurrentlyUploading(student?.name || `Student ${mapping.studentId}`);

                        try {
                const uploadResponse = await uploadStudentPhoto(mapping.studentId, mapping.file!);
                
                if (uploadResponse.success && uploadResponse.data?.filename) {
                    // Assign the photo to current enrollment
                    const assignResponse = await assignPhotoToEnrollment(
                        mapping.studentId,
                        uploadResponse.data.filename
                    );

                    if (assignResponse.success) {
                        results.push({
                            studentId: mapping.studentId,
                            success: true,
                            filename: uploadResponse.data.filename
                        });
                    } else {
                        results.push({
                            studentId: mapping.studentId,
                            success: false,
                            error: 'Failed to assign photo to enrollment'
                        });
                    }
                } else {
                    results.push({
                        studentId: mapping.studentId,
                        success: false,
                        error: uploadResponse.error || 'Upload failed'
                    });
                }
            } catch (error: any) {
                results.push({
                    studentId: mapping.studentId,
                    success: false,
                    error: error.message || 'Upload failed'
                });
            }

            // Update progress
            setUploadProgress(((i + 1) / mappingsWithFiles.length) * 100);
            setUploadResults([...results]);
        }

        setIsUploading(false);
        setCurrentlyUploading('');

        // Show summary
        const successCount = results.filter(r => r.success).length;
        const failureCount = results.filter(r => !r.success).length;

        if (successCount > 0) {
            toast.success(`Successfully uploaded ${successCount} photo(s)`);
        }
        if (failureCount > 0) {
            toast.error(`Failed to upload ${failureCount} photo(s)`);
        }

        // Call parent callback
        onUploadComplete(results);
    };

    const closeModal = () => {
        // Cleanup preview URLs
        photoMappings.forEach(mapping => {
            if (mapping.preview) {
                URL.revokeObjectURL(mapping.preview);
            }
        });
        onClose();
    };

    if (!isOpen) return null;

    const studentsWithPhotos = photoMappings.filter(m => m.file).length;
    const totalStudents = students.length;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900">
                        Bulk Photo Upload ({studentsWithPhotos}/{totalStudents} photos selected)
                    </h3>
                    <button
                        onClick={closeModal}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                        disabled={isUploading}
                    >
                        <XMarkIcon className="h-6 w-6" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                    {/* File Drop Zone */}
                    <div
                        className={`border-2 border-dashed rounded-lg p-8 text-center mb-6 transition-colors ${dragOver
                                ? 'border-blue-400 bg-blue-50'
                                : 'border-gray-300 hover:border-gray-400'
                            }`}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                    >
                        <CloudArrowUpIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                        <h4 className="text-lg font-medium text-gray-900 mb-2">
                            Drop photos here or click to select
                        </h4>
                        <p className="text-sm text-gray-600 mb-4">
                            Select multiple photos (JPG, JPEG, PNG - max 5MB each)
                        </p>
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                            disabled={isUploading}
                        >
                            Select Photos
                        </button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            accept="image/jpeg,image/jpg,image/png"
                            onChange={handleFileInputChange}
                            className="hidden"
                        />
                    </div>

                    {/* Student Photo Mapping Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {students.map(student => {
                            const mapping = photoMappings.find(m => m.studentId === student.id);
                            const uploadResult = uploadResults.find(r => r.studentId === student.id);

                            return (
                                <div
                                    key={student.id}
                                    className={`border rounded-lg p-4 ${uploadResult
                                            ? uploadResult.success
                                                ? 'border-green-300 bg-green-50'
                                                : 'border-red-300 bg-red-50'
                                            : 'border-gray-200'
                                        }`}
                                >
                                    {/* Student Info */}
                                    <div className="mb-3">
                                        <h4 className="font-medium text-gray-900">{student.name}</h4>
                                        <p className="text-sm text-gray-600">
                                            {student.matricule && `Matricule: ${student.matricule}`}
                                        </p>
                                        {student.subClassName && (
                                            <p className="text-sm text-gray-600">{student.subClassName}</p>
                                        )}
                                    </div>

                                    {/* Photo Preview/Selection */}
                                    <div className="mb-3">
                                        {mapping?.preview ? (
                                            <div className="relative">
                                                <img
                                                    src={mapping.preview}
                                                    alt="Preview"
                                                    className="w-full h-24 object-cover rounded border"
                                                    crossOrigin="anonymous"
                                                />
                                                <button
                                                    onClick={() => removePhoto(student.id)}
                                                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                                                    disabled={isUploading}
                                                >
                                                    <XMarkIcon className="h-3 w-3" />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="border-2 border-dashed border-gray-300 rounded h-24 flex items-center justify-center">
                                                <PhotoIcon className="h-8 w-8 text-gray-400" />
                                            </div>
                                        )}
                                    </div>

                                    {/* Individual File Selection */}
                                    <input
                                        type="file"
                                        accept="image/jpeg,image/jpg,image/png"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0] || null;
                                            if (file) {
                                                // Validate file
                                                const isValidSize = file.size <= 5 * 1024 * 1024;
                                                const isValidType = ['image/jpeg', 'image/jpg', 'image/png'].includes(file.type);

                                                if (!isValidSize || !isValidType) {
                                                    toast.error('Invalid file. Must be JPG, JPEG, or PNG under 5MB.');
                                                    return;
                                                }
                                            }
                                            handleIndividualFileSelect(student.id, file);
                                        }}
                                        className="w-full text-sm text-gray-600 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-sm file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                        disabled={isUploading}
                                    />

                                    {/* Upload Status */}
                                    {uploadResult && (
                                        <div className="mt-2 flex items-center">
                                            {uploadResult.success ? (
                                                <>
                                                    <CheckCircleIcon className="h-4 w-4 text-green-600 mr-1" />
                                                    <span className="text-sm text-green-600">Uploaded</span>
                                                </>
                                            ) : (
                                                <>
                                                    <XCircleIcon className="h-4 w-4 text-red-600 mr-1" />
                                                    <span className="text-sm text-red-600">
                                                        {uploadResult.error || 'Failed'}
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Upload Progress */}
                    {isUploading && (
                        <div className="mt-6 p-4 border rounded-lg bg-blue-50">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-blue-900">
                                    Uploading photos...
                                </span>
                                <span className="text-sm text-blue-700">
                                    {Math.round(uploadProgress)}%
                                </span>
                            </div>
                            <div className="w-full bg-blue-200 rounded-full h-2 mb-2">
                                <div
                                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${uploadProgress}%` }}
                                ></div>
                            </div>
                            {currentlyUploading && (
                                <p className="text-sm text-blue-700">
                                    Currently uploading: {currentlyUploading}
                                </p>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
                    <div className="text-sm text-gray-600">
                        {studentsWithPhotos > 0 && (
                            <span>{studentsWithPhotos} photo(s) ready to upload</span>
                        )}
                    </div>
                    <div className="flex items-center space-x-3">
                        <button
                            type="button"
                            onClick={closeModal}
                            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                            disabled={isUploading}
                        >
                            {isUploading ? 'Uploading...' : 'Cancel'}
                        </button>
                        <button
                            type="button"
                            onClick={handleBulkUpload}
                            disabled={studentsWithPhotos === 0 || isUploading}
                            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isUploading ? 'Uploading...' : `Upload ${studentsWithPhotos} Photo(s)`}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}; 