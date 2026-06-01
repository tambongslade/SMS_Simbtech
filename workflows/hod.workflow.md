# HOD (Head of Department) Role - Complete Workflow & UX Design

*Note: HOD inherits ALL teacher functionality + department management features*

## Post-Login HOD Dashboard (`/hod/dashboard`)

### **Enhanced API Integration**

**Key Schema Details (from Prisma):**
- **Subject Model:** `name`, `category` (SubjectCategory enum), `hod_id` (nullable)
- **SubjectCategory Enum:** SCIENCE_AND_TECHNOLOGY, LANGUAGES_AND_LITERATURE, HUMAN_AND_SOCIAL_SCIENCE, OTHERS
- **SubClassSubject Model:** `coefficient` (Float), `sub_class_id`, `subject_id` - manages subject weighting
- **TeacherPeriod Model:** Links teachers to periods, subjects, and subclasses for comprehensive scheduling
- **UserRole Model:** HOD role with `academic_year_id` for year-specific assignments
- **RoleAssignment Model:** `role_type` includes HOD assignment to specific subjects

#### **1. Get HOD Dashboard**
**Primary:** `GET /api/v1/hod/dashboard`
**Enhanced:** `GET /api/v1/hod/department-overview`
**Subject Performance:** `GET /api/v1/hod/subject-performance`
**Analytics:** `GET /api/v1/hod/department-analytics`
- **Headers:** `Authorization: Bearer <token>`
- **Query Parameters:**
  ```typescript
  {
    academicYearId?: number; // Optional, defaults to current year
    includeTeacherPerformance?: boolean;
    includeSubjectBreakdown?: boolean;
  }
  ```
- **Enhanced Response Data:**
  ```typescript
  {
    success: true;
    data: {
      // Personal teaching stats (inherited from teacher role)
      personalTeaching: {
        myClasses: number;
        myStudents: number;
        marksToEnter: number;
        periodsToday: number;
        subjectsManaged: Array<{
          id: number;
          name: string;
          category: string;
          classCount: number;
          teacherCount: number;
          coefficientRange: {
            min: number;
            max: number;
            average: number;
          };
        }>;
      };
      // Department-specific management stats
      departmentStats: {
        departmentId: number;
        departmentName: string;
        departmentCategory: string;
        hodName: string;
        totalTeachers: number;
        totalClasses: number;
        totalStudents: number;
        totalSubjects: number;
        departmentAverage: number;        // Out of 20
        schoolRanking: number;           // Department rank (1-based)
        attendanceRate: number;          // Percentage
        passRate: number;               // Students passing threshold
        improvementTrend: "IMPROVING" | "STABLE" | "DECLINING";
        trendValue: number;             // Change from previous period
        coefficientCompliance: number;  // % of subjects with proper coefficients
      };
      departmentOverview: {
        teachers: Array<{
          id: number;
          name: string;
          email: string;
          classCount: number;
          studentCount: number;
          averageScore: number;
          attendanceRate: number;
          performanceTrend: "IMPROVING" | "STABLE" | "DECLINING";
          status: "ACTIVE" | "ON_LEAVE" | "NEEDS_REVIEW";
          subjectsAssigned: Array<string>;
          lastEvaluation?: {
            date: string;
            score: number;
          };
        }>;
        subjectBreakdown: Array<{
          id: number;
          name: string;
          category: string;
          classCount: number;
          teacherCount: number;
          averageScore: number;
          coefficientAverage: number;
          topPerformingClass: string;
          lowestPerformingClass: string;
        }>;
        recentConcerns: number;
        pendingReviews: number;
        resourceRequests: number;
        curriculumUpdates: number;
      };
      todaysSchedule: Array<{
        id: number;
        startTime: string;
        endTime: string;
        subjectName: string;
        className: string;
        subclassName: string;
        teacherName: string;
        periodType: "REGULAR" | "BREAK" | "SPECIAL";
      }>;
      departmentTasks: Array<{
        id: number;
        task: string;
        type: "CURRICULUM" | "EVALUATION" | "RESOURCE" | "MEETING" | "REPORT";
        priority: "HIGH" | "MEDIUM" | "LOW";
        dueDate?: string;
        assignedTo?: string;
        status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "OVERDUE";
        completionPercentage?: number;
      }>;
      alerts: {
        lowPerformingClasses: number;
        missingCoefficients: number;
        teacherConcerns: number;
        upcomingDeadlines: number;
        resourceShortages: number;
      };
    };
  }
  ```

*Note: All teacher API endpoints from Teacher workflow are also available to HODs*

