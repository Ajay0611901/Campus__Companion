"use client";

import { useState } from "react";
import { useInterviewCoach } from "@/hooks/useAI";

// STAR Analysis Component
function STARAnalysis({ analysis }: {
    analysis: {
        situation: { present: boolean; score: number; feedback: string };
        task: { present: boolean; score: number; feedback: string };
        action: { present: boolean; score: number; feedback: string };
        result: { present: boolean; score: number; feedback: string };
    }
}) {
    const items = [
        { key: 'situation', label: 'Situation', icon: '📍' },
        { key: 'task', label: 'Task', icon: '🎯' },
        { key: 'action', label: 'Action', icon: '⚡' },
        { key: 'result', label: 'Result', icon: '🏆' },
    ] as const;

    return (
        <div className="grid grid-cols-2" style={{ gap: '16px' }}>
            {items.map((item) => {
                const data = analysis[item.key];
                return (
                    <div
                        key={item.key}
                        className="card"
                        style={{
                            padding: '16px',
                            borderColor: data.present ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)'
                        }}
                    >
                        <div className="flex items-center gap-2 mb-4">
                            <span>{item.icon}</span>
                            <span className="font-semibold">{item.label}</span>
                            <span className={`tag ${data.present ? 'success' : 'danger'}`}>
                                {data.score}%
                            </span>
                        </div>
                        <p className="text-xs text-gray">{data.feedback}</p>
                    </div>
                );
            })}
        </div>
    );
}

import { useUserProfile } from "@/hooks/useUserProfile";

