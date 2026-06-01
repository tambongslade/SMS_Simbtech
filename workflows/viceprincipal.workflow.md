# VICE_PRINCIPAL Role - Complete Workflow & UX Design

## Post-Login Vice Principal Dashboard (`/vice-principal/dashboard`)

### **API Integration**
**Primary Endpoint:** `GET /api/v1/vice-principal/dashboard`
- **Headers:** `Authorization: Bearer <token>`
- **Query Parameters:**
  ```typescript
  {
    academicYearId?: number; // Optional, defaults to current year
  }
  ```
- **Response Data:**
  ```typescript
  {
    success: true;
    data: {
      totalStudents: number;
      studentsAssigned: number;
      pendingInterviews: number;
      completedInterviews: number;
      awaitingAssignment: number;
      recentDisciplineIssues: number;
      classesWithPendingReports: number;
      teacherAbsences: number;
      enrollmentTrends: {
        thisMonth: number;
        lastMonth: number;
        trend: "INCREASING" | "DECREASING" | "STABLE";
      };
      subclassCapacityUtilization: Array<{
        subclassName: string;
        className: string;
        currentCapacity: number;
        maxCapacity: number;
        utilizationRate: number;
      }>;
      urgentTasks: Array<{
        type: "INTERVIEW_OVERDUE" | "ASSIGNMENT_PENDING" | "CAPACITY_EXCEEDED";
        description: string;
        priority: "HIGH" | "MEDIUM" | "LOW";
        count: number;
      }>;
    };
  }
  ```