### **Enhanced Dashboard Layout**
```
┌─────────────────────────────────────────────────────────┐
│ [🏠] School Management System    [🔔] [👤] [⚙️] [🚪]    │
├─────────────────────────────────────────────────────────┤
│ Welcome back, [Teacher Name] | Academic Year: 2024-2025  │
│ Head of Mathematics Department | Teaching + Management   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ ┌─── Personal Teaching Stats ───┐ ┌─── Department Stats ───┐│
│ │ 📚 My Classes: 3             │ │ 👥 Department Teachers: 5  ││
│ │ 👨‍🎓 My Students: 85           │ │ 🏫 Total Classes: 12       ││
│ │ 📝 Marks to Enter: 15        │ │ 📊 Dept Average: 14.8/20   ││
│ │ ⏰ My Periods Today: 4        │ │ 📈 Department Trend: ↗️    ││
│ └─────────────────────────────┘ └─────────────────────────┘│
│                                                         │
│ ┌─── Department Overview - Mathematics ───┐              │
│ │ Total Students: 340 | Total Teachers: 5               │
│ │ Department Average: 14.8/20 | Attendance: 94%         │
│ │ Recent Concerns: 2 | Pending Reviews: 3               │
│ │ [Manage Department] [View All Teachers] [Analytics]   │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ┌─── Today's Schedule ───┐  ┌─── Department Tasks ───┐   │
│ │ 8:00-9:00   Math - 5A  │  │ • Review Form 4 curriculum   │
│ │ 10:00-11:00 Math - 4B  │  │ • Teacher meeting tomorrow   │
│ │ 2:00-3:00   Math - 4A  │  │ • Analyze low performers     │
│ │ [Full Schedule]        │  │ • Coordinate with Principal  │
│ └─────────────────────── │  └─────────────────────────── │
└─────────────────────────────────────────────────────────┘
```

## Navigation Enhancement

### **Enhanced Main Navigation**
```
🏠 Dashboard | 📚 My Teaching | 👨‍🎓 My Students | 📝 Marks | 🎯 Quizzes | 🏢 DEPARTMENT | 📧 Messages
```

*Note: All regular teacher features remain identical, with additional "DEPARTMENT" section*

## Department Management (`/hod/department`)

### **API Integration**

#### **1. Get Department Overview**
**Endpoint:** `GET /api/v1/hod/department/overview`
- **Headers:** `Authorization: Bearer <token>`
- **Query Parameters:**
  ```typescript
  {
    academicYearId?: number;
    includeSubjectCoefficients?: boolean;
    includePeriodAnalysis?: boolean;
  }
  ```
- **Enhanced Response Data:**
  ```typescript
  {
    success: true;
    data: {
      department: {
        id: number;
        name: string;
        category: string; // Subject category from enum
        hodId: number;
        hodName: string;
        hodEmail: string;
        academicYearId: number;
        isCurrentYear: boolean;
      };
      statistics: {
        totalTeachers: number;
        totalStudents: number;
        totalClasses: number;
        totalSubjects: number;
        departmentAverage: number;
        schoolAverage: number;
        performanceRatio: number;     // Department vs School performance
        attendanceRate: number;
        passRate: number;
        excellenceRate: number;       // Students scoring >16/20
        improvementTrend: number;
        schoolRanking: number;        // Department ranking in school
        totalDepartments: number;     // For ranking context
      };
      subjects: Array<{
        id: number;
        name: string;
        category: string;
        teacherCount: number;
        studentCount: number;
        classCount: number;
        averageScore: number;
        coefficientStats: {
          averageCoefficient: number;
          minCoefficient: number;
          maxCoefficient: number;
          coefficientsSet: number;   // Classes with coefficients
          coefficientsTotal: number; // Total classes needing coefficients
        };
        periodDistribution: {
          totalPeriods: number;
          periodsAssigned: number;
          periodsUnassigned: number;
        };
        performanceByClass: Array<{
          classId: number;
          className: string;
          subClassName: string;
          averageScore: number;
          coefficient: number;
          studentCount: number;
        }>;
      }>;
      teacherWorkload: Array<{
        teacherId: number;
        teacherName: string;
        totalPeriods: number;
        totalStudents: number;
        subjectsCount: number;
        workloadPercentage: number;   // vs max hours per week
        efficiency: number;           // Performance per hour
      }>;
      recentActivity: Array<{
        id: number;
        type: "MARK_ENTRY" | "TEACHER_ASSIGNMENT" | "PERFORMANCE_REVIEW" | "COEFFICIENT_UPDATE" | "PERIOD_ASSIGNMENT";
        description: string;
        timestamp: string;
        teacherName: string;
        subjectName?: string;
        className?: string;
        impact: "HIGH" | "MEDIUM" | "LOW";
      }>;
      coefficientManagement: {
        totalSubjectClasses: number;
        coefficientsSet: number;
        coefficientsMissing: number;
        averageCoefficient: number;
        needsReview: Array<{
          subClassId: number;
          subClassName: string;
          subjectName: string;
          currentCoefficient?: number;
          recommendedCoefficient: number;
          reason: string;
        }>;
      };
      periodManagement: {
        totalPeriods: number;
        periodsAssigned: number;
        periodsUnassigned: number;
        conflictingPeriods: number;
        teacherUtilization: number;  // Average % of periods filled
        scheduleEfficiency: number;  // Optimal distribution score
      };
    };
  }
  ```

