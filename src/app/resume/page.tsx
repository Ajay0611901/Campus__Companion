"use client";

import { useState, useRef } from "react";
import { useResumeAnalyzer } from "@/hooks/useAI";
import { extractTextFromPDF, isValidPDF, formatFileSize } from "@/lib/pdfParser";

type InputMode = "upload" | "paste";

export default function ResumePage() {
    const [mode, setMode] = useState<InputMode>("upload");
    const [resumeText, setResumeText] = useState("");
    const [targetRole, setTargetRole] = useState("");
    const [fileName, setFileName] = useState<string | null>(null);
    const [fileSize, setFileSize] = useState<string | null>(null);
    const [parsing, setParsing] = useState(false);
    const [parseError, setParseError] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { data: analysis, loading, error, analyze, reset } = useResumeAnalyzer();

    const handleFileDrop = async (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);

        const file = e.dataTransfer.files[0];
        if (file) {
            await processFile(file);
        }
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            await processFile(file);
        }
    };

    const processFile = async (file: File) => {
        setParseError(null);

        if (!isValidPDF(file)) {
            setParseError("Please upload a PDF file");
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            setParseError("File size must be less than 10MB");
            return;
        }

        setParsing(true);
        setFileName(file.name);
        setFileSize(formatFileSize(file.size));

        try {
            const text = await extractTextFromPDF(file);
            if (text.length < 100) {
                setParseError("Could not extract enough text from PDF. Please try pasting the text directly.");
                setParsing(false);
                return;
            }
            setResumeText(text);
            setParsing(false);
        } catch (err) {
            setParseError(err instanceof Error ? err.message : "Failed to parse PDF");
            setParsing(false);
        }
    };

    const handleAnalyze = async () => {
        if (!resumeText.trim() || !targetRole.trim()) return;

        try {
            await analyze(resumeText, targetRole);
        } catch {
            // Error is handled by the hook
        }
    };

    const clearFile = () => {
        setResumeText("");
        setFileName(null);
        setFileSize(null);
        setParseError(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const getScoreColor = (score: number) => {
        if (score >= 75) return "#10b981";
        if (score >= 50) return "#f59e0b";
        return "#ef4444";
    };

    return (
        <div className="animate-fade-in">
            {/* Page Header */}
            <div className="page-header">
                <h1 className="page-title">📄 AI Resume Analyzer</h1>
                <p className="page-subtitle">
                    Upload your resume PDF or paste text for instant AI-powered feedback with ATS scoring.
                </p>
            </div>

            {!analysis ? (
                <div className="grid" style={{ gridTemplateColumns: "2fr 1fr", gap: "24px" }}>
                    {/* Resume Input */}
                    <div className="card">
                        <h3 className="card-title mb-4">Your Resume</h3>

                        {/* Mode Toggle */}
                        <div className="flex gap-2 mb-4" style={{ marginBottom: "24px" }}>
                            <button
                                className={`btn ${mode === 'upload' ? 'btn-primary' : 'btn-secondary'}`}
                                onClick={() => { setMode('upload'); clearFile(); }}
                                style={{ flex: 1 }}
                            >
                                📤 Upload PDF
                            </button>
                            <button
                                className={`btn ${mode === 'paste' ? 'btn-primary' : 'btn-secondary'}`}
                                onClick={() => { setMode('paste'); clearFile(); }}
                                style={{ flex: 1 }}
                            >
                                📝 Paste Text
                            </button>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Target Role</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="e.g., Software Engineer, Data Analyst, Product Manager"
                                value={targetRole}
                                onChange={(e) => setTargetRole(e.target.value)}
                            />
                        </div>

                        {mode === "upload" ? (
                            <div className="form-group">
                                <label className="form-label">Resume PDF</label>

                                {/* Hidden file input */}
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".pdf,application/pdf"
                                    onChange={handleFileSelect}
                                    style={{ display: "none" }}
                                />

                                {!fileName ? (
                                    /* Drop Zone */
                                    <div
                                        className={`card ${isDragging ? 'dragging' : ''}`}
                                        style={{
                                            border: `2px dashed ${isDragging ? 'var(--primary)' : 'var(--glass-border)'}`,
                                            background: isDragging ? 'rgba(99, 102, 241, 0.1)' : 'var(--bg-tertiary)',
                                            padding: "48px",
                                            textAlign: "center",
                                            cursor: "pointer",
                                            transition: "all 0.3s ease"
                                        }}
                                        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                                        onDragLeave={() => setIsDragging(false)}
                                        onDrop={handleFileDrop}
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        {parsing ? (
                                            <>
                                                <div className="animate-pulse" style={{ fontSize: "48px", marginBottom: "16px" }}>📄</div>
                                                <p className="font-medium">Extracting text from PDF...</p>
                                            </>
                                        ) : (
                                            <>
                                                <div style={{ fontSize: "48px", marginBottom: "16px" }}>📤</div>
                                                <p className="font-medium" style={{ marginBottom: "8px" }}>
                                                    Drop your resume PDF here
                                                </p>
                                                <p className="text-sm text-gray">
                                                    or click to browse • Max 10MB
                                                </p>
                                            </>
                                        )}
                                    </div>
                                ) : (
                                    /* File Preview */
                                    <div
                                        className="card"
                                        style={{
                                            background: 'var(--bg-tertiary)',
                                            padding: "20px",
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "16px"
                                        }}
                                    >
                                        <div style={{ fontSize: "32px" }}>📄</div>
                                        <div style={{ flex: 1 }}>
                                            <p className="font-medium text-sm">{fileName}</p>
                                            <p className="text-xs text-gray">{fileSize} • {resumeText.length.toLocaleString()} characters extracted</p>
                                        </div>
                                        <button
                                            className="btn btn-secondary"
                                            style={{ padding: "8px 12px" }}
                                            onClick={clearFile}
                                        >
                                            ✕
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="form-group">
                                <label className="form-label">Resume Content</label>
                                <textarea
                                    className="form-textarea"
                                    placeholder="Paste your entire resume text here..."
                                    style={{ minHeight: "300px" }}
                                    value={resumeText}
                                    onChange={(e) => setResumeText(e.target.value)}
                                />
                            </div>
                        )}

                        {/* Errors */}
                        {(error || parseError) && (
                            <div className="mb-4" style={{
                                padding: "12px 16px",
                                background: "rgba(239, 68, 68, 0.1)",
                                border: "1px solid rgba(239, 68, 68, 0.3)",
                                borderRadius: "12px",
                                color: "#ef4444"
                            }}>
                                ⚠️ {error || parseError}
                            </div>
                        )}

                        <button
                            className="btn btn-primary"
                            style={{ width: "100%" }}
                            onClick={handleAnalyze}
                            disabled={loading || parsing || !resumeText.trim() || !targetRole.trim()}
                        >
                            {loading ? (
                                <>
                                    <span className="spinner-icon" style={{
                                        display: 'inline-block',
                                        marginRight: '8px',
                                        animation: 'spin 1s linear infinite'
                                    }}>⏳</span>
                                    Analyzing...
                                </>
                            ) : (
                                <>
                                    ✨ Analyze Resume
                                </>
                            )}
                        </button>
                    </div>

                    {/* Tips */}
                    <div>
                        <div className="card mb-4" style={{ marginBottom: "16px" }}>
                            <h4 className="card-title mb-4">💡 Tips for Best Results</h4>
                            <ul className="text-sm text-gray" style={{ lineHeight: "1.8" }}>
                                <li>• Upload a single-page or multi-page PDF</li>
                                <li>• Text-based PDFs work best (not scanned images)</li>
                                <li>• Be specific about your target role</li>
                                <li>• Include all sections (experience, skills, education)</li>
                            </ul>
                        </div>

                        <div className="card">
                            <h4 className="card-title mb-4">🎯 What You&apos;ll Get</h4>
                            <ul className="text-sm text-gray" style={{ lineHeight: "1.8" }}>
                                <li>• ATS Compatibility Score (0-100)</li>
                                <li>• Identified Strengths</li>
                                <li>• Missing Skills Analysis</li>
                                <li>• Actionable Improvements</li>
                            </ul>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="animate-fade-in">
                    {/* Score Header */}
                    <div className="card mb-4" style={{ marginBottom: "24px" }}>
                        <div className="flex items-center gap-4" style={{ gap: "24px" }}>
                            <div
                                className="score-ring"
                                style={{
                                    width: "120px",
                                    height: "120px",
                                    background: `conic-gradient(${getScoreColor(analysis.score)} ${analysis.score * 3.6}deg, var(--bg-tertiary) 0deg)`,
                                    borderRadius: "50%",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    position: "relative"
                                }}
                            >
                                <div style={{
                                    width: "90px",
                                    height: "90px",
                                    borderRadius: "50%",
                                    background: "var(--bg-primary)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    flexDirection: "column"
                                }}>
                                    <span style={{ fontSize: "28px", fontWeight: "700", color: getScoreColor(analysis.score) }}>
                                        {analysis.score}
                                    </span>
                                    <span className="text-xs text-gray">ATS Score</span>
                                </div>
                            </div>

                            <div style={{ flex: 1 }}>
                                <h2 style={{ fontSize: "24px", fontWeight: "700", marginBottom: "8px" }}>
                                    Resume Analysis Complete
                                </h2>
                                <p className="text-gray">
                                    Target Role: {targetRole}
                                    {fileName && <> • Source: {fileName}</>}
                                </p>
                                <div className="flex gap-2 mt-4" style={{ marginTop: "16px" }}>
                                    <span className={`tag ${analysis.score >= 75 ? 'success' : analysis.score >= 50 ? 'warning' : 'danger'}`}>
                                        {analysis.score >= 75 ? 'Strong Resume' : analysis.score >= 50 ? 'Needs Improvement' : 'Major Work Needed'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Results Grid */}
                    <div className="grid grid-cols-2" style={{ gap: "24px", marginBottom: "24px" }}>
                        {/* Strengths */}
                        <div className="card">
                            <h3 className="card-title mb-4" style={{ color: "#10b981" }}>
                                ✓ Strengths
                            </h3>
                            <ul style={{ listStyle: "none" }}>
                                {analysis.strengths.map((strength, i) => (
                                    <li key={i} className="flex gap-2 mb-4 text-sm" style={{ marginBottom: "12px" }}>
                                        <span style={{ color: "#10b981" }}>•</span>
                                        {strength}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Missing Skills */}
                        <div className="card">
                            <h3 className="card-title mb-4" style={{ color: "#f59e0b" }}>
                                ⚠ Missing Skills
                            </h3>
                            <div className="flex gap-2" style={{ flexWrap: "wrap" }}>
                                {analysis.missingSkills.map((skill, i) => (
                                    <span key={i} className="tag warning">{skill}</span>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Suggestions */}
                    <div className="card mb-4" style={{ marginBottom: "24px" }}>
                        <h3 className="card-title mb-4">💡 AI Improvement Suggestions</h3>
                        <div className="flex flex-col gap-4">
                            {analysis.suggestions.map((suggestion, i) => (
                                <div
                                    key={i}
                                    style={{
                                        padding: "16px",
                                        background: "var(--bg-tertiary)",
                                        borderRadius: "12px",
                                        borderLeft: "4px solid var(--primary)"
                                    }}
                                >
                                    <div className="flex items-start gap-4">
                                        <span className="tag primary">{i + 1}</span>
                                        <p className="text-sm">{suggestion}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-4">
                        <button
                            className="btn btn-secondary"
                            onClick={() => {
                                reset();
                                clearFile();
                                setTargetRole("");
                            }}
                        >
                            ← Analyze Another Resume
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
