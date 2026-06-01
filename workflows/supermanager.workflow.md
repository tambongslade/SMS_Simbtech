# SUPER_MANAGER Role - Complete Workflow & UX Design

*Note: SUPER_MANAGER has system-wide administrative access and oversight of all operations*

## Post-Login Super Manager Dashboard (`/super-manager/dashboard`)

### **Comprehensive Admin Dashboard Layout**
```
┌─────────────────────────────────────────────────────────┐
│ [🏠] School Management System    [🔔] [👤] [⚙️] [🚪]    │
├─────────────────────────────────────────────────────────┤
│ Welcome back, [Admin Name] | System Administrator       │
│ Complete System Access | Current Year: 2024-2025        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ ┌─── System Overview ───┐                              │
│ │ 👥 Total Users: [Total Users]      👨‍🎓 Students: [Total Students] │
│ │ 👨‍🏫 Teachers: [Total Teachers]   🏫 Classes: [Total Classes] │
│ │ 📅 Academic Years: [Active Academic Years]                 │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ┌─── Academic Progress ───┐   ┌─── Financial Summary ───┐ │
│ │ Total Enrolled: [Total Enrolled] │ Total Revenue: [Total Revenue] FCFA │
│ │ Pending Interviews: [Pending Interviews] │ Outstanding Fees: [Outstanding Fees] FCFA │
│ │ Unassigned Students: [Unassigned Students] │ Collection Rate: [Collection Rate]%       │
│ │ Avg. Attendance Rate: [Average Attendance Rate]% │ [View Financial Trends]                 │
│ │ Overall Grades: [Overall Grades]              │                                         │
│ └─────────────────────────┘ └─────────────────────────┘ │
│                                                         │
│ ┌─── Operational Insights ───┐                          │
│ │ Recent Audit Activities: [Recent Audit Activities Count] │
│ │ System Health: [System Health Performance]            │
│ │ Last Backup: [Last Backup Date]                        │
│ │ Uptime: [Uptime]                                      │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

#### **API Integration:**
**Primary Endpoint:** `GET /api/v1/dashboard/super-manager/enhanced`
- **Headers:** `Authorization: Bearer <token>`
- **Response (200):**
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

---

## Main Navigation Menu

### **Sidebar Navigation**
```
┌─ SYSTEM ADMINISTRATION ─┐
├─ 📊 Dashboard
├─ 📅 Academic Years
├─ 👥 User Management  
├─ 🏫 School Structure
├─ 💰 Financial Overview
├─ 📚 Academic Management
├─ 🚨 Discipline Overview
├─ 📄 Report Card Management
├─ 📈 Reports & Analytics
├─ ⚙️ System Settings
└─ 🔧 System Maintenance
```

---

## 1. Academic Year Management (`/super-manager/academic-years`)

### **Academic Years Page**
```
┌─────────────────────────────────────────────────────────┐
│ Academic Year Management                [➕ New Year]   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ ┌─── Academic Years List ───┐                          │
│ │ 🟢 [Current Academic Year Name] (Current)     [📊 View Details] [⚙️ Edit] [Set Current]    │
│ │    [Current Year Start Date] - [Current Year End Date]                        │
│ │    Students: [Current Year Student Count] | Personnel: [Current Year Personnel Count]                   │
│ │                                                       │
│ │ ⚪ [Previous Academic Year Name] (Previous)     [📊 View Details] [⚙️ Edit] [Archive/Delete]       │
│ │    [Previous Year Start Date] - [Previous Year End Date]                        │
│ │    Students: [Previous Year Student Count] | Personnel: [Previous Year Personnel Count]                   │
│ │                                                       │
│ │ ⚪ [Archived Academic Year Name] (Archived)     [📊 View Details] [⚙️ Edit] [Delete]        │
│ │    [Archived Year Start Date] - [Archived Year End Date]                        │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### **Create New Academic Year Modal**
- **Form Fields:**
  - Name (e.g., "2025-2026")
  - Start Date (YYYY-MM-DD)
  - End Date (YYYY-MM-DD)
  - Set as Current (checkbox)
  - Terms (Optional - Name, Start Date, End Date, Fee Deadline per term)

#### **API Integration:**

#### **Get All Academic Years**
**Endpoint:** `GET /api/v1/academic-years`
- **Headers:** `Authorization: Bearer <token>`
- **Response (200):**
  ```typescript
  {
    success: true;
    data: Array<{
      id: number;
      name: string;
      startDate: string;
      endDate: string;
      isCurrent: boolean;
      terms: Array<{
        id: number;
        name: string;
        startDate: string;
        endDate: string;
        feeDeadline: string;
      }>;
      examSequences: Array<object>;
    }>;
  }
  ```

#### **Create Academic Year**
**Endpoint:** `POST /api/v1/academic-years`
- **Headers:** `Authorization: Bearer <token>`
- **Request Body:**
  ```typescript
  {
    name: string;
    startDate: string; // "YYYY-MM-DD"
    endDate: string;   // "YYYY-MM-DD"
    terms?: Array<{
      name: string;
      startDate: string; // "YYYY-MM-DD"
      endDate: string;   // "YYYY-MM-DD"
      feeDeadline?: string; // "YYYY-MM-DD"
    }>;
  }
  ```
- **Response (201):**
  ```typescript
  {
    success: true;
    data: {
      id: number;
      name: string;
      startDate: string;
      endDate: string;
      isCurrent: boolean;
      terms: Array<object>;
    };
  }
  ```

#### **Update Academic Year**
**Endpoint:** `PUT /api/v1/academic-years/:id`
- **Headers:** `Authorization: Bearer <token>`
- **Path Parameters:** `id` (number): Academic Year ID
- **Request Body:**
  ```typescript
  {
    name?: string;
    startDate?: string; // "YYYY-MM-DD"
    endDate?: string;   // "YYYY-MM-DD"
    isCurrent?: boolean;
  }
  ```
- **Response (200):**
  ```typescript
  {
    success: true;
    data: {
      id: number;
      name: string;
      startDate: string;
      endDate: string;
      isCurrent: boolean;
    };
  }
  ```

#### **Set Academic Year as Current**
**Endpoint:** `POST /api/v1/academic-years/:id/set-current`
- **Headers:** `Authorization: Bearer <token>`
- **Path Parameters:** `id` (number): Academic Year ID
- **Response (200):**
  ```typescript
  {
    success: true;
    message: string;
    data: {
      id: number;
      name: string;
      startDate: string;
      endDate: string;
      isCurrent: boolean;
    };
  }
  ```

#### **Delete Academic Year**
**Endpoint:** `DELETE /api/v1/academic-years/:id`
- **Headers:** `Authorization: Bearer <token>`
- **Path Parameters:** `id` (number): Academic Year ID
- **Response (200):**
  ```typescript
  {
    success: true;
    message: "Academic year deleted successfully";
  }
  ```