### **Department Dashboard**
```
┌─── Mathematics Department Management ───┐
│ Head of Department: [Your Name]          │
│ Subject: Mathematics | Code: MATH        │
│ Academic Year: 2024-2025                 │
│                                          │
│ ┌─── Department Statistics ───┐          │
│ │ Total Teachers: 5                     │
│ │ Total Students: 340                   │
│ │ Total Classes: 12                     │
│ │ Department Average: 14.8/20           │
│ │ Attendance Rate: 94%                  │
│ │ Pass Rate: 87%                        │
│ │ Improvement Trend: ↗️ +2.3% this term │
│ └─────────────────────────────────────┘ │
│                                          │
│ ┌─── Quick Actions ───┐                  │
│ │ [Department Teachers] [Performance Analytics] │
│ │ [Curriculum Planning] [Resource Management]   │
│ │ [Schedule Coordination] [Reports]             │
│ └────────────────────────────────────────────┘ │
└────────────────────────────────────────────────┘
```

## Department Teachers (`/hod/department/teachers`)

### **API Integration**

#### **1. Get Department Teachers**
**Endpoint:** `GET /api/v1/hod/department/teachers`
- **Headers:** `Authorization: Bearer <token>`
- **Query Parameters:**
  ```typescript
  {
    academicYearId?: number;
    includePerformance?: boolean;
    sortBy?: "NAME" | "PERFORMANCE" | "EXPERIENCE";
  }
  ```
- **Response Data:**
  ```typescript
  {
    success: true;
    data: Array<{
      id: number;
      name: string;
      email: string;
      phone?: string;
      experience: number;          // Years of experience
      status: "ACTIVE" | "ON_LEAVE" | "NEEDS_REVIEW";
      teachingAssignments: Array<{
        classId: number;
        className: string;
        subclassName: string;
        studentCount: number;
        averageScore?: number;
      }>;
      performance: {
        totalClasses: number;
        totalStudents: number;
        averageScore: number;
        attendanceRate: number;
        improvementTrend: "IMPROVING" | "STABLE" | "DECLINING";
        studentSatisfaction?: number;
        departmentRank: number;
      };
      lastEvaluation?: {
        date: string;
        score: number;
        evaluatedBy: string;
      };
    }>;
  }
  ```

#### **2. Request Teacher Transfer**
**Endpoint:** `POST /api/v1/hod/teacher-requests`
- **Request Body:**
  ```typescript
  {
    requestType: "TRANSFER_REQUEST" | "ADDITIONAL_TEACHER" | "PROFESSIONAL_DEVELOPMENT";
    teacherId?: number;          // For transfer requests
    targetDepartment?: number;   // For transfer requests
    justification: string;
    priority: "LOW" | "MEDIUM" | "HIGH";
    expectedOutcome: string;
  }
  ```

#### **3. Conduct Performance Review**
**Endpoint:** `POST /api/v1/hod/performance-reviews`
- **Request Body:**
  ```typescript
  {
    teacherId: number;
    reviewPeriod: {
      startDate: string;
      endDate: string;
    };
    metrics: {
      teachingEffectiveness: number;    // 1-5 scale
      studentEngagement: number;        // 1-5 scale
      professionalDevelopment: number;  // 1-5 scale
      collaboration: number;            // 1-5 scale
    };
    comments: string;
    recommendations: Array<string>;
    developmentPlan?: string;
  }
  ```

### **Teachers Management**
```
┌─── Mathematics Department Teachers ───┐
│ [Add Teacher] [Request Transfer] [Performance Review] │
│                                                       │
│ Teacher Name     Classes  Students  Avg Score  Status │
│ Mrs. Johnson     3        75       15.2/20     Active │
│ Mr. Smith        2        50       14.8/20     Active │
│ Ms. Davis        3        80       16.1/20     Active │
│ Mr. Wilson       2        60       13.9/20     Review │
│ Dr. Brown        2        75       15.8/20     Active │
│                                                       │
│ ┌─── Teacher Performance Summary ───┐                 │
│ │ Top Performer: Ms. Davis (16.1/20 avg)             │
│ │ Needs Support: Mr. Wilson (13.9/20 avg)            │
│ │ Department Goal: 15.0/20 average                    │
│ │ Current Status: 15.16/20 (Above target ✅)         │
│ └───────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

### **Individual Teacher Overview** (`/hod/department/teachers/:teacherId`)

#### **API Integration**
**Get Teacher Details:** `GET /api/v1/hod/department/teachers/:teacherId`
- **Response includes:** Complete teacher profile, performance metrics, class assignments

**Send Message to Teacher:** `POST /api/v1/hod/message-teacher`
- **Request Body:**
  ```typescript
  {
    teacherId: number;
    subject: string;
    message: string;
    priority?: "LOW" | "MEDIUM" | "HIGH";
    followUpRequired?: boolean;
  }
  ```

```
┌─── Teacher Profile - Mrs. Johnson ───┐
│ Name: Mrs. Johnson                    │
│ Teaching Experience: 8 years          │
│ Classes: Form 5A, 4B, 3A             │
│ Total Students: 75                    │
│ Subject Average: 15.2/20              │
└─────────────────────────────────────┘

