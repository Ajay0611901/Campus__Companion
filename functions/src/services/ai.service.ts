/**
 * AI Service - Production-Grade Gemini Integration
 * 
 * Centralized, reusable AI service module for all AI features.
 * 
 * Features:
 * - Singleton pattern (single Gemini client initialization)
 * - Strict JSON-only responses with automatic cleaning
 * - Safe JSON parsing with multiple fallback strategies
 * - Centralized error handling and logging
 * - Exponential backoff retry logic
 * - Cost tracking and auditing
 * 
 * Usage:
 *   import { aiService } from './services/ai.service';
 *   
 *   const response = await aiService.generate<MyResponseType>(prompt, {
 *     systemInstruction: 'You are a helpful assistant',
 *     context: { feature: 'resume_analyzer', userId: 'user123' }
 *   });
 */

import { GoogleGenerativeAI, GenerativeModel, GenerationConfig } from '@google/generative-ai';
import { getApiKey, AI_CONFIG, AICallOptions, AIResponse } from './ai.config';
import {
    extractJSON,
    validateRequiredFields,
    aiLogger,
    createAIError,
    toHttpsError,
    createInputHash
} from './ai.utils';

// Re-export extractJSON for backward compatibility
export { extractJSON };

// ============================================
// SINGLETON CLIENT
// ============================================

let geminiClient: GoogleGenerativeAI | null = null;
let jsonModel: GenerativeModel | null = null;
let textModel: GenerativeModel | null = null;

/**
 * Initialize the Gemini client (singleton pattern)
 * Called once on first use, then reused for all subsequent calls
 */
function getGeminiClient(): GoogleGenerativeAI {
    if (!geminiClient) {
        const apiKey = getApiKey();
        geminiClient = new GoogleGenerativeAI(apiKey);
        aiLogger.info('Gemini client initialized', { feature: 'system', action: 'init' });
    }
    return geminiClient;
}

/**
 * Get the appropriate model based on output mode
 */
function getModel(jsonMode: boolean, customConfig?: Partial<GenerationConfig>): GenerativeModel {
    const client = getGeminiClient();

    const baseConfig = jsonMode ? AI_CONFIG.jsonGeneration : AI_CONFIG.textGeneration;
    const config: GenerationConfig = { ...baseConfig, ...customConfig };

    // For JSON mode, always use cached model unless custom config provided
    if (jsonMode && !customConfig) {
        if (!jsonModel) {
            jsonModel = client.getGenerativeModel({
                model: AI_CONFIG.model,
                generationConfig: config,
            });
        }
        return jsonModel;
    }

    // For text mode or custom config, create new model
    if (!jsonMode && !customConfig) {
        if (!textModel) {
            textModel = client.getGenerativeModel({
                model: AI_CONFIG.model,
                generationConfig: config,
            });
        }
        return textModel;
    }

    // Custom config requires fresh model
    return client.getGenerativeModel({
        model: AI_CONFIG.model,
        generationConfig: config,
    });
}

// ============================================
// MAIN AI SERVICE
// ============================================

/**
 * Main AI Service class providing a clean interface for AI operations
 */