### **Main Dashboard Layout**
```
┌─────────────────────────────────────────────────────────┐
│ [🏠] School Management System    [🔔] [👤] [⚙️] [🚪]    │
├─────────────────────────────────────────────────────────┤
│ Welcome back, [VP Name] | Academic Year: 2024-2025      │
│ Vice Principal - Student Affairs & Enrollment           │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ ┌─── Student & Enrollment Overview ───┐                 │
│ │ 👨‍🎓 Total Students: [Total Students]   📝 Pending Interviews: [Pending Interviews] │
│ │ 🏫 Students Assigned: [Students Assigned]  ✅ Completed Interviews: [Completed Interviews] │
│ │ ⏳ Awaiting Assignment: [Awaiting Assignment]   ⚠️ Recent Discipline Issues: [Recent Discipline Issues] │
│ │ 📄 Classes with Pending Reports: [Classes With Pending Reports] │
│ │ 🚸 Teacher Absences Today: [Teacher Absences]        │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ┌─── Enrollment Trends ───┐   ┌─── Subclass Capacity ───┐│
│ │ This Month: [This Month Enrollment]                 │   │ [Subclass 1 Name] ([Class 1 Name]): [Utilization 1]% ││
│ │ Last Month: [Last Month Enrollment]                 │   │ [Subclass 2 Name] ([Class 2 Name]): [Utilization 2]% ││
│ │ Trend: [Enrollment Trend]                           │   │ [View All Capacities]               ││
│ │ [View Detailed Enrollment Analytics]                │   │                                     ││
│ └───────────────────────────┘   └─────────────────────────┘│
│                                                         │
│ ┌─── Urgent Tasks ───┐                                 │
│ │ 🚨 [Urgent Task 1 Type]: [Urgent Task 1 Description] ([Urgent Task 1 Count]) │
│ │ ⚠️ [Urgent Task 2 Type]: [Urgent Task 2 Description] ([Urgent Task 2 Count]) │
│ │ [View All Urgent Tasks]                               │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## Student Enrollment Management (`/vice-principal/enrollment`)

### **API Integration**

#### **1. Get Enrollment Pipeline Status**
**Endpoint:** `GET /api/v1/vice-principal/enrollment/pipeline`
- **Headers:** `Authorization: Bearer <token>`
- **Query Parameters:**
  ```typescript
  {
    academicYearId?: number;
  }
  ```
- **Response Data:**
  ```typescript
  {
    success: true;
    data: {
      pipelineStats: {
        totalEnrolled: number;
        enrollmentTarget: number;
        remainingCapacity: number;
        pipelineEfficiency: number;      // Percentage
      };
      stages: {
        newRegistrations: {
          count: number;
          studentsToday: number;
          studentsThisWeek: number;
        };
        interviewProcess: {
          pending: number;
          completedThisWeek: number;
          averageScore: number;
          passRate: number;
        };
        subclassAssignment: {
          readyForAssignment: number;
          assignedThisWeek: number;
          successfulPlacements: number;
        };
      };
    };
  }
  ```

#### **2. Get Students by Stage**
**Endpoint:** `GET /api/v1/vice-principal/students/by-stage`
- **Headers:** `Authorization: Bearer <token>`
- **Query Parameters:**
  ```typescript
  {
    stage: "NEW_REGISTRATION" | "AWAITING_INTERVIEW" | "INTERVIEW_COMPLETE" | "ASSIGNED";
    academicYearId?: number;
    page?: number;
    limit?: number;
    search?: string;          // Name or matricule search
    classId?: number;         // Filter by target class
  }
  ```
- **Response:**
  ```typescript
  {
    success: true;
    data: Array<{
      id: number;
      name: string;
      matricule: string;
      dateOfBirth: string;
      age: number;
      registrationDate: string;
      currentStage: "NEW_REGISTRATION" | "AWAITING_INTERVIEW" | "INTERVIEW_COMPLETE" | "ASSIGNED";
      targetClass: {
        id: number;
        name: string;
      };
      formerSchool?: string;
      parent: {
        id: number;
        name: string;
        phone: string;
        email?: string;
        relationship: string;
      };
      status: "NOT_ENROLLED" | "AWAITING_INTERVIEW" | "INTERVIEW_COMPLETED" | "ASSIGNED_TO_CLASS";
      daysInStage: number;
      interviewDetails?: {
        scheduledDate?: string;
        completedDate?: string;
        score?: number;
        status?: "PENDING" | "COMPLETED" | "PASSED" | "FAILED";
      };
      assignmentDetails?: {
        subClassId?: number;
        subClassName?: string;
        assignedDate?: string;
      };
      registeredBy: {
        id: number;
        name: string;
      };
      urgencyLevel: "LOW" | "MEDIUM" | "HIGH";
      alerts: Array<string>;
    }>;
    meta: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
    summary: {
      totalByStage: {
        newRegistrations: number;
        awaitingInterview: number;
        interviewComplete: number;
        assigned: number;
      };
      averageDaysInStage: number;
      urgentCases: number;
    };
  }
  ```

### **Enrollment Pipeline Dashboard**
```
┌─── Student Enrollment Pipeline ───┐
│ [New Registrations] [Interviews] [Assignments] [Reports] │
│                                                          │
│ ┌─── Pipeline Status ───┐                               │
│ │ Academic Year: [Academic Year]                        │
│ │ Total Enrolled: [Total Enrolled] students             │
│ │ Enrollment Target: [Enrollment Target] students       │
│ │ Remaining Capacity: [Remaining Capacity] students     │
│ │ Pipeline Efficiency: [Pipeline Efficiency]% completion rate │
│ └────────────────────────────────────────────────────┘ │
│                                                          │
│ ┌─── Stage 1: New Registrations (From Bursar) ───┐      │
│ │ Students Awaiting Interview: [Students Awaiting Interview] │
│ │ Registered Today: [Registered Today]                    │
│ │ This Week: [Registered This Week]                       │
│ │ [View New Students] [Schedule Interviews]             │
│ └────────────────────────────────────────────────────┘ │
│                                                          │
│ ┌─── Stage 2: Interview Process ───┐                     │
│ │ Interviews Pending: [Interviews Pending]              │
│ │ Completed This Week: [Completed This Week]            │
│ │ Average Interview Score: [Average Interview Score]/20 │
│ │ Pass Rate: [Pass Rate]%                               │
│ │ [Conduct Interviews] [Review Scores]                  │
│ └────────────────────────────────────────────────────┘ │
│                                                          │
│ ┌─── Stage 3: Subclass Assignment ───┐                   │
│ │ Ready for Assignment: [Ready for Assignment] students │
│ │ Assigned This Week: [Assigned This Week]              │
│ │ Successful Placements: [Successful Placements]%       │
│ │ [Assign Students] [View Capacity]                     │
│ └────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────┘
```

## New Student Registrations (`/vice-principal/enrollment/new-students`)

### **API Integration**

#### **1. Get Students Awaiting Interview**
**Endpoint:** `GET /api/v1/vice-principal/interviews`
- **Headers:** `Authorization: Bearer <token>`
- **Query Parameters:**
  ```typescript
  {
    academicYearId?: number;
    status?: "PENDING" | "COMPLETED" | "OVERDUE"; // Filter by PENDING or OVERDUE
    page?: number;
    limit?: number;
    search?: string;
  }
  ```
- **Response (200):**
  ```typescript
  {
    success: true;
    data: Array<{
      id: number;
      studentId: number;
      studentName: string;
      studentMatricule: string;
      className: string;
      interviewStatus: "PENDING" | "COMPLETED" | "OVERDUE";
      scheduledDate?: string;
      completedDate?: string;
      score?: number;
      comments?: string;
      interviewerName?: string;
      daysOverdue?: number;
      registrationDate: string;
    }>;
    count: number;
  }
  ```

#### **2. Bulk Schedule Interviews**
**Endpoint:** `POST /api/v1/vice-principal/bulk-schedule-interviews`
- **Headers:** `Authorization: Bearer <token>`
- **Request Body:**
  ```typescript
  {
    studentIds: number[];
    scheduledDate: string; // "YYYY-MM-DD"
    academicYearId?: number;
  }
  ```
- **Response (201):**
  ```typescript
  {
    success: true;
    message: string; // e.g., "Successfully scheduled X interviews"
    data: {
      scheduled: number;
      errors: Array<{
        studentId: number;
        error: string;
      }>;
    };
  }
  ```

#### **3. Record Interview Mark**
**Endpoint:** `POST /api/v1/enrollment/interview`
- **Headers:** `Authorization: Bearer <token>`
- **Request Body:**
  ```typescript
  {
    studentId: number;
    score: number;             // Interview score
    comments?: string;
    academicYearId?: number;
  }
  ```
- **Response (201):**
  ```typescript
  {
    success: true;
    message: "Interview mark recorded successfully. Student ready for subclass assignment.";
    data: {
      id: number;
      studentId: number;
      interviewerId: number;
      score: number;
      comments?: string;
      academicYearId: number;
      interviewDate: string;
    };
  }
  ```

### **New Students Awaiting Interview**
```
┌─── Students Awaiting Interview ───┐
│ [Schedule Batch Interviews] [Export List] [Filter] [Search] │
│                                                             │
│ ┌─── Filters ───┐                                          │
│ │ Class: [All ▼] | Registration Date: [Last 7 days ▼]     │
│ │ Status: [All ▼] | Age Range: [All ▼]                    │
│ │ [Apply] [Clear] [Reset]                                 │
│ └───────────────────────────────────────────────────────┘ │
│                                                             │
│ Student Name    Class   Age  Registration  Former School    │
│ John Doe        Form 1  13   Jan 20, 2024  St. Mary's     │
│ Mary Smith      Form 3  15   Jan 19, 2024  Public School  │
│ Peter Johnson   Form 2  14   Jan 18, 2024  Home School    │
│ Sarah Williams  Form 1  13   Jan 18, 2024  New Student    │
│ Michael Brown   Form 4  16   Jan 17, 2024  Transfer       │
│                                                             │
│ [View: 12 students] [Select All] [Bulk Actions ▼]          │
│                                                             │
│ ┌─── Quick Actions ───┐                                     │
│ │ Selected: 0 students                                     │
│ │ [Schedule Interview] [Send Parent Notice]                │
│ │ [Generate Interview Cards] [Batch Process]               │
│ └───────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────┘
```

### **Individual Student Profile** (`/vice-principal/students/:studentId`)

#### **API Integration**
**Get Student Profile:** `GET /api/v1/vice-principal/students/:studentId`
- **Headers:** `Authorization: Bearer <token>`
- **Path Parameters:** `studentId` (number): Student ID
- **Query Parameters:**
  ```typescript
  {
    academicYearId?: number; // Optional, defaults to current year
  }
  ```
- **Response:**
  ```typescript
  {
    success: true;
    data: {
      studentId: number;
      studentName: string;
      matricule: string;
      dateOfBirth: string;
      placeOfBirth: string;
      gender: "MALE" | "FEMALE";
      residence: string;
      formerSchool?: string;
      status: "NOT_ENROLLED" | "AWAITING_INTERVIEW" | "INTERVIEW_COMPLETED" | "ASSIGNED_TO_CLASS";
      registrationDate: string;
      targetClass: {
        id: number;
        name: string;
      };
      parentInfo: {
        id: number;
        name: string;
        phone: string;
        email?: string;
        whatsappNumber?: string;
        address: string;
        relationship: string;
      };
      enrollmentJourney: Array<{
        stage: "REGISTERED" | "INTERVIEWED" | "ASSIGNED" | "ENROLLED";
        date: string;
        details: string;
        completedBy?: string;
      }>;
      interviewDetails?: {
        id: number;
        scheduledDate?: string;
        completedDate?: string;
        totalScore?: number;
        maxScore: number;
        status: "PENDING" | "COMPLETED" | "PASSED" | "FAILED";
        comments?: string;
        recommendedSubclass?: {
          id: number;
          name: string;
          className: string;
        };
        interviewerName?: string;
      };
      assignmentDetails?: {
        subClassId?: number;
        subClassName?: string;
        className?: string;
        classMaster?: string;
        assignedDate?: string;
        assignedBy?: string;
      };
      currentStatus: string;
      nextAction: string;
      daysInCurrentStage: number;
      alerts: Array<string>;
    };
  }
  ```

## Interview Management (`/vice-principal/interviews`)

### **API Integration**

#### **1. Get Interview Schedule**
**Endpoint:** `GET /api/v1/vice-principal/interviews/schedule`
- **Query Parameters:**
  ```typescript
  {
    date?: string;              // "YYYY-MM-DD", defaults to today
    status?: "SCHEDULED" | "COMPLETED" | "CANCELLED";
    academicYearId?: number;
  }
  ```
- **Response Data:**
  ```typescript
  {
    success: true;
    data: Array<{
      id: number;
      student: {
        id: number;
        name: string;
        matricule: string;
        targetClass: string;
      };
      interviewDate: string;
      interviewTime: string;
      status: "SCHEDULED" | "COMPLETED" | "CANCELLED";
      result?: {
        totalScore: number;
        maxScore: number;
        status: "PASSED" | "FAILED";
        comments?: string;
        recommendedSubclass?: string;
      };
      scheduledBy: {
        id: number;
        name: string;
      };
    }>;
  }
  ```

#### **2. Conduct Interview**
**Endpoint:** `POST /api/v1/vice-principal/interviews/:interviewId/conduct`
- **Request Body:**
  ```typescript
  {
    scores: {
      academicKnowledge: {
        mathematics: number;     // 0-2
        english: number;         // 0-2
        science: number;         // 0-2
        generalKnowledge: number; // 0-2
      };
      communicationSkills: {
        oralExpression: number;  // 0-3
        comprehension: number;   // 0-3
      };
      behaviorAssessment: {
        attitude: number;        // 0-3
        motivation: number;      // 0-3
      };
    };
    comments: string;
    recommendation: {
      status: "PASSED" | "FAILED";
      recommendedSubclass?: number; // Subclass ID if passed
      notes?: string;
    };
  }
  ```
- **Response:**
  ```typescript
  {
    success: true;
    data: {
      interviewId: number;
      totalScore: number;
      maxScore: number;
      percentage: number;
      status: "PASSED" | "FAILED";
      recommendedSubclass?: {
        id: number;
        name: string;
        className: string;
      };
      nextStep: "ASSIGN_TO_SUBCLASS" | "SCHEDULE_REINTERVIEW" | "NOTIFY_PARENT";
    };
  }
  ```

#### **3. Get Interview Results**
**Endpoint:** `GET /api/v1/vice-principal/interviews/results`
- **Headers:** `Authorization: Bearer <token>`
- **Query Parameters:**
  ```typescript
  {
    dateRange?: {
      from: string;           // "YYYY-MM-DD"
      to: string;             // "YYYY-MM-DD"
    };
    status?: "PASSED" | "FAILED";
    classId?: number;
    academicYearId?: number;
    page?: number;
    limit?: number;
  }
  ```
- **Response:**
  ```typescript
  {
    success: true;
    data: Array<{
      id: number;
      studentId: number;
      studentName: string;
      studentMatricule: string;
      targetClassName: string;
      interviewDate: string;
      interviewTime: string;
      totalScore: number;
      maxScore: number;
      percentage: number;
      status: "PASSED" | "FAILED";
      scoreBreakdown: {
        academicKnowledge: {
          mathematics: number;
          english: number;
          science: number;
          generalKnowledge: number;
        };
        communicationSkills: {
          oralExpression: number;
          comprehension: number;
        };
        behaviorAssessment: {
          attitude: number;
          motivation: number;
        };
      };
      recommendedSubclass?: {
        id: number;
        name: string;
        className: string;
      };
      comments: string;
      interviewerName: string;
      nextAction: "ASSIGN_TO_SUBCLASS" | "SCHEDULE_REINTERVIEW" | "NOTIFY_PARENT";
    }>;
    meta: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
    summary: {
      totalInterviews: number;
      passedCount: number;
      failedCount: number;
      passRate: number;
      averageScore: number;
    };
  }
  ```

### **Interview Dashboard**
```
┌─── Student Interview Management ───┐
│ [Conduct Interview] [Interview History] [Score Analysis] │
│                                                          │
│ ┌─── Today's Interview Schedule ───┐                     │
│ │ Date: January 22, 2024                               │
│ │ Scheduled Interviews: 5                              │
│ │ Completed: 2 | Remaining: 3                         │
│ │ Next Interview: 10:30 AM - Mary Smith               │
│ │ [View Schedule] [Reschedule] [Add Interview]         │
│ └────────────────────────────────────────────────────┘ │
│                                                          │
│ ┌─── Pending Interviews ───┐                            │
│ │ Time     Student         Class    Status     Action   │
│ │ 10:30 AM Mary Smith      Form 3   Scheduled  [Start] │
│ │ 11:00 AM Peter Johnson   Form 2   Scheduled  [Start] │
│ │ 11:30 AM Sarah Williams  Form 1   Scheduled  [Start] │
│ │ 2:00 PM  Michael Brown   Form 4   Scheduled  [Start] │
│ │ 2:30 PM  Lisa Davis      Form 1   Scheduled  [Start] │
│ └────────────────────────────────────────────────────┘ │
│                                                          │
│ ┌─── Recent Interview Results ───┐                       │
│ │ Student: John Doe | Score: 16/20 | Status: Passed    │
│ │ Comments: Excellent communication, good academic base │
│ │ Recommended: Form 1A (Science Stream)                │
│ │ [View Details] [Assign to Subclass]                  │
│ │ ─────────────────────────────────────────────────    │
│ │ Student: Alice Johnson | Score: 12/20 | Status: Passed│
│ │ Comments: Average performance, needs support         │
│ │ Recommended: Form 1B (General Stream)               │
│ │ [View Details] [Assign to Subclass]                  │
│ └────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────┘
```

### **Conduct Interview** (`/vice-principal/interviews/:studentId/conduct`)
```
┌─── Conduct Interview - Mary Smith ───┐
│ Student: Mary Smith (STU2024002)       │
│ Target Class: Form 3                   │
│ Interview Date: January 22, 2024       │
│ Interview Time: 10:30 AM               │
│                                        │
│ ┌─── Interview Assessment ───┐          │
│ │ ┌─ Academic Knowledge (8 points) ─┐   │
│ │ │ Mathematics: [__]/2              │   │
│ │ │ English: [__]/2                  │   │
│ │ │ Science: [__]/2                  │   │
│ │ │ General Knowledge: [__]/2        │   │
│ │ └─────────────────────────────────┘   │
│ │                                      │
│ │ ┌─ Communication Skills (6 points) ─┐ │
│ │ │ Oral Expression: [__]/3           │ │
│ │ │ Comprehension: [__]/3             │ │
│ │ └─────────────────────────────────┘ │
│ │                                      │
│ │ ┌─ Behavioral Assessment (6 points)─┐ │
│ │ │ Confidence: [__]/2                │ │
│ │ │ Respect: [__]/2                   │ │
│ │ │ Motivation: [__]/2                │ │
│ │ └─────────────────────────────────┘ │
│ │                                      │
│ │ Total Score: [__]/20                │
│ │ Pass Mark: 10/20                    │
│ └────────────────────────────────────┘ │
│                                        │
│ ┌─── Interview Notes ───┐               │
│ │ Comments & Observations:              │
│ │ [Text Area]                          │
│ │                                      │
│ │ Recommendation:                      │
│ │ [○ Form 3A] [○ Form 3B] [○ Form 3C]  │
│ │ [○ Refer for Special Support]        │
│ └────────────────────────────────────┘ │
│                                        │
│ [Record Interview] [Save Draft] [Cancel]│
└──────────────────────────────────────────┘
```

### **Interview Results Summary**
```
┌─── Interview Completed Successfully ───┐
│ ✅ Interview Recorded                   │
│                                        │
│ Student: Mary Smith                     │
│ Final Score: 14/20                      │
│ Result: PASSED ✅                       │
│                                        │
│ Breakdown:                             │
│ • Academic Knowledge: 6/8              │
│ • Communication Skills: 4/6            │
│ • Behavioral Assessment: 4/6           │
│                                        │
│ Recommendation: Form 3B                │
│ Comments: Good potential, needs support│
│                                        │
│ ┌─── Next Steps ───┐                   │
│ │ [Assign to Subclass]                 │
│ │ [Schedule Parent Meeting]            │
│ │ [Send Results to Bursar]             │
│ │ [Interview Next Student]             │
│ └──────────────────────────────────────┘
│                                        │
│ [Close] [Print Certificate]            │
└──────────────────────────────────────────┘
```

## Subclass Assignment (`/vice-principal/enrollment/assignment`)

### **Subclass Assignment Page**
```
┌─────────────────────────────────────────────────────────┐
│ Subclass Assignment                   [🔄 Refresh List] │
├─────────────────────────────────────────────────────────┤
│ [Filter: Class] [Search: Student Name/Matricule]        │
│                                                         │
│ ┌─── Students Ready for Assignment ───┐                │
│ │ 👤 [Student Name 1] ([Matricule 1]) - Class: [Class 1 Name] │
│ │    Interview Score: [Score 1]/20 | Interview Date: [Date 1] │
│ │    [Assign to Subclass]                               │
│ │ ─────────────────────────────────────              │
│ │ 👤 [Student Name 2] ([Matricule 2]) - Class: [Class 2 Name] │
│ │    Interview Score: [Score 2]/20 | Interview Date: [Date 2] │
│ │    [Assign to Subclass]                               │
│ │ [Load More Students]                                  │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ┌─── Subclass Capacity Overview ───┐                   │
│ │ 🏫 [Class Name A]                                   │
│ │    [Subclass A1] (Current: [Current A1]/[Max A1]) [Available: [Available A1]] │
│ │    [Subclass A2] (Current: [Current A2]/[Max A2]) [Available: [Available A2]] │
│ │ [View Full Class Capacity]                            │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### **API Integration:**

