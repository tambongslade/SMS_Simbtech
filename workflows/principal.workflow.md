# PRINCIPAL Role - Complete Workflow & UX Design

## Post-Login Principal Dashboard (`/principal/dashboard`)

### **API Integration**
**Primary Endpoint:** `GET /api/v1/principal/dashboard`
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

### **Main Dashboard Layout**
```
┌─────────────────────────────────────────────────────────┐
│ [🏠] School Management System    [🔔] [👤] [⚙️] [🚪]    │
├─────────────────────────────────────────────────────────┤
│ Welcome back, [Principal Name] | Academic Year: 2024-2025│
│ School Principal - Strategic Overview                    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ ┌─── School Overview ───┐                               │
│ │ 👨‍🎓 Students: [Total Students]   👨‍🏫 Teachers: [Total Teachers] │
│ │ 🏫 Classes: [Total Classes]    📚 Subjects: [Total Subjects] │
│ │ 📊 Avg. Attendance: [Avg. Attendance Rate]%            │
│ │ 📈 Overall Perf.: [Overall Academic Performance]%     │
│ │ 💰 Fee Collection: [Financial Collection Rate]%      │
│ │ ⚠️ Discipline Issues (Month): [Discipline Issues This Month] │
│ │ ✨ New Enrollments (Month): [New Enrollments This Month] │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ┌─── Academic Performance ───┐                           │
│ │  Passing Rate: [Overall Pass Rate]%                  │
│ │ Avg. Grade: [Average Grade]/20                       │
│ │ Top Subjects:                                         │
│ │   - [Subject 1 Name]: [Subject 1 Avg Score]%         │
│ │   - [Subject 2 Name]: [Subject 2 Avg Score]%         │
│ │ Top Classes:                                          │
│ │   - [Class 1 Name]: [Class 1 Avg Score]%             │
│ │   - [Class 2 Name]: [Class 2 Avg Score]%             │
│ │ [View Detailed Academic Performance]                 │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ┌─── Financial Insights ───┐                            │
│ │ Expected: [Total Expected Revenue] FCFA              │
│ │ Collected: [Total Collected Revenue] FCFA            │
│ │ Pending: [Pending Payments] FCFA                     │
│ │ Top Defaulters:                                       │
│ │   - [Student 1 Name]: [Amount Owed 1] FCFA          │
│ │   - [Student 2 Name]: [Amount Owed 2] FCFA          │
│ │ [View Detailed Financials]                           │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ┌─── Staff & Discipline Overview ───┐                   │
│ │ Total Staff: [Total Staff]        Teachers: [Teacher Count] │
│ │ Admin Staff: [Administrative Staff]                    │
│ │ Discipline Issues (Total): [Total Issues]            │
│ │ Resolved Issues: [Resolved Issues]                    │
│ │ Pending Issues: [Pending Issues]                      │
│ │ [View Detailed Staff & Discipline]                   │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ┌─── Quick Actions ───┐                                  │
│ │ [Manage Academic Year] [Review Pending Reports]        │
│ │ [Address Discipline Cases] [Monitor Teacher Absences]  │
│ │ [Generate Financial Report] [Update School Settings]   │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## Academic Management (`/principal/academics`)

### **API Integration**

#### **1. Get Academic Overview**
**Endpoint:** `GET /api/v1/principal/analytics/school`
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

#### **2. Get Exam Sequence Details**
**Endpoint:** `GET /api/v1/academic-years/:academicYearId/exam-sequences` (Filter by `sequence_number` and `term_id` on client-side or add query parameters if needed by backend)
- **Headers:** `Authorization: Bearer <token>`
- **Path Parameters:** `academicYearId` (number): Academic Year ID (can be retrieved from current academic year endpoint or from dashboard data)
- **Query Parameters:**
  ```typescript
  {
    termId?: number;
    sequenceNumber?: number; // Filter by sequence number within the term
  }
  ```
- **Response (200):**
  ```typescript
  {
    success: true;
    data: Array<{
      id: number;
      sequence_number: number;
      academic_year_id: number;
      term_id: number;
      created_at: string;
      updated_at: string;
      status: "OPEN" | "CLOSED" | "FINALIZED" | "REPORTS_GENERATING" | "REPORTS_AVAILABLE" | "REPORTS_FAILED";
      term: {
        id: number;
        name: string;
      };
    }>;
  }
  ```

#### **3. Get Department Analytics**
**Endpoint:** `GET /api/v1/principal/analytics/performance`
- **Query Parameters:**
  ```typescript
  {
    academicYearId?: number;
    departmentId?: number;
    includeComparison?: boolean;
  }
  ```

### **Academic Overview Dashboard**
```
┌─── Academic Management ───┐
│ [Exam Sequences] [Performance Analytics] [Curriculum] [Reports] │
│                                                                │
│ ┌─── Current Academic Status ───┐                              │
│ │ Academic Year: [Academic Year Name]                       │
│ │ Current Term: [Current Term Name] ([Current Term Start] - [Current Term End]) │
│ │ Active Exam Sequences: [Active Sequences Count]             │
│ │ Sequences Completed: [Completed Sequences Count]            │
│ │ Overall School Average: [School Average]/20                 │
│ │ Improvement from Last Year: [Improvement from Last Year]    │
│ └───────────────────────────────────────────────────────────┘ │
│                                                                │
│ ┌─── Exam Sequence Management ───┐                             │
│ │ Sequence [Sequence 2 Number] - [Term 2 Name] (Active)      │
│ │ Status: Marks Entry in Progress                             │
│ │ Progress: [Marks Entry Progress]% complete                  │
│ │ Teachers Pending: [Teachers Pending Count]                  │
│ │ Expected Completion: [Expected Completion Date]             │
│ │ [Monitor Progress] [Send Reminders] [Generate Reports]      │
│ │ ─────────────────────────────────────                      │
│ │ Sequence [Sequence 3 Number] - [Term 2 Name] (Planned)     │
│ │ Scheduled: [Sequence 3 Start] - [Sequence 3 End]          │
│ │ Status: Not Started                                         │
│ │ [Configure] [Set Dates] [Notify Staff]                     │
│ └───────────────────────────────────────────────────────────┘ │
│                                                                │
│ ┌─── Department Performance ───┐                               │
│ │ Mathematics: [Math Avg Score]/20 ([Math Status])         │
│ │ English: [English Avg Score]/20 ([English Status])       │
│ │ Sciences: [Sciences Avg Score]/20 ([Sciences Status])     │
│ │ Social Studies: [Social Studies Avg Score]/20 ([Social Studies Status]) │
│ │ Languages: [Languages Avg Score]/20 ([Languages Status]) │
│ │ [Detailed Analysis] [Intervention Plans]                   │
│ └───────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

