"use strict";
/**
 * AI Campus Companion - Cloud Functions Entry Point
 *
 * Exports all callable functions for the platform
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
exports.getChatHistory = exports.sendChatMessage = exports.getNextQuestion = exports.submitAnswer = exports.startInterview = exports.generateQuiz = exports.generateFlashcards = exports.summarizeLecture = exports.getSkillRecommendations = exports.analyzeResume = void 0;
const admin = __importStar(require("firebase-admin"));
// Initialize Firebase Admin
admin.initializeApp();
// Resume Analysis
var resume_handler_1 = require("./handlers/resume.handler");
Object.defineProperty(exports, "analyzeResume", { enumerable: true, get: function () { return resume_handler_1.analyzeResume; } });
// Skill Recommendations
var skills_handler_1 = require("./handlers/skills.handler");
Object.defineProperty(exports, "getSkillRecommendations", { enumerable: true, get: function () { return skills_handler_1.getSkillRecommendations; } });
// Study Tools
var study_handler_1 = require("./handlers/study.handler");
Object.defineProperty(exports, "summarizeLecture", { enumerable: true, get: function () { return study_handler_1.summarizeLecture; } });
Object.defineProperty(exports, "generateFlashcards", { enumerable: true, get: function () { return study_handler_1.generateFlashcards; } });
Object.defineProperty(exports, "generateQuiz", { enumerable: true, get: function () { return study_handler_1.generateQuiz; } });
// Interview Coach
var interview_handler_1 = require("./handlers/interview.handler");
Object.defineProperty(exports, "startInterview", { enumerable: true, get: function () { return interview_handler_1.startInterview; } });
Object.defineProperty(exports, "submitAnswer", { enumerable: true, get: function () { return interview_handler_1.submitAnswer; } });
Object.defineProperty(exports, "getNextQuestion", { enumerable: true, get: function () { return interview_handler_1.getNextQuestion; } });
// AI Chat Learning Assistant
var chat_handler_1 = require("./handlers/chat.handler");
Object.defineProperty(exports, "sendChatMessage", { enumerable: true, get: function () { return chat_handler_1.sendChatMessage; } });
Object.defineProperty(exports, "getChatHistory", { enumerable: true, get: function () { return chat_handler_1.getChatHistory; } });
//# sourceMappingURL=index.js.map