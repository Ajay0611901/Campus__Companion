"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.MODEL_NAME = exports.getApiKey = exports.AI_CONFIG = exports.toHttpsError = exports.createAIError = exports.aiLogger = exports.createInputHash = exports.AIService = exports.aiService = exports.extractJSON = void 0;
exports.callGemini = callGemini;
exports.buildPrompt = buildPrompt;
const generative_ai_1 = require("@google/generative-ai");
const ai_config_1 = require("./ai.config");
const ai_utils_1 = require("./ai.utils");
Object.defineProperty(exports, "extractJSON", { enumerable: true, get: function () { return ai_utils_1.extractJSON; } });
// ============================================
// SINGLETON CLIENT
// ============================================
let geminiClient = null;
let jsonModel = null;
let textModel = null;
/**
 * Initialize the Gemini client (singleton pattern)
 * Called once on first use, then reused for all subsequent calls
 */
function getGeminiClient() {
    if (!geminiClient) {
        const apiKey = (0, ai_config_1.getApiKey)();
        geminiClient = new generative_ai_1.GoogleGenerativeAI(apiKey);
        ai_utils_1.aiLogger.info('Gemini client initialized', { feature: 'system', action: 'init' });
    }
    return geminiClient;
}
/**
 * Get the appropriate model based on output mode
 */