- **Error Response (409 Conflict):**
  ```typescript
  {
    success: false;
    error: string; // e.g., "Cannot delete academic year. It is referenced by: X enrollment(s), Y user role(s)"
  }
  ```

---

## 2. User Management (`/super-manager/users`)

### **User Management Page**
```
┌─────────────────────────────────────────────────────────┐
│ User Management                       [➕ Create User]   │
├─────────────────────────────────────────────────────────┤
│ [Filter: All Roles] [Filter: Active] [Search: Name/Email/Matricule] │
│                                                         │
│ ┌─── Users List ───┐                                   │
│ │ 👤 John Doe (SUPER_MANAGER)  john.doe@school.com   │
│ │    Active | Phone: 677xxxxxxx | Last Login: 2024-01-20 │
│ │    [View Details] [⚙️ Edit] [🔒 Reset Password] [🗑️ Delete] │
│ │ ─────────────────────────────────────              │
│ │ 👤 Jane Smith (TEACHER, 2024-2025) jane.smith@school.com │
│ │    Active | Phone: 678xxxxxxx | Last Login: 2024-01-19 │
│ │    [View Details] [⚙️ Edit] [Assign Role]            │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### **Create New User Modal / User Details Page**
- **Form Fields:**
  - Name, Email, Password, Gender, Date of Birth, Phone, Address, ID Card Number, Photo
  - Roles (with Academic Year selection for year-specific roles)

#### **API Integration:**

#### **1. Get All Users**
**Endpoint:** `GET /api/v1/users`
- **Headers:** `Authorization: Bearer <token>`
- **Query Parameters:**
  ```typescript
  {
    name?: string;
    email?: string;
    role?: "SUPER_MANAGER" | "MANAGER" | "PRINCIPAL" | "VICE_PRINCIPAL" | "BURSAR" | "DISCIPLINE_MASTER" | "TEACHER" | "HOD" | "PARENT" | "STUDENT";
    status?: "ACTIVE" | "INACTIVE" | "SUSPENDED";
    academicYearId?: number; // Filter users by roles in a specific academic year
    page?: number;
    limit?: number;
    sortBy?: "name" | "email" | "matricule" | "createdAt";
    sortOrder?: "asc" | "desc";
  }
  ```
- **Response (200):**
  ```typescript
  {
    success: true;
    data: Array<{
      id: number;
      name: string;
      email: string;
      matricule?: string;
      gender: "MALE" | "FEMALE";
      dateOfBirth: string;
      phone: string;
      address: string;
      idCardNum?: string;
      photo?: string;
      status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
      createdAt: string;
      updatedAt: string;
      userRoles: Array<{
        id: number;
        role: "SUPER_MANAGER" | "MANAGER" | "PRINCIPAL" | "VICE_PRINCIPAL" | "BURSAR" | "DISCIPLINE_MASTER" | "TEACHER" | "HOD" | "PARENT" | "STUDENT";
        academicYearId?: number;
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

#### **2. Create User**
**Endpoint:** `POST /api/v1/users`
- **Headers:** `Authorization: Bearer <token>`
- **Request Body:**
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
    roles: Array<{
      role: "SUPER_MANAGER" | "MANAGER" | "PRINCIPAL" | "VICE_PRINCIPAL" | "BURSAR" | "DISCIPLINE_MASTER" | "TEACHER" | "HOD" | "PARENT" | "STUDENT";
      academicYearId?: number; // null for global roles
    }>;
  }
  ```
- **Response (201):**
  ```typescript
  {
    success: true;
    data: {
      id: number;
      name: string;
      email: string;
      matricule: string;
      // ... other created user details
    };
  }
  ```

#### **3. Get User by ID**
**Endpoint:** `GET /api/v1/users/:id`
- **Headers:** `Authorization: Bearer <token>`
- **Path Parameters:** `id` (number): User ID
- **Response (200):**
  ```typescript
  {
    success: true;
    data: {
      id: number;
      name: string;
      email: string;
      matricule?: string;
      // ... full user details including userRoles array
    };
  }
  ```

#### **4. Update User**
**Endpoint:** `PUT /api/v1/users/:id`
- **Headers:** `Authorization: Bearer <token>`
- **Path Parameters:** `id` (number): User ID
- **Request Body:**
  ```typescript
  {
    name?: string;
    email?: string;
    password?: string;
    phone?: string;
    address?: string;
    status?: "ACTIVE" | "INACTIVE" | "SUSPENDED";
    // ... any other updatable fields
  }
  ```
- **Response (200):**
  ```typescript
  {
    success: true;
    data: {
      id: number;
      name: string;
      // ... updated user details
    };
  }
  ```

#### **5. Delete User**
**Endpoint:** `DELETE /api/v1/users/:id`
- **Headers:** `Authorization: Bearer <token>`
- **Path Parameters:** `id` (number): User ID
- **Response (200):**
  ```typescript
  {
    success: true;
    message: "User deleted successfully";
  }
  ```

#### **6. Assign Role to User**
**Endpoint:** `POST /api/v1/users/:id/roles`
- **Headers:** `Authorization: Bearer <token>`
- **Path Parameters:** `id` (number): User ID
- **Request Body:**
  ```typescript
  {
    role: "SUPER_MANAGER" | "MANAGER" | "PRINCIPAL" | "VICE_PRINCIPAL" | "BURSAR" | "DISCIPLINE_MASTER" | "TEACHER" | "HOD" | "PARENT" | "STUDENT";
    academicYearId?: number; // Required for year-specific roles, null for global
  }
  ```
- **Response (200):**
  ```typescript
  {
    success: true;
    data: {
      id: number;
      userId: number;
      role: string;
      academicYearId?: number;
    };
  }
  ```

#### **7. Remove Role from User**
**Endpoint:** `DELETE /api/v1/users/:id/roles`
- **Headers:** `Authorization: Bearer <token>`
- **Path Parameters:** `id` (number): User ID
- **Request Body:**
  ```typescript
  {
    role: "SUPER_MANAGER" | "MANAGER" | "PRINCIPAL" | "VICE_PRINCIPAL" | "BURSAR" | "DISCIPLINE_MASTER" | "TEACHER" | "HOD" | "PARENT" | "STUDENT";
    academicYearId?: number; // Required for year-specific roles, null for global
  }
  ```
- **Response (200):**
  ```typescript
  {
    success: true;
    message: "Role removed successfully";
  }
  ```

---

## 3. School Structure Management (`/super-manager/school-structure`)

### **Classes & Subclasses Page**
```
┌─────────────────────────────────────────────────────────┐
│ School Structure: Classes & Subjects  [➕ New Class]    │
├─────────────────────────────────────────────────────────┤
│ [Filter: All Levels] [Search: Class/Subclass Name]      │
│                                                         │
│ ┌─── Classes List ───┐                                 │
│ │ 🏫 [Class Name] (Level [Class Level])                                   │
│ │    Students: [Total Students] | Subclasses: [Total Subclasses] │
│ │    Base Fee: [Base Fee] FCFA | New Student Fee: [New Student Fee] FCFA │
│ │    [View Details] [⚙️ Edit] [🗑️ Delete]               │
│ │ ─────────────────────────────────────              │
│ │  ┌─── Subclasses: [Subclass Name] ───┐                     │
│ │  │ Master: [Class Master Name] | Students: [Student Count] │
│ │  │ Subjects: [Subject Name 1] (Coeff [Coefficient 1]), [Subject Name 2] (Coeff [Coefficient 2])     │
│ │  │ [View Details] [⚙️ Edit] [Assign Master] [➕ Subject] [🗑️ Delete] │
│ │  └─────────────────────────────┘                     │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ┌─── Subjects List ───┐                                 │
│ │ 📚 [Subject Name] ([Subject Category])                             │
│ │    Teachers: [Teacher Count] | Linked Classes: [Linked Class Count] │
│ │    [View Details] [⚙️ Edit] [Assign Teacher] [➕ Class Link] [🗑️ Delete] │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### **Create/Update Class Modal**
- **Form Fields:**
  - Name, Level, Base Fee, Miscellaneous Fee, New Student Fee, Old Student Fee, First Term Fee, Second Term Fee, Third Term Fee

### **Create/Update Subclass Modal**
- **Form Fields:**
  - Name, Class Master (User ID)

### **Assign Subject to Subclass Modal**
- **Form Fields:**
  - Subject, Coefficient

#### **API Integration:**

#### **1. Get All Classes**
**Endpoint:** `GET /api/v1/classes`
- **Headers:** `Authorization: Bearer <token>`
- **Query Parameters:**
  ```typescript
  {
    name?: string;
    id?: number;
    level?: number;
    legacy?: "true" | "false"; // Use "true" for nested subclasses and student counts
    page?: number;
    limit?: number;
    sortBy?: "name" | "id";
    sortOrder?: "asc" | "desc";
  }
  ```
- **Response (200 - Paginated):**
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
      studentCount: number;
      academicYearId: number;
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
- **Response (200 - Legacy `legacy=true`):**
  ```typescript
  {
    success: true;
    data: Array<{
      id: number;
      name: string;
      maxStudents: number;
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
      studentCount: number;
      academicYearId: number;
      subClasses: Array<{
        id: number;
        name: string;
        classId: number;
        classMasterId?: number;
        studentCount: number;
        subClassSubjects: Array<{
          subjectId: number;
        }>;
      }>;
    }>;
  }
  ```

#### **2. Create Class**
**Endpoint:** `POST /api/v1/classes`
- **Headers:** `Authorization: Bearer <token>`
- **Request Body:**
  ```typescript
  {
    name: string;
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
- **Response (201):**
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

#### **3. Get Class by ID**
**Endpoint:** `GET /api/v1/classes/:id`
- **Headers:** `Authorization: Bearer <token>`
- **Path Parameters:** `id` (number): Class ID
- **Response (200):**
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
      studentCount: number;
      academicYearId: number;
      subClasses: Array<{
        id: number;
        name: string;
        classMasterId?: number;
        createdAt: string;
        updatedAt: string;
        studentCount: number;
        classMaster?: { // Class master user object if assigned
          id: number;
          name: string;
          matricule: string;
          email: string;
        };
      }>;
    };
  }
  ```

#### **4. Update Class Details**
**Endpoint:** `PUT /api/v1/classes/:id`
- **Headers:** `Authorization: Bearer <token>`
- **Path Parameters:** `id` (number): Class ID
- **Request Body:**
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
- **Response (200):**
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

#### **5. Delete Class**
**Endpoint:** `DELETE /api/v1/classes/:id`
- **Headers:** `Authorization: Bearer <token>`
- **Path Parameters:** `id` (number): Class ID
- **Response (200):**
  ```typescript
  {
    success: true;
    message: "Class deleted successfully";
  }
  ```
- **Error Response (409 Conflict):**
  ```typescript
  {
    success: false;
    error: string; // e.g., "Cannot delete class, it has associated subclasses"
  }
  ```

#### **6. Get All Subclasses**
**Endpoint:** `GET /api/v1/classes/sub-classes`
- **Headers:** `Authorization: Bearer <token>`
- **Query Parameters:**
  ```typescript
  {
    name?: string;
    id?: number;
    classId?: number;
    includeSubjects?: "true" | "false";
    page?: number;
    limit?: number;
    sortBy?: "name" | "id";
    sortOrder?: "asc" | "desc";
  }
  ```
- **Response (200):**
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
      };
      classMaster?: { // Class master user object if assigned
        id: number;
        name: string;
        matricule: string;
        email: string;
      };
      studentCount: number;
      academicYearId: number;
      subjects?: Array<{
        id: number;
        name: string;
        category: string;
        coefficient: number;
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

#### **7. Add New Subclass to a Class**
**Endpoint:** `POST /api/v1/classes/:id/sub-classes`
- **Headers:** `Authorization: Bearer <token>`
- **Path Parameters:** `id` (number): Class ID
- **Request Body:**
  ```typescript
  {
    name: string;
  }
  ```
- **Response (201):**
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

#### **8. Update Subclass**
**Endpoint:** `PUT /api/v1/classes/:id/sub-classes/:subClassId`
- **Headers:** `Authorization: Bearer <token>`
- **Path Parameters:** `id` (number): Class ID, `subClassId` (number): Subclass ID
- **Request Body:**
  ```typescript
  {
    name: string;
  }
  ```
- **Response (200):**
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

#### **9. Delete Subclass**
**Endpoint:** `DELETE /api/v1/classes/:id/sub-classes/:subClassId`
- **Headers:** `Authorization: Bearer <token>`
- **Path Parameters:** `id` (number): Class ID, `subClassId` (number): Subclass ID
- **Response (200):**
  ```typescript
  {
    success: true;
    message: "Subclass deleted successfully";
  }
  ```
- **Error Response (409 Conflict):**
  ```typescript
  {
    success: false;
    error: string; // e.g., "Cannot be deleted, subclass already has students"
  }
  ```

#### **10. Assign Class Master to a Subclass**
**Endpoint:** `POST /api/v1/classes/sub-classes/:subClassId/class-master`
- **Headers:** `Authorization: Bearer <token>`
- **Path Parameters:** `subClassId` (number): Subclass ID
- **Request Body:**
  ```typescript
  {
    userId: number;
  }
  ```
- **Response (200):**
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
      classMaster: { // assigned teacher user details
        id: number;
        name: string;
        matricule: string;
        email: string;
      };
    };
  }
  ```

#### **11. Get the Class Master of a Subclass**
**Endpoint:** `GET /api/v1/classes/sub-classes/:subClassId/class-master`
- **Headers:** `Authorization: Bearer <token>`
- **Path Parameters:** `subClassId` (number): Subclass ID
- **Response (200):**
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
    } | null;
  }
  ```

