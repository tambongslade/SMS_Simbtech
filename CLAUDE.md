# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Development server**: `npm run dev` (uses Turbopack for faster development)
- **Build**: `npm run build`
- **Production server**: `npm start`
- **Linting**: `npm run lint`

## Project Architecture

This is a **Next.js 15 School Management System** with role-based dashboards and comprehensive administrative features.

### Core Technologies
- **Next.js 15** with App Router and Turbopack
- **TypeScript** with strict mode enabled
- **React 19** with modern hooks and patterns
- **Tailwind CSS** for styling
- **SWR** for data fetching and state management
- **Heroicons** for consistent iconography
- **React Hot Toast** for notifications

### Key Architectural Patterns

#### Role-Based Dashboard System
The application features a sophisticated multi-role dashboard system located in `src/app/dashboard/`:
- `super-manager/` - Full system administration
- `principal/` - School oversight and management
- `vice-principal/` - Assigned class/teacher management
- `teacher/` - Subject and student management
- `guidance-counselor/` - Student behavior and counseling
- `discipline-master/` - Attendance and behavior monitoring
- `bursar/` - Financial and fee management
- `parent-student/` - Student/parent portal
- `hod/` - Head of Department functions
- `manager/` - General management tasks

#### API Service Architecture
Centralized API handling through `src/lib/apiService.ts`:
- Token-based authentication with automatic refresh
- Consistent error handling and user feedback
- Support for multiple response types (JSON, blob, text)
- Automatic 401 handling with logout and redirect

#### Component Organization
- **UI Components**: Reusable components in `src/components/ui/`
- **Context Providers**: Authentication and academic year context in `src/components/context/`
- **Feature-Specific Components**: Organized within dashboard role directories

### Important Development Guidelines

#### TypeScript Patterns
- Always define explicit interfaces for API responses and component props
- Use optional chaining (`?.`) and nullish coalescing (`??`) extensively
- Check for undefined/null before accessing nested properties
- Avoid `any` type except in the centralized API service

#### State Management
- Use SWR for server state with custom hooks
- Local component state with `useState` for UI state
- Academic year context for global academic year selection
- Authentication context for user role and permissions

#### API Integration
- All API calls through the centralized `apiService`
- Consistent error handling with toast notifications
- Bearer token authentication automatically handled
- API base URL configurable via `NEXT_PUBLIC_API_BASE_URL`

#### Heroicons Usage
Use the correct icon names from @heroicons/react/24/outline:
- `ArrowTrendingUpIcon` and `ArrowTrendingDownIcon` (not `TrendingUpIcon`/`TrendingDownIcon`)
- Always import specific icons to avoid bundle bloat

#### Path and URL Conventions
- Use kebab-case for URL segments (`super-manager`, not `supermanager`)
- Role-based routing: `/dashboard/{role}/{feature}`
- Consistent path formatting throughout the application

#### Error Handling
- Toast notifications for user feedback
- Comprehensive try-catch blocks for async operations
- Graceful degradation for missing data
- Loading states for better UX

### Key Files and Directories

- `src/lib/apiService.ts` - Centralized API client with auth handling
- `src/components/context/` - Global context providers
- `src/app/dashboard/layout.tsx` - Dashboard layout with role-based navigation
- `src/app/globals.css` - Global styles and Tailwind configuration
- `.cursor/rules/most-follow-rules.mdc` - Development guidelines and best practices

### Academic Structure

The system models a hierarchical academic structure:
- Academic Years → Terms → Sequences (Exams)
- Classes → Subclasses → Students
- Subjects assigned to subclasses with teachers
- Comprehensive marks/grades management
- Fee management and payment tracking
- Behavior monitoring and guidance counseling

This structure is consistent across all dashboard roles and should be maintained when adding new features.