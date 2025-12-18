"use strict";
/**
 * Resume Analyzer Handler - Production Ready
 *
 * Cloud Function for AI-powered resume analysis with:
 * - Semantic understanding (not keyword matching)
 * - ATS compatibility scoring
 * - Strength/weakness identification
 * - Actionable improvement suggestions
 * - Firestore caching and history
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
exports.analyzeResume = void 0;
exports.validateResumeInput = validateResumeInput;
exports.validateSimpleResponse = validateSimpleResponse;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const ai_service_1 = require("../services/ai.service");
const resume_prompts_1 = require("../prompts/resume.prompts");
const rateLimit_service_1 = require("../services/rateLimit.service");
// ============================================
// INPUT VALIDATION
// ============================================
function validateResumeInput(data) {
    if (!data || typeof data !== 'object') {
        throw new functions.https.HttpsError('invalid-argument', 'Request body must be an object');
    }
    const req = data;
    // Validate resumeText
    if (typeof req.resumeText !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', 'resumeText must be a string');
    }
    const resumeText = req.resumeText.trim();
    if (resumeText.length < 100) {
        throw new functions.https.HttpsError('invalid-argument', 'Resume text must be at least 100 characters. Please provide more content.');
    }
    if (resumeText.length > 50000) {
        throw new functions.https.HttpsError('invalid-argument', 'Resume text exceeds maximum length of 50,000 characters.');
    }
    // Validate targetRole
    if (typeof req.targetRole !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', 'targetRole must be a string');
    }
    const targetRole = req.targetRole.trim();
    if (targetRole.length < 2) {
        throw new functions.https.HttpsError('invalid-argument', 'Target role must be specified');
    }
    if (targetRole.length > 100) {
        throw new functions.https.HttpsError('invalid-argument', 'Target role exceeds maximum length of 100 characters');
    }
    // Validate mode (optional)
    const mode = req.mode === 'detailed' ? 'detailed' : 'simple';
    return { resumeText, targetRole, mode };
}
// ============================================
// RESPONSE VALIDATION
// ============================================
function validateSimpleResponse(data) {
    const response = data;
    // Validate score
    if (typeof response.score !== 'number' || response.score < 0 || response.score > 100) {
        throw new Error('Invalid score: must be 0-100');
    }
    // Validate arrays
    if (!Array.isArray(response.strengths) || response.strengths.length < 1) {
        throw new Error('strengths must be a non-empty array');
    }
    if (!Array.isArray(response.missingSkills) || response.missingSkills.length < 1) {
        throw new Error('missingSkills must be a non-empty array');
    }
    if (!Array.isArray(response.suggestions) || response.suggestions.length < 1) {
        throw new Error('suggestions must be a non-empty array');
    }
    // Ensure score is an integer
    response.score = Math.round(response.score);
    return response;
}
// ============================================
// FIRESTORE INTEGRATION
// ============================================
// Initialize Firestore (with lazy initialization check)
let db;
function getDb() {
    if (!db) {
        if (!admin.apps.length) {
            admin.initializeApp();
        }
        db = admin.firestore();
    }
    return db;
}
/**
 * Check cache for existing analysis
 */
async function checkCache(inputHash, mode) {
    const db = getDb();
    const cachedResult = await db
        .collection('aiResults')
        .where('inputHash', '==', inputHash)
        .where('type', '==', `resume_analysis_${mode}`)
        .where('expiresAt', '>', new Date())
        .limit(1)
        .get();
    if (!cachedResult.empty) {
        const cached = cachedResult.docs[0].data();
        return cached.response;
    }
    return null;
}
/**
 * Save analysis result to cache
 */
async function saveToCache(userId, inputHash, mode, analysis, tokensUsed, latencyMs) {
    const db = getDb();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ai_service_1.AI_CONFIG.cacheTTL.resumeAnalysis);
    await db.collection('aiResults').add({
        userId,
        type: `resume_analysis_${mode}`,
        inputHash,
        response: analysis,
        model: ai_service_1.AI_CONFIG.model,
        tokensUsed,
        latencyMs,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        expiresAt,
    });
}
/**
 * Save resume analysis to user's history
 */