### **Exam Sequence Detail** (`/principal/academics/sequences/:sequenceId`)

#### **API Integration**

#### **Get Exam Sequence Details**
**Endpoint:** `GET /api/v1/academic-years/:academicYearId/exam-sequences` (Filter by `sequence_number` and `term_id` on client-side or add query parameters if needed by backend)
- **Headers:** `Authorization: Bearer <token>`
- **Path Parameters:** `academicYearId` (number): Academic Year ID (can be retrieved from current academic year endpoint or from dashboard data)
- **Query Parameters:**
  ```typescript
  {
    termId?: number;
    sequenceNumber?: number; // Filter by sequence number within the term
  }
  ```
- **Response (200):**
  ```typescript
  {
    success: true;
    data: Array<{
      id: number;
      sequence_number: number;
      academic_year_id: number;
      term_id: number;
      created_at: string;
      updated_at: string;
      status: "OPEN" | "CLOSED" | "FINALIZED" | "REPORTS_GENERATING" | "REPORTS_AVAILABLE" | "REPORTS_FAILED";
      term: {
        id: number;
        name: string;
      };
    }>;
  }
  ```

#### **Send Reminder (via Notifications System)**
**Endpoint:** `POST /api/v1/notifications/send`
- **Headers:** `Authorization: Bearer <token>`
- **Request Body:**
  ```typescript
  {
    title: string;                 // e.g., "Reminder: Marks Submission Deadline for Sequence X"
    message: string;               // Detailed message content
    recipientIds: number[];        // IDs of teachers/staff to remind
    category?: "ACADEMIC";         // Optional category for notification
    actionUrl?: string;            // Deep link to relevant page
    priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  }
  ```
- **Response (200):**
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

