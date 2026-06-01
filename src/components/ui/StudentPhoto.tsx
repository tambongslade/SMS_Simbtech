import React, { useState, useEffect } from 'react';
import { UserCircleIcon, CameraIcon } from '@heroicons/react/24/outline';
import PhotoUploadModal from './PhotoUploadModal';
import { getStudentPhoto, getPhotoUrl } from '../../lib/photoService';

interface StudentPhotoProps {
    studentId: number;
    photo?: string | null;
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    showUploadButton?: boolean;
    canUpload?: boolean;
    onPhotoUpdate?: (filename: string) => void;
    className?: string;
    alt?: string;
    studentName?: string;
    fetchPhoto?: boolean; // Whether to fetch photo from API
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';
const DEFAULT_PHOTO_URL = `${API_BASE_URL}/uploads/defaults/default-student.jpg`;

const sizeClasses = {
    xs: 'w-8 h-8',
    sm: 'w-12 h-12',
    md: 'w-16 h-16',
    lg: 'w-24 h-24',
    xl: 'w-32 h-32'
};

export const StudentPhoto: React.FC<StudentPhotoProps> = ({
    studentId,
    photo,
    size = 'md',
    showUploadButton = false,
    canUpload = false,
    onPhotoUpdate,
    className = '',
    alt = 'Student photo',
    studentName = 'Student',
    fetchPhoto = false
}) => {
    const [photoUrl, setPhotoUrl] = useState<string>(DEFAULT_PHOTO_URL);
    const [isLoading, setIsLoading] = useState(false);
    const [showUploadModal, setShowUploadModal] = useState(false);

    // Initialize photo URL
    useEffect(() => {
        if (photo) {
            setPhotoUrl(getPhotoUrl(photo));
        } else if (fetchPhoto && studentId) {
            fetchStudentPhoto();
        } else {
            setPhotoUrl(DEFAULT_PHOTO_URL);
        }
    }, [photo, studentId, fetchPhoto]);

    const fetchStudentPhoto = async () => {
        if (!studentId) return;

        setIsLoading(true);
        try {
            const response = await getStudentPhoto(studentId);
            if (response.success && response.data.hasPhoto && response.data.photoUrl) {
                setPhotoUrl(`${API_BASE_URL}${response.data.photoUrl}`);
            } else {
                setPhotoUrl(DEFAULT_PHOTO_URL);
            }
        } catch (error) {
            console.error('Failed to fetch student photo:', error);
            setPhotoUrl(DEFAULT_PHOTO_URL);
        } finally {
            setIsLoading(false);
        }
    };

    const handleImageError = () => {
        setPhotoUrl(DEFAULT_PHOTO_URL);
    };

    const handleUploadClick = () => {
        if (canUpload) {
            setShowUploadModal(true);
        }
    };

    const handlePhotoUploaded = (filename: string) => {
        const newPhotoUrl = getPhotoUrl(`/uploads/students/${filename}`);
        setPhotoUrl(newPhotoUrl);
        if (onPhotoUpdate) {
            onPhotoUpdate(filename);
        }
    };

    const sizeClass = sizeClasses[size];

    return (
        <>
            <div className={`relative inline-block ${className}`}>
                <div className={`${sizeClass} relative overflow-hidden rounded-full bg-gray-100`}>
                    {photoUrl ? (
                        <img
                            src={photoUrl}
                            alt={alt}
                            className="w-full h-full object-cover"
                            onError={handleImageError}
                            crossOrigin="anonymous"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-200">
                            <UserCircleIcon className="w-3/4 h-3/4 text-gray-400" />
                        </div>
                    )}

                    {showUploadButton && canUpload && (
                        <button
                            onClick={handleUploadClick}
                            className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-40 transition-all duration-200 flex items-center justify-center group"
                            title="Upload photo"
                        >
                            <CameraIcon className="w-1/3 h-1/3 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                    )}
                </div>

                {isLoading && (
                    <div className="absolute inset-0 bg-white bg-opacity-75 rounded-full flex items-center justify-center">
                        <div className="animate-spin rounded-full h-1/2 w-1/2 border-b-2 border-blue-500"></div>
                    </div>
                )}
            </div>

            {/* Photo Upload Modal */}
            <PhotoUploadModal
                isOpen={showUploadModal}
                onClose={() => setShowUploadModal(false)}
                studentId={studentId}
                studentName={studentName}
                onPhotoUploaded={handlePhotoUploaded}
                canUpload={canUpload}
            />
        </>
    );
};

export default StudentPhoto; 