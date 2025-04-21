'use client';

import { useState, Fragment, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Card, CardHeader, CardTitle, CardBody, Input, Button, Fade } from '@/components/ui';
import { UserIcon, LockClosedIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';

// --- Role Selection Modal Component Definition ---
interface RoleSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  roles: string[];
  onRoleSelect: (selectedRole: string) => void;
}

const RoleSelectionModal: React.FC<RoleSelectionModalProps> = ({ isOpen, onClose, roles, onRoleSelect }) => {
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (selectedRole) {
      onRoleSelect(selectedRole);
    }
  };

  // Function to format role names for display (e.g., SUPER_MANAGER -> Super Manager)
  const formatRoleName = (role: string): string => {
    if (!role) return '';
    return role
      .toLowerCase()
      .replace(/_/g, ' ')
      .replace(/\b\w/g, char => char.toUpperCase()); // Capitalize each word
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
      <div className="relative mx-auto p-6 border w-full max-w-md shadow-lg rounded-md bg-white">
        <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
          Select Your Role
        </h3>
        <p className="text-sm text-gray-600 mb-6">
          You have multiple roles associated with your account. Please choose the role you want to use for this session.
        </p>
        <div className="space-y-3 mb-6">
          {roles.map((role) => (
            <button
              key={role}
              onClick={() => setSelectedRole(role)}
              className={`w-full text-left p-3 border rounded-lg flex items-center justify-between transition-colors ${ selectedRole === role ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-300' : 'border-gray-300 hover:bg-gray-100'}
              `}
            >
              <span className={`font-medium ${selectedRole === role ? 'text-blue-700' : 'text-gray-800'}`}>
                 {formatRoleName(role)} {/* Format role name for display */}
               </span>
              {selectedRole === role && <CheckCircleIcon className="h-5 w-5 text-blue-600" />}
            </button>
          ))}
        </div>
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          {/* Optional: Add a Cancel button if needed: <button onClick={onClose}>Cancel</button> */}
          <Button
            onClick={handleConfirm}
            disabled={!selectedRole}
            className="min-w-[100px]"
          >
            Confirm Role
          </Button>
        </div>
      </div>
    </div>
  );
};
// --- End of Role Selection Modal Component ---