#### **1. Get Unassigned Students (Ready for Subclass Assignment)**
**Endpoint:** `GET /api/v1/enrollment/unassigned`
- **Headers:** `Authorization: Bearer <token>`
- **Query Parameters:**
  ```typescript
  {
    academicYearId?: number; // Optional, defaults to current year
    classId?: number;        // Filter by target class
    search?: string;         // Search by name or matricule
    page?: number;
    limit?: number;
  }
  ```
- **Response (200):**
  ```typescript
  {
    success: true;
    data: Array<{
      id: number;
      name: string;
      matricule: string;
      dateOfBirth: string;
      className: string;
      interviewStatus: "PENDING" | "COMPLETED";
      interviewScore?: number;
      registrationDate: string;
    }>;
    count: number;
  }
  ```

#### **2. Get Available Subclasses for Assignment**
**Endpoint:** `GET /api/v1/enrollment/available-subclasses/:classId`
- **Headers:** `Authorization: Bearer <token>`
- **Path Parameters:** `classId` (number): ID of the class to get available subclasses for.
- **Query Parameters:**
  ```typescript
  {
    academicYearId?: number; // Optional, defaults to current year
  }
  ```
- **Response (200):**
  ```typescript
  {
    success: true;
    message: "Available subclasses retrieved successfully";
    data: Array<{
      id: number;
      name: string;
      capacity: number;
      currentEnrollment: number;
      availableSpots: number;
      classId: number;
      className: string;
    }>;
  }
  ```