#### **12. Remove the Class Master from a Subclass**
**Endpoint:** `DELETE /api/v1/classes/sub-classes/:subClassId/class-master`
- **Headers:** `Authorization: Bearer <token>`
- **Path Parameters:** `subClassId` (number): Subclass ID
- **Response (200):**
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

#### **13. Get All Subjects**
**Endpoint:** `GET /api/v1/subjects`
- **Headers:** `Authorization: Bearer <token>`
- **Query Parameters:**
  ```typescript
  {
    name?: string;
    category?: "SCIENCE" | "ARTS" | "COMMERCIAL" | "LANGUAGES" | "OTHER";
    id?: number;
    includeTeachers?: "true" | "false";
    includeSubClasses?: "true" | "false";
    page?: number;
    limit?: number;
    sortBy?: "name" | "id" | "category";
    sortOrder?: "asc" | "desc";
  }
  ```
- **Response (200):**
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
      teachers?: Array<{
        id: number;
        name: string;
        email: string;
        matricule: string;
      }>;
      subClasses?: Array<{
        id: number;
        name: string;
        className: string;
        classId: number;
        coefficient: number;
      }>;
    }>;
    meta: { // ... pagination details ...
      total: number;
      page: number;
      limit: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
  }
  ```

#### **14. Create New Subject**
**Endpoint:** `POST /api/v1/subjects`
- **Headers:** `Authorization: Bearer <token>`
- **Request Body:**
  ```typescript
  {
    name: string;
    category: "SCIENCE" | "ARTS" | "COMMERCIAL" | "LANGUAGES" | "OTHER";
  }
  ```
- **Response (201):**
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

#### **15. Get Subject by ID**
**Endpoint:** `GET /api/v1/subjects/:id`
- **Headers:** `Authorization: Bearer <token>`
- **Path Parameters:** `id` (number): Subject ID
- **Response (200):**
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
      teachers: Array<{
        id: number;
        name: string;
        email: string;
        matricule: string;
      }>;
      subClasses: Array<{
        id: number;
        name: string;
        className: string;
        classId: number;
        coefficient: number;
      }>;
    };
  }
  ```