function getModel(jsonMode, customConfig) {
    const client = getGeminiClient();
    const baseConfig = jsonMode ? ai_config_1.AI_CONFIG.jsonGeneration : ai_config_1.AI_CONFIG.textGeneration;
    const config = Object.assign(Object.assign({}, baseConfig), customConfig);
    // For JSON mode, always use cached model unless custom config provided
    if (jsonMode && !customConfig) {
        if (!jsonModel) {
            jsonModel = client.getGenerativeModel({
                model: ai_config_1.AI_CONFIG.model,
                generationConfig: config,
            });
        }
        return jsonModel;
    }
    // For text mode or custom config, create new model
    if (!jsonMode && !customConfig) {
        if (!textModel) {
            textModel = client.getGenerativeModel({
                model: ai_config_1.AI_CONFIG.model,
                generationConfig: config,
            });
        }
        return textModel;
    }
    // Custom config requires fresh model
    return client.getGenerativeModel({
        model: ai_config_1.AI_CONFIG.model,
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
    async generate(prompt, options = {}) {
        var _a, _b, _c;
        const { systemInstruction, jsonMode = true, maxRetries = ai_config_1.AI_CONFIG.retry.maxAttempts, temperature, maxOutputTokens, requiredFields, context = { feature: 'unknown' }, } = options;
        const startTime = Date.now();
        const inputHash = (0, ai_utils_1.createInputHash)({ prompt: prompt.substring(0, 100), systemInstruction });
        ai_utils_1.aiLogger.info('Starting AI call', Object.assign(Object.assign({}, context), { inputHash, action: 'generate_start' }));
        // Build custom config if provided
        const customConfig = (temperature !== undefined || maxOutputTokens !== undefined)
            ? { temperature, maxOutputTokens }
            : undefined;
        const model = getModel(jsonMode, customConfig);
        let lastError = null;
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
                    promptTokens: ((_a = response.usageMetadata) === null || _a === void 0 ? void 0 : _a.promptTokenCount) || 0,
                    completionTokens: ((_b = response.usageMetadata) === null || _b === void 0 ? void 0 : _b.candidatesTokenCount) || 0,
                    totalTokens: ((_c = response.usageMetadata) === null || _c === void 0 ? void 0 : _c.totalTokenCount) || 0,
                };
                // Parse response
                let parsed;
                if (jsonMode) {
                    parsed = (0, ai_utils_1.extractJSON)(text);
                }
                else {
                    parsed = text;
                }
                // Validate required fields if specified
                if (requiredFields && typeof parsed === 'object' && parsed !== null) {
                    const validation = (0, ai_utils_1.validateRequiredFields)(parsed, requiredFields);
                    if (!validation.valid) {
                        throw new Error(`Missing required fields: ${validation.missing.join(', ')}`);
                    }
                }
                const latencyMs = Date.now() - startTime;
                // Log successful call
                ai_utils_1.aiLogger.logAICall({
                    feature: context.feature,
                    userId: context.userId,
                    inputHash,
                    model: ai_config_1.AI_CONFIG.model,
                    tokensUsed: usage.totalTokens,
                    latencyMs,
                    cached: false,
                    success: true,
                });
                return {
                    result: parsed,
                    usage,
                    metadata: {
                        model: ai_config_1.AI_CONFIG.model,
                        cached: false,
                        latencyMs,
                        retryCount,
                    },
                };
            }
            catch (error) {
                lastError = error;
                retryCount = attempt + 1;
                ai_utils_1.aiLogger.warn(`AI call attempt ${attempt + 1} failed`, Object.assign(Object.assign({}, context), { inputHash, error: lastError.message }));
                // Exponential backoff
                if (attempt < maxRetries - 1) {
                    const delay = Math.min(ai_config_1.AI_CONFIG.retry.baseDelayMs * Math.pow(2, attempt), ai_config_1.AI_CONFIG.retry.maxDelayMs);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
        // All retries exhausted
        const latencyMs = Date.now() - startTime;
        ai_utils_1.aiLogger.logAICall({
            feature: context.feature,
            userId: context.userId,
            inputHash,
            model: ai_config_1.AI_CONFIG.model,
            tokensUsed: 0,
            latencyMs,
            cached: false,
            success: false,
            error: lastError === null || lastError === void 0 ? void 0 : lastError.message,
        });
        const aiError = (0, ai_utils_1.createAIError)('API_ERROR', `AI service failed after ${maxRetries} attempts: ${lastError === null || lastError === void 0 ? void 0 : lastError.message}`, { originalError: lastError === null || lastError === void 0 ? void 0 : lastError.message }, false);
        throw (0, ai_utils_1.toHttpsError)(aiError);
    }
    /**
     * Generate with a custom prompt builder pattern
     *
     * @param template - Prompt template with {{variable}} placeholders
     * @param variables - Key-value pairs to replace in template
     * @param options - AI call options
     */
    async generateFromTemplate(template, variables, options = {}) {
        // Replace template variables
        let prompt = template;
        for (const [key, value] of Object.entries(variables)) {
            prompt = prompt.replace(new RegExp(`{{${key}}}`, 'g'), value);
        }
        return this.generate(prompt, options);
    }
    /**
     * Check if the AI service is properly configured
     */
    isConfigured() {
        try {
            (0, ai_config_1.getApiKey)();
            return true;
        }
        catch (_a) {
            return false;
        }
    }
    /**
     * Get current model name
     */
    getModelName() {
        return ai_config_1.AI_CONFIG.model;
    }
    /**
     * Create an input hash for caching
     */
    createHash(input) {
        return (0, ai_utils_1.createInputHash)(input);
    }
}
exports.AIService = AIService;
// ============================================
// SINGLETON EXPORT
// ============================================
/**
 * Singleton instance of the AI service
 * Use this throughout the application for all AI operations
 */
exports.aiService = new AIService();
// Re-export utilities for convenience
var ai_utils_2 = require("./ai.utils");
Object.defineProperty(exports, "createInputHash", { enumerable: true, get: function () { return ai_utils_2.createInputHash; } });
Object.defineProperty(exports, "aiLogger", { enumerable: true, get: function () { return ai_utils_2.aiLogger; } });
Object.defineProperty(exports, "createAIError", { enumerable: true, get: function () { return ai_utils_2.createAIError; } });
Object.defineProperty(exports, "toHttpsError", { enumerable: true, get: function () { return ai_utils_2.toHttpsError; } });
var ai_config_2 = require("./ai.config");
Object.defineProperty(exports, "AI_CONFIG", { enumerable: true, get: function () { return ai_config_2.AI_CONFIG; } });
Object.defineProperty(exports, "getApiKey", { enumerable: true, get: function () { return ai_config_2.getApiKey; } });
// ============================================
// BACKWARD COMPATIBILITY EXPORTS
// ============================================
// These maintain compatibility with existing handlers
/**
 * @deprecated Use aiService.generate() instead
 * Legacy function for backward compatibility with existing handlers
 */
async function callGemini(prompt, options = {}) {
    const response = await exports.aiService.generate(prompt, {
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
function buildPrompt(template, variables) {
    let prompt = template;
    for (const [key, value] of Object.entries(variables)) {
        prompt = prompt.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }
    return prompt;
}
/**
 * @deprecated Use AI_CONFIG.model instead
 */
exports.MODEL_NAME = ai_config_1.AI_CONFIG.model;
//# sourceMappingURL=ai.service.js.map