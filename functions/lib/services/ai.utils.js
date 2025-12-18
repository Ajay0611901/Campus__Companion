"use strict";
/**
 * AI Utilities
 *
 * Helper functions for JSON parsing, hashing, validation, and logging.
 * Used by the main AI service module.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiLogger = void 0;
exports.cleanAIResponse = cleanAIResponse;
exports.safeParseJSON = safeParseJSON;
exports.extractJSON = extractJSON;
exports.createInputHash = createInputHash;
exports.createCacheKey = createCacheKey;
exports.validateRequiredFields = validateRequiredFields;
exports.validateSchema = validateSchema;
exports.createAIError = createAIError;
exports.toHttpsError = toHttpsError;
exports.estimateCost = estimateCost;
const functions = __importStar(require("firebase-functions"));
const crypto = __importStar(require("crypto"));
// ============================================
// JSON CLEANING & PARSING
// ============================================
/**
 * Clean AI response text by removing markdown code blocks and extra whitespace
 */
function cleanAIResponse(text) {
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
function safeParseJSON(text) {
    // Strategy 1: Direct parse of cleaned text
    const cleaned = cleanAIResponse(text);
    try {
        const parsed = JSON.parse(cleaned);
        return { success: true, data: parsed };
    }
    catch (_a) {
        // Continue to fallback strategies
    }
    // Strategy 2: Find JSON object in the text
    const objectMatch = cleaned.match(/\{[\s\S]*\}/);
    if (objectMatch) {
        try {
            const parsed = JSON.parse(objectMatch[0]);
            return { success: true, data: parsed };
        }
        catch (_b) {
            // Continue to next strategy
        }
    }
    // Strategy 3: Find JSON array in the text
    const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
        try {
            const parsed = JSON.parse(arrayMatch[0]);
            return { success: true, data: parsed };
        }
        catch (_c) {
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
        const parsed = JSON.parse(fixed);
        return { success: true, data: parsed };
    }
    catch (_d) {
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
function extractJSON(text) {
    const result = safeParseJSON(text);
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
function createInputHash(input) {
    const normalized = JSON.stringify(input, Object.keys(input).sort());
    return crypto.createHash('sha256').update(normalized).digest('hex').substring(0, 16);
}
/**
 * Create a cache key combining type and input hash
 */
function createCacheKey(type, inputHash) {
    return `${type}:${inputHash}`;
}
// ============================================
// VALIDATION
// ============================================
/**
 * Validate that an object has all required fields
 */
function validateRequiredFields(data, requiredFields) {
    const missing = [];
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
function validateSchema(data, schema) {
    if (typeof data !== 'object' || data === null) {
        return { valid: false, errors: ['Data must be an object'] };
    }
    const errors = [];
    const obj = data;
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
/**
 * Structured logger for AI operations
 */
exports.aiLogger = {
    info: (message, context) => {
        functions.logger.info(`[AI] ${message}`, context);
    },
    warn: (message, context) => {
        functions.logger.warn(`[AI] ${message}`, context);
    },
    error: (message, error, context) => {
        functions.logger.error(`[AI] ${message}`, Object.assign(Object.assign({}, context), { error: error === null || error === void 0 ? void 0 : error.message, stack: error === null || error === void 0 ? void 0 : error.stack }));
    },
    debug: (message, data) => {
        functions.logger.debug(`[AI] ${message}`, { data });
    },
    /**
     * Log AI call for auditing
     */
    logAICall: (params) => {
        functions.logger.info('[AI] API Call', Object.assign({ type: 'AI_CALL_LOG', timestamp: new Date().toISOString() }, params));
    },
};
// ============================================
// ERROR HANDLING
// ============================================
/**
 * Create a standardized AI error
 */
function createAIError(code, message, details, retryable = false) {
    return { code, message, details, retryable };
}
/**
 * Convert AI error to Firebase HttpsError
 */
function toHttpsError(error) {
    const codeMap = {
        INVALID_INPUT: 'invalid-argument',
        API_ERROR: 'internal',
        PARSE_ERROR: 'internal',
        VALIDATION_ERROR: 'invalid-argument',
        RATE_LIMIT: 'resource-exhausted',
        CONFIG_ERROR: 'failed-precondition',
    };
    return new functions.https.HttpsError(codeMap[error.code] || 'internal', error.message, error.details);
}
// ============================================
// COST ESTIMATION
// ============================================
/**
 * Estimate cost based on token usage
 * Prices are approximate for Gemini 2.0 Flash
 */
function estimateCost(promptTokens, completionTokens) {
    // Gemini 2.0 Flash pricing (approximate)
    const inputPricePerMillion = 0.075; // $0.075 per 1M input tokens
    const outputPricePerMillion = 0.30; // $0.30 per 1M output tokens
    const inputCost = (promptTokens / 1000000) * inputPricePerMillion;
    const outputCost = (completionTokens / 1000000) * outputPricePerMillion;
    return inputCost + outputCost;
}
//# sourceMappingURL=ai.utils.js.map