#### **3. Assign Student to Subclass**
**Endpoint:** `POST /api/v1/enrollment/assign-subclass`
- **Headers:** `Authorization: Bearer <token>`
- **Request Body:**
  ```typescript
  {
    studentId: number;
    subClassId: number;
    academicYearId?: number; // Optional, defaults to current year
  }
  ```
- **Response (200):**
  ```typescript
  {
    success: true;
    message: "Student successfully assigned to subclass. Enrollment complete.";
    data: {
      enrollment: {
        id: number;
        studentId: number;
        classId: number;
        subClassId: number;
        academicYearId: number;
        status: "ASSIGNED_TO_CLASS";
      };
    };
  }
  ```

#### **4. Get Subclass Optimization (Capacity Analysis)**
**Endpoint:** `GET /api/v1/vice-principal/subclass-optimization`
- **Headers:** `Authorization: Bearer <token>`
- **Response (200):**
  ```typescript
  {
    success: true;
    data: Array<{
      classId: number;
      className: string;
      subclasses: Array<{
        id: number;
        name: string;
        currentEnrollment: number;
        maxCapacity: number;
        utilizationRate: number;
        availableSpots: number;
        status: "OPTIMAL" | "UNDERUTILIZED" | "OVERLOADED" | "FULL";
        recommendations: Array<string>;
      }>;
      overallUtilization: number;
      recommendations: Array<{
        type: "BALANCE_ENROLLMENT" | "CREATE_SUBCLASS" | "MERGE_SUBCLASS";
        description: string;
        priority: "HIGH" | "MEDIUM" | "LOW";
      }>;
    }>;
  }
  ```

