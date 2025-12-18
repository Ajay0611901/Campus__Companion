/**
 * AI Service Configuration
 * 
 * Centralized configuration for the Gemini AI integration.
 * Modify these settings to tune AI behavior across all features.
 */

import * as functions from 'firebase-functions';

// ============================================
// API CONFIGURATION
// ============================================

/**
 * Get the Gemini API key from Firebase config
 * Priority: Firebase config > Environment variable > Development fallback
 * 
 * For production: firebase functions:config:set google.apikey="YOUR_KEY"
 * For local dev: Set GEMINI_API_KEY environment variable
 */
export function getApiKey(): string {
    // Try Firebase config first (production)
    try {
        const config = functions.config();
        if (config.google?.apikey) {
            return config.google.apikey;
        }
    } catch {
        // Config not available (local development without emulator)
    }

    // Fall back to environment variable (local development)
    if (process.env.GEMINI_API_KEY) {
        return process.env.GEMINI_API_KEY;
    }

    // Development fallback (REMOVE IN PRODUCTION)
    // TODO: Remove this before deploying
    const DEV_API_KEY = 'AIzaSyDtiUZwrs_QOPMQZrrjzimn00fnHNg9Z-0';
    if (DEV_API_KEY && process.env.NODE_ENV !== 'production') {
        console.warn('[AI Config] Using development API key fallback');
        return DEV_API_KEY;
    }

    throw new Error(
        'Gemini API key not configured. Set via: firebase functions:config:set google.apikey="YOUR_KEY"'
    );
}

// ============================================
// MODEL CONFIGURATION
// ============================================

export const AI_CONFIG = {
    // Model selection
    model: 'gemini-2.0-flash' as const,

    // Generation settings for JSON responses
    jsonGeneration: {
        temperature: 0.7,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 8192,
        responseMimeType: 'application/json' as const,
    },

    // Generation settings for text responses
    textGeneration: {
        temperature: 0.8,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 4096,
    },

    // Retry configuration
    retry: {
        maxAttempts: 3,
        baseDelayMs: 1000,
        maxDelayMs: 10000,
    },

    // Rate limiting
    rateLimit: {
        maxTokensPerDay: 100000,
        maxRequestsPerMinute: 60,
    },

    // Cache TTL (in milliseconds)
    cacheTTL: {
        resumeAnalysis: 24 * 60 * 60 * 1000,      // 24 hours
        skillRecommendation: 7 * 24 * 60 * 60 * 1000, // 7 days
        lectureSummary: 30 * 24 * 60 * 60 * 1000,    // 30 days
        interviewQuestions: 60 * 60 * 1000,          // 1 hour
        quiz: 30 * 24 * 60 * 60 * 1000,              // 30 days
        flashcards: 30 * 24 * 60 * 60 * 1000,        // 30 days
    },
} as const;

// ============================================
// TYPE DEFINITIONS
// ============================================

export type AIResultType =
    | 'resume_analysis'
    | 'skill_recommendation'
    | 'lecture_summary'
    | 'quiz'
    | 'flashcards'
    | 'interview_questions'
    | 'interview_evaluation'
    | 'chat_response';

export interface AICallOptions<T = unknown> {
    /** System instruction to guide AI behavior */
    systemInstruction?: string;

    /** Whether to enforce JSON output (default: true) */
    jsonMode?: boolean;

    /** Maximum retry attempts (default: 3) */
    maxRetries?: number;

    /** Custom temperature (0.0 - 1.0) */
    temperature?: number;

    /** Maximum output tokens */
    maxOutputTokens?: number;

    /** JSON schema for output validation */
    outputSchema?: Record<string, unknown>;

    /** Required fields that must exist in the response */
    requiredFields?: (keyof T)[];

    /** Context for logging */
    context?: {
        feature: string;
        userId?: string;
        action?: string;
    };
}

export interface AIResponse<T> {
    /** The parsed AI result */
    result: T;

    /** Token usage for cost tracking */
    usage: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };

    /** Response metadata */
    metadata: {
        model: string;
        cached: boolean;
        latencyMs: number;
        retryCount: number;
    };
}

export interface AIError {
    code: 'INVALID_INPUT' | 'API_ERROR' | 'PARSE_ERROR' | 'VALIDATION_ERROR' | 'RATE_LIMIT' | 'CONFIG_ERROR';
    message: string;
    details?: unknown;
    retryable: boolean;
}
