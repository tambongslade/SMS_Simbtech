# School Management System - Timetable API Implementation

This document provides implementation details for the backend API endpoints required to support the timetable management feature as described in the `timetable.md` specification.

## API Response Format

All API endpoints follow these response formats:

- **Success Response**:
  ```json
  {
    "success": true,
    "data": [/* response data */]
  }
  ```

- **Error Response**:
  ```json
  {
    "success": false,
    "error": "Description of the error"
  }
  ```

## Authentication & Authorization

All endpoints require authentication using JWT tokens. Additionally:
- Most `GET` endpoints are accessible to all authenticated users
- `POST`, `PUT`, and `DELETE` endpoints typically require `SUPER_MANAGER`, `PRINCIPAL`, or `VICE_PRINCIPAL` roles

## Available Endpoints

### 1. GET /api/v1/classes

**Purpose**: Fetch list of all parent classes.

**Authorization**: Any authenticated user

**Response**:
```json
{
  "success": true,
  "data": [
    { "id": 1, "name": "Form 1" },
    { "id": 2, "name": "Form 2" }
  ]
}
```

### 2. GET /api/v1/classes/sub-classes

**Purpose**: Fetch list of all subclasses with parent class info.

**Authorization**: Any authenticated user

**Query Parameters**:
- `classId` (optional): Filter subclasses by parent class ID

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "1A",
      "class": {
        "id": 1,
        "name": "Form 1"
      }
    }
  ]
}
```

### 3. GET /api/v1/subjects

**Purpose**: Fetch list of all available subjects.

**Authorization**: Any authenticated user

**Response**:
```json
{
  "success": true,
  "data": [
    { "id": 1, "name": "Mathematics", "category": "SCIENCE" },
    { "id": 2, "name": "English", "category": "LANGUAGE" }
  ]
}
```

### 4. GET /api/v1/periods

**Purpose**: Fetch the defined list of school periods.

**Authorization**: Any authenticated user

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Period 1",
      "startTime": "07:30:00",
      "endTime": "08:25:00",
      "isBreak": false,
      "sortOrder": 1
    },
    {
      "id": 2,
      "name": "Break",
      "startTime": "10:25:00",
      "endTime": "10:45:00",
      "isBreak": true,
      "sortOrder": 3
    }
  ]
}
```

**Status**: This endpoint is not yet implemented and will return a 404 error. It will be implemented as part of the timetable feature.

### 5. GET /api/v1/users/teachers

**Purpose**: Fetch list of users designated as teachers, including subjects they teach.

**Authorization**: Any authenticated user

**Query Parameters**:
- `subjectId` (optional): Filter teachers by subject they teach

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "gender": "MALE",
      "subjects": [
        {
          "id": 1,
          "name": "Mathematics",
          "category": "SCIENCE"
        }
      ]
    }
  ]
}
```

**Notes**: This endpoint is implemented as `/api/v1/users/teachers` rather than `/api/v1/teachers` as described in the specification.

### 6. GET /api/v1/timetables

**Purpose**: Fetch the assigned timetable slots for a specific subclass.

**Authorization**: Any authenticated user

**Query Parameters**:
- `subClassId` (required): ID of the subclass to fetch timetable for

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "subclassId": 1,
      "day": "MONDAY",
      "periodId": 1,
      "subjectId": 1,
      "teacherId": 5,
      "period": {
        "id": 1,
        "name": "Period 1",
        "startTime": "07:30:00",
        "endTime": "08:25:00"
      },
      "subject": {
        "id": 1,
        "name": "Mathematics"
      },
      "teacher": {
        "id": 5,
        "name": "Mr. Johnson"
      }
    }
  ]
}
```

**Status**: This endpoint will be implemented as part of the timetable feature.

### 7. POST /api/v1/timetables/bulk-update

**Purpose**: Save multiple timetable slot changes for a specific subclass at once.

**Authorization**: `SUPER_MANAGER`, `PRINCIPAL`, or `VICE_PRINCIPAL` roles only

**Request Body**:
```json
{
  "subClassId": 1,
  "slots": [
    {
      "day": "MONDAY",
      "periodId": 1,
      "subjectId": 1,
      "teacherId": 5
    },
    {
      "day": "MONDAY",
      "periodId": 2,
      "subjectId": null,
      "teacherId": null
    }
  ]
}
```

**Response (Success)**:
```json
{
  "success": true,
  "message": "Timetable updated successfully",
  "data": {
    "updated": 2,
    "conflicts": []
  }
}
```

**Response (Conflict)**:
```json
{
  "success": false,
  "error": "Teacher conflicts detected",
  "conflicts": [
    {
      "teacherId": 5,
      "teacherName": "Mr. Johnson",
      "day": "MONDAY",
      "periodId": 1,
      "conflictingSubclassId": 2,
      "conflictingSubclassName": "1B"
    }
  ]
}
```

**Status**: This endpoint will be implemented as part of the timetable feature.

## Implementation Notes

1. **Case Conversion**:
   The API accepts and returns camelCase property names (e.g., `subClassId`) but uses snake_case internally (`sub_class_id`). This conversion is handled automatically by middleware, so frontend code should always use camelCase.

2. **Teacher Conflicts**:
   The API will validate that a teacher is not assigned to multiple classes during the same period and day. If conflicts are detected, the API will return a detailed error response.

3. **Data Validation**:
   - All IDs must be valid integers
   - `day` must be one of: "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"
   - A teacher must be qualified to teach the assigned subject

4. **Academic Year Context**:
   The timetable is specific to the current academic year. The API will use the current academic year context automatically.

## Next Steps for Implementation

The following database tables will be created to support the timetable feature:
- `periods` - To store the defined school periods
- `timetable_slots` - To store the assignment of subjects and teachers to specific periods, days, and subclasses

The following API endpoints will be implemented:
- GET /api/v1/periods
- GET /api/v1/timetables
- POST /api/v1/timetables/bulk-update 