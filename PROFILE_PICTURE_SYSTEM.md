# Profile Picture System Documentation

## Overview

The School Management System includes a comprehensive profile picture system that allows students to have different photos for each academic year. Photos are stored locally in the project directory and automatically included in report cards and student profiles.

## Key Features

- **Year-specific Photos**: Each student can have different photos per academic year via `Enrollment.photo`
- **Organized Storage**: Photos are systematically organized in dedicated folders
- **Fast Report Generation**: Local file access optimizes Puppeteer PDF generation
- **Automatic Fallbacks**: Default photos when student photos are unavailable
- **Role-based Security**: Proper authentication and authorization controls

## File Organization Structure

```
uploads/
├── students/           # Student photos
│   ├── student-123-1640995200000.jpg
│   └── student-456-1640995300000.png
├── users/             # Staff/user photos
│   ├── user-789-1640995400000.jpg
│   └── user-101-1640995500000.png
└── defaults/          # Default fallback photos
    ├── default-student.jpg
    └── default-user.jpg
```

### Filename Convention
- **Students**: `student-{id}-{timestamp}.{extension}`
- **Users**: `user-{id}-{timestamp}.{extension}`
- **Supported formats**: JPG, JPEG, PNG
- **File size limit**: 5MB maximum

## API Endpoints

### 1. Upload Student Photo
```http
POST /api/v1/students/{studentId}/photo
```

**Headers:**
```
Authorization: Bearer {token}
Content-Type: multipart/form-data
```

**Body:**
```
photo: [file]
```

**Required Roles:** TEACHER, PRINCIPAL, VICE_PRINCIPAL, MANAGER, SUPER_MANAGER

**Response:**
```json
{
  "success": true,
  "data": {
    "filename": "student-123-1640995200000.jpg",
    "path": "/uploads/students/student-123-1640995200000.jpg",
    "size": 204800,
    "mimetype": "image/jpeg"
  }
}
```

### 2. Assign Photo to Current Enrollment
```http
PUT /api/v1/students/{studentId}/enrollment-photo
```

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Body:**
```json
{
  "filename": "student-123-1640995200000.jpg"
}
```

**Required Roles:** TEACHER, PRINCIPAL, VICE_PRINCIPAL, MANAGER, SUPER_MANAGER

### 3. Get Student's Current Photo
```http
GET /api/v1/students/{studentId}/enrollment-photo
```

**Response:**
```json
{
  "success": true,
  "data": {
    "photo": "student-123-1640995200000.jpg",
    "photoUrl": "/uploads/students/student-123-1640995200000.jpg",
    "hasPhoto": true
  }
}
```

### 4. Generic File Upload
```http
POST /api/v1/uploads
```

**Body:**
```
file: [file]
photoType: "STUDENT" | "USER"
```

### 5. Delete File
```http
DELETE /api/v1/uploads/{filename}
```

## Usage Workflow

### Step 1: Upload Student Photo
```bash
curl -X POST \
  'http://localhost:3000/api/v1/students/123/photo' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -F 'photo=@student_photo.jpg'
```

### Step 2: Assign to Current Enrollment
```bash
curl -X PUT \
  'http://localhost:3000/api/v1/students/123/enrollment-photo' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{"filename": "student-123-1640995200000.jpg"}'
```

### Step 3: Automatic Report Integration
Once assigned, the photo automatically appears in:
- Student report cards
- Class reports
- Student profiles

## Permission Matrix

| Role | Upload Photo | Assign to Enrollment | View Photo | Delete Photo |
|------|-------------|---------------------|------------|--------------|
| SUPER_MANAGER | ✅ | ✅ | ✅ | ✅ |
| MANAGER | ✅ | ✅ | ✅ | ✅ |
| PRINCIPAL | ✅ | ✅ | ✅ | ✅ |
| VICE_PRINCIPAL | ✅ | ✅ | ✅ | ✅ |
| TEACHER | ✅ | ✅ | ✅ | ❌ |
| BURSAR | ❌ | ❌ | ✅ | ❌ |
| PARENT | ❌ | ❌ | ✅ (own children) | ❌ |

## Frontend Integration Examples

### JavaScript/Fetch
```javascript
// Upload photo
const uploadPhoto = async (studentId, photoFile) => {
  const formData = new FormData();
  formData.append('photo', photoFile);
  
  const response = await fetch(`/api/v1/students/${studentId}/photo`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });
  
  return response.json();
};

// Assign to enrollment
const assignPhoto = async (studentId, filename) => {
  const response = await fetch(`/api/v1/students/${studentId}/enrollment-photo`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ filename })
  });
  
  return response.json();
};
```

### Flutter/Dart
```dart
import 'package:http/http.dart' as http;
import 'dart:io';

Future<Map<String, dynamic>> uploadStudentPhoto(int studentId, File photo) async {
  var request = http.MultipartRequest(
    'POST', 
    Uri.parse('$baseUrl/api/v1/students/$studentId/photo')
  );
  
  request.headers['Authorization'] = 'Bearer $token';
  request.files.add(await http.MultipartFile.fromPath('photo', photo.path));
  
  var response = await request.send();
  var responseData = await response.stream.bytesToString();
  return json.decode(responseData);
}

Future<Map<String, dynamic>> assignPhotoToEnrollment(int studentId, String filename) async {
  final response = await http.put(
    Uri.parse('$baseUrl/api/v1/students/$studentId/enrollment-photo'),
    headers: {
      'Authorization': 'Bearer $token',
      'Content-Type': 'application/json',
    },
    body: json.encode({'filename': filename}),
  );
  
  return json.decode(response.body);
}
```

