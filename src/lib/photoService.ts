import apiService from './apiService';

export interface PhotoUploadResponse {
    success: boolean;
    data: {
        filename: string;
        path: string;
        size: number;
        mimetype: string;
    };
}

export interface StudentPhotoResponse {
    success: boolean;
    data: {
        photo: string | null;
        photoUrl: string | null;
        hasPhoto: boolean;
    };
}

export interface PhotoAssignmentResponse {
    success: boolean;
    message: string;
}

/**
 * Upload a photo for a student
 */
export const uploadStudentPhoto = async (studentId: number, photoFile: File): Promise<PhotoUploadResponse> => {
    const formData = new FormData();
    formData.append('photo', photoFile);

    const response = await apiService.post<PhotoUploadResponse>(
        `/students/${studentId}/photo`,
        formData
    );

    return response;
};

/**
 * Assign a photo to a student's current enrollment
 */
export const assignPhotoToEnrollment = async (studentId: number, filename: string): Promise<PhotoAssignmentResponse> => {
    const response = await apiService.put<PhotoAssignmentResponse>(
        `/students/${studentId}/enrollment-photo`,
        { filename }
    );

    return response;
};

/**
 * Get a student's current enrollment photo
 */
export const getStudentPhoto = async (studentId: number): Promise<StudentPhotoResponse> => {
    const response = await apiService.get<StudentPhotoResponse>(
        `/students/${studentId}/enrollment-photo`
    );

    return response;
};

/**
 * Upload and assign photo in one operation
 */
export const uploadAndAssignPhoto = async (studentId: number, photoFile: File): Promise<{ success: boolean; filename?: string; error?: string }> => {
    try {
        // Step 1: Upload the photo
        const uploadResponse = await uploadStudentPhoto(studentId, photoFile);

        if (!uploadResponse.success) {
            throw new Error('Failed to upload photo');
        }

        // Step 2: Assign to current enrollment
        const assignResponse = await assignPhotoToEnrollment(studentId, uploadResponse.data.filename);

        if (!assignResponse.success) {
            throw new Error('Failed to assign photo to enrollment');
        }

        return {
            success: true,
            filename: uploadResponse.data.filename
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred'
        };
    }
};

/**
 * Delete a photo file
 */
export const deletePhoto = async (filename: string): Promise<{ success: boolean; error?: string }> => {
    try {
        await apiService.delete(`/uploads/${filename}`);
        return { success: true };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to delete photo'
        };
    }
};

/**
 * Validate photo file before upload
 */
export const validatePhotoFile = (file: File): { valid: boolean; error?: string } => {
    // Check file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
        return {
            valid: false,
            error: 'Only JPG, JPEG, and PNG files are allowed'
        };
    }

    // Check file size (5MB limit)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > maxSize) {
        return {
            valid: false,
            error: 'File size must be less than 5MB'
        };
    }

    return { valid: true };
};

/**
 * Get photo URL for display
 */
export const getPhotoUrl = (photoPath: string | null): string => {
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';
    const DEFAULT_PHOTO_URL = `${API_BASE_URL}/uploads/defaults/default-student.jpg`;

    if (!photoPath) {
        return DEFAULT_PHOTO_URL;
    }

    // If it's already a full URL, return as is
    if (photoPath.startsWith('http')) {
        return photoPath;
    }

    // If it starts with /, prepend base URL
    if (photoPath.startsWith('/')) {
        return `${API_BASE_URL}${photoPath}`;
    }

    // Otherwise, construct the path
    return `${API_BASE_URL}/uploads/students/${photoPath}`;
}; 