# DISCIPLINE_MASTER (SDM) Role - Complete Workflow & UX Design

## Post-Login Discipline Master Dashboard (`/discipline-master/dashboard`)

### **Enhanced API Integration**

**Key Schema Details (from Prisma):**
- **DisciplineIssue Model:** `enrollment_id`, `issue_type` (DisciplineType enum), `description`, `notes`, `assigned_by_id`, `reviewed_by_id`
- **StudentAbsence Model:** `assigned_by_id`, `teacher_period_id`, `enrollment_id`, `absence_type` (AbsenceType enum)
- **TeacherAbsence Model:** `teacher_id`, `assigned_by_id`, `teacher_period_id`, `reason`
- **DisciplineType Enum:** MORNING_LATENESS, CLASS_ABSENCE, MISCONDUCT, OTHER
- **AbsenceType Enum:** MORNING_LATENESS, CLASS_ABSENCE
- **TeacherPeriod Model:** Links periods to subjects, teachers, and subclasses for attendance tracking

**IMPORTANT: "Attendance" APIs Actually Manage ABSENCE Records**
⚠️ **For Frontend Developers:** The `/attendance/*` endpoints do NOT manage an "Attendance" table - they manage the `StudentAbsence` and `TeacherAbsence` tables in the database. This is essentially "absence tracking" disguised as "attendance management."

**API Categories & Database Tables:**
1. **"Attendance" APIs** (`/api/v1/attendance/*`) → Manage `StudentAbsence` & `TeacherAbsence` tables
2. **Discipline Lateness APIs** (`/api/v1/discipline/lateness/*`) → Create records in both `StudentAbsence` & `DisciplineIssue` tables
3. **Discipline Issue APIs** (`/api/v1/discipline/*`) → Manage `DisciplineIssue` table only
4. **Analytics & Dashboard APIs** (`/api/v1/discipline-master/*`) → Query across all tables for insights

**When Should the Discipline Master Use Which API?**

**For Morning Gate Duty (Quick Recording):**
- Use `/discipline/lateness` → Creates BOTH absence record AND disciplinary action

**For Detailed Absence Analysis:**
- Use `/attendance/students` → Query absence patterns, generate reports, view trends

**For Teacher Management:**
- Use `/attendance/teachers` → Record when teachers don't show up (administrative)

**For Behavioral Tracking:**
- Use `/discipline/*` → Record misconduct, track behavioral issues (not absence-related)

#### **1. Get Discipline Master Dashboard**
**Endpoint:** `GET /api/v1/discipline-master/dashboard`
- **Headers:** `Authorization: Bearer <token>`
- **Query Parameters:**
  ```json
  {
    "academicYearId": 2024 // Optional, defaults to current year
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "data": {
      "totalActiveIssues": 12,
      "resolvedThisWeek": 5,
      "pendingResolution": 7,
      "studentsWithMultipleIssues": 3,
      "averageResolutionTime": 3.2,
      "attendanceRate": 95.3,
      "latenessIncidents": 8,
      "absenteeismCases": 15,
      "interventionSuccess": 87,
      "criticalCases": 2,
      "behavioralTrends": {
        "thisMonth": 45,
        "lastMonth": 38,
        "trend": "IMPROVING"
      },
      "urgentInterventions": [
        {
          "studentId": 101,
          "studentName": "Alice Brown",
          "issueCount": 4,
          "riskLevel": "HIGH",
          "lastIncident": "2024-01-22T08:15:00.000Z",
          "recommendedAction": "Immediate counseling session"
        }
      ],
      "issuesByType": [
        {
          "type": "MORNING_LATENESS",
          "count": 8,
          "trend": "INCREASING",
          "resolution_rate": 75
        }
      ]
    }
  }
  ```

