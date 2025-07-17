# School Management System - Complete API Documentation

## Table of Contents
1. [Authentication](#authentication)
2. [Attendance Management](#attendance-management)
3. [Audit Trail](#audit-trail)
4. [Communications](#communications)
5. [Enhanced Dashboard Analytics](#enhanced-dashboard-analytics)
6. [Class Profile Analytics](#class-profile-analytics)
7. [Teacher Attendance Analytics](#teacher-attendance-analytics)
8. [Student Averages](#student-averages)
9. [Mobile API](#mobile-api)
10. [File Management](#file-management)
11. [Notifications](#notifications)
12. [Period Management](#period-management)
13. [Parent Portal](#parent-portal)
14. [Quiz System](#quiz-system)
15. [Vice Principal (Student Management)](#vice-principal-student-management)
16. [Bursar (Financial Management)](#bursar-financial-management)
17. [Discipline Master/SDM](#discipline-mastersдm)
18. [Teacher Portal](#teacher-portal)
19. [HOD (Head of Department)](#hod-head-of-department)
20. [Timetable Management](#timetable-management)
21. [Academic Year Management](#academic-year-management)
22. [Student Management](#student-management)
23. [User Management](#user-management)
24. [Exam and Marks Management](#exam-and-marks-management)
25. [Class and Subject Management](#class-and-subject-management)
26. [Dashboard Endpoints](#dashboard-endpoints)
27. [Report Card Management](#report-card-management)
28. [Authorization Testing](#authorization-testing)

---

## Attendance Management

### Get Student Attendance
```http
GET /api/v1/attendance/students
```

**Authorization:** `SUPER_MANAGER`, `PRINCIPAL`, `VICE_PRINCIPAL`, `DISCIPLINE_MASTER`, `TEACHER`, `PARENT`

**Query Parameters:**
```typescript
{
  studentId?: number;
  subClassId?: number;
  date?: string; // "YYYY-MM-DD"
  startDate?: string; // "YYYY-MM-DD"
  endDate?: string; // "YYYY-MM-DD"
  page?: number;
  limit?: number;
}
```

**Response (Success - 200):**
```typescript
{
  success: true;
  data: {
    attendance: Array<{
      id: number;
      studentId: number;
      subClassId: number;
      date: string;
      status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";
      remarks?: string;
      recordedBy: number;
      createdAt: string;
      updatedAt: string;
      student: {
        id: number;
        name: string;
        matricule: string;
      };
      subClass: {
        id: number;
        name: string;
        classId: number;
        class: {
          id: number;
          name: string;
        };
      };
    }>;
    pagination: {
      currentPage: number;
      totalPages: number;
      totalItems: number;
      itemsPerPage: number;
    };
  };
}
```

### Record Student Attendance
```http
POST /api/v1/attendance/students
```

**Authorization:** `SUPER_MANAGER`, `PRINCIPAL`, `VICE_PRINCIPAL`, `DISCIPLINE_MASTER`, `TEACHER`

**Request Body:**
```typescript
{
  studentId: number;
  subClassId: number;
  date: string; // "YYYY-MM-DD"
  status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";
  remarks?: string;
}
```

**Response (Success - 201):**
```typescript
{
  success: true;
  data: {
    id: number;
    studentId: number;
    subClassId: number;
    date: string;
    status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";
    remarks?: string;
    recordedBy: number;
    createdAt: string;
    updatedAt: string;
  };
}
```

### Update Student Attendance
```http
PUT /api/v1/attendance/students/:id
```

**Authorization:** `SUPER_MANAGER`, `PRINCIPAL`, `VICE_PRINCIPAL`, `DISCIPLINE_MASTER`, `TEACHER`

**Request Body:**
```typescript
{
  status?: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";
  remarks?: string;
}
```

**Response (Success - 200):**
```typescript
{
  success: true;
  data: {
    id: number;
    studentId: number;
    subClassId: number;
    date: string;
    status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";
    remarks?: string;
    recordedBy: number;
    createdAt: string;
    updatedAt: string;
  };
}
```

### Get Student Attendance Summary
```http
GET /api/v1/attendance/students/summary
```

**Authorization:** `SUPER_MANAGER`, `PRINCIPAL`, `VICE_PRINCIPAL`, `DISCIPLINE_MASTER`, `TEACHER`, `PARENT`

**Query Parameters:**
```typescript
{
  studentId?: number;
  subClassId?: number;
  classId?: number;
  startDate?: string; // "YYYY-MM-DD"
  endDate?: string; // "YYYY-MM-DD"
}
```

**Response (Success - 200):**
```typescript
{
  success: true;
  data: {
    summary: {
      totalDays: number;
      presentDays: number;
      absentDays: number;
      lateDays: number;
      excusedDays: number;
      attendanceRate: number; // percentage
    };
    details?: Array<{
      studentId: number;
      studentName: string;
      matricule: string;
      totalDays: number;
      presentDays: number;
      absentDays: number;
      lateDays: number;
      excusedDays: number;
      attendanceRate: number;
    }>;
  };
}
```

### Get Teacher Attendance
```http
GET /api/v1/attendance/teachers
```

**Authorization:** `SUPER_MANAGER`, `PRINCIPAL`, `VICE_PRINCIPAL`

**Query Parameters:**
```typescript
{
  teacherId?: number;
  date?: string; // "YYYY-MM-DD"
  startDate?: string; // "YYYY-MM-DD"
  endDate?: string; // "YYYY-MM-DD"
  page?: number;
  limit?: number;
}
```

**Response (Success - 200):**
```typescript
{
  success: true;
  data: {
    attendance: Array<{
      id: number;
      teacherId: number;
      date: string;
      status: "PRESENT" | "ABSENT" | "LATE" | "ON_LEAVE";
      checkInTime?: string;
      checkOutTime?: string;
      remarks?: string;
      recordedBy: number;
      createdAt: string;
      updatedAt: string;
      teacher: {
        id: number;
        name: string;
        email: string;
        matricule: string;
      };
    }>;
    pagination: {
      currentPage: number;
      totalPages: number;
      totalItems: number;
      itemsPerPage: number;
    };
  };
}
```

### Record Teacher Attendance
```http
POST /api/v1/attendance/teachers
```

**Authorization:** `SUPER_MANAGER`, `PRINCIPAL`, `VICE_PRINCIPAL`

**Request Body:**
```typescript
{
  teacherId: number;
  date: string; // "YYYY-MM-DD"
  status: "PRESENT" | "ABSENT" | "LATE" | "ON_LEAVE";
  checkInTime?: string; // "HH:MM"
  checkOutTime?: string; // "HH:MM"
  remarks?: string;
}
```

**Response (Success - 201):**
```typescript
{
  success: true;
  data: {
    id: number;
    teacherId: number;
    date: string;
    status: "PRESENT" | "ABSENT" | "LATE" | "ON_LEAVE";
    checkInTime?: string;
    checkOutTime?: string;
    remarks?: string;
    recordedBy: number;
    createdAt: string;
    updatedAt: string;
  };
}
```

### Get Teacher Attendance Summary
```http
GET /api/v1/attendance/teachers/summary
```

**Authorization:** `SUPER_MANAGER`, `PRINCIPAL`, `VICE_PRINCIPAL`

**Query Parameters:**
```typescript
{
  teacherId?: number;
  startDate?: string; // "YYYY-MM-DD"
  endDate?: string; // "YYYY-MM-DD"
}
```

**Response (Success - 200):**
```typescript
{
  success: true;
  data: {
    summary: {
      totalDays: number;
      presentDays: number;
      absentDays: number;
      lateDays: number;
      onLeaveDays: number;
      attendanceRate: number; // percentage
    };
    details?: Array<{
      teacherId: number;
      teacherName: string;
      email: string;
      matricule: string;
      totalDays: number;
      presentDays: number;
      absentDays: number;
      lateDays: number;
      onLeaveDays: number;
      attendanceRate: number;
    }>;
  };
}
```

---

## Audit Trail

### Get Audit Logs
```http
GET /api/v1/audit/logs
```

**Authorization:** `SUPER_MANAGER`, `MANAGER`, `PRINCIPAL`

**Query Parameters:**
```typescript
{
  page?: number;
  limit?: number;
  entityType?: string;
  entityId?: number;
  userId?: number;
  action?: string;
  startDate?: string; // "YYYY-MM-DD"
  endDate?: string; // "YYYY-MM-DD"
}
```

**Response (Success - 200):**
```typescript
{
  success: true;
  data: {
    logs: Array<{
      id: number;
      entityType: string;
      entityId: number;
      action: string;
      oldValues?: Record<string, any>;
      newValues?: Record<string, any>;
      userId: number;
      userAgent?: string;
      ipAddress?: string;
      createdAt: string;
      user: {
        id: number;
        name: string;
        email: string;
        matricule: string;
      };
    }>;
    pagination: {
      currentPage: number;
      totalPages: number;
      totalItems: number;
      itemsPerPage: number;
    };
  };
}
```

### Get Audit Statistics
```http
GET /api/v1/audit/stats
```

**Authorization:** `SUPER_MANAGER`, `MANAGER`, `PRINCIPAL`

**Query Parameters:**
```typescript
{
  startDate?: string; // "YYYY-MM-DD"
  endDate?: string; // "YYYY-MM-DD"
  entityType?: string;
}
```

**Response (Success - 200):**
```typescript
{
  success: true;
  data: {
    totalLogs: number;
    logsByAction: Record<string, number>;
    logsByEntityType: Record<string, number>;
    logsByUser: Array<{
      userId: number;
      userName: string;
      count: number;
    }>;
    logsByDate: Array<{
      date: string;
      count: number;
    }>;
    topActions: Array<{
      action: string;
      count: number;
    }>;
  };
}
```

### Get Entity Audit Trail
```http
GET /api/v1/audit/entity/:entityType/:entityId
```

**Authorization:** `SUPER_MANAGER`, `MANAGER`, `PRINCIPAL`

**Path Parameters:**
- `entityType` (string): Type of entity (e.g., "User", "Student", "Class")
- `entityId` (number): ID of the entity

**Query Parameters:**
```typescript
{
  page?: number;
  limit?: number;
  action?: string;
  startDate?: string; // "YYYY-MM-DD"
  endDate?: string; // "YYYY-MM-DD"
}
```

**Response (Success - 200):**
```typescript
{
  success: true;
  data: {
    entityType: string;
    entityId: number;
    logs: Array<{
      id: number;
      action: string;
      oldValues?: Record<string, any>;
      newValues?: Record<string, any>;
      userId: number;
      userAgent?: string;
      ipAddress?: string;
      createdAt: string;
      user: {
        id: number;
        name: string;
        email: string;
        matricule: string;
      };
    }>;
    pagination: {
      currentPage: number;
      totalPages: number;
      totalItems: number;
      itemsPerPage: number;
    };
  };
}
```

### Get User Activity Summary
```http
GET /api/v1/audit/user/:userId/activity
```

**Authorization:** `SUPER_MANAGER`, `MANAGER`, `PRINCIPAL`

**Path Parameters:**
- `userId` (number): ID of the user

**Query Parameters:**
```typescript
{
  startDate?: string; // "YYYY-MM-DD"
  endDate?: string; // "YYYY-MM-DD"
  page?: number;
  limit?: number;
}
```

**Response (Success - 200):**
```typescript
{
  success: true;
  data: {
    userId: number;
    userName: string;
    totalActions: number;
    actionSummary: Record<string, number>;
    entitySummary: Record<string, number>;
    recentActivity: Array<{
      id: number;
      entityType: string;
      entityId: number;
      action: string;
      createdAt: string;
    }>;
    activityByDate: Array<{
      date: string;
      count: number;
    }>;
  };
}
```

### Get My Activity Summary
```http
GET /api/v1/audit/my-activity
```

**Authorization:** All authenticated users

**Query Parameters:**
```typescript
{
  startDate?: string; // "YYYY-MM-DD"
  endDate?: string; // "YYYY-MM-DD"
  page?: number;
  limit?: number;
}
```

**Response (Success - 200):**
```typescript
{
  success: true;
  data: {
    totalActions: number;
    actionSummary: Record<string, number>;
    entitySummary: Record<string, number>;
    recentActivity: Array<{
      id: number;
      entityType: string;
      entityId: number;
      action: string;
      createdAt: string;
    }>;
    activityByDate: Array<{
      date: string;
      count: number;
    }>;
  };
}
```

### Create Audit Log
```http
POST /api/v1/audit/log
```

**Authorization:** `SUPER_MANAGER`

**Request Body:**
```typescript
{
  entityType: string;
  entityId: number;
  action: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  description?: string;
}
```

**Response (Success - 201):**
```typescript
{
  success: true;
  data: {
    id: number;
    entityType: string;
    entityId: number;
    action: string;
    oldValues?: Record<string, any>;
    newValues?: Record<string, any>;
    userId: number;
    userAgent?: string;
    ipAddress?: string;
    createdAt: string;
  };
}
```

---

## Communications

### Get Announcements
```http
GET /api/v1/communications/announcements
```

**Authorization:** All authenticated users

**Query Parameters:**
```typescript
{
  page?: number;
  limit?: number;
  audience?: "ALL" | "STUDENTS" | "PARENTS" | "TEACHERS" | "STAFF";
  academicYearId?: number;
  startDate?: string; // "YYYY-MM-DD"
  endDate?: string; // "YYYY-MM-DD"
  active?: boolean;
}
```

**Response (Success - 200):**
```typescript
{
  success: true;
  data: {
    announcements: Array<{
      id: number;
      title: string;
      content: string;
      audience: "ALL" | "STUDENTS" | "PARENTS" | "TEACHERS" | "STAFF";
      priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
      isActive: boolean;
      publishDate: string;
      expiryDate?: string;
      academicYearId?: number;
      authorId: number;
      createdAt: string;
      updatedAt: string;
      author: {
        id: number;
        name: string;
        email: string;
      };
      academicYear?: {
        id: number;
        name: string;
        startDate: string;
        endDate: string;
      };
    }>;
    pagination: {
      currentPage: number;
      totalPages: number;
      totalItems: number;
      itemsPerPage: number;
    };
  };
}
```

### Create Announcement
```http
POST /api/v1/communications/announcements
```

**Authorization:** `SUPER_MANAGER`, `MANAGER`, `PRINCIPAL`, `VICE_PRINCIPAL`

**Request Body:**
```typescript
{
  title: string;
  content: string;
  audience: "ALL" | "STUDENTS" | "PARENTS" | "TEACHERS" | "STAFF";
  priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT"; // Default: "MEDIUM"
  publishDate?: string; // "YYYY-MM-DD", Default: current date
  expiryDate?: string; // "YYYY-MM-DD"
  academicYearId?: number; // If not provided, uses current academic year
  isActive?: boolean; // Default: true
}
```

**Response (Success - 201):**
```typescript
{
  success: true;
  data: {
    id: number;
    title: string;
    content: string;
    audience: "ALL" | "STUDENTS" | "PARENTS" | "TEACHERS" | "STAFF";
    priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
    isActive: boolean;
    publishDate: string;
    expiryDate?: string;
    academicYearId?: number;
    authorId: number;
    createdAt: string;
    updatedAt: string;
  };
}
```

### Update Announcement
```http
PUT /api/v1/communications/announcements/:id
```

**Authorization:** `SUPER_MANAGER`, `MANAGER`, `PRINCIPAL`, `VICE_PRINCIPAL`

**Path Parameters:**
- `id` (number): Announcement ID

**Request Body:**
```typescript
{
  title?: string;
  content?: string;
  audience?: "ALL" | "STUDENTS" | "PARENTS" | "TEACHERS" | "STAFF";
  priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  publishDate?: string; // "YYYY-MM-DD"
  expiryDate?: string; // "YYYY-MM-DD"
  isActive?: boolean;
}
```

**Response (Success - 200):**
```typescript
{
  success: true;
  data: {
    id: number;
    title: string;
    content: string;
    audience: "ALL" | "STUDENTS" | "PARENTS" | "TEACHERS" | "STAFF";
    priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
    isActive: boolean;
    publishDate: string;
    expiryDate?: string;
    academicYearId?: number;
    authorId: number;
    createdAt: string;
    updatedAt: string;
  };
}
```

### Delete Announcement
```http
DELETE /api/v1/communications/announcements/:id
```

**Authorization:** `SUPER_MANAGER`, `MANAGER`, `PRINCIPAL`, `VICE_PRINCIPAL`

**Path Parameters:**
- `id` (number): Announcement ID

**Response (Success - 200):**
```typescript
{
  success: true;
  message: "Announcement deleted successfully";
}
```

**Error Response (404):**
```typescript
{
  success: false;
  error: "Announcement not found";
}
```

### Send Notification
```http
POST /api/v1/communications/notifications
```

**Authorization:** `SUPER_MANAGER`, `MANAGER`, `PRINCIPAL`, `VICE_PRINCIPAL`

**Request Body:**
```typescript
{
  title: string;
  message: string;
  audience: "ALL" | "STUDENTS" | "PARENTS" | "TEACHERS" | "STAFF";
  priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT"; // Default: "MEDIUM"
  sendImmediate?: boolean; // Default: true
  scheduledTime?: string; // ISO string, required if sendImmediate is false
  academicYearId?: number; // If not provided, uses current academic year
  targetUserIds?: number[]; // Specific users to notify (overrides audience)
  actionUrl?: string; // Deep link for mobile apps
  category?: string; // Notification category for filtering
}
```

**Response (Success - 200):**
```typescript
{
  success: true;
  data: {
    notificationId: string;
    title: string;
    message: string;
    audience: "ALL" | "STUDENTS" | "PARENTS" | "TEACHERS" | "STAFF";
    priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
    recipientCount: number;
    sentAt: string;
    status: "SENT" | "SCHEDULED" | "FAILED";
    failureReason?: string;
  };
}
```

**Error Response (400):**
```typescript
{
  success: false;
  error: "Invalid notification data" | "Scheduled time must be in the future" | "No recipients found for the specified audience";
}
```

---

## Enhanced Dashboard Analytics

### Super Manager Enhanced Dashboard
```http
GET /api/v1/dashboard/super-manager/enhanced
```

**Authorization:** `SUPER_MANAGER`

**Response (Success - 200):**
```typescript
{
  success: true;
  data: {
    systemOverview: {
      totalUsers: number;
      totalStudents: number;
      totalTeachers: number;
      totalClasses: number;
      activeAcademicYears: number;
    };
    academicProgress: {
      enrollmentStats: {
        totalEnrolled: number;
        pendingInterviews: number;
        unassignedStudents: number;
      };
      performanceMetrics: {
        averageAttendanceRate: number;
        overallGrades: Record<string, number>;
      };
    };
    financialSummary: {
      totalRevenue: number;
      outstandingFees: number;
      collectionRate: number;
      monthlyTrends: Array<{
        month: string;
        collected: number;
        outstanding: number;
      }>;
    };
    operationalInsights: {
      recentAuditActivities: Array<{
        id: number;
        action: string;
        entityType: string;
        userId: number;
        createdAt: string;
      }>;
      systemHealth: {
        uptime: string;
        performance: "GOOD" | "FAIR" | "POOR";
        lastBackup: string;
      };
    };
  };
}
```

### Manager Enhanced Dashboard
```http
GET /api/v1/dashboard/manager/enhanced
```

**Authorization:** `MANAGER`, `SUPER_MANAGER`

**Response:** Same as Super Manager Enhanced Dashboard

### Bursar Enhanced Dashboard
```http
GET /api/v1/dashboard/bursar/enhanced
```

**Authorization:** `BURSAR`, `SUPER_MANAGER`, `MANAGER`

**Response (Success - 200):**
```typescript
{
  success: true;
  data: {
    financialOverview: {
      totalRevenue: number;
      monthlyRevenue: number;
      outstandingAmount: number;
      collectionRate: number;
      defaultersCount: number;
    };
    enrollmentFinancials: {
      totalEnrollments: number;
      paidEnrollments: number;
      pendingPayments: number;
      averageFeePerStudent: number;
    };
    paymentTrends: Array<{
      month: string;
      collected: number;
      target: number;
      variance: number;
    }>;
    recentTransactions: Array<{
      id: number;
      studentName: string;
      amount: number;
      type: string;
      date: string;
      status: string;
    }>;
    alerts: {
      overduePayments: number;
      newDefaulters: number;
      largePayments: number;
    };
  };
}
```

### Vice Principal Enhanced Dashboard
```http
GET /api/v1/dashboard/vp/enhanced
```

**Authorization:** `VICE_PRINCIPAL`, `SUPER_MANAGER`, `MANAGER`

**Response (Success - 200):**
```typescript
{
  success: true;
  data: {
    studentManagement: {
      totalStudents: number;
      pendingInterviews: number;
      unassignedStudents: number;
      recentEnrollments: number;
    };
    interviewScheduling: {
      scheduledToday: number;
      scheduledThisWeek: number;
      completedThisMonth: number;
      pendingRescheduling: number;
    };
    classCapacityAnalysis: Array<{
      classId: number;
      className: string;
      capacity: number;
      currentStudents: number;
      utilizationRate: number;
      recommendedAction: string;
    }>;
    disciplinaryOverview: {
      activeIssues: number;
      resolvedThisWeek: number;
      studentsOnWatch: number;
    };
    upcomingTasks: Array<{
      id: number;
      task: string;
      dueDate: string;
      priority: "HIGH" | "MEDIUM" | "LOW";
    }>;
  };
}
```

### Teacher Analytics
```http
GET /api/v1/dashboard/teacher-analytics
```

**Authorization:** `SUPER_MANAGER`, `MANAGER`, `PRINCIPAL`

**Query Parameters:**
```typescript
{
  academicYearId?: number;
  departmentId?: number;
  startDate?: string; // "YYYY-MM-DD"
  endDate?: string; // "YYYY-MM-DD"
}
```

**Response (Success - 200):**
```typescript
{
  success: true;
  data: {
    overview: {
      totalTeachers: number;
      activeTeachers: number;
      teachersOnLeave: number;
      averageAttendanceRate: number;
    };
    performanceMetrics: Array<{
      teacherId: number;
      teacherName: string;
      subjectsCount: number;
      studentsCount: number;
      attendanceRate: number;
      averageStudentPerformance: number;
      lastLogin: string;
    }>;
    departmentBreakdown: Array<{
      department: string;
      teacherCount: number;
      avgPerformance: number;
      attendanceRate: number;
    }>;
    workloadAnalysis: Array<{
      teacherId: number;
      teacherName: string;
      totalClasses: number;
      totalStudents: number;
      workloadScore: number;
      recommendation: string;
    }>;
  };
}
```

### Class Profiles
```http
GET /api/v1/dashboard/class-profiles
```

**Authorization:** `SUPER_MANAGER`, `MANAGER`, `PRINCIPAL`

**Query Parameters:**
```typescript
{
  academicYearId?: number;
  classId?: number;
}
```

**Response (Success - 200):**
```typescript
{
  success: true;
  data: {
    classOverview: Array<{
      classId: number;
      className: string;
      totalSubClasses: number;
      totalStudents: number;
      averageAttendance: number;
      averagePerformance: number;
      teacherCount: number;
    }>;
    performanceRankings: Array<{
      rank: number;
      classId: number;
      className: string;
      averageGrade: number;
      attendanceRate: number;
      completionRate: number;
    }>;
    capacityUtilization: Array<{
      classId: number;
      className: string;
      maxCapacity: number;
      currentStudents: number;
      utilizationRate: number;
      status: "UNDER_UTILIZED" | "OPTIMAL" | "OVER_CAPACITY";
    }>;
  };
}
```

### Reports Analytics
```http
GET /api/v1/dashboard/reports-analytics
```

**Authorization:** `SUPER_MANAGER`, `MANAGER`, `PRINCIPAL`

**Response (Success - 200):**
```typescript
{
  success: true;
  data: {
    reportGeneration: {
      totalReportsGenerated: number;
      reportsThisMonth: number;
      avgGenerationTime: number;
      successRate: number;
    };
    upcomingDeadlines: Array<{
      reportType: string;
      dueDate: string;
      priority: "HIGH" | "MEDIUM" | "LOW";
      assignedTo: string;
      status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
    }>;
    reportTypes: Array<{
      type: string;
      count: number;
      lastGenerated: string;
      avgSize: string;
    }>;
    performance: {
      fastestGeneration: number;
      slowestGeneration: number;
      failureRate: number;
      popularReports: Array<{
        type: string;
        count: number;
      }>;
    };
  };
}
```

### Audit Trail Dashboard
```http
GET /api/v1/dashboard/audit-trail
```

**Authorization:** `SUPER_MANAGER`, `MANAGER`

**Query Parameters:**
```typescript
{
  timeframe?: "24h" | "7d" | "30d";
  entityType?: string;
}
```

**Response (Success - 200):**
```typescript
{
  success: true;
  data: {
    activitySummary: {
      totalActions: number;
      uniqueUsers: number;
      criticalActions: number;
      failedActions: number;
    };
    recentActivities: Array<{
      id: number;
      action: string;
      entityType: string;
      entityId: number;
      userId: number;
      userName: string;
      timestamp: string;
      risk: "LOW" | "MEDIUM" | "HIGH";
    }>;
    userActivity: Array<{
      userId: number;
      userName: string;
      actionCount: number;
      lastActivity: string;
      riskScore: number;
    }>;
    systemChanges: Array<{
      category: string;
      changeCount: number;
      lastChange: string;
    }>;
  };
}
```

### Financial Overview
```http
GET /api/v1/dashboard/financial-overview
```

**Authorization:** `SUPER_MANAGER`, `MANAGER`, `BURSAR`

**Query Parameters:**
```typescript
{
  academicYearId?: number;
  timeframe?: "month" | "quarter" | "year";
}
```

**Response (Success - 200):**
```typescript
{
  success: true;
  data: {
    summary: {
      totalRevenue: number;
      outstandingAmount: number;
      collectionRate: number;
      totalStudents: number;
      paidStudents: number;
    };
    monthlyTrends: Array<{
      month: string;
      revenue: number;
      target: number;
      collections: number;
      outstanding: number;
    }>;
    feeCategories: Array<{
      category: string;
      totalAmount: number;
      collectedAmount: number;
      outstandingAmount: number;
      collectionRate: number;
    }>;
    defaultersAnalysis: {
      totalDefaulters: number;
      amountInDefault: number;
      topDefaulters: Array<{
        studentId: number;
        studentName: string;
        outstandingAmount: number;
        daysPastDue: number;
      }>;
    };
  };
}
```

### Student Registration Analytics
```http
GET /api/v1/dashboard/student-registration
```

**Authorization:** `BURSAR`, `SUPER_MANAGER`, `MANAGER`

**Query Parameters:**
```typescript
{
  academicYearId?: number;
  timeframe?: "week" | "month" | "quarter";
}
```

**Response (Success - 200):**
```typescript
{
  success: true;
  data: {
    registrationStats: {
      totalRegistrations: number;
      completedRegistrations: number;
      pendingPayments: number;
      rejectedApplications: number;
    };
    dailyRegistrations: Array<{
      date: string;
      newRegistrations: number;
      completedPayments: number;
      pendingCount: number;
    }>;
    classDistribution: Array<{
      classId: number;
      className: string;
      registeredStudents: number;
      capacity: number;
      waitingList: number;
    }>;
    paymentAnalysis: {
      totalFeesCollected: number;
      averagePaymentTime: number;
      paymentMethods: Record<string, number>;
      installmentPlans: number;
    };
  };
}
```

### Interview Management Analytics
```http
GET /api/v1/dashboard/interview-management
```

**Authorization:** `VICE_PRINCIPAL`, `SUPER_MANAGER`, `MANAGER`

**Query Parameters:**
```typescript
{
  academicYearId?: number;
  status?: "SCHEDULED" | "COMPLETED" | "PENDING";
}
```

**Response (Success - 200):**
```typescript
{
  success: true;
  data: {
    interviewStats: {
      totalScheduled: number;
      completedToday: number;
      pendingThisWeek: number;
      averageInterviewDuration: number;
    };
    scheduleOverview: Array<{
      date: string;
      scheduledCount: number;
      completedCount: number;
      rescheduledCount: number;
      noShowCount: number;
    }>;
    interviewOutcomes: {
      accepted: number;
      rejected: number;
      pending: number;
      waitlisted: number;
    };
    interviewerWorkload: Array<{
      interviewerId: number;
      interviewerName: string;
      scheduledInterviews: number;
      completedInterviews: number;
      averageRating: number;
    }>;
  };
}
```

---

## Class Profile Analytics

### Get Classes Overview
```http
GET /api/v1/class-analytics/overview
```

**Authorization:** `SUPER_MANAGER`, `MANAGER`, `PRINCIPAL`

**Query Parameters:**
```typescript
{
  academicYearId?: number;
  limit?: number;
  orderBy?: "performance" | "attendance" | "capacity";
  orderDirection?: "asc" | "desc";
}
```

**Response (Success - 200):**
```typescript
{
  success: true;
  data: {
    totalClasses: number;
    averageClassSize: number;
    totalCapacity: number;
    utilizationRate: number;
    classes: Array<{
      classId: number;
      className: string;
      totalSubClasses: number;
      totalStudents: number;
      capacity: number;
      utilizationRate: number;
      averageAttendanceRate: number;
      averagePerformance: number;
      teacherCount: number;
      status: "EXCELLENT" | "GOOD" | "AVERAGE" | "NEEDS_IMPROVEMENT";
    }>;
  };
}
```

### Get Class Rankings
```http
GET /api/v1/class-analytics/rankings
```

**Authorization:** `SUPER_MANAGER`, `MANAGER`, `PRINCIPAL`

**Query Parameters:**
```typescript
{
  academicYearId?: number;
  metric?: "performance" | "attendance" | "improvement";
  limit?: number;
}
```

**Response (Success - 200):**
```typescript
{
  success: true;
  data: {
    performanceRankings: Array<{
      rank: number;
      classId: number;
      className: string;
      averageGrade: number;
      improvementRate: number;
      totalStudents: number;
    }>;
    attendanceRankings: Array<{
      rank: number;
      classId: number;
      className: string;
      attendanceRate: number;
      consistencyScore: number;
      totalStudents: number;
    }>;
    overallRankings: Array<{
      rank: number;
      classId: number;
      className: string;
      overallScore: number;
      strengthAreas: string[];
      improvementAreas: string[];
    }>;
  };
}
```

### Get Class Profile Analytics
```http
GET /api/v1/class-analytics/class/:classId
```

**Authorization:** `SUPER_MANAGER`, `MANAGER`, `PRINCIPAL`

**Path Parameters:**
- `classId` (number): Class ID

**Query Parameters:**
```typescript
{
  academicYearId?: number;
  includeStudentDetails?: boolean;
}
```

**Response (Success - 200):**
```typescript
{
  success: true;
  data: {
    classInfo: {
      classId: number;
      className: string;
      capacity: number;
      currentStudents: number;
      totalSubClasses: number;
      classLevel: string;
    };
    academicPerformance: {
      overallAverage: number;
      subjectPerformance: Array<{
        subjectId: number;
        subjectName: string;
        averageGrade: number;
        passRate: number;
        topPerformers: number;
        strugglingStudents: number;
      }>;
      gradeDistribution: Record<string, number>;
      termComparison: Array<{
        term: string;
        average: number;
        improvement: number;
      }>;
    };
    attendanceAnalysis: {
      overallAttendanceRate: number;
      attendanceTrends: Array<{
        month: string;
        rate: number;
        daysTracked: number;
      }>;
      attendanceBySubject: Array<{
        subjectId: number;
        subjectName: string;
        attendanceRate: number;
      }>;
    };
    teachingStaff: Array<{
      teacherId: number;
      teacherName: string;
      subjectsTeaching: string[];
      performanceRating: number;
      studentFeedbackScore: number;
    }>;
    studentDetails?: Array<{
      studentId: number;
      studentName: string;
      matricule: string;
      overallGrade: number;
      attendanceRate: number;
      rank: number;
      status: "EXCELLENT" | "GOOD" | "AVERAGE" | "AT_RISK";
    }>;
  };
}
```

### Get Class Dashboard Summary
```http
GET /api/v1/class-analytics/class/:classId/summary
```

**Authorization:** `SUPER_MANAGER`, `MANAGER`, `PRINCIPAL`

**Path Parameters:**
- `classId` (number): Class ID

**Response (Success - 200):**
```typescript
{
  success: true;
  data: {
    quickStats: {
      totalStudents: number;
      averageGrade: number;
      attendanceRate: number;
      capacityUtilization: number;
    };
    alerts: Array<{
      type: "LOW_ATTENDANCE" | "POOR_PERFORMANCE" | "CAPACITY_ISSUE" | "TEACHER_SHORTAGE";
      severity: "HIGH" | "MEDIUM" | "LOW";
      message: string;
      affectedCount: number;
    }>;
    recentActivity: Array<{
      date: string;
      activity: string;
      type: "ACADEMIC" | "ATTENDANCE" | "DISCIPLINARY";
      impact: "POSITIVE" | "NEGATIVE" | "NEUTRAL";
    }>;
    upcomingEvents: Array<{
      date: string;
      event: string;
      type: "EXAM" | "ASSESSMENT" | "MEETING" | "ACTIVITY";
      priority: "HIGH" | "MEDIUM" | "LOW";
    }>;
  };
}
```

### Get Class Insights
```http
GET /api/v1/class-analytics/class/:classId/insights
```

**Authorization:** `SUPER_MANAGER`, `MANAGER`, `PRINCIPAL`

**Path Parameters:**
- `classId` (number): Class ID

**Response (Success - 200):**
```typescript
{
  success: true;
  data: {
    strengthAreas: Array<{
      area: string;
      score: number;
      description: string;
      evidence: string[];
    }>;
    improvementAreas: Array<{
      area: string;
      score: number;
      description: string;
      recommendations: string[];
      priority: "HIGH" | "MEDIUM" | "LOW";
    }>;
    riskFactors: Array<{
      factor: string;
      riskLevel: "HIGH" | "MEDIUM" | "LOW";
      affectedStudents: number;
      description: string;
      interventions: string[];
    }>;
    predictions: {
      endOfTermAverage: number;
      expectedPassRate: number;
      atRiskStudents: number;
      confidence: number;
    };
  };
}
```

### Get Class Trends
```http
GET /api/v1/class-analytics/class/:classId/trends
```

**Authorization:** `SUPER_MANAGER`, `MANAGER`, `PRINCIPAL`

**Path Parameters:**
- `classId` (number): Class ID

**Query Parameters:**
```typescript
{
  timeframe?: "term" | "year" | "all";
  metrics?: string[]; // ["performance", "attendance", "behavior"]
}
```

**Response (Success - 200):**
```typescript
{
  success: true;
  data: {
    performanceTrends: Array<{
      period: string;
      averageGrade: number;
      improvement: number;
      topPerformers: number;
      strugglingStudents: number;
    }>;
    attendanceTrends: Array<{
      period: string;
      attendanceRate: number;
      change: number;
      consistentAttendees: number;
      frequentAbsentees: number;
    }>;
    behaviorTrends: Array<{
      period: string;
      disciplinaryIssues: number;
      positiveReports: number;
      overallBehaviorScore: number;
    }>;
    capacityTrends: Array<{
      period: string;
      enrollment: number;
      capacity: number;
      utilizationRate: number;
      waitingList: number;
    }>;
  };
}
```

### Compare Classes
```http
GET /api/v1/class-analytics/compare/:class1Id/:class2Id
```

**Authorization:** `SUPER_MANAGER`, `MANAGER`, `PRINCIPAL`

**Path Parameters:**
- `class1Id` (number): First class ID
- `class2Id` (number): Second class ID

**Query Parameters:**
```typescript
{
  academicYearId?: number;
  metrics?: string[]; // ["performance", "attendance", "capacity", "behavior"]
}
```

**Response (Success - 200):**
```typescript
{
  success: true;
  data: {
    class1: {
      classId: number;
      className: string;
      totalStudents: number;
      averageGrade: number;
      attendanceRate: number;
      capacityUtilization: number;
    };
    class2: {
      classId: number;
      className: string;
      totalStudents: number;
      averageGrade: number;
      attendanceRate: number;
      capacityUtilization: number;
    };
    comparison: {
      performanceDifference: number;
      attendanceDifference: number;
      capacityDifference: number;
      overallRanking: {
        class1Rank: number;
        class2Rank: number;
      };
    };
    detailedComparison: {
      subjectPerformance: Array<{
        subjectName: string;
        class1Average: number;
        class2Average: number;
        difference: number;
      }>;
      strengthsWeaknesses: {
        class1Strengths: string[];
        class1Weaknesses: string[];
        class2Strengths: string[];
        class2Weaknesses: string[];
      };
    };
  };
}
```

### Export Class Analytics Report
```http
GET /api/v1/class-analytics/class/:classId/export
```

**Authorization:** `SUPER_MANAGER`, `MANAGER`, `PRINCIPAL`

**Path Parameters:**
- `classId` (number): Class ID

**Query Parameters:**
```typescript
{
  format?: "pdf" | "excel" | "csv";
  includeStudentDetails?: boolean;
  academicYearId?: number;
  sections?: string[]; // ["performance", "attendance", "insights", "trends"]
}
```

**Response (Success - 200):**
```typescript
{
  success: true;
  data: {
    reportId: string;
    downloadUrl: string;
    filename: string;
    format: "pdf" | "excel" | "csv";
    generatedAt: string;
    expiresAt: string;
    fileSize: string;
  };
}
```

**Error Response (400):**
```typescript
{
  success: false;
  error: "Invalid class ID" | "Class not found" | "Export format not supported";
}
```

---

## Teacher Attendance Analytics

### Get Teacher Attendance Overview
```http
GET /api/v1/teacher-attendance/overview
```

**Authorization:** `SUPER_MANAGER`, `MANAGER`, `PRINCIPAL`

**Response (Success - 200):**
```typescript
{
  success: true;
  data: {
    totalTeachers: number;
    presentToday: number;
    absentToday: number;
    onLeaveToday: number;
    overallAttendanceRate: number;
    departmentBreakdown: Array<{
      department: string;
      totalTeachers: number;
      presentCount: number;
      attendanceRate: number;
    }>;
  };
}
```

### Get Teacher Attendance Details
```http
GET /api/v1/teacher-attendance/details
```

**Authorization:** `SUPER_MANAGER`, `MANAGER`, `PRINCIPAL`

**Query Parameters:**
```typescript
{
  teacherId?: number;
  startDate?: string; // "YYYY-MM-DD"
  endDate?: string; // "YYYY-MM-DD"
  status?: "PRESENT" | "ABSENT" | "LATE" | "ON_LEAVE";
  page?: number;
  limit?: number;
}
```

**Response (Success - 200):**
```typescript
{
  success: true;
  data: {
    attendance: Array<{
      teacherId: number;
      teacherName: string;
      date: string;
      status: "PRESENT" | "ABSENT" | "LATE" | "ON_LEAVE";
      checkInTime?: string;
      checkOutTime?: string;
      hoursWorked?: number;
      department: string;
    }>;
    pagination: {
      currentPage: number;
      totalPages: number;
      totalItems: number;
    };
  };
}
```

### Record Teacher Attendance
```http
POST /api/v1/teacher-attendance/record
```

**Authorization:** `SUPER_MANAGER`, `MANAGER`, `PRINCIPAL`, `VICE_PRINCIPAL`, `DISCIPLINE_MASTER`

**Request Body:**
```typescript
{
  teacherId: number;
  date: string; // "YYYY-MM-DD"
  status: "PRESENT" | "ABSENT" | "LATE" | "ON_LEAVE";
  checkInTime?: string; // "HH:MM"
  checkOutTime?: string; // "HH:MM"
  remarks?: string;
}
```

**Response (Success - 201):**
```typescript
{
  success: true;
  data: {
    id: number;
    teacherId: number;
    date: string;
    status: "PRESENT" | "ABSENT" | "LATE" | "ON_LEAVE";
    checkInTime?: string;
    checkOutTime?: string;
    hoursWorked?: number;
    recordedBy: number;
    createdAt: string;
  };
}
```

---

## Student Averages

### Calculate Student Averages
```http
POST /api/v1/student-averages/calculate/:examSequenceId
```

**Authorization:** `SUPER_MANAGER`, `PRINCIPAL`, `VICE_PRINCIPAL`, `TEACHER`

**Path Parameters:**
- `examSequenceId` (number): Exam sequence ID

**Response (Success - 200):**
```typescript
{
  success: true;
  data: {
    calculatedCount: number;
    examSequenceId: number;
    academicYearId: number;
    calculatedAt: string;
  };
}
```

### Get Sequence Averages
```http
GET /api/v1/student-averages/sequence/:examSequenceId
```

**Authorization:** `SUPER_MANAGER`, `PRINCIPAL`, `VICE_PRINCIPAL`, `TEACHER`, `PARENT`

**Path Parameters:**
- `examSequenceId` (number): Exam sequence ID

**Response (Success - 200):**
```typescript
{
  success: true;
  data: {
    averages: Array<{
      id: number;
      enrollmentId: number;
      examSequenceId: number;
      totalMarks: number;
      averageScore: number;
      rank: number;
      decision: "PROMOTED" | "REPEATED" | "PENDING";
      student: {
        id: number;
        name: string;
        matricule: string;
      };
      subClass: {
        id: number;
        name: string;
      };
    }>;
  };
}
```

---

## Mobile API

### Get Mobile Dashboard
```http
GET /api/v1/mobile/dashboard
```

**Authorization:** All authenticated users

**Response (Success - 200):**
```typescript
{
  success: true;
  data: {
    user: {
      id: number;
      name: string;
      role: string;
      photo?: string;
    };
    quickStats: Record<string, any>; // Role-specific stats
    recentActivity: Array<{
      type: string;
      message: string;
      timestamp: string;
    }>;
    notifications: {
      unreadCount: number;
      recent: Array<{
        id: number;
        title: string;
        message: string;
        createdAt: string;
      }>;
    };
  };
}
```

### Register Mobile Device
```http
POST /api/v1/mobile/register-device
```

**Authorization:** All authenticated users

**Request Body:**
```typescript
{
  deviceToken: string;
  platform: "ios" | "android";
  appVersion: string;
  deviceInfo?: {
    model: string;
    osVersion: string;
  };
}
```

**Response (Success - 200):**
```typescript
{
  success: true;
  data: {
    deviceId: string;
    registered: boolean;
    pushEnabled: boolean;
  };
}
```

---

## File Management

### Upload File
```http
POST /api/v1/uploads
```

**Authorization:** All authenticated users

**Request:** Form data with file
- `file` (File): The file to upload

**Response (Success - 200):**
```typescript
{
  success: true;
  data: {
    filename: string;
    originalName: string;
    size: number;
    mimetype: string;
    url: string;
    uploadedAt: string;
  };
}
```

### Delete File
```http
DELETE /api/v1/uploads/:filename
```

**Authorization:** All authenticated users

**Path Parameters:**
- `filename` (string): Name of the file to delete

**Response (Success - 200):**
```typescript
{
  success: true;
  message: "File deleted successfully";
}
```

---

## Notifications

### Get Notification Templates
```http
GET /api/v1/notifications/templates
```

**Authorization:** `SUPER_MANAGER`, `MANAGER`, `PRINCIPAL`, `VICE_PRINCIPAL`, `BURSAR`

**Response (Success - 200):**
```typescript
{
  success: true;
  data: {
    templates: Array<{
      id: number;
      name: string;
      title: string;
      body: string;
      category: string;
      variables: string[];
    }>;
  };
}
```

### Get My Notifications
```http
GET /api/v1/notifications/me
```

**Authorization:** All authenticated users

**Query Parameters:**
```typescript
{
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
}
```

**Response (Success - 200):**
```typescript
{
  success: true;
  data: {
    notifications: Array<{
      id: number;
      title: string;
      message: string;
      category: string;
      isRead: boolean;
      actionUrl?: string;
      createdAt: string;
    }>;
    pagination: {
      currentPage: number;
      totalPages: number;
      totalItems: number;
    };
  };
}
```

### Send Notification
```http
POST /api/v1/notifications/send
```

**Authorization:** `SUPER_MANAGER`, `MANAGER`, `PRINCIPAL`, `VICE_PRINCIPAL`, `BURSAR`, `DISCIPLINE_MASTER`

**Request Body:**
```typescript
{
  title: string;
  message: string;
  recipientIds: number[];
  category?: string;
  actionUrl?: string;
  priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
}
```

**Response (Success - 200):**
```typescript
{
  success: true;
  data: {
    notificationId: string;
    recipientCount: number;
    sentAt: string;
  };
}
```

---

## Period Management

### Get All Periods
```http
GET /api/v1/periods
```

**Authorization:** All authenticated users

**Response (Success - 200):**
```typescript
{
  success: true;
  data: {
    periods: Array<{
      id: number;
      name: string;
      startTime: string; // "HH:MM"
      endTime: string; // "HH:MM"
      dayOfWeek: number; // 1-7 (Monday=1)
      isActive: boolean;
      createdAt: string;
    }>;
  };
}
```

### Create Period
```http
POST /api/v1/periods
```

**Authorization:** `SUPER_MANAGER`, `MANAGER`, `PRINCIPAL`

**Request Body:**
```typescript
{
  name: string;
  startTime: string; // "HH:MM"
  endTime: string; // "HH:MM"
  dayOfWeek: number; // 1-7 (Monday=1)
  isActive?: boolean; // Default: true
}
```

**Response (Success - 201):**
```typescript
{
  success: true;
  data: {
    id: number;
    name: string;
    startTime: string;
    endTime: string;
    dayOfWeek: number;
    isActive: boolean;
    createdAt: string;
  };
}
```

### Update Period
```http
PUT /api/v1/periods/:id
```

**Authorization:** `SUPER_MANAGER`, `MANAGER`, `PRINCIPAL`

**Path Parameters:**
- `id` (number): Period ID

**Request Body:**
```typescript
{
  name?: string;
  startTime?: string; // "HH:MM"
  endTime?: string; // "HH:MM"
  dayOfWeek?: number; // 1-7
  isActive?: boolean;
}
```

**Response (Success - 200):**
```typescript
{
  success: true;
  data: {
    id: number;
    name: string;
    startTime: string;
    endTime: string;
    dayOfWeek: number;
    isActive: boolean;
    updatedAt: string;
  };
}
```

### Delete Period
```http
DELETE /api/v1/periods/:id
```

**Authorization:** `SUPER_MANAGER`, `MANAGER`, `PRINCIPAL`

**Path Parameters:**
- `id` (number): Period ID

**Response (Success - 200):**
```typescript
{
  success: true;
  message: "Period deleted successfully";
}
```

---

## Authentication

### Login
```http
POST /api/v1/auth/login
```

**Request Body:**
```typescript
{
  email?: string;      // Optional if matricule provided
  matricule?: string;  // Optional if email provided
  password: string;    // Required
}
```

**Response (Success - 200):**
```typescript
{
  success: true;
  data: {
    token: string;
    expiresIn: string; // "24h"
    user: {
      id: number;
      name: string;
      email: string;
      matricule: string;
      gender: "MALE" | "FEMALE";
      dateOfBirth: string;
      phone: string;
      address: string;
      idCardNum?: string;
      photo?: string;
      status: string;
      createdAt: string;
      updatedAt: string;
      userRoles: Array<{
        id: number;
        userId: number;
        role: "SUPER_MANAGER" | "MANAGER" | "PRINCIPAL" | "VICE_PRINCIPAL" | "BURSAR" | "DISCIPLINE_MASTER" | "TEACHER" | "HOD" | "PARENT" | "STUDENT";
        academicYearId?: number;
        createdAt: string;
        updatedAt: string;
      }>;
    };
  };
}
```

**Error Response (401):**
```typescript
{
  success: false;
  error: "Invalid credentials";
}
```

### Register User
```http
POST /api/v1/auth/register
```

**Request Body:**
```typescript
{
  name: string;
  email: string;
  password: string;
  gender: "MALE" | "FEMALE";
  dateOfBirth: string; // "YYYY-MM-DD"
  phone: string;
  address: string;
  idCardNum?: string;
  photo?: string;
  status?: string;
}
```

### Get Profile
```http
GET /api/v1/auth/me
Authorization: Bearer <token>
```

### Logout
```http
POST /api/v1/auth/logout
Authorization: Bearer <token>
```

---

## Parent Portal

### Parent Dashboard
```http
GET /api/v1/parents/dashboard
Authorization: Bearer <token>
```

**Query Parameters:**
```typescript
{
  academicYearId?: number; // Optional
}
```

**Response (200):**
```typescript
{
  success: true;
  data: {
    totalChildren: number;
    childrenEnrolled: number;
    pendingFees: number;
    totalFeesOwed: number;
    latestGrades: number;
    disciplineIssues: number;
    unreadMessages: number;
    upcomingEvents: number;
    children: Array<{
      id: number;
      name: string;
      className?: string;
      subclassName?: string;
      enrollmentStatus: string;
      photo?: string;
      attendanceRate: number;
      latestMarks: Array<{
        subjectName: string;
        latestMark: number;
        sequence: string;
        date: string;
      }>;
      pendingFees: number;
      disciplineIssues: number;
      recentAbsences: number;
    }>;
  };
}
```

### Get Child Details
```http
GET /api/v1/parents/children/:studentId
Authorization: Bearer <token>
```

**Path Parameters:**
- `studentId` (number): Student ID

**Query Parameters:**
```typescript
{
  academicYearId?: number;
}
```

**Response (200):**
```typescript
{
  success: true;
  data: {
    id: number;
    name: string;
    matricule: string;
    dateOfBirth: string;
    classInfo?: {
      className: string;
      subclassName: string;
      classMaster?: string;
    };
    attendance: {
      presentDays: number;
      absentDays: number;
      lateDays: number;
      attendanceRate: number;
    };
    academicPerformance: {
      subjects: Array<{
        subjectName: string;
        teacherName: string;
        marks: Array<{
          sequence: string;
          mark: number;
          total: number;
          date: string;
        }>;
        average: number;
      }>;
      overallAverage: number;
      positionInClass?: number;
    };
    fees: {
      totalExpected: number;
      totalPaid: number;
      outstandingBalance: number;
      lastPaymentDate?: string;
      paymentHistory: Array<{
        id: number;
        amount: number;
        paymentDate: string;
        paymentMethod: string;
        receiptNumber?: string;
        recordedBy: string;
      }>;
    };
    discipline: {
      totalIssues: number;
      recentIssues: Array<{
        id: number;
        type: string;
        description: string;
        dateOccurred: string;
        status: string;
        resolvedAt?: string;
      }>;
    };
    reports: {
      availableReports: Array<{
        id: number;
        sequenceName: string;
        academicYear: string;
        generatedAt: string;
        downloadUrl: string;
      }>;
    };
  };
}
```

### Send Message to Staff
```http
POST /api/v1/parents/message-staff
Authorization: Bearer <token>
```

**Request Body:**
```typescript
{
  recipientId: number;    // Required - Staff member ID
  subject: string;         // Required
  message: string;         // Required
  priority?: "LOW" | "MEDIUM" | "HIGH";
  studentId?: number;     // Optional - If message is about specific child
}
```

### Get Child Quiz Results
```http
GET /api/v1/parents/children/:studentId/quiz-results
Authorization: Bearer <token>
```

**Query Parameters:**
```typescript
{
  academicYearId?: number;
}
```

### Get Child Analytics
```http
GET /api/v1/parents/children/:studentId/analytics
Authorization: Bearer <token>
```

**Query Parameters:**
```typescript
{
  academicYearId?: number;
}
```

**Response (200):**
```typescript
{
  success: true;
  data: {
    studentInfo: {
      id: number;
      name: string;
      classInfo: object;
    };
    performanceAnalytics: {
      overallAverage: number;
      grade: string;
      classRank?: number;
      improvementTrend: "IMPROVING" | "DECLINING" | "STABLE";
      subjectsAboveAverage: number;
      subjectsBelowAverage: number;
      recommendation: string;
    };
    attendanceAnalytics: {
      totalDays: number;
      presentDays: number;
      absentDays: number;
      attendanceRate: number;
      status: string;
      monthlyTrends: Array<{
        month: string;
        attendanceRate: number;
      }>;
    };
    quizAnalytics: {
      totalQuizzes: number;
      completedQuizzes: number;
      averageScore: number;
      highestScore: number;
      completionRate: number;
      recentQuizzes: Array<object>;
    };
    subjectTrends: Array<{
      subjectName: string;
      currentAverage: number;
      trend: "IMPROVING" | "DECLINING" | "STABLE";
      bestMark: number;
      lowestMark: number;
    }>;
    comparativeAnalytics: {
      studentAverage: number;
      classAverage: number;
      aboveClassAverage: boolean;
      percentileRank?: number;
    };
  };
}
```

### Get All Children Quiz Results
```http
GET /api/v1/parents/children/quiz-results
Authorization: Bearer <token>
```

### Get School Announcements
```http
GET /api/v1/parents/announcements
Authorization: Bearer <token>
```

---

## Quiz System

### Create Quiz (Teachers/Admin)
```http
POST /api/v1/quiz
Authorization: Bearer <token>
```

**Request Body:**
```typescript
{
  title: string;
  description?: string;
  subjectId: number;
  classIds: number[];    // Array of class IDs
  timeLimit?: number;    // Minutes
  totalMarks?: number;   // Defaults to 10
  startDate?: string;    // "YYYY-MM-DD"
  endDate?: string;      // "YYYY-MM-DD"
  questions: Array<{
    questionText: string;
    questionType?: "MCQ" | "LONG_ANSWER"; // Defaults to MCQ
    options?: string[];   // For MCQ questions
    correctAnswer: string;
    marks?: number;       // Defaults to 1
    explanation?: string;
  }>;
}
```

**Response (201):**
```typescript
{
  success: true;
  message: "Quiz created successfully";
  data: {
    id: number;
    title: string;
    description?: string;
    subjectId: number;
    classIds: string;    // JSON string
    timeLimit?: number;
    totalMarks: number;
    startDate?: string;
    endDate?: string;
    createdById: number;
    academicYearId: number;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    questions: Array<{
      id: number;
      quizId: number;
      questionText: string;
      questionType: "MCQ" | "LONG_ANSWER";
      options?: string;   // JSON string for MCQ
      correctAnswer: string;
      marks: number;
      orderIndex: number;
      explanation?: string;
    }>;
    subject: {
      id: number;
      name: string;
      // ... other subject fields
    };
    createdBy: {
      id: number;
      name: string;
      matricule: string;
    };
  };
}
```

### Get Available Quizzes for Student
```http
GET /api/v1/quiz/student/:studentId/available
Authorization: Bearer <token>
```

**Query Parameters:**
```typescript
{
  academicYearId?: number;
}
```

**Response (200):**
```typescript
{
  success: true;
  data: Array<{
    id: number;
    title: string;
    description?: string;
    subject: string;
    timeLimit?: number;
    totalMarks: number;
    questionCount: number;
    startDate?: string;
    endDate?: string;
    status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
    lastAttempt?: {
      score: number;
      percentage: number;
    };
  }>;
}
```

### Start Quiz
```http
POST /api/v1/quiz/start
Authorization: Bearer <token>
```

**Request Body:**
```typescript
{
  quizId: number;
  studentId: number;
}
```

**Response (201):**
```typescript
{
  success: true;
  message: "Quiz started successfully";
  data: {
    id: number;
    quizId: number;
    studentId: number;
    parentId: number;
    status: "IN_PROGRESS";
    startedAt: string;
    // ... submission details
  };
}
```

### Submit Quiz
```http
POST /api/v1/quiz/submissions/:submissionId/submit
Authorization: Bearer <token>
```

**Request Body:**
```typescript
{
  responses: Array<{
    questionId: number;
    selectedAnswer: string;
    timeSpent?: number; // Seconds
  }>;
}
```

### Get Quiz Results
```http
GET /api/v1/quiz/student/:studentId/results
Authorization: Bearer <token>
```

### Get Detailed Quiz Results
```http
GET /api/v1/quiz/submissions/:submissionId/detailed
Authorization: Bearer <token>
```

### Get Quiz Statistics (Teachers)
```http
GET /api/v1/quiz/:quizId/statistics
Authorization: Bearer <token>
```

### Get All Quizzes (Teachers/Admin)
```http
GET /api/v1/quiz
Authorization: Bearer <token>
```

---

## Vice Principal (Enhanced Student Management)

### Get Vice Principal Dashboard
```http
GET /api/v1/vice-principal/dashboard
Authorization: Bearer <token>
```

**Query Parameters:**
```typescript
{
  academicYearId?: number;
}
```

**Response (200):**
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

### Get Student Management Overview
```http
GET /api/v1/vice-principal/student-management
Authorization: Bearer <token>
```

**Query Parameters:**
```typescript
{
  academicYearId?: number;
}
```

**Response (200):**
```typescript
{
  success: true;
  data: {
    totalStudents: number;
    byStatus: {
      notEnrolled: number;
      interviewPending: number;
      interviewCompleted: number;
      assignedToClass: number;
      enrolled: number;
    };
    interviewMetrics: {
      totalConducted: number;
      averageScore: number;
      passRate: number;
      pendingInterviews: number;
      overdueInterviews: number;
    };
    classAssignmentMetrics: {
      totalAssigned: number;
      awaitingAssignment: number;
      classCapacityIssues: number;
      recentAssignments: number;
    };
  };
}
```

### Get Interview Management Data
```http
GET /api/v1/vice-principal/interviews
Authorization: Bearer <token>
```

**Query Parameters:**
```typescript
{
  academicYearId?: number;
  status?: "PENDING" | "COMPLETED" | "OVERDUE";
}
```

**Response (200):**
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

### Get Subclass Optimization
```http
GET /api/v1/vice-principal/subclass-optimization
Authorization: Bearer <token>
```

**Response (200):**
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

### Get Student Progress Tracking
```http
GET /api/v1/vice-principal/student-progress/:studentId
Authorization: Bearer <token>
```

**Path Parameters:**
- `studentId` (number): Student ID

**Response (200):**
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

### Bulk Schedule Interviews
```http
POST /api/v1/vice-principal/bulk-schedule-interviews
Authorization: Bearer <token>
```

**Request Body:**
```typescript
{
  studentIds: number[];
  scheduledDate: string; // "YYYY-MM-DD"
  academicYearId?: number;
}
```

**Response (201):**
```typescript
{
  success: true;
  message: "Successfully scheduled X interviews";
  data: {
    scheduled: number;
    errors: Array<{
      studentId: number;
      error: string;
    }>;
  };
}
```

### Get Enrollment Analytics
```http
GET /api/v1/vice-principal/enrollment-analytics
Authorization: Bearer <token>
```

**Response (200):**
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

### Get Students Requiring Attention
```http
GET /api/v1/vice-principal/students-requiring-attention
Authorization: Bearer <token>
```

**Response (200):**
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

### Get Class Capacity Analysis
```http
GET /api/v1/vice-principal/class-capacity-analysis
Authorization: Bearer <token>
```

### Get Quick Statistics
```http
GET /api/v1/vice-principal/quick-stats
Authorization: Bearer <token>
```

**Response (200):**
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

---

## Enrollment Workflow (Basic Operations)

### Register Student to Class (Bursar Function)
```http
POST /api/v1/enrollment/register
Authorization: Bearer <token>
```

**Request Body:**
```typescript
{
  name: string;
  dateOfBirth: string;     // "YYYY-MM-DD"
  placeOfBirth: string;
  gender: "MALE" | "FEMALE";
  residence: string;
  formerSchool?: string;
  classId: number;          // Required
  academicYearId?: number; // Optional, defaults to current
  isNewStudent?: boolean;  // Defaults to true
}
```

**Response (201):**
```typescript
{
  success: true;
  message: "Student registered successfully. Awaiting VP interview.";
  data: {
    student: {
      id: number;
      matricule: string;
      name: string;
      dateOfBirth: string;
      placeOfBirth: string;
      gender: "MALE" | "FEMALE";
      residence: string;
      formerSchool?: string;
      isNewStudent: boolean;
      status: "NOT_ENROLLED";
      // ... other fields
    };
    enrollment: {
      id: number;
      studentId: number;
      classId: number;
      subClassId?: number; // null until VP assigns
      academicYearId: number;
      // ... other enrollment fields
    };
  };
}
```

### Record Interview Mark
```http
POST /api/v1/enrollment/interview
Authorization: Bearer <token>
```

**Request Body:**
```typescript
{
  studentId: number;
  score: number;             // Interview score
  comments?: string;
  academicYearId?: number;
}
```

**Response (201):**
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

### Assign Student to Subclass
```http
POST /api/v1/enrollment/assign-subclass
Authorization: Bearer <token>
```

**Request Body:**
```typescript
{
  studentId: number;
  subClassId: number;
  academicYearId?: number;
}
```

**Response (200):**
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
      // ... updated enrollment
    };
  };
}
```

### Get Unassigned Students
```http
GET /api/v1/enrollment/unassigned
Authorization: Bearer <token>
```

**Query Parameters:**
```typescript
{
  academicYearId?: number;
}
```

**Response (200):**
```typescript
{
  success: true;
  message: "Unassigned students retrieved successfully";
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

### Get Available Subclasses
```http
GET /api/v1/enrollment/available-subclasses/:classId
Authorization: Bearer <token>
```

**Query Parameters:**
```typescript
{
  academicYearId?: number;
}
```

**Response (200):**
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

### Get Enrollment Statistics
```http
GET /api/v1/enrollment/stats
Authorization: Bearer <token>
```

### Get Student Enrollment Status
```http
GET /api/v1/enrollment/student/:studentId/status
Authorization: Bearer <token>
```

---

## Bursar (Financial Management)

### Create Student with Parent Account (NEW - Parent Creation Workflow)
```http
POST /api/v1/bursar/create-parent-with-student
Authorization: Bearer <token>
```

**Request Body:**
```typescript
{
  studentName: string;
  dateOfBirth: string;     // "YYYY-MM-DD"
  placeOfBirth: string;
  gender: "MALE" | "FEMALE";
  residence: string;
  formerSchool?: string;
  classId: number;
  isNewStudent?: boolean;  // Defaults to true
  academicYearId?: number; // Optional, defaults to current
  parentName: string;
  parentPhone: string;
  parentWhatsapp?: string;
  parentEmail?: string;
  parentAddress: string;
  relationship?: string;   // Defaults to "PARENT"
}
```

**Response (201):**
```typescript
{
  success: true;
  message: "Student and parent created successfully";
  data: {
    student: {
      id: number;
      matricule: string;
      name: string;
      dateOfBirth: string;
      placeOfBirth: string;
      gender: "MALE" | "FEMALE";
      residence: string;
      formerSchool?: string;
      isNewStudent: boolean;
      status: "NOT_ENROLLED";
      // ... other student fields
    };
    parent: {
      id: number;
      matricule: string;      // Generated parent matricule
      name: string;
      email?: string;
      phone: string;
      tempPassword: string;   // Temporary password for parent
      // ... other parent fields
    };
    enrollment?: {
      id: number;
      studentId: number;
      classId: number;
      academicYearId: number;
      // ... enrollment details
    };
  };
}
```

### Get Available Parents for Linking
```http
GET /api/v1/bursar/available-parents
Authorization: Bearer <token>
```

**Description:**
Retrieves a paginated list of existing parent accounts that can be linked to students. Supports searching by name, phone, or email.

**Authorization:**
- `BURSAR`, `SUPER_MANAGER`

**Query Parameters:**
```typescript
{
  search?: string;        // Optional: Search term for parent name, phone, or email.
  limit?: number;         // Optional: Number of results to return (default: 20).
}
```

**Response (200):**
```typescript
{
  success: true;
  message: "Available parents retrieved successfully";
  data: Array<{
    id: number;
    matricule: string;
    name: string;
    email?: string;
    phone: string;
    address?: string;
    childrenCount: number;
    children: Array<{
      id: number;
      name: string;
      className?: string;
    }>;
  }>;
  count: number; // Total number of parents matching the criteria
}
```

**Error Response (500):**
```typescript
{
  success: false;
  error: "Error fetching available parents: [error message]";
}
```

### Link Existing Parent to Student
```http
POST /api/v1/bursar/link-existing-parent
Authorization: Bearer <token>
```

**Request Body:**
```typescript
{
  studentId: number;
  parentId: number;
  relationship?: string;   // Defaults to "PARENT"
}
```

**Response (201):**
```typescript
{
  success: true;
  message: "Parent linked to student successfully";
  data: {
    id: number;
    studentId: number;
    parentId: number;
    relationship: string;
    createdAt: string;
  };
}
```

### Get Bursar Dashboard
```http
GET /api/v1/bursar/dashboard
Authorization: Bearer <token>
```

**Query Parameters:**
```typescript
{
  academicYearId?: number;
}
```

**Response (200):**
```typescript
{
  success: true;
  data: {
    totalFeesExpected: number;
    totalFeesCollected: number;
    pendingPayments: number;
    collectionRate: number;
    recentTransactions: number;
    newStudentsThisMonth: number;
    studentsWithParents: number;
    studentsWithoutParents: number;
    paymentMethods: Array<{
      method: string;
      count: number;
      totalAmount: number;
    }>;
    recentRegistrations: Array<{
      studentName: string;
      parentName: string;
      registrationDate: string;
      className: string;
    }>;
  };
}
```

### Create Fee
```http
POST /api/v1/fees
Authorization: Bearer <token>
```

**Request Body:**
```typescript
{
  enrollmentId: number;
  amountExpected: number;
  feeType?: string;
  description?: string;
  dueDate?: string;       // "YYYY-MM-DD"
  academicYearId?: number;
}
```

### Record Payment
```http
POST /api/v1/fees/:feeId/payments
Authorization: Bearer <token>
```

**Request Body:**
```typescript
{
  amount: number;
  paymentDate: string;    // "YYYY-MM-DD" (from receipt)
  paymentMethod: "EXPRESS_UNION" | "CCA" | "3DC";
  receiptNumber?: string;
  recordedById?: number; // Auto-set from auth
  notes?: string;
}
```

**Response (201):**
```typescript
{
  success: true;
  data: {
    id: number;
    feeId: number;
    amount: number;
    paymentDate: string;
    paymentMethod: string;
    receiptNumber?: string;
    recordedById: number;
    notes?: string;
    createdAt: string;
  };
}
```

### Get Student Fees
```http
GET /api/v1/fees/student/:studentId
Authorization: Bearer <token>
```

**Query Parameters:**
```typescript
{
  academicYearId?: number;
}
```

### Get Subclass Fees Summary
```http
GET /api/v1/fees/subclass/:subClassId/summary
Authorization: Bearer <token>
```

**Description:**
Retrieves a financial summary of fees for all students within a specific subclass for a given academic year. This endpoint supports both the `/api/v1/fees/subclass/:id/summary` and `/api/v1/fees/sub_class/:id/summary` paths for backward compatibility.

**Authorization:**
- Any authenticated user.

**Path Parameters:**
- `id` (number): The ID of the subclass.

**Query Parameters:**
```typescript
{
  academicYearId?: number; // Optional: The ID of the academic year. Defaults to current year.
}
```

**Response (Success - 200):**
```typescript
{
  success: true;
  data: {
    subClassId: number;
    subClassName: string;
    className: string;
    academicYearId: number;
    totalStudentsWithFees: number;
    totalExpected: number;
    totalPaid: number;
    outstanding: number;
    paymentPercentage: number;
  };
}
```

**Error Response (500):**
```typescript
{
  success: false;
  error: "Academic year ID is required to fetch subclass fees summary, but none was provided or found." | "Error fetching subclass fees summary: [error message]";
}
```

### Get All Fees
```http
GET /api/v1/fees
Authorization: Bearer <token>
```

**Description:**
Retrieves a paginated list of all fee records with extensive filtering capabilities.

**Authorization:**
- Any authenticated user (access might be restricted based on role, e.g., TEACHER can only see fees related to their students/classes if configured).

**Query Parameters:**
```typescript
{
  academicYearId?: number; // Optional: The ID of the academic year. Defaults to current year if not provided.
  page?: number; // Optional: Page number for pagination.
  limit?: number; // Optional: Number of items per page for pagination.
  search?: string; // Optional: Search term for student name or parent name.
  studentIdentifier?: string; // Optional: Search by student name or matricule.
  classId?: number; // Optional: Filter by class ID.
  subClassId?: number; // Optional: Filter by subclass ID.
  className?: string; // Optional: Filter by class name (case-insensitive).
  subclassName?: string; // Optional: Filter by subclass name (case-insensitive).
  dueDate?: string; // Optional: Fees due on or before this date (YYYY-MM-DD).
  dueBeforeDate?: string; // Optional: Fees due on or before this date (YYYY-MM-DD).
  dueAfterDate?: string; // Optional: Fees due on or after this date (YYYY-MM-DD).
  paymentStatus?: "paid" | "partial" | "unpaid"; // Optional: Filter by payment status.
}
```

**Response (Success - 200):**
```typescript
{
  success: true;
  data: {
    data: Array<{
      id: number;
      amountExpected: number;
      amountPaid: number;
      dueDate: string;
      enrollmentId: number;
      academicYearId: number;
      createdAt: string;
      updatedAt: string;
      enrollment: {
        id: number;
        studentId: number;
        academicYearId: number;
        subClassId: number;
        student: {
          id: number;
          name: string;
          matricule: string;
          // ... other student details
        };
        subClass: {
          id: number;
          name: string;
          classId: number;
          class: {
            id: number;
            name: string;
          };
        };
      };
      academicYear: {
        id: number;
        name: string;
        startDate: string;
        endDate: string;
      };
      paymentTransactions: Array<{
        id: number;
        amount: number;
        paymentDate: string;
        receiptNumber?: string;
        paymentMethod: "EXPRESS_UNION" | "CCA" | "F3DC";
        feeId: number;
        recordedById?: number;
        createdAt: string;
        updatedAt: string;
      }>;
    }>;
    meta: {
      total: number;
      lastPage: number;
      currentPage: number;
      perPage: number;
    };
  };
}
```

### Export Fee Reports
```http
GET /api/v1/fees/export
Authorization: Bearer <token>
```

**Description:**
Exports fee data in specified formats (CSV, PDF, DOCX) based on various filters.

**Authorization:**
- `SUPER_MANAGER`, `MANAGER`, `PRINCIPAL`, `BURSAR`

**Query Parameters:**
```typescript
{
  academicYearId?: number; // Optional: The ID of the academic year. Defaults to current year if not provided.
  subClassId?: number; // Optional: Filter by subclass ID.
  classId?: number; // Optional: Filter by class ID.
  studentIdentifier?: string; // Optional: Filter by student name or matricule.
  paymentStatus?: "paid" | "partial" | "unpaid"; // Optional: Filter by payment status.
  format?: "csv" | "pdf" | "docx"; // Optional: Output format. Defaults to "csv".
}
```

**Response (Success - 200 - File Download):**
```
Content-Type: text/csv | application/pdf | application/vnd.openxmlformats-officedocument.wordprocessingml.document
Content-Disposition: attachment; filename="fee_report_<academicYearId>.<format_extension>"

[File Content]
```

**Example Data in Report (JSON Structure before conversion):**
```typescript
{
  academicYearId: number;
  summary: {
    totalStudents: number;
    totalExpected: number;
    totalPaid: number;
    outstanding: number;
    paymentPercentage: number;
  };
  fees: Array<{
    feeId: number;
    studentName: string;
    studentMatricule: string;
    className: string;
    subClassName: string;
    expectedAmount: number;
    paidAmount: number;
    outstanding: number;
    paymentPercentage: number;
    dueDate: string;
    paymentsCount: number;
  }>;
}
```

### Get a Specific Fee by ID
```http
GET /api/v1/fees/:id
Authorization: Bearer <token>
```

**Description:**
Retrieves details of a specific fee record by its ID.

**Authorization:**
- Any authenticated user.

**Path Parameters:**
- `id` (number): The ID of the fee record.

**Response (Success - 200):**
```typescript
{
  success: true;
  data: {
    id: number;
    amountExpected: number;
    amountPaid: number;
    dueDate: string;
    enrollmentId: number;
    academicYearId: number;
    createdAt: string;
    updatedAt: string;
    enrollment: {
      id: number;
      studentId: number;
      academicYearId: number;
      subClassId: number;
      student: {
        id: number;
        name: string;
        matricule: string;
        // ... other student details
      };
      subClass: {
        id: number;
        name: string;
        classId: number;
        class: {
          id: number;
          name: string;
        };
      };
    };
    academicYear: {
      id: number;
      name: string;
      startDate: string;
      endDate: string;
    };
    paymentTransactions: Array<{
      id: number;
      amount: number;
      paymentDate: string;
      receiptNumber?: string;
      paymentMethod: "EXPRESS_UNION" | "CCA" | "F3DC";
      feeId: number;
      recordedById?: number;
      createdAt: string;
      updatedAt: string;
    }>;
  };
}
```

### Create a Fee Record
```http
POST /api/v1/fees
Authorization: Bearer <token>
```

**Description:**
Creates a new fee record for a student.

**Authorization:**
- `SUPER_MANAGER`, `MANAGER`, `PRINCIPAL`, `BURSAR`

**Request Body:**
```typescript
{
  amountExpected: number;
  amountPaid: number;
  dueDate: string; // YYYY-MM-DD
  enrollmentId?: number; // Required if studentId is not provided
  studentId?: number; // Required if enrollmentId is not provided
  academicYearId?: number; // Optional: The ID of the academic year. Defaults to current year.
  paymentMethod?: "EXPRESS_UNION" | "CCA" | "F3DC"; // Optional: Default payment method for the fee.
}
```

**Response (Success - 201):**
```typescript
{
  success: true;
  data: {
    id: number;
    amountExpected: number;
    amountPaid: number;
    dueDate: string;
    enrollmentId: number;
    academicYearId: number;
    createdAt: string;
    updatedAt: string;
  };
}
```

### Update a Fee Record
```http
PUT /api/v1/fees/:id
Authorization: Bearer <token>
```

**Description:**
Updates an existing fee record.

**Authorization:**
- `SUPER_MANAGER`, `MANAGER`, `PRINCIPAL`, `BURSAR`

**Path Parameters:**
- `id` (number): The ID of the fee record to update.

**Request Body:**
```typescript
{
  amountExpected?: number;
  amountPaid?: number;
  paymentMethod?: "EXPRESS_UNION" | "CCA" | "F3DC";
  dueDate?: string; // YYYY-MM-DD
}
```

**Response (Success - 200):**
```typescript
{
  success: true;
  data: {
    id: number;
    amountExpected: number;
    amountPaid: number;
    dueDate: string;
    enrollmentId: number;
    academicYearId: number;
    createdAt: string;
    updatedAt: string;
    // ... potentially other included relations as per getFeeById
  };
}
```

### Delete a Fee Record
```http
DELETE /api/v1/fees/:id
Authorization: Bearer <token>
```

**Description:**
Deletes a fee record. Fails if there are existing payment transactions associated with it.

**Authorization:**
- `SUPER_MANAGER`, `MANAGER`, `PRINCIPAL`, `BURSAR`

**Path Parameters:**
- `id` (number): The ID of the fee record to delete.

**Response (Success - 200):**
```typescript
{
  success: true;
  message: "Fee deleted successfully";
}
```

### Get All Fees for a Specific Student
```http
GET /api/v1/fees/student/:studentId
Authorization: Bearer <token>
```

**Description:**
Retrieves all fee records for a specific student for a given academic year.

**Authorization:**
- Any authenticated user.

**Path Parameters:**
- `studentId` (number): The ID of the student.

**Query Parameters:**
```typescript
{
  academicYearId?: number; // Optional: The ID of the academic year. Defaults to current year.
}
```

**Response (Success - 200):**
```typescript
{
  success: true;
  data: Array<{
    id: number;
    amountExpected: number;
    amountPaid: number;
    dueDate: string;
    enrollmentId: number;
    academicYearId: number;
    createdAt: string;
    updatedAt: string;
    // ... potentially other included relations as per getFeeById
  }>;
}
```

### Get Fee Summary for a Subclass
```http
GET /api/v1/fees/subclass/:id/summary
GET /api/v1/fees/sub_class/:id/summary
Authorization: Bearer <token>
```

**Description:**
Retrieves a financial summary of fees for all students within a specific subclass for a given academic year. This endpoint supports both the `/api/v1/fees/subclass/:id/summary` and `/api/v1/fees/sub_class/:id/summary` paths for backward compatibility.

**Authorization:**
- Any authenticated user.

**Path Parameters:**
- `id` (number): The ID of the subclass.

**Query Parameters:**
```typescript
{
  academicYearId?: number; // Optional: The ID of the academic year. Defaults to current year.
}
```

**Response (Success - 200):**
```typescript
{
  success: true;
  data: {
    subClassId: number;
    subClassName: string;
    className: string;
    academicYearId: number;
    totalStudentsWithFees: number;
    totalExpected: number;
    totalPaid: number;
    outstanding: number;
    paymentPercentage: number;
  };
}
```

**Error Response (500):**
```typescript
{
  success: false;
  error: "Academic year ID is required to fetch subclass fees summary, but none was provided or found." | "Error fetching subclass fees summary: [error message]";
}
```

### Get All Payments for a Fee
```http
GET /api/v1/fees/:feeId/payments
Authorization: Bearer <token>
```

**Description:**
Retrieves all payment transactions associated with a specific fee record.

**Authorization:**
- Any authenticated user.

**Path Parameters:**
- `feeId` (number): The ID of the fee record.

**Response (Success - 200):**
```typescript
{
  success: true;
  data: Array<{
    id: number;
    amount: number;
    paymentDate: string;
    receiptNumber?: string;
    paymentMethod: "EXPRESS_UNION" | "CCA" | "F3DC";
    feeId: number;
    recordedById?: number;
    createdAt: string;
    updatedAt: string;
  }>;
}
```

### Record a Payment for a Specific Fee
```http
POST /api/v1/fees/:feeId/payments
Authorization: Bearer <token>
```

**Description:**
Records a new payment transaction for a specific fee record and updates the fee's paid amount.

**Authorization:**
- `SUPER_MANAGER`, `MANAGER`, `PRINCIPAL`, `BURSAR`

**Path Parameters:**
- `feeId` (number): The ID of the fee record to record a payment for.

**Request Body:**
```typescript
{
  amount: number;
  paymentDate: string; // YYYY-MM-DD
  receiptNumber?: string; // Optional
  paymentMethod: "EXPRESS_UNION" | "CCA" | "F3DC";
  enrollmentId?: number; // Optional: Can be derived from feeId, but can be provided for clarity
  studentId?: number; // Optional: Can be derived from feeId, but can be provided for clarity
  academicYearId?: number; // Optional: Can be derived from feeId, but can be provided for clarity
}
```

**Response (Success - 201):**
```typescript
{
  success: true;
  data: {
    id: number;
    amount: number;
    paymentDate: string;
    receiptNumber?: string;
    paymentMethod: "EXPRESS_UNION" | "CCA" | "F3DC";
    feeId: number;
    recordedById?: number;
    createdAt: string;
    updatedAt: string;
  };
}
```

---

## Discipline Master/SDM

### Get All Discipline Issues
```http
GET /api/v1/discipline
Authorization: Bearer <token>
```

**Query Parameters:**
```typescript
{
  studentId?: number;
  classId?: number;
  subClassId?: number;
  startDate?: string;     // "YYYY-MM-DD"
  endDate?: string;       // "YYYY-MM-DD"
  description?: string;    // Search term
  includeAssignedBy?: boolean;
  includeReviewedBy?: boolean;
  includeStudent?: boolean;
  academicYearId?: number;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}
```

### Record Discipline Issue
```http
POST /api/v1/discipline
Authorization: Bearer <token>
```

**Request Body:**
```typescript
{
  studentId: number;
  issueType: string;       // e.g., "MISCONDUCT", "MORNING_LATENESS", "CLASS_ABSENCE", "OTHER"
  description: string;
  dateOccurred?: string;  // Defaults to today
  severity?: "LOW" | "MEDIUM" | "HIGH";
  actionTaken?: string;
  academicYearId?: number;
}
```

### Get Discipline History
```http
GET /api/v1/discipline/:studentId
Authorization: Bearer <token>
```

### Record Morning Lateness
```http
POST /api/v1/discipline/lateness
Authorization: Bearer <token>
```

**Request Body:**
```typescript
{
  studentId: number;
  date?: string;           // Defaults to today
  arrivalTime: string;    // "HH:mm"
  reason?: string;
  academicYearId?: number;
}
```

### Record Bulk Morning Lateness
```http
POST /api/v1/discipline/lateness/bulk
Authorization: Bearer <token>
```

**Request Body:**
```typescript
{
  students: Array<{
    studentId: number;
    arrivalTime: string;  // "HH:mm"
    reason?: string;
  }>;
  date?: string;           // Defaults to today
  academicYearId?: number;
}
```

### Get Lateness Statistics
```http
GET /api/v1/discipline/lateness/statistics
Authorization: Bearer <token>
```

**Query Parameters:**
```typescript
{
  startDate?: string;
  endDate?: string;
  classId?: number;
  subClassId?: number;
  academicYearId?: number;
}
```

### Get Daily Lateness Report
```http
GET /api/v1/discipline/lateness/daily-report
Authorization: Bearer <token>
```

**Query Parameters:**
```typescript
{
  date?: string;           // Defaults to today
  academicYearId?: number;
}
```

---

## Enhanced Messaging System

### Get Messaging Dashboard
```http
GET /api/v1/messaging/dashboard
Authorization: Bearer <token>
```

**Query Parameters:**
```typescript
{
  academicYearId?: number;
}
```

**Response (200):**
```typescript
{
  success: true;
  data: {
    totalThreads: number;
    unreadMessages: number;
    urgentMessages: number;
    activeThreads: number;
    recentActivity: number;
    messagesByCategory: Array<{
      category: string;
      count: number;
      unreadCount: number;
    }>;
    quickStats: {
      sentToday: number;
      receivedToday: number;
      pendingResponses: number;
      resolvedToday: number;
    };
    recentThreads: Array<MessageThread>;
    urgentAlerts: Array<{
      id: number;
      subject: string;
      sender: string;
      priority: string;
      sentAt: string;
      category: string;
    }>;
  };
}
```

### Get Message Threads
```http
GET /api/v1/messaging/threads
Authorization: Bearer <token>
```

**Query Parameters:**
```typescript
{
  category?: string;     // "GENERAL" | "ACADEMIC" | "DISCIPLINARY" | "FINANCIAL" | "ADMINISTRATIVE" | "EMERGENCY"
  priority?: string;     // "LOW" | "MEDIUM" | "HIGH" | "URGENT"
  status?: string;       // "ACTIVE" | "RESOLVED" | "ARCHIVED"
  search?: string;       // Search in subject, preview, tags
  page?: number;         // Default: 1
  limit?: number;        // Default: 20
}
```

**Response (200):**
```typescript
{
  success: true;
  data: Array<{
    id: number;
    subject: string;
    participants: Array<{
      userId: number;
      userName: string;
      userRole: string;
      isActive: boolean;
      lastReadAt?: string;
    }>;
    messageCount: number;
    lastMessageAt: string;
    lastMessagePreview: string;
    priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
    category: "GENERAL" | "ACADEMIC" | "DISCIPLINARY" | "FINANCIAL" | "ADMINISTRATIVE" | "EMERGENCY";
    status: "ACTIVE" | "RESOLVED" | "ARCHIVED";
    tags: Array<string>;
    createdAt: string;
    createdBy: {
      id: number;
      name: string;
      role: string;
    };
  }>;
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}
```

### Create Message Thread
```http
POST /api/v1/messaging/threads
Authorization: Bearer <token>
```

**Request Body:**
```typescript
{
  subject: string;
  participants: Array<number>;
  category?: string;     // Default: "GENERAL"
  priority?: string;     // Default: "MEDIUM"
  initialMessage: string;
  tags?: Array<string>;
}
```

**Response (201):**
```typescript
{
  success: true;
  message: "Message thread created successfully";
  data: MessageThread;
}
```

### Get Thread Messages
```http
GET /api/v1/messaging/threads/:threadId/messages
Authorization: Bearer <token>
```

**Path Parameters:**
- `threadId` (number): Thread ID

**Query Parameters:**
```typescript
{
  page?: number;         // Default: 1
  limit?: number;        // Default: 50
}
```

**Response (200):**
```typescript
{
  success: true;
  data: Array<{
    id: number;
    threadId: number;
    senderId: number;
    senderName: string;
    senderRole: string;
    content: string;
    messageType: "TEXT" | "ANNOUNCEMENT" | "ALERT" | "REMINDER" | "URGENT";
    priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
    isRead: boolean;
    readAt?: string;
    readBy: Array<{
      userId: number;
      userName: string;
      readAt: string;
    }>;
    attachments: Array<{
      id: number;
      fileName: string;
      fileUrl: string;
      fileSize: number;
      uploadedAt: string;
    }>;
    reactions: Array<{
      userId: number;
      userName: string;
      reaction: "👍" | "👎" | "❤️" | "😂" | "😮" | "😢" | "😡";
      reactedAt: string;
    }>;
    mentions: Array<{
      userId: number;
      userName: string;
      position: number;
    }>;
    deliveryStatus: "SENT" | "DELIVERED" | "READ" | "FAILED";
    sentAt: string;
    editedAt?: string;
    isEdited: boolean;
  }>;
  meta: PaginationMeta;
}
```

### Send Message to Thread
```http
POST /api/v1/messaging/threads/:threadId/messages
Authorization: Bearer <token>
```

**Path Parameters:**
- `threadId` (number): Thread ID

**Request Body:**
```typescript
{
  content: string;
  messageType?: string;          // Default: "TEXT"
  priority?: string;             // Default: "MEDIUM"
  mentions?: Array<number>;      // User IDs to mention
  attachments?: Array<{
    fileName: string;
    fileUrl: string;
    fileSize: number;
  }>;
}
```

**Response (201):**
```typescript
{
  success: true;
  message: "Message sent successfully";
  data: Message;
}
```

### Archive Message Thread
```http
PUT /api/v1/messaging/threads/:threadId/archive
Authorization: Bearer <token>
```

**Path Parameters:**
- `threadId` (number): Thread ID

**Response (200):**
```typescript
{
  success: true;
  message: "Thread archived successfully";
  data: {
    threadId: number;
    status: "ARCHIVED";
    archivedAt: string;
  };
}
```

### Unarchive Message Thread
```http
PUT /api/v1/messaging/threads/:threadId/unarchive
Authorization: Bearer <token>
```

**Path Parameters:**
- `threadId` (number): Thread ID

**Response (200):**
```typescript
{
  success: true;
  message: "Thread unarchived successfully";
  data: {
    threadId: number;
    status: "ACTIVE";
    unarchivedAt: string;
  };
}
```

### Get Cross-Role Communication Rules
```http
GET /api/v1/messaging/communication-rules
Authorization: Bearer <token>
```

**Response (200):**
```typescript
{
  success: true;
  data: {
    availableRoles: Array<{
      role: string;
      userCount: number;
      canReceiveMessages: boolean;
      canSendBroadcast: boolean;
    }>;
    communicationMatrix: Array<{
      fromRole: string;
      toRole: string;
      allowed: boolean;
      requiresApproval: boolean;
      restrictions: Array<string>;
    }>;
    broadcastCapabilities: Array<{
      role: string;
      canBroadcastTo: Array<string>;
      maxRecipients: number;
      requiresApproval: boolean;
    }>;
  };
}
```

### Get Notification Preferences
```http
GET /api/v1/messaging/preferences
Authorization: Bearer <token>
```

**Response (200):**
```typescript
{
  success: true;
  data: {
    userId: number;
    emailNotifications: boolean;
    pushNotifications: boolean;
    smsNotifications: boolean;
    priority: {
      low: boolean;
      medium: boolean;
      high: boolean;
      urgent: boolean;
    };
    categories: {
      general: boolean;
      academic: boolean;
      disciplinary: boolean;
      financial: boolean;
      administrative: boolean;
      emergency: boolean;
    };
    quietHours: {
      enabled: boolean;
      startTime: string;
      endTime: string;
    };
    digestFrequency: "IMMEDIATE" | "HOURLY" | "DAILY" | "WEEKLY" | "DISABLED";
  };
}
```

### Update Notification Preferences
```http
PUT /api/v1/messaging/preferences
Authorization: Bearer <token>
```

**Request Body:**
```typescript
{
  emailNotifications?: boolean;
  pushNotifications?: boolean;
  smsNotifications?: boolean;
  priority?: {
    low?: boolean;
    medium?: boolean;
    high?: boolean;
    urgent?: boolean;
  };
  categories?: {
    general?: boolean;
    academic?: boolean;
    disciplinary?: boolean;
    financial?: boolean;
    administrative?: boolean;
    emergency?: boolean;
  };
  quietHours?: {
    enabled?: boolean;
    startTime?: string;
    endTime?: string;
  };
  digestFrequency?: "IMMEDIATE" | "HOURLY" | "DAILY" | "WEEKLY" | "DISABLED";
}
```

**Response (200):**
```typescript
{
  success: true;
  message: "Notification preferences updated successfully";
  data: NotificationPreferences;
}
```

### Mark Messages as Read
```http
POST /api/v1/messaging/mark-read
Authorization: Bearer <token>
```

**Request Body:**
```typescript
{
  messageIds: Array<number>;
}
```

**Response (200):**
```typescript
{
  success: true;
  message: "X messages marked as read";
  data: {
    success: boolean;
    markedCount: number;
  };
}
```

### Search Messages
```http
GET /api/v1/messaging/search
Authorization: Bearer <token>
```

**Query Parameters:**
```typescript
{
  q: string;             // Search query (minimum 3 characters)
  category?: string;
  priority?: string;
  dateFrom?: string;     // "YYYY-MM-DD"
  dateTo?: string;       // "YYYY-MM-DD"
  senderId?: number;
  page?: number;         // Default: 1
  limit?: number;        // Default: 20
}
```

**Response (200):**
```typescript
{
  success: true;
  data: Array<{
    id: number;
    threadId: number;
    threadSubject: string;
    content: string;
    senderName: string;
    sentAt: string;
    category: string;
    priority: string;
    relevanceScore: number;
  }>;
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    query: string;
    filters: object;
  };
}
```

### Get Message Statistics
```http
GET /api/v1/messaging/statistics
Authorization: Bearer <token>
```

**Query Parameters:**
```typescript
{
  academicYearId?: number;
}
```

**Response (200):**
```typescript
{
  success: true;
  data: {
    totalThreads: number;
    totalMessages: number;
    unreadMessages: number;
    sentMessages: number;
    receivedMessages: number;
    averageResponseTime: string;
    mostActiveCategory: string;
    messagesByCategory: object;
    messagesByPriority: object;
    weeklyActivity: Array<{
      day: string;
      sent: number;
      received: number;
    }>;
  };
}
```

### Add Message Reaction
```http
POST /api/v1/messaging/messages/:messageId/reactions
Authorization: Bearer <token>
```

**Path Parameters:**
- `messageId` (number): Message ID

**Request Body:**
```typescript
{
  reaction: "👍" | "👎" | "❤️" | "😂" | "😮" | "😢" | "😡";
}
```

**Response (201):**
```typescript
{
  success: true;
  message: "Reaction added successfully";
  data: {
    messageId: number;
    userId: number;
    reaction: string;
    reactedAt: string;
  };
}
```

### Remove Message Reaction
```http
DELETE /api/v1/messaging/messages/:messageId/reactions
Authorization: Bearer <token>
```

**Path Parameters:**
- `messageId` (number): Message ID

**Request Body:**
```typescript
{
  reaction: string;
}
```

**Response (200):**
```typescript
{
  success: true;
  message: "Reaction removed successfully";
  data: {
    messageId: number;
    userId: number;
    reaction: string;
    removedAt: string;
  };
}
```

---

## Enhanced Manager Operations

### Get Manager Dashboard
```http
GET /api/v1/manager/dashboard
Authorization: Bearer <token>
```

**Query Parameters:**
```typescript
{
  academicYearId?: number;
}
```

**Response (200):**
```typescript
{
  success: true;
  data: {
    totalStaff: number;
    totalStudents: number;
    totalParents: number;
    activeClasses: number;
    pendingTasks: number;
    todaysSchedule: Array<{
      id: number;
      time: string;
      activity: string;
      location: string;
      attendees: Array<string>;
      status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
    }>;
    operationalMetrics: {
      attendanceRate: number;
      disciplineIssues: number;
      feeCollection: number;
      maintenanceRequests: number;
    };
    staffOverview: {
      present: number;
      absent: number;
      onLeave: number;
      newRequests: number;
    };
    recentActivities: Array<{
      id: number;
      activity: string;
      user: string;
      timestamp: string;
      category: "ACADEMIC" | "ADMINISTRATIVE" | "OPERATIONAL" | "FINANCIAL";
      priority: "LOW" | "MEDIUM" | "HIGH";
    }>;
    alerts: Array<{
      id: number;
      type: "WARNING" | "INFO" | "URGENT";
      message: string;
      timestamp: string;
      actionRequired: boolean;
    }>;
  };
}
```

### Get Staff Management Overview
```http
GET /api/v1/manager/staff-management
Authorization: Bearer <token>
```

**Query Parameters:**
```typescript
{
  academicYearId?: number;
}
```

**Response (200):**
```typescript
{
  success: true;
  data: {
    totalStaff: number;
    staffByRole: Array<{
      role: string;
      count: number;
      present: number;
      absent: number;
    }>;
    attendanceOverview: {
      presentToday: number;
      absentToday: number;
      onLeaveToday: number;
      attendanceRate: number;
    };
    leaveRequests: {
      pending: number;
      approved: number;
      rejected: number;
      total: number;
    };
    staffPerformance: Array<{
      staffId: number;
      staffName: string;
      role: string;
      department: string;
      performanceScore: number;
      attendanceRate: number;
      punctualityScore: number;
      tasksCompleted: number;
      feedback: string;
    }>;
    upcomingLeaves: Array<{
      staffId: number;
      staffName: string;
      leaveType: string;
      startDate: string;
      endDate: string;
      status: string;
    }>;
  };
}
```

### Get Operational Support Overview
```http
GET /api/v1/manager/operational-support
Authorization: Bearer <token>
```

**Response (200):**
```typescript
{
  success: true;
  data: {
    maintenanceRequests: {
      total: number;
      pending: number;
      inProgress: number;
      completed: number;
      urgent: number;
    };
    facilityStatus: Array<{
      facility: string;
      status: "OPERATIONAL" | "MAINTENANCE" | "OUT_OF_ORDER";
      lastChecked: string;
      nextMaintenance: string;
      urgency: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    }>;
    inventoryAlerts: Array<{
      item: string;
      currentStock: number;
      minimumRequired: number;
      status: "LOW_STOCK" | "OUT_OF_STOCK" | "REORDER_NEEDED";
      supplier: string;
      lastOrdered: string;
    }>;
    transportManagement: {
      totalVehicles: number;
      operational: number;
      maintenance: number;
      routesActive: number;
      studentsTransported: number;
    };
    securityOverview: {
      incidentsToday: number;
      visitorsRegistered: number;
      securityAlerts: number;
      accessControlStatus: "NORMAL" | "ALERT" | "LOCKDOWN";
    };
  };
}
```

### Get Administrative Support Overview
```http
GET /api/v1/manager/administrative-support
Authorization: Bearer <token>
```

**Response (200):**
```typescript
{
  success: true;
  data: {
    documentManagement: {
      pendingApprovals: number;
      expiringSoon: number;
      renewalsNeeded: number;
      totalDocuments: number;
    };
    communicationSummary: {
      noticesSent: number;
      messagesUnread: number;
      urgentCommunications: number;
      broadcastsScheduled: number;
    };
    eventCoordination: {
      upcomingEvents: number;
      eventsThisWeek: number;
      pendingApprovals: number;
      resourcesNeeded: number;
    };
    complianceTracking: {
      regulatoryCompliance: number;
      pendingAudits: number;
      policiesUpdated: number;
      trainingRequired: number;
    };
  };
}
```

### Generate Operational Report
```http
GET /api/v1/manager/reports/operational
Authorization: Bearer <token>
```

**Query Parameters:**
```typescript
{
  period?: string;           // "weekly" | "monthly" | "quarterly" | "yearly"
  academicYearId?: number;
}
```

**Response (200):**
```typescript
{
  success: true;
  data: {
    generatedAt: string;
    period: string;
    summary: {
      totalStaff: number;
      totalStudents: number;
      attendanceRate: number;
      disciplineIncidents: number;
      academicPerformance: number;
    };
    keyMetrics: Array<{
      metric: string;
      value: number | string;
      trend: "IMPROVING" | "DECLINING" | "STABLE";
      comparison: string;
    }>;
    recommendations: Array<string>;
  };
}
```

### Process Maintenance Request
```http
PUT /api/v1/manager/maintenance-requests/:requestId
Authorization: Bearer <token>
```

**Path Parameters:**
- `requestId` (number): Maintenance request ID

**Request Body:**
```typescript
{
  action: "APPROVE" | "REJECT" | "ASSIGN";
  assignedTo?: string;
  priority?: string;
  notes?: string;
  estimatedCompletion?: string;
}
```

**Response (200):**
```typescript
{
  success: true;
  message: "Maintenance request [action] successfully";
  data: {
    requestId: number;
    action: string;
    processedAt: string;
    assignedTo?: string;
    priority?: string;
    notes?: string;
    estimatedCompletion?: string;
  };
}
```

### Update Facility Status
```http
PUT /api/v1/manager/facilities/:facilityId/status
Authorization: Bearer <token>
```

**Path Parameters:**
- `facilityId` (number): Facility ID

**Request Body:**
```typescript
{
  status: "OPERATIONAL" | "MAINTENANCE" | "OUT_OF_ORDER";
  notes?: string;
}
```

**Response (200):**
```typescript
{
  success: true;
  message: "Facility status updated successfully";
  data: {
    facilityId: number;
    status: string;
    updatedAt: string;
    notes?: string;
  };
}
```

### Process Leave Request
```http
PUT /api/v1/manager/leave-requests/:requestId
Authorization: Bearer <token>
```

**Path Parameters:**
- `requestId` (number): Leave request ID

**Request Body:**
```typescript
{
  action: "APPROVE" | "REJECT";
  notes?: string;
}
```

**Response (200):**
```typescript
{
  success: true;
  message: "Leave request [action] successfully";
  data: {
    requestId: number;
    action: string;
    processedAt: string;
    processorNotes?: string;
  };
}
```

### Create Task Assignment
```http
POST /api/v1/manager/tasks
Authorization: Bearer <token>
```

**Request Body:**
```typescript
{
  title: string;
  description: string;
  assignedTo: Array<number>;    // User IDs
  priority?: string;            // "LOW" | "MEDIUM" | "HIGH" | "URGENT", default: "MEDIUM"
  dueDate: string;              // "YYYY-MM-DD"
  category?: string;            // "GENERAL" | "ADMINISTRATIVE" | "MAINTENANCE" | "ACADEMIC"
}
```

**Response (201):**
```typescript
{
  success: true;
  message: "Task assigned successfully";
  data: {
    id: number;
    title: string;
    description: string;
    assignedTo: Array<number>;
    priority: string;
    dueDate: string;
    category: string;
    status: "PENDING";
    createdAt: string;
    createdBy: string;
  };
}
```

### Get Staff Attendance Summary
```http
GET /api/v1/manager/staff-attendance
Authorization: Bearer <token>
```

**Query Parameters:**
```typescript
{
  startDate?: string;        // "YYYY-MM-DD"
  endDate?: string;          // "YYYY-MM-DD"
  departmentId?: number;
}
```

**Response (200):**
```typescript
{
  success: true;
  data: {
    period: {
      startDate: string;
      endDate: string;
    };
    summary: {
      totalStaff: number;
      averageAttendance: number;
      totalAbsences: number;
      punctualityRate: number;
    };
    byDepartment: Array<{
      department: string;
      attendance: number;
      staff: number;
    }>;
    trends: {
      thisWeek: number;
      lastWeek: number;
      trend: "IMPROVING" | "DECLINING" | "STABLE";
    };
    topPerformers: Array<{
      name: string;
      attendance: number;
      department: string;
    }>;
  };
}
```

### Get Facility Maintenance Schedule
```http
GET /api/v1/manager/maintenance-schedule
Authorization: Bearer <token>
```

**Query Parameters:**
```typescript
{
  facilityType?: string;
  status?: string;
}
```

**Response (200):**
```typescript
{
  success: true;
  data: {
    upcomingMaintenance: Array<{
      id: number;
      facility: string;
      type: string;
      scheduledDate: string;
      assignedTeam: string;
      priority: string;
      estimatedDuration: string;
    }>;
    overdueMaintenance: Array<{
      id: number;
      facility: string;
      type: string;
      originalDate: string;
      daysPastDue: number;
      priority: string;
    }>;
    maintenanceHistory: Array<{
      facility: string;
      completedDate: string;
      type: string;
      cost: number;
      technician: string;
    }>;
    totalFacilities: number;
    needingMaintenance: number;
    maintenanceCompliance: number;
  };
}
```

### Get Inventory Status
```http
GET /api/v1/manager/inventory
Authorization: Bearer <token>
```

**Query Parameters:**
```typescript
{
  category?: string;
  alertsOnly?: boolean;
}
```

**Response (200):**
```typescript
{
  success: true;
  data: {
    overview: {
      totalItems: number;
      lowStock: number;
      outOfStock: number;
      wellStocked: number;
    };
    categories: Array<{
      category: string;
      totalItems: number;
      alerts: number;
      value: number;
    }>;
    criticalItems: Array<{
      item: string;
      currentStock: number;
      minimumRequired: number;
      status: "OUT_OF_STOCK" | "LOW_STOCK";
      lastOrdered: string;
      supplier: string;
    }>;
    reorderSuggestions: Array<{
      item: string;
      suggestedQuantity: number;
      estimatedCost: number;
      urgency: "LOW" | "MEDIUM" | "HIGH";
    }>;
  };
}
```

---

## Discipline Master Enhanced (Behavioral Management)

### Get Discipline Master Enhanced Dashboard
```http
GET /api/v1/discipline-master/dashboard
Authorization: Bearer <token>
```

**Query Parameters:**
```typescript
{
  academicYearId?: number;
}
```

**Response (200):**
```typescript
{
  success: true;
  data: {
    totalActiveIssues: number;
    resolvedThisWeek: number;
    pendingResolution: number;
    studentsWithMultipleIssues: number;
    averageResolutionTime: number;
    attendanceRate: number;
    latenessIncidents: number;
    absenteeismCases: number;
    interventionSuccess: number;
    criticalCases: number;
    behavioralTrends: {
      thisMonth: number;
      lastMonth: number;
      trend: "IMPROVING" | "DECLINING" | "STABLE";
    };
    urgentInterventions: Array<{
      studentId: number;
      studentName: string;
      issueCount: number;
      riskLevel: "HIGH" | "MEDIUM" | "LOW";
      lastIncident: string;
      recommendedAction: string;
    }>;
    issuesByType: Array<{
      type: string;
      count: number;
      trend: "INCREASING" | "DECREASING" | "STABLE";
      resolution_rate: number;
    }>;
  };
}
```

### Get Behavioral Analytics
```http
GET /api/v1/discipline-master/behavioral-analytics
Authorization: Bearer <token>
```

**Query Parameters:**
```typescript
{
  academicYearId?: number;
}
```

**Response (200):**
```typescript
{
  success: true;
  data: {
    totalStudents: number;
    studentsWithIssues: number;
    behaviorScore: number;
    riskDistribution: {
      high: number;
      medium: number;
      low: number;
      none: number;
    };
    monthlyTrends: Array<{
      month: string;
      incidents: number;
      resolved: number;
      newCases: number;
    }>;
    issueTypeAnalysis: Array<{
      issueType: string;
      frequency: number;
      averageResolutionTime: number;
      recurrenceRate: number;
      effectiveInterventions: Array<string>;
    }>;
    classroomHotspots: Array<{
      subClassName: string;
      className: string;
      incidentCount: number;
      riskScore: number;
      primaryIssues: Array<string>;
    }>;
  };
}
```

### Get Student Behavior Profile
```http
GET /api/v1/discipline-master/student-profile/:studentId
Authorization: Bearer <token>
```

**Path Parameters:**
- `studentId` (number): Student ID

**Query Parameters:**
```typescript
{
  academicYearId?: number;
}
```

**Response (200):**
```typescript
{
  success: true;
  data: {
    studentId: number;
    studentName: string;
    matricule: string;
    className: string;
    subClassName: string;
    riskLevel: "HIGH" | "MEDIUM" | "LOW" | "NONE";
    behaviorScore: number;
    totalIncidents: number;
    recentIncidents: number;
    interventionsReceived: number;
    lastIncidentDate?: string;
    behaviorPattern: {
      mostCommonIssues: Array<string>;
      triggerFactors: Array<string>;
      improvementAreas: Array<string>;
      strengths: Array<string>;
    };
    interventionHistory: Array<{
      id: number;
      type: string;
      date: string;
      description: string;
      outcome: "SUCCESSFUL" | "PARTIALLY_SUCCESSFUL" | "UNSUCCESSFUL" | "ONGOING";
      followUpDate?: string;
    }>;
    recommendedActions: Array<{
      priority: "HIGH" | "MEDIUM" | "LOW";
      action: string;
      timeline: string;
      responsible: string;
    }>;
  };
}
```

### Get Early Warning System
```http
GET /api/v1/discipline-master/early-warning
Authorization: Bearer <token>
```

**Query Parameters:**
```typescript
{
  academicYearId?: number;
}
```

**Response (200):**
```typescript
{
  success: true;
  data: {
    criticalStudents: Array<{
      studentId: number;
      studentName: string;
      warningLevel: "CRITICAL" | "HIGH" | "MODERATE";
      riskFactors: Array<string>;
      triggerEvents: Array<string>;
      recommendedActions: Array<string>;
      urgency: "IMMEDIATE" | "WITHIN_WEEK" | "MONITOR";
    }>;
    riskIndicators: Array<{
      indicator: string;
      studentsAffected: number;
      severity: "HIGH" | "MEDIUM" | "LOW";
      trendDirection: "INCREASING" | "STABLE" | "DECREASING";
    }>;
    preventiveRecommendations: Array<{
      category: string;
      recommendation: string;
      targetStudents: number;
      priority: "HIGH" | "MEDIUM" | "LOW";
      implementationTimeline: string;
    }>;
  };
}
```

### Get Discipline Statistics
```http
GET /api/v1/discipline-master/statistics
Authorization: Bearer <token>
```

**Query Parameters:**
```typescript
{
  academicYearId?: number;
  startDate?: string;    // "YYYY-MM-DD"
  endDate?: string;      // "YYYY-MM-DD"
  classId?: number;
}
```

**Response (200):**
```typescript
{
  success: true;
  data: {
    overview: {
      totalStudents: number;
      studentsWithIssues: number;
      behaviorScore: number;
      riskDistribution: object;
    };
    trends: Array<object>;
    issueAnalysis: Array<object>;
    classroomHotspots: Array<object>;
    filters: {
      academicYearId?: number;
      startDate?: string;
      endDate?: string;
      classId?: number;
    };
  };
}
```

### Get Intervention Tracking
```http
GET /api/v1/discipline-master/interventions
Authorization: Bearer <token>
```

**Query Parameters:**
```typescript
{
  academicYearId?: number;
  status?: "PLANNED" | "ONGOING" | "COMPLETED" | "CANCELLED";
  studentId?: number;
}
```

**Response (200):**
```typescript
{
  success: true;
  data: Array<{
    id: number;
    studentId: number;
    studentName: string;
    interventionType: string;
    description: string;
    startDate: string;
    expectedEndDate?: string;
    actualEndDate?: string;
    status: "PLANNED" | "ONGOING" | "COMPLETED" | "CANCELLED";
    outcome?: "SUCCESSFUL" | "PARTIALLY_SUCCESSFUL" | "UNSUCCESSFUL";
    effectiveness: number;
    followUpRequired: boolean;
    nextReviewDate?: string;
    assignedTo: string;
    notes: Array<{
      date: string;
      note: string;
      recordedBy: string;
    }>;
  }>;
  meta: {
    total: number;
    filters: object;
  };
}
```

### Create Intervention Plan
```http
POST /api/v1/discipline-master/interventions
Authorization: Bearer <token>
```

**Request Body:**
```typescript
{
  studentId: number;
  interventionType: string;
  description: string;
  expectedEndDate?: string;  // "YYYY-MM-DD"
  assignedTo: string;
}
```

**Response (201):**
```typescript
{
  success: true;
  message: "Intervention plan created successfully";
  data: {
    id: number;
    studentId: number;
    interventionType: string;
    description: string;
    startDate: string;
    expectedEndDate?: string;
    status: "PLANNED";
    assignedTo: string;
    createdAt: string;
    createdBy: string;
  };
}
```

### Update Intervention Status
```http
PUT /api/v1/discipline-master/interventions/:interventionId
Authorization: Bearer <token>
```

**Path Parameters:**
- `interventionId` (number): Intervention ID

**Request Body:**
```typescript
{
  status: "PLANNED" | "ONGOING" | "COMPLETED" | "CANCELLED";
  outcome?: "SUCCESSFUL" | "PARTIALLY_SUCCESSFUL" | "UNSUCCESSFUL";
  notes?: string;
  effectiveness?: number;
}
```

**Response (200):**
```typescript
{
  success: true;
  message: "Intervention updated successfully";
  data: {
    id: number;
    status: string;
    outcome?: string;
    effectiveness?: number;
    updatedAt: string;
    updatedBy: string;
  };
}
```

### Get Risk Assessment
```http
GET /api/v1/discipline-master/risk-assessment
Authorization: Bearer <token>
```

**Query Parameters:**
```typescript
{
  academicYearId?: number;
  riskLevel?: "CRITICAL" | "HIGH" | "MODERATE";
  classId?: number;
}
```

**Response (200):**
```typescript
{
  success: true;
  data: {
    totalStudentsAssessed: number;
    riskLevelBreakdown: {
      critical: number;
      high: number;
      moderate: number;
    };
    studentsAtRisk: Array<object>;
    riskIndicators: Array<object>;
    recommendations: Array<object>;
    filters: object;
  };
}
```

### Generate Discipline Report
```http
GET /api/v1/discipline-master/reports
Authorization: Bearer <token>
```

**Query Parameters:**
```typescript
{
  academicYearId?: number;
  reportType?: string;      // Default: "comprehensive"
  startDate?: string;       // "YYYY-MM-DD"
  endDate?: string;         // "YYYY-MM-DD"
}
```

**Response (200):**
```typescript
{
  success: true;
  data: {
    reportInfo: {
      type: string;
      generatedAt: string;
      generatedBy: string;
      academicYearId?: number;
      dateRange: {
        startDate?: string;
        endDate?: string;
      };
    };
    executiveSummary: {
      totalActiveIssues: number;
      studentsWithIssues: number;
      behaviorScore: number;
      criticalCases: number;
      resolutionRate: number;
    };
    detailedAnalysis: {
      dashboard: object;
      behavioralAnalytics: object;
      earlyWarning: object;
    };
    recommendations: Array<string>;
    actionItems: Array<{
      priority: "HIGH" | "MEDIUM" | "LOW";
      action: string;
      responsible: string;
      deadline: string;
    }>;
  };
}
```

---

## Teacher Portal

### Get My Subjects
```http
GET /api/v1/teachers/me/subjects
Authorization: Bearer <token>
```

**Query Parameters:**
```typescript
{
  academicYearId?: number;
}
```

**Response (200):**
```typescript
{
  success: true;
  data: Array<{
    id: number;
    name: string;
    code: string;
    category: string;
    coefficient: number;
    // ... other subject details
    subclasses: Array<{
      id: number;
      name: string;
      className: string;
      studentCount: number;
    }>;
  }>;
}
```

### Get My Students
```http
GET /api/v1/teachers/me/students
Authorization: Bearer <token>
```

**Query Parameters:**
```typescript
{
  subClassId?: number;
  subjectId?: number;
  academicYearId?: number;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}
```

### Get My Subclasses
```http
GET /api/v1/teachers/me/subclasses
Authorization: Bearer <token>
```

### Get My Dashboard
```http
GET /api/v1/teachers/me/dashboard
Authorization: Bearer <token>
```

**Query Parameters:**
```typescript
{
  academicYearId?: number;
}
```

**Response (200):**
```typescript
{
  success: true;
  data: {
    subjectsTeaching: number;
    totalStudentsTeaching: number;
    marksToEnter: number;
    classesTaught: number;
    upcomingPeriods: number;
    weeklyHours: number;
    attendanceRate: number;
    totalHoursPerWeek: number;
  };
}
```

### Check My Access
```http
GET /api/v1/teachers/me/access-check
Authorization: Bearer <token>
```

**Query Parameters:**
```typescript
{
  subjectId?: number;
  subClassId?: number;
  academicYearId?: number;
}
```

### Get My Subject IDs
```http
GET /api/v1/teachers/me/subject-ids
Authorization: Bearer <token>
```

### Get My Subclass IDs
```http
GET /api/v1/teachers/me/subclass-ids
Authorization: Bearer <token>
```

### Get Current and Next Subjects from Timetable
```http
GET /api/v1/teachers/me/timetable/current-next
Authorization: Bearer <token>
```

**Description:**
Returns the teacher's current subject (if any) and next subject based on the current time and timetable. Useful for real-time display of what the teacher is teaching now and what's coming up next.

**Query Parameters:**
```typescript
{
  academicYearId?: number; // Optional, defaults to current academic year
}
```

**Response (200):**
```typescript
{
  success: true;
  data: {
    current: {
      period: {
        id: number;
        name: string;           // "Period 1"
        startTime: string;      // "08:00"
        endTime: string;        // "08:55"
        dayOfWeek: string;      // "MONDAY"
      };
      subject: {
        id: number;
        name: string;           // "Mathematics"
        category: string;       // "SCIENCE"
      };
      subClass: {
        id: number;
        name: string;           // "Form 1A"
        className: string;      // "Form 1"
      };
      isActive: boolean;        // true if currently in this period
      minutesRemaining: number; // Minutes left in current period
    } | null;
    next: {
      period: {
        id: number;
        name: string;           // "Period 2"
        startTime: string;      // "09:00"
        endTime: string;        // "09:55"
        dayOfWeek: string;      // "MONDAY"
      };
      subject: {
        id: number;
        name: string;           // "Physics"
        category: string;       // "SCIENCE"
      };
      subClass: {
        id: number;
        name: string;           // "Form 2A"
        className: string;      // "Form 2"
      };
      minutesToStart: number;   // Minutes until this period starts
      isToday: boolean;         // true if this is today's schedule
    } | null;
    requestTime: string;        // ISO timestamp of request
    currentDay: string;         // "MONDAY", "TUESDAY", etc.
  };
}
```

**Error Responses:**
- `401`: User not authenticated
- `500`: Server error (e.g., "No active academic year found")

### Get My Attendance Records (NEW - Teacher Attendance Management)
```http
GET /api/v1/teachers/me/attendance
Authorization: Bearer <token>
```

**Query Parameters:**
```typescript
{
  startDate?: string;    // "YYYY-MM-DD"
  endDate?: string;      // "YYYY-MM-DD"
  academicYearId?: number;
  page?: number;
  limit?: number;
}
```

**Response (200):**
```typescript
{
  success: true;
  data: Array<{
    id: number;
    date: string;
    status: "PRESENT" | "ABSENT" | "LATE" | "SICK_LEAVE" | "AUTHORIZED_LEAVE";
    reason?: string;
    periodId?: number;
    periodName?: string;
    recordedBy: string;
    createdAt: string;
  }>;
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
```

### Record Student Attendance (NEW - Teacher Attendance Management)
```http
POST /api/v1/teachers/attendance/record
Authorization: Bearer <token>
```

**Request Body:**
```typescript
{
  studentId: number;
  subClassId: number;
  subjectId: number;
  status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";
  reason?: string;
  periodId?: number;
  date?: string;         // "YYYY-MM-DD", defaults to today
  academicYearId?: number;
}
```

**Response (201):**
```typescript
{
  success: true;
  message: "Student attendance recorded successfully";
  data: {
    id: number;
    studentId: number;
    studentName: string;
    studentMatricule: string;
    date: string;
    status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";
    reason?: string;
    periodId?: number;
    periodName?: string;
    subClassName: string;
    subjectName: string;
  };
}
```

### Get Attendance Statistics (NEW - Teacher Attendance Management)
```http
GET /api/v1/teachers/attendance/statistics
Authorization: Bearer <token>
```

**Query Parameters:**
```typescript
{
  subClassId?: number;
  subjectId?: number;
  startDate?: string;    // "YYYY-MM-DD"
  endDate?: string;      // "YYYY-MM-DD"
  academicYearId?: number;
}
```

**Response (200):**
```typescript
{
  success: true;
  data: {
    totalStudents: number;
    presentToday: number;
    absentToday: number;
    lateToday: number;
    attendanceRate: number;
    weeklyTrends: Array<{
      date: string;
      presentCount: number;
      absentCount: number;
      lateCount: number;
      attendanceRate: number;
    }>;
    subClassBreakdown: Array<{
      subClassId: number;
      subClassName: string;
      totalStudents: number;
      attendanceRate: number;
      absentStudents: number;
    }>;
  };
}
```

### Get SubClass Attendance (NEW - Teacher Attendance Management)
```http
GET /api/v1/teachers/attendance/subclass/:id
Authorization: Bearer <token>
```

**Path Parameters:**
- `id` (number): SubClass ID

**Query Parameters:**
```typescript
{
  date?: string;         // "YYYY-MM-DD" - specific date filter
  subjectId?: number;
  academicYearId?: number;
  page?: number;
  limit?: number;
}
```

**Response (200):**
```typescript
{
  success: true;
  data: Array<{
    id: number;
    studentId: number;
    studentName: string;
    studentMatricule: string;
    date: string;
    status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";
    reason?: string;
    periodId?: number;
    periodName?: string;
    subClassName: string;
    subjectName: string;
  }>;
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
```

---

## HOD (Head of Department)

### Get HOD Dashboard
```http
GET /api/v1/hod/dashboard
Authorization: Bearer <token>
```

**Query Parameters:**
```typescript
{
  academicYearId?: number;
}
```

**Response (200):**
```typescript
{
  success: true;
  data: {
    totalSubjects: number;
    totalTeachers: number;
    totalStudents: number;
    totalClasses: number;
    departmentAverage: number;
    overallPassRate: number;
    subjectsManaged: Array<{
      id: number;
      name: string;
      category: string;
    }>;
  };
}
```

### Get Department Overview
```http
GET /api/v1/hod/department-overview
Authorization: Bearer <token>
```

**Query Parameters:**
```typescript
{
  academicYearId?: number;
}
```

**Response (200):**
```typescript
{
  success: true;
  data: Array<{
    subjectId: number;
    subjectName: string;
    subjectCategory: string;
    totalTeachers: number;
    totalStudents: number;
    totalClasses: number;
    averagePerformance: number;
    teachersAssigned: Array<{
      id: number;
      name: string;
      email: string;
      matricule: string;
      classesTeaching: number;
      studentsTeaching: number;
      averageMarks: number;
    }>;
  }>;
}
```

### Get Teachers in Department
```http
GET /api/v1/hod/teachers-in-department
Authorization: Bearer <token>
```

**Query Parameters:**
```typescript
{
  academicYearId?: number;
  search?: string;      // Search by name, email, or matricule
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}
```

**Response (200):**
```typescript
{
  success: true;
  data: Array<{
    id: number;
    name: string;
    email: string;
    matricule: string;
    phone: string;
    totalHoursPerWeek: number;
    subjectsTeaching: Array<{
      id: number;
      name: string;
      classCount: number;
      studentCount: number;
      averageMarks: number;
    }>;
    classesTeaching: Array<{
      id: number;
      name: string;
      className: string;
      studentCount: number;
      averageMarks: number;
    }>;
    performanceMetrics: {
      totalStudents: number;
      averageMarks: number;
      passRate: number;
      excellentRate: number;
    };
  }>;
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
```

### Get Subject Performance
```http
GET /api/v1/hod/subject-performance
Authorization: Bearer <token>
```

**Query Parameters:**
```typescript
{
  subjectId?: number;   // Optional filter for specific subject
  academicYearId?: number;
}
```

**Response (200):**
```typescript
{
  success: true;
  data: Array<{
    subjectId: number;
    subjectName: string;
    totalStudents: number;
    totalClasses: number;
    averageMarks: number;
    passRate: number;
    excellentRate: number;
    classBreakdown: Array<{
      subClassId: number;
      subClassName: string;
      className: string;
      studentCount: number;
      averageMarks: number;
      teacherName: string;
      teacherId: number;
    }>;
    performanceTrends: Array<{
      sequenceNumber: number;
      termName: string;
      averageMarks: number;
      passRate: number;
    }>;
  }>;
}
```

### Assign Teacher to Subject
```http
POST /api/v1/hod/assign-teacher-subject
Authorization: Bearer <token>
```

**Request Body:**
```typescript
{
  subjectId: number;
  teacherId: number;
}
```

**Response (201):**
```typescript
{
  success: true;
  message: "Teacher successfully assigned to subject";
  data: {
    id: number;
    subjectId: number;
    teacherId: number;
    teacher: {
      id: number;
      name: string;
      email: string;
      matricule: string;
    };
    subject: {
      id: number;
      name: string;
      category: string;
    };
    createdAt: string;
  };
}
```

### Get Department Analytics
```http
GET /api/v1/hod/department-analytics
Authorization: Bearer <token>
```

**Query Parameters:**
```typescript
{
  academicYearId?: number;
}
```

**Response (200):**
```typescript
{
  success: true;
  data: Array<{
    subjectId: number;
    subjectName: string;
    totalTeachers: number;
    totalStudents: number;
    totalClasses: number;
    overallAverage: number;
    overallPassRate: number;
    topPerformingClass: {
      subClassName: string;
      averageMarks: number;
    } | null;
    lowestPerformingClass: {
      subClassName: string;
      averageMarks: number;
    } | null;
    teacherPerformanceRanking: Array<{
      teacherId: number;
      teacherName: string;
      averageMarks: number;
      studentsCount: number;
      classesCount: number;
    }>;
    monthlyTrends: Array<{
      month: string;
      averageMarks: number;
      studentsEvaluated: number;
    }>;
  }>;
}
```

### Get Teacher Performance
```http
GET /api/v1/hod/teacher-performance/:teacherId
Authorization: Bearer <token>
```

**Path Parameters:**
- `teacherId` (number): Teacher ID

**Query Parameters:**
```typescript
{
  academicYearId?: number;
}
```

**Response (200):**
```typescript
{
  success: true;
  data: {
    teacher: {
      id: number;
      name: string;
      email: string;
      matricule: string;
    };
    overallPerformance: {
      totalMarks: number;
      averageScore: number;
      passRate: number;
      excellentRate: number;
    };
    subjectPerformance: Array<{
      subjectId: number;
      subjectName: string;
      totalMarks: number;
      averageScore: number;
      passRate: number;
    }>;
    classPerformance: Array<{
      subClassId: number;
      subClassName: string;
      className: string;
      totalMarks: number;
      averageScore: number;
      passRate: number;
    }>;
  };
}
```

### Get My Subjects
```http
GET /api/v1/hod/my-subjects
Authorization: Bearer <token>
```

**Response (200):**
```typescript
{
  success: true;
  data: Array<{
    id: number;
    name: string;
    category: string;
    totalTeachers: number;
    totalClasses: number;
    totalStudents: number;
  }>;
}
```

---

## Timetable Management

### Get Subclass Timetable
```http
GET /api/v1/timetables/subclass/:subclassId
Authorization: Bearer <token>
```

**Description:**
Retrieves the timetable for a specific subclass for a given academic year.

**Authorization:**
- Any authenticated user.

**Path Parameters:**
- `subclassId` (number): The ID of the subclass.

**Query Parameters:**
```typescript
{
  academicYearId?: number; // Optional: The ID of the academic year. Defaults to current year if not provided.
}
```

**Response (200):**
```typescript
{
  success: true;
  data: {
    subClass: {
      id: number;
      name: string;
      class: {
        id: number;
        name: string;
      };
    };
    academicYearId: number;
    slots: Array<{
      id: number;
      subClassId: number;
      subClassName: string;
      classId: number;
      className: string;
      day: "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY";
      periodId: number;
      periodName: string;
      periodStartTime: string;
      periodEndTime: string;
      isBreak: boolean;
      subjectId: number | null;
      subjectName: string | null;
      subjectCategory: string | null;
      teacherId: number | null;
      teacherName: string | null;
    }>;
  };
}
```

### Get Full School Timetable
```http
GET /api/v1/timetables/full-school
Authorization: Bearer <token>
```

**Description:**
Retrieves the complete timetable for the entire school for a specific academic year.

**Authorization:**
- `SUPER_MANAGER`, `PRINCIPAL`, `VICE_PRINCIPAL`, `MANAGER`

**Query Parameters:**
```typescript
{
  academicYearId?: number; // Optional: The ID of the academic year. Defaults to current year if not provided.
}
```

**Response (200):**
```typescript
{
  success: true;
  data: {
    academicYearId: number;
    academicYearName: string;
    timetableSlots: Array<{
      id: number;
      subClassId: number;
      subClassName: string;
      classId: number;
      className: string;
      day: "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY";
      periodId: number;
      periodName: string;
      periodStartTime: string;
      periodEndTime: string;
      isBreak: boolean;
      subjectId: number | null;
      subjectName: string | null;
      subjectCategory: string | null;
      teacherId: number | null;
      teacherName: string | null;
    }>;
  };
}
```

### Bulk Update Timetable
```http
POST /api/v1/timetables/subclass/:subclassId/bulk-update
Authorization: Bearer <token>
```

**Description:**
Updates multiple timetable slots at once for a specific subclass. This allows for creating, updating, or deleting assignments for periods within a subclass for a given academic year.

**Authorization:**
- `SUPER_MANAGER`, `MANAGER`, `PRINCIPAL`, `VICE_PRINCIPAL`

**Path Parameters:**
- `subclassId` (number): The ID of the subclass for which to update the timetable.

**Request Body:**
```typescript
{
  academicYearId?: number; // Optional: The ID of the academic year. Defaults to current year if not provided.
  slots: Array<{
    periodId: number;         // Required: The ID of the period to update.
    subjectId: number | null; // Required: The ID of the subject to assign, or `null` to clear the subject.
    teacherId: number | null; // Required: The ID of the teacher to assign, or `null` to clear the teacher.
  }>;
}
```

**Response (200 - All Successful):**
```typescript
{
  success: true;
  message: "Timetable updated successfully.";
  data: {
    updated: number; // Number of existing slots updated.
    created: number; // Number of new slots created.
    deleted: number; // Number of slots deleted (where subjectId and teacherId were null).
  };
  errors: []; // Empty array if no errors.
}
```

**Response (207 - Partial Success):**
```typescript
{
  success: false;
  message: "Partial success with errors.";
  data: {
    updated: number;
    created: number;
    deleted: number;
  };
    errors: Array<{
    periodId: number; // The ID of the period that had an error.
    error: string;    // Description of the error.
  }>;
}
```

**Error Responses:**
- `400 Bad Request`:
  ```typescript
  {
    success: false;
    error: "subclassId and slots array are required" | "Invalid periodId format" | "Both subjectId and teacherId must be provided (or both null to clear)" | "Invalid subjectId or teacherId format" | "Teacher with ID X is not authorized to teach subject Y";
  }
  ```
- `401 Unauthorized`:
  ```typescript
  {
    success: false;
    error: "User not authenticated for assignment.";
  }
  ```
- `404 Not Found`:
  ```typescript
  {
    success: false;
    error: "No active academic year found for timetable update." | "Subclass not found" | "Period with ID X not found";
  }
  ```
- `409 Conflict`:
  ```typescript
  {
    success: false;
    error: "Teacher conflict: already assigned to [subclassName] on [dayOfWeek] during period [periodName]";
  }
  ```
- `500 Internal Server Error`:
  ```typescript
  {
    success: false;
    error: "Internal server error message";
  }
  ```
- `503 Service Unavailable`:
  ```typescript
  {
    success: false;
    error: "Database connection error. Please ensure the database is running and accessible.";
}
```

---

## Academic Year Management

Endpoints for creating, retrieving, updating, and managing academic years and their associated terms.

### Get All Academic Years
```http
GET /api/v1/academic-years
Authorization: Bearer <token>
```
**Description:**
Retrieves a list of all academic years in the system, including their terms and exam sequences.

**Authorization:**
- Any authenticated user.

**Response (200):**
```typescript
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "2024-2025",
      "startDate": "2024-09-01T00:00:00.000Z",
      "endDate": "2025-06-30T00:00:00.000Z",
      "isCurrent": true,
      "terms": [
        {
          "id": 1,
          "name": "Term 1",
          "startDate": "2024-09-01T00:00:00.000Z",
          "endDate": "2024-12-20T00:00:00.000Z",
          "feeDeadline": "2024-10-15T00:00:00.000Z"
        }
      ],
      "examSequences": []
    }
  ]
}
```

### Create Academic Year
```http
POST /api/v1/academic-years
Authorization: Bearer <token>
```
**Description:**
Creates a new academic year. If terms are not provided, it defaults to creating 'Term 1', 'Term 2', and 'Term 3'.

**Authorization:**
- `SUPER_MANAGER`

**Request Body:**
```typescript
{
  "name": "2025-2026",
  "startDate": "2025-09-01",
  "endDate": "2026-06-30",
  "terms": [
    {
      "name": "Term 1",
      "startDate": "2025-09-01",
      "endDate": "2025-12-19",
      "feeDeadline": "2025-10-15"
    }
  ]
}
```

**Response (201):**
```typescript
{
  "success": true,
  "data": {
    "id": 2,
    "name": "2025-2026",
    "startDate": "2025-09-01T00:00:00.000Z",
    "endDate": "2026-06-30T00:00:00.000Z",
    "isCurrent": false,
    "terms": [
      {
        "id": 2,
        "name": "Term 1",
        "startDate": "2025-09-01T00:00:00.000Z",
        "endDate": "2025-12-19T00:00:00.000Z",
        "feeDeadline": "2025-10-15T00:00:00.000Z"
      }
    ]
  }
}
```

### Get Current Academic Year
```http
GET /api/v1/academic-years/current
Authorization: Bearer <token>
```
**Description:**
Retrieves the academic year currently marked as `isCurrent: true`.

**Authorization:**
- Any authenticated user.

**Response (200):**
```typescript
{
  "success": true,
  "data": {
    "id": 1,
    "name": "2024-2025",
    "startDate": "2024-09-01T00:00:00.000Z",
    "endDate": "2025-06-30T00:00:00.000Z",
    "isCurrent": true,
    "terms": []
  }
}
```
**Error Response (404):**
```typescript
{
  "success": false,
  "error": "No current academic year found"
}
```

### Get Available Academic Years for Role
```http
GET /api/v1/academic-years/available-for-role
Authorization: Bearer <token>
```

**Description:**
Returns academic years where the authenticated user has the specified role assigned. For global roles (e.g., `SUPER_MANAGER`), it returns all academic years. This is primarily used in the login workflow after role selection.

**Authorization:**
- Any authenticated user.

**Query Parameters:**
```typescript
{
  "role": string; // Required. E.g., "PRINCIPAL", "TEACHER", "BURSAR"
}
```

**Response (200):**
```typescript
{
  "success": true,
  "data": {
    "academicYears": [
      {
        "id": 1,
        "name": "2024-2025",
        "startDate": "2024-09-01T00:00:00.000Z",
        "endDate": "2025-06-30T00:00:00.000Z",
        "isCurrent": true,
        "terms": [],
        "studentCount": 150,
        "classCount": 3,
        "status": "ACTIVE"
      }
    ],
    "currentAcademicYearId": 1,
    "userHasAccessTo": [1]
  }
}
```
**Error Response (400):**
```typescript
{
  "success": false,
  "error": "Role parameter is required"
}
```

### Get Academic Year by ID
```http
GET /api/v1/academic-years/:id
Authorization: Bearer <token>
```
**Description:**
Retrieves details for a specific academic year by its ID.

**Authorization:**
- Any authenticated user.

**Path Parameters:**
- `id` (number): The ID of the academic year.

**Response (200):**
```typescript
{
  "success": true,
  "data": {
    "id": 1,
    "name": "2024-2025",
    "startDate": "2024-09-01T00:00:00.000Z",
    "endDate": "2025-06-30T00:00:00.000Z",
    "isCurrent": true,
    "terms": []
  }
}
```
**Error Response (404):**
```typescript
{
  "success": false,
  "error": "Academic year not found"
}
```

### Add a Term to an Academic Year
```http
POST /api/v1/academic-years/:id/terms
Authorization: Bearer <token>
```
**Description:**
Adds a new term to an existing academic year.

**Authorization:**
- `SUPER_MANAGER`

**Path Parameters:**
- `id` (number): The ID of the academic year.

**Request Body:**
```typescript
{
  "name": "Term 2",
  "startDate": "2025-01-06",
  "endDate": "2025-04-04",
  "feeDeadline": "2025-02-15"
}
```

**Response (201):**
```typescript
{
  "success": true,
  "message": "Term \"Term 2\" added to academic year 2024-09-01T00:00:00.000Z",
  "data": {
    "id": 3,
    "name": "Term 2",
    "startDate": "2025-01-06T00:00:00.000Z",
    "endDate": "2025-04-04T00:00:00.000Z",
    "feeDeadline": "2025-02-15T00:00:00.000Z",
    "academicYearId": 1
  }
}
```

### Get All Terms for an Academic Year
```http
GET /api/v1/academic-years/:id/terms
Authorization: Bearer <token>
```
**Description:**
Retrieves all terms associated with a specific academic year.

**Authorization:**
- Any authenticated user.

**Path Parameters:**
- `id` (number): The ID of the academic year.

**Response (200):**
```typescript
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Term 1",
      "startDate": "2024-09-01T00:00:00.000Z",
      "endDate": "2024-12-20T00:00:00.000Z",
      "feeDeadline": "2024-10-15T00:00:00.000Z",
      "academicYearId": 1,
      "examSequences": []
    }
  ]
}
```

### Update an Academic Year
```http
PUT /api/v1/academic-years/:id
Authorization: Bearer <token>
```
**Description:**
Updates the details of an academic year.

**Authorization:**
- `SUPER_MANAGER`

**Path Parameters:**
- `id` (number): The ID of the academic year.

**Request Body:**
```typescript
{
  "startDate": "2024-09-02",
  "endDate": "2025-07-01"
}
```

**Response (200):**
```typescript
{
  "success": true,
  "data": {
    "id": 1,
    "name": "2024-2025",
    "startDate": "2024-09-02T00:00:00.000Z",
    "endDate": "2025-07-01T00:00:00.000Z",
    "isCurrent": true,
    "terms": []
  }
}
```

### Set an Academic Year as Current
```http
POST /api/v1/academic-years/:id/set-current
Authorization: Bearer <token>
```
**Description:**
Sets a specific academic year as the current one. This action will unset any other academic year that was previously current.

**Authorization:**
- `SUPER_MANAGER`

**Path Parameters:**
- `id` (number): The ID of the academic year to set as current.

**Response (200):**
```typescript
{
  "success": true,
  "message": "Academic year set as current successfully",
  "data": {
    "id": 1,
    "name": "2024-2025",
    "startDate": "2024-09-02T00:00:00.000Z",
    "endDate": "2025-07-01T00:00:00.000Z",
    "isCurrent": true,
    "terms": []
  }
}
```

### Delete an Academic Year
```http
DELETE /api/v1/academic-years/:id
Authorization: Bearer <token>
```
**Description:**
Deletes an academic year. This operation will fail if the academic year is referenced by other records like enrollments, exams, or user roles.

**Authorization:**
- `SUPER_MANAGER`

**Path Parameters:**
- `id` (number): The ID of the academic year to delete.

**Response (200):**
```typescript
{
  "success": true,
  "message": "Academic year deleted successfully"
}
```
**Error Response (409 - Conflict):**
```typescript
{
  "success": false,
  "error": "Cannot delete academic year. It is referenced by: 15 enrollment(s), 10 user role(s)"
}
```

---

## Student Management

### Get All Students
```http
GET /api/v1/students
Authorization: Bearer <token>
```

**Query Parameters:**
```typescript
{
  academicYearId?: number;
  enrollmentStatus?: "enrolled" | "not_enrolled" | "all";
  name?: string;           // Search by name
  matricule?: string;      // Search by matricule
  gender?: "MALE" | "FEMALE";
  subClassId?: number;
  page?: number;
  limit?: number;
  sortBy?: "name" | "matricule" | "dateOfBirth" | "createdAt";
  sortOrder?: "asc" | "desc";
}
```

**Response (200):**
```typescript
{
  success: true;
  data: Array<{
    id: number;
    matricule: string;
    name: string;
    dateOfBirth: string;
    placeOfBirth: string;
    gender: "MALE" | "FEMALE";
    residence: string;
    formerSchool?: string;
    isNewStudent: boolean;
    status: "NOT_ENROLLED" | "ENROLLED" | "ASSIGNED_TO_CLASS" | "GRADUATED" | "TRANSFERRED" | "SUSPENDED";
    enrollments: Array<{
      id: number;
      classId: number;
      subClassId?: number;
      academicYearId: number;
      repeater: boolean;
      photo?: string;
      subClass?: {
        id: number;
        name: string;
        class: {
          id: number;
          name: string;
        };
      };
    }>;
    parents: Array<{
      id: number;
      parent: {
        id: number;
        name: string;
        email: string;
        phone: string;
      };
    }>;
  }>;
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
```

### Create Student
```http
POST /api/v1/students
Authorization: Bearer <token>
```

**Request Body:**
```typescript
{
  matricule?: string;      // Auto-generated if not provided
  name: string;
  dateOfBirth: string;   // "YYYY-MM-DD"
  placeOfBirth: string;
  gender: "MALE" | "FEMALE";
  residence: string;
  formerSchool?: string;
  isNewStudent?: boolean; // Defaults to true
  status?: "NOT_ENROLLED" | "ENROLLED" | "ASSIGNED_TO_CLASS" | "GRADUATED" | "TRANSFERRED" | "SUSPENDED";
}
```

### Get Student by ID
```http
GET /api/v1/students/:id
Authorization: Bearer <token>
```

**Query Parameters:**
```typescript
{
  academicYearId?: number;
}
```

### Update Student
```http
PUT /api/v1/students/:id
Authorization: Bearer <token>
```

### Enroll Student
```http
POST /api/v1/students/:id/enroll
Authorization: Bearer <token>
```

**Request Body:**
```typescript
{
  subClassId: number;
  academicYearId?: number;
  photo?: string;
  repeater?: boolean;      // Defaults to false
}
```

### Link Parent
```http
POST /api/v1/students/:id/link-parent
Authorization: Bearer <token>
```

**Request Body:**
```typescript
{
  parentId: number;
}
```

### Unlink Parent
```http
DELETE /api/v1/students/:studentId/parents/:parentId
Authorization: Bearer <token>
```

### Get Students by Subclass
```http
GET /api/v1/students/subclass/:subClassId
Authorization: Bearer <token>
```

### Get Students by Parent
```http
GET /api/v1/students/parent/:parentId
Authorization: Bearer <token>
```

### Get Parents by Student
```http
GET /api/v1/students/:studentId/parents
Authorization: Bearer <token>
```

### Search Students
```http
GET /api/v1/students/search
Authorization: Bearer <token>
```

**Description:**
Searches for students by their name or matricule, with optional filtering by academic year and pagination.

**Authorization:**
- Any authenticated user.

**Query Parameters:**
```typescript
{
  q: string;             // Required: Search query (student name or matricule, minimum 1 character)
  academicYearId?: number; // Optional: Filter by academic year
  page?: number;         // Optional: Page number for pagination (default: 1)
  limit?: number;        // Optional: Number of items per page (default: 10)
}
```

**Response (200):**
```typescript
{
  success: true;
  data: {
    data: Array<{
      id: number;
      matricule: string;
      name: string;
      dateOfBirth: string;
      placeOfBirth: string;
      gender: "MALE" | "FEMALE";
      residence: string;
      formerSchool?: string;
      isNewStudent: boolean;
      status: "NOT_ENROLLED" | "ENROLLED" | "ASSIGNED_TO_CLASS" | "GRADUATED" | "TRANSFERRED" | "SUSPENDED";
      enrollments: Array<{
        id: number;
        classId: number;
        subClassId?: number;
        academicYearId: number;
        repeater: boolean;
        photo?: string;
        subClass?: {
          id: number;
          name: string;
          class: {
            id: number;
            name: string;
          };
        };
      }>;
      parents: Array<{
        id: number;
        parent: {
          id: number;
          name: string;
          email: string;
          phone: string;
        };
      }>;
    }>;
    meta: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  };
}
```

**Error Responses:**
```typescript
{
  success: false;
  error: "Search query is required and must be at least 1 character"
}
```

### Enroll Student
```http
POST /api/v1/students/:id/enroll
Authorization: Bearer <token>
```

**Request Body:**
```typescript
{
  subClassId: number;
  academicYearId?: number;
  photo?: string;
  repeater?: boolean;      // Defaults to false
}
```

### Assign Student to Subclass
```http
POST /api/v1/students/:id/assign-subclass
Authorization: Bearer <token>
```

**Description:**
Assigns a student to a subclass. The student must have an existing enrollment in the specified academic year and not currently be assigned to a subclass.

**Authorization:**
- `SUPER_MANAGER`, `MANAGER`, `PRINCIPAL`, `VICE_PRINCIPAL`, `BURSAR`

**Path Parameters:**
- `id` (number): The ID of the student.

**Request Body:**
```typescript
{
  subClassId: number;   // Required: The ID of the subclass to assign.
  academicYearId?: number; // Optional: The ID of the academic year. Defaults to current year.
}
```

**Response (200):**
```typescript
{
  success: true;
  message: "Student successfully assigned to subclass.";
  data: {
    id: number;
    studentId: number;
    classId: number;
    subClassId: number;
    academicYearId: number;
    repeater: boolean;
    enrollmentDate: string;
    createdAt: string;
    updatedAt: string;
    // ... other updated enrollment details
  };
}
```

**Error Responses:**
- `400`: `Invalid Student ID format` or `Invalid Subclass ID format` or `Invalid Academic Year ID format`
- `404`: `Student with ID X is not enrolled in academic year Y.` or `Subclass with ID X not found.`
- `409`: `Student with ID X is already assigned to a subclass (Subclass Name/ID) for academic year Y.`
- `500`: `Error assigning student to subclass: [error message]`

### Link Parent
```http
POST /api/v1/students/:id/link-parent
Authorization: Bearer <token>
```

**Request Body:**
```typescript
{
  parentId: number;
}
```

### Unlink Parent
```http
DELETE /api/v1/students/:studentId/parents/:parentId
Authorization: Bearer <token>
```

### Get Students by Subclass
```http
GET /api/v1/students/subclass/:subClassId
Authorization: Bearer <token>
```

### Get Students by Parent
```http
GET /api/v1/students/parent/:parentId
Authorization: Bearer <token>
```

### Get Parents by Student
```http
GET /api/v1/students/:studentId/parents
Authorization: Bearer <token>
```

### Search Students
```http
GET /api/v1/students/search
Authorization: Bearer <token>
```

**Description:**
Searches for students by their name or matricule, with optional filtering by academic year and pagination.

**Authorization:**
- Any authenticated user.

**Query Parameters:**
```typescript
{
  q: string;             // Required: Search query (student name or matricule, minimum 1 character)
  academicYearId?: number; // Optional: Filter by academic year
  page?: number;         // Optional: Page number for pagination (default: 1)
  limit?: number;        // Optional: Number of items per page (default: 10)
}
```

**Response (200):**
```typescript
{
  success: true;
  data: {
    data: Array<{
      id: number;
      matricule: string;
      name: string;
      dateOfBirth: string;
      placeOfBirth: string;
      gender: "MALE" | "FEMALE";
      residence: string;
      formerSchool?: string;
      isNewStudent: boolean;
      status: "NOT_ENROLLED" | "ENROLLED" | "ASSIGNED_TO_CLASS" | "GRADUATED" | "TRANSFERRED" | "SUSPENDED";
      enrollments: Array<{
        id: number;
        classId: number;
        subClassId?: number;
        academicYearId: number;
        repeater: boolean;
        photo?: string;
        subClass?: {
          id: number;
          name: string;
          class: {
            id: number;
            name: string;
          };
        };
      }>;
      parents: Array<{
        id: number;
        parent: {
          id: number;
          name: string;
          email: string;
          phone: string;
        };
      }>;
    }>;
    meta: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  };
}
```

**Error Responses:**
```typescript
{
  success: false;
  error: "Search query is required and must be at least 1 character"
}
```

---

## User Management

### Get All Users
```http
GET /api/v1/users
Authorization: Bearer <token>
```

**Query Parameters:**
```typescript
{
  name?: string;
  email?: string;
  role?: "SUPER_MANAGER" | "MANAGER" | "PRINCIPAL" | "VICE_PRINCIPAL" | "BURSAR" | "DISCIPLINE_MASTER" | "TEACHER" | "HOD" | "PARENT" | "STUDENT";
  status?: string;
  academicYearId?: number;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}
```

### Create User
```http
POST /api/v1/users
Authorization: Bearer <token>
```

**Request Body:**
```typescript
{
  name: string;
  email: string;
  password: string;
  gender: "MALE" | "FEMALE";
  dateOfBirth: string;   // "YYYY-MM-DD"
  phone: string;
  address: string;
  idCardNum?: string;
  photo?: string;
  roles: Array<{
    role: "SUPER_MANAGER" | "MANAGER" | "PRINCIPAL" | "VICE_PRINCIPAL" | "BURSAR" | "DISCIPLINE_MASTER" | "TEACHER" | "HOD" | "PARENT" | "STUDENT";
    academicYearId?: number; // null for global roles
  }>;
}
```

### Get User by ID
```http
GET /api/v1/users/:id
Authorization: Bearer <token>
```

### Update User
```http
PUT /api/v1/users/:id
Authorization: Bearer <token>
```

### Delete User
```http
DELETE /api/v1/users/:id
Authorization: Bearer <token>
```

### Get User Profile
```http
GET /api/v1/users/me
Authorization: Bearer <token>
```

### Update User Profile
```http
PUT /api/v1/users/me
Authorization: Bearer <token>
```

### Assign Role
```http
POST /api/v1/users/:id/roles
Authorization: Bearer <token>
```

**Request Body:**
```typescript
{
  role: string;
  academicYearId?: number; // null for global roles
}
```

### Remove Role
```http
DELETE /api/v1/users/:id/roles
Authorization: Bearer <token>
```

**Request Body:**
```typescript
{
  role: string;
  academicYearId?: number;
}
```

---

## Exam and Marks Management

### Get All Exams
```http
GET /api/v1/exams
Authorization: Bearer <token>
```

**Query Parameters:**
```typescript
{
  academicYearId?: number;
  subjectId?: number;
  page?: number;
  limit?: number;
}
```

**Response (200):**
```typescript
{
  success: true;
  data: Array<{
    id: number;
    name: string;
    subjectId: number;
    academicYearId: number;
    examDate: string;
    duration: number;
    // ... other exam fields
  }>;
}
```

### Get Student Marks
```http
GET /api/v1/marks
Authorization: Bearer <token>
```

**Query Parameters:**
```typescript
{
  studentId?: number;
  subjectId?: number;
  examSequenceId?: number;
  academicYearId?: number;
  page?: number;
  limit?: number;
}
```

**Response (200):**
```typescript
{
  success: true;
  data: Array<{
    id: number;
    enrollmentId: number;
    teacherId: number;
    examSequenceId: number;
    score: number;
    subClassSubjectId: number;
    createdAt: string;
    updatedAt: string;
    // ... other mark fields
  }>;
}
```

---

## Class and Subject Management

### Get All Classes
```http
GET /api/v1/classes
Authorization: Bearer <token>
```
**Description:**
Retrieves a list of all classes in the system. Can include subclasses and student counts. Supports pagination and filtering. Set `legacy=true` to get a nested structure with subclasses.

**Authorization:**
- Any authenticated user.

**Query Parameters:**
```typescript
{
  name?: string;           // Optional: Filter by class name
  id?: number;             // Optional: Filter by class ID
  level?: number;          // Optional: Filter by class level
  legacy?: "true" | "false"; // Optional: If "true", returns classes with nested subclasses and student counts (old format)
  page?: number;           // Optional: Page number for pagination (default: 1)
  limit?: number;          // Optional: Number of items per page (default: 10)
  sortBy?: "name" | "id";  // Optional: Field to sort by (e.g., "name", "id")
  sortOrder?: "asc" | "desc"; // Optional: Sort order (default: "asc")
}
```

**Response (200 - Paginated):**
```typescript
{
  success: true;
  data: Array<{
    id: number;
    name: string;
    level: number;
    baseFee: number;
    newStudentFee: number;
    oldStudentFee: number;
    miscellaneousFee: number;
    firstTermFee: number;
    secondTermFee: number;
    thirdTermFee: number;
    createdAt: string;
    updatedAt: string;
    studentCount: number; // Total students in all subclasses of this class for the current academic year
    academicYearId: number; // ID of the current academic year
  }>;
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}
```

**Response (200 - Legacy `legacy=true`):**
```typescript
{
  success: true;
  data: Array<{
    id: number;
    name: string;
    maxStudents: number; // Max students for the class (theoretical, not enforced)
    level: number;
    baseFee: number;
    newStudentFee: number;
    oldStudentFee: number;
    miscellaneousFee: number;
    firstTermFee: number;
    secondTermFee: number;
    thirdTermFee: number;
    createdAt: string;
    updatedAt: string;
    studentCount: number; // Total students across all subclasses of this class
    academicYearId: number; // Current academic year ID
    subClasses: Array<{
      id: number;
      name: string;
      classId: number;
      classMasterId?: number;
      studentCount: number; // Students in this specific subclass
      createdAt: string;
      updatedAt: string;
      subClassSubjects: Array<{ // Simplified for legacy, shows subject IDs
        subjectId: number;
      }>;
    }>;
  }>;
}
```

### Create Class
```http
POST /api/v1/classes
Authorization: Bearer <token>
```
**Description:**
Creates a new class.

**Authorization:**
- `SUPER_MANAGER`, `MANAGER`, `PRINCIPAL`

**Request Body:**
```typescript
{
  name: string;        // Required
  level?: number;      // Optional
  baseFee?: number;
  newStudentFee?: number;
  oldStudentFee?: number;
  miscellaneousFee?: number;
  firstTermFee?: number;
  secondTermFee?: number;
  thirdTermFee?: number;
}
```

**Response (201):**
```typescript
{
  success: true;
  message: "Class created successfully";
  data: {
    id: number;
    name: string;
    level: number;
    baseFee: number;
    newStudentFee: number;
    oldStudentFee: number;
    miscellaneousFee: number;
    firstTermFee: number;
    secondTermFee: number;
    thirdTermFee: number;
    createdAt: string;
    updatedAt: string;
  };
}
```

### Get Class by ID
```http
GET /api/v1/classes/:id
Authorization: Bearer <token>
```
**Description:**
Retrieves details for a specific class by its ID, including its subclasses, their class masters, and student counts for each.

**Authorization:**
- Any authenticated user.

**Path Parameters:**
- `id` (number): The ID of the class.

**Response (200):**
```typescript
{
  success: true;
  data: {
    id: number;
    name: string;
    level: number;
    baseFee: number;
    newStudentFee: number;
    oldStudentFee: number;
    miscellaneousFee: number;
    firstTermFee: number;
    secondTermFee: number;
    thirdTermFee: number;
    createdAt: string;
    updatedAt: string;
    studentCount: number; // Total students across all subclasses of this class for the current academic year
    academicYearId: number; // ID of the current academic year
    subClasses: Array<{
      id: number;
      name: string;
      classId: number;
      classMasterId?: number;
      createdAt: string;
      updatedAt: string;
      studentCount: number; // Students in this specific subclass for the current academic year
      classMaster?: { // Class master user object if assigned
        id: number;
        name: string;
        matricule: string;
        email: string;
        // ... other user fields
      };
    }>;
  };
}
```

### Update Class Details
```http
PUT /api/v1/classes/:id
Authorization: Bearer <token>
```
**Description:**
Updates the details of a class. If fee-related fields are updated, it triggers an update of all associated student fees.

**Authorization:**
- `SUPER_MANAGER`, `MANAGER`, `PRINCIPAL`

**Path Parameters:**
- `id` (number): The ID of the class to update.

**Request Body:**
```typescript
{
  name?: string;
  level?: number;
  baseFee?: number;
  newStudentFee?: number;
  oldStudentFee?: number;
  miscellaneousFee?: number;
  firstTermFee?: number;
  secondTermFee?: number;
  thirdTermFee?: number;
}
```

**Response (200):**
```typescript
{
  success: true;
  message: "Class updated successfully";
  data: {
    id: number;
    name: string;
    level: number;
    baseFee: number;
    newStudentFee: number;
    oldStudentFee: number;
    miscellaneousFee: number;
    firstTermFee: number;
    secondTermFee: number;
    thirdTermFee: number;
    createdAt: string;
    updatedAt: string;
  };
}
```

### Delete a Class
```http
DELETE /api/v1/classes/:id
Authorization: Bearer <token>
```
**Description:**
Deletes a class. This operation will fail if there are any subclasses or enrollments associated with this class.

**Authorization:**
- `SUPER_MANAGER`, `MANAGER`, `PRINCIPAL`

**Path Parameters:**
- `id` (number): The ID of the class to delete.

**Response (200):**
```typescript
{
  success: true;
  message: "Class deleted successfully";
}
```
**Error Responses:**
- `400`: `Invalid class ID format`
- `404`: `Class not found`
- `409`: `Cannot delete class, it has associated subclasses` or `Cannot delete class, it has associated enrollments`

### Get All Subclasses
```http
GET /api/v1/classes/sub-classes
GET /api/v1/classes/subclasses
Authorization: Bearer <token>
```
**Description:**
Retrieves a paginated list of all subclasses across all classes, or filtered by a specific class. Can optionally include subjects taught in each subclass and their coefficients.

**Authorization:**
- Any authenticated user.

**Query Parameters:**
```typescript
{
  name?: string;           // Optional: Filter by subclass name
  id?: number;             // Optional: Filter by subclass ID
  classId?: number;        // Optional: Filter by parent class ID
  includeSubjects?: "true" | "false"; // Optional: If "true", includes subjects taught in the subclass with their coefficients.
  page?: number;           // Optional: Page number for pagination (default: 1)
  limit?: number;          // Optional: Number of items per page (default: 10)
  sortBy?: "name" | "id";  // Optional: Field to sort by
  sortOrder?: "asc" | "desc"; // Optional: Sort order
}
```

**Response (200):**
```typescript
{
  success: true;
  data: Array<{
    id: number;
    name: string;
    classId: number;
    classMasterId?: number;
    createdAt: string;
    updatedAt: string;
    class: { // Parent class details
      id: number;
      name: string;
      level: number;
      // ... other class fields
    };
    classMaster?: { // Class master user object if assigned
      id: number;
      name: string;
      matricule: string;
      email: string;
      // ... other user fields
    };
    studentCount: number; // Number of students enrolled in this subclass for the current academic year
    academicYearId: number; // ID of the current academic year
    subjects?: Array<{ // Included if includeSubjects=true
      id: number;
      name: string;
      category: string;
      coefficient: number; // Coefficient specific to this subclass-subject link
      // ... other subject fields
    }>;
  }>;
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}
```

### Get Subclasses for a Specific Class
```http
GET /api/v1/classes/:id/sub-classes
GET /api/v1/classes/:id/subclasses
Authorization: Bearer <token>
```
**Description:**
Retrieves all subclasses belonging to a specific class. This endpoint redirects to the general `getAllSubclasses` endpoint, applying the class ID filter. It inherits all query parameters from `GET /api/v1/classes/sub-classes`.

**Authorization:**
- Any authenticated user.

**Path Parameters:**
- `id` (number): The ID of the parent class.

**Query Parameters:**
- Same as `GET /api/v1/classes/sub-classes` (e.g., `includeSubjects`, `page`, `limit`).

**Response (200):**
- Same as `GET /api/v1/classes/sub-classes`, but filtered by `classId`.

### Add a New Subclass to a Class
```http
POST /api/v1/classes/:id/sub-classes
POST /api/v1/classes/:id/subclasses
Authorization: Bearer <token>
```
**Description:**
Adds a new subclass to an existing class.

**Authorization:**
- `SUPER_MANAGER`, `MANAGER`, `PRINCIPAL`

**Path Parameters:**
- `id` (number): The ID of the class to add the subclass to.

**Request Body:**
```typescript
{
  name: string; // Required: Name of the new subclass (e.g., "A", "B", "Form 1A")
}
```

**Response (201):**
```typescript
{
  success: true;
  message: "Subclass created successfully";
  data: {
    id: number;
    name: string;
    classId: number;
    createdAt: string;
    updatedAt: string;
  };
}
```

### Update a Subclass
```http
PUT /api/v1/classes/:id/sub-classes/:subClassId
PUT /api/v1/classes/:id/subclasses/:subClassId
Authorization: Bearer <token>
```
**Description:**
Updates the details of a specific subclass.

**Authorization:**
- `SUPER_MANAGER`, `MANAGER`, `PRINCIPAL`

**Path Parameters:**
- `id` (number): The ID of the parent class.
- `subClassId` (number): The ID of the subclass to update.

**Request Body:**
```typescript
{
  name: string; // Required: New name for the subclass
}
```

**Response (200):**
```typescript
{
  success: true;
  message: "Subclass updated successfully";
  data: {
    id: number;
    name: string;
    classId: number;
    classMasterId?: number;
    createdAt: string;
    updatedAt: string;
  };
}
```

### Delete a Subclass
```http
DELETE /api/v1/classes/:id/sub-classes/:subClassId
DELETE /api/v1/classes/:id/subclasses/:subClassId
Authorization: Bearer <token>
```
**Description:**
Deletes a specific subclass. This operation will fail if students are currently enrolled in the subclass.

**Authorization:**
- `SUPER_MANAGER`, `MANAGER`, `PRINCIPAL`

**Path Parameters:**
- `id` (number): The ID of the parent class (for verification).
- `subClassId` (number): The ID of the subclass to delete.

**Response (200):**
```typescript
{
  success: true;
  message: "Subclass deleted successfully";
}
```
**Error Response (409 - Conflict):**
```typescript
{
  success: false;
  error: "Cannot be deleted, subclass already has students";
}
```

### Assign a Class Master to a Subclass
```http
POST /api/v1/classes/sub-classes/:subClassId/class-master
POST /api/v1/classes/subclasses/:subClassId/class-master
Authorization: Bearer <token>
```
**Description:**
Assigns a user (who must have a 'TEACHER' role in the current academic year) as the class master for a specific subclass.

**Authorization:**
- `SUPER_MANAGER`, `MANAGER`, `PRINCIPAL`

**Path Parameters:**
- `subClassId` (number): The ID of the subclass.

**Request Body:**
```typescript
{
  userId: number; // Required: The ID of the user to assign as class master
}
```

**Response (200):**
```typescript
{
  success: true;
  data: {
    id: number;
    name: string;
    classId: number;
    classMasterId: number;
    createdAt: string;
    updatedAt: string;
    class: { /* ... parent class details ... */ };
    classMaster: { /* ... assigned teacher user details ... */ };
  };
}
```
**Error Responses:**
- `400`: `Invalid subclass ID format` or `User ID is required` or `User with ID X does not have a teacher role in the current academic year`
- `404`: `Subclass with ID X not found` or `User with ID X not found`

### Get the Class Master of a Subclass
```http
GET /api/v1/classes/sub-classes/:subClassId/class-master
GET /api/v1/classes/subclasses/:subClassId/class-master
Authorization: Bearer <token>
```
**Description:**
Retrieves the user details of the class master assigned to a specific subclass.

**Authorization:**
- Any authenticated user.

**Path Parameters:**
- `subClassId` (number): The ID of the subclass.

**Response (200):**
```typescript
{
  success: true;
  data: {
    id: number;
    name: string;
    email: string;
    matricule: string;
    gender: "MALE" | "FEMALE";
    dateOfBirth: string;
    phone: string;
    address: string;
    idCardNum?: string;
    photo?: string;
    status: string;
    createdAt: string;
    updatedAt: string;
    userRoles: Array<{
      id: number;
      userId: number;
      role: "TEACHER";
      academicYearId?: number;
      createdAt: string;
      updatedAt: string;
    }>;
  };
}
```
**Response (200 - No Master):**
```typescript
{
  success: true;
  data: null;
}
```
**Error Responses:**
- `400`: `Invalid subclass ID format`
- `404`: `Subclass with ID X not found`

### Remove the Class Master from a Subclass
```http
DELETE /api/v1/classes/sub-classes/:subClassId/class-master
DELETE /api/v1/classes/subclasses/:subClassId/class-master
Authorization: Bearer <token>
```
**Description:**
Removes the assigned class master from a specific subclass.

**Authorization:**
- `SUPER_MANAGER`, `PRINCIPAL`

**Path Parameters:**
- `subClassId` (number): The ID of the subclass.

**Response (200):**
```typescript
{
  success: true;
  data: {
    id: number;
    name: string;
    classId: number;
    classMasterId: null; // Class master is now null
    createdAt: string;
    updatedAt: string;
    class: { /* ... parent class details ... */ };
  };
}
```
**Error Responses:**
- `400`: `Invalid subclass ID format`
- `404`: `Subclass with ID X not found`

### Get All Subjects for a Specific Subclass
```http
GET /api/v1/classes/sub-classes/:subClassId/subjects
GET /api/v1/classes/subclasses/:subClassId/subjects
Authorization: Bearer <token>
```
**Description:**
Retrieves all subjects assigned to a specific subclass, including the coefficient for each subject within that subclass.

**Authorization:**
- Any authenticated user.

**Path Parameters:**
- `subClassId` (number): The ID of the subclass.

**Response (200):**
```typescript
{
  success: true;
  data: Array<{
    id: number;
    name: string;
    code?: string;
    category: "SCIENCE" | "ARTS" | "COMMERCIAL" | "LANGUAGES" | "OTHER";
    coefficient: number; // Coefficient specific to this subclass-subject link
    createdAt: string;
    updatedAt: string;
  }>;
}
```
**Error Responses:**
- `400`: `Invalid sub_class ID format`
- `404`: `Subclass with ID X not found`


### Get All Subjects
```http
GET /api/v1/subjects
Authorization: Bearer <token>
```
**Description:**
Retrieves a paginated list of all subjects in the system. Can optionally include assigned teachers and linked subclasses.

**Authorization:**
- Any authenticated user.

**Query Parameters:**
```typescript
{
  name?: string;           // Optional: Filter by subject name
  category?: "SCIENCE" | "ARTS" | "COMMERCIAL" | "LANGUAGES" | "OTHER"; // Optional: Filter by subject category
  id?: number;             // Optional: Filter by subject ID
  includeTeachers?: "true" | "false"; // Optional: If "true", includes teachers assigned to the subject.
  includeSubClasses?: "true" | "false"; // Optional: If "true", includes subclasses linked to the subject with their coefficients.
  page?: number;           // Optional: Page number for pagination (default: 1)
  limit?: number;          // Optional: Number of items per page (default: 10)
  sortBy?: "name" | "id" | "category"; // Optional: Field to sort by
  sortOrder?: "asc" | "desc"; // Optional: Sort order
}
```

**Response (200):**
```typescript
{
  success: true;
  data: Array<{
    id: number;
    name: string;
    code?: string;
    category: "SCIENCE" | "ARTS" | "COMMERCIAL" | "LANGUAGES" | "OTHER";
    createdAt: string;
    updatedAt: string;
    teachers?: Array<{ // Included if includeTeachers=true
      id: number;
      name: string;
      email: string;
      matricule: string;
      // ... other teacher user details
    }>;
    subClasses?: Array<{ // Included if includeSubClasses=true
      id: number;
      name: string;
      className: string; // Name of the parent class
      classId: number;
      coefficient: number; // Coefficient specific to this subject-subclass link
      // ... other subclass details
    }>;
  }>;
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}
```

### Create New Subject
```http
POST /api/v1/subjects
Authorization: Bearer <token>
```
**Description:**
Creates a new subject.

**Authorization:**
- `SUPER_MANAGER`, `MANAGER`, `PRINCIPAL`

**Request Body:**
```typescript
{
  name: string;                               // Required: Name of the subject (e.g., "Mathematics")
  category: "SCIENCE" | "ARTS" | "COMMERCIAL" | "LANGUAGES" | "OTHER"; // Required: Category of the subject
}
```

**Response (201):**
```typescript
{
  success: true;
  data: {
    id: number;
    name: string;
    category: "SCIENCE" | "ARTS" | "COMMERCIAL" | "LANGUAGES" | "OTHER";
    createdAt: string;
    updatedAt: string;
  };
}
```

### Get Subject by ID
```http
GET /api/v1/subjects/:id
Authorization: Bearer <token>
```
**Description:**
Retrieves details for a specific subject by its ID, including assigned teachers and linked subclasses with their coefficients.

**Authorization:**
- Any authenticated user.

**Path Parameters:**
- `id` (number): The ID of the subject.

**Response (200):**
```typescript
{
  success: true;
  data: {
    id: number;
    name: string;
    code?: string;
    category: "SCIENCE" | "ARTS" | "COMMERCIAL" | "LANGUAGES" | "OTHER";
    createdAt: string;
    updatedAt: string;
    teachers: Array<{ // Always included
      id: number;
      name: string;
      email: string;
      matricule: string;
      // ... other teacher user details
    }>;
    subClasses: Array<{ // Always included
      id: number;
      name: string;
      className: string; // Name of the parent class
      classId: number;
      coefficient: number; // Coefficient specific to this subject-subclass link
      // ... other subclass details
    }>;
  };
}
```

### Update Subject Details
```http
PUT /api/v1/subjects/:id
Authorization: Bearer <token>
```
**Description:**
Updates the details of a subject.

**Authorization:**
- `SUPER_MANAGER`, `MANAGER`, `PRINCIPAL`

**Path Parameters:**
- `id` (number): The ID of the subject to update.

**Request Body:**
```typescript
{
  name?: string;     // Optional: New name for the subject
  category?: "SCIENCE" | "ARTS" | "COMMERCIAL" | "LANGUAGES" | "OTHER"; // Optional: New category for the subject
}
```

**Response (200):**
```typescript
{
  success: true;
  message: "Subject updated successfully";
  data: {
    id: number;
    name: string;
    category: string;
    createdAt: string;
    updatedAt: string;
  };
}
```

### Delete a Subject
```http
DELETE /api/v1/subjects/:id
Authorization: Bearer <token>
```
**Description:**
Deletes a subject. This will also delete all associated teacher assignments and subclass links for this subject.

**Authorization:**
- `SUPER_MANAGER`, `MANAGER`, `PRINCIPAL`

**Path Parameters:**
- `id` (number): The ID of the subject to delete.

**Response (200):**
```typescript
{
  success: true;
  message: "Subject deleted successfully";
}
```

### Assign a Teacher to a Subject
```http
POST /api/v1/subjects/:id/teachers
Authorization: Bearer <token>
```
**Description:**
Assigns a teacher to a specific subject. If the assignment already exists, it returns the existing record.

**Authorization:**
- `SUPER_MANAGER`, `MANAGER`, `PRINCIPAL`

**Path Parameters:**
- `id` (number): The ID of the subject to assign the teacher to.

**Request Body:**
```typescript
{
  teacherId: number; // Required: The ID of the user (teacher) to assign.
}
```

**Response (201):**
```typescript
{
  success: true;
  message: "Teacher assigned successfully";
  data: {
    teacher: {
      id: number;
      subjectId: number;
      teacherId: number;
      createdAt: string;
      updatedAt: string;
    };
  };
}
```

### Link Subject to a Subclass (with Coefficient)
```http
POST /api/v1/subjects/:id/sub-classes
Authorization: Bearer <token>
```
**Description:**
Links a subject to a specific subclass and sets its coefficient for that subclass.

**Authorization:**
- `SUPER_MANAGER`, `MANAGER`, `PRINCIPAL`

**Path Parameters:**
- `id` (number): The ID of the subject to link.

**Request Body:**
```typescript
{
  subClassId: number;   // Required: The ID of the subclass.
  coefficient: number;  // Required: The coefficient for this subject in this subclass.
}
```

**Response (201):**
```typescript
{
  success: true;
  data: {
    id: number;
    subjectId: number;
    subClassId: number;
    coefficient: number;
    createdAt: string;
    updatedAt: string;
  };
}
```

### Unlink Subject from a Subclass
```http
DELETE /api/v1/subjects/:subjectId/sub-classes/:subClassId
Authorization: Bearer <token>
```
**Description:**
Removes the link between a subject and a specific subclass. This effectively means the subject is no longer taught in that subclass.

**Authorization:**
- `SUPER_MANAGER`, `MANAGER`, `PRINCIPAL`

**Path Parameters:**
- `subjectId` (number): The ID of the subject to unlink.
- `subClassId` (number): The ID of the subclass from which to unlink the subject.

**Response (200):**
```typescript
{
  success: true;
  message: "Subject ID X successfully unlinked from subclass ID Y";
}
```
**Error Responses:**
- `400`: `Invalid subject ID or subclass ID`
- `404`: `Subject-subclass link not found` or `Subject with ID X is not linked to subclass with ID Y`
- `500`: `Failed to unlink subject from subclass: [error message]`

### Assign a Subject to All Subclasses of a Class
```http
POST /api/v1/subjects/:subjectId/classes/:classId
Authorization: Bearer <token>
```
**Description:**
Assigns a subject to all existing subclasses within a specified class. If a subject is already linked to a subclass, the existing link is returned.

**Authorization:**
- `SUPER_MANAGER`, `MANAGER`, `PRINCIPAL`

**Path Parameters:**
- `subjectId` (number): The ID of the subject to assign.
- `classId` (number): The ID of the class whose subclasses will receive the subject.

**Request Body:**
```typescript
{
  coefficient: number;  // Required: The coefficient for this subject in all assigned subclasses.
}
```

**Response (201):**
```typescript
{
  success: true;
  message: "Subject successfully assigned to all subclasses of class ID X";
  data: Array<{ // Array of SubClassSubject objects created or found
    id: number;
    subjectId: number;
    subClassId: number;
    coefficient: number;
    createdAt: string;
    updatedAt: string;
  }>;
}
```
**Error Responses:**
- `400`: `Invalid class ID or subject ID` or `Coefficient are required`
- `404`: `No subclasses found for class with ID X` or `Subject with ID X not found`

---

## Dashboard Endpoints

### Get User Dashboard
```http
GET /api/v1/users/me/dashboard
Authorization: Bearer <token>
```

**Query Parameters:**
```typescript
{
  role?: "SUPER_MANAGER" | "MANAGER" | "PRINCIPAL" | "VICE_PRINCIPAL" | "BURSAR" | "DISCIPLINE_MASTER" | "TEACHER" | "HOD" | "PARENT" | "STUDENT";
  academicYearId?: number;
}
```

**Response varies by role:**

#### Super Manager Dashboard:
```typescript
{
  success: true;
  data: {
    academicYearCount: number;
    personnelCount: number;
    studentCount: number;
    classCount: number;
    subClassCount: number;
    totalFeesCollected: number;
    pendingReports: number;
    systemModifications: Array<object>;
    upcomingDeadlines: Array<object>;
  };
}
```

#### Principal Dashboard:
```typescript
{
  success: true;
  data: {
    totalStudents: number;
    totalTeachers: number;
    totalClasses: number;
    activeExamSequences: number;
    pendingDisciplineIssues: number;
    averageAttendanceRate: number;
  };
}
```

#### Vice Principal Dashboard:
```typescript
{
  success: true;
  data: {
    assignedSubClasses: number;
    totalStudentsUnderSupervision: number;
    studentsAwaitingAssignment: number;
    completedInterviews: number;
    pendingInterviews: number;
    recentDisciplineIssues: number;
    classesWithPendingReports: number;
    teacherAbsences: number;
  };
}
```

#### Bursar Dashboard:
```typescript
{
  success: true;
  data: {
    totalFeesExpected: number;
    totalFeesCollected: number;
    pendingPayments: number;
    collectionRate: number;
    recentTransactions: number;
    newStudentsThisMonth: number;
    paymentMethods: Array<{
      method: string;
      count: number;
      totalAmount: number;
    }>;
  };
}
```

#### Discipline Master Dashboard:
```typescript
{
  success: true;
  data: {
    pendingDisciplineIssues: number;
    resolvedThisWeek: number;
    studentsWithMultipleIssues: number;
    averageResolutionTime: number;
    attendanceRate: number;
    latenessIncidents: number;
    absenteeismCases: number;
  };
}
```

#### Teacher Dashboard:
```typescript
{
  success: true;
  data: {
    subjectsTeaching: number;
    totalStudentsTeaching: number;
    marksToEnter: number;
    classesTaught: number;
    upcomingPeriods: number;
    weeklyHours: number;
    attendanceRate: number;
    totalHoursPerWeek: number;
  };
}
```

---

## Authorization Testing

### Unauthorized Access (No Token)
```http
GET /api/v1/users
```

**Response (401):**
```typescript
{
  success: false;
  error: "User not authenticated";
}
```

### Teacher Access to Admin Endpoint
```http
GET /api/v1/users
Authorization: Bearer <teacher_token>
```

**Response (403):**
```typescript
{
  success: false;
  error: "Access denied: insufficient permissions";
}
```

### Parent Access to Teacher Endpoint
```http
GET /api/v1/teachers/me/subjects
Authorization: Bearer <parent_token>
```

**Response (403):**
```typescript
{
  success: false;
  error: "Access denied: insufficient permissions";
}
```

---

## Super Manager (System Administration)

### Get System Settings
```http
GET /api/v1/system/settings
Authorization: Bearer <token>
```

**Response (200):**
```typescript
{
  success: true;
  data: {
    schoolName: string;
    schoolAddress: string;
    schoolPhone: string;
    schoolEmail: string;
    schoolLogo?: string;
    academicYearStartMonth: number; // 1-12
    defaultClassSize: number;
    enableNotifications: boolean;
    enableParentPortal: boolean;
    enableQuizSystem: boolean;
    defaultPassMark: number;
    currencySymbol: string; // "FCFA"
    timezone: string;
    backupEnabled: boolean;
    backupFrequency: "DAILY" | "WEEKLY" | "MONTHLY";
    maintenanceMode: boolean;
  };
}
```

### Update System Settings
```http
PUT /api/v1/system/settings
Authorization: Bearer <token>
```

**Request Body:**
```typescript
{
  schoolName?: string;
  schoolAddress?: string;
  schoolPhone?: string;
  schoolEmail?: string;
  schoolLogo?: string;
  academicYearStartMonth?: number;
  defaultClassSize?: number;
  enableNotifications?: boolean;
  enableParentPortal?: boolean;
  enableQuizSystem?: boolean;
  defaultPassMark?: number;
  currencySymbol?: string;
  timezone?: string;
  backupEnabled?: boolean;
  backupFrequency?: "DAILY" | "WEEKLY" | "MONTHLY";
  maintenanceMode?: boolean;
}
```

**Response (200):**
```typescript
{
  success: true;
  message: "System settings updated successfully";
  data: {
    // Updated settings object (same structure as GET)
  };
}
```

### Get System Health
```http
GET /api/v1/system/health
Authorization: Bearer <token>
```

**Response (200):**
```typescript
{
  success: true;
  data: {
    status: "HEALTHY" | "WARNING" | "CRITICAL";
    uptime: number; // seconds
    databaseStatus: "CONNECTED" | "DISCONNECTED" | "ERROR";
    memoryUsage: {
      used: number; // MB
      total: number; // MB
      percentage: number;
    };
    diskUsage: {
      used: number; // MB
      total: number; // MB
      percentage: number;
    };
    activeUsers: number;
    recentErrors: number;
    lastBackup: string | null;
    systemVersion: string;
  };
}
```

### Perform System Backup
```http
POST /api/v1/system/backup
Authorization: Bearer <token>
```

**Response (201):**
```typescript
{
  success: true;
  message: "System backup completed successfully";
  data: {
    id: string;
    timestamp: string;
    type: "MANUAL" | "SCHEDULED";
    status: "SUCCESS" | "FAILED" | "IN_PROGRESS";
    filePath?: string;
    fileSize?: number; // bytes
    duration?: number; // milliseconds
    errorMessage?: string;
  };
}
```

### Perform System Cleanup
```http
POST /api/v1/system/cleanup
Authorization: Bearer <token>
```

**Response (200):**
```typescript
{
  success: true;
  message: "System cleanup completed. X records cleaned, Y.Z MB freed.";
  data: {
    operations: Array<{
      operation: string;
      recordsCleaned: number;
      spaceFreed: number; // bytes
      duration: number; // milliseconds
    }>;
    summary: {
      totalRecordsCleaned: number;
      totalSpaceFreed: number; // bytes
      totalSpaceFreedMB: number;
    };
  };
}
```

### Get System Logs
```http
GET /api/v1/system/logs
Authorization: Bearer <token>
```

**Query Parameters:**
```typescript
{
  level?: "INFO" | "WARNING" | "ERROR" | "CRITICAL";
  category?: "AUTH" | "DATABASE" | "SYSTEM" | "USER_ACTION" | "ERROR";
  startDate?: string; // "YYYY-MM-DD"
  endDate?: string; // "YYYY-MM-DD"
  userId?: number;
  search?: string;
  limit?: number; // max 1000, default 100
}
```

**Response (200):**
```typescript
{
  success: true;
  data: Array<{
    id: string;
    timestamp: string;
    level: "INFO" | "WARNING" | "ERROR" | "CRITICAL";
    category: "AUTH" | "DATABASE" | "SYSTEM" | "USER_ACTION" | "ERROR";
    message: string;
    userId?: number;
    ipAddress?: string;
    details?: any;
  }>;
  meta: {
    total: number;
    limit: number;
    filters: object;
  };
}
```

### Get System Statistics
```http
GET /api/v1/system/statistics
Authorization: Bearer <token>
```

**Response (200):**
```typescript
{
  success: true;
  data: {
    userStatistics: {
      totalUsers: number;
      totalStudents: number;
      totalTeachers: number;
      totalParents: number;
      recentLogins: number;
    };
    academicStatistics: {
      totalClasses: number;
      totalSubjects: number;
      totalEnrollments: number;
      currentAcademicYear: string;
    };
    financialStatistics: {
      totalFees: number;
      totalPayments: number;
    };
    systemHealth: {
      // Same structure as /system/health
    };
  };
}
```

### Get System Dashboard
```http
GET /api/v1/system/dashboard
Authorization: Bearer <token>
```

**Response (200):**
```typescript
{
  success: true;
  data: {
    // Combines statistics + health + additional dashboard data
    userStatistics: object;
    academicStatistics: object;
    financialStatistics: object;
    systemHealth: object;
    quickActions: Array<string>;
    recentActivities: Array<object>;
  };
}
```

### Get System Info
```http
GET /api/v1/system/info
Authorization: Bearer <token>
```

**Response (200):**
```typescript
{
  success: true;
  data: {
    schoolName: string;
    systemVersion: string;
    uptime: number;
    status: "HEALTHY" | "WARNING" | "CRITICAL";
    maintenanceMode: boolean;
  };
}
```

### Toggle Maintenance Mode
```http
POST /api/v1/system/maintenance-mode
Authorization: Bearer <token>
```

**Request Body:**
```typescript
{
  enabled: boolean;
}
```

**Response (200):**
```typescript
{
  success: true;
  message: "Maintenance mode enabled/disabled";
  data: {
    maintenanceMode: boolean;
  };
}
```

---

## Principal (School-wide Management)

### Get Principal Dashboard
```http
GET /api/v1/principal/dashboard
Authorization: Bearer <token>
```

**Query Parameters:**
```typescript
{
  academicYearId?: number;
}
```

**Response (200):**
```typescript
{
  success: true;
  data: {
    schoolAnalytics: {
      totalStudents: number;
      totalTeachers: number;
      totalClasses: number;
      totalSubjects: number;
      activeExamSequences: number;
      averageAttendanceRate: number;
      overallAcademicPerformance: number;
      financialCollectionRate: number;
      disciplineIssuesThisMonth: number;
      newEnrollmentsThisMonth: number;
      teacherUtilizationRate: number;
      classCapacityUtilization: number;
    };
    performanceMetrics: {
      academicPerformance: {
        overallPassRate: number;
        averageGrade: number;
        subjectPerformance: Array<{
          subjectName: string;
          averageScore: number;
          passRate: number;
          totalStudents: number;
        }>;
        classPerformance: Array<{
          className: string;
          subClassName: string;
          averageScore: number;
          passRate: number;
          totalStudents: number;
          teacherName: string;
        }>;
      };
      attendanceMetrics: {
        overallAttendanceRate: number;
        classAttendanceRates: Array<object>;
        monthlyAttendanceTrends: Array<object>;
      };
      teacherPerformance: {
        totalTeachers: number;
        averageClassesPerTeacher: number;
        teacherEfficiency: Array<{
          teacherName: string;
          subjectsTeaching: number;
          averageStudentPerformance: number;
          classesManaged: number;
          attendanceRate: number;
        }>;
      };
    };
    financialOverview: {
      totalExpectedRevenue: number;
      totalCollectedRevenue: number;
      collectionRate: number;
      pendingPayments: number;
      paymentMethodBreakdown: Array<{
        method: string;
        amount: number;
        percentage: number;
        transactionCount: number;
      }>;
      outstandingDebts: Array<{
        studentName: string;
        className: string;
        amountOwed: number;
        daysOverdue: number;
      }>;
    };
    disciplineOverview: {
      totalIssues: number;
      resolvedIssues: number;
      pendingIssues: number;
      averageResolutionTime: number;
      issuesByType: Array<{
        issueType: string;
        count: number;
        trend: "INCREASING" | "DECREASING" | "STABLE";
      }>;
    };
    staffOverview: {
      totalStaff: number;
      teacherCount: number;
      administrativeStaff: number;
      staffUtilization: Array<{
        role: string;
        count: number;
        utilizationRate: number;
      }>;
    };
    quickActions: Array<string>;
  };
}
```

### Get School Analytics
```http
GET /api/v1/principal/analytics/school
Authorization: Bearer <token>
```

**Query Parameters:**
```typescript
{
  academicYearId?: number;
}
```

**Response (200):**
```typescript
{
  success: true;
  data: {
    totalStudents: number;
    totalTeachers: number;
    totalClasses: number;
    totalSubjects: number;
    activeExamSequences: number;
    averageAttendanceRate: number;
    overallAcademicPerformance: number;
    financialCollectionRate: number;
    disciplineIssuesThisMonth: number;
    newEnrollmentsThisMonth: number;
    teacherUtilizationRate: number;
    classCapacityUtilization: number;
  };
}
```

### Get Performance Metrics
```http
GET /api/v1/principal/analytics/performance
Authorization: Bearer <token>
```

**Response (200):**
```typescript
{
  success: true;
  data: {
    academicPerformance: {
      overallPassRate: number;
      averageGrade: number;
      subjectPerformance: Array<{
        subjectName: string;
        averageScore: number;
        passRate: number;
        totalStudents: number;
      }>;
      classPerformance: Array<{
        className: string;
        subClassName: string;
        averageScore: number;
        passRate: number;
        totalStudents: number;
        teacherName: string;
      }>;
    };
    attendanceMetrics: {
      overallAttendanceRate: number;
      classAttendanceRates: Array<object>;
      monthlyAttendanceTrends: Array<object>;
    };
    teacherPerformance: {
      totalTeachers: number;
      averageClassesPerTeacher: number;
      teacherEfficiency: Array<{
        teacherName: string;
        subjectsTeaching: number;
        averageStudentPerformance: number;
        classesManaged: number;
        attendanceRate: number;
      }>;
    };
  };
}
```

### Get Financial Overview
```http
GET /api/v1/principal/analytics/financial
Authorization: Bearer <token>
```

**Response (200):**
```typescript
{
  success: true;
  data: {
    totalExpectedRevenue: number;
    totalCollectedRevenue: number;
    collectionRate: number;
    pendingPayments: number;
    monthlyCollectionTrends: Array<{
      month: string;
      collected: number;
      expected: number;
      collectionRate: number;
    }>;
    paymentMethodBreakdown: Array<{
      method: string;
      amount: number;
      percentage: number;
      transactionCount: number;
    }>;
    outstandingDebts: Array<{
      studentName: string;
      className: string;
      amountOwed: number;
      daysOverdue: number;
    }>;
  };
}
```

### Get Discipline Overview
```http
GET /api/v1/principal/analytics/discipline
Authorization: Bearer <token>
```

**Response (200):**
```typescript
{
  success: true;
  data: {
    totalIssues: number;
    resolvedIssues: number;
    pendingIssues: number;
    averageResolutionTime: number;
    issuesByType: Array<{
      issueType: string;
      count: number;
      trend: "INCREASING" | "DECREASING" | "STABLE";
    }>;
    studentsByIssueCount: Array<{
      studentName: string;
      className: string;
      issueCount: number;
      lastIssueDate: string;
    }>;
    monthlyTrends: Array<{
      month: string;
      totalIssues: number;
      resolvedIssues: number;
    }>;
  };
}
```

### Get Staff Overview
```http
GET /api/v1/principal/analytics/staff
Authorization: Bearer <token>
```

**Response (200):**
```typescript
{
  success: true;
  data: {
    totalStaff: number;
    teacherCount: number;
    administrativeStaff: number;
    staffUtilization: Array<{
      role: string;
      count: number;
      utilizationRate: number;
    }>;
    recentHires: Array<{
      name: string;
      role: string;
      hireDate: string;
      department: string;
    }>;
    staffPerformanceMetrics: Array<{
      staffName: string;
      role: string;
      performanceScore: number;
      responsibilities: number;
    }>;
  };
}
```

### Get Academic Performance Report
```http
GET /api/v1/principal/reports/academic-performance
Authorization: Bearer <token>
```

**Query Parameters:**
```typescript
{
  academicYearId?: number;
  classId?: number;
  subjectId?: number;
}
```

**Response (200):**
```typescript
{
  success: true;
  data: {
    academicPerformance: {
      overallPassRate: number;
      averageGrade: number;
      subjectPerformance: Array<object>; // Filtered by subjectId if provided
      classPerformance: Array<object>;   // Filtered by classId if provided
    };
    generatedAt: string;
    filters: {
      academicYearId: number | null;
      classId: number | null;
      subjectId: number | null;
    };
  };
}
```

### Get Attendance Analysis
```http
GET /api/v1/principal/reports/attendance-analysis
Authorization: Bearer <token>
```

**Query Parameters:**
```typescript
{
  academicYearId?: number;
  startDate?: string; // "YYYY-MM-DD"
  endDate?: string;   // "YYYY-MM-DD"
  classId?: number;
}
```

**Response (200):**
```typescript
{
  success: true;
  data: {
    overallMetrics: {
      overallAttendanceRate: number;
      classAttendanceRates: Array<object>;
      monthlyAttendanceTrends: Array<object>;
    };
    dateRange: {
      startDate: string;
      endDate: string;
    };
    classFilter: number | null;
    summary: {
      totalAnalyzed: number;
      averageAttendanceRate: number;
      trendsIdentified: number;
      issuesDetected: number;
    };
    recommendations: Array<string>;
  };
}
```

### Get Teacher Performance Analysis
```http
GET /api/v1/principal/reports/teacher-performance
Authorization: Bearer <token>
```

**Query Parameters:**
```typescript
{
  academicYearId?: number;
  departmentId?: number;
  performanceThreshold?: number; // Default: 10
}
```

**Response (200):**
```typescript
{
  success: true;
  data: {
    summary: {
      totalTeachers: number;
      aboveThreshold: number;
      needsImprovement: number;
      averagePerformance: number;
    };
    teacherAnalysis: Array<{
      teacherName: string;
      subjectsTeaching: number;
      averageStudentPerformance: number;
      classesManaged: number;
      attendanceRate: number;
      performanceCategory: "ABOVE_THRESHOLD" | "NEEDS_IMPROVEMENT";
      recommendations: Array<string>;
    }>;
    performanceThreshold: number;
    generatedAt: string;
  };
}
```

### Get Financial Performance Analysis
```http
GET /api/v1/principal/reports/financial-performance
Authorization: Bearer <token>
```

**Response (200):**
```typescript
{
  success: true;
  data: {
    totalExpectedRevenue: number;
    totalCollectedRevenue: number;
    collectionRate: number;
    pendingPayments: number;
    paymentMethodBreakdown: Array<object>;
    outstandingDebts: Array<object>;
    performanceIndicators: {
      collectionEfficiency: "EXCELLENT" | "GOOD" | "NEEDS_IMPROVEMENT";
      outstandingRisk: "HIGH" | "MEDIUM" | "LOW";
      diversificationIndex: "GOOD" | "LIMITED";
    };
    alerts: Array<string>;
    recommendations: Array<string>;
  };
}
```

### Get School Overview Summary
```http
GET /api/v1/principal/overview/summary
Authorization: Bearer <token>
```

**Response (200):**
```typescript
{
  success: true;
  data: {
    keyMetrics: {
      totalStudents: number;
      totalTeachers: number;
      collectionRate: number;
      overallPassRate: number;
      attendanceRate: number;
      disciplineIssues: number;
    };
    alerts: Array<string>;
    trends: {
      enrollmentTrend: "INCREASING" | "STABLE" | "DECREASING";
      performanceTrend: "IMPROVING" | "STABLE" | "DECLINING";
      financialTrend: "POSITIVE" | "STABLE" | "CONCERNING";
    };
    priorities: Array<string>;
  };
}
```

---

## Error Handling

All endpoints return standardized error responses:

### 400 Bad Request
```typescript
{
  success: false;
  error: "Descriptive error message about invalid request";
}
```

### 401 Unauthorized
```typescript
{
  success: false;
  error: "User not authenticated" | "Invalid credentials";
}
```

### 403 Forbidden
```typescript
{
  success: false;
  error: "Access denied: insufficient permissions";
}
```

### 404 Not Found
```typescript
{
  success: false;
  error: "Resource not found";
}
```

### 409 Conflict
```typescript
{
  success: false;
  error: "Resource already exists" | "Conflict with current state";
}
```

### 500 Internal Server Error
```typescript
{
  success: false;
  error: "Internal server error message";
}
```

---

## Notes on Implementation

### Authentication
- All protected endpoints require `Authorization: Bearer <token>` header
- Tokens expire in 24 hours
- Login supports both email and matricule as identifier

### Data Conversion
- **Frontend Interface**: All requests and responses use **camelCase**
- **Backend Processing**: Internal processing uses snake_case
- **Middleware**: Automatic conversion between camelCase ↔ snake_case
- **API Documentation**: Shows camelCase (what developers actually use)

### Academic Year Context
- Most operations default to current academic year if not specified
- Academic year filtering is available on most endpoints

### Pagination
- Default: page=1, limit=10
- Maximum limit: typically 100
- Includes meta information: total, page, limit, totalPages

### Role-Based Access
- Endpoints are protected by role-based middleware
- Some endpoints have specific role requirements
- Teachers have access controls based on subject/subclass assignments

### Date Formats
- All dates are in "YYYY-MM-DD" format
- DateTime fields include time component
- Times are in "HH:mm" format

This documentation reflects the actual frontend interface using camelCase. The middleware handles automatic conversion to/from the backend's snake_case implementation. 
---

## Report Card Management

The Report Card Management system handles PDF report card generation for students and subclasses. It supports both individual student reports and combined subclass reports with background processing for large operations.

### Get Student Report Card
```http
GET /api/v1/report-cards/student/:studentId
Authorization: Bearer <token>
```

**Path Parameters:**
- `studentId` (number): Student ID

**Query Parameters:**
```typescript
{
  academicYearId: number;    // Required
  examSequenceId: number;    // Required
}
```

**Response (200 - Report Ready):**
- Returns PDF file for download
- Content-Type: application/pdf
- Content-Disposition: attachment; filename="report-student-{matricule}-seq-{sequenceId}.pdf"

**Response (202 - Processing):**
```typescript
{
  success: true;
  message: "Report generation is currently processing. Please try again later.";
  status: "PROCESSING"  < /dev/null |  "PENDING";
}
```

**Response (404 - Not Found):**
```typescript
{
  success: false;
  error: "Report record not found for this student. Generation might be pending, failed, or parameters incorrect.";
}
```

**Response (500 - Generation Failed):**
```typescript
{
  success: false;
  error: "Report generation failed for this student.";
  message: string;
  status: "FAILED";
}
```

### Generate Student Report Card
```http
POST /api/v1/report-cards/student/:studentId/generate
Authorization: Bearer <token>
Roles: SUPER_MANAGER, PRINCIPAL, VICE_PRINCIPAL
```

**Path Parameters:**
- `studentId` (number): Student ID

**Request Body:**
```typescript
{
  academicYearId: number;   // Required
  examSequenceId: number;   // Required
}
```

**Response (200):**
- Triggers immediate report generation and download
- Returns PDF file for download
- Content-Type: application/pdf
- Content-Disposition: attachment; filename="report-card-student-{studentId}.pdf"

**Error Responses:**
```typescript
{
  success: false;
  error: "Valid studentId, academicYearId, and examSequenceId must be provided.";
}
```

### Get Subclass Report Cards
```http
GET /api/v1/report-cards/subclass/:subClassId
Authorization: Bearer <token>
```

**Path Parameters:**
- `subClassId` (number): Subclass ID

**Query Parameters:**
```typescript
{
  academicYearId: number;    // Required
  examSequenceId: number;    // Required
}
```

**Response (200 - Report Ready):**
- Returns combined PDF file for download containing all students in the subclass
- Content-Type: application/pdf
- Content-Disposition: attachment; filename="report-subclass-{className}-{subclassName}-seq-{sequenceId}.pdf"

**Response (202 - Processing):**
```typescript
{
  success: true;
  message: "Combined subclass report generation is currently processing. Please try again later.";
  status: "PROCESSING" | "PENDING";
}
```

**Response (404 - Not Found):**
```typescript
{
  success: false;
  error: "Combined subclass report record not found. It might not have been generated yet or the parameters are incorrect.";
}
```

### Generate Subclass Report Cards
```http
POST /api/v1/report-cards/subclass/:subClassId/generate
Authorization: Bearer <token>
Roles: SUPER_MANAGER, PRINCIPAL, VICE_PRINCIPAL
```

**Path Parameters:**
- `subClassId` (number): Subclass ID

**Request Body:**
```typescript
{
  academicYearId: number;   // Required
  examSequenceId: number;   // Required
}
```

**Response (200):**
- Triggers immediate report generation and download for entire subclass
- Returns combined PDF file for download
- Content-Type: application/pdf
- Content-Disposition: attachment; filename="report-cards-subclass-{subClassId}.pdf"

**Error Responses:**
```typescript
{
  success: false;
  error: "Valid subClassId, academicYearId, and examSequenceId must be provided.";
}
```

### Report Card Features

**Individual Student Reports Include:**
- Student personal information (name, matricule, photo, class info)
- Subject-wise marks with coefficients and weighted calculations
- Category summaries (by subject category)
- Overall average and class ranking
- Class statistics (min, max, average, success rates)
- Teacher assignments for each subject
- Exam sequence information

**Subclass Combined Reports Include:**
- All individual student reports combined into a single PDF
- Each student report on a separate page
- Consistent formatting and styling
- Automatic page breaks between students

**Background Processing:**
- Large report generation is handled via BullMQ job queues
- Report status tracking: PENDING → PROCESSING → COMPLETED/FAILED
- Individual student reports can be extracted from combined subclass PDFs
- Automatic retry mechanisms for failed generations

**Report Status Tracking:**
Reports are tracked in the GeneratedReport table with statuses:
- `PENDING`: Report generation queued
- `PROCESSING`: Report currently being generated
- `COMPLETED`: Report successfully generated and available
- `FAILED`: Report generation failed

**File Management:**
- PDF files are stored in the server filesystem
- Individual student reports are extracted from combined PDFs using pdf-lib
- Generated reports are cached until regenerated
- File paths are stored in database for efficient retrieval

**Error Handling:**
- Validates required parameters (academicYearId, examSequenceId)
- Checks student enrollment and marks availability
- Handles missing files and corrupted PDFs
- Provides detailed error messages for debugging


### Check Student Report Card Availability (General)
```http
GET /api/v1/report-cards/student/:studentId/availability
Authorization: Bearer <token>
```

**Path Parameters:**
- `studentId` (number): Student ID

**Query Parameters:**
```typescript
{
  academicYearId: number;    // Required
  examSequenceId: number;    // Required
}
```

**Response (200):**
```typescript
{
  success: true;
  data: {
    available: boolean;
    status: "COMPLETED"  < /dev/null |  "PENDING" | "PROCESSING" | "FAILED" | "NOT_ENROLLED" | "SEQUENCE_NOT_FOUND" | "NO_MARKS" | "NOT_GENERATED";
    message: string;
    reportData?: {
      studentName: string;
      matricule: string;
      className: string;
      examSequence: number;
      termName: string;
      filePath?: string;
      generatedAt?: string;
      errorMessage?: string;
      marksCount?: number;
    };
  };
}
```

### Check Subclass Report Card Availability (General)
```http
GET /api/v1/report-cards/subclass/:subClassId/availability
Authorization: Bearer <token>
```

**Path Parameters:**
- `subClassId` (number): Subclass ID

**Query Parameters:**
```typescript
{
  academicYearId: number;    // Required
  examSequenceId: number;    // Required
}
```

**Response (200):**
```typescript
{
  success: true;
  data: {
    available: boolean;
    status: "COMPLETED" | "PENDING" | "PROCESSING" | "FAILED" | "SUBCLASS_NOT_FOUND" | "SEQUENCE_NOT_FOUND" | "NO_STUDENTS" | "NO_MARKS" | "NOT_GENERATED";
    message: string;
    reportData?: {
      subClassName: string;
      enrolledStudents: number;
      examSequence: number;
      termName: string;
      filePath?: string;
      generatedAt?: string;
      errorMessage?: string;
      marksCount?: number;
    };
  };
}
```

### Check Child Report Card Availability (Parent)
```http
GET /api/v1/parent/children/:studentId/report-card/availability
Authorization: Bearer <token>
Roles: PARENT
```

**Path Parameters:**
- `studentId` (number): Child's student ID

**Query Parameters:**
```typescript
{
  academicYearId: number;    // Required
  examSequenceId: number;    // Required
}
```

**Response (200):**
Same as general student report card availability check above.

**Response (403):**
```typescript
{
  success: false;
  error: "You do not have permission to access this student's report card";
}
```

### Check Student Report Card Availability (Manager)
```http
GET /api/v1/manager/report-cards/student/:studentId/availability
Authorization: Bearer <token>
Roles: MANAGER, PRINCIPAL, SUPER_MANAGER
```

Same parameters and responses as general student availability check.

### Check Subclass Report Card Availability (Manager)
```http
GET /api/v1/manager/report-cards/subclass/:subClassId/availability
Authorization: Bearer <token>
Roles: MANAGER, PRINCIPAL, SUPER_MANAGER
```

Same parameters and responses as general subclass availability check.

### Check Student Report Card Availability (Principal)
```http
GET /api/v1/principal/report-cards/student/:studentId/availability
Authorization: Bearer <token>
Roles: PRINCIPAL
```

Same parameters and responses as general student availability check.

### Check Subclass Report Card Availability (Principal)
```http
GET /api/v1/principal/report-cards/subclass/:subClassId/availability
Authorization: Bearer <token>
Roles: PRINCIPAL
```

Same parameters and responses as general subclass availability check.

### Report Card Availability Status Codes

**Available Status Codes:**
- `COMPLETED`: Report card is ready for download
- `PENDING`: Report generation is queued
- `PROCESSING`: Report is currently being generated
- `FAILED`: Report generation failed
- `NOT_ENROLLED`: Student not enrolled for the academic year
- `SEQUENCE_NOT_FOUND`: Exam sequence not found
- `NO_MARKS`: No marks available for the student/subclass
- `NOT_GENERATED`: Report can be generated but hasn't been created yet
- `SUBCLASS_NOT_FOUND`: Subclass not found
- `NO_STUDENTS`: No students enrolled in the subclass

**Parent-Specific Features:**
- Parents can only check availability for their own children
- System verifies parent-child relationship before allowing access
- Returns 403 Forbidden if parent tries to access unrelated student's report

**Manager/Principal Features:**
- Full access to all students and subclasses
- Can check availability for any student or subclass in the system
- Same response format as general endpoints

### Get Collection Analytics
```http
GET /api/v1/bursar/collection-analytics
Authorization: Bearer <token>
```

**Description:**
Retrieves analytics related to fee collection, including monthly trends and payment method breakdowns.
**Note:** This endpoint currently returns placeholder data; actual implementation is pending.

**Authorization:**
- `BURSAR`, `SUPER_MANAGER`, `PRINCIPAL`, `MANAGER`

**Query Parameters:**
```typescript
{
  academicYearId?: number; // Optional: The ID of the academic year. Defaults to current year if not provided.
  startDate?: string;    // Optional: "YYYY-MM-DD"
  endDate?: string;      // Optional: "YYYY-MM-DD"
}
```

**Response (Success - 200):**
```typescript
{
  success: true;
  message: "Collection analytics retrieved successfully";
  data: {
    monthlyTrends: Array<{
      month: string;
      collected: number;
      target: number;
      variance: number;
    }>;
    paymentMethods: Array<{
      method: string; // e.g., "EXPRESS_UNION", "CCA", "3DC"
      count: number;
      totalAmount: number;
    }>;
    collectionRate: number; // Overall collection rate
    targetVsActual: {
      target: number;
      actual: number;
      variance: number;
    };
  };
}
```

**Error Response (500):**
```typescript
{
  success: false;
  error: "Error fetching collection analytics: [error message]";
}
```

### Get Payment Trends
```http
GET /api/v1/bursar/payment-trends
Authorization: Bearer <token>
```

**Description:**
Retrieves analysis of payment trends over time, including daily collections and peak collection days.
**Note:** This endpoint currently returns placeholder data; actual implementation is pending.

**Authorization:**
- `BURSAR`, `SUPER_MANAGER`, `PRINCIPAL`, `MANAGER`

**Query Parameters:**
```typescript
{
  academicYearId?: number; // Optional: The ID of the academic year. Defaults to current year if not provided.
  period?: "daily" | "weekly" | "monthly" | "yearly"; // Optional: Period for aggregation. Defaults to "monthly".
}
```

**Response (Success - 200):**
```typescript
{
  success: true;
  message: "Payment trends retrieved successfully";
  data: {
    dailyCollections: Array<{
      date: string; // "YYYY-MM-DD"
      amount: number;
      transactionCount: number;
    }>;
    weeklySummary: Array<{
      week: string; // e.g., "Week 1", "2024-W1"
      totalAmount: number;
      averageDaily: number;
    }>;
    paymentMethodsBreakdown: Array<{
      method: string;
      totalAmount: number;
      transactionCount: number;
    }>;
    peakCollectionDays: Array<{
      date: string;
      amount: number;
    }>;
  };
}
```

**Error Response (500):**
```typescript
{
  success: false;
  error: "Error fetching payment trends: [error message]";
}
```

### Get Defaulters Report
```http
GET /api/v1/bursar/defaulters-report
Authorization: Bearer <token>
```

**Description:**
Generates a report of students with outstanding fee balances (defaulters).
**Note:** This endpoint currently returns placeholder data; actual implementation is pending.

**Authorization:**
- `BURSAR`, `SUPER_MANAGER`, `PRINCIPAL`, `MANAGER`

**Query Parameters:**
```typescript
{
  academicYearId?: number; // Optional: The ID of the academic year. Defaults to current year if not provided.
  minimumAmount?: number;  // Optional: Filter for students with outstanding balances greater than or equal to this amount.
  classId?: number;        // Optional: Filter for defaulters within a specific class.
  subClassId?: number;     // Optional: Filter for defaulters within a specific subclass.
  includeDetails?: boolean; // Optional: If true, includes more detailed student/fee info. Defaults to false.
}
```

**Response (Success - 200):**
```typescript
{
  success: true;
  message: "Defaulters report retrieved successfully";
  data: {
    totalDefaulters: number;
    totalOutstanding: number;
    byClass: Array<{
      classId: number;
      className: string;
      defaultersCount: number;
      outstandingAmount: number;
    }>;
    byAmountRange: Array<{
      range: string; // e.g., "0-10000", "10001-50000", "50000+"
      count: number;
      totalAmount: number;
    }>;
    students: Array<{ // Detailed list of defaulters
      studentId: number;
      studentName: string;
      matricule: string;
      className: string;
      subClassName: string;
      outstandingAmount: number;
      dueDate: string; // Of the oldest outstanding fee
      daysOverdue: number;
      contactParentPhone?: string;
    }>;
  };
}
```

**Error Response (500):**
```typescript
{
  success: false;
  error: "Error fetching defaulters report: [error message]";
}
```