```
┌─── Sequence 2 - Term 2 Management ───┐
│ Status: Marks Entry in Progress        │
│ Start Date: Jan 15, 2024              │
│ End Date: Jan 25, 2024                │
│ Report Deadline: Jan 31, 2024         │
│                                       │
│ ┌─── Progress Overview ───┐            │
│ │ Total Subjects: 45                  │
│ │ Marks Entered: 35 (78%)             │
│ │ Pending: 10 (22%)                   │
│ │ Teachers Completed: 37/45           │
│ │ Expected Completion: Jan 28         │
│ └───────────────────────────────────┘ │
│                                       │
│ ┌─── Pending Teachers ───┐             │
│ │ Mr. Wilson (Physics) - 3 classes    │
│ │ Mrs. Davis (Chemistry) - 2 classes  │
│ │ Mr. Brown (History) - 2 classes     │
│ │ Ms. Johnson (Biology) - 3 classes   │
│ │ [Send Reminder] [Set Deadline]      │
│ └───────────────────────────────────┘ │
│                                       │
│ ┌─── Sequence Actions ───┐             │
│ │ [Extend Deadline] [Close Sequence]  │
│ │ [Generate Preliminary Reports]      │
│ │ [Send Mass Reminder] [View Analytics]│
│ └───────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

## Staff Management (`/principal/staff`)

### **API Integration**

#### **1. Get Staff Overview**
**Endpoint:** `GET /api/v1/principal/analytics/staff`
- **Headers:** `Authorization: Bearer <token>`
- **Query Parameters:**
  ```typescript
  {
    academicYearId?: number;
    departmentId?: number;
    includePerformance?: boolean;
  }
  ```
- **Response Data:**
  ```typescript
  {
    success: true;
    data: {
      staffSummary: {
        totalStaff: number;
        totalTeachers: number;
        administrativeStaff: number;
        activeStaff: number;
        onLeave: number;
        newThisYear: number;
        departures: number;
      };
      departmentStatus: Array<{
        id: number;
        name: string;
        hodId?: number;
        hodName?: string;
        teacherCount: number;
        requiredTeachers: number;
        status: "FULLY_STAFFED" | "UNDERSTAFFED" | "OVERSTAFFED";
        subjects: Array<{
          id: number;
          name: string;
          teacherCount: number;
          classLoad: number;
        }>;
      }>;
      performanceMetrics: {
        averageTeacherRating: number;
        performanceDistribution: {
          excellent: number;           // Count
          good: number;
          average: number;
          needsImprovement: number;
        };
        trainingCompliance: number;    // Percentage
        attendanceRate: number;        // Teacher attendance percentage
      };
      recentActivities: Array<{
        id: number;
        type: "ONBOARDING" | "LEAVE_REQUEST" | "PERFORMANCE_REVIEW" | "TRAINING";
        description: string;
        staffMember: string;
        date: string;
        status: string;
      }>;
    };
  }
  ```

#### **2. Get Teacher Performance**
**Endpoint:** `GET /api/v1/principal/teachers/performance`
- **Query Parameters:**
  ```typescript
  {
    departmentId?: number;
    academicYearId?: number;
    sortBy?: "PERFORMANCE" | "NAME" | "DEPARTMENT";
    filterBy?: "TOP_PERFORMERS" | "NEEDS_SUPPORT" | "ALL";
  }
  ```

#### **3. Staff Actions**
**Approve Leave:** `PUT /api/v1/principal/staff/leave-requests/:requestId/approve`
**Performance Review:** `POST /api/v1/principal/staff/performance-reviews`
**Recognition Award:** `POST /api/v1/principal/staff/recognitions`

### **Staff Overview Dashboard**
```
┌─── Staff Management ───┐
│ [All Staff] [Teachers] [Admin Staff] [Assignments] [Performance] │
│                                                                  │
│ ┌─── Staff Summary ───┐                                          │
│ │ Total Staff: 52                                               │
│ │ Teachers: 45 | Administrative: 7                              │
│ │ Active: 50 | On Leave: 2                                      │
│ │ New This Year: 5 | Departures: 2                             │
│ └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ ┌─── Department Status ───┐                                      │
│ │ Department       HOD            Teachers  Status               │
│ │ Mathematics      Dr. Smith      8         Fully Staffed ✅    │
│ │ English          Mrs. Jones     6         Fully Staffed ✅    │
│ │ Sciences         Mr. Johnson    12        Need 1 More ⚠️      │
│ │ Social Studies   Ms. Davis      8         Fully Staffed ✅    │
│ │ Languages        Dr. Wilson     6         Fully Staffed ✅    │
│ │ Others           -               5         Mixed              │
│ │ [View Details] [Recruitment Needs] [Staff Distribution]       │
│ └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ ┌─── Recent Staff Activities ───┐                                │
│ │ • New teacher onboarded: Ms. Anderson (Mathematics)           │
│ │ • Mr. Thompson submitted leave request (Feb 1-5)              │
│ │ • Performance review due: 5 teachers                          │
│ │ • Training program completed: Digital Teaching Methods        │
│ │ [View All Activities] [Staff Calendar]                       │
│ └────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────┘
```

### **Teacher Performance Overview** (`/principal/staff/teachers`)
```
┌─── Teacher Performance Dashboard ───┐
│ [Individual Performance] [Department Analysis] [Evaluations]    │
│                                                                │
│ ┌─── Performance Metrics ───┐                                  │
│ │ Filter: [All Departments ▼] [This Year ▼] [Sort: Performance ▼]│
│ └──────────────────────────────────────────────────────────┘ │
│                                                                │
│ Teacher           Dept        Classes  Students  Avg Score     │
│ Dr. Smith         Math        4       120       16.2/20 ⭐    │
│ Mrs. Jones        English     3       85        15.8/20 ⭐    │
│ Mr. Johnson       Physics     3       90        15.1/20      │
│ Ms. Davis         Chemistry   2       60        14.9/20      │
│ Mr. Wilson        Biology     3       95        13.2/20 ⚠️   │
│                                                                │
│ ┌─── Performance Insights ───┐                                 │
│ │ Top Performers (16+ avg): 8 teachers                        │
│ │ Meeting Standards (14-16): 32 teachers                      │
│ │ Need Support (<14): 5 teachers                              │
│ │ Improvement from Last Year: +0.6 average                    │
│ │ [Support Programs] [Recognition Ceremony]                   │
│ └──────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

