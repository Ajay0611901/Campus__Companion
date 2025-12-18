/**
 * useAI Hook - Frontend AI Integration Layer
 * 
 * Provides a clean interface for calling Cloud Functions with:
 * - Loading states
 * - Error handling
 * - Type safety
 */

import { useState, useCallback } from 'react';
import {
    analyzeResume,
    getSkillRecommendations,
    summarizeLecture,
    generateQuiz,
    generateFlashcards,
    startInterview,
    submitAnswer,
} from '@/lib/firebase';

// ============================================
// TYPES
// ============================================

export interface AIState<T> {
    data: T | null;
    loading: boolean;
    error: string | null;
}

// Resume Analysis Types
export interface ResumeAnalysis {
    score: number;
    strengths: string[];
    missingSkills: string[];
    suggestions: string[];
}

export interface ResumeAnalysisResponse {
    success: boolean;
    analysis: ResumeAnalysis;
    cached: boolean;
    resumeId: string | null;
}

// Skill Roadmap Types
export interface SkillRoadmap {
    summary: string;
    timeline: string;
    phases: Array<{
        name: string;
        duration: string;
        skills: Array<{
            name: string;
            priority: string;
            reason: string;
        }>;
        milestone: string;
    }>;
    courses: Array<{
        title: string;
        platform: string;
        reason: string;
        duration: string;
    }>;
    projects: Array<{
        title: string;
        description: string;
        skills: string[];
        difficulty: string;
    }>;
}

// Study Types
export interface LectureSummary {
    title: string;
    brief: string;
    detailed: string;
    keyPoints: string[];
    concepts: Array<{
        term: string;
        definition: string;
        importance: string;
    }>;
}

export interface Flashcard {
    id: string;
    front: string;
    back: string;
    difficulty: number;
}

export interface QuizQuestion {
    id: string;
    question: string;
    type: string;
    options?: string[];
    correctAnswer: string;
    explanation: string;
    difficulty: string;
}

// Interview Types
export interface InterviewQuestion {
    id: string;
    question: string;
    type: string;
    topic: string;
}

export interface AnswerFeedback {
    score: number;
    overallFeedback: string;
    starAnalysis?: {
        situation: { present: boolean; score: number; feedback: string };
        task: { present: boolean; score: number; feedback: string };
        action: { present: boolean; score: number; feedback: string };
        result: { present: boolean; score: number; feedback: string };
    };
    strengths: string[];
    improvements: string[];
    modelAnswer: string;
}

// ============================================
// RESUME ANALYZER HOOK
// ============================================

