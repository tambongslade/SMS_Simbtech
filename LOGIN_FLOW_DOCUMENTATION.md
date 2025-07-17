# Login Flow Implementation Documentation

## Overview

This document outlines the complete login flow implementation for the School Management System, following the specifications in the `generallogin.workflow.md` file.

## Architecture Overview

The login flow consists of several key components:

1. **Authentication Context** (`AuthContext.tsx`) - Manages global authentication state
2. **Login Page** (`page.tsx`) - Main login interface with email/matricule toggle
3. **Role Selection** - Modal for users with multiple roles
4. **Academic Year Selection** - Component for roles requiring academic year selection
5. **Dashboard Routing** - Role-based dashboard redirection
6. **Error Handling** - Comprehensive error management

## Implementation Details

### 1. Authentication Context (`src/components/context/AuthContext.tsx`)

**Purpose**: Provides centralized authentication state management throughout the application.

**Key Features**:
- User authentication state management
- Role selection and academic year selection
- Token management and session handling
- API integration for login and user profile
- Automatic role-based dashboard redirection

**Key Methods**:
- `login(email, password)` - Authenticate user
- `selectRole(role)` - Select user role and handle academic year if needed
- `selectAcademicYear(year)` - Select academic year and redirect to dashboard
- `logout()` - Clear authentication data and redirect to login
- `refreshUser()` - Refresh user data from API

### 2. Login Page (`src/app/page.tsx`)

**Purpose**: Main login interface with support for email/matricule toggle.

**Key Features**:
- Email/Matricule toggle input
- Form validation and error handling
- Integration with AuthContext
- Automatic role selection for single-role users
- Role selection modal for multi-role users
- Academic year selection integration

**Flow**:
1. User enters credentials and submits form
2. AuthContext handles authentication via API
3. If successful, check number of available roles
4. Single role: Auto-select and proceed
5. Multiple roles: Show role selection modal
6. After role selection, check if academic year is required
7. If required: Show academic year selector
8. Finally: Redirect to appropriate dashboard

### 3. Role Selection Modal

**Purpose**: Allows users with multiple roles to select their active role.

**Key Features**:
- Role descriptions and formatting
- Visual selection interface
- Integration with AuthContext
- Loading states and error handling

### 4. Academic Year Selector (`src/components/auth/AcademicYearSelector.tsx`)

**Purpose**: Provides academic year selection for roles that require it.

**Key Features**:
- Display available academic years with details
- Auto-selection of current academic year
- Term information display
- Student and class count display
- Integration with AuthContext

**Roles Requiring Academic Year**:
- TEACHER
- HOD
- VICE_PRINCIPAL
- DISCIPLINE_MASTER
- GUIDANCE_COUNSELOR
- BURSAR

### 5. Dashboard Layout (`src/app/dashboard/layout.tsx`)

**Purpose**: Role-based dashboard layout with navigation and authentication checks.

**Key Updates**:
- Integration with AuthContext instead of localStorage
- Automatic authentication validation
- Role-based menu rendering
- Improved logout handling

### 6. Error Handling (`src/components/auth/ErrorHandler.tsx`)

**Purpose**: Comprehensive error handling for authentication flow.

**Error Types**:
- Authentication errors (invalid credentials)
- Network errors (connectivity issues)
- Server errors (backend issues)
- Session errors (expired tokens)
- Validation errors (form validation)

**Features**:
- User-friendly error messages
- Retry functionality for retryable errors
- Different visual styling for error types
- Centralized error management

## API Integration

### Login Endpoint
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

### User Profile Endpoint
```http
GET /api/v1/auth/me
Authorization: Bearer {token}
```

### Academic Years Endpoint
```http
GET /api/v1/academic-years/available-for-role?role=TEACHER
Authorization: Bearer {token}
```

## Security Features

1. **Token Management**: Secure token storage with expiration handling
2. **Session Validation**: Automatic session validation and refresh
3. **Input Validation**: Client-side and server-side validation
4. **Error Handling**: Secure error messages without sensitive information
5. **Role Validation**: Server-side role validation for authorization

## File Structure

```
src/
├── components/
│   ├── context/
│   │   └── AuthContext.tsx          # Authentication context
│   └── auth/
│       ├── AcademicYearSelector.tsx # Academic year selection
│       └── ErrorHandler.tsx        # Error handling component
├── app/
│   ├── page.tsx                     # Main login page
│   ├── layout.tsx                   # Root layout with AuthProvider
│   └── dashboard/
│       └── layout.tsx               # Dashboard layout
└── lib/
    ├── auth.ts                      # Authentication utilities
    └── authApi.ts                   # Authentication API services
```

## Configuration

### Environment Variables
```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api/v1
```

### Dashboard Routes
```typescript
const DASHBOARD_ROUTES = {
  'SUPER_MANAGER': '/dashboard/super-manager',
  'PRINCIPAL': '/dashboard/principal',
  'VICE_PRINCIPAL': '/dashboard/vice-principal',
  'TEACHER': '/dashboard/teacher',
  'HOD': '/dashboard/hod',
  'BURSAR': '/dashboard/bursar',
  'DISCIPLINE_MASTER': '/dashboard/discipline-master',
  'GUIDANCE_COUNSELOR': '/dashboard/guidance-counselor',
  'PARENT': '/dashboard/parent-student',
  'STUDENT': '/dashboard/parent-student',
  'MANAGER': '/dashboard/manager'
};
```

## Usage Examples

### Using Authentication Context
```typescript
import { useAuth } from '@/components/context/AuthContext';

function MyComponent() {
  const { user, selectedRole, isAuthenticated, login, logout } = useAuth();
  
  // Check if user is authenticated
  if (!isAuthenticated) {
    return <div>Please log in</div>;
  }
  
  // Access user data
  return <div>Welcome, {user?.name}!</div>;
}
```

### Error Handling
```typescript
import ErrorHandler, { authErrors } from '@/components/auth/ErrorHandler';

function LoginComponent() {
  const [error, setError] = useState(null);
  
  const handleLogin = async () => {
    try {
      await login(email, password);
    } catch (err) {
      setError(authErrors.invalidCredentials());
    }
  };
  
  return (
    <div>
      <ErrorHandler 
        error={error} 
        onRetry={handleLogin}
        onDismiss={() => setError(null)}
      />
    </div>
  );
}
```

## Testing

### Login Flow Testing
1. Test with valid credentials
2. Test with invalid credentials
3. Test with multiple roles
4. Test with single role
5. Test academic year selection
6. Test error scenarios
7. Test logout functionality

### Role-Based Testing
- Test each role's dashboard access
- Test role switching functionality
- Test academic year requirements
- Test unauthorized access attempts

## Troubleshooting

### Common Issues

1. **Token Expiration**: Handled automatically by AuthContext
2. **Network Errors**: Retry mechanism with user feedback
3. **Role Access**: Server-side validation prevents unauthorized access
4. **Session Persistence**: LocalStorage with proper cleanup

### Debug Mode
Enable debug logging by setting `localStorage.debug = 'auth'` in browser console.

## Future Enhancements

1. **Multi-Factor Authentication**: Add 2FA support
2. **Remember Me**: Persistent login sessions
3. **Social Login**: OAuth integration
4. **Password Reset**: Forgot password functionality
5. **Session Management**: Advanced session controls

## Maintenance

### Regular Tasks
1. Monitor authentication errors
2. Update security policies
3. Review user roles and permissions
4. Update API endpoints as needed
5. Test login flow after updates

### Version History
- v1.0.0: Initial implementation with basic login
- v2.0.0: Added role selection and academic year selection
- v2.1.0: Enhanced error handling and security features 