## Student Affairs (`/principal/students`)

### **API Integration**

#### **1. Get Student Population Analytics**
**Endpoint:** `GET /api/v1/principal/analytics/school`
- **Response includes:** Student demographics, enrollment trends, performance distribution

#### **2. Get Performance Analytics**
**Endpoint:** `GET /api/v1/principal/analytics/performance`
- **Query Parameters:**
  ```typescript
  {
    academicYearId?: number;
    classId?: number;
    performanceLevel?: "HIGH" | "MEDIUM" | "LOW";
    includeComparison?: boolean;
  }
  ```

#### **3. Discipline Overview**
**Endpoint:** `GET /api/v1/principal/analytics/discipline`
- **Response includes:** Discipline statistics, trend analysis, intervention recommendations

### **Student Affairs Overview**
```
┌─── Student Affairs Management ───┐
│ [Enrollment] [Performance] [Discipline] [Welfare] [Analytics] │
│                                                               │
│ ┌─── Student Population ───┐                                  │
│ │ Total Students: 1,245                                      │
│ │ By Level: Form 6(180), Form 5(220), Form 4(215)           │
│ │          Form 3(210), Form 2(205), Form 1(215)            │
│ │ Gender: Male 52% | Female 48%                              │
│ │ New Students This Year: 98                                 │
│ │ Transfer Students: 12                                       │
│ └─────────────────────────────────────────────────────────┘ │
│                                                               │
│ ┌─── Academic Performance Overview ───┐                       │
│ │ School Average: 14.2/20                                    │
│ │ Above 16/20: 285 students (23%)                           │
│ │ 12-16/20: 756 students (61%)                              │
│ │ Below 12/20: 204 students (16%)                           │
│ │ Grade Distribution: A(8%), B(35%), C(41%), D(14%), F(2%)  │
│ │ [Intervention Programs] [Excellence Recognition]           │
│ └─────────────────────────────────────────────────────────┘ │
│                                                               │
│ ┌─── Discipline & Welfare ───┐                                │
│ │ Active Discipline Cases: 8                                 │
│ │ Resolved This Month: 15                                    │
│ │ Attendance Rate: 94% (Target: 95%)                        │
│ │ Students on Academic Probation: 12                         │
│ │ Students Receiving Support: 45                             │
│ │ [Review Cases] [Support Programs]                          │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Financial Overview (`/principal/finances`)

### **API Integration**

#### **1. Get Financial Overview**
**Endpoint:** `GET /api/v1/principal/analytics/financial`
- **Query Parameters:**
  ```typescript
  {
    academicYearId?: number;
    includeProjections?: boolean;
  }
  ```
- **Response Data:**
  ```typescript
  {
    success: true;
    data: {
      feesOverview: {
        totalExpected: number;          // Total fees expected
        totalCollected: number;         // Amount collected
        collectionRate: number;         // Percentage
        outstandingAmount: number;      // Pending collections
        defaulters: number;             // Students with overdue fees
      };
      budgetStatus: {
        totalBudget: number;
        allocated: number;
        spent: number;
        remaining: number;
        utilizationRate: number;        // Percentage
      };
      departmentBudgets: Array<{
        departmentName: string;
        allocated: number;
        spent: number;
        remaining: number;
        requests: number;               // Pending budget requests
      }>;
      revenueStreams: Array<{
        source: string;                 // "SCHOOL_FEES" | "OTHER"
        amount: number;
        percentage: number;
      }>;
      expenditures: Array<{
        category: string;               // "SALARIES" | "UTILITIES" | "SUPPLIES"
        amount: number;
        percentage: number;
        trend: "INCREASING" | "STABLE" | "DECREASING";
      }>;
      monthlyTrends: Array<{
        month: string;
        collections: number;
        expenses: number;
        netResult: number;
      }>;
    };
  }
  ```

### **Financial Dashboard**
```
┌─── Financial Overview ───┐
│ [Revenue] [Expenses] [Budget] [Fees] [Reports]              │
│                                                             │
│ ┌─── Financial Summary ───┐                                 │
│ │ Total Revenue: 45,200,000 FCFA                           │
│ │ Total Expenses: 38,500,000 FCFA                          │
│ │ Net Surplus: 6,700,000 FCFA                              │
│ │ Budget Utilization: 85%                                  │
│ │ Fee Collection Rate: 87%                                 │
│ └───────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─── Department Budget Status ───┐                          │
│ │ Department       Allocated    Spent      Remaining       │
│ │ Mathematics      2,500,000    2,100,000  400,000        │
│ │ Sciences         3,200,000    2,800,000  400,000        │
│ │ English          1,800,000    1,650,000  150,000        │
│ │ Administration   5,000,000    4,200,000  800,000        │
│ │ Infrastructure   8,000,000    6,500,000  1,500,000      │
│ │ [Review Requests] [Approve Budgets]                     │
│ └───────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─── Fee Collection Analysis ───┐                           │
│ │ Total Expected: 52,000,000 FCFA                         │
│ │ Collected: 45,200,000 FCFA (87%)                        │
│ │ Outstanding: 6,800,000 FCFA                             │
│ │ Defaulters: 89 students                                 │
│ │ Collection Improvement: +3% vs last year                │
│ │ [Collection Strategies] [Defaulter Review]              │
│ └───────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────┘
```

## Reports & Analytics (`/principal/reports`)

### **API Integration**

#### **1. Generate Comprehensive Reports**
**Endpoint:** `GET /api/v1/principal/reports/comprehensive`
- **Query Parameters:**
  ```typescript
  {
    reportType: "ACADEMIC" | "FINANCIAL" | "STAFF" | "STUDENT" | "OPERATIONAL";
    period: "MONTHLY" | "QUARTERLY" | "ANNUAL";
    academicYearId?: number;
    includeComparisons?: boolean;
    format?: "json" | "pdf" | "excel";
  }
  ```

#### **2. Export School Data**
**Endpoint:** `GET /api/v1/principal/reports/export`
- **Supports:** Student data, staff records, financial reports, academic performance

#### **3. Strategic Analytics**
**Endpoint:** `GET /api/v1/principal/analytics/strategic`
- **Response includes:** KPIs, trends, benchmarks, recommendations

### **Reports Dashboard**
```
┌─── Principal Reports & Analytics ───┐
│ [Academic Reports] [Financial Reports] [Strategic Analysis] │
│                                                             │
│ ┌─── Report Generation ───┐                                 │
│ │ Report Type: [Comprehensive School Report ▼]             │
│ │ Period: [Monthly ▼] [Quarterly] [Annual]                 │
│ │ Include Comparisons: [✅ Yes] [❌ No]                     │
│ │ Format: [PDF ●] [Excel ○] [Dashboard ○]                  │
│ │ [Generate Report] [Schedule Auto-Reports]                │
│ └───────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─── Key Performance Indicators ───┐                        │
│ │ Academic Performance: B+ (Target: A-)                    │
│ │ Student Satisfaction: 87% (Target: 90%)                  │
│ │ Teacher Retention: 94% (Industry: 85%)                   │
│ │ Financial Health: Excellent                              │
│ │ Enrollment Growth: +5% YoY                               │
│ │ [Detailed KPI Analysis] [Set Targets]                    │
│ └───────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─── Strategic Insights ───┐                                │
│ │ • Mathematics department showing consistent improvement   │
│ │ • Science lab equipment needs urgent replacement        │
│ │ • Teacher training program yielding positive results    │
│ │ • Parent engagement initiatives increasing satisfaction  │
│ │ • Technology integration improving learning outcomes     │
│ │ [Strategic Planning] [Action Items]                     │
│ └───────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────┘
```

## Communication Center (`/principal/communications`)

### **API Integration**

#### **1. Send School-wide Announcements**
**Endpoint:** `POST /api/v1/principal/announcements`
- **Request Body:**
  ```typescript
  {
    title: string;
    content: string;
    priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
    recipients: "ALL" | "TEACHERS" | "PARENTS" | "STUDENTS" | "STAFF";
    channels: Array<"EMAIL" | "SMS" | "PORTAL" | "NOTICE_BOARD">;
    publishAt?: string;             // Schedule for later
    expiresAt?: string;
    attachments?: Array<{
      fileName: string;
      fileUrl: string;
    }>;
  }
  ```

#### **2. Get Communication Analytics**
**Endpoint:** `GET /api/v1/principal/communications/analytics`
- **Response includes:** Message delivery rates, engagement metrics, response analytics

### **Communication Center**
```
┌─── Principal Communication Center ───┐
│ [Announcements] [Messages] [Newsletters] [Emergency Alerts] │
│                                                             │
│ ┌─── Create School Announcement ───┐                        │
│ │ Title: [Text Input]                                      │
│ │ Content: [Rich Text Editor]                              │
│ │ Priority: [●Normal] [○High] [○Urgent]                    │
│ │ Recipients: [☑All] [☐Teachers] [☐Parents] [☐Students]    │
│ │ Channels: [☑Portal] [☑Email] [☐SMS] [☐Notice Board]     │
│ │ Schedule: [●Immediate] [○Schedule for later]             │
│ │ [Preview] [Send] [Save Draft]                           │
│ └───────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─── Recent Communications ───┐                             │
│ │ 📢 Parent-Teacher Meeting Notice (High Priority)         │
│ │    Sent: Jan 20 | Recipients: 1,245 | Opened: 89%      │
│ │    [View Analytics] [Follow-up]                         │
│ │                                                         │
│ │ 📧 Curriculum Updates (Normal)                          │
│ │    Sent: Jan 18 | Recipients: 45 Teachers | Opened: 94% │
│ │    [View Responses] [Archive]                           │
│ └───────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─── Communication Analytics ───┐                           │
│ │ Messages Sent This Month: 12                            │
│ │ Average Open Rate: 87%                                  │
│ │ Response Rate: 23%                                      │
│ │ Most Effective Channel: School Portal                   │
│ │ [Detailed Analytics] [Optimization Tips]                │
│ └───────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────┘
```

## Settings & Administration (`/principal/settings`)

### **API Integration**

#### **1. School Configuration**
**Endpoint:** `GET/PUT /api/v1/principal/school-settings`
- **Configurable settings:** Academic calendar, grading scales, policies, system preferences

#### **2. User Management**
**Endpoint:** `GET /api/v1/principal/user-management`
- **Response includes:** All system users, role assignments, access permissions

#### **3. System Health**
**Endpoint:** `GET /api/v1/principal/system-health`
- **Response includes:** Server status, database health, security alerts

### **Principal Settings**
```
┌─── Principal Administration ───┐
│ [School Settings] [User Management] [System Health] [Policies] │
│                                                                │
│ ┌─── School Configuration ───┐                                 │
│ │ School Name: [Modern Secondary School]                      │
│ │ Academic Calendar: [2024-2025]                              │
│ │ Grading Scale: [20-point scale ▼]                          │
│ │ School Address: [123 Education Street, Douala]             │
│ │ Contact Information: [+237-xxx-xxx]                        │
│ │ Email: [principal@modernschool.cm]                         │
│ │ [Update School Info]                                       │
│ └──────────────────────────────────────────────────────────┘ │
│                                                                │
│ ┌─── System Administration ───┐                                │
│ │ Total System Users: 1,350                                  │
│ │ Active Sessions: 245                                       │
│ │ System Uptime: 99.8%                                       │
│ │ Last Backup: Jan 20, 2024 03:00 AM                        │
│ │ Security Alerts: 0                                         │
│ │ [System Monitoring] [User Activity] [Security Logs]        │
│ └──────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

