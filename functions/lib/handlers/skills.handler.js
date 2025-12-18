"use strict";
/**
 * Skills Recommendation Handler
 *
 * Cloud Function for AI-powered skill roadmap generation
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
exports.getSkillRecommendations = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const ai_service_1 = require("../services/ai.service");
const skills_prompts_1 = require("../prompts/skills.prompts");
const db = admin.firestore();
/**
 * Generate personalized skill recommendations
 */
exports.getSkillRecommendations = functions.https.onCall(async (request) => {
    var _a, _b;
    const { interests, careerGoal, currentSkills, grade } = request.data;
    const userId = (_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid;
    // Validate input
    if (!interests || interests.length === 0) {
        throw new functions.https.HttpsError('invalid-argument', 'At least one interest is required');
    }
    if (!careerGoal || careerGoal.trim().length < 3) {
        throw new functions.https.HttpsError('invalid-argument', 'Career goal is required');
    }
    // Check cache
    const inputHash = (0, ai_service_1.createInputHash)({ interests, careerGoal, currentSkills, grade });
    const cachedResult = await db
        .collection('aiResults')
        .where('inputHash', '==', inputHash)
        .where('type', '==', 'skill_recommendation')
        .limit(1)
        .get();
    if (!cachedResult.empty) {
        const cached = cachedResult.docs[0].data();
        const expiresAt = (_b = cached.expiresAt) === null || _b === void 0 ? void 0 : _b.toDate();
        if (expiresAt && expiresAt > new Date()) {
            return {
                success: true,
                roadmap: cached.response,
                cached: true,
            };
        }
    }
    // Build prompt
    const prompt = (0, ai_service_1.buildPrompt)(skills_prompts_1.SKILL_ROADMAP_PROMPT, {
        interests: interests.join(', '),
        careerGoal,
        currentSkills: (currentSkills === null || currentSkills === void 0 ? void 0 : currentSkills.join(', ')) || 'None specified',
        grade: grade || 'Not specified',
    });
    // Call AI
    const { result: roadmap, tokensUsed } = await (0, ai_service_1.callGemini)(prompt, {
        systemInstruction: skills_prompts_1.SKILL_RECOMMENDATION_SYSTEM,
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
        model: ai_service_1.MODEL_NAME,
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
function calculateSkillProgress(roadmap, currentSkills) {
    const allSkills = roadmap.phases.flatMap(p => p.skills.map(s => s.name.toLowerCase()));
    const matchedSkills = currentSkills.filter(skill => allSkills.some(s => s.includes(skill.toLowerCase()) || skill.toLowerCase().includes(s)));
    return Math.round((matchedSkills.length / Math.max(allSkills.length, 1)) * 100);
}
//# sourceMappingURL=skills.handler.js.map