#### **16. Update Subject Details**
**Endpoint:** `PUT /api/v1/subjects/:id`
- **Headers:** `Authorization: Bearer <token>`
- **Path Parameters:** `id` (number): Subject ID
- **Request Body:**
  ```typescript
  {
    name?: string;
    category?: "SCIENCE" | "ARTS" | "COMMERCIAL" | "LANGUAGES" | "OTHER";
  }
  ```
- **Response (200):**
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

#### **17. Delete Subject**
**Endpoint:** `DELETE /api/v1/subjects/:id`
- **Headers:** `Authorization: Bearer <token>`
- **Path Parameters:** `id` (number): Subject ID
- **Response (200):**
  ```typescript
  {
    success: true;
    message: "Subject deleted successfully";
  }
  ```

#### **18. Assign Teacher to a Subject**
**Endpoint:** `POST /api/v1/subjects/:id/teachers`
- **Headers:** `Authorization: Bearer <token>`
- **Path Parameters:** `id` (number): Subject ID
- **Request Body:**
  ```typescript
  {
    teacherId: number;
  }
  ```
- **Response (201):**
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

#### **19. Link Subject to a Subclass (with Coefficient)**
**Endpoint:** `POST /api/v1/subjects/:id/sub-classes`
- **Headers:** `Authorization: Bearer <token>`
- **Path Parameters:** `id` (number): Subject ID
- **Request Body:**
  ```typescript
  {
    subClassId: number;
    coefficient: number;
  }
  ```
- **Response (201):**
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

#### **20. Unlink Subject from a Subclass**
**Endpoint:** `DELETE /api/v1/subjects/:subjectId/sub-classes/:subClassId`
- **Headers:** `Authorization: Bearer <token>`
- **Path Parameters:** `subjectId` (number): Subject ID, `subClassId` (number): Subclass ID
- **Response (200):**
  ```typescript
  {
    success: true;
    message: "Subject ID X successfully unlinked from subclass ID Y";
  }
  ```

#### **21. Assign a Subject to All Subclasses of a Class**
**Endpoint:** `POST /api/v1/subjects/:subjectId/classes/:classId`
- **Headers:** `Authorization: Bearer <token>`
- **Path Parameters:** `subjectId` (number): Subject ID, `classId` (number): Class ID
- **Request Body:**
  ```typescript
  {
    coefficient: number;
  }
  ```
- **Response (201):**
  ```typescript
  {
    success: true;
    message: string; // e.g., "Subject successfully assigned to all subclasses of class ID X"
    data: Array<{
      id: number;
      subjectId: number;
      subClassId: number;
      coefficient: number;
      createdAt: string;
      updatedAt: string;
    }>;
  }
  ```

---

## 4. Financial Overview (`/super-manager/financial-overview`)