## Error Handling & Loading States

### **API Error Handling**
```typescript
// Standard error response format
{
  success: false;
  error: string; // User-friendly error message
}

// Principal-specific error scenarios:
// 403: "Insufficient privileges for this operation"
// 404: "Resource not found" | "Academic year not found"
// 409: "Cannot modify active sequence" | "Policy conflict"
// 500: "Report generation failed" | "System error"
```

### **Loading & Validation States**
- Dashboard real-time updates every 30 seconds
- Report generation progress indicators
- Bulk operation status tracking
- System health monitoring alerts
- Automatic data refresh for critical metrics

### **Success Feedback**
- Report generation completion notifications
- Policy update confirmations
- Communication delivery status
- System action audit trails
- Strategic target achievement alerts

**Frontend Implementation Notes:**
1. Implement real-time dashboard updates with WebSocket connections
2. Add comprehensive filtering and search across all data views
3. Use progressive loading for large datasets and reports
4. Implement proper caching for frequently accessed analytics
5. Add export functionality for all major data views
6. Use visualization libraries for charts and graphs
7. Implement role-based UI component visibility
8. Add keyboard shortcuts for common administrative actions
9. Use proper error boundaries for complex data operations
10. Implement offline capability for critical functions

### **Report Management** (`/principal/reports`)