## Class Management (`/vice-principal/classes`)

### **API Integration**

#### **1. Get All Classes and Subclasses**
**Endpoint:** `GET /api/v1/vice-principal/classes`
- **Headers:** `Authorization: Bearer <token>`
- **Query Parameters:**
  ```typescript
  {
    academicYearId?: number;
    includeCapacity?: boolean;    // Include enrollment counts
    classId?: number;             // Filter specific class
  }
  ```
- **Response:**
  ```typescript
  {
    success: true;
    data: Array<{
      id: number;
      name: string;             // "Form 1", "Form 2", etc.
      maxStudents: number;      // Maximum students per class
      baseFee: number;
      totalSubclasses: number;
      totalEnrollment: number;
      capacityUtilization: number; // Percentage
      subclasses: Array<{
        id: number;
        name: string;           // "Form 1A", "Form 1B", etc.
        currentStudents: number;
        maxCapacity: number;    // Usually 30 per subclass
        availableSpots: number;
        utilizationRate: number; // Percentage
        classMaster?: {
          id: number;
          name: string;
          email: string;
        };
        academicFocus?: string; // "Science", "Arts", "General"
        status: "OPTIMAL" | "UNDERUTILIZED" | "OVERLOADED" | "FULL";
        enrolledStudents?: Array<{
          id: number;
          name: string;
          matricule: string;
          enrollmentDate: string;
        }>;
      }>;
      averageClassSize: number;
      recommendedActions: Array<{
        type: "BALANCE_ENROLLMENT" | "CREATE_SUBCLASS" | "MERGE_SUBCLASS";
        description: string;
        priority: "HIGH" | "MEDIUM" | "LOW";
      }>;
    }>;
    summary: {
      totalClasses: number;
      totalSubclasses: number;
      totalStudents: number;
      totalCapacity: number;
      overallUtilization: number;
      availableSpots: number;
      classesNeedingAttention: number;
    };
  }
  ```

