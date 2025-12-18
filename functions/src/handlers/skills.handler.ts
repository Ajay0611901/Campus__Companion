/**
 * Skills Recommendation Handler
 * 
 * Cloud Function for AI-powered skill roadmap generation
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { callGemini, buildPrompt, createInputHash, MODEL_NAME } from '../services/ai.service';
import { SKILL_ROADMAP_PROMPT, SKILL_RECOMMENDATION_SYSTEM } from '../prompts/skills.prompts';

// Types
interface SkillRoadmap {
    summary: string;
    timeline: string;
    phases: Array<{
        name: string;
        duration: string;
        skills: Array<{
            name: string;
            priority: 'essential' | 'recommended' | 'optional';
            reason: string;
            resources: string[];
        }>;
        milestone: string;
    }>;
    courses: Array<{
        title: string;
        platform: string;
        reason: string;
        duration: string;
    }>;
    projects: Array<{
        title: string;
        description: string;
        skills: string[];
        difficulty: 'beginner' | 'intermediate' | 'advanced';
        estimatedTime: string;
    }>;
}

interface GetRecommendationsRequest {
    interests: string[];
    careerGoal: string;
    currentSkills: string[];
    grade: string;
}

const db = admin.firestore();

/**
 * Generate personalized skill recommendations
 */
export const getSkillRecommendations = functions.https.onCall(async (request) => {
    const { interests, careerGoal, currentSkills, grade } = request.data as GetRecommendationsRequest;
    const userId = request.auth?.uid;

    // Validate input
    if (!interests || interests.length === 0) {
        throw new functions.https.HttpsError(
            'invalid-argument',
            'At least one interest is required'
        );
    }

    if (!careerGoal || careerGoal.trim().length < 3) {
        throw new functions.https.HttpsError(
            'invalid-argument',
            'Career goal is required'
        );
    }

    // Check cache
    const inputHash = createInputHash({ interests, careerGoal, currentSkills, grade });
    const cachedResult = await db
        .collection('aiResults')
        .where('inputHash', '==', inputHash)
        .where('type', '==', 'skill_recommendation')
        .limit(1)
        .get();

    if (!cachedResult.empty) {
        const cached = cachedResult.docs[0].data();
        const expiresAt = cached.expiresAt?.toDate();
        if (expiresAt && expiresAt > new Date()) {
            return {
                success: true,
                roadmap: cached.response as SkillRoadmap,
                cached: true,
            };
        }
    }

    // Build prompt
    const prompt = buildPrompt(SKILL_ROADMAP_PROMPT, {
        interests: interests.join(', '),
        careerGoal,
        currentSkills: currentSkills?.join(', ') || 'None specified',
        grade: grade || 'Not specified',
    });

    // Call AI
    const { result: roadmap, tokensUsed } = await callGemini<SkillRoadmap>(prompt, {
        systemInstruction: SKILL_RECOMMENDATION_SYSTEM,
    });

    // Save to cache
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await db.collection('aiResults').add({
        userId: userId || 'anonymous',
        type: 'skill_recommendation',
        inputHash,
        prompt,
        response: roadmap,
        model: MODEL_NAME,
        tokensUsed,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        expiresAt,
    });

    // Save recommendation for user
    if (userId) {
        await db.collection('recommendations').add({
            userId,
            context: { interests, careerGoal, currentSkills, grade },
            roadmap,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Update user profile
        await db.collection('users').doc(userId).update({
            'profile.interests': interests,
            'profile.careerGoal': careerGoal,
            'profile.skills': currentSkills || [],
            'stats.skillProgress': calculateSkillProgress(roadmap, currentSkills || []),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    }

    return {
        success: true,
        roadmap,
        cached: false,
    };
});

/**
 * Calculate skill progress percentage
 */
function calculateSkillProgress(roadmap: SkillRoadmap, currentSkills: string[]): number {
    const allSkills = roadmap.phases.flatMap(p => p.skills.map(s => s.name.toLowerCase()));
    const matchedSkills = currentSkills.filter(skill =>
        allSkills.some(s => s.includes(skill.toLowerCase()) || skill.toLowerCase().includes(s))
    );
    return Math.round((matchedSkills.length / Math.max(allSkills.length, 1)) * 100);
}
