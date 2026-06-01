# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Development server**: `npm run dev` (uses Turbopack for faster development)
- **Build**: `npm run build`
- **Production server**: `npm start` (runs on port 3060 by default)
- **Linting**: `npm run lint`

### Electron Desktop App Commands
- **Electron development**: `npm run electron-dev` (runs Next.js + Electron concurrently)
- **Desktop development**: `npm run dev-desktop` (alternative desktop dev command)
- **Build desktop app**: `npm run build-electron` (creates distributable desktop app)
- **Package desktop**: `npm run pack` (packages app without publishing)
- **Create app icons**: `npm run create-icons` (generates platform-specific icons)

## Testing and Quality
- Run linting after significant changes: `npm run lint`
- The project uses TypeScript strict mode - ensure type safety in all code
- Currently no automated test suite configured

## Project Architecture

This is a **Next.js 15 School Management System** with role-based dashboards and comprehensive administrative features. The application supports both web deployment and **Electron desktop app** distribution across Windows, macOS, and Linux platforms.

### Core Technologies
- **Next.js 15** with App Router and Turbopack
- **TypeScript** with strict mode enabled
- **React 19** with modern hooks and patterns
- **Tailwind CSS** for styling
- **SWR** for data fetching and state management
- **Heroicons** for consistent iconography
- **React Hot Toast** for notifications
- **jsPDF** for PDF generation and reports
- **Lucide React** for additional icons
- **Motion** for animations
- **Electron** for cross-platform desktop app functionality

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
- `src/components/context/` - Global context providers (AuthContext, AcademicYearContext)
- `src/app/dashboard/layout.tsx` - Dashboard layout with role-based navigation
- `src/app/globals.css` - Global styles and Tailwind configuration
- `src/components/ui/` - Reusable UI components (Button, Modal, Table, etc.)
- `src/components/class-management/` - Class and subclass management components
- `src/components/messaging/` - Communication and notification components
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

### Environment Configuration

- **API Base URL**: Configured via `NEXT_PUBLIC_API_BASE_URL` environment variable
- **Development default**: `http://localhost:4000/api/v1`
- All API endpoints should follow RESTful conventions under `/api/v1/`

### Desktop App Configuration

The project includes full **Electron desktop app** support with:
- **Multi-platform builds**: Windows (NSIS installer + portable), macOS (DMG), Linux (AppImage + DEB)
- **Auto-updater**: Configured for GitHub releases
- **App metadata**: Configured as "SMS Simbtech" educational application
- **Build output**: `dist/` directory for all platform distributables
- **Icon resources**: Platform-specific icons in `build/` directory

### Development Best Practices

#### From Cursor Rules (.cursor/rules/most-follow-rules.mdc):

1. **Type Safety**: Define explicit interfaces, avoid `any` except in apiService, use optional chaining (`?.`) and nullish coalescing (`??`)

2. **State Management**: Initialize useState with proper defaults, manage useEffect dependencies carefully, handle async operations properly

3. **Routing**: Use kebab-case for URLs, protect routes with authentication checks, ensure consistent path formatting

4. **API Integration**: Use centralized apiService, implement robust error handling with try-catch, provide user feedback via toasts

5. **Data Structures**: Use consistent naming conventions, standardize role formatting (lowercase-kebab-case)

6. **Local Storage**: Centralize localStorage keys as constants, clear data on logout, parse JSON safely with try-catch

#### Component Development Guidelines

- Create reusable UI components for consistency
- Follow existing component patterns and naming conventions
- Use semantic HTML and ARIA attributes for accessibility
- Maintain consistent Tailwind CSS styling patterns
- Implement proper loading states and error boundaries