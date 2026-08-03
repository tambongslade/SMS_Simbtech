"use client";

// Read-only header: the Super Manager reviews fees and configures the class
// fee structure; payments are recorded by the Bursar.
export const Header = () => {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800">Fees Management</h1>
      <p className="text-gray-600">Configure class fee structures and review student payments</p>
    </div>
  );
};