class AIService {
    /**
     * Generate a response from the AI
     * 
     * @param prompt - The prompt to send to the AI
     * @param options - Configuration options
     * @returns Parsed response with metadata
     * 
     * @example
     * const response = await aiService.generate<{ score: number; feedback: string }>(
     *   'Analyze this resume...',
     *   {
     *     systemInstruction: 'You are an ATS system',
     *     requiredFields: ['score', 'feedback'],
     *     context: { feature: 'resume_analyzer' }
     *   }
     * );
     */
    async generate<T>(
        prompt: string,
        options: AICallOptions<T> = {}
    ): Promise<AIResponse<T>> {
        const {
            systemInstruction,
            jsonMode = true,
            maxRetries = AI_CONFIG.retry.maxAttempts,
            temperature,
            maxOutputTokens,
            requiredFields,
            context = { feature: 'unknown' },
        } = options;

        const startTime = Date.now();
        const inputHash = createInputHash({ prompt: prompt.substring(0, 100), systemInstruction });

        aiLogger.info('Starting AI call', {
            ...context,
            inputHash,
            action: 'generate_start',
        });

        // Build custom config if provided
        const customConfig: Partial<GenerationConfig> | undefined =
            (temperature !== undefined || maxOutputTokens !== undefined)
                ? { temperature, maxOutputTokens }
                : undefined;

        const model = getModel(jsonMode, customConfig);

        let lastError: Error | null = null;
        let retryCount = 0;

        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                // Build the full prompt with system instruction
                const fullPrompt = systemInstruction
                    ? `${systemInstruction}\n\n---\n\n${prompt}`
                    : prompt;

                // Generate content
                const result = await model.generateContent(fullPrompt);
                const response = result.response;
                const text = response.text();

                // Extract token usage
                const usage = {
                    promptTokens: response.usageMetadata?.promptTokenCount || 0,
                    completionTokens: response.usageMetadata?.candidatesTokenCount || 0,
                    totalTokens: response.usageMetadata?.totalTokenCount || 0,
                };

                // Parse response
                let parsed: T;
                if (jsonMode) {
                    parsed = extractJSON<T>(text);
                } else {
                    parsed = text as unknown as T;
                }

                // Validate required fields if specified
                if (requiredFields && typeof parsed === 'object' && parsed !== null) {
                    const validation = validateRequiredFields(parsed as object, requiredFields as (keyof object)[]);
                    if (!validation.valid) {
                        throw new Error(`Missing required fields: ${(validation as { missing: string[] }).missing.join(', ')}`);
                    }
                }

                const latencyMs = Date.now() - startTime;

                // Log successful call
                aiLogger.logAICall({
                    feature: context.feature,
                    userId: context.userId,
                    inputHash,
                    model: AI_CONFIG.model,
                    tokensUsed: usage.totalTokens,
                    latencyMs,
                    cached: false,
                    success: true,
                });

                return {
                    result: parsed,
                    usage,
                    metadata: {
                        model: AI_CONFIG.model,
                        cached: false,
                        latencyMs,
                        retryCount,
                    },
                };

            } catch (error) {
                lastError = error as Error;
                retryCount = attempt + 1;

                aiLogger.warn(`AI call attempt ${attempt + 1} failed`, {
                    ...context,
                    inputHash,
                    error: lastError.message,
                });

                // Exponential backoff
                if (attempt < maxRetries - 1) {
                    const delay = Math.min(
                        AI_CONFIG.retry.baseDelayMs * Math.pow(2, attempt),
                        AI_CONFIG.retry.maxDelayMs
                    );
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }

        // All retries exhausted
        const latencyMs = Date.now() - startTime;

        aiLogger.logAICall({
            feature: context.feature,
            userId: context.userId,
            inputHash,
            model: AI_CONFIG.model,
            tokensUsed: 0,
            latencyMs,
            cached: false,
            success: false,
            error: lastError?.message,
        });

        const aiError = createAIError(
            'API_ERROR',
            `AI service failed after ${maxRetries} attempts: ${lastError?.message}`,
            { originalError: lastError?.message },
            false
        );

        throw toHttpsError(aiError);
    }

    /**
     * Generate with a custom prompt builder pattern
     * 
     * @param template - Prompt template with {{variable}} placeholders
     * @param variables - Key-value pairs to replace in template
     * @param options - AI call options
     */
    async generateFromTemplate<T>(
        template: string,
        variables: Record<string, string>,
        options: AICallOptions<T> = {}
    ): Promise<AIResponse<T>> {
        // Replace template variables
        let prompt = template;
        for (const [key, value] of Object.entries(variables)) {
            prompt = prompt.replace(new RegExp(`{{${key}}}`, 'g'), value);
        }

        return this.generate<T>(prompt, options);
    }

    /**
     * Check if the AI service is properly configured
     */
    isConfigured(): boolean {
        try {
            getApiKey();
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Get current model name
     */
    getModelName(): string {
        return AI_CONFIG.model;
    }

    /**
     * Create an input hash for caching
     */
    createHash(input: unknown): string {
        return createInputHash(input);
    }
}

// ============================================
// SINGLETON EXPORT
// ============================================

/**
 * Singleton instance of the AI service
 * Use this throughout the application for all AI operations
 */
export const aiService = new AIService();

// Also export class for testing
export { AIService };

// Re-export utilities for convenience
export { createInputHash, aiLogger, createAIError, toHttpsError } from './ai.utils';
export { AI_CONFIG, getApiKey } from './ai.config';
export type { AICallOptions, AIResponse, AIResultType } from './ai.config';

// ============================================
// BACKWARD COMPATIBILITY EXPORTS
// ============================================
// These maintain compatibility with existing handlers

/**
 * @deprecated Use aiService.generate() instead
 * Legacy function for backward compatibility with existing handlers
 */
export async function callGemini<T>(
    prompt: string,
    options: {
        jsonMode?: boolean;
        maxRetries?: number;
        systemInstruction?: string;
    } = {}
): Promise<{ result: T; tokensUsed: number }> {
    const response = await aiService.generate<T>(prompt, {
        jsonMode: options.jsonMode,
        maxRetries: options.maxRetries,
        systemInstruction: options.systemInstruction,
    });

    return {
        result: response.result,
        tokensUsed: response.usage.totalTokens,
    };
}

/**
 * @deprecated Use aiService.generateFromTemplate() instead
 * Legacy function for backward compatibility
 */
export function buildPrompt(template: string, variables: Record<string, string>): string {
    let prompt = template;
    for (const [key, value] of Object.entries(variables)) {
        prompt = prompt.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }
    return prompt;
}

/**
 * @deprecated Use AI_CONFIG.model instead
 */
export const MODEL_NAME = AI_CONFIG.model;
