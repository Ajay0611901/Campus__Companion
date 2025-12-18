/**
 * AI Utilities
 * 
 * Helper functions for JSON parsing, hashing, validation, and logging.
 * Used by the main AI service module.
 */

import * as functions from 'firebase-functions';
import * as crypto from 'crypto';

// ============================================
// JSON CLEANING & PARSING
// ============================================

/**
 * Clean AI response text by removing markdown code blocks and extra whitespace
 */
export function cleanAIResponse(text: string): string {
    let cleaned = text.trim();

    // Remove markdown code blocks (```json ... ``` or ``` ... ```)
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/i, '');
    cleaned = cleaned.replace(/\n?```\s*$/i, '');

    // Remove any leading/trailing whitespace again
    cleaned = cleaned.trim();

    return cleaned;
}

/**
 * Safely parse JSON from AI response with multiple fallback strategies
 */
export function safeParseJSON<T>(text: string): { success: true; data: T } | { success: false; error: string } {
    // Strategy 1: Direct parse of cleaned text
    const cleaned = cleanAIResponse(text);

    try {
        const parsed = JSON.parse(cleaned) as T;
        return { success: true, data: parsed };
    } catch {
        // Continue to fallback strategies
    }

    // Strategy 2: Find JSON object in the text
    const objectMatch = cleaned.match(/\{[\s\S]*\}/);
    if (objectMatch) {
        try {
            const parsed = JSON.parse(objectMatch[0]) as T;
            return { success: true, data: parsed };
        } catch {
            // Continue to next strategy
        }
    }

    // Strategy 3: Find JSON array in the text
    const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
        try {
            const parsed = JSON.parse(arrayMatch[0]) as T;
            return { success: true, data: parsed };
        } catch {
            // Continue to next strategy
        }
    }

    // Strategy 4: Try to fix common JSON issues
    try {
        // Replace single quotes with double quotes
        const fixed = cleaned
            .replace(/'/g, '"')
            .replace(/(\w+):/g, '"$1":') // Add quotes to unquoted keys
            .replace(/,\s*([\]}])/g, '$1'); // Remove trailing commas

        const parsed = JSON.parse(fixed) as T;
        return { success: true, data: parsed };
    } catch {
        // All strategies failed
    }

    return {
        success: false,
        error: `Failed to parse JSON. Raw text: ${text.substring(0, 200)}...`
    };
}

/**
 * Extract JSON from AI response with detailed error information
 */
export function extractJSON<T>(text: string): T {
    const result = safeParseJSON<T>(text);

    if (result.success) {
        return result.data;
    }

    throw new Error(result.error);
}

// ============================================
// HASHING & CACHING
// ============================================

/**
 * Create a deterministic hash from input for caching
 * Uses SHA-256 for consistent, collision-resistant hashing
 */
export function createInputHash(input: unknown): string {
    const normalized = JSON.stringify(input, Object.keys(input as object).sort());
    return crypto.createHash('sha256').update(normalized).digest('hex').substring(0, 16);
}

/**
 * Create a cache key combining type and input hash
 */
export function createCacheKey(type: string, inputHash: string): string {
    return `${type}:${inputHash}`;
}

// ============================================
// VALIDATION
// ============================================

/**
 * Validate that an object has all required fields
 */
export function validateRequiredFields<T extends object>(
    data: T,
    requiredFields: (keyof T)[]
): { valid: true } | { valid: false; missing: string[] } {
    const missing: string[] = [];

    for (const field of requiredFields) {
        const value = data[field];
        if (value === undefined || value === null) {
            missing.push(String(field));
        }
    }

    if (missing.length > 0) {
        return { valid: false, missing };
    }

    return { valid: true };
}

/**
 * Validate JSON against a simple schema
 */
export function validateSchema(
    data: unknown,
    schema: Record<string, 'string' | 'number' | 'boolean' | 'object' | 'array'>
): { valid: true } | { valid: false; errors: string[] } {
    if (typeof data !== 'object' || data === null) {
        return { valid: false, errors: ['Data must be an object'] };
    }

    const errors: string[] = [];
    const obj = data as Record<string, unknown>;

    for (const [key, expectedType] of Object.entries(schema)) {
        const value = obj[key];

        if (value === undefined) {
            errors.push(`Missing required field: ${key}`);
            continue;
        }

        const actualType = Array.isArray(value) ? 'array' : typeof value;

        if (actualType !== expectedType) {
            errors.push(`Field ${key} expected ${expectedType}, got ${actualType}`);
        }
    }

    return errors.length > 0 ? { valid: false, errors } : { valid: true };
}

// ============================================
// LOGGING
// ============================================

export interface LogContext {
    feature: string;
    userId?: string;
    action?: string;
    inputHash?: string;
    [key: string]: unknown;
}

/**
 * Structured logger for AI operations
 */
export const aiLogger = {
    info: (message: string, context?: LogContext) => {
        functions.logger.info(`[AI] ${message}`, context);
    },

    warn: (message: string, context?: LogContext) => {
        functions.logger.warn(`[AI] ${message}`, context);
    },

    error: (message: string, error?: Error, context?: LogContext) => {
        functions.logger.error(`[AI] ${message}`, {
            ...context,
            error: error?.message,
            stack: error?.stack,
        });
    },

    debug: (message: string, data?: unknown) => {
        functions.logger.debug(`[AI] ${message}`, { data });
    },

    /**
     * Log AI call for auditing
     */
    logAICall: (params: {
        feature: string;
        userId?: string;
        inputHash: string;
        model: string;
        tokensUsed: number;
        latencyMs: number;
        cached: boolean;
        success: boolean;
        error?: string;
    }) => {
        functions.logger.info('[AI] API Call', {
            type: 'AI_CALL_LOG',
            timestamp: new Date().toISOString(),
            ...params,
        });
    },
};

// ============================================
// ERROR HANDLING
// ============================================

/**
 * Create a standardized AI error
 */
export function createAIError(
    code: 'INVALID_INPUT' | 'API_ERROR' | 'PARSE_ERROR' | 'VALIDATION_ERROR' | 'RATE_LIMIT' | 'CONFIG_ERROR',
    message: string,
    details?: unknown,
    retryable: boolean = false
): { code: string; message: string; details?: unknown; retryable: boolean } {
    return { code, message, details, retryable };
}

/**
 * Convert AI error to Firebase HttpsError
 */
export function toHttpsError(error: ReturnType<typeof createAIError>): functions.https.HttpsError {
    const codeMap: Record<string, functions.https.FunctionsErrorCode> = {
        INVALID_INPUT: 'invalid-argument',
        API_ERROR: 'internal',
        PARSE_ERROR: 'internal',
        VALIDATION_ERROR: 'invalid-argument',
        RATE_LIMIT: 'resource-exhausted',
        CONFIG_ERROR: 'failed-precondition',
    };

    return new functions.https.HttpsError(
        codeMap[error.code] || 'internal',
        error.message,
        error.details
    );
}

// ============================================
// COST ESTIMATION
// ============================================

/**
 * Estimate cost based on token usage
 * Prices are approximate for Gemini 2.0 Flash
 */
export function estimateCost(promptTokens: number, completionTokens: number): number {
    // Gemini 2.0 Flash pricing (approximate)
    const inputPricePerMillion = 0.075;  // $0.075 per 1M input tokens
    const outputPricePerMillion = 0.30;   // $0.30 per 1M output tokens

    const inputCost = (promptTokens / 1_000_000) * inputPricePerMillion;
    const outputCost = (completionTokens / 1_000_000) * outputPricePerMillion;

    return inputCost + outputCost;
}
