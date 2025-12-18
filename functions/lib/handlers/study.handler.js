"use strict";
/**
 * Study Tools Handler
 *
 * Cloud Functions for lecture summarization, quizzes, and flashcards
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
exports.generateQuiz = exports.generateFlashcards = exports.summarizeLecture = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const ai_service_1 = require("../services/ai.service");
const study_prompts_1 = require("../prompts/study.prompts");
const db = admin.firestore();
/**
 * Summarize lecture content
 */
exports.summarizeLecture = functions.https.onCall(async (request) => {
    var _a;
    const { content, title } = request.data;
    const userId = (_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid;
    if (!content || content.trim().length < 100) {
        throw new functions.https.HttpsError('invalid-argument', 'Content must be at least 100 characters');
    }
    const prompt = (0, ai_service_1.buildPrompt)(study_prompts_1.LECTURE_SUMMARY_PROMPT, { content });
    const { result: summary, tokensUsed } = await (0, ai_service_1.callGemini)(prompt, {
        systemInstruction: study_prompts_1.STUDY_ASSISTANT_SYSTEM,
    });
    // Save for user
    if (userId) {
        await db.collection('lectureSummaries').add({
            userId,
            title: title || summary.title,
            originalContent: content,
            summary,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    }
    // Log usage
    await db.collection('aiResults').add({
        userId: userId || 'anonymous',
        type: 'lecture_summary',
        model: ai_service_1.MODEL_NAME,
        tokensUsed,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return {
        success: true,
        summary,
    };
});
/**
 * Generate flashcards from content
 */
exports.generateFlashcards = functions.https.onCall(async (request) => {
    var _a;
    const { content } = request.data;
    const userId = (_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid;
    if (!content || content.trim().length < 50) {
        throw new functions.https.HttpsError('invalid-argument', 'Content must be at least 50 characters');
    }
    const prompt = (0, ai_service_1.buildPrompt)(study_prompts_1.FLASHCARD_GENERATOR_PROMPT, { content });
    const { result, tokensUsed } = await (0, ai_service_1.callGemini)(prompt, {
        systemInstruction: study_prompts_1.STUDY_ASSISTANT_SYSTEM,
    });
    // Save for user
    if (userId) {
        await db.collection('flashcardSets').add({
            userId,
            flashcards: result.flashcards,
            sourceContent: content.substring(0, 500), // Store snippet
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    }
    await db.collection('aiResults').add({
        userId: userId || 'anonymous',
        type: 'flashcards',
        model: ai_service_1.MODEL_NAME,
        tokensUsed,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return {
        success: true,
        flashcards: result.flashcards,
    };
});
/**
 * Generate quiz from content
 */
exports.generateQuiz = functions.https.onCall(async (request) => {
    var _a;
    const { content, quizType = 'mixed', difficulty = 'medium', numQuestions = 10 } = request.data;
    const userId = (_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid;
    if (!content || content.trim().length < 100) {
        throw new functions.https.HttpsError('invalid-argument', 'Content must be at least 100 characters');
    }
    const prompt = (0, ai_service_1.buildPrompt)(study_prompts_1.QUIZ_GENERATOR_PROMPT, {
        content,
        quizType,
        difficulty,
        numQuestions: String(Math.min(numQuestions, 20)),
    });
    const { result, tokensUsed } = await (0, ai_service_1.callGemini)(prompt, {
        systemInstruction: study_prompts_1.STUDY_ASSISTANT_SYSTEM,
    });
    // Save for user
    if (userId) {
        await db.collection('quizzes').add({
            userId,
            quiz: result.quiz,
            sourceContent: content.substring(0, 500),
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    }
    await db.collection('aiResults').add({
        userId: userId || 'anonymous',
        type: 'quiz',
        model: ai_service_1.MODEL_NAME,
        tokensUsed,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return {
        success: true,
        quiz: result.quiz,
    };
});
//# sourceMappingURL=study.handler.js.map