export default function InterviewPage() {
    const [role, setRole] = useState("");
    const [type, setType] = useState<"behavioral" | "technical" | "mixed">("behavioral");
    const [difficulty, setDifficulty] = useState<"entry" | "mid" | "senior">("entry");
    const [userAnswer, setUserAnswer] = useState("");
    const [sessionComplete, setSessionComplete] = useState(false);
    const { addXP } = useUserProfile();

    const {
        sessionId,
        currentQuestion,
        feedback,
        loading,
        error,
        start,
        submit,
        reset
    } = useInterviewCoach();

    const handleStart = async () => {
        if (!role.trim()) return;
        try {
            await start(role, type, difficulty);
        } catch {
            // Error handled by hook
        }
    };

    const handleSubmitAnswer = async () => {
        if (!userAnswer.trim()) return;

        try {
            const result = await submit(userAnswer);
            if (result.isComplete) {
                setSessionComplete(true);
                // Award XP for completing the interview
                await addXP(50);
            }
            setUserAnswer("");
        } catch {
            // Error handled by hook
        }
    };

    // Start Screen
    if (!sessionId) {
        return (
            <div className="animate-fade-in">
                <div className="page-header">
                    <h1 className="page-title">🎤 AI Interview Coach</h1>
                    <p className="page-subtitle">
                        Practice interviews with AI feedback using the STAR method. Get real-time evaluation and improvement tips.
                    </p>
                </div>

                <div className="card" style={{ maxWidth: '500px' }}>
                    <h3 className="card-title mb-4">Start Mock Interview</h3>

                    <div className="form-group">
                        <label className="form-label">Target Role</label>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="e.g., Software Engineer, Product Manager"
                            value={role}
                            onChange={(e) => setRole(e.target.value)}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Interview Type</label>
                        <div className="flex gap-2">
                            {(["behavioral", "technical", "mixed"] as const).map((t) => (
                                <button
                                    key={t}
                                    className={`btn ${type === t ? 'btn-primary' : 'btn-secondary'}`}
                                    style={{ flex: 1, textTransform: 'capitalize' }}
                                    onClick={() => setType(t)}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Difficulty</label>
                        <div className="flex gap-2">
                            {[
                                { id: "entry" as const, label: "Entry" },
                                { id: "mid" as const, label: "Mid-Level" },
                                { id: "senior" as const, label: "Senior" },
                            ].map((d) => (
                                <button
                                    key={d.id}
                                    className={`btn ${difficulty === d.id ? 'btn-primary' : 'btn-secondary'}`}
                                    style={{ flex: 1 }}
                                    onClick={() => setDifficulty(d.id)}
                                >
                                    {d.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {error && (
                        <div className="mb-4" style={{
                            padding: "12px 16px",
                            background: "rgba(239, 68, 68, 0.1)",
                            borderRadius: "12px",
                            color: "#ef4444"
                        }}>
                            ⚠️ {error}
                        </div>
                    )}

                    <button
                        className="btn btn-primary"
                        style={{ width: '100%', marginTop: '16px' }}
                        onClick={handleStart}
                        disabled={loading || !role.trim()}
                    >
                        {loading ? (
                            <>
                                <span className="animate-pulse">🧠</span>
                                Starting Interview...
                            </>
                        ) : (
                            <>
                                🎯 Start Interview
                            </>
                        )}
                    </button>
                </div>
            </div>
        );
    }

    // Session Complete
    if (sessionComplete) {
        return (
            <div className="animate-fade-in" style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
                <div className="card" style={{ padding: '48px' }}>
                    <div style={{ fontSize: '64px', marginBottom: '24px' }}>🎉</div>
                    <h2 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '16px' }}>Interview Complete!</h2>
                    <p className="text-gray mb-4" style={{ marginBottom: '32px' }}>
                        Great practice session! Review your feedback above.
                    </p>

                    <button
                        className="btn btn-primary"
                        onClick={() => {
                            reset();
                            setRole("");
                            setSessionComplete(false);
                        }}
                    >
                        Start New Interview
                    </button>
                </div>
            </div>
        );
    }

    // Interview Session
    return (
        <div className="animate-fade-in">
            <div className="page-header">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="page-title">🎤 Interview in Progress</h1>
                        <p className="page-subtitle">Role: {role} • {type} • {difficulty}</p>
                    </div>
                </div>
            </div>

            <div className="grid" style={{ gridTemplateColumns: feedback ? '1fr 1fr' : '1fr', gap: '24px' }}>
                {/* Question & Answer */}
                <div>
                    {currentQuestion && (
                        <div className="card mb-4" style={{ marginBottom: '24px' }}>
                            <div className="flex items-center gap-2 mb-4">
                                <span className={`tag ${currentQuestion.type === 'behavioral' ? 'primary' : 'warning'}`}>
                                    {currentQuestion.type}
                                </span>
                                <span className="text-xs text-gray">{currentQuestion.topic}</span>
                            </div>
                            <h3 style={{ fontSize: '20px', fontWeight: '600', lineHeight: '1.5' }}>
                                {currentQuestion.question}
                            </h3>
                        </div>
                    )}

                    <div className="card">
                        <label className="form-label">Your Answer</label>
                        <textarea
                            className="form-textarea"
                            placeholder="Type your answer here. Use the STAR method: Situation, Task, Action, Result..."
                            style={{ minHeight: '200px' }}
                            value={userAnswer}
                            onChange={(e) => setUserAnswer(e.target.value)}
                            disabled={loading}
                        />

                        {error && (
                            <div className="mt-4" style={{
                                padding: "12px 16px",
                                background: "rgba(239, 68, 68, 0.1)",
                                borderRadius: "12px",
                                color: "#ef4444"
                            }}>
                                ⚠️ {error}
                            </div>
                        )}

                        <button
                            className="btn btn-primary"
                            style={{ width: '100%', marginTop: '16px' }}
                            onClick={handleSubmitAnswer}
                            disabled={loading || !userAnswer.trim()}
                        >
                            {loading ? (
                                <>
                                    <span className="animate-pulse">🧠</span>
                                    Evaluating...
                                </>
                            ) : (
                                <>
                                    Submit Answer
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Feedback */}
                {feedback && (
                    <div className="animate-fade-in">
                        {/* Score */}
                        <div className="card mb-4" style={{ marginBottom: '24px' }}>
                            <div className="flex items-center gap-4">
                                <div
                                    style={{
                                        width: '80px',
                                        height: '80px',
                                        borderRadius: '50%',
                                        background: 'var(--gradient-primary)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '28px',
                                        fontWeight: '700'
                                    }}
                                >
                                    {feedback.score}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <h4 className="font-semibold mb-4">AI Feedback</h4>
                                    <p className="text-sm text-gray">{feedback.overallFeedback}</p>
                                </div>
                            </div>
                        </div>

                        {/* STAR Analysis */}
                        {feedback.starAnalysis && (
                            <div className="mb-4" style={{ marginBottom: '24px' }}>
                                <h4 className="font-semibold mb-4" style={{ marginBottom: '12px' }}>STAR Method Analysis</h4>
                                <STARAnalysis analysis={feedback.starAnalysis} />
                            </div>
                        )}

                        {/* Strengths & Improvements */}
                        <div className="grid grid-cols-2" style={{ gap: '16px', marginBottom: '24px' }}>
                            <div className="card" style={{ padding: '16px' }}>
                                <h4 className="font-semibold mb-4 text-sm" style={{ color: '#10b981' }}>✓ Strengths</h4>
                                {feedback.strengths.map((s, i) => (
                                    <p key={i} className="text-xs text-gray mb-4" style={{ marginBottom: '4px' }}>• {s}</p>
                                ))}
                            </div>
                            <div className="card" style={{ padding: '16px' }}>
                                <h4 className="font-semibold mb-4 text-sm" style={{ color: '#f59e0b' }}>↑ Improve</h4>
                                {feedback.improvements.map((s, i) => (
                                    <p key={i} className="text-xs text-gray mb-4" style={{ marginBottom: '4px' }}>• {s}</p>
                                ))}
                            </div>
                        </div>

                        {/* Model Answer */}
                        <div className="card" style={{ background: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.3)' }}>
                            <h4 className="font-semibold mb-4 text-sm">💡 Example Strong Answer</h4>
                            <p className="text-sm">{feedback.modelAnswer}</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
