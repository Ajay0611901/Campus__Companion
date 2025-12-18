"use client";

import { useState } from "react";
import { useSkillRecommender } from "@/hooks/useAI";

export default function SkillsPage() {
    const [interests, setInterests] = useState<string[]>([]);
    const [interestInput, setInterestInput] = useState("");
    const [careerGoal, setCareerGoal] = useState("");
    const [currentSkills, setCurrentSkills] = useState<string[]>([]);
    const [skillInput, setSkillInput] = useState("");
    const [grade, setGrade] = useState("undergraduate");

    const { data: roadmap, loading, error, getRecommendations, reset } = useSkillRecommender();

    const addInterest = () => {
        if (interestInput.trim() && !interests.includes(interestInput.trim())) {
            setInterests([...interests, interestInput.trim()]);
            setInterestInput("");
        }
    };

    const addSkill = () => {
        if (skillInput.trim() && !currentSkills.includes(skillInput.trim())) {
            setCurrentSkills([...currentSkills, skillInput.trim()]);
            setSkillInput("");
        }
    };

    const handleGenerate = async () => {
        if (interests.length === 0 || !careerGoal.trim()) return;

        try {
            await getRecommendations(interests, careerGoal, currentSkills, grade);
        } catch {
            // Error handled by hook
        }
    };

    return (
        <div className="animate-fade-in">
            {/* Page Header */}
            <div className="page-header">
                <h1 className="page-title">🎯 AI Skill Roadmap</h1>
                <p className="page-subtitle">
                    Get a personalized learning path powered by AI based on your career goals and current skills.
                </p>
            </div>

            {!roadmap ? (
                <div className="card" style={{ maxWidth: "700px" }}>
                    <h3 className="card-title mb-4">Tell Us About Your Goals</h3>

                    <div className="form-group">
                        <label className="form-label">Career Goal</label>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="e.g., Machine Learning Engineer, Full-Stack Developer"
                            value={careerGoal}
                            onChange={(e) => setCareerGoal(e.target.value)}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Interests</label>
                        <div className="flex gap-2 mb-4" style={{ marginBottom: "8px" }}>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="Add an interest..."
                                value={interestInput}
                                onChange={(e) => setInterestInput(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && addInterest()}
                            />
                            <button className="btn btn-secondary" onClick={addInterest}>Add</button>
                        </div>
                        <div className="flex gap-2" style={{ flexWrap: "wrap" }}>
                            {interests.map((interest, i) => (
                                <span key={i} className="tag primary" style={{ cursor: "pointer" }} onClick={() => setInterests(interests.filter((_, j) => i !== j))}>
                                    {interest} ✕
                                </span>
                            ))}
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Current Skills (Optional)</label>
                        <div className="flex gap-2 mb-4" style={{ marginBottom: "8px" }}>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="Add a skill..."
                                value={skillInput}
                                onChange={(e) => setSkillInput(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && addSkill()}
                            />
                            <button className="btn btn-secondary" onClick={addSkill}>Add</button>
                        </div>
                        <div className="flex gap-2" style={{ flexWrap: "wrap" }}>
                            {currentSkills.map((skill, i) => (
                                <span key={i} className="tag success" style={{ cursor: "pointer" }} onClick={() => setCurrentSkills(currentSkills.filter((_, j) => i !== j))}>
                                    {skill} ✕
                                </span>
                            ))}
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Current Level</label>
                        <select
                            className="form-input"
                            value={grade}
                            onChange={(e) => setGrade(e.target.value)}
                        >
                            <option value="high_school">High School</option>
                            <option value="undergraduate">Undergraduate</option>
                            <option value="graduate">Graduate</option>
                            <option value="professional">Working Professional</option>
                        </select>
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
                        style={{ width: "100%" }}
                        onClick={handleGenerate}
                        disabled={loading || interests.length === 0 || !careerGoal.trim()}
                    >
                        {loading ? (
                            <>
                                <span className="animate-pulse">🧠</span>
                                Generating Roadmap...
                            </>
                        ) : (
                            <>
                                ✨ Generate My Roadmap
                            </>
                        )}
                    </button>
                </div>
            ) : (
                <div className="animate-fade-in">
                    {/* Summary */}
                    <div className="card mb-4" style={{ marginBottom: "24px" }}>
                        <h2 style={{ fontSize: "24px", fontWeight: "700", marginBottom: "8px" }}>
                            Your Personalized Roadmap
                        </h2>
                        <p className="text-gray mb-4" style={{ marginBottom: "16px" }}>{roadmap.summary}</p>
                        <div className="flex gap-2">
                            <span className="tag primary">🎯 {careerGoal}</span>
                            <span className="tag success">⏱️ {roadmap.timeline}</span>
                        </div>
                    </div>

                    {/* Phases */}
                    <div className="mb-4" style={{ marginBottom: "32px" }}>
                        <h3 className="font-semibold mb-4" style={{ fontSize: "18px", marginBottom: "16px" }}>
                            📚 Learning Phases
                        </h3>
                        <div className="flex flex-col gap-4">
                            {roadmap.phases.map((phase, i) => (
                                <div key={i} className="card">
                                    <div className="flex items-center gap-4 mb-4" style={{ marginBottom: "16px" }}>
                                        <span className="tag primary">{i + 1}</span>
                                        <h4 className="font-semibold">{phase.name}</h4>
                                        <span className="text-sm text-gray">({phase.duration})</span>
                                    </div>
                                    <div className="flex gap-2 mb-4" style={{ flexWrap: "wrap", marginBottom: "12px" }}>
                                        {phase.skills.map((skill, j) => (
                                            <span
                                                key={j}
                                                className={`tag ${skill.priority === 'essential' ? 'danger' : skill.priority === 'recommended' ? 'warning' : 'success'}`}
                                                title={skill.reason}
                                            >
                                                {skill.name}
                                            </span>
                                        ))}
                                    </div>
                                    <p className="text-sm text-gray">🏆 Milestone: {phase.milestone}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Courses & Projects */}
                    <div className="grid grid-cols-2" style={{ gap: "24px", marginBottom: "24px" }}>
                        <div className="card">
                            <h3 className="card-title mb-4">🎓 Recommended Courses</h3>
                            {roadmap.courses.map((course, i) => (
                                <div key={i} style={{ padding: "12px 0", borderBottom: i < roadmap.courses.length - 1 ? "1px solid var(--glass-border)" : "none" }}>
                                    <div className="font-medium text-sm">{course.title}</div>
                                    <div className="text-xs text-gray">{course.platform} • {course.duration}</div>
                                </div>
                            ))}
                        </div>

                        <div className="card">
                            <h3 className="card-title mb-4">🛠️ Project Ideas</h3>
                            {roadmap.projects.map((project, i) => (
                                <div key={i} style={{ padding: "12px 0", borderBottom: i < roadmap.projects.length - 1 ? "1px solid var(--glass-border)" : "none" }}>
                                    <div className="font-medium text-sm">{project.title}</div>
                                    <div className="text-xs text-gray">{project.description}</div>
                                    <div className="flex gap-2 mt-4" style={{ marginTop: "8px" }}>
                                        <span className="tag primary" style={{ fontSize: "10px" }}>{project.difficulty}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <button
                        className="btn btn-secondary"
                        onClick={() => {
                            reset();
                            setInterests([]);
                            setCareerGoal("");
                            setCurrentSkills([]);
                        }}
                    >
                        ← Generate New Roadmap
                    </button>
                </div>
            )}
        </div>
    );
}
