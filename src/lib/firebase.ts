// Firebase Client Configuration
// Handles graceful initialization when credentials are not available

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getFunctions, httpsCallable, Functions, HttpsCallable } from 'firebase/functions';

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'placeholder',
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'placeholder.firebaseapp.com',
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'placeholder',
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'placeholder.appspot.com',
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '000000000000',
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:000000000000:web:0000000000000000000000',
};

// Check if Firebase is properly configured
export const isFirebaseConfigured = () => {
    return process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
        process.env.NEXT_PUBLIC_FIREBASE_API_KEY !== 'placeholder';
};

// Initialize Firebase (prevent re-initialization in dev)
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let functions: Functions;

try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    auth = getAuth(app);
    db = getFirestore(app);
    functions = getFunctions(app);
} catch (error) {
    console.warn('Firebase initialization error:', error);
    // Create placeholder for SSR/build time
    app = {} as FirebaseApp;
    auth = {} as Auth;
    db = {} as Firestore;
    functions = {} as Functions;
}

export { app, auth, db };
export const googleProvider = new GoogleAuthProvider();

// ============================================
// CALLABLE FUNCTIONS (Safe wrappers)
// ============================================

// Helper to create safe callable that checks config first
function createSafeCallable<T, R>(name: string): HttpsCallable<T, R> {
    return ((data: T) => {
        if (!isFirebaseConfigured()) {
            return Promise.reject(new Error('Firebase not configured. Please set environment variables.'));
        }
        return httpsCallable<T, R>(functions, name)(data);
    }) as HttpsCallable<T, R>;
}

// Helper to get auth header
async function getAuthHeader(): Promise<Record<string, string>> {
    const user = auth.currentUser;
    if (!user) return {};
    const token = await user.getIdToken();
    return { 'Authorization': `Bearer ${token}` };
}

// Resume Analysis - now uses /api/resume
export async function analyzeResume(data: { resumeText: string; targetRole: string }) {
    const authHeader = await getAuthHeader();
    const response = await fetch('/api/resume', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...authHeader
        },
        body: JSON.stringify(data),
    });

    if (response.status === 401) throw new Error('Please sign in to analyze resumes');
    if (!response.ok) throw new Error('Failed to analyze resume');

    return { data: await response.json() };
}

// Skill Recommendations - uses /api/skills
export async function getSkillRecommendations(data: {
    interests: string[];
    careerGoal: string;
    currentSkills: string[];
    grade: string;
}) {
    const authHeader = await getAuthHeader();
    const response = await fetch('/api/skills', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...authHeader
        },
        body: JSON.stringify(data),
    });

    if (response.status === 401) throw new Error('Please sign in for recommendations');
    if (!response.ok) throw new Error('Failed to get recommendations');

    return { data: await response.json() };
}

// Study Tools - uses /api/study/summarize
export async function summarizeLecture(data: { content: string; title?: string }) {
    const authHeader = await getAuthHeader();
    const response = await fetch('/api/study/summarize', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...authHeader
        },
        body: JSON.stringify(data),
    });

    if (response.status === 401) throw new Error('Please sign in to summarize');
    if (!response.ok) throw new Error('Failed to summarize');

    return { data: await response.json() };
}

// Feature placeholders -> Implemented
export async function generateQuiz(data: { content: string; quizType?: string; difficulty?: string; numQuestions?: number }) {
    const authHeader = await getAuthHeader();
    const response = await fetch('/api/study/quiz', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...authHeader
        },
        body: JSON.stringify(data),
    });

    if (response.status === 401) throw new Error('Please sign in to generate quiz');
    if (!response.ok) throw new Error('Failed to generate quiz');

    return { data: await response.json() };
}

export async function generateFlashcards(data: { content: string }) {
    const authHeader = await getAuthHeader();
    const response = await fetch('/api/study/flashcards', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...authHeader
        },
        body: JSON.stringify(data),
    });

    if (response.status === 401) throw new Error('Please sign in to generate flashcards');
    if (!response.ok) throw new Error('Failed to generate flashcards');

    return { data: await response.json() };
}

export async function startInterview(data: { role: string; type: string; difficulty: string; currentSemester?: string }) {
    const authHeader = await getAuthHeader();
    const response = await fetch('/api/interview', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...authHeader
        },
        body: JSON.stringify({ action: 'start', ...data }),
    });

    if (response.status === 401) throw new Error('Please sign in to start interview');
    if (!response.ok) throw new Error('Failed to start interview');

    return { data: await response.json() };
}

export async function submitAnswer(data: { sessionId: string; answer: string }) {
    const authHeader = await getAuthHeader();
    const response = await fetch('/api/interview', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...authHeader
        },
        body: JSON.stringify({ action: 'submit', ...data }),
    });

    if (response.status === 401) throw new Error('Please sign in to submit answer');
    if (!response.ok) throw new Error('Failed to submit answer');

    return { data: await response.json() };
}

export async function getNextQuestion(data: any) {
    // For MVP, we only do single-turn question/feedback loop
    return { data: { success: true, nextQuestion: null } };
}

export async function getChatHistory() {
    // Return empty history for now
    return { data: [] };
}

// Gamification - Simple mocks for demo
export async function checkBadges() {
    return {
        data: {
            items: [
                { id: '1', name: 'Early Adopter', description: 'Joined the beta', icon: '🌟', earned: true },
                { id: '2', name: 'Study Star', description: 'Created 5 study guides', icon: '📚', earned: false },
                { id: '3', name: 'Interview Pro', description: 'Completed 3 interviews', icon: '🎤', earned: false },
            ]
        }
    };
}

export async function getDailyChallenges() {
    return {
        data: {
            items: [
                { id: '1', title: 'Complete a Mock Interview', xp: 50, completed: false },
                { id: '2', title: 'Generate Flashcards', xp: 30, completed: false },
                { id: '3', title: 'Start a Study Session', xp: 20, completed: false },
            ]
        }
    };
}

// Chat - Streaming
export async function streamChatMessage(
    data: { message: string; conversationHistory?: string; userProfile?: any },
    onChunk: (chunk: string) => void
) {
    const authHeader = await getAuthHeader();
    const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...authHeader
        },
        body: JSON.stringify(data),
    });

    if (response.status === 401) throw new Error('Authentication required');
    if (!response.ok) {
        const text = await response.text();
        let errorData: any = {};
        try {
            errorData = JSON.parse(text);
        } catch (e) {
            console.error('❌ Server returned non-JSON error:', text.slice(0, 200));
        }

        const errorMessage = errorData.error || 'Failed to send message';
        const details = errorData.details ? ` (${errorData.details})` : '';
        throw new Error(errorMessage + details);
    }

    if (!response.body) throw new Error('No response body');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE lines from buffer
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
            const trimmedLine = line.trim();

            // Skip empty lines and SSE comments (lines starting with :)
            if (!trimmedLine || trimmedLine.startsWith(':')) continue;

            // Parse SSE data lines
            if (trimmedLine.startsWith('data: ')) {
                const jsonStr = trimmedLine.slice(6); // Remove 'data: ' prefix

                // Check for stream end signal
                if (jsonStr === '[DONE]') continue;

                try {
                    const parsed = JSON.parse(jsonStr);
                    // Extract content from OpenAI/OpenRouter format
                    const content = parsed.choices?.[0]?.delta?.content;
                    if (content) {
                        onChunk(content);
                    }
                } catch (e) {
                    // Skip malformed JSON lines
                    console.warn('Failed to parse SSE chunk:', jsonStr.slice(0, 50));
                }
            }
        }
    }
}

export default app;

