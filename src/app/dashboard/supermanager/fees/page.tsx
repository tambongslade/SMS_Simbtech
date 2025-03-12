'use client';
import FeesForm from "./components/FeesForm";

export default function FeesManagement() {
    return (
        <div className="p-6 min-h-screen bg-gray-50">
            <h1 className="text-3xl font-bold mb-6">School Fees Management</h1>
            <p className="text-gray-600 mb-8">Configure fee structures for different class levels and student categories</p>
            <FeesForm/>
        </div>
    );
}