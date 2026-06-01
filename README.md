# School Management System - Frontend

This repository contains the frontend code for the School Management System, designed to facilitate the management of student information, academic performance, and behavior monitoring. The application is built using modern web technologies to provide a seamless user experience for school administrators, teachers, and guidance counselors.

## Features

- **Guidance Counselor Dashboard**: Manage student remarks, monitor behavior, and track student performance.
- **Student Management**: View and manage student profiles, academic and behavioral status.
- **Remarks Management**: Add and manage remarks for student academic and behavioral progress.
- **Behavior Monitoring**: Track and manage student behavior incidents and interventions.

## Technologies Used

- **React**: A JavaScript library for building user interfaces.
- **Next.js**: A React framework for server-side rendering and static site generation.
- **Tailwind CSS**: A utility-first CSS framework for styling.
- **Heroicons**: A set of free MIT-licensed high-quality SVG icons for UI development.

## Getting Started

To get started with the frontend development, clone the repository and install the dependencies:

```bash
# Clone the repository
git clone <repository-url>

# Navigate to the project directory
cd school-management-system

# Install dependencies
npm install

# Run the development server
npm run dev
```

The application will be available at `http://localhost:3000`.

## Future Plans

We are planning to develop a mobile application to complement the web-based frontend. The mobile app will provide similar functionalities, allowing users to manage student information and monitor performance on the go.

Stay tuned for updates on the mobile app development!

## Contributing

Contributions are welcome! If you have any suggestions or improvements, feel free to open an issue or submit a pull request.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for more information.

# Backend API Requirements for Marks Management Page

This document outlines the required backend API endpoints and their specifications to support the frontend Marks Management page (`src/app/dashboard/super-manager/marks-management/page.tsx`).

## Overview

The Marks Management page allows users (specifically Super Managers) to view, enter, update, and delete student marks (scores) based on a specific context defined by filters:

*   Academic Year
*   Term
*   Sequence (Evaluation/Exam)
*   Class
*   Subclass
*   Subject

The frontend dynamically fetches filter options and then retrieves student and mark data based on the final selection.

## Required API Endpoints Summary

| Method | Path                                                                 | Purpose                                                     |
| :----- | :------------------------------------------------------------------- | :---------------------------------------------------------- |
| GET    | `/api/v1/academic-years`                                             | Fetch list of all academic years                            |
| GET    | `/api/v1/classes`                                                    | Fetch list of all top-level classes                         |
| GET    | `/api/v1/academic-years/{yearId}/terms`                              | Fetch terms belonging to a specific academic year           |
| GET    | `/api/v1/exams?termId={termId}&academicYearId={yearId}`              | Fetch sequences/exams within a specific term and year       |
| GET    | `/api/v1/classes/{classId}/sub-classes`                              | Fetch subclasses belonging to a specific class              |
| GET    | `/api/v1/classes/sub-classes/{subclassId}/subjects?includeSubjects=true` | Fetch subjects assigned to a specific subclass              |
| GET    | `/api/v1/students?subclassId={subclassId}&academicYearId={yearId}&status=ENROLLED` | Fetch enrolled students for a specific subclass and year  |
| GET    | `/api/v1/marks?subClassId={subClassId}&examSequenceId={sequenceId}&academicYearId={yearId}&subjectId={subjectId}` | **Fetch existing marks** for the specific context           |
| POST   | `/api/v1/marks`                                                      | **Create** a new mark record                                |
| PUT    | `/api/v1/marks/{markId}`                                             | **Update** an existing mark record                          |
| DELETE | `/api/v1/marks/{markId}`                                             | **Delete** an existing mark record                          |

## Detailed Endpoint Specifications

### 1. Fetch Existing Marks (`GET /api/v1/marks`)

*   **Purpose:** Retrieve the marks data needed to populate the input fields for the selected context.
*   **Query Parameters:**
    *   `subClassId` (required): ID of the selected subclass.
    *   `examSequenceId` (required): ID of the selected sequence/exam.
    *   `academicYearId` (required): ID of the selected academic year.
    *   `subjectId` (required): ID of the selected subject.
*   **Expected Response:**
    *   Status: `200 OK` (even if no marks are found).
    *   Body: JSON object with a `data` key. `data` must be an **array** of mark objects matching *all* query parameters. If no marks match, return an empty array (`[]`).
*   **Crucial Fields in `data` Array Objects:**
    *   `id` (`number`): The unique ID of the mark record itself.
    *   `studentId` (`number`): The ID of the student this mark belongs to. **(Frontend expects this camelCase key based on recent analysis)**.
    *   `score` (`number | null`): The actual mark value.
    *   Other fields (optional): `enrollment_id`, `subclass_subject_id`, `teacher_id`, `comment`, `created_at`, `updated_at`, etc.