┌─── Performance Metrics ───┐
│ Student Average: 15.2/20              │
│ Department Rank: 2/5 teachers         │
│ Attendance Rate: 96%                  │
│ Student Satisfaction: High            │
│ Improvement Trend: ↗️ Stable          │
└─────────────────────────────────────┘

┌─── Classes Teaching ───┐
│ Class    Students  Average  Attendance │
│ Form 5A  25        15.8/20  94%       │
│ Form 4B  23        14.9/20  98%       │
│ Form 3A  27        14.9/20  96%       │
└─────────────────────────────────────┘

┌─── Actions ───┐
│ [Send Message] [Schedule Meeting] [Performance Review] │
│ [Resource Request] [Class Reassignment] [Support Plan] │
└─────────────────────────────────────────────────────┘
```

## Department Analytics (`/hod/department/analytics`)

### **API Integration**

#### **1. Get Department Performance Analytics**
**Endpoint:** `GET /api/v1/hod/department/analytics`
- **Query Parameters:**
  ```typescript
  {
    academicYearId?: number;
    period?: "TERM" | "SEQUENCE" | "YEAR";
    includeComparison?: boolean;        // Compare with other departments
    includeTeacherBreakdown?: boolean;
  }
  ```
- **Response Data:**
  ```typescript
  {
    success: true;
    data: {
      departmentPerformance: {
        departmentAverage: number;
        schoolAverage: number;
        improvementFromLastYear: number;
        schoolRanking: number;
        percentileRank: number;
      };
      classPerformance: Array<{
        className: string;          // "Form 1", "Form 2", etc.
        averageScore: number;
        studentCount: number;
        status: "EXCELLENT" | "GOOD" | "AVERAGE" | "NEEDS_IMPROVEMENT";
        trend: "IMPROVING" | "STABLE" | "DECLINING";
      }>;
      teacherPerformance: Array<{
        teacherId: number;
        teacherName: string;
        averageScore: number;
        studentCount: number;
        improvement: number;
        ranking: number;
        status: "TOP_PERFORMER" | "GOOD" | "NEEDS_SUPPORT";
      }>;
      subjectBreakdown: Array<{
        subjectName: string;
        averageScore: number;
        teacherCount: number;
        topicStrengths: Array<string>;
        topicWeaknesses: Array<string>;
      }>;
      trends: {
        monthly: Array<{
          month: string;
          averageScore: number;
          attendanceRate: number;
        }>;
        comparative: {
          departmentGrowth: number;
          schoolGrowth: number;
          industryBenchmark?: number;
        };
      };
      recommendations: Array<{
        area: string;
        suggestion: string;
        priority: "HIGH" | "MEDIUM" | "LOW";
        expectedImpact: string;
      }>;
    };
  }
  ```

### **Performance Analytics**
```
┌─── Mathematics Department Analytics ───┐
│ Academic Year: 2024-2025 | Analysis Period: Full Year │
│                                                        │
│ ┌─── Overall Performance ───┐                         │
│ │ Department Average: 14.8/20                         │
│ │ School Average: 14.2/20                             │
│ │ Performance vs School: +0.6 (Above ✅)              │
│ │ Improvement from Last Year: +1.2                    │
│ └────────────────────────────────────────────────────┘ │
│                                                        │
│ ┌─── Class Performance Breakdown ───┐                  │
│ │ Form 6: 16.2/20 (Excellent)                        │
│ │ Form 5: 15.1/20 (Good)                             │
│ │ Form 4: 14.3/20 (Average)                          │
│ │ Form 3: 13.8/20 (Needs Improvement)                │
│ │ Form 2: 14.9/20 (Good)                             │
│ │ Form 1: 15.2/20 (Good)                             │
│ └────────────────────────────────────────────────────┘ │
│                                                        │
│ ┌─── Teacher Performance ───┐                          │
│ │ [📊 Chart showing teacher comparison]                │
│ │ Best Performing: Ms. Davis (16.1/20)                │
│ │ Most Improved: Mr. Smith (+2.1 from last term)      │
│ │ Needs Support: Mr. Wilson (13.9/20)                 │
│ └────────────────────────────────────────────────────┘ │
│                                                        │
│ [Export Report] [Share with Principal] [Print Analysis]│
└──────────────────────────────────────────────────────┘
```

## Subject Coefficient Management (`/hod/coefficients`)

### **API Integration**

#### **1. Get Subject Coefficients Overview**
**Endpoint:** `GET /api/v1/hod/coefficients/overview`
- **Query Parameters:**
  ```typescript
  {
    academicYearId?: number;
    subjectId?: number;
    classId?: number;
  }
  ```
- **Response Data:**
  ```typescript
  {
    success: true;
    data: {
      overview: {
        totalSubjectClasses: number;
        coefficientsSet: number;
        coefficientsMissing: number;
        averageCoefficient: number;
        weightedAverage: number;
      };
      subjectBreakdown: Array<{
        subjectId: number;
        subjectName: string;
        category: string;
        classCoefficientData: Array<{
          subClassId: number;
          subClassName: string;
          className: string;
          coefficient?: number;
          studentCount: number;
          averageScore?: number;
          status: "SET" | "MISSING" | "NEEDS_REVIEW";
          lastUpdated?: string;
          updatedBy?: string;
        }>;
        recommendations: Array<{
          subClassId: number;
          currentCoefficient?: number;
          recommendedCoefficient: number;
          reason: string;
          priority: "HIGH" | "MEDIUM" | "LOW";
        }>;
      }>;
      missingCoefficients: Array<{
        subClassSubjectId: number;
        subClassId: number;
        subClassName: string;
        className: string;
        subjectId: number;
        subjectName: string;
        studentCount: number;
        urgency: "HIGH" | "MEDIUM" | "LOW";
      }>;
    };
  }
  ```

#### **2. Update Subject Coefficient**
**Endpoint:** `PUT /api/v1/hod/coefficients/:subClassSubjectId`
- **Request Body:**
  ```typescript
  {
    coefficient: number;          // Must be > 0
    justification?: string;
    effectiveDate?: string;       // "YYYY-MM-DD"
    notifyTeachers?: boolean;
  }
  ```

#### **3. Bulk Update Coefficients**
**Endpoint:** `PUT /api/v1/hod/coefficients/bulk`
- **Request Body:**
  ```typescript
  {
    updates: Array<{
      subClassSubjectId: number;
      coefficient: number;
      justification?: string;
    }>;
    effectiveDate?: string;
    notifyTeachers?: boolean;
    academicYearId?: number;
  }
  ```

#### **4. Get Coefficient History**
**Endpoint:** `GET /api/v1/hod/coefficients/history`
- **Query Parameters:**
  ```typescript
  {
    subjectId?: number;
    subClassId?: number;
    academicYearId?: number;
    startDate?: string;
    endDate?: string;
  }
  ```

### **Coefficient Management Dashboard**
```
┌─── Subject Coefficient Management ───┐
│ [Overview] [Set Coefficients] [History] [Reports] │
│                                                   │
│ ┌─── Department Coefficient Overview ───┐         │
│ │ Total Subject-Class Combinations: 48             │
│ │ Coefficients Set: 42 (87.5%)                   │
│ │ Missing Coefficients: 6 (12.5%)                │
│ │ Average Coefficient: 2.8                       │
│ │ [Mass Update] [Export] [Generate Report]        │
│ └───────────────────────────────────────────────┘ │
│                                                   │
│ ┌─── Missing Coefficients (Urgent) ───┐           │
│ │ Subject        Class     Students  Action        │
│ │ Mathematics    Form 1A   25        [Set Now]    │
│ │ Mathematics    Form 2B   28        [Set Now]    │
│ │ Advanced Math  Form 6A   18        [Set Now]    │
│ │ Statistics     Form 5B   22        [Set Now]    │
│ │ [Bulk Set] [Recommend Values] [Notify Teachers] │
│ └───────────────────────────────────────────────┘ │
│                                                   │
│ ┌─── Subject Coefficient Distribution ───┐         │
│ │ Subject: Mathematics                             │
│ │ ┌─── By Class Level ───┐                        │
│ │ │ Form 1: 2.0 - 2.5 (Basic concepts)           │
│ │ │ Form 2: 2.5 - 3.0 (Intermediate)             │
│ │ │ Form 3: 3.0 - 3.5 (Advanced)                 │
│ │ │ Form 4: 3.5 - 4.0 (Pre-university)           │
│ │ │ Form 5: 4.0 - 4.5 (University prep)          │
│ │ │ Form 6: 4.5 - 5.0 (Specialized)              │
│ │ └─────────────────────────────────────────────┘ │
│ │ [Adjust Standards] [Apply Template] [Review]    │
│ └───────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

