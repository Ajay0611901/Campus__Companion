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

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import {
    aiService,
    createInputHash,
    AI_CONFIG,
    aiLogger
} from '../services/ai.service';
import {
    RESUME_ANALYZER_SYSTEM,
    RESUME_ANALYSIS_SIMPLE_PROMPT,
    RESUME_ANALYSIS_PROMPT
} from '../prompts/resume.prompts';
import { checkRateLimit } from '../services/rateLimit.service';

// ============================================
// TYPES
// ============================================

/**
 * Request structure from frontend
 */
interface AnalyzeResumeRequest {
    resumeText: string;
    targetRole: string;
    mode?: 'simple' | 'detailed';
}

/**
 * Simple response format (user's exact requirement)
 */
interface SimpleResumeAnalysis {
    score: number;
    strengths: string[];
    missingSkills: string[];
    suggestions: string[];
}

/**
 * Detailed response format (full analysis)
 */
interface DetailedResumeAnalysis {
    score: number;
    scoreBreakdown: {
        atsCompatibility: number;
        contentQuality: number;
        roleAlignment: number;
        impactEvidence: number;
    };
    summary: string;
    strengths: string[];
    missingSkills: Array<{
        skill: string;
        importance: 'critical' | 'important' | 'nice-to-have';
        reason: string;
    }>;
    suggestions: Array<{
        priority: 'high' | 'medium' | 'low';
        category: 'content' | 'format' | 'keywords' | 'experience' | 'skills';
        issue: string;
        action: string;
        example?: string;
    }>;
    keywordAnalysis: {
        found: string[];
        missing: string[];
        density: number;
    };
    careerInsight: {
        roleMatch: number;
        alternativeRoles: string[];
        growthPath: string;
    };
}

/**
 * Firestore document structure for resume analysis
 */
interface ResumeAnalysisDocument {
    // Metadata
    userId: string;
    createdAt: admin.firestore.FieldValue;
    updatedAt: admin.firestore.FieldValue;

    // Input
    resumeText: string;
    targetRole: string;
    mode: 'simple' | 'detailed';

    // Analysis result
    analysis: SimpleResumeAnalysis | DetailedResumeAnalysis;

    // AI metadata
    inputHash: string;
    model: string;
    tokensUsed: number;
    latencyMs: number;

    // Versioning for future updates
    version: number;
}

// ============================================
// INPUT VALIDATION
// ============================================

function validateResumeInput(data: unknown): AnalyzeResumeRequest {
    if (!data || typeof data !== 'object') {
        throw new functions.https.HttpsError(
            'invalid-argument',
            'Request body must be an object'
        );
    }

    const req = data as Record<string, unknown>;

    // Validate resumeText
    if (typeof req.resumeText !== 'string') {
        throw new functions.https.HttpsError(
            'invalid-argument',
            'resumeText must be a string'
        );
    }

    const resumeText = req.resumeText.trim();

    if (resumeText.length < 100) {
        throw new functions.https.HttpsError(
            'invalid-argument',
            'Resume text must be at least 100 characters. Please provide more content.'
        );
    }

    if (resumeText.length > 50000) {
        throw new functions.https.HttpsError(
            'invalid-argument',
            'Resume text exceeds maximum length of 50,000 characters.'
        );
    }

    // Validate targetRole
    if (typeof req.targetRole !== 'string') {
        throw new functions.https.HttpsError(
            'invalid-argument',
            'targetRole must be a string'
        );
    }

    const targetRole = req.targetRole.trim();

    if (targetRole.length < 2) {
        throw new functions.https.HttpsError(
            'invalid-argument',
            'Target role must be specified'
        );
    }

    if (targetRole.length > 100) {
        throw new functions.https.HttpsError(
            'invalid-argument',
            'Target role exceeds maximum length of 100 characters'
        );
    }

    // Validate mode (optional)
    const mode = req.mode === 'detailed' ? 'detailed' : 'simple';

    return { resumeText, targetRole, mode };
}

// ============================================
// RESPONSE VALIDATION
// ============================================

function validateSimpleResponse(data: unknown): SimpleResumeAnalysis {
    const response = data as SimpleResumeAnalysis;

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
let db: admin.firestore.Firestore;

function getDb(): admin.firestore.Firestore {
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
async function checkCache(
    inputHash: string,
    mode: 'simple' | 'detailed'
): Promise<SimpleResumeAnalysis | DetailedResumeAnalysis | null> {
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
        return cached.response as SimpleResumeAnalysis | DetailedResumeAnalysis;
    }

    return null;
}

/**
 * Save analysis result to cache
 */
async function saveToCache(
    userId: string,
    inputHash: string,
    mode: 'simple' | 'detailed',
    analysis: SimpleResumeAnalysis | DetailedResumeAnalysis,
    tokensUsed: number,
    latencyMs: number
): Promise<void> {
    const db = getDb();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + AI_CONFIG.cacheTTL.resumeAnalysis);

    await db.collection('aiResults').add({
        userId,
        type: `resume_analysis_${mode}`,
        inputHash,
        response: analysis,
        model: AI_CONFIG.model,
        tokensUsed,
        latencyMs,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        expiresAt,
    });
}

