'use client';

import React from 'react';
import { Card, CardBody, Button } from '@/components/ui';
import {
    ExclamationTriangleIcon,
    XCircleIcon,
    InformationCircleIcon,
    ArrowPathIcon
} from '@heroicons/react/24/outline';

// Error types
export type ErrorType = 'authentication' | 'network' | 'validation' | 'server' | 'session' | 'unknown';

export interface AuthError {
    type: ErrorType;
    message: string;
    details?: string;
    code?: string;
    field?: string;
    retryable?: boolean;
}

interface ErrorHandlerProps {
    error: AuthError | Error | string | null;
    onRetry?: () => void;
    onDismiss?: () => void;
    className?: string;
}

// Error message mapping
const getErrorDisplay = (error: AuthError | Error | string): AuthError => {
    if (typeof error === 'string') {
        return {
            type: 'unknown',
            message: error,
            retryable: false
        };
    }

    if (error instanceof Error) {
        // Parse common error patterns
        const message = error.message.toLowerCase();

        if (message.includes('invalid credentials') || message.includes('login failed')) {
            return {
                type: 'authentication',
                message: 'Invalid email/matricule or password. Please check your credentials and try again.',
                retryable: true
            };
        }

        if (message.includes('network') || message.includes('fetch')) {
            return {
                type: 'network',
                message: 'Network error. Please check your internet connection and try again.',
                retryable: true
            };
        }

        if (message.includes('session') || message.includes('expired')) {
            return {
                type: 'session',
                message: 'Your session has expired. Please log in again.',
                retryable: false
            };
        }

        if (message.includes('server') || message.includes('internal')) {
            return {
                type: 'server',
                message: 'Server error. Please try again later or contact support.',
                retryable: true
            };
        }

        return {
            type: 'unknown',
            message: error.message,
            retryable: false
        };
    }

    return error;
};

const ErrorHandler: React.FC<ErrorHandlerProps> = ({
    error,
    onRetry,
    onDismiss,
    className = ''
}) => {
    if (!error) return null;

    const errorDisplay = getErrorDisplay(error);

    const getIcon = (type: ErrorType) => {
        switch (type) {
            case 'authentication':
                return <XCircleIcon className="h-8 w-8 text-red-500" />;
            case 'network':
                return <ExclamationTriangleIcon className="h-8 w-8 text-yellow-500" />;
            case 'validation':
                return <InformationCircleIcon className="h-8 w-8 text-blue-500" />;
            case 'server':
                return <ExclamationTriangleIcon className="h-8 w-8 text-red-500" />;
            case 'session':
                return <XCircleIcon className="h-8 w-8 text-orange-500" />;
            default:
                return <ExclamationTriangleIcon className="h-8 w-8 text-gray-500" />;
        }
    };

    const getTitle = (type: ErrorType) => {
        switch (type) {
            case 'authentication':
                return 'Authentication Failed';
            case 'network':
                return 'Network Error';
            case 'validation':
                return 'Invalid Input';
            case 'server':
                return 'Server Error';
            case 'session':
                return 'Session Expired';
            default:
                return 'Error';
        }
    };

    const getBackgroundColor = (type: ErrorType) => {
        switch (type) {
            case 'authentication':
                return 'bg-red-50 border-red-200';
            case 'network':
                return 'bg-yellow-50 border-yellow-200';
            case 'validation':
                return 'bg-blue-50 border-blue-200';
            case 'server':
                return 'bg-red-50 border-red-200';
            case 'session':
                return 'bg-orange-50 border-orange-200';
            default:
                return 'bg-gray-50 border-gray-200';
        }
    };

    return (
        <Card className={`border-l-4 ${getBackgroundColor(errorDisplay.type)} ${className}`}>
            <CardBody className="p-4">
                <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                        {getIcon(errorDisplay.type)}
                    </div>
                    <div className="flex-1">
                        <h3 className="text-sm font-medium text-gray-900 mb-1">
                            {getTitle(errorDisplay.type)}
                        </h3>
                        <p className="text-sm text-gray-700 mb-2">
                            {errorDisplay.message}
                        </p>
                        {errorDisplay.details && (
                            <p className="text-xs text-gray-500 mb-3">
                                {errorDisplay.details}
                            </p>
                        )}
                        {errorDisplay.code && (
                            <p className="text-xs text-gray-400">
                                Error code: {errorDisplay.code}
                            </p>
                        )}
                    </div>
                </div>

                {(errorDisplay.retryable || onDismiss) && (
                    <div className="mt-4 flex justify-end space-x-3">
                        {onDismiss && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={onDismiss}
                                className="text-gray-600 hover:text-gray-800"
                            >
                                Dismiss
                            </Button>
                        )}
                        {errorDisplay.retryable && onRetry && (
                            <Button
                                size="sm"
                                onClick={onRetry}
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                                <ArrowPathIcon className="h-4 w-4 mr-1" />
                                Try Again
                            </Button>
                        )}
                    </div>
                )}
            </CardBody>
        </Card>
    );
};

// Helper function to create standardized errors
export const createAuthError = (
    type: ErrorType,
    message: string,
    details?: string,
    code?: string,
    field?: string,
    retryable: boolean = false
): AuthError => ({
    type,
    message,
    details,
    code,
    field,
    retryable
});

// Common error creators
export const authErrors = {
    invalidCredentials: (): AuthError => createAuthError(
        'authentication',
        'Invalid email/matricule or password. Please check your credentials and try again.',
        undefined,
        'INVALID_CREDENTIALS',
        undefined,
        true
    ),

    networkError: (): AuthError => createAuthError(
        'network',
        'Network error. Please check your internet connection and try again.',
        'Unable to connect to the server. This could be due to network issues or server maintenance.',
        'NETWORK_ERROR',
        undefined,
        true
    ),

    serverError: (): AuthError => createAuthError(
        'server',
        'Server error. Please try again later or contact support.',
        'An unexpected error occurred on the server. Our team has been notified.',
        'SERVER_ERROR',
        undefined,
        true
    ),

    sessionExpired: (): AuthError => createAuthError(
        'session',
        'Your session has expired. Please log in again.',
        'For security reasons, your session has been terminated.',
        'SESSION_EXPIRED',
        undefined,
        false
    ),

    validationError: (field: string, message: string): AuthError => createAuthError(
        'validation',
        message,
        `Please check the ${field} field and try again.`,
        'VALIDATION_ERROR',
        field,
        true
    ),

    noRoles: (): AuthError => createAuthError(
        'authentication',
        'No roles found for your account. Please contact the administrator.',
        'Your account exists but no roles have been assigned to it.',
        'NO_ROLES',
        undefined,
        false
    ),

    noAcademicYears: (): AuthError => createAuthError(
        'authentication',
        'No academic years available for your selected role. Please contact the administrator.',
        'Your role requires academic year selection but none are available.',
        'NO_ACADEMIC_YEARS',
        undefined,
        false
    ),

    unknownRole: (role: string): AuthError => createAuthError(
        'authentication',
        `Unknown role: ${role}. Please contact support.`,
        'The selected role is not recognized by the system.',
        'UNKNOWN_ROLE',
        undefined,
        false
    )
};

export default ErrorHandler; 