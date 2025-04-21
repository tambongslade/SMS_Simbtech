// app/fee-management/services/mockApi.ts

import { Student, Payment } from "../types";

const mockStudents: Student[] = [
  {
    id: "ST001",
    name: "John Doe",
    class: "10A",
    expectedFees: 56500,
    paidFees: 40000,
    lastPaymentDate: "2024-02-15",
    status: "Partial",
    email: "john@example.com",
    parentName: "Jane Doe",
    parentPhone: "+237612345678",
    admissionNumber: "ADM2023001",
    balance: 16500,
    parentContacts: [
      {
        name: "Jane Doe",
        phone: "+237612345678",
        email: "jane@example.com",
      },
    ],
  },
  {
    id: "ST002",
    name: "Alice Smith",
    class: "10A",
    expectedFees: 56500,
    paidFees: 56500,
    lastPaymentDate: "2024-02-10",
    status: "Paid",
    email: "alice@example.com",
    parentName: "Bob Smith",
    parentPhone: "+237612345679",
    admissionNumber: "ADM2023002",
    balance: 0,
    parentContacts: [
      {
        name: "Bob Smith",
        phone: "+237612345679",
        email: "bob@example.com",
      },
    ],
  },
];

export const fetchStudents = async (): Promise<Student[]> => {
  // Simulate a delay to mimic network latency
  await new Promise((resolve) => setTimeout(resolve, 1000));
  return mockStudents;
};

export const addStudent = async (student: Student): Promise<Student> => {
  // Simulate a delay to mimic network latency
  await new Promise((resolve) => setTimeout(resolve, 1000));
  mockStudents.push(student);
  return student;
};

export const recordPayment = async (payment: Payment): Promise<Payment> => {
  // Simulate a delay to mimic network latency
  await new Promise((resolve) => setTimeout(resolve, 1000));
  return payment;
};