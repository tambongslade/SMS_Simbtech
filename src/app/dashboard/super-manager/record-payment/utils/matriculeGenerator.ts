/**
 * Utility functions for payment matricule generation and validation
 */

/**
 * Generates a unique payment matricule
 * Format: PAY + timestamp(6 digits) + random(3 digits)
 * Example: PAY123456789
 */
export function generatePaymentMatricule(): string {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `PAY${timestamp}${random}`;
}

/**
 * Validates if a matricule follows the correct format
 * @param matricule - The matricule to validate
 * @returns boolean indicating if the format is valid
 */
export function isValidPaymentMatricule(matricule: string): boolean {
    // Should start with PAY followed by exactly 9 digits
    const pattern = /^PAY\d{9}$/;
    return pattern.test(matricule);
}

/**
 * Extracts timestamp from payment matricule
 * @param matricule - The payment matricule
 * @returns Date object or null if invalid
 */
export function extractTimestampFromMatricule(matricule: string): Date | null {
    if (!isValidPaymentMatricule(matricule)) {
        return null;
    }
    
    // Extract the 6-digit timestamp portion
    const timestampPart = matricule.slice(3, 9); // PAY[123456]789
    
    // This is only the last 6 digits, so we can't reconstruct the full timestamp
    // But we can use it for relative comparison
    return null; // Would need full timestamp for accurate date reconstruction
}

/**
 * Generates multiple unique matricules for testing
 * @param count - Number of matricules to generate
 * @returns Array of unique matricules
 */
export function generateMultipleMatricules(count: number): string[] {
    const matricules = new Set<string>();
    
    while (matricules.size < count) {
        matricules.add(generatePaymentMatricule());
        // Small delay to ensure different timestamps
        if (matricules.size < count) {
            // Use a small random delay to avoid duplicates
            const delay = Math.floor(Math.random() * 10);
            for (let i = 0; i < delay; i++) {
                // Simple busy wait
            }
        }
    }
    
    return Array.from(matricules);
}

/**
 * Test function to verify matricule uniqueness
 * @param count - Number of matricules to test
 * @returns Object with test results
 */
export function testMatriculeUniqueness(count: number = 100): {
    total: number;
    unique: number;
    duplicates: number;
    success: boolean;
} {
    const matricules = [];
    
    for (let i = 0; i < count; i++) {
        matricules.push(generatePaymentMatricule());
    }
    
    const uniqueMatricules = new Set(matricules);
    const duplicates = count - uniqueMatricules.size;
    
    return {
        total: count,
        unique: uniqueMatricules.size,
        duplicates,
        success: duplicates === 0
    };
}

/**
 * Format matricule for display with spacing
 * @param matricule - The matricule to format
 * @returns Formatted matricule string
 */
export function formatMatriculeForDisplay(matricule: string): string {
    if (!isValidPaymentMatricule(matricule)) {
        return matricule;
    }
    
    // Format as PAY-123456-789 for better readability
    return `${matricule.slice(0, 3)}-${matricule.slice(3, 9)}-${matricule.slice(9)}`;
}
