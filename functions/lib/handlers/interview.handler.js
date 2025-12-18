"use strict";
/**
 * Interview Coach Handler
 *
 * Cloud Functions for interview simulation and evaluation
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
exports.getNextQuestion = exports.submitAnswer = exports.startInterview = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const ai_service_1 = require("../services/ai.service");
const interview_prompts_1 = require("../prompts/interview.prompts");
const db = admin.firestore();
/**
 * Start a new interview session
 */
exports.startInterview = functions.https.onCall(async (request) => {
    var _a;
    const { role, type, difficulty } = request.data;
    const userId = (_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid;
    if (!role) {
        throw new functions.https.HttpsError('invalid-argument', 'Role is required');
    }
    // Generate initial questions
    const prompt = (0, ai_service_1.buildPrompt)(interview_prompts_1.GENERATE_QUESTIONS_PROMPT, {
        role,
        type,
        difficulty,
        previousQuestions: '[]',
    });
    const { result, tokensUsed } = await (0, ai_service_1.callGemini)(prompt, {
        systemInstruction: interview_prompts_1.INTERVIEW_COACH_SYSTEM,
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
        model: ai_service_1.MODEL_NAME,
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
exports.submitAnswer = functions.https.onCall(async (request) => {
    var _a;
    const { sessionId, answer } = request.data;
    const userId = (_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid;
    if (!sessionId || !answer) {
        throw new functions.https.HttpsError('invalid-argument', 'Session ID and answer are required');
    }
    // Get session
    const sessionRef = db.collection('interviewSessions').doc(sessionId);
    const sessionDoc = await sessionRef.get();
    if (!sessionDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Session not found');
    }
    const session = sessionDoc.data();
    const currentQuestion = session.questions[session.currentQuestionIndex];
    // Evaluate answer
    const prompt = (0, ai_service_1.buildPrompt)(interview_prompts_1.EVALUATE_ANSWER_PROMPT, {
        question: currentQuestion.question,
        questionType: currentQuestion.type,
        expectedElements: JSON.stringify(currentQuestion.expectedElements),
        answer,
    });
    const { result: evaluation, tokensUsed } = await (0, ai_service_1.callGemini)(prompt, {
        systemInstruction: interview_prompts_1.INTERVIEW_COACH_SYSTEM,
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
    await sessionRef.update(Object.assign({ exchanges: admin.firestore.FieldValue.arrayUnion(exchange), currentQuestionIndex: nextIndex }, (isComplete && { completedAt: admin.firestore.FieldValue.serverTimestamp() })));
    await db.collection('aiResults').add({
        userId: userId || 'anonymous',
        type: 'interview_evaluation',
        model: ai_service_1.MODEL_NAME,
        tokensUsed,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    // If complete, generate summary
    let finalEvaluation = null;
    if (isComplete) {
        const allExchanges = [...session.exchanges, exchange];
        const summaryPrompt = (0, ai_service_1.buildPrompt)(interview_prompts_1.INTERVIEW_SUMMARY_PROMPT, {
            role: session.role,
            interviewType: session.type,
            exchanges: JSON.stringify(allExchanges.map(e => ({
                question: e.question,
                answer: e.userAnswer,
                score: e.feedback.score,
            }))),
        });
        const { result: summary } = await (0, ai_service_1.callGemini)(summaryPrompt, {
            systemInstruction: interview_prompts_1.INTERVIEW_COACH_SYSTEM,
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
exports.getNextQuestion = functions.https.onCall(async (request) => {
    const { sessionId, wantFollowUp } = request.data;
    const sessionDoc = await db.collection('interviewSessions').doc(sessionId).get();
    if (!sessionDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Session not found');
    }
    const session = sessionDoc.data();
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
//# sourceMappingURL=interview.handler.js.map