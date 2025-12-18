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

// ... remaining feature placeholders ...

// Chat - uses /api/chat
export async function sendChatMessage(data: {
    message: string;
    conversationHistory?: string;
    userId?: string;
    userProfile?: any;
}) {
    const authHeader = await getAuthHeader();
    const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...authHeader
        },
        body: JSON.stringify(data),
    });

    if (response.status === 401) throw new Error('Please sign in to chat');
    if (!response.ok) throw new Error('Failed to send message');

    return { data: await response.json() };
}

export async function getChatHistory() {
    throw new Error('Feature coming soon');
}

// Gamification - not implemented yet
export async function checkBadges() {
    throw new Error('Feature coming soon');
}

export async function getDailyChallenges() {
    throw new Error('Feature coming soon');
}

export default app;