### **Financial Overview Page**
```
┌─────────────────────────────────────────────────────────┐
│ Financial Overview                    [📈 View Reports] │
├─────────────────────────────────────────────────────────┤
│ [Filter: Academic Year] [Filter: Timeframe]             │
│                                                         │
│ ┌─── Key Financial Metrics ───┐                        │
│ │ Total Expected Revenue: [Total Expected Revenue] FCFA │
│ │ Total Collected Revenue: [Total Collected Revenue] FCFA │
│ │ Outstanding Amount: [Outstanding Amount] FCFA         │
│ │ Collection Rate: [Collection Rate]%                   │
│ │ Total Students: [Total Students] | Paid Students: [Paid Students] │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ┌─── Monthly Collection Trends ───┐                    │
│ │ [Chart showing monthly revenue, target, collections, outstanding] │
│ │ For [Month 1]: Collected [Collected 1] / Expected [Expected 1] (Rate: [Rate 1]%) │
│ │ For [Month 2]: Collected [Collected 2] / Expected [Expected 2] (Rate: [Rate 2]%) │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ┌─── Fee Categories Breakdown ───┐                      │
│ │ School Fees: Collected [Collected School Fees] / Total [Total School Fees] (Rate: [Rate School Fees]%) │
│ │ Miscellaneous Fees: Collected [Collected Misc Fees] / Total [Total Misc Fees] (Rate: [Rate Misc Fees]%) │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ┌─── Top Defaulters ───┐                                │
│ │ 👤 [Student 1 Name] (Class [Class 1 Name]): [Amount Owed 1] FCFA ([Days Past Due 1] days overdue) │
│ │ 👤 [Student 2 Name] (Class [Class 2 Name]): [Amount Owed 2] FCFA ([Days Past Due 2] days overdue) │
│ │ [View All Defaulters] [Send Reminders]                │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### **API Integration:**

#### **1. Get Financial Overview**
**Endpoint:** `GET /api/v1/dashboard/financial-overview`
- **Headers:** `Authorization: Bearer <token>`
- **Query Parameters:**
  ```typescript
  {
    academicYearId?: number;
    timeframe?: "month" | "quarter" | "year";
  }
  ```
- **Response (200):**
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

#### **2. Get Student Registration Analytics**
**Endpoint:** `GET /api/v1/dashboard/student-registration`
- **Headers:** `Authorization: Bearer <token>`
- **Query Parameters:**
  ```typescript
  {
    academicYearId?: number;
    timeframe?: "week" | "month" | "quarter";
  }
  ```
- **Response (200):**
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

#### **3. Get Interview Management Analytics**
**Endpoint:** `GET /api/v1/dashboard/interview-management`
- **Headers:** `Authorization: Bearer <token>`
- **Query Parameters:**
  ```typescript
  {
    academicYearId?: number;
    status?: "SCHEDULED" | "COMPLETED" | "PENDING";
  }
  ```
- **Response (200):**
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

## 5. Academic Management (`/super-manager/academic-management`)

### **Academic Management Page**
```
┌─────────────────────────────────────────────────────────┐
│ Academic Management                     [📚 New Exam]   │
├─────────────────────────────────────────────────────────┤
│ [Filter: Academic Year]                                 │
│                                                         │
│ ┌─── Teacher Analytics Overview ───┐                    │
│ │ Total Teachers: [Total Teachers] | Active: [Active Teachers] │
│ │ Avg. Attendance Rate: [Average Attendance Rate]%     │
│ │ Teachers on Leave: [Teachers On Leave]               │
│ │ [View Detailed Teacher Analytics]                     │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ┌─── Class Profiles Overview ───┐                      │
│ │ Total Classes: [Total Classes] | Total Subclasses: [Total SubClasses] │
│ │ Avg. Class Size: [Average Class Size]                │
│ │ Overall Utilization: [Overall Utilization]%          │
│ │ [View Detailed Class Profiles]                        │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ┌─── Reports Analytics Overview ───┐                   │
│ │ Total Reports Generated: [Total Reports Generated]    │
│ │ Reports This Month: [Reports This Month]             │
│ │ Avg. Generation Time: [Avg Generation Time]s         │
│ │ Success Rate: [Success Rate]%                        │
│ │ [View Detailed Reports Analytics]                     │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

#### **API Integration:**

#### **1. Get Teacher Analytics**
**Endpoint:** `GET /api/v1/dashboard/teacher-analytics`
- **Headers:** `Authorization: Bearer <token>`
- **Query Parameters:**
  ```typescript
  {
    academicYearId?: number;
    departmentId?: number;
    startDate?: string; // "YYYY-MM-DD"
    endDate?: string; // "YYYY-MM-DD"
  }
  ```
- **Response (200):**
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

#### **2. Get Class Profiles**
**Endpoint:** `GET /api/v1/dashboard/class-profiles`
- **Headers:** `Authorization: Bearer <token>`
- **Query Parameters:**
  ```typescript
  {
    academicYearId?: number;
    classId?: number;
  }
  ```
- **Response (200):**
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
        improvementRate: number;
        totalStudents: number;
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

#### **3. Get Reports Analytics**
**Endpoint:** `GET /api/v1/dashboard/reports-analytics`
- **Headers:** `Authorization: Bearer <token>`
- **Response (200):**
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

---

## 6. Discipline Overview (`/super-manager/discipline-overview`)