export function useResumeAnalyzer() {
    const [state, setState] = useState<AIState<ResumeAnalysis>>({
        data: null,
        loading: false,
        error: null,
    });

    const analyze = useCallback(async (resumeText: string, targetRole: string) => {
        setState({ data: null, loading: true, error: null });

        try {
            const result = await analyzeResume({ resumeText, targetRole });
            const response = result.data as ResumeAnalysisResponse;

            if (response.success) {
                setState({ data: response.analysis, loading: false, error: null });
                return response.analysis;
            } else {
                throw new Error('Analysis failed');
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to analyze resume';
            setState({ data: null, loading: false, error: message });
            throw error;
        }
    }, []);

    const reset = useCallback(() => {
        setState({ data: null, loading: false, error: null });
    }, []);

    return { ...state, analyze, reset };
}

// ============================================
// SKILL RECOMMENDER HOOK
// ============================================

export function useSkillRecommender() {
    const [state, setState] = useState<AIState<SkillRoadmap>>({
        data: null,
        loading: false,
        error: null,
    });

    const getRecommendations = useCallback(async (
        interests: string[],
        careerGoal: string,
        currentSkills: string[],
        grade: string
    ) => {
        setState({ data: null, loading: true, error: null });

        try {
            const result = await getSkillRecommendations({
                interests,
                careerGoal,
                currentSkills,
                grade
            });
            const response = result.data as { success: boolean; roadmap: SkillRoadmap };

            if (response.success) {
                setState({ data: response.roadmap, loading: false, error: null });
                return response.roadmap;
            } else {
                throw new Error('Failed to get recommendations');
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to get skill recommendations';
            setState({ data: null, loading: false, error: message });
            throw error;
        }
    }, []);

    const reset = useCallback(() => {
        setState({ data: null, loading: false, error: null });
    }, []);

    return { ...state, getRecommendations, reset };
}

// ============================================
// STUDY TOOLS HOOKS
// ============================================

export function useLectureSummarizer() {
    const [state, setState] = useState<AIState<LectureSummary>>({
        data: null,
        loading: false,
        error: null,
    });

    const summarize = useCallback(async (content: string, title?: string) => {
        setState({ data: null, loading: true, error: null });

        try {
            const result = await summarizeLecture({ content, title });
            const response = result.data as { success: boolean; summary: LectureSummary };

            if (response.success) {
                setState({ data: response.summary, loading: false, error: null });
                return response.summary;
            } else {
                throw new Error('Summarization failed');
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to summarize lecture';
            setState({ data: null, loading: false, error: message });
            throw error;
        }
    }, []);

    const reset = useCallback(() => {
        setState({ data: null, loading: false, error: null });
    }, []);

    return { ...state, summarize, reset };
}

export function useFlashcardGenerator() {
    const [state, setState] = useState<AIState<Flashcard[]>>({
        data: null,
        loading: false,
        error: null,
    });

    const generate = useCallback(async (content: string) => {
        setState({ data: null, loading: true, error: null });

        try {
            const result = await generateFlashcards({ content });
            const response = result.data as { success: boolean; flashcards: Flashcard[] };

            if (response.success) {
                setState({ data: response.flashcards, loading: false, error: null });
                return response.flashcards;
            } else {
                throw new Error('Generation failed');
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to generate flashcards';
            setState({ data: null, loading: false, error: message });
            throw error;
        }
    }, []);

    return { ...state, generate };
}

export function useQuizGenerator() {
    const [state, setState] = useState<AIState<{ title: string; questions: QuizQuestion[] }>>({
        data: null,
        loading: false,
        error: null,
    });

    const generate = useCallback(async (
        content: string,
        quizType: string = 'mixed',
        difficulty: string = 'medium',
        numQuestions: number = 10
    ) => {
        setState({ data: null, loading: true, error: null });

        try {
            const result = await generateQuiz({ content, quizType, difficulty, numQuestions });
            const response = result.data as { success: boolean; quiz: { title: string; questions: QuizQuestion[] } };

            if (response.success) {
                setState({ data: response.quiz, loading: false, error: null });
                return response.quiz;
            } else {
                throw new Error('Quiz generation failed');
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to generate quiz';
            setState({ data: null, loading: false, error: message });
            throw error;
        }
    }, []);

    return { ...state, generate };
}

// ============================================
// INTERVIEW COACH HOOK
// ============================================

export function useInterviewCoach() {
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [currentQuestion, setCurrentQuestion] = useState<InterviewQuestion | null>(null);
    const [feedback, setFeedback] = useState<AnswerFeedback | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const start = useCallback(async (
        role: string,
        type: 'behavioral' | 'technical' | 'mixed',
        difficulty: 'entry' | 'mid' | 'senior'
    ) => {
        setLoading(true);
        setError(null);

        try {
            const result = await startInterview({ role, type, difficulty });
            const response = result.data as {
                success: boolean;
                sessionId: string;
                firstQuestion: InterviewQuestion;
            };

            if (response.success) {
                setSessionId(response.sessionId);
                setCurrentQuestion(response.firstQuestion);
                setLoading(false);
                return response;
            } else {
                throw new Error('Failed to start interview');
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to start interview';
            setError(message);
            setLoading(false);
            throw err;
        }
    }, []);

    const submit = useCallback(async (answer: string) => {
        if (!sessionId) throw new Error('No active session');

        setLoading(true);
        setError(null);

        try {
            const result = await submitAnswer({ sessionId, answer });
            const response = result.data as {
                success: boolean;
                feedback: AnswerFeedback;
                nextQuestion: InterviewQuestion | null;
                isComplete: boolean;
            };

            if (response.success) {
                setFeedback(response.feedback);
                if (response.nextQuestion) {
                    setCurrentQuestion(response.nextQuestion);
                }
                setLoading(false);
                return response;
            } else {
                throw new Error('Failed to submit answer');
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to submit answer';
            setError(message);
            setLoading(false);
            throw err;
        }
    }, [sessionId]);

    const reset = useCallback(() => {
        setSessionId(null);
        setCurrentQuestion(null);
        setFeedback(null);
        setLoading(false);
        setError(null);
    }, []);

    return {
        sessionId,
        currentQuestion,
        feedback,
        loading,
        error,
        start,
        submit,
        reset,
    };
}