*   **Example Response Body:**
    ```json
    {
      "data": [
        {
          "id": 123,
          "studentId": 5, 
          "score": 15.5,
          "comment": "Good effort",
          // ... other fields ...
        },
        // ... more mark objects ...
      ]
    }
    ```
*   **Backend Logic:** The query **must** filter marks based on `subClassId`, `examSequenceId`, `academicYearId`, AND `subjectId`.

### 2. Create Mark (`POST /api/v1/marks`)

*   **Purpose:** Create a new mark record.
*   **Request Body:**
    ```json
    {
      "studentId": number,
      "subjectId": number,
      "examId": number, // This is the selected Sequence ID 
      "teacherId": number, // ID of the logged-in user creating the mark
      "mark": number, // The score value entered 
      "comment": string | null // Optional comment (frontend sends null)
    }
    ```
*   **Backend Logic:**
    *   Validate the input data (e.g., mark range 0-20).
    *   Extract `teacherId` from the authenticated user session/token.
    *   Create the new mark record in the database (likely storing the `mark` value in a `score` column).
    *   Return `201 Created` on success (optionally with the created object) or an appropriate error status (4xx/5xx) with a JSON error message on failure.

### 3. Update Mark (`PUT /api/v1/marks/{markId}`)

*   **Purpose:** Update an existing mark's score (and potentially comment).
*   **Path Parameter:** `{markId}`: The unique ID of the mark record to update.
*   **Request Body:**
    ```json
    {
      "mark": number, // The updated score value
      "comment": string | null // Optional updated comment
    }
    ```
*   **Backend Logic:**
    *   Find the mark by `{markId}`.
    *   Validate the input data.
    *   Update the `score` (and potentially `comment`) field in the database.
    *   Return `200 OK` on success (optionally with the updated object) or an error status (4xx/5xx) with a JSON error message.

### 4. Delete Mark (`DELETE /api/v1/marks/{markId}`)

*   **Purpose:** Delete an existing mark record.
*   **Path Parameter:** `{markId}`: The unique ID of the mark record to delete.
*   **Backend Logic:**
    *   Find the mark by `{markId}`.
    *   Delete the record from the database.
    *   Return `200 OK` or `204 No Content` on success, or an error status (4xx/5xx) with a JSON error message.

### 5. Supporting Filter Endpoints

The following GET endpoints are required to populate the dropdown filters. They generally expect a standard `Authorization: Bearer <token>` header and should return a JSON object with a `data` key containing an array of objects with at least `id` and `name` properties.

*   `GET /api/v1/academic-years`
*   `GET /api/v1/classes`
*   `GET /api/v1/academic-years/{yearId}/terms`
*   `GET /api/v1/exams?termId={termId}&academicYearId={yearId}`
*   `GET /api/v1/classes/{classId}/sub-classes`
*   `GET /api/v1/classes/sub-classes/{subclassId}/subjects?includeSubjects=true`
*   `GET /api/v1/students?subclassId={subclassId}&academicYearId={yearId}&status=ENROLLED`

*(Refer to the previous detailed analysis or frontend code for exact expected response structures for these filter endpoints if needed.)*

## General Backend Considerations

1.  **Authentication & Authorization:**
    *   All endpoints must be protected and require a valid `Authorization: Bearer <token>` header.
    *   The backend must validate the token.
    *   The backend must ensure the authenticated user has the correct role/permissions (e.g., Super Manager) to access these endpoints and perform actions.
    *   The user ID associated with the token is needed for the `teacherId` field when creating marks.

2.  **Error Handling:**
    *   Use standard HTTP status codes (2xx for success, 4xx for client errors, 5xx for server errors).
    *   Return errors in a consistent JSON format, e.g., `{ "error": "Detailed error message" }` or `{ "message": "Detailed error message" }`.

3.  **Data Consistency:**
    *   **Key Naming:** Be mindful of field naming conventions (snake_case vs camelCase). The frontend currently expects `studentId` (camelCase) in the response from `GET /marks` based on recent debugging. Ensure the API response matches frontend expectations, especially for critical fields like IDs and scores.
    *   **Data Types:** Ensure IDs are consistently numbers and scores (`mark`/`score`) are numbers or null.

4.  **Filtering:** The filtering logic for `GET /marks` is paramount. It must correctly use all provided query parameters (`subClassId`, `examSequenceId`, `academicYearId`, `subjectId`).
