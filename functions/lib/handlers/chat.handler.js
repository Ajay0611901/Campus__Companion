"use strict";
/**
 * Chat Handler - AI Learning Assistant
 *
 * Cloud Function for conversational AI tutoring
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
exports.getChatHistory = exports.sendChatMessage = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const ai_service_1 = require("../services/ai.service");
const CHAT_SYSTEM = `You are an AI Learning Assistant for students. Your role is to:

1. Answer academic questions clearly and thoroughly
2. Explain complex concepts in simple terms
3. Provide examples and analogies
4. Help with problem-solving step by step
5. Encourage learning and curiosity

Guidelines:
- Be friendly, supportive, and patient
- Break down complex topics into digestible parts
- Use examples from real life when possible
- If you don't know something, admit it
- Encourage students to think critically

Respond naturally in conversational format.`;
// Initialize Firestore
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
 * Send a message to the AI Learning Assistant
 */
exports.sendChatMessage = functions
    .runWith({ timeoutSeconds: 60, memory: '512MB' })
    .https.onCall(async (request) => {
    var _a;
    const { message, context, history = [] } = request.data;
    const userId = ((_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid) || 'anonymous';
    if (!message || message.trim().length < 1) {
        throw new functions.https.HttpsError('invalid-argument', 'Message is required');
    }
    if (message.length > 5000) {
        throw new functions.https.HttpsError('invalid-argument', 'Message too long (max 5000 characters)');
    }
    ai_service_1.aiLogger.info('Chat message received', {
        feature: 'chat',
        userId,
        action: 'send_message',
    });
    // Build conversation context
    let prompt = '';
    if (context) {
        prompt += `Context: ${context}\n\n`;
    }
    // Add recent history (last 5 messages for context)
    const recentHistory = history.slice(-5);
    if (recentHistory.length > 0) {
        prompt += 'Previous conversation:\n';
        recentHistory.forEach(msg => {
            prompt += `${msg.role === 'user' ? 'Student' : 'Assistant'}: ${msg.content}\n`;
        });
        prompt += '\n';
    }
    prompt += `Student: ${message}\n\nAssistant:`;
    try {
        const response = await ai_service_1.aiService.generate(prompt, {
            systemInstruction: CHAT_SYSTEM,
            jsonMode: false,
            temperature: 0.8,
            context: { feature: 'chat', userId },
        });
        const assistantMessage = response.result;
        // Save to chat history if authenticated
        if (userId !== 'anonymous') {
            const db = getDb();
            await db.collection('chatHistory').add({
                userId,
                messages: [
                    { role: 'user', content: message, timestamp: new Date() },
                    { role: 'assistant', content: assistantMessage, timestamp: new Date() },
                ],
                context,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        }
        return {
            success: true,
            message: assistantMessage,
            tokensUsed: response.usage.totalTokens,
        };
    }
    catch (error) {
        ai_service_1.aiLogger.error('Chat failed', error, { feature: 'chat', userId });
        throw error;
    }
});
/**
 * Get chat history for a user
 */
exports.getChatHistory = functions.https.onCall(async (request) => {
    var _a;
    const userId = (_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid;
    if (!userId) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be logged in to view chat history');
    }
    const db = getDb();
    const history = await db.collection('chatHistory')
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .limit(50)
        .get();
    return {
        success: true,
        history: history.docs.map(doc => (Object.assign({ id: doc.id }, doc.data()))),
    };
});
//# sourceMappingURL=chat.handler.js.map