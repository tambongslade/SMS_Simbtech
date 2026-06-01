## General Login & Role Selection Flow

### 1. **Login Page** (`/login`)
**Layout:** Clean, professional design with school branding
- **Login Form:**
  - Email OR Matricule field (with toggle option)
  - Password field
  - "Remember me" checkbox
  - Login button
- **Features:**
  - Input validation
  - Loading states
  - Error handling for invalid credentials

#### **API Integration:**
```http
POST /api/v1/auth/login
Content-Type: application/json

Request Body:
{
  "email": "john.doe@school.com",     // OR use matricule
  "password": "userPassword123"
}

Success Response (200):
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": "24h",
    "user": {
      "id": 1,
      "name": "John Doe",
      "email": "john.doe@school.com",
      "matricule": "USR001",
      "gender": "MALE",
      "dateOfBirth": "1985-05-15",
      "phone": "+237600000000",
      "address": "123 Main Street",
      "photo": "/uploads/profiles/john_doe.jpg",
      "status": "ACTIVE",
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-12-15T10:30:00Z",
      "userRoles": [
        {
          "id": 1,
          "userId": 1,
          "role": "TEACHER",
          "academicYearId": 1,
          "createdAt": "2024-01-01T00:00:00Z",
          "updatedAt": "2024-01-01T00:00:00Z"
        },
        {
          "id": 2,
          "userId": 1,
          "role": "HOD",
          "academicYearId": 1,
          "createdAt": "2024-01-01T00:00:00Z",
          "updatedAt": "2024-01-01T00:00:00Z"
        },
        {
          "id": 3,
          "userId": 1,
          "role": "PARENT",
          "academicYearId": null,
          "createdAt": "2024-01-01T00:00:00Z",
          "updatedAt": "2024-01-01T00:00:00Z"
        }
      ]
    }
  }
}

Error Response (401):
{
  "success": false,
  "error": "Invalid credentials"
}
```

**Frontend Implementation Notes:**
- Store JWT token in secure storage (httpOnly cookie preferred)
- Extract unique roles from user.userRoles array for role selection UI
- Check if user has multiple roles to determine if role selection is needed
- Handle "remember me" by setting longer token expiration
- Show loading spinner during authentication
- Display user-friendly error messages

### 2. **Role Selection** (Frontend Only)
*Client-side logic only - no API endpoint needed*

If user has multiple unique roles, show role selection interface:
- **Display:** User's name and profile photo
- **Role Cards:** Show each unique role with:
  - Role name and description
  - Role-specific icon
  - "Select" button

**Frontend Implementation:**
```javascript
// Extract unique roles from login response
const uniqueRoles = [...new Set(user.userRoles.map(ur => ur.role))];

// If multiple roles, show selection UI
if (uniqueRoles.length > 1) {
  // Show role selection interface
  // Store selected role in session/localStorage
  // Proceed to academic year selection or dashboard
} else {
  // Single role - automatically proceed
  const selectedRole = uniqueRoles[0];
  // Proceed to academic year selection or dashboard
}
```

### 3. **Academic Year Selection** 
*For roles that are tied to specific academic years*

#### **API Integration:** ✅ **IMPLEMENTED**
```http
GET /api/v1/academic-years/available-for-role
Authorization: Bearer {token}

Query Parameters:
?role=TEACHER

Success Response (200):
{
  "success": true,
  "data": {
    "academicYears": [
      {
        "id": 1,
        "name": "2024-2025",
        "startDate": "2024-09-01",
        "endDate": "2025-07-31",
        "isCurrent": true,
        "status": "ACTIVE",
        "studentCount": 1245,
        "classCount": 24,
        "terms": [
          {
            "id": 1,
            "name": "First Term",
            "startDate": "2024-09-01",
            "endDate": "2024-12-15",
            "feeDeadline": "2024-10-15"
          }
        ]
      },
      {
        "id": 2,
        "name": "2023-2024",
        "startDate": "2023-09-01", 
        "endDate": "2024-07-31",
        "isCurrent": false,
        "status": "COMPLETED",
        "studentCount": 1180,
        "classCount": 22
      }s
    ],
    "currentAcademicYearId": 1,
    "userHasAccessTo": [1, 2]
  }
}
```

**Frontend Implementation Notes:**
- Auto-select current academic year if user has access
- Show year statistics for context
- Store selected academic year in session/localStorage
- Proceed directly to dashboard

### 4. **Dashboard Redirect**
Based on selected role and academic year (if applicable), redirect to appropriate dashboard:

#### **Dashboard URLs by Role:**
```javascript
const DASHBOARD_ROUTES = {
  'SUPER_MANAGER': '/super-manager/dashboard',
  'PRINCIPAL': '/principal/dashboard', 
  'VICE_PRINCIPAL': '/vice-principal/dashboard',
  'TEACHER': '/teacher/dashboard',
  'HOD': '/hod/dashboard',
  'BURSAR': '/bursar/dashboard',
  'DISCIPLINE_MASTER': '/discipline-master/dashboard',
  'PARENT': '/parent/dashboard',
  'STUDENT': '/student/dashboard'
};
```

#### **Get User Profile (for dashboard data):**
```http
GET /api/v1/auth/me
Authorization: Bearer {token}

Success Response (200):
{
  "success": true,
  "data": {
    "id": 1,
    "name": "John Doe",
    "email": "john.doe@school.com",
    "matricule": "USR001",
    "gender": "MALE",
    "dateOfBirth": "1985-05-15",
    "phone": "+237600000000",
    "address": "123 Main Street",
    "photo": "/uploads/profiles/john_doe.jpg",
    "status": "ACTIVE",
    "userRoles": [
      // ... user roles array
    ]
  }
}
```

**Frontend Implementation Notes:**
- Store authentication context globally (selected role + academic year)
- Use role-specific API endpoints based on selected role
- Initialize role-specific navigation menu
- Cache user preferences and settings

---

## **Simplified Login Flow:**

### **Single Role User:**
1. Login → Get token + user data
2. Check user.userRoles for unique roles
3. If single role: Auto-proceed to step 4
4. If role needs academic year: Call `/academic-years/available-for-role`
5. Redirect to appropriate dashboard

### **Multi-Role User:**
1. Login → Get token + user data
2. Show role selection UI (frontend only)
3. User selects role → Store in session
4. If role needs academic year: Call `/academic-years/available-for-role`
5. Redirect to appropriate dashboard

### **Global Roles (SUPER_MANAGER, PARENT):**
- Skip academic year selection
- Proceed directly to dashboard

---

## **Error Handling Throughout Flow:**

### **Common Error Responses:**
```http
// Network/Server Error (500)
{
  "success": false,
  "error": "Internal server error. Please try again."
}

// Validation Error (400)
{
  "success": false,
  "error": "Email is required",
  "details": {
    "field": "email",
    "code": "REQUIRED"
  }
}

// Authentication Error (401)
{
  "success": false,
  "error": "Invalid or expired token"
}

// Authorization Error (403)
{
  "success": false,
  "error": "Insufficient permissions for selected role"
}
```

### **Frontend Error Handling:**
- Show user-friendly error messages
- Implement retry logic for network errors
- Clear authentication state on 401 errors
- Log errors for debugging
- Provide fallback UI states

---

## **Security Considerations:**

1. **Token Management:**
   - Use httpOnly cookies for token storage
   - Implement token refresh mechanism
   - Clear tokens on logout/error

2. **Input Validation:**
   - Validate email format client-side
   - Sanitize all user inputs
   - Use HTTPS for all API calls

3. **Session Security:**
   - Implement session timeout
   - Track login attempts
   - Secure role switching

---