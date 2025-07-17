'use client';

import { useState, Fragment, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Card, CardHeader, CardTitle, CardBody, Input, Button, Fade } from '@/components/ui';
import { UserIcon, LockClosedIcon, CheckCircleIcon, AtSymbolIcon, IdentificationIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/components/context/AuthContext';
import AcademicYearSelector from '@/components/auth/AcademicYearSelector';
import { toast } from 'react-hot-toast';

// --- Role Selection Modal Component ---
interface RoleSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  roles: string[];
  onRoleSelect: (selectedRole: string) => void;
}

const RoleSelectionModal: React.FC<RoleSelectionModalProps> = ({ isOpen, onClose, roles, onRoleSelect }) => {
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const { isLoading } = useAuth();

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (selectedRole) {
      onRoleSelect(selectedRole);
    }
  };

  // Function to format role names for display
  const formatRoleName = (role: string): string => {
    if (!role) return '';
    return role
      .toLowerCase()
      .replace(/_/g, ' ')
      .replace(/\b\w/g, char => char.toUpperCase());
  };

  // Function to get role description
  const getRoleDescription = (role: string): string => {
    const descriptions: Record<string, string> = {
      'SUPER_MANAGER': 'Full administrative access to all school operations',
      'PRINCIPAL': 'Overall school leadership and management',
      'VICE_PRINCIPAL': 'Support principal in administrative duties',
      'TEACHER': 'Teaching and student assessment responsibilities',
      'HOD': 'Head of Department - subject area management',
      'BURSAR': 'Financial management and fee collection',
      'DISCIPLINE_MASTER': 'Student discipline and behavior management',
      'GUIDANCE_COUNSELOR': 'Student guidance and counseling services',
      'PARENT': 'View child(ren) information and progress',
      'STUDENT': 'Access your academic information and results',
      'MANAGER': 'General management and operational oversight'
    };
    return descriptions[role] || 'Access to role-specific features';
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
      <div className="relative mx-auto p-6 border w-full max-w-lg shadow-lg rounded-lg bg-white">
        <div className="text-center mb-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Select Your Role
          </h3>
          <p className="text-sm text-gray-600">
            You have multiple roles associated with your account. Please choose the role you want to use for this session.
          </p>
        </div>

        <div className="space-y-3 mb-6 max-h-96 overflow-y-auto">
          {roles.map((role) => (
            <button
              key={role}
              onClick={() => setSelectedRole(role)}
              className={`w-full text-left p-4 border rounded-lg transition-all duration-200 ${selectedRole === role
                ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`font-medium ${selectedRole === role ? 'text-blue-700' : 'text-gray-800'
                      }`}>
                      {formatRoleName(role)}
                    </span>
                    {selectedRole === role && (
                      <CheckCircleIcon className="h-5 w-5 text-blue-600" />
                    )}
                  </div>
                  <p className="text-sm text-gray-600">
                    {getRoleDescription(role)}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedRole || isLoading}
            className="min-w-[120px]"
          >
            {isLoading ? 'Loading...' : 'Continue'}
          </Button>
        </div>
      </div>
    </div>
  );
};

// --- Array of background image paths ---
const backgroundImages = [
  '/backgrounds/St.-Stephen-img12-scaled.jpg',
  '/backgrounds/St.-Stephen-img13-scaled.jpg',
  '/backgrounds/St.-Stephen-img15-scaled.jpg',
  '/backgrounds/St.-Stephen-img17-scaled.jpg',
];

export default function LoginPage() {
  const router = useRouter();
  const {
    login,
    selectRole,
    user,
    availableRoles,
    availableAcademicYears,
    selectedRole,
    requiresAcademicYear,
    isLoading,
    isAuthenticated,
    selectAcademicYear,
    selectedAcademicYear
  } = useAuth();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [loginType, setLoginType] = useState<'email' | 'matricule'>('email');
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);

  // Background image cycling
  const [bgIndex, setBgIndex] = useState(0);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setBgIndex((prevIndex) => (prevIndex + 1) % backgroundImages.length);
    }, 5000);

    return () => clearInterval(intervalId);
  }, []);

  // Handle authentication flow and redirection
  useEffect(() => {
    if (isAuthenticated && user) {
      if (availableRoles.length > 1 && !selectedRole) {
        setIsRoleModalOpen(true);
      } else if (availableRoles.length === 1 && !selectedRole) {
        // Auto-select single role
        handleRoleSelect(availableRoles[0]);
      }
      // No direct redirection here, the new useEffect below will handle it
    }
  }, [isAuthenticated, user, availableRoles, selectedRole]);

  // New useEffect for handling redirection after role/academic year selection
  useEffect(() => {
    if (isAuthenticated && user) {
      const DASHBOARD_ROUTES: Record<string, string> = {
        'SUPER_MANAGER': '/dashboard/super-manager',
        'PRINCIPAL': '/dashboard/principal',
        'VICE_PRINCIPAL': '/dashboard/vice-principal',
        'TEACHER': '/dashboard/teacher',
        'HOD': '/dashboard/hod',
        'BURSAR': '/dashboard/bursar',
        'DISCIPLINE_MASTER': '/dashboard/discipline-master',
        'GUIDANCE_COUNSELOR': '/dashboard/guidance-counselor',
        'PARENT': '/dashboard/parent-student',
        'STUDENT': '/dashboard/parent-student',
        'MANAGER': '/dashboard/manager'
      };

      // Scenario 1: Role selected, and it requires academic year, and academic year is also selected
      if (selectedRole && requiresAcademicYear(selectedRole) && selectedAcademicYear) {
        router.push(DASHBOARD_ROUTES[selectedRole] || '/dashboard');
      }
      // Scenario 2: Role selected, and it does NOT require academic year
      else if (selectedRole && !requiresAcademicYear(selectedRole)) {
        router.push(DASHBOARD_ROUTES[selectedRole] || '/dashboard');
      }
    }
  }, [isAuthenticated, user, selectedRole, selectedAcademicYear, requiresAcademicYear, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.email || !formData.password) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      await login(formData.email, formData.password);
      // The useEffect will handle the rest of the flow, no direct redirection here
    } catch (error) {
      // Error is already handled by the auth context
      console.error('Login error:', error);
    }
  };

  const handleRoleSelect = async (role: string) => {
    try {
      await selectRole(role);
      setIsRoleModalOpen(false);
      // The AuthContext will now manage academic year display if required
    } catch (error) {
      console.error('Role selection error:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const toggleLoginType = () => {
    setLoginType(prev => prev === 'email' ? 'matricule' : 'email');
    setFormData({ ...formData, email: '' }); // Clear the input when switching
  };

  // Conditionally render AcademicYearSelector
  console.log('--- AcademicYearSelector Conditions ---');
  console.log('isAuthenticated:', isAuthenticated);
  console.log('selectedRole:', selectedRole);
  console.log('requiresAcademicYear(selectedRole):', selectedRole ? requiresAcademicYear(selectedRole) : 'N/A');
  console.log('!selectedAcademicYear:', !selectedAcademicYear);
  console.log('availableAcademicYears.length:', availableAcademicYears.length);
  console.log('------------------------------------');

  if (isAuthenticated && selectedRole && requiresAcademicYear(selectedRole) && !selectedAcademicYear && availableAcademicYears.length > 0) {
    return (
      <AcademicYearSelector
        availableAcademicYears={availableAcademicYears}
        onSelectAcademicYear={async (academicYear) => {
          await selectAcademicYear(academicYear);
        }}
        onClose={() => {
          // User cancelled academic year selection
          // You might want to log out, or go back to role selection
          // For now, let's clear the selected role to force re-selection
          toast.error('Academic year selection cancelled. Please re-select your role.');
          selectRole(''); // This will effectively clear selected role and available years
        }}
      />
    );
  }

  // Render Role Selection Modal if needed
  if (isRoleModalOpen && availableRoles.length > 1) {
    return (
      <RoleSelectionModal
        isOpen={isRoleModalOpen}
        onClose={() => setIsRoleModalOpen(false)}
        roles={availableRoles}
        onRoleSelect={handleRoleSelect}
      />
    );
  }

  return (
    <Fragment>
      {/* Background Image Container */}
      <div className="fixed inset-0 z-[-1] overflow-hidden">
        {backgroundImages.map((imgSrc, index) => (
          <Image
            key={imgSrc}
            src={imgSrc}
            alt={`Background ${index + 1}`}
            fill
            style={{ objectFit: 'cover' }}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${index === bgIndex ? 'opacity-100' : 'opacity-0'
              }`}
            priority={index === 0}
          />
        ))}
        {/* Dark overlay for contrast */}
        <div className="absolute inset-0 bg-black opacity-40"></div>
      </div>

      {/* Main Content Container */}
      <div className="relative min-h-screen flex items-center justify-center p-4">
        <Fade>
          <Card className="w-full max-w-md bg-white/95 backdrop-blur-sm rounded-lg shadow-xl">
            {/* Logo */}
            <div className="flex justify-center pt-8 mb-4">
              <Image
                src="/logo.png"
                alt="SSIC Logo"
                width={80}
                height={80}
                priority
              />
            </div>

            <CardHeader className="text-center pb-6 pt-0">
              <CardTitle className="text-2xl font-bold text-gray-900">
                Welcome Back
              </CardTitle>
              <p className="mt-2 text-sm text-gray-700">
                Sign in to access your dashboard
              </p>
            </CardHeader>

            <CardBody>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Login Type Toggle */}
                <div className="flex items-center justify-center mb-4">
                  <div className="flex bg-gray-100 rounded-lg p-1">
                    <button
                      type="button"
                      onClick={toggleLoginType}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${loginType === 'email'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-800'
                        }`}
                    >
                      <AtSymbolIcon className="h-4 w-4 inline mr-1" />
                      Email
                    </button>
                    <button
                      type="button"
                      onClick={toggleLoginType}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${loginType === 'matricule'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-800'
                        }`}
                    >
                      <IdentificationIcon className="h-4 w-4 inline mr-1" />
                      Matricule
                    </button>
                  </div>
                </div>

                <Input
                  label={loginType === 'email' ? 'Email Address' : 'Matricule Number'}
                  name="email"
                  type={loginType === 'email' ? 'email' : 'text'}
                  placeholder={loginType === 'email' ? 'Enter your email address' : 'Enter your matricule number'}
                  value={formData.email}
                  onChange={handleInputChange}
                  leftIcon={
                    loginType === 'email'
                      ? <AtSymbolIcon className="h-5 w-5 text-gray-400" />
                      : <IdentificationIcon className="h-5 w-5 text-gray-400" />
                  }
                  required
                  disabled={isLoading}
                />

                <Input
                  label="Password"
                  name="password"
                  type="password"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleInputChange}
                  leftIcon={<LockClosedIcon className="h-5 w-5 text-gray-400" />}
                  required
                  disabled={isLoading}
                />

                <Button
                  type="submit"
                  isFullWidth
                  size="lg"
                  variant="solid" // Explicitly set variant
                  color="primary" // Explicitly set color
                  className="mt-6 bg-blue-700 hover:bg-blue-800 text-white"
                  disabled={!formData.email || !formData.password || isLoading}
                >
                  {isLoading ? 'Signing in...' : 'Sign In'}
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

      {/* Role Selection Modal */}
      {/* This component is now rendered conditionally based on isRoleModalOpen */}
    </Fragment>
  );
}