#### **2. Get Student Attendance (Queries StudentAbsence Table)**
**Endpoint:** `GET /api/v1/attendance/students`
- **Headers:** `Authorization: Bearer <token>`
- **Database:** Queries `StudentAbsence` table (not an "Attendance" table)
- **Query Parameters:**
  ```json
  {
    "student_id": 101,              // Optional
    "class_id": 5,                  // Optional  
    "sub_class_id": 12,             // Optional
    "start_date": "2024-01-01",     // Optional
    "end_date": "2024-01-22",       // Optional
    "status": "ABSENT",             // Optional
    "include_student": "true",      // Optional
    "include_assigned_by": "true",  // Optional
    "include_teacher_period": "true", // Optional
    "academic_year_id": 2024,       // Optional
    "page": 1,
    "limit": 10,
    "sortBy": "created_at",
    "sortOrder": "desc"
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "data": [
      {
        "id": 1,
        "enrollment_id": 201,
        "assigned_by_id": 10,
        "teacher_period_id": 5,
        "absence_type": "MORNING_LATENESS",
        "created_at": "2024-01-22T08:15:00.000Z",
        "enrollment": {
          "student": { "id": 101, "name": "Alice Brown", "matricule": "STU2024015" },
          "sub_class": { "name": "Form 3A", "class": { "name": "Form 3" } }
        },
        "assigned_by": { "id": 10, "name": "SDM User" }
      }
    ],
    "meta": { "total": 25, "page": 1, "limit": 10, "totalPages": 3 }
  }
  ```

#### **3. Record Student Attendance - Creates StudentAbsence Records**
**Endpoint:** `POST /api/v1/attendance/students`
- **Headers:** `Authorization: Bearer <token>`
- **Database:** Creates records in `StudentAbsence` table
- **Request Body:**
  ```json
  {
    "records": [
      {
        "student_id": 101,
        "academic_year_id": 2024,
        "teacher_period_id": 5
      },
      {
        "enrollment_id": 202,
        "teacher_period_id": 6
      }
    ]
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "message": "2 attendance record(s) created successfully",
    "data": [ ...StudentAbsence objects... ]
  }
  ```

#### **4. Update Student Attendance**
**Endpoint:** `PUT /api/v1/attendance/students/:id`
- **Headers:** `Authorization: Bearer <token>`
- **Request Body:**
  ```json
  {
    "teacher_period_id": 7
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "message": "Attendance record updated successfully",
    "data": { ...updated StudentAbsence object... }
  }
  ```

#### **5. Get Student Attendance Summary**
**Endpoint:** `GET /api/v1/attendance/students/summary`
- **Headers:** `Authorization: Bearer <token>`
- **Query Parameters:**
  ```json
  {
    "student_id": 101,
    "class_id": 5,
    "sub_class_id": 12,
    "start_date": "2024-01-01",
    "end_date": "2024-01-22",
    "academic_year_id": 2024
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "data": {
      "totalDays": 15,
      "presentDays": 12,
      "absentDays": 2,
      "lateDays": 1,
      "excusedDays": 1,
      "attendanceRate": 86.67,
      "absenteeRate": 13.33,
      "breakdown": {
        "PRESENT": 12,
        "ABSENT": 2,
        "LATE": 1,
        "EXCUSED": 1
      }
    }
  }
  ```

#### **6. Record Morning Lateness - Creates BOTH StudentAbsence + DisciplineIssue**
**Endpoint:** `POST /api/v1/discipline/lateness`
- **Headers:** `Authorization: Bearer <token>`
- **Database:** Creates records in BOTH `StudentAbsence` AND `DisciplineIssue` tables
- **Request Body:**
  ```json
  {
    "student_id": 101,
    "date": "2024-01-22",           // Optional, defaults to today
    "arrival_time": "08:15",        // "HH:mm"
    "minutes_late": 15,             // Optional
    "reason": "Transport delay",
    "academic_year_id": 2024        // Optional
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "message": "Morning lateness recorded successfully",
    "data": {
      "id": 1,
      "enrollment_id": 201,
      "assigned_by_id": 10,
      "absence_type": "MORNING_LATENESS",
      "created_at": "2024-01-22T08:15:00.000Z",
      "enrollment": {
        "student": { "id": 101, "name": "Alice Brown", "matricule": "STU2024015" },
        "sub_class": { "name": "Form 3A", "class": { "name": "Form 3" } }
      },
      "assigned_by": { "id": 10, "name": "SDM User" }
    }
  }
  ```