## Period & Timetable Management (`/hod/timetables`)

### **API Integration**

#### **1. Get Department Timetable Overview**
**Endpoint:** `GET /api/v1/hod/timetables/overview`
- **Query Parameters:**
  ```typescript
  {
    academicYearId?: number;
    weekId?: number;     // Specific week
  }
  ```
- **Response Data:**
  ```typescript
  {
    success: true;
    data: {
      departmentSchedule: {
        totalPeriods: number;
        periodsAssigned: number;
        periodsUnassigned: number;
        conflictingPeriods: number;
        teacherUtilization: number;   // Percentage
        subjectCoverage: number;      // Percentage of required periods
      };
      teacherSchedules: Array<{
        teacherId: number;
        teacherName: string;
        totalHoursPerWeek: number;
        scheduledHours: number;
        availableHours: number;
        utilizationRate: number;
        periods: Array<{
          periodId: number;
          day: string;
          startTime: string;
          endTime: string;
          subjectName: string;
          className: string;
          subClassName: string;
          conflictStatus?: "NONE" | "OVERLAP" | "OVERLOAD";
        }>;
      }>;
      subjectSchedules: Array<{
        subjectId: number;
        subjectName: string;
        requiredPeriodsPerWeek: number;
        scheduledPeriods: number;
        unscheduledPeriods: number;
        classDistribution: Array<{
          classId: number;
          className: string;
          subClassName: string;
          periodsPerWeek: number;
          teacherName?: string;
        }>;
      }>;
      conflicts: Array<{
        type: "TEACHER_DOUBLE_BOOKING" | "CLASSROOM_CONFLICT" | "SUBJECT_GAP";
        description: string;
        severity: "HIGH" | "MEDIUM" | "LOW";
        affectedTeacher?: string;
        affectedClass?: string;
        suggestedResolution: string;
      }>;
      recommendations: Array<{
        type: "OPTIMIZATION" | "COVERAGE" | "BALANCE";
        suggestion: string;
        impact: "HIGH" | "MEDIUM" | "LOW";
        effort: "LOW" | "MEDIUM" | "HIGH";
      }>;
    };
  }
  ```

