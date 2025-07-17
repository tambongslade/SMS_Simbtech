import React, { useState, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { CameraIcon, XMarkIcon, CloudArrowUpIcon } from '@heroicons/react/24/outline';
import { Button } from './Button';
import { uploadAndAssignPhoto, validatePhotoFile } from '../../lib/photoService';

interface PhotoUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentId: number;
  studentName: string;
  onPhotoUploaded: (filename: string) => void;
  canUpload?: boolean;
}

export const PhotoUploadModal: React.FC<PhotoUploadModalProps> = ({
  isOpen,
  onClose,
  studentId,
  studentName,
  onPhotoUploaded,
  canUpload = true
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file
    const validation = validatePhotoFile(file);
    if (!validation.valid) {
      toast.error(validation.error || 'Invalid file');
      return;
    }

    setSelectedFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Please select a photo first');
      return;
    }

    if (!canUpload) {
      toast.error('You do not have permission to upload photos');
      return;
    }

    setIsUploading(true);

    try {
      const result = await uploadAndAssignPhoto(studentId, selectedFile);
      
      if (result.success && result.filename) {
        toast.success('Photo uploaded and assigned successfully!');
        onPhotoUploaded(result.filename);
        handleClose();
      } else {
        toast.error(result.error || 'Failed to upload photo');
      }
    } catch (error) {
      toast.error('Failed to upload photo. Please try again.');
      console.error('Photo upload error:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setIsUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClose();
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const files = Array.from(e.dataTransfer.files);
    const file = files[0];

    if (file && file.type.startsWith('image/')) {
      const fakeEvent = {
        target: { files: [file] }
      } as any;
      handleFileSelect(fakeEvent);
    } else {
      toast.error('Please drop a valid image file');
    }
  };

  if (!canUpload) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Upload Photo</h2>
            <button onClick={handleClose} className="text-gray-500 hover:text-gray-700">
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
          <div className="text-center py-8">
            <p className="text-gray-600">You do not have permission to upload photos.</p>
            <Button onClick={handleClose} className="mt-4" variant="outline">
              Close
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Upload Photo</h2>
          <button onClick={handleClose} className="text-gray-500 hover:text-gray-700">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <p className="text-gray-600 mb-4">Upload a photo for <strong>{studentName}</strong></p>

        {/* File Upload Area */}
        <div
          className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          {previewUrl ? (
            <div className="space-y-4">
              <img
                src={previewUrl}
                alt="Preview"
                className="w-32 h-32 object-cover rounded-full mx-auto"
              />
              <p className="text-sm text-gray-600">{selectedFile?.name}</p>
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                size="sm"
              >
                Choose Different Photo
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <CloudArrowUpIcon className="w-12 h-12 text-gray-400 mx-auto" />
              <div>
                <p className="text-gray-600">Drag and drop a photo here, or</p>
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  className="mt-2"
                >
                  <CameraIcon className="w-4 h-4 mr-2" />
                  Choose Photo
                </Button>
              </div>
              <p className="text-xs text-gray-500">
                JPG, JPEG, PNG up to 5MB
              </p>
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Action Buttons */}
        <div className="flex space-x-3 mt-6">
          <Button
            onClick={handleClose}
            variant="outline"
            className="flex-1"
            disabled={isUploading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            variant="solid"
            className="flex-1"
            disabled={!selectedFile || isUploading}
          >
            {isUploading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Uploading...
              </div>
            ) : (
              'Upload & Assign'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PhotoUploadModal; 