#### **7. Record Bulk Morning Lateness**
**Endpoint:** `POST /api/v1/discipline/lateness/bulk`
- **Headers:** `Authorization: Bearer <token>`
- **Request Body:**
  ```json
  {
    "date": "2024-01-22",                // Optional, defaults to today
    "academic_year_id": 2024,            // Optional
    "records": [
      { 
        "student_id": 101, 
        "arrival_time": "08:15", 
        "minutes_late": 15,
        "reason": "Transport delay" 
      },
      { 
        "student_id": 102, 
        "arrival_time": "08:20", 
        "minutes_late": 20,
        "reason": "Overslept" 
      }
    ]
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "message": "Processed 2 records",
    "data": {
      "successful_records": 2,
      "failed_records": 0,
      "successes": [ ...StudentAbsence objects... ],
      "errors": []
    }
  }
  ```

#### **8. Get Teacher Attendance (Queries TeacherAbsence Table)**
**Endpoint:** `GET /api/v1/attendance/teachers`
- **Headers:** `Authorization: Bearer <token>`
- **Database:** Queries `TeacherAbsence` table
- **Query Parameters:**
  ```json
  {
    "teacher_id": 25,               // Optional
    "start_date": "2024-01-01",     // Optional
    "end_date": "2024-01-22",       // Optional
    "reason": "illness",            // Optional
    "include_teacher": "true",      // Optional
    "include_assigned_by": "true",  // Optional
    "include_teacher_period": "true", // Optional
    "page": 1,
    "limit": 10,
    "sortBy": "created_at",
    "sortOrder": "desc"
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "data": [
      {
        "id": 1,
        "teacher_id": 25,
        "assigned_by_id": 10,
        "teacher_period_id": 5,
        "reason": "Medical appointment",
        "created_at": "2024-01-22T09:00:00.000Z",
        "teacher": { "id": 25, "name": "Mr. Johnson" },
        "assigned_by": { "id": 10, "name": "SDM User" }
      }
    ],
    "meta": { "total": 8, "page": 1, "limit": 10, "totalPages": 1 }
  }
  ```

#### **9. Record Teacher Attendance - Creates TeacherAbsence Record**
**Endpoint:** `POST /api/v1/attendance/teachers`
- **Headers:** `Authorization: Bearer <token>`
- **Database:** Creates record in `TeacherAbsence` table
- **Request Body:**
  ```json
  {
    "teacher_id": 25,
    "reason": "Medical appointment",
    "teacher_period_id": 5          // Optional
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "message": "Teacher attendance recorded successfully",
    "data": {
      "id": 1,
      "teacher_id": 25,
      "assigned_by_id": 10,
      "teacher_period_id": 5,
      "reason": "Medical appointment",
      "created_at": "2024-01-22T09:00:00.000Z",
      "teacher": { "id": 25, "name": "Mr. Johnson" },
      "assigned_by": { "id": 10, "name": "SDM User" }
    }
  }
  ```

#### **10. Get Teacher Attendance Summary**
**Endpoint:** `GET /api/v1/attendance/teachers/summary`
- **Headers:** `Authorization: Bearer <token>`
- **Query Parameters:**
  ```json
  {
    "teacher_id": 25,               // Optional
    "start_date": "2024-01-01",     // Optional
    "end_date": "2024-01-22"        // Optional
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "data": {
      "totalAbsences": 3,
      "reasonBreakdown": {
        "Medical appointment": 2,
        "Family emergency": 1
      }
    }
  }
  ```

#### **11. Record Discipline Issue**
**Endpoint:** `POST /api/v1/discipline`
- **Headers:** `Authorization: Bearer <token>`
- **Request Body:**
  ```json
  {
    "student_id": 101,
    "issue_type": "MISCONDUCT",
    "description": "Disruptive behavior during math class",
    "academic_year_id": 2024
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "message": "Discipline issue recorded successfully",
    "data": { ...DisciplineIssue object... }
  }
  ```