#### **2. Assign Teacher to Period**
**Endpoint:** `POST /api/v1/hod/timetables/assign-period`
- **Request Body:**
  ```typescript
  {
    teacherId: number;
    subjectId: number;
    periodId: number;
    subClassId: number;
    academicYearId?: number;
    effectiveDate?: string;
    notes?: string;
  }
  ```

#### **3. Optimize Department Schedule**
**Endpoint:** `POST /api/v1/hod/timetables/optimize`
- **Request Body:**
  ```typescript
  {
    academicYearId?: number;
    optimizationGoals: Array<"TEACHER_BALANCE" | "SUBJECT_DISTRIBUTION" | "CONFLICT_RESOLUTION">;
    constraints: {
      maxHoursPerDay?: number;
      preferredBreakTimes?: Array<string>;
      teacherPreferences?: Array<{
        teacherId: number;
        unavailablePeriods: Array<number>;
      }>;
    };
    autoApply?: boolean;  // If false, returns recommendations only
  }
  ```

### **Timetable Management Dashboard**
```
┌─── Department Timetable Management ───┐
│ [Overview] [Assign Periods] [Optimize] [Conflicts] [Reports] │
│                                                              │
│ ┌─── Schedule Overview ───┐                                  │
│ │ Total Periods: 120 per week                               │
│ │ Assigned: 95 (79%)  | Unassigned: 25 (21%)              │
│ │ Teacher Utilization: 85% average                          │
│ │ Conflicts: 3 (2 high priority)                           │
│ │ [Auto-Optimize] [Resolve Conflicts] [Export Schedule]     │
│ └────────────────────────────────────────────────────────┘ │
│                                                              │
│ ┌─── Critical Issues ───┐                                    │
│ │ 🚨 HIGH: Mrs. Johnson double-booked Mon 10AM               │
│ │ • Form 3A Mathematics & Form 4B Advanced Math             │
│ │ • [Reassign] [Find Alternative] [Contact Teacher]         │
│ │                                                           │
│ │ ⚠️ MEDIUM: Form 5A missing 2 periods of Mathematics       │
│ │ • Only 3/5 weekly periods assigned                        │
│ │ • [Find Teacher] [Split Load] [Adjust Requirements]       │
│ └────────────────────────────────────────────────────────┘ │
│                                                              │
│ ┌─── Teacher Workload Analysis ───┐                          │
│ │ Teacher          Assigned  Max  Utilization  Status       │
│ │ Mrs. Johnson     18/20     20   90%          Optimal      │
│ │ Mr. Smith        12/18     18   67%          Underused    │
│ │ Ms. Davis        20/20     20   100%         At Capacity  │
│ │ Dr. Brown        15/16     16   94%          Optimal      │
│ │ [Balance Workload] [View Details] [Adjust Capacity]       │
│ └────────────────────────────────────────────────────────┘ │
│                                                              │
│ ┌─── Subject Coverage Analysis ───┐                          │
│ │ Subject        Required  Assigned  Coverage  Priority      │
│ │ Basic Math     40        38        95%      Low           │
│ │ Advanced Math  30        25        83%      Medium        │
│ │ Statistics     20        20        100%     None          │
│ │ Calculus       25        22        88%      Medium        │
│ │ [Increase Coverage] [Redistribute] [Add Periods]          │
│ └────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
```

## Department Students Overview (`/hod/department/students`)

### **API Integration**

#### **1. Get All Department Students**
**Endpoint:** `GET /api/v1/hod/department/students`
- **Query Parameters:**
  ```typescript
  {
    academicYearId?: number;
    classId?: number;
    teacherId?: number;
    subjectId?: number;
    performanceLevel?: "HIGH" | "MEDIUM" | "LOW";
    coefficientRange?: {
      min: number;
      max: number;
    };
    page?: number;
    limit?: number;
    search?: string;
    includeCoefficients?: boolean;
  }
  ```