// --- Array of background image paths ---
const backgroundImages = [
  '/backgrounds/St.-Stephen-img12-scaled.jpg',
  '/backgrounds/St.-Stephen-img13-scaled.jpg',
  '/backgrounds/St.-Stephen-img15-scaled.jpg',
  '/backgrounds/St.-Stephen-img17-scaled.jpg',
];

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [rolesForSelection, setRolesForSelection] = useState<string[]>([]);
  const [loginResponseData, setLoginResponseData] = useState<any>(null);

  // --- State and Effect for Background Image Cycling ---
  const [bgIndex, setBgIndex] = useState(0);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setBgIndex((prevIndex) => (prevIndex + 1) % backgroundImages.length);
    }, 5000); // Change image every 5 seconds

    return () => clearInterval(intervalId); // Cleanup interval on component unmount
  }, []); // Run only once on mount

  const handleRoleSelected = (selectedRole: string) => {
    if (!loginResponseData) {
      toast.error("Login data is missing. Please try logging in again.");
      setIsRoleModalOpen(false);
      return;
    }

    try {
        // Store the token and user data in localStorage
        localStorage.setItem('token', loginResponseData.data.token);
        // Ensure user data structure is handled correctly
        const userDataToStore = loginResponseData.data.user || {};
        localStorage.setItem('userData', JSON.stringify(userDataToStore));
        localStorage.setItem('userRole', selectedRole);

        // Show success message
        toast.success('Login successful!');

        // Redirect to the appropriate dashboard
        const formattedRole = selectedRole.toLowerCase().replace('_', '-');
        router.push(`/dashboard/${formattedRole}`);

        setIsRoleModalOpen(false); // Close modal after selection and redirect
        setLoginResponseData(null); // Clear temporary data

    } catch (e) {
        console.error("Error processing role selection or redirecting:", e);
        toast.error("An error occurred after selecting the role. Please try again.");
        setIsRoleModalOpen(false);
        setLoginResponseData(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setLoginResponseData(null); // Clear previous login attempt data

    try {
      // Construct URL using environment variable
      const apiUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api/v1'}/auth/login`; 
      // Added a fallback for safety, but .env.local is preferred
      
      const response = await fetch(apiUrl, { // Use the constructed apiUrl
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      // Store response data temporarily
      setLoginResponseData(data);

      // Extract roles from userRoles array
      // Ensure the path to roles is correct based on actual API response
      const userRolesData = data.data?.user?.userRoles;
      const roles = Array.isArray(userRolesData) ? userRolesData.map((roleObj: any) => roleObj.role) : [];

      if (roles.length === 0) {
        throw new Error('No roles found for the user');
      }

      if (roles.length > 1) {
        // Multiple roles: Open the modal
        console.log("Multiple roles found, opening modal:", roles); // DEBUG
        setRolesForSelection(roles);
        setIsRoleModalOpen(true);
        // Don't proceed further here, wait for modal selection
        // setIsLoading(false); // Keep loading indicator until role is chosen or modal closed
      } else {
        // Single role: Proceed directly
        const selectedRole = roles[0];
        handleRoleSelected(selectedRole); // Use the handler to store data and redirect
      }

    } catch (error) {
      console.error('Login error:', error);
      toast.error(error instanceof Error ? error.message : 'Login failed. Please try again.');
       setLoginResponseData(null); // Clear data on error
    } finally {
      // Only set isLoading to false if modal is NOT opened
      // If modal is open, loading state remains until role is selected/modal closed
      if (!isRoleModalOpen) {
         setIsLoading(false);
      }
      // Correction:isLoading should be set false even if modal opens, modal can have its own internal loading state if needed.
      setIsLoading(false);
    }
  };

  return (
    <Fragment>
      {/* Background Image Container */}
      <div className="fixed inset-0 z-[-1] overflow-hidden">
        {backgroundImages.map((imgSrc, index) => (
          <Image
            key={imgSrc}
            src={imgSrc}
            alt={`Background ${index + 1}`}
            fill // Use fill instead of layout="fill"
            style={{ objectFit: 'cover' }} // Use style for objectFit
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${index === bgIndex ? 'opacity-100' : 'opacity-0'}`}
            priority={index === 0} // Prioritize loading the first image
          />
        ))}
        {/* Dark overlay for contrast */}
        <div className="absolute inset-0 bg-black opacity-40"></div>
      </div>

      {/* Main Content Container */}
      <div className="relative min-h-screen flex items-center justify-center p-4"> 
        {/* Removed gradient background, added relative positioning */}
        <Fade>
          <Card className="w-full max-w-md bg-white/95 backdrop-blur-sm rounded-lg shadow-xl"> 
            {/* Optional: added slight transparency and blur to card */}
             {/* Logo */}
             <div className="flex justify-center pt-8 mb-4"> 
                 <Image
                     src="/logo.png" // Path to the logo in /public
                     alt="SSIC Logo"
                     width={80} // Adjust size as needed
                     height={80}
                     priority // Prioritize logo loading
                 />
             </div>

            <CardHeader className="text-center pb-6 pt-0"> 
              {/* Removed CardTitle and description, relying on logo/form */}
               <p className="mt-2 text-sm text-gray-700"> {/* Adjusted text color for better contrast */}
                 Sign in to access your dashboard
               </p>
            </CardHeader>
            <CardBody>
              <form onSubmit={handleSubmit} className="space-y-6">
                <Input
                  label="Email"
                  type="email"
                  placeholder="Enter your Email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  leftIcon={<UserIcon className="h-5 w-5 text-gray-400" />}
                  required
                  disabled={isLoading}
                />
                <Input
                  label="Password"
                  type="password"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  leftIcon={<LockClosedIcon className="h-5 w-5 text-gray-400" />}
                  required
                  disabled={isLoading}
                />
                 <Button
                   type="submit"
                   isFullWidth
                   size="lg"
                   className="mt-6 bg-blue-700 hover:bg-blue-800 text-white" // Use brand color for button
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

      {/* Role Selection Modal Render */}
      <RoleSelectionModal
        isOpen={isRoleModalOpen}
        onClose={() => {
            setIsRoleModalOpen(false);
            setIsLoading(false); // Ensure loading is stopped if modal is closed without selection
            setLoginResponseData(null); // Clear temp data if modal closed
        }}
        roles={rolesForSelection}
        onRoleSelect={handleRoleSelected}
      />
    </Fragment>
  );
}