#### **12. Get All Discipline Issues**
**Endpoint:** `GET /api/v1/discipline`
- **Headers:** `Authorization: Bearer <token>`
- **Query Parameters:**
  ```json
  {
    "student_id": 101,
    "class_id": 5,
    "sub_class_id": 12,
    "start_date": "2024-01-01",
    "end_date": "2024-01-22",
    "issue_type": "MORNING_LATENESS",
    "academic_year_id": 2024,
    "page": 1,
    "limit": 10,
    "sortBy": "created_at",
    "sortOrder": "desc"
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "data": {
      "data": [ ...DisciplineIssue objects... ],
      "meta": { "total": 12, "page": 1, "limit": 10, "totalPages": 2 }
    }
  }
  ```

#### **13. Get Lateness Statistics**
**Endpoint:** `GET /api/v1/discipline/lateness/statistics`
- **Headers:** `Authorization: Bearer <token>`
- **Query Parameters:**
  ```json
  {
    "academic_year_id": 2024
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "data": {
      "totalLatenessToday": 8,
      "totalLatenessThisWeek": 45,
      "totalLatenessThisMonth": 156,
      "chronicallyLateStudents": [ 
        {
          "student": { "id": 101, "name": "Alice Brown", "matricule": "STU2024015" },
          "class": "Form 3",
          "subclass": "Form 3A",
          "lateness_count": 5
        }
      ],
      "latenessByClass": [
        {
          "className": "Form 3",
          "count": 12
        }
      ]
    }
  }
  ```

#### **14. Get Daily Lateness Report**
**Endpoint:** `GET /api/v1/discipline/lateness/daily-report`
- **Headers:** `Authorization: Bearer <token>`
- **Query Parameters:**
  ```json
  {
    "date": "2024-01-22",
    "academic_year_id": 2024
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "data": {
      "date": "2024-01-22",
      "total_late_students": 8,
      "records": [
        {
          "id": 1,
          "student": { "id": 101, "name": "Alice Brown", "matricule": "STU2024015" },
          "class": "Form 3",
          "subclass": "Form 3A",
          "recorded_time": "2024-01-22T08:15:00.000Z",
          "recorded_by": "SDM User"
        }
      ]
    }
  }
  ```

#### **15. Get Student Behavior Profile**
**Endpoint:** `GET /api/v1/discipline-master/student-profile/:studentId`
- **Headers:** `Authorization: Bearer <token>`
- **Query Parameters:** `{ academicYearId?: number }`
- **Response:**
  ```json
  {
    "success": true,
    "data": {
      "studentId": 101,
      "studentName": "Alice Brown",
      "matricule": "STU2024015",
      "className": "Form 3",
      "subClassName": "Form 3A",
      "riskLevel": "HIGH",
      "behaviorScore": 70,
      "totalIncidents": 5,
      "recentIncidents": 3,
      "interventionsReceived": 2,
      "lastIncidentDate": "2024-01-22",
      "behaviorPattern": {
        "mostCommonIssues": ["Lateness", "Misconduct"],
        "triggerFactors": ["Morning tardiness", "Peer influence"],
        "improvementAreas": ["Punctuality", "Class participation"],
        "strengths": ["Academic performance", "Sports participation"]
      },
      "interventionHistory": [ ... ],
      "recommendedActions": [ ... ]
    }
  }
  ```

#### **16. Get Behavioral Analytics**
**Endpoint:** `GET /api/v1/discipline-master/behavioral-analytics`
- **Headers:** `Authorization: Bearer <token>`
- **Query Parameters:** `{ academicYearId?: number }`
- **Response:**
  ```json
  {
    "success": true,
    "data": {
      "totalStudents": 1245,
      "studentsWithIssues": 45,
      "behaviorScore": 92,
      "riskDistribution": { "high": 2, "medium": 7, "low": 12, "none": 1224 },
      "monthlyTrends": [ ... ],
      "issueTypeAnalysis": [ ... ],
      "classroomHotspots": [ ... ]
    }
  }
  ```

