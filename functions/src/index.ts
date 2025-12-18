/**
 * AI Campus Companion - Cloud Functions Entry Point
 * 
 * Exports all callable functions for the platform
 */

import * as admin from 'firebase-admin';

// Initialize Firebase Admin
admin.initializeApp();

// Resume Analysis
export { analyzeResume } from './handlers/resume.handler';

// Skill Recommendations
export { getSkillRecommendations } from './handlers/skills.handler';

// Study Tools
export {
    summarizeLecture,
    generateFlashcards,
    generateQuiz
} from './handlers/study.handler';

// Interview Coach
export {
    startInterview,
    submitAnswer,
    getNextQuestion
} from './handlers/interview.handler';

// AI Chat Learning Assistant
export {
    sendChatMessage,
    getChatHistory
} from './handlers/chat.handler';

