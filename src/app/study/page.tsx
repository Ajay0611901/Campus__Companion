"use client";

import { useState } from "react";
import { useLectureSummarizer, useFlashcardGenerator, useQuizGenerator } from "@/hooks/useAI";
import type { LectureSummary, Flashcard, QuizQuestion } from "@/hooks/useAI";

type TabType = "summary" | "flashcards" | "quiz";
type InputMode = "text" | "file";

// Flashcard Component
function FlashcardViewer({ flashcards }: { flashcards: Flashcard[] }) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);

    const card = flashcards[currentIndex];

    return (
        <div>
            <div
                className="card"
                style={{
                    minHeight: '250px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                }}
                onClick={() => setIsFlipped(!isFlipped)}
            >
                <div style={{ textAlign: 'center', padding: '40px' }} className="animate-fade-in">
                    <div className="text-xs text-gray mb-4">{isFlipped ? 'Answer' : 'Question'}</div>
                    <p style={{ fontSize: '18px', fontWeight: '500' }}>
                        {isFlipped ? card.back : card.front}
                    </p>
                    <div className="mt-4 text-xs text-gray">Click to flip</div>
                </div>
            </div>

            <div className="flex items-center justify-between mt-4" style={{ marginTop: '16px' }}>
                <button
                    className="btn btn-secondary"
                    onClick={() => { setCurrentIndex(Math.max(0, currentIndex - 1)); setIsFlipped(false); }}
                    disabled={currentIndex === 0}
                >
                    ← Previous
                </button>
                <span className="text-sm text-gray">{currentIndex + 1} / {flashcards.length}</span>
                <button
                    className="btn btn-primary"
                    onClick={() => { setCurrentIndex(Math.min(flashcards.length - 1, currentIndex + 1)); setIsFlipped(false); }}
                    disabled={currentIndex === flashcards.length - 1}
                >
                    Next →
                </button>
            </div>
        </div>
    );
}

// Quiz Component
function QuizViewer({ questions }: { questions: QuizQuestion[] }) {
    const [currentQ, setCurrentQ] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
    const [showResult, setShowResult] = useState(false);
    const [score, setScore] = useState(0);

    const question = questions[currentQ];

    const handleAnswer = (answer: string) => {
        setSelectedAnswer(answer);
        if (answer === question.correctAnswer) {
            setScore(score + 1);
        }
        setShowResult(true);
    };

    const nextQuestion = () => {
        if (currentQ < questions.length - 1) {
            setCurrentQ(currentQ + 1);
            setSelectedAnswer(null);
            setShowResult(false);
        }
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-4" style={{ marginBottom: '24px' }}>
                <span className="text-sm text-gray">Question {currentQ + 1} of {questions.length}</span>
                <span className="tag primary">Score: {score}/{questions.length}</span>
            </div>

            <div className="card" style={{ marginBottom: '24px' }}>
                <div className={`tag ${question.difficulty === 'easy' ? 'success' : question.difficulty === 'medium' ? 'warning' : 'danger'} mb-4`}>
                    {question.difficulty}
                </div>
                <h3 style={{ fontSize: '18px', marginBottom: '24px' }}>{question.question}</h3>

                <div className="flex flex-col gap-2">
                    {question.options?.map((option, index) => {
                        const isCorrect = option === question.correctAnswer;
                        const isSelected = option === selectedAnswer;

                        let bgColor = 'var(--bg-tertiary)';
                        if (showResult && isCorrect) bgColor = 'rgba(16, 185, 129, 0.2)';
                        else if (showResult && isSelected && !isCorrect) bgColor = 'rgba(244, 63, 94, 0.2)';

                        return (
                            <button
                                key={index}
                                className="text-sm"
                                style={{
                                    padding: '16px',
                                    background: bgColor,
                                    border: `1px solid ${showResult && isCorrect ? '#10b981' : 'var(--glass-border)'}`,
                                    borderRadius: '12px',
                                    textAlign: 'left',
                                    cursor: showResult ? 'default' : 'pointer',
                                    color: 'var(--gray-100)'
                                }}
                                onClick={() => !showResult && handleAnswer(option)}
                                disabled={showResult}
                            >
                                {option}
                            </button>
                        );
                    })}
                </div>

                {showResult && (
                    <div className="mt-4 animate-fade-in" style={{ marginTop: '24px', padding: '16px', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '12px' }}>
                        <p className="text-sm">💡 {question.explanation}</p>
                    </div>
                )}
            </div>

            {showResult && currentQ < questions.length - 1 && (
                <button className="btn btn-primary" style={{ width: '100%' }} onClick={nextQuestion}>
                    Next Question →
                </button>
            )}

            {showResult && currentQ === questions.length - 1 && (
                <div className="card" style={{ textAlign: 'center', padding: '32px' }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎉</div>
                    <h3 className="font-semibold" style={{ fontSize: '24px', marginBottom: '8px' }}>Quiz Complete!</h3>
                    <p className="text-gray">You scored {score} out of {questions.length}</p>
                </div>
            )}
        </div>
    );
}

export default function StudyPage() {
    const [inputMode, setInputMode] = useState<InputMode>("text");
    const [content, setContent] = useState("");
    const [activeTab, setActiveTab] = useState<TabType>("summary");
    const [fileName, setFileName] = useState<string | null>(null);
    const [transcribing, setTranscribing] = useState(false);
    const [transcribeError, setTranscribeError] = useState<string | null>(null);
    const [results, setResults] = useState<{
        summary: LectureSummary | null;
        flashcards: Flashcard[] | null;
        quiz: QuizQuestion[] | null;
    }>({ summary: null, flashcards: null, quiz: null });

    const summarizer = useLectureSummarizer();
    const flashcardGen = useFlashcardGenerator();
    const quizGen = useQuizGenerator();

    const isLoading = summarizer.loading || flashcardGen.loading || quizGen.loading;
    const hasResults = results.summary || results.flashcards || results.quiz;

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setTranscribeError(null);
        setFileName(file.name);

        // Check file type
        const validTypes = ['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/m4a', 'video/mp4', 'video/webm', 'video/quicktime'];
        if (!validTypes.some(type => file.type.includes(type.split('/')[1]))) {
            setTranscribeError("Please upload an audio (MP3, WAV, M4A) or video (MP4, WebM) file");
            setFileName(null);
            return;
        }

        if (file.size > 100 * 1024 * 1024) {
            setTranscribeError("File size must be less than 100MB");
            setFileName(null);
            return;
        }

        setTranscribing(true);

        // For now, show a message that transcription will happen via cloud function
        // In production, this would upload to Firebase Storage and trigger transcription
        setTimeout(() => {
            setContent(`[Uploaded: ${file.name}]\n\nNote: Audio/video transcription requires Firebase setup. For now, please paste the transcript or lecture notes below, or use a transcription service like Otter.ai, Whisper, or YouTube's auto-captions.`);
            setTranscribing(false);
        }, 1000);
    };

    const handleProcess = async () => {
        if (!content.trim()) return;

        try {
            // Generate all three in parallel
            const [summaryResult, flashcardsResult, quizResult] = await Promise.all([
                summarizer.summarize(content).catch(() => null),
                flashcardGen.generate(content).catch(() => null),
                quizGen.generate(content).catch(() => null),
            ]);

            setResults({
                summary: summaryResult,
                flashcards: flashcardsResult,
                quiz: quizResult?.questions || null,
            });
        } catch {
            // Errors handled by hooks
        }
    };

    const error = summarizer.error || flashcardGen.error || quizGen.error || transcribeError;

    return (
        <div className="animate-fade-in">
            {/* Page Header */}
            <div className="page-header">
                <h1 className="page-title">📚 AI Study Tools</h1>
                <p className="page-subtitle">
                    Transform lecture notes, recordings, or textbook content into summaries, flashcards, and quizzes with AI.
                </p>
            </div>

            {!hasResults ? (
                <div className="grid" style={{ gridTemplateColumns: "2fr 1fr", gap: "24px" }}>
                    <div className="card">
                        <h3 className="card-title mb-4">Your Lecture Content</h3>

                        {/* Mode Toggle */}
                        <div className="flex gap-2 mb-4" style={{ marginBottom: "24px" }}>
                            <button
                                className={`btn ${inputMode === 'text' ? 'btn-primary' : 'btn-secondary'}`}
                                onClick={() => setInputMode('text')}
                                style={{ flex: 1 }}
                            >
                                📝 Paste Notes
                            </button>
                            <button
                                className={`btn ${inputMode === 'file' ? 'btn-primary' : 'btn-secondary'}`}
                                onClick={() => setInputMode('file')}
                                style={{ flex: 1 }}
                            >
                                🎬 Upload Recording
                            </button>
                        </div>

                        {inputMode === "file" && (
                            <div className="form-group">
                                <label className="form-label">Lecture Recording</label>

                                <div
                                    className="card"
                                    style={{
                                        border: "2px dashed var(--glass-border)",
                                        background: "var(--bg-tertiary)",
                                        padding: "32px",
                                        textAlign: "center",
                                        cursor: "pointer",
                                        marginBottom: "16px"
                                    }}
                                    onClick={() => document.getElementById('audioUpload')?.click()}
                                >
                                    <input
                                        id="audioUpload"
                                        type="file"
                                        accept="audio/*,video/*"
                                        onChange={handleFileSelect}
                                        style={{ display: "none" }}
                                    />

                                    {transcribing ? (
                                        <>
                                            <div className="animate-pulse" style={{ fontSize: "48px", marginBottom: "16px" }}>🎙️</div>
                                            <p className="font-medium">Processing audio...</p>
                                        </>
                                    ) : fileName ? (
                                        <>
                                            <div style={{ fontSize: "48px", marginBottom: "16px" }}>✅</div>
                                            <p className="font-medium">{fileName}</p>
                                            <p className="text-sm text-gray">Click to change file</p>
                                        </>
                                    ) : (
                                        <>
                                            <div style={{ fontSize: "48px", marginBottom: "16px" }}>🎬</div>
                                            <p className="font-medium" style={{ marginBottom: "8px" }}>
                                                Upload lecture recording
                                            </p>
                                            <p className="text-sm text-gray">
                                                MP3, WAV, M4A, MP4, WebM • Max 100MB
                                            </p>
                                        </>
                                    )}
                                </div>

                                <div style={{
                                    padding: "12px 16px",
                                    background: "rgba(99, 102, 241, 0.1)",
                                    borderRadius: "12px",
                                    marginBottom: "16px"
                                }}>
                                    <p className="text-sm">
                                        💡 <strong>Tip:</strong> For best results, use a transcription service (Otter.ai, YouTube captions, or Whisper) and paste the transcript below.
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="form-group">
                            <label className="form-label">
                                {inputMode === "file" ? "Transcript / Notes" : "Lecture Notes"}
                            </label>
                            <textarea
                                className="form-textarea"
                                placeholder={inputMode === "file"
                                    ? "Paste audio transcript here, or type additional notes..."
                                    : "Paste lecture notes, textbook content, or any study material here..."
                                }
                                style={{ minHeight: inputMode === "file" ? '150px' : '300px' }}
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                            />
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
                            style={{ width: '100%' }}
                            onClick={handleProcess}
                            disabled={isLoading || transcribing || !content.trim()}
                        >
                            {isLoading ? (
                                <>
                                    <span className="animate-pulse">🧠</span>
                                    Processing with AI...
                                </>
                            ) : (
                                <>
                                    ✨ Generate Study Materials
                                </>
                            )}
                        </button>
                    </div>

                    {/* Tips Sidebar */}
                    <div>
                        <div className="card mb-4" style={{ marginBottom: "16px" }}>
                            <h4 className="card-title mb-4">💡 What You Can Upload</h4>
                            <ul className="text-sm text-gray" style={{ lineHeight: "1.8" }}>
                                <li>• Lecture notes or textbook excerpts</li>
                                <li>• Class recording transcripts</li>
                                <li>• YouTube video captions</li>
                                <li>• Meeting notes from Otter.ai</li>
                                <li>• Any text content to study</li>
                            </ul>
                        </div>

                        <div className="card">
                            <h4 className="card-title mb-4">🎯 What You&apos;ll Get</h4>
                            <ul className="text-sm text-gray" style={{ lineHeight: "1.8" }}>
                                <li>• 📝 Detailed Summary with key points</li>
                                <li>• 🃏 Interactive Flashcards</li>
                                <li>• ❓ Quiz with explanations</li>
                            </ul>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="animate-fade-in">
                    {/* Tabs */}
                    <div className="flex gap-2 mb-4" style={{ marginBottom: '24px' }}>
                        {[
                            { id: "summary" as const, icon: "📝", label: "Summary", disabled: !results.summary },
                            { id: "flashcards" as const, icon: "🃏", label: "Flashcards", disabled: !results.flashcards },
                            { id: "quiz" as const, icon: "❓", label: "Quiz", disabled: !results.quiz },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                className={`btn ${activeTab === tab.id ? 'btn-primary' : 'btn-secondary'}`}
                                onClick={() => setActiveTab(tab.id)}
                                disabled={tab.disabled}
                            >
                                {tab.icon} {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Tab Content */}
                    {activeTab === "summary" && results.summary && (
                        <div className="animate-fade-in">
                            <div className="card mb-4" style={{ marginBottom: '24px' }}>
                                <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '8px' }}>{results.summary.title}</h2>
                                <p className="text-sm text-gray mb-4" style={{ marginBottom: '24px' }}>{results.summary.brief}</p>
                                <p className="text-sm">{results.summary.detailed}</p>
                            </div>

                            <div className="grid grid-cols-2" style={{ gap: '24px' }}>
                                <div className="card">
                                    <h3 className="card-title mb-4">🎯 Key Points</h3>
                                    <ul style={{ listStyle: 'none' }}>
                                        {results.summary.keyPoints.map((point, i) => (
                                            <li key={i} className="flex gap-2 mb-4 text-sm">
                                                <span style={{ color: '#10b981' }}>•</span>
                                                {point}
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <div className="card">
                                    <h3 className="card-title mb-4">📖 Key Concepts</h3>
                                    {results.summary.concepts.map((concept, i) => (
                                        <div key={i} style={{ padding: '12px 0', borderBottom: i < results.summary!.concepts.length - 1 ? '1px solid var(--glass-border)' : 'none' }}>
                                            <div className="flex items-center gap-2 mb-4">
                                                <span className="font-medium text-sm">{concept.term}</span>
                                                <span className={`tag ${concept.importance === 'critical' ? 'danger' : 'warning'}`} style={{ fontSize: '10px' }}>
                                                    {concept.importance}
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray">{concept.definition}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === "flashcards" && results.flashcards && (
                        <FlashcardViewer flashcards={results.flashcards} />
                    )}

                    {activeTab === "quiz" && results.quiz && (
                        <QuizViewer questions={results.quiz} />
                    )}

                    <button
                        className="btn btn-secondary mt-6"
                        onClick={() => {
                            setResults({ summary: null, flashcards: null, quiz: null });
                            setContent("");
                            setFileName(null);
                        }}
                        style={{ marginTop: '24px' }}
                    >
                        ← Process New Content
                    </button>
                </div>
            )}
        </div>
    );
}