#### **2. Transfer Student**
**Endpoint:** `POST /api/v1/vice-principal/students/transfer`
- **Request Body:**
  ```typescript
  {
    studentId: number;
    fromSubclassId: number;
    toSubclassId: number;
    reason: string;
    notes?: string;
    effectiveDate?: string;       // "YYYY-MM-DD"
  }
  ```

#### **3. Create New Subclass**
**Endpoint:** `POST /api/v1/subclasses`
- **Request Body:**
  ```typescript
  {
    name: string;                 // "Form 1D"
    classId: number;
    capacity: number;
    classMasterId?: number;
    academicFocus?: string;       // "Science", "Arts", "General"
    description?: string;
  }
  ```

### **Class Management Dashboard**
```
┌─── Class & Subclass Management ───┐
│ [Capacity Overview] [Student Transfers] [Create Subclass] │
│                                                           │
│ ┌─── Class Distribution Summary ───┐                      │
│ │ Academic Year: 2024-2025                               │
│ │ Total Classes: 5 | Total Subclasses: 48               │
│ │ Total Students: 1,245 | Average per Subclass: 26      │
│ │ Capacity Utilization: 85% | Available Spots: 187      │
│ └─────────────────────────────────────────────────────┘ │
│                                                           │
│ Class    Subclasses  Students  Capacity  Utilization     │
│ Form 1   10          301       330       91%             │
│ Form 2   10          289       330       88%             │
│ Form 3   10          267       330       81%             │
│ Form 4   9           245       297       82%             │
│ Form 5   9           243       297       82%             │
│                                                           │
│ ┌─── Subclass Details - Form 1 ───┐                      │
│ │ Subclass  Students  Capacity  Master      Focus   Action│
│ │ Form 1A   30        30        Mr. Johnson  Science [Edit]│
│ │ Form 1B   30        30        Mrs. Smith   General [Edit]│
│ │ Form 1C   28        30        Mr. Brown    Arts    [Edit]│
│ │ Form 1D   25        30        Mrs. Davis   General [Edit]│
│ │ [View All] [Add Subclass] [Rebalance]                  │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## Reports & Analytics (`/vice-principal/reports`)

### **API Integration**

#### **1. Generate Enrollment Report**
**Endpoint:** `GET /api/v1/vice-principal/reports/enrollment`
- **Headers:** `Authorization: Bearer <token>`
- **Query Parameters:**
  ```typescript
  {
    reportType: "PIPELINE" | "CAPACITY" | "INTERVIEW_ANALYSIS" | "ASSIGNMENT_SUMMARY";
    dateRange?: {
      from: string;             // "YYYY-MM-DD"
      to: string;               // "YYYY-MM-DD"
    };
    academicYearId?: number;
    format?: "json" | "excel" | "pdf";
    classId?: number;           // Filter by specific class
  }
  ```
- **Response:**
  ```typescript
  {
    success: true;
    data: {
      reportInfo: {
        type: "PIPELINE" | "CAPACITY" | "INTERVIEW_ANALYSIS" | "ASSIGNMENT_SUMMARY";
        generatedAt: string;
        generatedBy: string;
        academicYear: string;
        dateRange: {
          from: string;
          to: string;
        };
        filters: {
          classId?: number;
        };
      };
      executiveSummary: {
        totalStudentsProcessed: number;
        enrollmentTarget: number;
        completionRate: number;
        averageProcessingTime: number; // days
        currentPipelineEfficiency: number; // percentage
      };
      detailedMetrics: {
        pipeline?: {
          newRegistrations: number;
          interviewsPending: number;
          interviewsCompleted: number;
          studentsAssigned: number;
          studentsEnrolled: number;
        };
        capacity?: {
          totalClasses: number;
          totalSubclasses: number;
          currentCapacity: number;
          availableSpots: number;
          utilizationRate: number;
        };
        interviewAnalysis?: {
          totalInterviews: number;
          passRate: number;
          averageScore: number;
          scoreDistribution: {
            excellent: number; // 18-20
            good: number;      // 15-17
            average: number;   // 10-14
            below: number;     // <10
          };
        };
        assignmentSummary?: {
          studentsAssigned: number;
          averageAssignmentTime: number;
          subclassDistribution: Array<{
            subclassName: string;
            studentsAssigned: number;
            utilizationRate: number;
          }>;
        };
      };
      trends: Array<{
        period: string;
        metric: string;
        value: number;
        trend: "INCREASING" | "DECREASING" | "STABLE";
      }>;
      recommendations: Array<{
        priority: "HIGH" | "MEDIUM" | "LOW";
        category: string;
        recommendation: string;
        impact: string;
        timeline: string;
      }>;
      downloadUrl?: string; // If format is "excel" or "pdf"
    };
  }
  ```

#### **2. Get Interview Statistics**
**Endpoint:** `GET /api/v1/vice-principal/analytics/interviews`
- **Headers:** `Authorization: Bearer <token>`
- **Query Parameters:**
  ```typescript
  {
    academicYearId?: number;
    dateRange?: {
      from: string;             // "YYYY-MM-DD"
      to: string;               // "YYYY-MM-DD"
    };
    classId?: number;           // Filter by target class
  }
  ```
- **Response:**
  ```typescript
  {
    success: true;
    data: {
      summary: {
        totalInterviews: number;
        completedInterviews: number;
        pendingInterviews: number;
        passRate: number;        // Percentage
        failRate: number;        // Percentage
        averageScore: number;
        averageInterviewTime: number; // minutes
      };
      scoreAnalysis: {
        distribution: {
          excellent: number;     // 18-20 points
          good: number;          // 15-17 points
          average: number;       // 10-14 points
          below: number;         // <10 points
        };
        byCategory: {
          academicKnowledge: {
            average: number;
            passRate: number;
          };
          communicationSkills: {
            average: number;
            passRate: number;
          };
          behaviorAssessment: {
            average: number;
            passRate: number;
          };
        };
        topPerformers: Array<{
          studentName: string;
          score: number;
          targetClass: string;
          recommendedSubclass: string;
        }>;
      };
      timeAnalysis: {
        averageInterviewDuration: number; // minutes
        peakInterviewTimes: Array<{
          timeSlot: string;      // "09:00-10:00"
          interviewCount: number;
          averageScore: number;
        }>;
        interviewBacklog: {
          currentBacklog: number;
          averageWaitTime: number; // days
          projectedClearanceDate: string;
        };
      };
      trends: {
        monthly: Array<{
          month: string;
          totalInterviews: number;
          passRate: number;
          averageScore: number;
        }>;
        weekly: Array<{
          week: string;
          interviewsCompleted: number;
          efficiency: number;    // percentage
        }>;
      };
      classBreakdown: Array<{
        classId: number;
        className: string;
        totalInterviews: number;
        passRate: number;
        averageScore: number;
        studentsAssigned: number;
      }>;
      recommendations: Array<{
        area: string;            // "INTERVIEW_PROCESS" | "SCORING_CRITERIA" | "TIME_MANAGEMENT"
        recommendation: string;
        priority: "HIGH" | "MEDIUM" | "LOW";
        expectedImpact: string;
      }>;
    };
  }
  ```

### **Reports Dashboard**
```
┌─── VP Reports & Analytics ───┐
│ [Enrollment Reports] [Interview Analysis] [Capacity Planning] │
│                                                              │
│ ┌─── Quick Report Generation ───┐                            │
│ │ Report Type: [Enrollment Pipeline ▼]                      │
│ │ Date Range: [Last 30 days ▼]                              │
│ │ Academic Year: [2024-2025 ▼]                              │
│ │ Format: [PDF ●] [Excel ○] [Summary ○]                     │
│ │ [Generate Report] [Schedule Auto-Report]                  │
│ └────────────────────────────────────────────────────────┘ │
│                                                              │
│ ┌─── Key Metrics ───┐                                        │
│ │ Pipeline Efficiency: 98% (Target: 95%)                    │
│ │ Interview Pass Rate: 94% (Industry: 85%)                  │
│ │ Capacity Utilization: 85% (Optimal: 80-90%)               │
│ │ Average Assignment Time: 2.5 days                         │
│ └────────────────────────────────────────────────────────┘ │
│                                                              │
│ ┌─── Recent Reports ───┐                                     │
│ │ 📄 Monthly Enrollment Report - Jan 2024    [Download]     │
│ │ 📄 Interview Analysis - Q1 2024            [Download]     │
│ │ 📄 Capacity Planning Report - Jan 2024     [Download]     │
│ │ 📄 Student Assignment Summary - Week 3      [Download]     │
│ └────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
```

## Error Handling & Loading States

### **API Error Handling**
```typescript
// Standard error response format
{
  success: false;
  error: string; // User-friendly error message
}

