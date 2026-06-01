# School Management System API Documentation

## Introduction

The School Management System API provides a comprehensive set of endpoints for managing all aspects of a school's operations. This RESTful API allows administrators, teachers, and other stakeholders to:

- Manage academic years, terms, and class schedules
- Administer student enrollment, attendance, and performance tracking
- Handle staff management including teachers and administrative staff
- Process fee payments and financial transactions
- Organize subjects, exams, and grading
- Generate report cards and academic performance reports
- Facilitate communication between school stakeholders

The API is designed with role-based access control to ensure that users can only access information and perform actions appropriate to their role within the school system.

## Base URL

All endpoints are prefixed with `/api/v1`.

## Authentication

Most endpoints require authentication via JWT token. Send the token in the `Authorization` header using the format: `Bearer <token>`.

## Response Format

All successful responses follow this format:
```json
{
  "success": true,
  "data": {...}
}
```

Error responses follow this format:
```json
{
  "success": false,
  "error": "Error message"
}
```

## Available Roles

- `SUPER_MANAGER`: Highest level administrator
- `MANAGER`: System administrator
- `PRINCIPAL`: School principal
- `VICE_PRINCIPAL`: Vice principal
- `BURSAR`: Finance manager
- `TEACHER`: Teacher
- `DISCIPLINE_MASTER`: Manages student discipline
- `GUIDANCE_COUNSELOR`: Student counseling
- `PARENT`: Student's parent

## API Endpoints

### Authentication (`/auth`)

| Endpoint | Method | Description | Required Roles |
|----------|--------|-------------|---------------|
| `/login` | POST | Authenticate user and get token | None |
| `/register` | POST | Register a new user | None |
| `/logout` | POST | Invalidate user's token | Any authenticated user |
| `/me` | GET | Get current user's profile | Any authenticated user |

### Academic Years (`/academic-years`)

| Endpoint | Method | Description | Required Roles |
|----------|--------|-------------|---------------|
| `/` | GET | List all academic years | Any authenticated user |
| `/` | POST | Create a new academic year | `SUPER_MANAGER`, `PRINCIPAL` |
| `/:id` | GET | Get academic year details | Any authenticated user |
| `/:id` | PUT | Update an academic year | `SUPER_MANAGER`, `PRINCIPAL` |
| `/:id` | DELETE | Delete an academic year | `SUPER_MANAGER`, `PRINCIPAL` |
| `/:id/terms` | GET | Get all terms for an academic year | Any authenticated user |
| `/:id/terms` | POST | Add a term to an academic year | `SUPER_MANAGER`, `PRINCIPAL` |

### Users (`/users`)

| Endpoint | Method | Description | Required Roles |
|----------|--------|-------------|---------------|
| `/` | GET | List all users | `MANAGER`, `SUPER_MANAGER`, `PRINCIPAL` |
| `/` | POST | Create a new user | `MANAGER`, `SUPER_MANAGER` |
| `/teachers` | GET | Get all teachers (optionally filtered by subject) | Any authenticated user |
| `/me` | GET | Get current user's profile | Any authenticated user |
| `/me/dashboard`| GET | Get dashboard for the current user's role | Any authenticated user |
| `/:id` | GET | Get user details | `MANAGER`, `SUPER_MANAGER`, `PRINCIPAL` |
| `/:id` | PUT | Update a user | `MANAGER`, `SUPER_MANAGER`, `PRINCIPAL` |
| `/:id` | DELETE | Delete a user | `MANAGER`, `SUPER_MANAGER` |
| `/register-with-roles` | POST | Register a new user and assign roles | Public |
| `/create-with-role` | POST | Create a user with a specific role | `MANAGER`, `SUPER_MANAGER` |
| `/:id/roles/academic-year` | PUT | Set user roles for the current academic year | `MANAGER`, `SUPER_MANAGER`, `PRINCIPAL` |
| `/:id/roles/:roleId` | DELETE | Remove a role from a user by UserRole ID | `MANAGER`, `SUPER_MANAGER`, `PRINCIPAL` |
| `/:parentId/students` | GET | Get all students linked to a specific parent | `PRINCIPAL`, `MANAGER`, `SUPER_MANAGER`, `PARENT` (own students only) |
| `/:userId/assignments/vice-principal` | POST | Assign a user as Vice Principal for a sub-class | `MANAGER`, `SUPER_MANAGER`, `PRINCIPAL` |
| `/:userId/assignments/vice-principal/:subClassId` | DELETE | Remove a Vice Principal assignment from a sub-class | `MANAGER`, `SUPER_MANAGER`, `PRINCIPAL` |
| `/:userId/assignments/discipline-master` | POST | Assign a user as Discipline Master for a sub-class | `MANAGER`, `SUPER_MANAGER`, `PRINCIPAL` |
| `/:userId/assignments/discipline-master/:subClassId` | DELETE | Remove a Discipline Master assignment from a sub-class | `MANAGER`, `SUPER_MANAGER`, `PRINCIPAL` |