### **Discipline Overview Page**
```
┌─────────────────────────────────────────────────────────┐
│ Discipline Overview                   [📊 View Reports] │
├─────────────────────────────────────────────────────────┤
│ [Filter: Academic Year] [Filter: Status] [Search: Student/Issue] │
│                                                         │
│ ┌─── Key Discipline Metrics ───┐                        │
│ │ Total Active Issues: [Total Active Issues]            │
│ │ Resolved This Week: [Resolved This Week]             │
│ │ Pending Resolution: [Pending Resolution]             │
│ │ Students with Multiple Issues: [Students With Multiple Issues] │
│ │ Average Resolution Time: [Average Resolution Time] hours │
│ │ Critical Cases: [Critical Cases]                     │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ┌─── Behavioral Trends ───┐                            │
│ │ This Month: [This Month Incidents] incidents         │
│ │ Last Month: [Last Month Incidents] incidents         │
│ │ Trend: [Behavioral Trend]                             │
│ │ [View Detailed Behavioral Analytics]                  │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ┌─── Issues by Type ───┐                                │
│ │ [Issue Type 1]: [Count 1] (Trend: [Trend 1]) (Res Rate: [Res Rate 1]%) │
│ │ [Issue Type 2]: [Count 2] (Trend: [Trend 2]) (Res Rate: [Res Rate 2]%) │
│ │ [View All Issues by Type]                             │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ┌─── Urgent Interventions ───┐                         │
│ │ 👤 [Student 1 Name] ([Issue Count 1] issues) - Risk: [Risk Level 1] (Last Incident: [Last Incident 1]) │
│ │    Recommended: [Recommended Action 1]               │
│ │ 👤 [Student 2 Name] ([Issue Count 2] issues) - Risk: [Risk Level 2] (Last Incident: [Last Incident 2]) │
│ │    Recommended: [Recommended Action 2]               │
│ │ [View Early Warning System] [Create Intervention]     │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### **API Integration:**

#### **1. Get Discipline Master Enhanced Dashboard**
**Endpoint:** `GET /api/v1/discipline-master/dashboard`
- **Headers:** `Authorization: Bearer <token>`
- **Query Parameters:**
  ```typescript
  {
    academicYearId?: number;
  }
  ```
- **Response (200):**
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

#### **2. Get Behavioral Analytics**
**Endpoint:** `GET /api/v1/discipline-master/behavioral-analytics`
- **Headers:** `Authorization: Bearer <token>`
- **Query Parameters:**
  ```typescript
  {
    academicYearId?: number;
  }
  ```
- **Response (200):**
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

#### **3. Get Student Behavior Profile**
**Endpoint:** `GET /api/v1/discipline-master/student-profile/:studentId`
- **Headers:** `Authorization: Bearer <token>`
- **Path Parameters:** `studentId` (number): Student ID
- **Query Parameters:**
  ```typescript
  {
    academicYearId?: number;
  }
  ```
- **Response (200):**
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

#### **4. Get Early Warning System**
**Endpoint:** `GET /api/v1/discipline-master/early-warning`
- **Headers:** `Authorization: Bearer <token>`
- **Query Parameters:**
  ```typescript
  {
    academicYearId?: number;
  }
  ```
- **Response (200):**
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

#### **5. Get Discipline Statistics**
**Endpoint:** `GET /api/v1/discipline-master/statistics`
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

#### **6. Get Intervention Tracking**
**Endpoint:** `GET /api/v1/discipline-master/interventions`
- **Headers:** `Authorization: Bearer <token>`
- **Query Parameters:**
  ```typescript
  {
    academicYearId?: number;
    status?: "PLANNED" | "ONGOING" | "COMPLETED" | "CANCELLED";
    studentId?: number;
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

#### **7. Create Intervention Plan**
**Endpoint:** `POST /api/v1/discipline-master/interventions`
- **Headers:** `Authorization: Bearer <token>`
- **Request Body:**
  ```typescript
  {
    studentId: number;
    interventionType: string;
    description: string;
    expectedEndDate?: string; // "YYYY-MM-DD"
    assignedTo: string;
  }
  ```
- **Response (201):**
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

#### **8. Update Intervention Status**
**Endpoint:** `PUT /api/v1/discipline-master/interventions/:interventionId`
- **Headers:** `Authorization: Bearer <token>`
- **Path Parameters:** `interventionId` (number): Intervention ID
- **Request Body:**
  ```typescript
  {
    status: "PLANNED" | "ONGOING" | "COMPLETED" | "CANCELLED";
    outcome?: "SUCCESSFUL" | "PARTIALLY_SUCCESSFUL" | "UNSUCCESSFUL";
    notes?: string;
    effectiveness?: number;
  }
  ```
- **Response (200):**
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

#### **9. Get Risk Assessment**
**Endpoint:** `GET /api/v1/discipline-master/risk-assessment`
- **Headers:** `Authorization: Bearer <token>`
- **Query Parameters:**
  ```typescript
  {
    academicYearId?: number;
    riskLevel?: "CRITICAL" | "HIGH" | "MODERATE";
    classId?: number;
  }
  ```
- **Response (200):**
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

#### **10. Generate Discipline Report**
**Endpoint:** `GET /api/v1/discipline-master/reports`
- **Headers:** `Authorization: Bearer <token>`
- **Query Parameters:**
  ```typescript
  {
    academicYearId?: number;
    reportType?: string; // Default: "comprehensive"
    startDate?: string;  // "YYYY-MM-DD"
    endDate?: string;    // "YYYY-MM-DD"
  }
  ```
- **Response (200):**
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

## 7. Report Card Management (`/super-manager/report-cards`)

### **Report Card Management Page**
```
┌─────────────────────────────────────────────────────────┐
│ Report Card Management               [📊 View Analytics] │
├─────────────────────────────────────────────────────────┤
│ [Filter: Academic Year] [Filter: Exam Sequence] [Filter: Status] │
│                                                         │
│ ┌─── Report Status Overview ───┐                        │
│ │ Total Reports: [Total Reports] | Completed: [Completed Reports] │
│ │ Generating: [Generating Reports] | Failed: [Failed Reports] │
│ │ Last Generated: [Last Generated Date]                    │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ┌─── Student Reports (Individual) ───┐                  │
│ │ 👤 [Student Name 1] ([Class Name 1]) - [Sequence 1]   │
│ │    Status: [Status 1] | Generated: [Generated At 1] │
│ │    [View] [Download] [Regenerate] [Check Status]     │
│ │ ─────────────────────────────────────              │
│ │ 👤 [Student Name 2] ([Class Name 2]) - [Sequence 2]   │
│ │    Status: [Status 2] | Generated: [Generated At 2] │
│ │    [View] [Download] [Regenerate] [Check Status]     │
│ │ [Load More Individual Reports]                        │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ┌─── Subclass Reports (Combined) ───┐                  │
│ │ 🏫 [Class Name 3] - [Subclass Name 3] - [Sequence 3] │
│ │    Status: [Status 3] | Generated: [Generated At 3] │
│ │    [View] [Download] [Regenerate] [Check Status]     │
│ │ ─────────────────────────────────────              │
│ │ 🏫 [Class Name 4] - [Subclass Name 4] - [Sequence 4] │
│ │    Status: [Status 4] | Generated: [Generated At 4] │
│ │    [View] [Download] [Regenerate] [Check Status]     │
│ │ [Load More Subclass Reports]                        │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### **API Integration:**

#### **1. Get Student Report Card (Download)**
**Endpoint:** `GET /api/v1/report-cards/student/:studentId`
- **Headers:** `Authorization: Bearer <token>`
- **Path Parameters:** `studentId` (number): Student ID
- **Query Parameters:**
  ```typescript
  {
    academicYearId: number;    // Required
    examSequenceId: number;    // Required
  }
  ```
- **Response (200 - Report Ready):** Returns PDF file for download (`Content-Type: application/pdf`)
- **Response (202 - Processing):**
  ```typescript
  {
    success: true;
    message: "Report generation is currently processing. Please try again later.";
    status: "PROCESSING" | "PENDING";
  }
  ```
- **Response (404 - Not Found):**
  ```typescript
  {
    success: false;
    error: "Report record not found for this student. Generation might be pending, failed, or parameters incorrect.";
  }
  ```
- **Response (500 - Generation Failed):**
  ```typescript
  {
    success: false;
    error: "Report generation failed for this student.";
    message: string;
    status: "FAILED";
  }
  ```

#### **2. Generate Student Report Card**
**Endpoint:** `POST /api/v1/report-cards/student/:studentId/generate`
- **Headers:** `Authorization: Bearer <token>`
- **Path Parameters:** `studentId` (number): Student ID
- **Request Body:**
  ```typescript
  {
    academicYearId: number;   // Required
    examSequenceId: number;   // Required
  }
  ```
- **Response (200):** Triggers immediate report generation and download (returns PDF file).
- **Error Responses:**
  ```typescript
  {
    success: false;
    error: "Valid studentId, academicYearId, and examSequenceId must be provided.";
  }
  ```

#### **3. Get Subclass Report Cards (Download)**
**Endpoint:** `GET /api/v1/report-cards/subclass/:subClassId`
- **Headers:** `Authorization: Bearer <token>`
- **Path Parameters:** `subClassId` (number): Subclass ID
- **Query Parameters:**
  ```typescript
  {
    academicYearId: number;    // Required
    examSequenceId: number;    // Required
  }
  ```
- **Response (200 - Report Ready):** Returns combined PDF file for download.
- **Response (202 - Processing):**
  ```typescript
  {
    success: true;
    message: "Combined subclass report generation is currently processing. Please try again later.";
    status: "PROCESSING" | "PENDING";
  }
  ```
- **Response (404 - Not Found):**
  ```typescript
  {
    success: false;
    error: "Combined subclass report record not found. It might not have been generated yet or the parameters are incorrect.";
  }
  ```

#### **4. Generate Subclass Report Cards**
**Endpoint:** `POST /api/v1/report-cards/subclass/:subClassId/generate`
- **Headers:** `Authorization: Bearer <token>`
- **Path Parameters:** `subClassId` (number): Subclass ID
- **Request Body:**
  ```typescript
  {
    academicYearId: number;   // Required
    examSequenceId: number;   // Required
  }
  ```
- **Response (200):** Triggers immediate report generation and download for entire subclass.
- **Error Responses:**
  ```typescript
  {
    success: false;
    error: "Valid subClassId, academicYearId, and examSequenceId must be provided.";
  }
  ```

#### **5. Check Student Report Card Availability**
**Endpoint:** `GET /api/v1/report-cards/student/:studentId/availability`
- **Headers:** `Authorization: Bearer <token>`
- **Path Parameters:** `studentId` (number): Student ID
- **Query Parameters:**
  ```typescript
  {
    academicYearId: number;    // Required
    examSequenceId: number;    // Required
  }
  ```
- **Response (200):**
  ```typescript
  {
    success: true;
    data: {
      available: boolean;
      status: "COMPLETED" | "PENDING" | "PROCESSING" | "FAILED" | "NOT_ENROLLED" | "SEQUENCE_NOT_FOUND" | "NO_MARKS" | "NOT_GENERATED";
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

#### **6. Check Subclass Report Card Availability**
**Endpoint:** `GET /api/v1/report-cards/subclass/:subClassId/availability`
- **Headers:** `Authorization: Bearer <token>`
- **Path Parameters:** `subClassId` (number): Subclass ID
- **Query Parameters:**
  ```typescript
  {
    academicYearId: number;    // Required
    examSequenceId: number;    // Required
  }
  ```
- **Response (200):**
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

---

## 8. Reports & Analytics (`/super-manager/reports-analytics`)

### **Reports & Analytics Page**
```
┌─────────────────────────────────────────────────────────┐
│ Reports & Analytics                   [⚙️ Configure Reports] │
├─────────────────────────────────────────────────────────┤
│ [Filter: Report Type] [Filter: Academic Year] [Filter: Date Range] │
│                                                         │
│ ┌─── Report Generation Statistics ───┐                  │
│ │ Total Reports Generated: [Total Reports Generated]    │
│ │ Reports This Month: [Reports This Month]             │
│ │ Average Generation Time: [Avg Generation Time]s      │
│ │ Success Rate: [Success Rate]%                        │
│ │ Fastest Generation: [Fastest Generation]s            │
│ │ Slowest Generation: [Slowest Generation]s            │
│ │ Failure Rate: [Failure Rate]%                        │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ┌─── Upcoming Report Deadlines ───┐                    │
│ │ [Report Type 1] (Due: [Due Date 1]) - Priority: [Priority 1] (Assigned to: [Assigned To 1]) │
│ │ [Report Type 2] (Due: [Due Date 2]) - Priority: [Priority 2] (Assigned to: [Assigned To 2]) │
│ │ [View All Deadlines]                                  │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ┌─── Popular Reports ───┐                               │
│ │ [Report Type A]: [Count A] times generated            │
│ │ [Report Type B]: [Count B] times generated            │
│ │ [View All Report Types]                               │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### **API Integration:**

#### **1. Get Reports Analytics (Dashboard Overview)**
**Endpoint:** `GET /api/v1/dashboard/reports-analytics`
- **Headers:** `Authorization: Bearer <token>`
- **Response (200):**
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

#### **2. Get Academic Performance Report**
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
- **Response (200):** (Same as Principal's Academic Performance Report)
  ```typescript
  {
    success: true;
    data: {
      academicPerformance: { /* ... */ };
      generatedAt: string;
      filters: { /* ... */ };
    };
  }
  ```

#### **3. Get Attendance Analysis Report**
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
- **Response (200):** (Same as Principal's Attendance Analysis Report)
  ```typescript
  {
    success: true;
    data: { /* ... */ };
  }
  ```

#### **4. Get Teacher Performance Analysis Report**
**Endpoint:** `GET /api/v1/principal/reports/teacher-performance`
- **Headers:** `Authorization: Bearer <token>`
- **Query Parameters:**
  ```typescript
  {
    academicYearId?: number;
    departmentId?: number;
    performanceThreshold?: number;
  }
  ```
- **Response (200):** (Same as Principal's Teacher Performance Report)
  ```typescript
  {
    success: true;
    data: { /* ... */ };
  }
  ```

#### **5. Get Financial Performance Analysis Report**
**Endpoint:** `GET /api/v1/principal/reports/financial-performance`
- **Headers:** `Authorization: Bearer <token>`
- **Response (200):** (Same as Principal's Financial Performance Report)
  ```typescript
  {
    success: true;
    data: { /* ... */ };
  }
  ```

#### **6. Get School Overview Summary Report**
**Endpoint:** `GET /api/v1/principal/overview/summary`
- **Headers:** `Authorization: Bearer <token>`
- **Response (200):** (Same as Principal's School Overview Summary Report)
  ```typescript
  {
    success: true;
    data: { /* ... */ };
  }
  ```

---

## 9. System Settings (`/super-manager/system-settings`)

### **System Settings Page**
```
┌─────────────────────────────────────────────────────────┐
│ System Settings                       [💾 Save Changes] │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ ┌─── General School Information ───┐                   │
│ │ School Name: [School Name]                            │
│ │ School Address: [School Address]                      │
│ │ School Phone: [School Phone]                          │
│ │ School Email: [School Email]                          │
│ │ School Logo: [Image Upload / Current Logo]            │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ┌─── Academic Configuration ───┐                       │
│ │ Academic Year Start Month: [Academic Year Start Month] │
│ │ Default Class Size: [Default Class Size]              │
│ │ Default Pass Mark: [Default Pass Mark]                │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ┌─── Feature Toggles ───┐                              │
│ │ Enable Notifications: [Checkbox: Enable Notifications] │
│ │ Enable Parent Portal: [Checkbox: Enable Parent Portal] │
│ │ Enable Quiz System: [Checkbox: Enable Quiz System]    │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ┌─── Localization & Finance ───┐                       │
│ │ Currency Symbol: [Currency Symbol]                    │
│ │ Timezone: [Timezone]                                  │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### **API Integration:**

#### **1. Get System Settings**
**Endpoint:** `GET /api/v1/system/settings`
- **Headers:** `Authorization: Bearer <token>`
- **Response (200):**
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

#### **2. Update System Settings**
**Endpoint:** `PUT /api/v1/system/settings`
- **Headers:** `Authorization: Bearer <token>`
- **Request Body:**
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
- **Response (200):**
  ```typescript
  {
    success: true;
    message: "System settings updated successfully";
    data: {
      schoolName: string;
      schoolAddress: string;
      schoolPhone: string;
      schoolEmail: string;
      schoolLogo?: string;
      academicYearStartMonth: number;
      defaultClassSize: number;
      enableNotifications: boolean;
      enableParentPortal: boolean;
      enableQuizSystem: boolean;
      defaultPassMark: number;
      currencySymbol: string;
      timezone: string;
      backupEnabled: boolean;
      backupFrequency: "DAILY" | "WEEKLY" | "MONTHLY";
      maintenanceMode: boolean;
    };
  }
  ```

---

## 10. System Maintenance (`/super-manager/maintenance`)

### **System Maintenance Dashboard**
```
┌─────────────────────────────────────────────────────────┐
│ System Maintenance                    [⚙️ Force Backup] │
├─────────────────────────────────────────────────────────┤
│ [Filter: Log Level] [Filter: Category] [Filter: Date Range] │
│                                                         │
│ ┌─── System Health Overview ───┐                        │
│ │ Status: [System Health Status]                        │
│ │ Uptime: [Uptime]                                      │
│ │ Database: [Database Status]                           │
│ │ Memory Usage: [Memory Usage]% ([Used Memory]MB / [Total Memory]MB) │
│ │ Disk Usage: [Disk Usage]% ([Used Disk]MB / [Total Disk]MB) │
│ │ Active Users: [Active Users] | Recent Errors: [Recent Errors] │
│ │ Last Backup: [Last Backup] (Frequency: [Backup Frequency]) │
│ │ Maintenance Mode: [Maintenance Mode Status] [Toggle]  │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ┌─── Recent System Logs ───┐                           │
│ │ [Timestamp 1] [Level 1] [Category 1]: [Message 1]   │
│ │ [Timestamp 2] [Level 2] [Category 2]: [Message 2]   │
│ │ [View All Logs]                                       │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ┌─── Quick Actions & Stats ───┐                         │
│ │ [Perform Cleanup] (Cleaned [Cleaned Records] records, Freed [Freed Space]MB) │
│ │ Total Records Cleaned: [Total Records Cleaned]        │
│ │ Total Space Freed: [Total Space Freed MB]MB          │
│ │ [View System Statistics]                              │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### **API Integration:**

#### **1. Get System Health**
**Endpoint:** `GET /api/v1/system/health`
- **Headers:** `Authorization: Bearer <token>`
- **Response (200):**
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

#### **2. Perform System Backup**
**Endpoint:** `POST /api/v1/system/backup`
- **Headers:** `Authorization: Bearer <token>`
- **Response (201):**
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

#### **3. Perform System Cleanup**
**Endpoint:** `POST /api/v1/system/cleanup`
- **Headers:** `Authorization: Bearer <token>`
- **Response (200):**
  ```typescript
  {
    success: true;
    message: string; // e.g., "System cleanup completed. X records cleaned, Y.Z MB freed."
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

#### **4. Get System Logs**
**Endpoint:** `GET /api/v1/system/logs`
- **Headers:** `Authorization: Bearer <token>`
- **Query Parameters:**
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
- **Response (200):**
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

#### **5. Get System Statistics**
**Endpoint:** `GET /api/v1/system/statistics`
- **Headers:** `Authorization: Bearer <token>`
- **Response (200):**
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
      systemHealth: { /* ... same as Get System Health */ };
    };
  }
  ```

#### **6. Get System Info**
**Endpoint:** `GET /api/v1/system/info`
- **Headers:** `Authorization: Bearer <token>`
- **Response (200):**
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

#### **7. Toggle Maintenance Mode**
**Endpoint:** `POST /api/v1/system/maintenance-mode`
- **Headers:** `Authorization: Bearer <token>`
- **Request Body:**
  ```typescript
  {
    enabled: boolean;
  }
  ```
- **Response (200):**
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

## Key Super Manager Features Summary

### **Complete System Access:**
- All role functionality access
- Override capabilities for all operations
- System-wide reporting and analytics

### **User & Role Management:**
- Create/edit/delete any user
- Assign/remove any role
- Manage role permissions

### **Academic Administration:**
- Academic year lifecycle management
- System-wide academic oversight
- Exam and assessment configuration

### **Financial Administration:**
- Complete fee management oversight
- Financial reporting and analysis
- Payment method configuration
- **Note:** The `GET /api/v1/fees` endpoint now supports comprehensive filtering by student name/ID, parent name, class, subclass, and due date (including ranges).

### **System Administration:**
- System configuration and settings
- Maintenance and health monitoring
- Security and backup management

### **Override Capabilities:**
- Emergency student assignment
- Financial dispute resolution
- System-wide data correction
- Academic intervention powers

The SUPER_MANAGER role represents the highest level of system access with comprehensive administrative capabilities across all aspects of the School Management System.

Perfect! We've now completed the comprehensive user workflow and UX design for all roles in the School Management System. Here's a summary of what we've covered:

## Complete Role Workflow Summary

### **Login Flow (Universal)**
1. **Login Page** - Email/Matricule + Password
2. **Role Selection** - If user has multiple roles
3. **Academic Year Selection** - Except for SUPER_MANAGER
4. **Role-specific Dashboard** - Customized for each role

### **Roles Completed:**

1. **🔐 SUPER_MANAGER** - Complete system administration
   - Academic year management, user management, financial oversight
   - System settings, maintenance, reports & analytics
   - Override capabilities for all operations

2. **👨‍💼 PRINCIPAL** - School-wide strategic oversight
   - Academic performance monitoring, staff supervision
   - Strategic planning, school-wide reporting

3. **👩‍💼 VICE_PRINCIPAL** - Student affairs & enrollment
   - Interview management, subclass assignment
   - Student registration workflow, enrollment oversight

4. **💰 BURSAR** - Financial management & registration
   - Fee collection, payment recording, parent creation
   - Student registration with automatic parent account creation
   - Financial reporting and debt management

5. **🚨 DISCIPLINE_MASTER** - Student discipline & behavior
   - Morning lateness tracking, discipline issue management
   - Behavioral analytics, attendance monitoring

6. **👨‍🏫 TEACHER** - Subject teaching & student management
   - My classes, marks entry, student progress tracking
   - Quiz creation, attendance taking

7. **📚 HOD** - Teacher + Department management
   - All teacher functionality + department oversight
   - Teacher performance monitoring, subject coordination

8. **👨‍👩‍👧‍👦 PARENT** - Child monitoring & communication
   - Child performance tracking, fee management
   - Communication with school staff, report access

9. **🎯 GUIDANCE_COUNSELOR** - Student support (limited endpoints)
   - Student academic monitoring, basic communication

10. **⚙️ MANAGER** - General administration (limited specific functionality)
    - Basic administrative oversight, user management support

## Key Design Principles Applied:

### **🎯 MVP Focus**
- Only included features supported by current API
- No over-engineering or unnecessary complexity
- Focused on core school management needs

### **🔄 Consistent UX Patterns**
- Unified navigation structure across roles
- Consistent card-based layouts
- Standardized action buttons and states

### **📱 Progressive Disclosure**
- Dashboard overview → Detailed pages → Actions
- Important information first, details on demand
- Clear navigation hierarchies

### **🔐 Role-Based Access**
- Each role sees only relevant functionality
- Appropriate permission levels maintained
- Clear role identification in UI

### **💱 FCFA Currency**
- All financial displays use FCFA as requested
- Appropriate formatting for local context
