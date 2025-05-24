'use client';

import React, { useState, useCallback, ChangeEvent } from 'react';

interface FormattedDateInputProps {
    id: string;
    name?: string; // Optional: for form association
    label: string;
    value: string; // Expects DD/MM/YYYY format
    onChange: (value: string) => void; // Passes back the formatted DD/MM/YYYY string
    placeholder?: string;
    required?: boolean;
    disabled?: boolean;
    className?: string; // Allow passing custom styling
    minYear?: number;
    maxYear?: number;
}

export const FormattedDateInput: React.FC<FormattedDateInputProps> = ({
    id,
    name,
    label,
    value,
    onChange,
    placeholder = 'DD/MM/YYYY',
    required = false,
    disabled = false,
    className = '',
    minYear = 1900,
    maxYear = 2035,
}) => {
    const [dateError, setDateError] = useState<string | null>(null);

    const validateDateInput = useCallback((dateString: string): string | null => {
        const [dayStr, monthStr, yearStr] = dateString.split('/');
        
        // Don't validate incomplete input unless it clearly violates format/range
        if (dateString.length === 0 && !required) return null; // Allow empty if not required

        const day = parseInt(dayStr, 10);
        const month = parseInt(monthStr, 10);
        const year = parseInt(yearStr, 10);

        // Basic format/range checks even for partial input
        if (dayStr && (isNaN(day) || day < 0 || day > 31)) return "Invalid day (DD must be 01-31).";
        if (monthStr && (isNaN(month) || month < 0 || month > 12)) return "Invalid month (MM must be 01-12).";
        if (yearStr && (isNaN(year) || year < minYear || year > maxYear)) return `Invalid year (YYYY must be ${minYear}-${maxYear}).`;

        // Check validity only if complete
        if (dateString.length === 10) {
             if (isNaN(day) || isNaN(month) || isNaN(year) || month < 1 || day < 1) return "Invalid date format.";
             const dateObj = new Date(year, month - 1, day);
             if (!(dateObj.getFullYear() === year && dateObj.getMonth() === month - 1 && dateObj.getDate() === day)) {
                 return "Invalid date (e.g., 31/02 is invalid).";
             }
        }
        
        return null; // No error found
    }, [required, minYear, maxYear]);

    const handleDateInputChange = (e: ChangeEvent<HTMLInputElement>) => {
        let rawValue = e.target.value.replace(/[^\d]/g, '');
        let formattedValue = '';

        if (rawValue.length > 0) formattedValue += rawValue.substring(0, 2);
        if (rawValue.length >= 3) formattedValue += '/' + rawValue.substring(2, 4);
        if (rawValue.length >= 5) formattedValue += '/' + rawValue.substring(4, 8);

        const finalFormattedValue = formattedValue.substring(0, 10);
        
        // Validate the potentially incomplete/final value for immediate feedback
        const currentError = validateDateInput(finalFormattedValue);
        setDateError(currentError);

        // Pass the formatted value up to the parent
        onChange(finalFormattedValue);
    };

    // Recalculate error on value change from parent or disabled state change
    React.useEffect(() => {
        if (!disabled) {
           setDateError(validateDateInput(value));
        }
    }, [value, disabled, validateDateInput]);

    const baseClassName = "mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500";
    const errorClassName = dateError ? 'border-red-500' : 'border-gray-300';
    const disabledClassName = disabled ? 'bg-gray-100 cursor-not-allowed' : '';

    return (
        <div>
            <label htmlFor={id} className="block text-sm font-medium text-gray-700">{label}{required && ' *'}</label>
            <input
                type="text"
                id={id}
                name={name}
                value={value}
                onChange={handleDateInputChange}
                placeholder={placeholder}
                maxLength={10}
                className={`${baseClassName} ${errorClassName} ${disabledClassName} ${className}`.trim()}
                required={required} // Let browser handle basic required check, but our validation is key
                disabled={disabled}
                aria-invalid={dateError ? "true" : "false"}
                aria-describedby={dateError ? `${id}-error` : undefined}
            />
            {dateError && <p id={`${id}-error`} className="mt-1 text-xs text-red-600">{dateError}</p>}
        </div>
    );
}; 