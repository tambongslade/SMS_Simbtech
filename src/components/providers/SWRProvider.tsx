'use client'; // This component needs to be a client component

import { SWRConfig } from 'swr';
import { fetcher } from '@/lib/fetcher'; // Ensure path alias is correct
import React from 'react';

interface SWRProviderProps {
    children: React.ReactNode;
}

/**
 * Client Component wrapper for SWRConfig to provide global fetcher configuration.
 */
export const SWRProvider: React.FC<SWRProviderProps> = ({ children }) => {
    return (
        <SWRConfig value={{ 
            fetcher: fetcher,
            // You can add other global SWR options here if needed
            // e.g., revalidateOnFocus: false,
         }}>
            {children}
        </SWRConfig>
    );
}; 