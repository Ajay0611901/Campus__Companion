/**
 * Example Usage of AI Service
 * 
 * This file demonstrates how to use the AI service in Cloud Functions.
 * Copy and adapt these patterns for specific features.
 */

import * as functions from 'firebase-functions';
import { aiService, AI_CONFIG, createInputHash, aiLogger } from './ai.service';
import * as admin from 'firebase-admin';

// ============================================
// EXAMPLE 1: Basic AI Call
// ============================================

/**
 * Simple AI call with JSON response
 */
export const basicExample = functions.https.onCall(async (request) => {
    const { question } = request.data as { question: string };

    // Define expected response type
    interface AnswerResponse {
        answer: string;
        confidence: number;
        sources: string[];
    }

    const response = await aiService.generate<AnswerResponse>(
        `Answer the following question: ${question}
    
    Respond with JSON:
    {
      "answer": "<your answer>",
      "confidence": <0-100>,
      "sources": ["<source1>", "<source2>"]
    }`,
        {
            systemInstruction: 'You are a helpful academic assistant. Provide accurate, well-researched answers.',
            requiredFields: ['answer', 'confidence'],
            context: {
                feature: 'qa_assistant',
                userId: request.auth?.uid,
            },
        }
    );

    return {
        success: true,
        data: response.result,
        tokensUsed: response.usage.totalTokens,
    };
});

// ============================================
// EXAMPLE 2: Template-Based Prompt
// ============================================

/**
 * Using template-based prompts for reusability
 */
const ANALYSIS_TEMPLATE = `
Analyze the following {{contentType}} for a {{targetAudience}}:

CONTENT:
"""
{{content}}
"""

Provide your analysis in JSON format:
{
  "summary": "<brief summary>",
  "keyPoints": ["<point1>", "<point2>"],
  "recommendations": ["<rec1>", "<rec2>"],
  "score": <0-100>
}
`;

export const templateExample = functions.https.onCall(async (request) => {
    const { content, contentType, targetAudience } = request.data as {
        content: string;
        contentType: string;
        targetAudience: string;
    };

    interface AnalysisResponse {
        summary: string;
        keyPoints: string[];
        recommendations: string[];
        score: number;
    }

    const response = await aiService.generateFromTemplate<AnalysisResponse>(
        ANALYSIS_TEMPLATE,
        { content, contentType, targetAudience },
        {
            systemInstruction: 'You are an expert content analyst.',
            context: { feature: 'content_analyzer' },
        }
    );

    return response.result;
});

// ============================================
// EXAMPLE 3: With Caching
// ============================================

/**
 * AI call with Firestore caching to avoid repeated calls
 */
export const cachedExample = functions.https.onCall(async (request) => {
    const { resumeText, targetRole } = request.data as {
        resumeText: string;
        targetRole: string;
    };
    const userId = request.auth?.uid;

    // Initialize Firestore
    const db = admin.firestore();

    // Create deterministic hash from input
    const inputHash = createInputHash({ resumeText, targetRole });

    // Check cache first
    const cacheRef = db.collection('aiResults');
    const cachedResult = await cacheRef
        .where('inputHash', '==', inputHash)
        .where('type', '==', 'resume_analysis')
        .where('expiresAt', '>', new Date())
        .limit(1)
        .get();

    if (!cachedResult.empty) {
        aiLogger.info('Cache hit', { feature: 'resume_analyzer', inputHash });
        const cached = cachedResult.docs[0].data();
        return {
            success: true,
            data: cached.response,
            cached: true,
        };
    }

    // Cache miss - call AI
    aiLogger.info('Cache miss, calling AI', { feature: 'resume_analyzer', inputHash });

    interface ResumeAnalysis {
        score: number;
        feedback: string;
        improvements: string[];
    }

    const response = await aiService.generate<ResumeAnalysis>(
        `Analyze this resume for a ${targetRole} position:\n\n${resumeText}`,
        {
            systemInstruction: 'You are an expert ATS system and career coach.',
            requiredFields: ['score', 'feedback', 'improvements'],
            context: { feature: 'resume_analyzer', userId },
        }
    );

    // Store in cache
    const expiresAt = new Date(Date.now() + AI_CONFIG.cacheTTL.resumeAnalysis);

    await cacheRef.add({
        userId: userId || 'anonymous',
        type: 'resume_analysis',
        inputHash,
        response: response.result,
        tokensUsed: response.usage.totalTokens,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        expiresAt,
    });

    return {
        success: true,
        data: response.result,
        cached: false,
        tokensUsed: response.usage.totalTokens,
    };
});

// ============================================
// EXAMPLE 4: Custom Temperature
// ============================================

/**
 * Creative task with higher temperature
 */
export const creativeExample = functions.https.onCall(async (request) => {
    const { topic } = request.data as { topic: string };

    interface CreativeResponse {
        title: string;
        content: string;
        tags: string[];
    }

    const response = await aiService.generate<CreativeResponse>(
        `Write a creative short story about: ${topic}`,
        {
            systemInstruction: 'You are a creative writer with a unique voice.',
            temperature: 0.95, // Higher temperature for creativity
            maxOutputTokens: 2048,
            context: { feature: 'creative_writer' },
        }
    );

    return response.result;
});

// ============================================
// EXAMPLE 5: Error Handling
// ============================================

/**
 * Proper error handling pattern
 */
export const errorHandlingExample = functions.https.onCall(async (request) => {
    const { input } = request.data as { input: string };

    // Input validation
    if (!input || input.length < 10) {
        throw new functions.https.HttpsError(
            'invalid-argument',
            'Input must be at least 10 characters'
        );
    }

    if (input.length > 50000) {
        throw new functions.https.HttpsError(
            'invalid-argument',
            'Input exceeds maximum length of 50000 characters'
        );
    }

    try {
        const response = await aiService.generate<{ result: string }>(
            `Process: ${input}`,
            {
                context: { feature: 'processor', userId: request.auth?.uid },
            }
        );

        return { success: true, data: response.result };

    } catch (error) {
        // Error is already formatted as HttpsError by aiService
        // Just re-throw
        throw error;
    }
});

// ============================================
// BEST PRACTICES SUMMARY
// ============================================

/**
 * BEST PRACTICES FOR AI SERVICE USAGE:
 * 
 * 1. ALWAYS define TypeScript interfaces for expected responses
 * 
 * 2. ALWAYS use requiredFields to validate AI output
 * 
 * 3. ALWAYS provide context for logging and debugging
 * 
 * 4. CACHE responses for expensive or repeated queries
 *    - Use createInputHash() for deterministic cache keys
 *    - Set appropriate TTL based on content volatility
 * 
 * 5. USE template-based prompts for maintainability
 *    - Keep prompts in separate files (prompts/*.ts)
 *    - Use {{variable}} placeholders
 * 
 * 6. VALIDATE inputs at the Cloud Function level
 *    - Check length, format, required fields
 *    - Throw HttpsError for invalid input
 * 
 * 7. ADJUST temperature based on task:
 *    - 0.3-0.5: Factual, deterministic (analysis, extraction)
 *    - 0.7: Balanced (most use cases)
 *    - 0.9+: Creative (writing, brainstorming)
 * 
 * 8. MONITOR costs:
 *    - Track tokensUsed from response.usage
 *    - Set rate limits per user
 *    - Use caching to reduce repeated calls
 * 
 * 9. NEVER expose AI service or API key to frontend
 *    - All calls must go through Cloud Functions
 *    - Frontend uses httpsCallable() only
 */
