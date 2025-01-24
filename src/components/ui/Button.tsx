'use client';

import { ButtonHTMLAttributes } from 'react';

type ButtonVariant = 'solid' | 'outline' | 'ghost' | 'link';
type ButtonColor = 'primary' | 'secondary' | 'success' | 'danger' | 'warning';
type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  color?: ButtonColor;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ElementType;
  rightIcon?: React.ElementType;
  isFullWidth?: boolean;
  className?: string;
}

export function Button({
  variant = 'solid',
  color = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon: LeftIcon,
  rightIcon: RightIcon,
  isFullWidth = false,
  className = '',
  children,
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-md focus:outline-none transition-colors';
  
  const sizeStyles = {
    xs: 'px-2.5 py-1.5 text-xs',
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  const colorStyles = {
    solid: {
      primary: 'bg-blue-600 text-white hover:bg-blue-700',
      secondary: 'bg-purple-600 text-white hover:bg-purple-700',
      success: 'bg-green-600 text-white hover:bg-green-700',
      danger: 'bg-red-600 text-white hover:bg-red-700',
      warning: 'bg-yellow-500 text-white hover:bg-yellow-600',
    },
    outline: {
      primary: 'border-2 border-blue-600 text-blue-600 hover:bg-blue-50',
      secondary: 'border-2 border-purple-600 text-purple-600 hover:bg-purple-50',
      success: 'border-2 border-green-600 text-green-600 hover:bg-green-50',
      danger: 'border-2 border-red-600 text-red-600 hover:bg-red-50',
      warning: 'border-2 border-yellow-500 text-yellow-500 hover:bg-yellow-50',
    },
    ghost: {
      primary: 'text-blue-600 hover:bg-blue-50',
      secondary: 'text-purple-600 hover:bg-purple-50',
      success: 'text-green-600 hover:bg-green-50',
      danger: 'text-red-600 hover:bg-red-50',
      warning: 'text-yellow-500 hover:bg-yellow-50',
    },
    link: {
      primary: 'text-blue-600 hover:underline',
      secondary: 'text-purple-600 hover:underline',
      success: 'text-green-600 hover:underline',
      danger: 'text-red-600 hover:underline',
      warning: 'text-yellow-500 hover:underline',
    },
  };

  const classes = [
    baseStyles,
    sizeStyles[size],
    colorStyles[variant][color],
    isFullWidth ? 'w-full' : '',
    disabled || isLoading ? 'opacity-50 cursor-not-allowed' : '',
    className,
  ].join(' ');

  return (
    <button
      className={classes}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && (
        <svg
          className="animate-spin -ml-1 mr-3 h-5 w-5 text-current"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      )}
      {LeftIcon && <LeftIcon className="w-5 h-5 mr-2" />}
      {children}
      {RightIcon && <RightIcon className="w-5 h-5 ml-2" />}
    </button>
  );
}

interface IconButtonProps extends ButtonProps {
  icon: React.ElementType;
  'aria-label': string;
}

export function IconButton({
  icon: Icon,
  'aria-label': ariaLabel,
  ...props
}: IconButtonProps) {
  return (
    <Button {...props} className="p-2">
      <Icon className="w-5 h-5" />
      <span className="sr-only">{ariaLabel}</span>
    </Button>
  );
} 