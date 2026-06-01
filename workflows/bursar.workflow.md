# BURSAR Role - Complete Workflow & UX Design

## Post-Login Bursar Dashboard (`/bursar/dashboard`)

### **API Integration**
**Primary Endpoint:** `GET /api/v1/bursar/enhanced` (Enhanced dashboard)
**Alternative:** `GET /api/v1/bursar/dashboard` (Basic dashboard)
**Additional Analytics:** `GET /api/v1/dashboard/bursar/enhanced`
**Financial Overview:** `GET /api/v1/dashboard/financial-overview`
**Student Registration Analytics:** `GET /api/v1/dashboard/student-registration`
**Collection Analytics:** `GET /api/v1/bursar/collection-analytics`
**Payment Trends:** `GET /api/v1/bursar/payment-trends`
**Defaulters Report:** `GET /api/v1/bursar/defaulters-report`
- **Headers:** `Authorization: Bearer <token>`
- **Query Parameters:**
  ```typescript
  {
    academicYearId?: number; // Optional, defaults to current year
  }
  ```
- **Enhanced Response Data:**
  ```typescript
  {
    success: true;
    data: {
      // Financial Overview
      financialOverview: {
        totalRevenue: number;          // Total revenue in FCFA
        monthlyRevenue: number;        // This month's revenue
        outstandingAmount: number;     // Total outstanding
        collectionRate: number;        // Collection percentage
        defaultersCount: number;       // Students in default
      };
      
      // Enrollment Financials
      enrollmentFinancials: {
        totalEnrollments: number;
        paidEnrollments: number;
        pendingPayments: number;
        averageFeePerStudent: number;
      };
      
      // Payment Trends (12 months)
      paymentTrends: Array<{
        month: string;
        collected: number;
        target: number;
        variance: number;
      }>;
      
      // Recent Transactions
      recentTransactions: Array<{
        id: number;
        studentName: string;
        amount: number;
        type: string;
        date: string;
        status: string;
        paymentMethod: "EXPRESS_UNION" | "CCA" | "F3DC";
        receiptNumber: string;
      }>;
      
      // Alerts & Notifications
      alerts: {
        overduePayments: number;
        newDefaulters: number;
        largePayments: number;
        pendingInterviews: number;
      };
      
      // Registration Analytics
      registrationStats: {
        totalRegistrations: number;
        completedRegistrations: number;
        pendingPayments: number;
        rejectedApplications: number;
      };
      
      // Daily/Weekly Registration Trends
      dailyRegistrations: Array<{
        date: string;
        newRegistrations: number;
        completedPayments: number;
        pendingCount: number;
      }>;
      
      // Class Distribution
      classDistribution: Array<{
        classId: number;
        className: string;
        registeredStudents: number;
        capacity: number;
        waitingList: number;
        averageFee: number;
      }>;
    };
  }
  ```

