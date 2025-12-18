/**
 * Interview Coach Handler
 * 
 * Cloud Functions for interview simulation and evaluation
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { callGemini, buildPrompt, MODEL_NAME } from '../services/ai.service';
import {
    GENERATE_QUESTIONS_PROMPT,
    EVALUATE_ANSWER_PROMPT,
    INTERVIEW_COACH_SYSTEM,
    INTERVIEW_SUMMARY_PROMPT
} from '../prompts/interview.prompts';

const db = admin.firestore();

// Types
interface InterviewQuestion {
    id: string;
    question: string;
    type: 'behavioral' | 'technical' | 'situational';
    difficulty: 'easy' | 'medium' | 'hard';
    topic: string;
    expectedElements: string[];
    followUps: string[];
    timeGuideline: string;
}

interface AnswerEvaluation {
    score: number;
    overallFeedback: string;
    starAnalysis?: {
        situation: { present: boolean; score: number; feedback: string };
        task: { present: boolean; score: number; feedback: string };
        action: { present: boolean; score: number; feedback: string };
        result: { present: boolean; score: number; feedback: string };
    };
    technicalAccuracy: number | null;
    communicationScore: number;
    communicationFeedback: string;
    strengths: string[];
    improvements: string[];
    modelAnswer: string;
    followUpQuestion: string;
}

/**
 * Start a new interview session
 */
export const startInterview = functions.https.onCall(async (request) => {
    const { role, type, difficulty } = request.data as {
        role: string;
        type: 'behavioral' | 'technical' | 'mixed';
        difficulty: 'entry' | 'mid' | 'senior';
    };
    const userId = request.auth?.uid;

    if (!role) {
        throw new functions.https.HttpsError('invalid-argument', 'Role is required');
    }

    // Generate initial questions
    const prompt = buildPrompt(GENERATE_QUESTIONS_PROMPT, {
        role,
        type,
        difficulty,
        previousQuestions: '[]',
    });

    const { result, tokensUsed } = await callGemini<{ questions: InterviewQuestion[] }>(prompt, {
        systemInstruction: INTERVIEW_COACH_SYSTEM,
    });

    // Create session
    const sessionRef = await db.collection('interviewSessions').add({
        userId: userId || 'anonymous',
        role,
        type,
        difficulty,
        questions: result.questions,
        currentQuestionIndex: 0,
        exchanges: [],
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await db.collection('aiResults').add({
        userId: userId || 'anonymous',
        type: 'interview_questions',
        model: MODEL_NAME,
        tokensUsed,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
        success: true,
        sessionId: sessionRef.id,
        firstQuestion: result.questions[0],
        totalQuestions: result.questions.length,
    };
});

/**
 * Submit an answer and get evaluation
 */
export const submitAnswer = functions.https.onCall(async (request) => {
    const { sessionId, answer } = request.data as {
        sessionId: string;
        answer: string;
    };
    const userId = request.auth?.uid;

    if (!sessionId || !answer) {
        throw new functions.https.HttpsError('invalid-argument', 'Session ID and answer are required');
    }

    // Get session
    const sessionRef = db.collection('interviewSessions').doc(sessionId);
    const sessionDoc = await sessionRef.get();

    if (!sessionDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Session not found');
    }

    const session = sessionDoc.data()!;
    const currentQuestion = session.questions[session.currentQuestionIndex];

    // Evaluate answer
    const prompt = buildPrompt(EVALUATE_ANSWER_PROMPT, {
        question: currentQuestion.question,
        questionType: currentQuestion.type,
        expectedElements: JSON.stringify(currentQuestion.expectedElements),
        answer,
    });

    const { result: evaluation, tokensUsed } = await callGemini<AnswerEvaluation>(prompt, {
        systemInstruction: INTERVIEW_COACH_SYSTEM,
    });

    // Create exchange record
    const exchange = {
        id: `ex_${Date.now()}`,
        questionId: currentQuestion.id,
        question: currentQuestion.question,
        questionType: currentQuestion.type,
        userAnswer: answer,
        feedback: evaluation,
        timestamp: new Date(),
    };

    // Update session
    const nextIndex = session.currentQuestionIndex + 1;
    const isComplete = nextIndex >= session.questions.length;

    await sessionRef.update({
        exchanges: admin.firestore.FieldValue.arrayUnion(exchange),
        currentQuestionIndex: nextIndex,
        ...(isComplete && { completedAt: admin.firestore.FieldValue.serverTimestamp() }),
    });

    await db.collection('aiResults').add({
        userId: userId || 'anonymous',
        type: 'interview_evaluation',
        model: MODEL_NAME,
        tokensUsed,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // If complete, generate summary
    let finalEvaluation = null;
    if (isComplete) {
        const allExchanges = [...session.exchanges, exchange];
        const summaryPrompt = buildPrompt(INTERVIEW_SUMMARY_PROMPT, {
            role: session.role,
            interviewType: session.type,
            exchanges: JSON.stringify(allExchanges.map(e => ({
                question: e.question,
                answer: e.userAnswer,
                score: e.feedback.score,
            }))),
        });

        const { result: summary } = await callGemini<{
            overallScore: number;
            readinessLevel: string;
            summary: string;
            categoryScores: Record<string, number>;
            recommendations: string[];
        }>(summaryPrompt, {
            systemInstruction: INTERVIEW_COACH_SYSTEM,
        });

        finalEvaluation = summary;

        await sessionRef.update({
            evaluation: summary,
        });

        // Update user stats
        if (userId) {
            await db.collection('users').doc(userId).update({
                'stats.interviewReadiness': summary.overallScore,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        }
    }

    return {
        success: true,
        feedback: evaluation,
        nextQuestion: !isComplete ? session.questions[nextIndex] : null,
        isComplete,
        finalEvaluation,
        questionsRemaining: session.questions.length - nextIndex,
    };
});

/**
 * Get next question with optional follow-up
 */
export const getNextQuestion = functions.https.onCall(async (request) => {
    const { sessionId, wantFollowUp } = request.data as {
        sessionId: string;
        wantFollowUp?: boolean;
    };

    const sessionDoc = await db.collection('interviewSessions').doc(sessionId).get();

    if (!sessionDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Session not found');
    }

    const session = sessionDoc.data()!;

    if (wantFollowUp && session.exchanges.length > 0) {
        const lastExchange = session.exchanges[session.exchanges.length - 1];
        if (lastExchange.feedback.followUpQuestion) {
            return {
                success: true,
                question: {
                    id: `followup_${Date.now()}`,
                    question: lastExchange.feedback.followUpQuestion,
                    type: lastExchange.questionType,
                    isFollowUp: true,
                },
                isComplete: false,
            };
        }
    }

    if (session.currentQuestionIndex >= session.questions.length) {
        return {
            success: true,
            question: null,
            isComplete: true,
        };
    }

    return {
        success: true,
        question: session.questions[session.currentQuestionIndex],
        isComplete: false,
        questionsRemaining: session.questions.length - session.currentQuestionIndex,
    };
});
