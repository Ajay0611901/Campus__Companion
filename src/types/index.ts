// AI Campus Companion - Core TypeScript Interfaces

// ============================================
// USER MODEL
// ============================================
export interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  createdAt: Date;
  updatedAt: Date;
  
  // Profile Information
  profile: {
    interests: string[];
    careerGoal: string;
    currentLevel: 'high_school' | 'undergraduate' | 'graduate' | 'professional';
    targetRoles: string[];
    skills: string[];
    grade?: string;
  };
  
  // Gamification Stats
  stats: {
    resumeScore: number;
    skillProgress: number;
    interviewReadiness: number;
    streakDays: number;
    totalBadges: number;
    xp: number;
    level: number;
  };
}

// ============================================
// AI RESULT CACHE
// ============================================
export interface AIResult {
  id: string;
  userId: string;
  type: 'resume_analysis' | 'skill_recommendation' | 'lecture_summary' | 'quiz' | 'interview_evaluation';
  inputHash: string; // Hash of input to detect duplicates
  prompt: string;
  response: unknown;
  model: string;
  tokensUsed: number;
  createdAt: Date;
  expiresAt: Date;
}

// ============================================
// RESUME MODELS
// ============================================
export interface Resume {
  id: string;
  userId: string;
  content: string;
  targetRole: string;
  createdAt: Date;
  updatedAt: Date;
  
  // Latest Analysis
  analysis?: ResumeAnalysis;
}

export interface ResumeAnalysis {
  atsScore: number;
  overallFeedback: string;
  
  // Detailed Scores
  scores: {
    formatting: number;
    keywords: number;
    experience: number;
    skills: number;
    education: number;
  };
  
  // AI Insights
  missingSkills: string[];
  strongPoints: string[];
  improvements: BulletImprovement[];
  suggestedSections: SectionSuggestion[];
  
  // Career Match
  roleMatch: {
    score: number;
    reasoning: string;
    alternativeRoles: string[];
  };
}

export interface BulletImprovement {
  original: string;
  improved: string;
  reason: string;
}

export interface SectionSuggestion {
  section: string;
  content: string;
  priority: 'high' | 'medium' | 'low';
}

// ============================================
// SKILL RECOMMENDATION MODELS
// ============================================
export interface Recommendation {
  id: string;
  userId: string;
  createdAt: Date;
  
  // Input Context
  context: {
    interests: string[];
    careerGoal: string;
    currentSkills: string[];
    grade: string;
  };
  
  // AI Generated Roadmap
  roadmap: SkillRoadmap;
}

export interface SkillRoadmap {
  summary: string;
  timeline: string;
  
  phases: RoadmapPhase[];
  
  // Resources
  courses: CourseRecommendation[];
  projects: ProjectIdea[];
}

export interface RoadmapPhase {
  name: string;
  duration: string;
  skills: SkillItem[];
  milestone: string;
}

export interface SkillItem {
  name: string;
  priority: 'essential' | 'recommended' | 'optional';
  reason: string;
  resources: string[];
}

export interface CourseRecommendation {
  title: string;
  platform: string;
  url?: string;
  reason: string;
  duration: string;
}

export interface ProjectIdea {
  title: string;
  description: string;
  skills: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: string;
}

// ============================================
// STUDY TOOLS MODELS
// ============================================
export interface LectureSummary {
  id: string;
  userId: string;
  title: string;
  originalContent: string;
  createdAt: Date;
  
  // AI Generated
  summary: {
    brief: string;
    detailed: string;
    keyPoints: string[];
    concepts: Concept[];
  };
  
  // Study Materials
  flashcards: Flashcard[];
  quiz: Quiz;
}

export interface Concept {
  term: string;
  definition: string;
  importance: 'critical' | 'important' | 'supplementary';
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  difficulty: number;
  lastReviewed?: Date;
  nextReview?: Date;
}

export interface Quiz {
  id: string;
  questions: QuizQuestion[];
}

export interface QuizQuestion {
  id: string;
  type: 'mcq' | 'short_answer' | 'true_false';
  question: string;
  options?: string[];
  correctAnswer: string;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

// ============================================
// INTERVIEW SESSION MODELS
// ============================================
export interface InterviewSession {
  id: string;
  userId: string;
  role: string;
  type: 'behavioral' | 'technical' | 'mixed';
  difficulty: 'entry' | 'mid' | 'senior';
  createdAt: Date;
  completedAt?: Date;
  
  // Session Data
  exchanges: InterviewExchange[];
  
  // Overall Evaluation
  evaluation?: InterviewEvaluation;
}

export interface InterviewExchange {
  id: string;
  question: string;
  questionType: 'behavioral' | 'technical' | 'situational';
  userAnswer: string;
  
  // AI Evaluation
  feedback: {
    score: number;
    starAnalysis?: STARAnalysis;
    technicalAccuracy?: number;
    communicationScore: number;
    improvements: string[];
    strengths: string[];
  };
  
  followUpQuestion?: string;
}

export interface STARAnalysis {
  situation: { present: boolean; feedback: string };
  task: { present: boolean; feedback: string };
  action: { present: boolean; feedback: string };
  result: { present: boolean; feedback: string };
}

export interface InterviewEvaluation {
  overallScore: number;
  readinessLevel: 'not_ready' | 'needs_practice' | 'almost_ready' | 'ready';
  
  summary: string;
  
  categoryScores: {
    communication: number;
    technicalKnowledge: number;
    problemSolving: number;
    behavioralResponses: number;
  };
  
  recommendations: string[];
  practiceAreas: string[];
}

// ============================================
// GAMIFICATION MODELS
// ============================================
export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'resume' | 'skills' | 'interview' | 'study' | 'streak';
  requirement: string;
  xpReward: number;
}

export interface UserBadge {
  badgeId: string;
  earnedAt: Date;
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  type: 'daily' | 'weekly' | 'milestone';
  xpReward: number;
  requirement: {
    action: string;
    target: number;
    current: number;
  };
  expiresAt?: Date;
}

// ============================================
// API REQUEST/RESPONSE TYPES
// ============================================
export interface AnalyzeResumeRequest {
  resumeText: string;
  targetRole: string;
}

export interface AnalyzeResumeResponse {
  success: boolean;
  analysis: ResumeAnalysis;
  cached: boolean;
}

export interface GetSkillRecommendationsRequest {
  interests: string[];
  careerGoal: string;
  currentSkills: string[];
  grade: string;
}

export interface GetSkillRecommendationsResponse {
  success: boolean;
  roadmap: SkillRoadmap;
}

export interface SummarizeLectureRequest {
  content: string;
  title?: string;
  generateQuiz: boolean;
  generateFlashcards: boolean;
}

export interface SummarizeLectureResponse {
  success: boolean;
  summary: LectureSummary['summary'];
  flashcards?: Flashcard[];
  quiz?: Quiz;
}

export interface StartInterviewRequest {
  role: string;
  type: 'behavioral' | 'technical' | 'mixed';
  difficulty: 'entry' | 'mid' | 'senior';
}

export interface SubmitAnswerRequest {
  sessionId: string;
  exchangeId: string;
  answer: string;
}

export interface SubmitAnswerResponse {
  success: boolean;
  feedback: InterviewExchange['feedback'];
  followUpQuestion?: string;
  isComplete: boolean;
}