### Classes (`/classes`)

| Endpoint | Method | Description | Required Roles |
|----------|--------|-------------|---------------|
| `/` | GET | List all classes (with student counts) | Any authenticated user |
| `/` | POST | Create a new class | `SUPER_MANAGER`, `PRINCIPAL` |
| `/:id` | GET | Get class details with sub-classes | Any authenticated user |
| `/:id` | PUT | Update class details | `SUPER_MANAGER`, `PRINCIPAL` |
| `/sub-classes` or `/subclasses` | GET | List all sub-classes across all classes | Any authenticated user |
| `/:id/sub-classes` or `/:id/subclasses`| POST | Add a new sub-class to a class | `SUPER_MANAGER`, `PRINCIPAL` |
| `/:id/sub-classes/:subClassId` or `/:id/subclasses/:subClassId` | PUT | Update a sub-class's details | `SUPER_MANAGER`, `PRINCIPAL` |
| `/:id/sub-classes/:subClassId` or `/:id/subclasses/:subClassId` | DELETE | Delete a sub-class | `SUPER_MANAGER`, `PRINCIPAL` |
| `/sub-classes/:subClassId/class-master` or `/subclasses/:subClassId/class-master` | POST | Assign a class master (teacher) to a sub-class | `SUPER_MANAGER`, `PRINCIPAL` |
| `/sub-classes/:subClassId/class-master` or `/subclasses/:subClassId/class-master` | GET | Get the class master of a sub-class | Any authenticated user |
| `/sub-classes/:subClassId/class-master` or `/subclasses/:subClassId/class-master` | DELETE | Remove the class master from a sub-class | `SUPER_MANAGER`, `PRINCIPAL` |
| `/sub-classes/:subClassId/subjects` or `/subclasses/:subClassId/subjects` | GET | Get all subjects assigned to a specific sub-class | Any authenticated user |

### Students (`/students`)

| Endpoint | Method | Description | Required Roles |
|----------|--------|-------------|---------------|
| `/` | GET | List all students (with filters) | `SUPER_MANAGER`, `PRINCIPAL`, `VICE_PRINCIPAL`, `TEACHER`, `DISCIPLINE_MASTER` |
| `/` | POST | Create a new student record | `SUPER_MANAGER`, `PRINCIPAL`, `VICE_PRINCIPAL` |
| `/:id` | GET | Get student details by ID | Any authenticated user (role-based access logic applies) |
| `/:id` | PUT | Update student details | `SUPER_MANAGER`, `PRINCIPAL`, `VICE_PRINCIPAL` |
| `/:id/parents` | POST | Link a parent to a student | `SUPER_MANAGER`, `PRINCIPAL`, `VICE_PRINCIPAL` |
| `/:studentId/parents/:parentId` | DELETE | Unlink a parent from a student | `SUPER_MANAGER`, `PRINCIPAL`, `VICE_PRINCIPAL` |
| `/:studentId/parents` | GET | Get all parents linked to a student | Any authenticated user who can view the student |
| `/:id/enroll` | POST | Enroll a student in a sub-class for the current academic year | `SUPER_MANAGER`, `PRINCIPAL`, `VICE_PRINCIPAL` |
| `/:id/status` | GET | Get student status information (new/old/repeater) | `SUPER_MANAGER`, `PRINCIPAL`, `VICE_PRINCIPAL`, `TEACHER`, `BURSAR` |
| `/status/summary` | GET | Get all students with status information | `SUPER_MANAGER`, `PRINCIPAL`, `VICE_PRINCIPAL`, `TEACHER`, `BURSAR` |

### Fees (`/fees`)