## React Integration Example

To use a student's profile picture in a React `<img>` tag, you need to combine your backend's base URL with the photo path provided by the API.

### How It Works

1.  **Fetch Photo Data**: Call the `GET /api/v1/students/{studentId}/enrollment-photo` endpoint.
2.  **Get Photo URL**: The API responds with a `photoUrl` (e.g., `/uploads/students/student-123.jpg`).
3.  **Construct Full URL**: Prepend your backend's base URL (e.g., `http://localhost:4000`) to the path.
4.  **Set `src` Attribute**: Use the full URL as the `src` for your `<img>` tag.

### React Component Example

Here’s a sample `StudentProfile` component that fetches a student's photo and displays it, with a fallback to a default image.

```jsx
import React, { useState, useEffect } from 'react';

// Assume this is the base URL of your running backend API
const API_BASE_URL = 'http://localhost:4000';
// A default photo to show if the student doesn't have one
const DEFAULT_PHOTO_URL = `${API_BASE_URL}/uploads/defaults/default-student.jpg`;

const StudentProfile = ({ studentId }) => {
  const [photoUrl, setPhotoUrl] = useState(DEFAULT_PHOTO_URL);
  const [studentName, setStudentName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!studentId) return;

    const fetchStudentPhoto = async () => {
      try {
        setLoading(true);
        // Step 1: Fetch the photo information from the API
        const response = await fetch(`${API_BASE_URL}/api/v1/students/${studentId}/enrollment-photo`);

        if (!response.ok) {
          throw new Error('Failed to fetch student photo');
        }

        const result = await response.json();

        // Step 2: Check if the student has a photo and construct the full URL
        if (result.success && result.data.hasPhoto) {
          setPhotoUrl(`${API_BASE_URL}${result.data.photoUrl}`);
        }
        // If hasPhoto is false, the component will just use the default URL

      } catch (err) {
        setError(err.message);
        // In case of an error, we keep the default photo
        console.error("Error fetching photo:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStudentPhoto();
    // You would likely fetch other student details here as well
    // For example: setStudentName("John Doe");

  }, [studentId]);

  if (loading) {
    return <div>Loading profile...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div>
      <h2>Student Profile</h2>
      {/* Step 3 & 4: Use the URL in the img tag */}
      <img
        src={photoUrl}
        alt={`Profile of ${studentName || 'student'}`}
        style={{ width: '150px', height: '150px', borderRadius: '50%', objectFit: 'cover' }}
        // Add an error handler for the image itself
        onError={(e) => {
            e.target.onerror = null; // prevents looping
            e.target.src = DEFAULT_PHOTO_URL;
        }}
      />
      <h3>{studentName || 'Student Name'}</h3>
      {/* ... other student details */}
    </div>
  );
};

export default StudentProfile;
```

### How to Use the Component

```jsx
import React from 'react';
import StudentProfile from './StudentProfile';

function App() {
  return (
    <div>
      <h1>School Management Portal</h1>
      <StudentProfile studentId={123} />
    </div>
  );
}

export default App;
```

## Report Card Integration

Photos are automatically included in generated reports through:

1. **Local File Access**: Reports use `getStudentPhotoForReport()` for fast file system access
2. **Data URI Embedding**: Photos are converted to base64 and embedded directly in PDF
3. **Fallback System**: Default photos used when student photos unavailable
4. **Optimized Rendering**: No HTTP requests during PDF generation

## Technical Architecture

### Core Components

1. **File Upload Middleware** (`src/utils/fileUpload.ts`)
   - Handles file validation and storage
   - Generates unique filenames
   - Organizes files by type

2. **Photo Utilities** (`src/utils/photoUtils.ts`)
   - Manages file paths and data URIs
   - Handles fallbacks and validation
   - Optimizes report generation

3. **API Controllers** (`src/api/v1/controllers/studentController.ts`)
   - Processes upload requests
   - Handles enrollment photo assignment
   - Manages photo retrieval

4. **Database Integration**
   - `User.photo`: Staff profile pictures
   - `Enrollment.photo`: Student photos per academic year

## Error Handling

### Common Error Responses

```json
// File too large
{
  "success": false,
  "error": "File too large. Maximum size is 5MB"
}

// Invalid file type
{
  "success": false,
  "error": "Invalid file type. Only JPG, JPEG, PNG allowed"
}

// Student not found
{
  "success": false,
  "error": "Student not found"
}

// No enrollment found
{
  "success": false,
  "error": "No enrollment found for current academic year"
}

// Unauthorized
{
  "success": false,
  "error": "Insufficient permissions"
}
```

## Deployment Notes

1. **File Permissions**: Ensure `uploads/` directory is writable
2. **Static File Serving**: Photos served via Express static middleware
3. **Backup Strategy**: Include `uploads/` folder in backup procedures
4. **Security**: Files validated and stored outside web root when possible

## Quick Start Checklist

- [ ] Ensure `uploads/` directory exists and is writable
- [ ] Add default photos to `uploads/defaults/`
- [ ] Test file upload with valid image
- [ ] Verify photo appears in student reports
- [ ] Confirm proper role-based access control
- [ ] Test fallback behavior with missing photos

## Support

For issues or questions about the profile picture system:
1. Check error logs for detailed error messages
2. Verify file permissions and directory structure
3. Confirm user roles and authentication
4. Test with different image formats and sizes 