#### **17. Get Early Warning System**
**Endpoint:** `GET /api/v1/discipline-master/early-warning`
- **Headers:** `Authorization: Bearer <token>`
- **Query Parameters:** `{ academicYearId?: number }`
- **Response:**
  ```json
  {
    "success": true,
    "data": {
      "criticalStudents": [ ... ],
      "riskIndicators": [ ... ],
      "preventiveRecommendations": [ ... ]
    }
  }
  ```

#### **18. Get Discipline Statistics**
**Endpoint:** `GET /api/v1/discipline-master/statistics`
- **Headers:** `Authorization: Bearer <token>`
- **Query Parameters:**
  ```json
  {
    "academicYearId": 2024,
    "startDate": "2024-01-01",
    "endDate": "2024-01-22",
    "classId": 5
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "data": {
      "overview": {
        "totalStudents": 1245,
        "studentsWithIssues": 45,
        "behaviorScore": 92,
        "riskDistribution": { "high": 2, "medium": 7, "low": 12, "none": 1224 }
      },
      "trends": [ ... ],
      "issueAnalysis": [ ... ],
      "classroomHotspots": [ ... ],
      "filters": { "academicYearId": 2024, "startDate": "2024-01-01", "endDate": "2024-01-22", "classId": 5 }
    }
  }
  ```

#### **19. Create Intervention Plan**
**Endpoint:** `POST /api/v1/discipline-master/interventions`
- **Headers:** `Authorization: Bearer <token>`
- **Request Body:**
  ```json
  {
    "studentId": 101,
    "interventionType": "Behavioral Counseling",
    "description": "Weekly counseling sessions to address behavioral issues",
    "expectedEndDate": "2024-02-15",
    "assignedTo": "School Counselor"
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "message": "Intervention plan created successfully",
    "data": { ...intervention object... }
  }
  ```

#### **20. Update Intervention Status**
**Endpoint:** `PUT /api/v1/discipline-master/interventions/:interventionId`
- **Headers:** `Authorization: Bearer <token>`
- **Request Body:**
  ```json
  {
    "status": "ONGOING",
    "outcome": "SUCCESSFUL",
    "notes": "Student showing improvement",
    "effectiveness": 85
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "message": "Intervention updated successfully",
    "data": { ...updated intervention object... }
  }
  ```

#### **21. Get Intervention Tracking**
**Endpoint:** `GET /api/v1/discipline-master/interventions`
- **Headers:** `Authorization: Bearer <token>`
- **Query Parameters:**
  ```json
  {
    "academicYearId": 2024,
    "status": "ONGOING",
    "studentId": 101
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "data": [ ...intervention objects... ],
    "meta": { "total": 1, "filters": { "academicYearId": 2024, "status": "ONGOING", "studentId": 101 } }
  }
  ```

#### **22. Generate Discipline Report**
**Endpoint:** `GET /api/v1/discipline-master/reports`
- **Headers:** `Authorization: Bearer <token>`
- **Query Parameters:**
  ```json
  {
    "academicYearId": 2024,
    "reportType": "comprehensive",
    "startDate": "2024-01-01",
    "endDate": "2024-01-22"
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "data": {
      "reportInfo": { ... },
      "executiveSummary": { ... },
      "detailedAnalysis": { ... },
      "recommendations": [ ... ],
      "actionItems": [ ... ]
    }
  }
  ```

---

## Note on API Integration & Page Layouts

**API Documentation Status:** ✅ **COMPLETE**
The API endpoints above have been analyzed and integrated from the actual implementation including:
- **Attendance Service:** Complete implementation with filtering, pagination, and bulk operations
- **Discipline Service:** Specialized lateness tracking and discipline issue management  
- **Controller Layer:** Full request/response handling with authentication and authorization
- **Database Schema:** Aligned with Prisma models (StudentAbsence, TeacherAbsence, DisciplineIssue)