### **Main Dashboard Layout**
```
┌─────────────────────────────────────────────────────────┐
│ [🏠] School Management System    [🔔] [👤] [⚙️] [🚪]    │
├─────────────────────────────────────────────────────────┤
│ Welcome back, [Bursar Name] | Academic Year: 2024-2025  │
│ Financial Officer & Student Registration                 │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ ┌─── Enhanced Financial Overview ───┐                  │
│ │ 💰 Total Revenue: 15,500,000 FCFA                    │
│ │ 💵 Monthly Revenue: 2,100,000 FCFA                   │
│ │ 📊 Collection Rate: 79% (Target: 85%)                │
│ │ ⚠️  Outstanding: 3,300,000 FCFA                      │
│ │ 👥 Defaulters: 45 students                           │
│ │ 📈 Payment Trends: ↗️ +15% vs last month            │
│ │ 🎯 Monthly Target: 2,500,000 FCFA                    │
│ │                                                      │
│ │ Payment Methods Breakdown:                           │
│ │ • EXPRESS_UNION: 65% (10,075,000 FCFA)             │
│ │ • CCA: 25% (3,875,000 FCFA)                        │
│ │ • F3DC: 10% (1,550,000 FCFA)                       │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ┌─── Recent Activity ───┐  ┌─── Alerts & Tasks ───┐     │
│ │ • Payment: 75,000 FCFA │  │ 🔴 45 overdue payments     │
│ │   John Doe (Form 5A)   │  │ 🟡 15 new registrations    │
│ │   EU #R12345           │  │    need fee setup         │
│ │ • Payment: 125,000 FCFA│  │ 🟢 8 large payments        │
│ │   Mary Smith (Form 3B) │  │    (>100k FCFA) today     │
│ │   CCA #R12346          │  │ ⏰ Monthly report due      │
│ │ • New enrollment:      │  │    January 31              │
│ │   Peter Johnson       │  │ 📊 Collection rate below   │
│ │   Fees: 100,000 FCFA  │  │    target by 6%            │
│ │ [View All] [Export]    │  │ [Handle All] [Dismiss]     │
│ └─────────────────────── │  └─────────────────────────┘ │
│                                                         │
│ ┌─── Quick Actions ───┐                                 │
│ │ [📝 Register Student] [💰 Record Payment]             │
│ │ [📊 Generate Report] [🎓 Fee Management]              │
│ │ [👥 Parent Accounts] [📋 Defaulters List]             │
│ │ [📈 Collection Analytics] [⚙️ Fee Structure Setup]    │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ┌─── Registration & Enrollment Analytics ───┐           │
│ │ Today's Registrations: 3 students                     │
│ │ This Week: 15 registrations                           │
│ │ Pending VP Interviews: 8 students                     │
│ │ Completed Enrollments: 445 students                   │
│ │ Class Capacity Utilization: 87% average               │
│ │ [View Details] [Capacity Analysis]                    │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## Student Registration (`/bursar/students/register`)

### **API Integration**

#### **1. Create Student with Parent Account**
**Endpoint:** `POST /api/v1/bursar/create-parent-with-student`
- **Headers:** `Authorization: Bearer <token>`
- **Request Body:**
  ```typescript
  {
    studentName: string;
    dateOfBirth: string;        // "YYYY-MM-DD"
    placeOfBirth: string;
    gender: "MALE" | "FEMALE";
    residence: string;
    formerSchool?: string;
    classId: number;
    isNewStudent?: boolean;     // Defaults to true
    academicYearId?: number;    // Optional, defaults to current
    parentName: string;
    parentPhone: string;
    parentWhatsapp?: string;
    parentEmail?: string;
    parentAddress: string;
    relationship?: string;      // Defaults to "PARENT"
  }
  ```
- **Response:**
  ```typescript
  {
    success: true;
    message: "Student and parent created successfully";
    data: {
      student: {
        id: number;
        matricule: string;      // Auto-generated
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
        tempPassword: string;   // Temporary password for parent login
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

#### **2. Get Available Classes**
**Endpoint:** `GET /api/v1/classes`
- **Response:** List of all available classes

#### **3. Link Existing Parent**
**Endpoint:** `POST /api/v1/bursar/link-existing-parent`
- **Request Body:**
  ```typescript
  {
    studentId: number;
    parentId: number;
    relationship?: string;   // Defaults to "PARENT"
  }
  ```

#### **4. Get Available Parents**
**Endpoint:** `GET /api/v1/bursar/available-parents`
- **Query Parameters:**
  ```typescript
  {
    search?: string;        // Search by name, phone, or email
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
    meta: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }
  ```

### **Student Registration Process**

**Key Schema Details (from Prisma):**
- **Student Model:** `matricule` (unique), `name`, `date_of_birth`, `place_of_birth`, `gender`, `residence`, `former_school`, `is_new_student`, `status` (NOT_ENROLLED → ENROLLED → ASSIGNED_TO_CLASS)
- **Enrollment Model:** Links student to academic year and class, optional `sub_class_id` after VP interview
- **Class Model:** Contains fee structure: `base_fee`, `miscellaneous_fee`, `new_student_fee`, `old_student_fee`, term fees
- **SchoolFees Model:** Tracks expected vs paid amounts, due dates, academic year context
- **ParentStudent Model:** Links parents to students with relationship tracking

### **Enhanced Student Registration Form**
```
┌─── Register New Student ───┐
│ ┌─── Student Information ───┐                          │
│ │ Full Name: [Text Input]                              │
│ │ Date of Birth: [Date Picker]                         │
│ │ Place of Birth: [Text Input]                         │
│ │ Gender: [Male ●] [Female ○]                          │
│ │ Residence: [Text Input]                              │
│ │ Former School: [Text Input] (Optional)               │
│ │ Class: [Form 1 ▼] (Capacity: 67/80)                 │
│ │ New Student: [Yes ●] [No ○] (Affects fee structure) │
│ │ Academic Year: [2024-2025 ▼] (Current)              │
│ └────────────────────────────────────────────────────┘ │
│                                                         │
│ ┌─── Parent/Guardian Information ───┐                   │
│ │ [Create New Parent ●] [Link Existing Parent ○]       │
│ │                                                      │
│ │ ── New Parent Details ──                             │
│ │ Parent Name: [Text Input] *Required                  │
│ │ Phone Number: [Text Input] *Required (677XXXXXX)    │
│ │ WhatsApp: [Text Input] (Optional, for notifications) │
│ │ Email: [Text Input] (Optional, for portal access)   │
│ │ Address: [Text Input] *Required                      │
│ │ Gender: [Male ●] [Female ○] (For matricule prefix)  │
│ │ Date of Birth: [Date Picker] (For complete profile) │
│ │ ID Card Number: [Text Input] (Optional)             │
│ │ Relationship: [Father ▼] [Mother] [Guardian]         │
│ │                                                      │
│ │ ── OR Select Existing Parent ──                      │
│ │ Search Parent: [Search Input with autocomplete]      │
│ │ [📋 Browse All Parents]                              │
│ └────────────────────────────────────────────────────┘ │
│                                                         │
│ [Register Student] [Save Draft] [Cancel]                │
└───────────────────────────────────────────────────────┘
```

### **Parent Selection Modal** (When "Link Existing Parent" is selected)
```
┌─── Select Existing Parent ───┐
│ Search: [Text Input] [🔍]      │
│                               │
│ Found Parents:                │
│ ┌─── Mr. Johnson ───┐         │
│ │ Phone: 677123456   │         │
│ │ Email: j@email.com │         │
│ │ Children: 1        │         │
│ │ [Select] [View]    │         │
│ └─────────────────── │         │
│                               │
│ ┌─── Mrs. Smith ───┐          │
│ │ Phone: 677654321   │         │
│ │ Email: s@email.com │         │
│ │ Children: 2        │         │
│ │ [Select] [View]    │         │
│ └─────────────────── │         │
│                               │
│ [Cancel] [Create New Instead]  │
└─────────────────────────────┘
```

### **Registration Success Modal**
```
┌─── Student Registered Successfully ───┐
│ ✅ Student Registration Complete        │
│                                        │
│ Student Details:                       │
│ Name: John Doe                         │
│ Matricule: STU2024001                  │
│ Class: Form 1A (Initial Assignment)    │
│ Status: NOT_ENROLLED → ENROLLED        │
│ Next Step: VP Interview Required       │
│                                        │
│ 👤 Parent Account Created:             │
│ Name: Mr. Johnson                      │
│ Matricule: SO2024001 (SO = Parent)    │
│ Password: TEMP123456                   │
│ Portal Access: Enabled                 │
│                                        │
│ 💰 Fee Structure Applied:              │
│ Base Fee: 75,000 FCFA                 │
│ New Student Fee: 15,000 FCFA           │
│ Books & Materials: 10,000 FCFA         │
│ Total Expected: 100,000 FCFA           │
│                                        │
│ ⚠️ Please provide these credentials    │
│ to the parent for login access         │
│                                        │
│ [Print Credentials] [Send SMS to Parent] │
│ [✅ Auto-Create Fee Record] [Schedule VP Interview] │
│ [Generate ID Card] [Close]              │
└──────────────────────────────────────┘
```

## Fee Management (`/bursar/fees`)

### **Fee Management Integration**

**Key Schema Details:**
- **SchoolFees Model:** `amount_expected`, `amount_paid`, `due_date`, `is_new_student` flag
- **PaymentTransaction Model:** `amount`, `payment_date`, `receipt_number`, `payment_method`, `recorded_by_id`, `notes`
- **Class Fee Structure:** Built into Class model with base fees, term fees, and student type differentiation

### **API Integration**

#### **1. Get All Fees**
**Endpoint:** `GET /api/v1/fees`
**Enhanced Reports:** `GET /api/v1/fees/reports`
- **Query Parameters:**
  ```typescript
  {
    academicYearId?: number;
    page?: number;
    limit?: number;
    search?: string;           // Student name or matricule
    classId?: number;
    paymentStatus?: "PAID" | "PARTIAL" | "UNPAID";
  }
  ```

#### **2. Create Fee Record**
**Endpoint:** `POST /api/v1/fees`
- **Request Body:**
  ```typescript
  {
    enrollmentId: number;      // Links to student enrollment
    amountExpected: number;    // Calculated from class fee structure
    isNewStudent: boolean;     // Affects fee calculation
    dueDate: string;           // "YYYY-MM-DD" (usually term start)
    academicYearId: number;    // Required for fee period
    
    // Auto-calculated from Class model:
    // baseFee + (isNewStudent ? newStudentFee : oldStudentFee) + miscellaneousFee
  }
  ```

#### **3. Get Student Fees**
**Endpoint:** `GET /api/v1/fees/student/:studentId`
- **Query Parameters:** `{ academicYearId?: number }`
- **Response includes:** Total expected, amount paid, balance, payment history, due dates

#### **4. Get Class/Subclass Fee Summary**
**Endpoint:** `GET /api/v1/fees/sub_class/:id/summary` or `GET /api/v1/fees/subclass/:id/summary`
- **Response:** Class-wide fee collection statistics, payment rates, outstanding balances

#### **5. Fee Structure Management**
**Class Fees:** `GET/PUT /api/v1/classes/:id` (includes fee structure)
**Term Management:** `GET /api/v1/academic-years/:id/terms` (for term-based fee calculation)

### **Fee Management Dashboard**
```
┌─── Fee Management ───┐
│ [Create Fee] [Bulk Import] [Reports] [Settings]        │
│                                                        │
│ ┌─── Fee Overview ───┐                                 │
│ │ Academic Year: 2024-2025                            │
│ │ Total Students: 450                                 │
│ │ Students with Fees: 445                             │
│ │ Fully Paid: 298 (67%)                              │
│ │ Partially Paid: 127 (28%)                          │
│ │ Unpaid: 20 (5%)                                     │
│ └───────────────────────────────────────────────────┘ │
│                                                        │
│ ┌─── Filter & Search ───┐                             │
│ │ Search: [Name/ID/Parent Name ____]                │
│ │ Class: [All ▼] | Subclass: [All ▼]                 │
│ │ Due Date: [From Date Picker] - [To Date Picker]    │
│ │ Payment Status: [All ▼] [Paid] [Partial] [Unpaid]  │
│ │ [Apply Filters] [Clear] [Export Filtered]           │
│ └───────────────────────────────────────────────────┘ │
│                                                        │
│ Student           Class   Expected    Paid      Balance │
│ John Doe          Form 5A 150,000    100,000   50,000  │
│ Mary Smith        Form 3B 125,000    125,000   0       │
│ Peter Johnson     Form 1A 100,000    75,000    25,000  │
│ Sarah Williams    Form 4B 140,000    0         140,000 │
│                                                        │
│ [Previous] [1] [2] [3] [Next] | Showing 50 of 445     │
└──────────────────────────────────────────────────────┘
```

### **Create Fee Record** (`/bursar/fees/create`)
```
┌─── Create Fee Record ───┐
│ ┌─── Student Selection ───┐                           │
│ │ Search Student: [Text Input with autocomplete]      │
│ │ OR Select: [Browse Students]                        │
│ │                                                     │
│ │ Selected: John Doe (STU2024001) - Form 5A          │
│ │ Current Fees: 1 record (50,000 FCFA pending)       │
│ │ [Change Student]                                    │
│ └───────────────────────────────────────────────────┘ │
│                                                        │
│ ┌─── Fee Details ───┐                                  │
│ │ Fee Type: [School Fees ▼] [Books] [Uniform] [Other] │
│ │ Amount Expected: [____] FCFA                        │
│ │ Due Date: [Date Picker]                             │
│ │ Description: [Text Area]                            │
│ │ Academic Year: [2024-2025 ▼]                        │
│ │                                                     │
│ │ ✅ Auto-calculate based on class fee structure      │
│ │ Base Fee: 100,000 FCFA (from Class.base_fee)       │
│ │ + New Student Fee: 25,000 FCFA (Class.new_student_fee) │
│ │ + Books & Materials: 25,000 FCFA (Class.miscellaneous_fee) │
│ │ Term Fees: First: 0, Second: 0, Third: 0          │
│ │ Total Expected: 150,000 FCFA                       │
│ │                                                     │
│ │ Fee Breakdown by Term:                              │
│ │ • First Term: 150,000 FCFA (Main fees)            │
│ │ • Second Term: 0 FCFA (Class.second_term_fee)     │
│ │ • Third Term: 0 FCFA (Class.third_term_fee)       │
│ └───────────────────────────────────────────────────┘ │
│                                                        │
│ [Create Fee Record] [Save Draft] [Cancel]              │
└──────────────────────────────────────────────────────┘
```

## Payment Recording (`/bursar/payments`)

### **API Integration**

#### **1. Record Payment**
**Endpoint:** `POST /api/v1/fees/:feeId/payments`
**Enhanced Notifications:** `POST /api/v1/notifications/payment-confirmation`
- **Request Body:**
  ```typescript
  {
    amount: number;            // Payment amount in FCFA
    paymentDate: string;       // "YYYY-MM-DD" (from receipt)
    paymentMethod: "EXPRESS_UNION" | "CCA" | "F3DC"; // F3DC not 3DC (from schema)
    receiptNumber?: string;    // Receipt reference
    recordedById?: number;     // Auto-set from authentication
    notes?: string;           // Additional notes
  }
  ```
- **Response:**
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

#### **2. Get Fee Payments**
**Endpoint:** `GET /api/v1/fees/:feeId/payments`

#### **3. Get All Payments & Reports**
**Primary:** `GET /api/v1/fees/reports`
**Enhanced Analytics:** `GET /api/v1/bursar/collection-analytics`
**Payment Trends:** `GET /api/v1/bursar/payment-trends`
**Defaulters:** `GET /api/v1/bursar/defaulters-report`
- **Query Parameters:**
  ```typescript
  {
    startDate?: string;
    endDate?: string;
    paymentMethod?: "EXPRESS_UNION" | "CCA" | "F3DC";
    academicYearId?: number;
    classId?: number;
    export?: "excel" | "pdf" | "csv";
    reportType?: "summary" | "detailed" | "outstanding" | "collections";
  }
  ```

### **Record Payment Dashboard**
```
┌─── Record Payment ───┐
│ [Quick Payment] [Bulk Payments] [Payment History]      │
│                                                        │
│ ┌─── Quick Payment Entry ───┐                          │
│ │ Student: [Search/Select Student]                     │
│ │ Selected: Mary Smith (STU2024002) - Form 3B         │
│ │ Outstanding Balance: 25,000 FCFA                     │
│ │                                                     │
│ │ Payment Amount: [____] FCFA                         │
│ │ Payment Date: [Date Picker] (Receipt Date)          │
│ │ Payment Method: [EXPRESS_UNION ▼] [CCA] [F3DC]      │
│ │ Receipt Number: [Text Input]                        │
│ │ Notes: [Text Area] (Optional)                       │
│ │                                                     │
│ │ [Record Payment] [Print Receipt] [Clear]            │
│ └───────────────────────────────────────────────────┘ │
│                                                        │
│ ┌─── Recent Payments Today ───┐                        │
│ │ Time     Student        Amount      Method    Receipt │
│ │ 14:30    John Doe       75,000 FCFA EU       #R001   │
│ │ 13:15    Mary Smith     50,000 FCFA CCA      #R002   │
│ │ 11:45    Peter Brown    125,000 FCFA F3DC    #R003   │
│ │ 10:20    Sarah Davis    100,000 FCFA EU      #R004   │
│ │                                                     │
│ │ Today's Total: 350,000 FCFA | Transactions: 4      │
│ │ [View All Today] [Export Daily Report]              │
│ └───────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────┘
```

### **Payment Confirmation Modal**
```
┌─── Payment Recorded Successfully ───┐
│ ✅ Payment Successfully Recorded     │
│                                     │
│ Payment Details:                    │
│ Student: Mary Smith (STU2024002)    │
│ Amount: 25,000 FCFA                 │
│ Method: EXPRESS_UNION               │
│ Recorded By: [Current User]         │
│ Balance After Payment: 75,000 FCFA  │
│ Receipt: #R002                      │
│ Date: 2024-01-20                    │
│                                     │
│ Updated Balance: 0 FCFA (Fully Paid)│
│                                     │
│ [Print Receipt] [📱 SMS Parent]      │
│ [📧 Email Receipt] [Record Another] [Close] │
└───────────────────────────────────┘
```

## Reports & Analytics (`/bursar/reports`)

### **Enhanced Reporting Integration**

#### **1. Financial Reports**
**Primary:** `GET /api/v1/fees/reports`
**Enhanced Dashboard:** `GET /api/v1/dashboard/financial-overview`
**Bursar Analytics:** `GET /api/v1/bursar/collection-analytics`
**Payment Trends:** `GET /api/v1/bursar/payment-trends`
**Defaulters Analysis:** `GET /api/v1/bursar/defaulters-report`
- **Query Parameters:**
  ```typescript
  {
    reportType?: "summary" | "detailed" | "outstanding" | "collections";
    startDate?: string;      // "YYYY-MM-DD"
    endDate?: string;        // "YYYY-MM-DD" 
    academicYearId?: number;
    classId?: number;
    format?: "json" | "excel" | "pdf";
  }
  ```

#### **2. Payment Analytics**
**Enhanced Dashboard:** `GET /api/v1/dashboard/bursar/enhanced`
**Financial Overview:** `GET /api/v1/dashboard/financial-overview`
- **Includes:** Payment method breakdown, collection trends, defaulter analysis
- **Time-based Analytics:** Daily, monthly, quarterly trends
- **Class-wise Breakdowns:** Fee collection by class/subclass
- **Comparative Analysis:** Current vs previous year performance

### **Reports Dashboard**
```
┌─── Financial Reports & Analytics ───┐
│ [📊 Dashboard] [📈 Collections] [📋 Outstanding] [📤 Export]│
│                                                            │
│ ┌─── Report Generator ───┐                                 │
│ │ Report Type: [Collection Summary ▼]                     │
│ │              [Outstanding Balances]                     │
│ │              [Payment Methods Analysis]                 │
│ │              [Class-wise Breakdown]                     │
│ │                                                         │
│ │ Date Range: [From: Date] [To: Date]                     │
│ │ Academic Year: [2024-2025 ▼]                            │
│ │ Class Filter: [All Classes ▼]                           │
│ │ Format: [PDF ●] [Excel ○] [CSV ○]                       │
│ │                                                         │
│ │ [Generate Report] [Schedule Auto-Report]                │
│ └───────────────────────────────────────────────────────┘ │
│                                                            │
│ ┌─── Quick Stats ───┐                                      │
│ │ This Month Collections: 2,100,000 FCFA                 │
│ │ Outstanding Total: 3,300,000 FCFA                      │
│ │ Payment Methods: EU (65%), CCA (25%), F3DC (10%)       │
│ │ Collection Rate: 79% (Target: 85%)                     │
│ └───────────────────────────────────────────────────────┘ │
│                                                            │
│ ┌─── Recent Reports ───┐                                   │
│ │ 📄 Monthly Collection Report - Jan 2024    [Download]   │
│ │ 📄 Outstanding Balances - Jan 20, 2024     [Download]   │
│ │ 📄 Payment Methods Analysis - Jan 2024     [Download]   │
│ │ 📄 Class Fee Status Report - Jan 2024      [Download]   │
│ └───────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

## Parent Account Management (`/bursar/parents`)

### **Parent Management Integration**

**Key Schema Details:**
- **User Model (Parents):** Standard user with role PARENT, unique matricule with "SO" prefix
- **ParentStudent Model:** Junction table linking parents to multiple students
- **User Communication:** WhatsApp number for notifications, email for portal access

### **API Integration**

#### **1. Get All Parents**
**Endpoint:** `GET /api/v1/bursar/available-parents`
**Enhanced:** `GET /api/v1/users/teachers` (filter by role PARENT)
- **Query Parameters:** Search, pagination, children count filtering

#### **2. Create Parent Account**
**Integrated in:** `POST /api/v1/bursar/create-parent-with-student`
**Standalone:** `POST /api/v1/users/create-with-role` (with role: PARENT)

#### **3. Link/Unlink Parent-Student**
**Link:** `POST /api/v1/bursar/link-existing-parent`
**Advanced Link:** `POST /api/v1/students/:id/link-parent`
**Unlink:** `DELETE /api/v1/students/:studentId/parents/:parentId`
**Get Links:** `GET /api/v1/students/:studentId/parents`

### **Parent Account Dashboard**
```
┌─── Parent Account Management ───┐
│ [👥 All Parents] [➕ Create Account] [🔗 Link Management] │
│                                                          │
│ ┌─── Search & Filter ───┐                                │
│ │ Search: [Name, Phone, Email] [🔍]                      │
│ │ Filter: [Has Children ▼] [No Children] [All]           │
│ │ Sort: [Name ▼] [Registration Date] [Children Count]    │
│ └──────────────────────────────────────────────────────┘ │
│                                                          │
│ Parent Name      Phone        Email          Children     │
│ Mr. Johnson      677123456    j@email.com    2 (John, Mary)│
│ Mrs. Smith       677654321    s@email.com    1 (Peter)   │
│ Mr. Brown        677789012    -              0           │
│ Mrs. Davis       677345678    d@email.com    3 (Sarah+2) │
│                                                          │
│ [Previous] [1] [2] [3] [Next] | Showing 50 of 234       │
└────────────────────────────────────────────────────────┘
```

## Settings & Configuration (`/bursar/settings`)

### **Settings & Configuration Integration**

#### **1. Fee Structure Management**
**Classes:** `GET/PUT /api/v1/classes/:id` (includes all fee fields from schema)
**Academic Terms:** `GET/POST /api/v1/academic-years/:id/terms`
**Fee Reports:** `GET /api/v1/fees/reports` (for fee structure analysis)

#### **2. Communication & Notifications**
**SMS Templates:** `GET /api/v1/notifications/templates`
**Send Payment Notifications:** `POST /api/v1/notifications/payment-confirmation`
**Bulk Notifications:** `POST /api/v1/notifications/send-bulk`

#### **3. System Settings**
**Basic Settings:** `GET/PUT /api/v1/system/settings`
**Payment Methods:** Configured in PaymentMethod enum (EXPRESS_UNION, CCA, F3DC)

### **Bursar Settings**
```
┌─── Bursar Settings ───┐
│ [💰 Fee Structure] [💳 Payment Methods] [📱 SMS Config] │
│                                                        │
│ ┌─── Class Fee Structure ───┐                          │
│ │ Class  Base Fee   New Student  Old Student  Misc    Books  Total │
│ │ Form 1  75,000    15,000      10,000       5,000   10,000  105,000│
│ │ Form 2  80,000    15,000      12,000       5,000   12,000  112,000│
│ │ Form 3  85,000    15,000      15,000       5,000   15,000  120,000│
│ │ Form 4  90,000    15,000      18,000       5,000   18,000  128,000│
│ │ Form 5  95,000    15,000      20,000       5,000   20,000  135,000│
│ │                                                                    │
│ │ Term Fees (Optional):                                              │
│ │ • First Term Fee: Included in base                                │
│ │ • Second Term Fee: 0 (configurable)                              │
│ │ • Third Term Fee: 0 (configurable)                               │
│ │ [Edit Structure] [Import] [Export]                   │
│ └──────────────────────────────────────────────────── │
│                                                        │
│ ┌─── SMS Notifications ───┐                            │
│ │ ✅ Payment Confirmations                             │
│ │ ✅ Fee Reminders                                     │
│ │ ✅ Receipt Notifications                             │
│ │ ❌ Marketing Messages                                │
│ │ Template: "Payment of {amount} FCFA received for    │
│ │ {student}. Balance: {balance} FCFA. Receipt: {ref}" │
│ │ [Save Settings]                                      │
│ └──────────────────────────────────────────────────── │
└──────────────────────────────────────────────────────┘
```

## Error Handling & Loading States

### **API Error Handling**
```typescript
// Standard error response format
{
  success: false;
  error: string; // User-friendly error message
}

// Common Bursar-specific errors:
// 400: "Invalid fee amount" | "Student already has fees for this year" | "Invalid payment method"
// 404: "Student not found" | "Parent not found" | "Fee record not found" | "Enrollment not found"
// 409: "Parent already linked to this student" | "Duplicate fee record" | "Payment amount exceeds balance"
// 422: "Student not enrolled in academic year" | "Class capacity exceeded"
// 500: "Payment processing failed" | "Database error" | "SMS notification failed"
```

### **Loading & Validation States**
- Form validation for all monetary inputs (min: 0, max: reasonable limits)
- Real-time balance calculations
- Payment method validation
- Receipt number uniqueness checks
- Automatic fee calculations based on class structure

### **Success Feedback**
- Toast notifications for successful operations
- Modal confirmations for payment recordings
- SMS integration status feedback
- Auto-generated receipt numbers
- Print-friendly receipt formats

### **Additional Features & Integrations**

#### **Student Status Management**
- Track student progression: NOT_ENROLLED → ENROLLED → ASSIGNED_TO_CLASS
- Integration with VP interview process for subclass assignment
- Automatic status updates based on payment and interview completion

#### **Academic Year Context**
- All financial operations scoped to specific academic years
- Term-based fee management with configurable due dates
- Cross-year comparison and analytics

#### **Advanced Fee Management**
- Coefficient-based subject fees (from SubClassSubject.coefficient)
- Multiple fee types and categories
- Automatic fee calculation from class structure
- Term-wise payment tracking

#### **Parent Portal Integration**
- Auto-generated parent accounts with portal access
- SMS and email notifications for payments
- Quiz system access for parent-supervised assessments
- Direct communication channels with school staff

#### **Reporting & Analytics**
- Real-time financial dashboards
- Payment trend analysis
- Defaulter identification and management
- Class-wise and term-wise financial reports
- Comparative analysis across academic years

**Frontend Implementation Notes:**
1. Implement currency formatting for FCFA amounts
2. Add number input validation and formatting
3. Use debounced search for student/parent lookup
4. Implement optimistic updates for payment recording
5. Cache fee structures and payment methods locally
6. Handle offline payment recording with sync capabilities
7. Implement proper receipt printing functionality
8. Add SMS gateway integration status monitoring
9. Implement fee structure inheritance from class settings
10. Add academic year context to all financial operations
11. Implement coefficient-based fee calculations for special programs
12. Add multi-term fee payment scheduling
13. Implement parent portal integration for fee viewing
14. Add audit trail for all financial transactions
15. Implement payment reminder automation
16. Add support for payment plans and installments
17. Integrate with mobile notification system for parents
18. Add comprehensive financial analytics and forecasting