- **Enhanced Response includes:** All students studying subjects in the department with performance metrics and coefficient impacts

#### **2. Identify Students Needing Support**
**Endpoint:** `GET /api/v1/hod/department/students/at-risk`
- **Query Parameters:**
  ```typescript
  {
    academicYearId?: number;
    riskFactors?: Array<"LOW_SCORES" | "HIGH_COEFFICIENT_IMPACT" | "ATTENDANCE" | "BEHAVIORAL">;
    thresholdScore?: number;
  }
  ```
- **Response:** Students performing below department thresholds with coefficient-weighted analysis

#### **3. Get Coefficient Impact Analysis**
**Endpoint:** `GET /api/v1/hod/department/students/coefficient-impact`
- **Response:** Analysis of how coefficient changes affect student rankings and overall scores

### **All Department Students**
```
┌─── All Mathematics Students ───┐
│ [Filter by Class ▼] [Filter by Teacher ▼] [Search...] │
│ Showing 340 students across all classes               │
│                                                       │
│ ┌─── Performance Overview ───┐                        │
│ │ Total Students: 340                                │
│ │ Above Average (>15): 156 students (46%)           │
│ │ Average (12-15): 134 students (39%)               │
│ │ Below Average (<12): 50 students (15%)            │
│ │ [Focus on Low Performers] [Excellence Program]     │
│ └──────────────────────────────────────────────────┘ │
│                                                       │
│ ┌─── Top Performers ───┐  ┌─── Needs Attention ───┐  │
│ │ Mary Smith  - 18.9/20 │  │ John Doe    - 9.2/20  │  │
│ │ Peter Jones - 18.7/20 │  │ Lisa Brown  - 8.8/20  │  │
│ │ Sarah Win   - 18.5/20 │  │ Mike Wilson - 9.5/20  │  │
│ │ [View All] [Recognize]│  │ [Support Plan] [Alert] │  │
│ └─────────────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

## Resource Management (`/hod/department/resources`)

### **API Integration**

#### **1. Get Department Resources**
**Endpoint:** `GET /api/v1/hod/department/resources`
- **Response Data:**
  ```typescript
  {
    success: true;
    data: {
      inventory: Array<{
        id: number;
        itemName: string;
        category: "TEXTBOOKS" | "EQUIPMENT" | "DIGITAL_RESOURCES" | "SUPPLIES";
        quantity: number;
        condition: "NEW" | "GOOD" | "FAIR" | "NEEDS_REPLACEMENT";
        lastUpdated: string;
        assignedTo?: string;
      }>;
      budgetStatus: {
        allocated: number;
        spent: number;
        remaining: number;
        pendingRequests: number;
      };
      recentRequests: Array<{
        id: number;
        itemRequested: string;
        quantity: number;
        justification: string;
        status: "PENDING" | "APPROVED" | "REJECTED";
        requestedBy: string;
        requestDate: string;
      }>;
    };
  }
  ```

#### **2. Submit Resource Request**
**Endpoint:** `POST /api/v1/hod/resource-requests`
- **Request Body:**
  ```typescript
  {
    itemName: string;
    category: "TEXTBOOKS" | "EQUIPMENT" | "DIGITAL_RESOURCES" | "SUPPLIES";
    quantity: number;
    estimatedCost?: number;
    justification: string;
    priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
    requestedFor: "DEPARTMENT" | "SPECIFIC_TEACHER" | "CLASSROOM";
    targetTeacherId?: number;    // If for specific teacher
    expectedDelivery?: string;   // Preferred delivery date
  }
  ```

### **Department Resources**
```
┌─── Mathematics Department Resources ───┐
│ [Request Resources] [Inventory] [Budget Planning]     │
│                                                       │
│ ┌─── Current Resources ───┐                          │
│ │ Textbooks: Mathematics for All Levels              │
│ │ Calculators: 45 Scientific Calculators             │
│ │ Teaching Aids: Geometric Tools, Charts             │
│ │ Digital Resources: Online Practice Platform        │
│ │ [Update Inventory] [Request More]                  │
│ └───────────────────────────────────────────────────┘ │
│                                                       │
│ ┌─── Budget Status ───┐                              │
│ │ Allocated Budget: 1,500,000 FCFA                   │
│ │ Spent: 1,200,000 FCFA (80%)                        │
│ │ Remaining: 300,000 FCFA                            │
│ │ Pending Requests: 3                                │
│ │ [View Budget Details] [Submit Request]             │
│ └───────────────────────────────────────────────────┘ │
│                                                       │
│ ┌─── Recent Resource Requests ───┐                    │
│ │ Request: New Geometry Set (Approved)               │
│ │ Request: Digital Projector (Pending)               │
│ │ Request: Advanced Calculators (Under Review)       │
│ │ [View All Requests] [Track Status]                 │
│ └───────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

## Curriculum Planning (`/hod/department/curriculum`)

### **API Integration**

#### **1. Get Curriculum Overview**
**Endpoint:** `GET /api/v1/hod/department/curriculum`
- **Response includes:** Subject syllabi, teaching schedules, assessment plans