| Endpoint | Method | Description | Required Roles |
|----------|--------|-------------|---------------|
| `/` | GET | List all fees (with filters) | Any authenticated user |
| `/` | POST | Create a fee record for a student | `SUPER_MANAGER`, `PRINCIPAL`, `BURSAR` |
| `/:id` | GET | Get a specific fee by ID | Any authenticated user |
| `/:id` | PUT | Update a fee record | `SUPER_MANAGER`, `PRINCIPAL`, `BURSAR` |
| `/:id` | DELETE | Delete a fee record | `SUPER_MANAGER`, `PRINCIPAL`, `BURSAR` |
| `/student/:studentId` | GET | Get all fees for a specific student | Any authenticated user |
| `/sub_class/:sub_classId/summary` | GET | Get fee summary for a sub-class | Any authenticated user |
| `/:feeId/payments` | GET | List all payments for a specific fee | Any authenticated user |
| `/:feeId/payments` | POST | Record a payment for a specific fee | `SUPER_MANAGER`, `PRINCIPAL`, `BURSAR` |
| `/reports` | GET | Export fee data (placeholder) | `SUPER_MANAGER`, `PRINCIPAL`, `BURSAR` |

### Subjects (`/subjects`)

| Endpoint | Method | Description | Required Roles |
|----------|--------|-------------|---------------|
| `/` | GET | List all subjects | Any authenticated user |
| `/` | POST | Create a new subject | `SUPER_MANAGER`, `PRINCIPAL` |
| `/:id` | GET | Get subject details | Any authenticated user |
| `/:id` | PUT | Update subject details | `SUPER_MANAGER`, `PRINCIPAL` |
| `/:id` | DELETE | Delete a subject | `SUPER_MANAGER`, `PRINCIPAL` |
| `/:id/teachers` | POST | Assign a teacher to a subject | `SUPER_MANAGER`, `PRINCIPAL` |
| `/:id/sub-classes` | POST | Link subject to a sub-class with a coefficient | `SUPER_MANAGER`, `PRINCIPAL` |
| `/:subjectId/classes/:classId` | POST | Assign a subject to all sub-classes of a class | `SUPER_MANAGER`, `PRINCIPAL` |

### Periods (`/periods`)

| Endpoint | Method | Description | Required Roles |
|----------|--------|-------------|---------------|
| `/` | GET | List all periods | Any authenticated user |
| `/` | POST | Create a new period | `SUPER_MANAGER`, `PRINCIPAL` |
| `/:id` | GET | Get a specific period by ID | Any authenticated user |
| `/:id` | PUT | Update a period | `SUPER_MANAGER`, `PRINCIPAL` |
| `/:id` | DELETE | Delete a period | `SUPER_MANAGER`, `PRINCIPAL` |

### Timetables (`/timetables`)

| Endpoint | Method | Description | Required Roles |
|----------|--------|-------------|---------------|
| `/` | GET | Get timetable for a sub-class | Any authenticated user |
| `/bulk-update` | POST | Create or update multiple timetable slots | `SUPER_MANAGER`, `PRINCIPAL`, `VICE_PRINCIPAL` |

### Discipline (`/discipline`)

| Endpoint | Method | Description | Required Roles |
|----------|--------|-------------|---------------|
| `/` | GET | List all discipline records (with filters) | Any authenticated user |
| `/` | POST | Record a discipline issue | `SUPER_MANAGER`, `PRINCIPAL`, `VICE_PRINCIPAL`, `DISCIPLINE_MASTER`, `TEACHER` |
| `/:studentId` | GET | Get discipline records for a specific student | `SUPER_MANAGER`, `PRINCIPAL`, `VICE_PRINCIPAL`, `DISCIPLINE_MASTER`, `TEACHER` |

### Attendance (`/attendance`)

| Endpoint | Method | Description | Required Roles |
|----------|--------|-------------|---------------|
| `/students` | POST | Record a student's absence for a period | `SUPER_MANAGER`, `PRINCIPAL`, `VICE_PRINCIPAL`, `DISCIPLINE_MASTER`, `TEACHER` |
| `/teachers` | POST | Record a teacher's absence for a period | `SUPER_MANAGER`, `PRINCIPAL`, `VICE_PRINCIPAL` |

### Exams (`/exams`)