// VP-specific error scenarios:
// 400: "Invalid interview score" | "Student already assigned"
// 403: "Interview already completed" | "Cannot modify assignment"
// 404: "Student not found" | "Subclass not found"
// 409: "Subclass at capacity" | "Interview time conflict"
// 500: "Assignment failed" | "Interview save failed"
```

### **Loading & Validation States**
- Interview score validation (0-20 scale)
- Subclass capacity checking before assignment
- Real-time capacity updates
- Interview time conflict detection
- Auto-save interview progress

### **Success Feedback**
- Interview completion confirmations
- Assignment success notifications
- Bulk operation progress indicators
- Parent notification status
- Pipeline status updates

**Frontend Implementation Notes:**
1. Implement interview scoring with real-time calculation
2. Add capacity warnings before assignments
3. Use optimistic updates for assignments
4. Cache subclass capacity data with periodic refresh
5. Implement proper interview session management
6. Add bulk operation progress tracking
7. Use proper form validation for interview scores
8. Implement conflict detection for interview scheduling
9. Add auto-save for interview drafts
10. Use efficient pagination for large student lists

## Student Progress Tracking (`/vice-principal/student/:studentId/progress`)

### **Student Progress Profile Page**
```
┌─────────────────────────────────────────────────────────┐
│ Student Progress: [Student Name] ([Matricule])        │
├─────────────────────────────────────────────────────────┤
│ [Filter: Academic Year]                                 │
│                                                         │
│ ┌─── Enrollment Journey ───┐                            │
│ │ 1️⃣ Registered: [Registration Date] (by [Registered By]) │
│ │ 2️⃣ Interviewed: [Interview Date] (Score: [Interview Score]) │
│ │ 3️⃣ Assigned: [Assignment Date] (to [Subclass Name]) │
│ │ 4️⃣ Enrolled: [Enrollment Date] (Status: [Current Status]) │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ┌─── Alerts & Next Actions ───┐                         │
│ │ Current Status: [Current Status]                      │
│ │ Days in Current Stage: [Days In Current Stage] days   │
│ │ Next Action: [Next Action]                            │
│ │ Alerts: [Alert 1], [Alert 2]                          │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### **API Integration:**

