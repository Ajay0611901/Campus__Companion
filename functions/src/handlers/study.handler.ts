/**
 * Study Tools Handler
 * 
 * Cloud Functions for lecture summarization, quizzes, and flashcards
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { callGemini, buildPrompt, MODEL_NAME } from '../services/ai.service';
import {
    LECTURE_SUMMARY_PROMPT,
    FLASHCARD_GENERATOR_PROMPT,
    QUIZ_GENERATOR_PROMPT,
    STUDY_ASSISTANT_SYSTEM
} from '../prompts/study.prompts';

const db = admin.firestore();

// Types
interface LectureSummary {
    title: string;
    brief: string;
    detailed: string;
    keyPoints: string[];
    concepts: Array<{
        term: string;
        definition: string;
        importance: 'critical' | 'important' | 'supplementary';
    }>;
    connections: Array<{
        from: string;
        to: string;
        relationship: string;
    }>;
    studyTips: string[];
}

interface Flashcard {
    id: string;
    front: string;
    back: string;
    difficulty: number;
    category: string;
}

interface QuizQuestion {
    id: string;
    type: 'mcq' | 'short_answer' | 'true_false';
    question: string;
    points: number;
    options?: string[];
    correctAnswer: string;
    explanation: string;
    difficulty: 'easy' | 'medium' | 'hard';
    topic: string;
}

/**
 * Summarize lecture content
 */
export const summarizeLecture = functions.https.onCall(async (request) => {
    const { content, title } = request.data as { content: string; title?: string };
    const userId = request.auth?.uid;

    if (!content || content.trim().length < 100) {
        throw new functions.https.HttpsError(
            'invalid-argument',
            'Content must be at least 100 characters'
        );
    }

    const prompt = buildPrompt(LECTURE_SUMMARY_PROMPT, { content });

    const { result: summary, tokensUsed } = await callGemini<LectureSummary>(prompt, {
        systemInstruction: STUDY_ASSISTANT_SYSTEM,
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
        model: MODEL_NAME,
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
export const generateFlashcards = functions.https.onCall(async (request) => {
    const { content } = request.data as { content: string };
    const userId = request.auth?.uid;

    if (!content || content.trim().length < 50) {
        throw new functions.https.HttpsError(
            'invalid-argument',
            'Content must be at least 50 characters'
        );
    }

    const prompt = buildPrompt(FLASHCARD_GENERATOR_PROMPT, { content });

    const { result, tokensUsed } = await callGemini<{ flashcards: Flashcard[] }>(prompt, {
        systemInstruction: STUDY_ASSISTANT_SYSTEM,
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
        model: MODEL_NAME,
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
export const generateQuiz = functions.https.onCall(async (request) => {
    const { content, quizType = 'mixed', difficulty = 'medium', numQuestions = 10 } = request.data as {
        content: string;
        quizType?: 'mcq' | 'short_answer' | 'mixed';
        difficulty?: 'easy' | 'medium' | 'hard';
        numQuestions?: number;
    };
    const userId = request.auth?.uid;

    if (!content || content.trim().length < 100) {
        throw new functions.https.HttpsError(
            'invalid-argument',
            'Content must be at least 100 characters'
        );
    }

    const prompt = buildPrompt(QUIZ_GENERATOR_PROMPT, {
        content,
        quizType,
        difficulty,
        numQuestions: String(Math.min(numQuestions, 20)),
    });

    const { result, tokensUsed } = await callGemini<{ quiz: { title: string; questions: QuizQuestion[] } }>(prompt, {
        systemInstruction: STUDY_ASSISTANT_SYSTEM,
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
        model: MODEL_NAME,
        tokensUsed,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
        success: true,
        quiz: result.quiz,
    };
});