#### **2. Update Curriculum**
**Endpoint:** `PUT /api/v1/hod/department/curriculum/:subjectId`
- **Request Body:**
  ```typescript
  {
    topics: Array<{
      topicName: string;
      weekNumber: number;
      objectives: Array<string>;
      resources: Array<string>;
      assessmentType: "FORMATIVE" | "SUMMATIVE";
    }>;
    assessmentSchedule: Array<{
      assessmentName: string;
      date: string;
      weight: number;
      description: string;
    }>;
    teachingMethods: Array<string>;
    requiredResources: Array<string>;
  }
  ```

### **Curriculum Planning Dashboard**
```
┌─── Mathematics Curriculum Planning ───┐
│ Academic Year: 2024-2025                │
│ [Edit Curriculum] [Assessment Schedule] [Resources] │
│                                         │
│ ┌─── Subject Breakdown ───┐             │
│ │ Form 1 Math: Algebra Basics           │
│ │ Form 2 Math: Geometry & Trigonometry  │
│ │ Form 3 Math: Advanced Algebra         │
│ │ Form 4 Math: Calculus Introduction    │
│ │ Form 5 Math: Advanced Calculus        │
│ │ [View Details] [Edit Syllabus]        │
│ └─────────────────────────────────────┘ │
│                                         │
│ ┌─── Assessment Schedule ───┐           │
│ │ Sequence 1: Feb 15-22 (Planned)       │
│ │ Sequence 2: Apr 10-17 (Scheduled)     │
│ │ Final Exams: Jun 5-12 (Planned)       │
│ │ [Modify Dates] [Coordinate with HODs]  │
│ └─────────────────────────────────────┘ │
└───────────────────────────────────────┘
```

## Reports & Communication (`/hod/reports`)

### **API Integration**

#### **1. Generate Department Reports**
**Endpoint:** `GET /api/v1/hod/reports`
- **Query Parameters:**
  ```typescript
  {
    reportType: "PERFORMANCE" | "TEACHER_EVALUATION" | "RESOURCE_UTILIZATION" | "CURRICULUM_PROGRESS";
    period: "MONTHLY" | "QUARTERLY" | "ANNUAL";
    includeRecommendations?: boolean;
    format?: "json" | "pdf" | "excel";
  }
  ```

#### **2. Submit to Principal**
**Endpoint:** `POST /api/v1/hod/submit-report`
- **Request Body:**
  ```typescript
  {
    reportType: string;
    reportData: object;
    summary: string;
    recommendations: Array<string>;
    requestMeeting?: boolean;
  }
  ```

### **HOD Reports Dashboard**
```
┌─── HOD Reports & Communication ───┐
│ [Department Reports] [Principal Communication] [Teacher Feedback] │
│                                                                   │
│ ┌─── Monthly Department Report ───┐                               │
│ │ Performance Summary: Above School Average                       │
│ │ Teacher Development: 2 completed training programs             │
│ │ Resource Utilization: 85% budget used effectively             │
│ │ Student Progress: 15% showing significant improvement          │
│ │ [Generate Report] [Submit to Principal]                       │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│ ┌─── Communication Center ───┐                                    │
│ │ [Message All Teachers] [Send Report to Principal]              │
│ │ [Request Budget Allocation] [Coordinate with Other HODs]        │
│ │ [Parent Communication] [Student Recognition]                   │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Error Handling & Loading States

### **API Error Handling**
```typescript
// Standard error response format
{
  success: false;
  error: string; // User-friendly error message
}

// HOD-specific error scenarios:
// 403: "Department access denied" | "Cannot modify other department data"
// 404: "Teacher not in your department" | "Resource not found"
// 409: "Teacher already assigned" | "Resource conflict"
// 500: "Department analytics failed" | "Report generation failed"
```

### **Loading & Validation States**
- Real-time department performance updates
- Teacher evaluation progress tracking
- Resource request status monitoring
- Curriculum planning auto-save
- Budget utilization alerts

### **Success Feedback**
- Teacher evaluation completion confirmations
- Resource request submission notifications
- Report generation and submission status
- Performance improvement alerts
- Department achievement celebrations

**Frontend Implementation Notes:**
1. **Inherit all Teacher functionality:** HOD interface should include all teacher features plus department management
2. **Dashboard integration:** Seamlessly switch between personal teaching view and department management view
3. **Teacher performance tracking:** Implement comprehensive teacher evaluation and support systems
4. **Resource management:** Include inventory tracking and budget monitoring capabilities
5. **Curriculum coordination:** Enable collaborative curriculum planning and assessment scheduling
6. **Communication tools:** Facilitate communication with teachers, principal, and other HODs
7. **Analytics and reporting:** Provide comprehensive department performance analytics
8. **Mobile responsiveness:** Ensure department management features work well on mobile devices
9. **Real-time updates:** Implement live updates for department statistics and teacher performance
10. **Export capabilities:** Allow export of department reports and analytics in multiple formats