#### **1. Get Student Progress Tracking**
**Endpoint:** `GET /api/v1/vice-principal/student-progress/:studentId`
- **Headers:** `Authorization: Bearer <token>`
- **Path Parameters:** `studentId` (number): Student ID
- **Response (200):**
  ```typescript
  {
    success: true;
    data: {
      studentId: number;
      studentName: string;
      matricule: string;
      enrollmentJourney: Array<{
        stage: "REGISTERED" | "INTERVIEWED" | "ASSIGNED" | "ENROLLED";
        date: string;
        details: string;
        completedBy?: string;
      }>;
      currentStatus: string;
      nextAction: string;
      daysInCurrentStage: number;
      alerts: Array<string>;
    };
  }
  ```

## Enrollment Analytics & Quick Stats (`/vice-principal/analytics`)

### **Enrollment Analytics Page**
```
┌─────────────────────────────────────────────────────────┐
│ Enrollment Analytics                  [📊 View Trends] │
├─────────────────────────────────────────────────────────┤
│ [Filter: Academic Year] [Filter: Timeframe]             │
│                                                         │
│ ┌─── Enrollment Trends ───┐                            │
│ │ [Chart showing daily/weekly/monthly registrations]    │
│ │ Daily Registrations: [Daily Registrations]            │
│ │ Completed Payments: [Completed Payments]              │
│ │ Pending Count: [Pending Count]                        │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ┌─── Gender & Age Distribution ───┐                    │
│ │ Male: [Male Count] | Female: [Female Count]          │
│ │ Age Range [Age Range 1]: [Count 1]                    │
│ │ Age Range [Age Range 2]: [Count 2]                    │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ┌─── Class Distribution & Capacity ───┐                 │
│ │ [Class 1 Name]: [Registered Students 1] / [Capacity 1] (Waiting: [Waiting List 1]) │
│ │ [Class 2 Name]: [Registered Students 2] / [Capacity 2] (Waiting: [Waiting List 2]) │
│ │ [View Full Class Capacity Analysis]                   │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### **Students Requiring Attention Page**
```
┌─────────────────────────────────────────────────────────┐
│ Students Requiring Attention        [🔄 Refresh List] │
├─────────────────────────────────────────────────────────┤
│ [Filter: Risk Level] [Filter: Category]                 │
│                                                         │
│ ┌─── Overview ───┐                                      │
│ │ Total Requiring Attention: [Total Requiring Attention] │
│ │ Pending Interviews: [Pending Interviews Count]        │
│ │ Overdue Interviews: [Overdue Interviews Count]        │
│ │ Awaiting Assignment: [Awaiting Assignment Count]      │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ┌─── Students List (Prioritized) ───┐                  │
│ │ 🚨 [Student Name 1] ([Class 1 Name]): [Reason 1]     │
│ │    Action: [Recommended Action 1] | Urgency: [Urgency 1] │
│ │ ⚠️ [Student Name 2] ([Class 2 Name]): [Reason 2]     │
│ │    Action: [Recommended Action 2] | Urgency: [Urgency 2] │
│ │ [View All Students Requiring Attention]               │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### **API Integration:**

#### **1. Get Enrollment Analytics**
**Endpoint:** `GET /api/v1/vice-principal/enrollment-analytics`
- **Headers:** `Authorization: Bearer <token>`
- **Response (200):**
  ```typescript
  {
    success: true;
    data: {
      enrollmentTrends: Array<{
        date: string;
        count: number;
      }>;
      genderDistribution: Array<{
        gender: "MALE" | "FEMALE";
        count: number;
      }>;
      ageDistribution: Array<{
        ageRange: string;
        count: number;
      }>;
      classDistribution: Array<{
        classId: number;
        enrollmentCount: number;
        lastEnrollment: string;
      }>;
    };
  }
  ```

#### **2. Get Students Requiring Attention**
**Endpoint:** `GET /api/v1/vice-principal/students-requiring-attention`
- **Headers:** `Authorization: Bearer <token>`
- **Response (200):**
  ```typescript
  {
    success: true;
    data: {
      pendingInterviews: {
        count: number;
        students: Array<object>; // Limited to 10
      };
      overdueInterviews: {
        count: number;
        students: Array<object>;
      };
      awaitingAssignment: {
        count: number;
        students: Array<object>;
      };
      totalRequiringAttention: number;
    };
  }
  ```

#### **3. Get Class Capacity Analysis**
**Endpoint:** `GET /api/v1/vice-principal/class-capacity-analysis`
- **Headers:** `Authorization: Bearer <token>`
- **Response (200):**
  ```typescript
  {
    success: true;
    data: Array<{
      classId: number;
      className: string;
      subclasses: Array<{
        id: number;
        name: string;
        currentEnrollment: number;
        maxCapacity: number;
        utilizationRate: number;
        availableSpots: number;
        status: "OPTIMAL" | "UNDERUTILIZED" | "OVERLOADED" | "FULL";
        recommendations: Array<string>;
      }>;
      overallUtilization: number;
      recommendations: Array<{
        type: "BALANCE_ENROLLMENT" | "CREATE_SUBCLASS" | "MERGE_SUBCLASS";
        description: string;
        priority: "HIGH" | "MEDIUM" | "LOW";
      }>;
    }>;
  }
  ```

#### **4. Get Quick Statistics**
**Endpoint:** `GET /api/v1/vice-principal/quick-stats`
- **Headers:** `Authorization: Bearer <token>`
- **Response (200):**
  ```typescript
  {
    success: true;
    data: {
      totalStudents: number;
      studentsAssigned: number;
      pendingInterviews: number;
      awaitingAssignment: number;
      completionRate: number;
      interviewCompletionRate: number;
      urgentTasksCount: number;
      enrollmentTrend: "INCREASING" | "DECREASING" | "STABLE";
      averageInterviewScore: number;
    };
  }
  ```