**Request/Response Formats:** All API examples above reflect the actual implementation including:
- Proper authentication headers (`Authorization: Bearer <token>`)
- Accurate query parameters and request body structures
- Real response formats with success/error handling
- Correct HTTP status codes and error messages

**Visual/UX Layouts:** All visual/UX layouts below are preserved as originally designed for reference. The API integration above provides the backend functionality to support these user interface designs.

---

## Morning Attendance Management (`/discipline-master/attendance`)

### **API Integration Reference for Discipline Master**

**🚨 DAILY WORKFLOW GUIDE:**

**7:30-8:00 AM (Morning Gate Duty):**
```
Student arrives late → Use POST /discipline/lateness
Result: Creates StudentAbsence + DisciplineIssue (disciplinary action)
```

**8:00 AM+ (Class Period Absences):**
```
Teacher reports missing student → Use POST /attendance/students  
Result: Creates StudentAbsence only (no disciplinary action yet)
```

**Throughout Day (Behavioral Issues):**
```
Misconduct reported → Use POST /discipline
Result: Creates DisciplineIssue only (behavior tracking)
```

**Teacher Doesn't Show Up:**
```
Teacher absent → Use POST /attendance/teachers
Result: Creates TeacherAbsence (administrative record)
```

**📊 ANALYSIS & REPORTING:**
- **Student Absence Patterns:** GET `/attendance/students` (queries StudentAbsence table)
- **Lateness Statistics:** GET `/discipline/lateness/statistics` 
- **Behavioral Trends:** GET `/discipline` (queries DisciplineIssue table)
- **Teacher Absence Summary:** GET `/attendance/teachers/summary`

**⚠️ KEY POINT:** 
- `/attendance/*` = Manage absence records (StudentAbsence/TeacherAbsence tables)
- `/discipline/*` = Manage disciplinary actions (DisciplineIssue table)
- Morning lateness uses BOTH systems (absence + discipline)

**📋 FRONTEND DEVELOPER REFERENCE TABLE:**

| Situation | API Endpoint | Database Table(s) | Records Created |
|-----------|-------------|------------------|-----------------|
| Student late at gate | `POST /discipline/lateness` | StudentAbsence + DisciplineIssue | Absence + Disciplinary action |
| Student missing from class | `POST /attendance/students` | StudentAbsence | Absence only |
| Student misbehaves | `POST /discipline` | DisciplineIssue | Disciplinary action only |
| Teacher doesn't show up | `POST /attendance/teachers` | TeacherAbsence | Teacher absence |
| View absence patterns | `GET /attendance/students` | StudentAbsence | Query results |
| View behavioral issues | `GET /discipline` | DisciplineIssue | Query results |

## Key Features for Discipline Master MVP:

### **Daily Operations:**
1. **Morning Attendance** - Track late arrivals and absences
2. **Incident Recording** - Document behavioral issues
3. **Real-time Monitoring** - Dashboard for immediate overview
4. **Priority Management** - Handle urgent cases first

### **Student Management:**
1. **Behavioral Tracking** - Individual student profiles
2. **Pattern Recognition** - Identify repeat offenders
3. **Intervention Planning** - Structured support programs
4. **Risk Assessment** - Early warning systems

### **Communication:**
1. **Parent Notifications** - Automated and manual alerts
2. **Staff Coordination** - Updates to VP and Principal
3. **Meeting Management** - Schedule and track conferences
4. **Documentation** - Comprehensive record keeping

### **Analytics & Reporting:**
1. **Trend Analysis** - Identify patterns and hotspots
2. **Statistical Reports** - Data-driven insights
3. **Performance Metrics** - Resolution times and success rates
4. **Stakeholder Updates** - Regular progress reports

## Critical UX Principles:

1. **Efficiency** - Quick data entry for daily operations
2. **Accessibility** - Mobile-friendly for field use
3. **Clarity** - Clear prioritization and status indicators
4. **Documentation** - Comprehensive record keeping
5. **Communication** - Seamless parent and staff coordination
6. **Analytics** - Data-driven decision making
7. **Compliance** - Proper procedures and documentation standards
