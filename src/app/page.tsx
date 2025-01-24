'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardBody, Input, Select, Button, Fade } from '@/components/ui';
import { UserIcon, LockClosedIcon } from '@heroicons/react/24/outline';

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    role: '',
    username: '',
    password: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const dashboardPath = `dashboard/${formData.role.toLowerCase()}`;
    router.push(dashboardPath);
  };

  const roleOptions = [
    { value: '', label: 'Select your role' },
    { value: 'SuperManager', label: 'Super Manager' },
    { value: 'Manager', label: 'Manager' },
    { value: 'Principal', label: 'Principal' },
    { value: 'VicePrincipal', label: 'Vice Principal' },
    { value: 'Bursar', label: 'Bursar' },
    { value: 'DisciplineMaster', label: 'Discipline Master' },
    { value: 'HOD', label: 'Head of Department' },
    { value: 'Teacher', label: 'Teacher' },
    { value: 'GuidanceCounselor', label: 'Guidance Counselor' },
    { value: 'ParentStudent', label: 'Parent/Student' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <Fade>
        <Card className="w-full max-w-md">
          <CardHeader className="text-center pb-8">
            <CardTitle className="text-2xl font-bold text-gray-900">
              School Management System
            </CardTitle>
            <p className="mt-2 text-sm text-gray-600">
              Sign in to access your dashboard
            </p>
          </CardHeader>
          <CardBody>
            <form onSubmit={handleSubmit} className="space-y-6">
              <Select
                label="Role"
                options={roleOptions}
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full"
              />
              
              <Input
                label="Username"
                type="text"
                placeholder="Enter your username"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                leftIcon={<UserIcon className="h-5 w-5 text-gray-400" />}
                required
              />

              <Input
                label="Password"
                type="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                leftIcon={<LockClosedIcon className="h-5 w-5 text-gray-400" />}
                required
              />

              <Button
                type="submit"
                isFullWidth
                size="lg"
                className="mt-6"
                disabled={!formData.role || !formData.username || !formData.password}
              >
                Sign In
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Having trouble signing in?{' '}
                <a href="#" className="text-blue-600 hover:text-blue-700 font-medium">
                  Contact Support
                </a>
              </p>
            </div>
          </CardBody>
        </Card>
      </Fade>
    </div>
  );
}
