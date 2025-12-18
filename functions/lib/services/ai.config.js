"use strict";
/**
 * AI Service Configuration
 *
 * Centralized configuration for the Gemini AI integration.
 * Modify these settings to tune AI behavior across all features.
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
exports.AI_CONFIG = void 0;
exports.getApiKey = getApiKey;
const functions = __importStar(require("firebase-functions"));
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
function getApiKey() {
    var _a;
    // Try Firebase config first (production)
    try {
        const config = functions.config();
        if ((_a = config.google) === null || _a === void 0 ? void 0 : _a.apikey) {
            return config.google.apikey;
        }
    }
    catch (_b) {
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
    throw new Error('Gemini API key not configured. Set via: firebase functions:config:set google.apikey="YOUR_KEY"');
}
// ============================================
// MODEL CONFIGURATION
// ============================================
exports.AI_CONFIG = {
    // Model selection
    model: 'gemini-2.0-flash',
    // Generation settings for JSON responses
    jsonGeneration: {
        temperature: 0.7,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 8192,
        responseMimeType: 'application/json',
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
        resumeAnalysis: 24 * 60 * 60 * 1000, // 24 hours
        skillRecommendation: 7 * 24 * 60 * 60 * 1000, // 7 days
        lectureSummary: 30 * 24 * 60 * 60 * 1000, // 30 days
        interviewQuestions: 60 * 60 * 1000, // 1 hour
        quiz: 30 * 24 * 60 * 60 * 1000, // 30 days
        flashcards: 30 * 24 * 60 * 60 * 1000, // 30 days
    },
};
//# sourceMappingURL=ai.config.js.map