async function saveToHistory(userId, resumeText, targetRole, mode, analysis, inputHash, tokensUsed, latencyMs) {
    const db = getDb();
    const doc = {
        userId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        resumeText,
        targetRole,
        mode,
        analysis,
        inputHash,
        model: ai_service_1.AI_CONFIG.model,
        tokensUsed,
        latencyMs,
        version: 1,
    };
    const docRef = await db.collection('resumes').add(doc);
    // Update user's resume score in their profile
    await db.collection('users').doc(userId).set({
        'stats.resumeScore': analysis.score,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    return docRef.id;
}
// ============================================
// MAIN CLOUD FUNCTION
// ============================================
/**
 * analyzeResume - Cloud Function for AI Resume Analysis
 *
 * Input:
 * - resumeText: string (plain text resume content)
 * - targetRole: string (target career role)
 * - mode?: 'simple' | 'detailed' (output detail level)
 *
 * Output:
 * - success: boolean
 * - analysis: SimpleResumeAnalysis | DetailedResumeAnalysis
 * - cached: boolean
 * - resumeId: string (for history tracking)
 */
exports.analyzeResume = functions
    .runWith({
    timeoutSeconds: 60,
    memory: '512MB',
})
    .https.onCall(async (request) => {
    var _a;
    const startTime = Date.now();
    // 1. Validate input
    const { resumeText, targetRole, mode = 'simple' } = validateResumeInput(request.data);
    const userId = ((_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid) || 'anonymous';
    // 2. Rate limiting - PREVENT COST EXPLOSION
    await (0, rateLimit_service_1.checkRateLimit)(userId, 'resume_analyzer');
    ai_service_1.aiLogger.info('Resume analysis started', {
        feature: 'resume_analyzer',
        userId,
        action: 'analyze_start',
    });
    // 2. Create input hash for caching
    const inputHash = (0, ai_service_1.createInputHash)({
        resumeText: resumeText.substring(0, 500), // Hash first 500 chars
        targetRole,
        mode
    });
    // 3. Check cache
    try {
        const cached = await checkCache(inputHash, mode);
        if (cached) {
            ai_service_1.aiLogger.info('Cache hit', {
                feature: 'resume_analyzer',
                userId,
                inputHash,
                action: 'cache_hit',
            });
            return {
                success: true,
                analysis: cached,
                cached: true,
                resumeId: null,
            };
        }
    }
    catch (cacheError) {
        ai_service_1.aiLogger.warn('Cache check failed, proceeding with AI call', {
            feature: 'resume_analyzer',
            error: cacheError.message,
        });
    }
    // 4. Build prompt based on mode
    const promptTemplate = mode === 'detailed'
        ? resume_prompts_1.RESUME_ANALYSIS_PROMPT
        : resume_prompts_1.RESUME_ANALYSIS_SIMPLE_PROMPT;
    const prompt = promptTemplate
        .replace('{{resumeText}}', resumeText)
        .replace('{{targetRole}}', targetRole);
    // 5. Call AI service
    let analysis;
    let tokensUsed;
    try {
        const response = await ai_service_1.aiService.generate(prompt, {
            systemInstruction: resume_prompts_1.RESUME_ANALYZER_SYSTEM,
            requiredFields: ['score', 'strengths', 'missingSkills', 'suggestions'],
            context: {
                feature: 'resume_analyzer',
                userId,
                action: 'analyze',
            },
        });
        analysis = response.result;
        tokensUsed = response.usage.totalTokens;
        // Validate response structure
        if (mode === 'simple') {
            analysis = validateSimpleResponse(analysis);
        }
    }
    catch (aiError) {
        ai_service_1.aiLogger.error('AI call failed', aiError, {
            feature: 'resume_analyzer',
            userId,
        });
        throw aiError; // Re-throw - it's already an HttpsError
    }
    const latencyMs = Date.now() - startTime;
    // 6. Save to cache and history
    let resumeId = null;
    try {
        await saveToCache(userId, inputHash, mode, analysis, tokensUsed, latencyMs);
        if (userId !== 'anonymous') {
            resumeId = await saveToHistory(userId, resumeText, targetRole, mode, analysis, inputHash, tokensUsed, latencyMs);
        }
    }
    catch (saveError) {
        ai_service_1.aiLogger.warn('Save to Firestore failed', {
            feature: 'resume_analyzer',
            error: saveError.message,
        });
        // Don't throw - analysis was successful
    }
    ai_service_1.aiLogger.info('Resume analysis completed', {
        feature: 'resume_analyzer',
        userId,
        inputHash,
        score: analysis.score,
        latencyMs,
        tokensUsed,
        action: 'analyze_complete',
    });
    // 7. Return result
    return {
        success: true,
        analysis,
        cached: false,
        resumeId,
        metadata: {
            tokensUsed,
            latencyMs,
            model: ai_service_1.AI_CONFIG.model,
        },
    };
});
//# sourceMappingURL=resume.handler.js.map