#### **API Integration**

#### **1. Get Academic Performance Report**
**Endpoint:** `GET /api/v1/principal/reports/academic-performance`
- **Headers:** `Authorization: Bearer <token>`
- **Query Parameters:**
  ```typescript
  {
    academicYearId?: number;
    classId?: number;
    subjectId?: number;
  }
  ```
- **Response (200):**
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
      generatedAt: string;
      filters: {
        academicYearId: number | null;
        classId: number | null;
        subjectId: number | null;
      };
    };
  }
  ```

#### **2. Get Attendance Analysis Report**
**Endpoint:** `GET /api/v1/principal/reports/attendance-analysis`
- **Headers:** `Authorization: Bearer <token>`
- **Query Parameters:**
  ```typescript
  {
    academicYearId?: number;
    startDate?: string; // "YYYY-MM-DD"
    endDate?: string;   // "YYYY-MM-DD"
    classId?: number;
  }
  ```
- **Response (200):**
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

#### **3. Get Teacher Performance Analysis Report**
**Endpoint:** `GET /api/v1/principal/reports/teacher-performance`
- **Headers:** `Authorization: Bearer <token>`
- **Query Parameters:**
  ```typescript
  {
    academicYearId?: number;
    departmentId?: number;
    performanceThreshold?: number; // Default: 10
  }
  ```
- **Response (200):**
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

#### **4. Get Financial Performance Analysis Report**
**Endpoint:** `GET /api/v1/principal/reports/financial-performance`
- **Headers:** `Authorization: Bearer <token>`
- **Response (200):**
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

#### **5. Get School Overview Summary Report**
**Endpoint:** `GET /api/v1/principal/overview/summary`
- **Headers:** `Authorization: Bearer <token>`
- **Response (200):**
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
