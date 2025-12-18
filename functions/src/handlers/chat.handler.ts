/**
 * Chat Handler - AI Learning Assistant
 * 
 * Cloud Function for conversational AI tutoring
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { aiService, aiLogger } from '../services/ai.service';

// Types
interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

interface ChatRequest {
    message: string;
    context?: string;
    history?: ChatMessage[];
}

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
 * Send a message to the AI Learning Assistant
 */
export const sendChatMessage = functions
    .runWith({ timeoutSeconds: 60, memory: '512MB' })
    .https.onCall(async (request) => {
        const { message, context, history = [] } = request.data as ChatRequest;
        const userId = request.auth?.uid || 'anonymous';

        if (!message || message.trim().length < 1) {
            throw new functions.https.HttpsError(
                'invalid-argument',
                'Message is required'
            );
        }

        if (message.length > 5000) {
            throw new functions.https.HttpsError(
                'invalid-argument',
                'Message too long (max 5000 characters)'
            );
        }

        aiLogger.info('Chat message received', {
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
            const response = await aiService.generate<string>(prompt, {
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
        } catch (error) {
            aiLogger.error('Chat failed', error as Error, { feature: 'chat', userId });
            throw error;
        }
    });

/**
 * Get chat history for a user
 */
export const getChatHistory = functions.https.onCall(async (request) => {
    const userId = request.auth?.uid;

    if (!userId) {
        throw new functions.https.HttpsError(
            'unauthenticated',
            'Must be logged in to view chat history'
        );
    }

    const db = getDb();
    const history = await db.collection('chatHistory')
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .limit(50)
        .get();

    return {
        success: true,
        history: history.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        })),
    };
});