| Endpoint | Method | Description | Required Roles |
|----------|--------|-------------|---------------|
| `/` | GET | List all exam sequences | Any authenticated user |
| `/` | POST | Create a new exam sequence | `SUPER_MANAGER`, `PRINCIPAL`, `VICE_PRINCIPAL` |
| `/:id` | GET | Get exam sequence details | Any authenticated user |
| `/:id` | DELETE | Delete an exam sequence | `SUPER_MANAGER`, `PRINCIPAL` |
| `/:id/status`| PATCH | Update exam sequence status (e.g., to trigger report generation) | `SUPER_MANAGER`, `PRINCIPAL`, `VICE_PRINCIPAL` |
| `/papers` | GET | List all exam papers | Any authenticated user |
| `/papers` | POST | Create a new exam paper | `SUPER_MANAGER`, `PRINCIPAL`, `VICE_PRINCIPAL` |
| `/papers/:examId/with-questions` | GET | Get a specific exam paper with its questions | Any authenticated user |
| `/papers/:id/questions` | POST | Add questions to an exam paper | Any authenticated user |
| `/papers/:id/generate` | POST | Generate an exam paper (placeholder) | Any authenticated user |

### Marks (`/marks`)

| Endpoint | Method | Description | Required Roles |
|----------|--------|-------------|---------------|
| `/` | GET | List all marks (with filters) | `SUPER_MANAGER`, `PRINCIPAL`, `VICE_PRINCIPAL`, `TEACHER` |
| `/` | POST | Create (or update) a mark | `SUPER_MANAGER`, `PRINCIPAL`, `VICE_PRINCIPAL`, `TEACHER` |
| `/:id` | PUT | Update a specific mark by its ID | `SUPER_MANAGER`, `PRINCIPAL`, `VICE_PRINCIPAL`, `TEACHER` |
| `/:id` | DELETE | Delete a specific mark by its ID | `SUPER_MANAGER`, `PRINCIPAL`, `VICE_PRINCIPAL`, `TEACHER` |

### Report Cards (`/report-cards`)

| Endpoint | Method | Description | Required Roles |
|----------|--------|-------------|---------------|
| `/student/:studentId` | GET | Generate a report card for a single student | Any authenticated user |
| `/sub_class/:sub_classId` | GET | Generate combined report cards for a sub-class | Any authenticated user |

### Student Averages (`/student-averages`)

| Endpoint | Method | Description | Required Roles |
|----------|--------|-------------|---------------|
| `/calculate/:examSequenceId` | POST | Calculate student averages for an exam sequence | `SUPER_MANAGER`, `PRINCIPAL`, `VICE_PRINCIPAL`, `TEACHER` |
| `/sequence/:examSequenceId` | GET | Get all averages for an exam sequence | `SUPER_MANAGER`, `PRINCIPAL`, `VICE_PRINCIPAL`, `TEACHER`, `PARENT` |
| `/:enrollmentId/:examSequenceId`| GET | Get a specific student's average for an exam sequence | `SUPER_MANAGER`, `PRINCIPAL`, `VICE_PRINCIPAL`, `TEACHER`, `PARENT` |
| `/:id/decision` | PUT | Update the decision (e.g., promoted) on a student's average | `SUPER_MANAGER`, `PRINCIPAL`, `VICE_PRINCIPAL` |

### Communications (`/communications`)

| Endpoint | Method | Description | Required Roles |
|----------|--------|-------------|---------------|
| `/announcements` | GET | List announcements | Any authenticated user |
| `/announcements` | POST | Create an announcement | `SUPER_MANAGER`, `PRINCIPAL`, `VICE_PRINCIPAL` |
| `/announcements/:id` | PUT | Update an announcement | `SUPER_MANAGER`, `PRINCIPAL`, `VICE_PRINCIPAL` |
| `/announcements/:id` | DELETE | Delete an announcement | `SUPER_MANAGER`, `PRINCIPAL`, `VICE_PRINCIPAL` |
| `/notifications` | POST | Send a push notification | `SUPER_MANAGER`, `PRINCIPAL`, `VICE_PRINCIPAL` |

### Mobile (`/mobile`)

| Endpoint | Method | Description | Required Roles |
|----------|--------|-------------|---------------|
| `/dashboard` | GET | Get mobile dashboard data | Any authenticated user |
| `/register-device` | POST | Register a mobile device for push notifications | Any authenticated user |
| `/notifications` | GET | Get user-specific notifications | Any authenticated user |
| `/data/sync` | POST | Sync offline data (placeholder) | Any authenticated user |

### File Uploads (`/uploads`)

| Endpoint | Method | Description | Required Roles |
|----------|--------|-------------|---------------|
| `/` | POST | Upload a file (e.g., user photo) | Any authenticated user |
| `/:filename` | DELETE | Delete an uploaded file | Any authenticated user |