/**
 * Save resume analysis to user's history
 */
async function saveToHistory(
    userId: string,
    resumeText: string,
    targetRole: string,
    mode: 'simple' | 'detailed',
    analysis: SimpleResumeAnalysis | DetailedResumeAnalysis,
    inputHash: string,
    tokensUsed: number,
    latencyMs: number
): Promise<string> {
    const db = getDb();

    const doc: ResumeAnalysisDocument = {
        userId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        resumeText,
        targetRole,
        mode,
        analysis,
        inputHash,
        model: AI_CONFIG.model,
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
export const analyzeResume = functions
    .runWith({
        timeoutSeconds: 60,
        memory: '512MB',
    })
    .https.onCall(async (request) => {
        const startTime = Date.now();

        // 1. Validate input
        const { resumeText, targetRole, mode = 'simple' } = validateResumeInput(request.data);
        const userId = request.auth?.uid || 'anonymous';

        // 2. Rate limiting - PREVENT COST EXPLOSION
        await checkRateLimit(userId, 'resume_analyzer');

        aiLogger.info('Resume analysis started', {
            feature: 'resume_analyzer',
            userId,
            action: 'analyze_start',
        });

        // 2. Create input hash for caching
        const inputHash = createInputHash({
            resumeText: resumeText.substring(0, 500), // Hash first 500 chars
            targetRole,
            mode
        });

        // 3. Check cache
        try {
            const cached = await checkCache(inputHash, mode);
            if (cached) {
                aiLogger.info('Cache hit', {
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
        } catch (cacheError) {
            aiLogger.warn('Cache check failed, proceeding with AI call', {
                feature: 'resume_analyzer',
                error: (cacheError as Error).message,
            });
        }

        // 4. Build prompt based on mode
        const promptTemplate = mode === 'detailed'
            ? RESUME_ANALYSIS_PROMPT
            : RESUME_ANALYSIS_SIMPLE_PROMPT;

        const prompt = promptTemplate
            .replace('{{resumeText}}', resumeText)
            .replace('{{targetRole}}', targetRole);

        // 5. Call AI service
        let analysis: SimpleResumeAnalysis | DetailedResumeAnalysis;
        let tokensUsed: number;

        try {
            const response = await aiService.generate<SimpleResumeAnalysis | DetailedResumeAnalysis>(
                prompt,
                {
                    systemInstruction: RESUME_ANALYZER_SYSTEM,
                    requiredFields: ['score', 'strengths', 'missingSkills', 'suggestions'],
                    context: {
                        feature: 'resume_analyzer',
                        userId,
                        action: 'analyze',
                    },
                }
            );

            analysis = response.result;
            tokensUsed = response.usage.totalTokens;

            // Validate response structure
            if (mode === 'simple') {
                analysis = validateSimpleResponse(analysis);
            }

        } catch (aiError) {
            aiLogger.error('AI call failed', aiError as Error, {
                feature: 'resume_analyzer',
                userId,
            });
            throw aiError; // Re-throw - it's already an HttpsError
        }

        const latencyMs = Date.now() - startTime;

        // 6. Save to cache and history
        let resumeId: string | null = null;

        try {
            await saveToCache(userId, inputHash, mode, analysis, tokensUsed, latencyMs);

            if (userId !== 'anonymous') {
                resumeId = await saveToHistory(
                    userId,
                    resumeText,
                    targetRole,
                    mode,
                    analysis,
                    inputHash,
                    tokensUsed,
                    latencyMs
                );
            }
        } catch (saveError) {
            aiLogger.warn('Save to Firestore failed', {
                feature: 'resume_analyzer',
                error: (saveError as Error).message,
            });
            // Don't throw - analysis was successful
        }

        aiLogger.info('Resume analysis completed', {
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
                model: AI_CONFIG.model,
            },
        };
    });

// ============================================
// ADDITIONAL EXPORTS FOR TESTING
// ============================================

export { validateResumeInput, validateSimpleResponse };
export type {
    AnalyzeResumeRequest,
    SimpleResumeAnalysis,
    DetailedResumeAnalysis,
    ResumeAnalysisDocument
};
