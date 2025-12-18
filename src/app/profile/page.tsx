"use client";

import { useState } from "react";

// Mock user data
const mockUser = {
    displayName: "Alex Johnson",
    email: "alex@university.edu",
    photoURL: null,
    stats: {
        resumeScore: 78,
        skillProgress: 45,
        interviewReadiness: 62,
        streakDays: 7,
        totalBadges: 8,
        xp: 2450,
        level: 12,
    },
    profile: {
        interests: ["AI/ML", "Web Development", "Data Science"],
        careerGoal: "Machine Learning Engineer",
        currentLevel: "undergraduate",
        targetRoles: ["ML Engineer", "Data Scientist"],
        skills: ["Python", "JavaScript", "SQL", "React"],
    },
};

const badges = [
    { id: "1", name: "Resume Pro", description: "Score 75+ on resume analysis", icon: "📄", earned: true, earnedAt: "2 days ago" },
    { id: "2", name: "Week Warrior", description: "Maintain a 7-day streak", icon: "🔥", earned: true, earnedAt: "Today" },
    { id: "3", name: "Interview Ready", description: "Complete 5 mock interviews", icon: "🎤", earned: true, earnedAt: "1 week ago" },
    { id: "4", name: "Quick Learner", description: "Complete skill roadmap phase 1", icon: "📚", earned: true, earnedAt: "3 days ago" },
    { id: "5", name: "Quiz Master", description: "Score 90%+ on 3 quizzes", icon: "🏆", earned: false, progress: 66 },
    { id: "6", name: "Flashcard Pro", description: "Review 100 flashcards", icon: "🃏", earned: false, progress: 45 },
    { id: "7", name: "Perfect Score", description: "Get 100% ATS score", icon: "💯", earned: false, progress: 78 },
    { id: "8", name: "30-Day Streak", description: "Maintain a 30-day streak", icon: "⚡", earned: false, progress: 23 },
];

const challenges = [
    { id: "1", title: "Improve Resume", description: "Increase your ATS score by 10 points", type: "weekly", xp: 200, progress: 40, target: 100 },
    { id: "2", title: "Mock Interview", description: "Complete 1 mock interview today", type: "daily", xp: 50, progress: 0, target: 1 },
    { id: "3", title: "Study Session", description: "Summarize a lecture and review flashcards", type: "daily", xp: 75, progress: 50, target: 100 },
];

const recentActivity = [
    { action: "Completed mock interview", time: "2 hours ago", xp: 100, icon: "🎤" },
    { action: "Analyzed resume", time: "5 hours ago", xp: 50, icon: "📄" },
    { action: "Generated skill roadmap", time: "1 day ago", xp: 75, icon: "🎯" },
    { action: "Completed quiz with 85%", time: "2 days ago", xp: 60, icon: "✅" },
];

// Badge Card Component
function BadgeCard({ badge }: { badge: typeof badges[0] }) {
    return (
        <div
            className="card"
            style={{
                padding: '20px',
                opacity: badge.earned ? 1 : 0.6,
                position: 'relative'
            }}
        >
            {!badge.earned && (
                <div
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0,0,0,0.3)',
                        borderRadius: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                >
                    <div style={{ textAlign: 'center' }}>
                        <div className="text-xs text-gray mb-4">Progress</div>
                        <div className="font-semibold">{badge.progress}%</div>
                    </div>
                </div>
            )}
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>{badge.icon}</div>
            <h4 className="font-semibold text-sm mb-4">{badge.name}</h4>
            <p className="text-xs text-gray">{badge.description}</p>
            {badge.earned && (
                <div className="text-xs mt-4" style={{ marginTop: '8px', color: '#10b981' }}>
                    ✓ Earned {badge.earnedAt}
                </div>
            )}
        </div>
    );
}

// Challenge Card Component
function ChallengeCard({ challenge }: { challenge: typeof challenges[0] }) {
    return (
        <div className="card" style={{ padding: '16px' }}>
            <div className="flex items-center justify-between mb-4">
                <span className={`tag ${challenge.type === 'daily' ? 'primary' : 'warning'}`}>
                    {challenge.type}
                </span>
                <span className="text-xs font-semibold" style={{ color: '#f59e0b' }}>+{challenge.xp} XP</span>
            </div>
            <h4 className="font-semibold text-sm mb-4">{challenge.title}</h4>
            <p className="text-xs text-gray mb-4">{challenge.description}</p>
            <div className="progress-bar" style={{ height: '6px' }}>
                <div className="progress-fill" style={{ width: `${challenge.progress}%` }}></div>
            </div>
        </div>
    );
}

export default function ProfilePage() {
    const [user] = useState(mockUser);
    const xpToNextLevel = 3000;
    const xpProgress = (user.stats.xp / xpToNextLevel) * 100;

    return (
        <div className="animate-fade-in">
            {/* Page Header */}
            <div className="page-header">
                <h1 className="page-title">👤 Profile & Achievements</h1>
                <p className="page-subtitle">
                    Track your progress, earn badges, and complete challenges to level up.
                </p>
            </div>

            <div className="grid" style={{ gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
                {/* Left Column - Profile */}
                <div>
                    {/* Profile Card */}
                    <div className="card mb-4" style={{ marginBottom: '24px', textAlign: 'center', padding: '32px' }}>
                        <div
                            style={{
                                width: '100px',
                                height: '100px',
                                borderRadius: '50%',
                                background: 'var(--gradient-primary)',
                                margin: '0 auto 16px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '40px'
                            }}
                        >
                            {user.displayName.charAt(0)}
                        </div>
                        <h2 className="font-semibold" style={{ fontSize: '20px', marginBottom: '4px' }}>
                            {user.displayName}
                        </h2>
                        <p className="text-sm text-gray mb-4">{user.email}</p>
                        <div className="tag primary">{user.profile.careerGoal}</div>
                    </div>

                    {/* Level & XP */}
                    <div className="card mb-4" style={{ marginBottom: '24px' }}>
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-sm text-gray">Level</span>
                            <span style={{ fontSize: '24px', fontWeight: '700', color: '#6366f1' }}>
                                {user.stats.level}
                            </span>
                        </div>
                        <div className="progress-bar mb-4" style={{ marginBottom: '8px' }}>
                            <div className="progress-fill" style={{ width: `${xpProgress}%` }}></div>
                        </div>
                        <div className="flex justify-between text-xs text-gray">
                            <span>{user.stats.xp} XP</span>
                            <span>{xpToNextLevel} XP to Level {user.stats.level + 1}</span>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="card mb-4" style={{ marginBottom: '24px' }}>
                        <h3 className="card-title mb-4">📊 Stats Overview</h3>
                        <div className="grid grid-cols-2" style={{ gap: '12px' }}>
                            {[
                                { label: "Resume Score", value: user.stats.resumeScore, icon: "📄" },
                                { label: "Skills", value: `${user.stats.skillProgress}%`, icon: "🎯" },
                                { label: "Interview", value: `${user.stats.interviewReadiness}%`, icon: "🎤" },
                                { label: "Streak", value: `${user.stats.streakDays}d`, icon: "🔥" },
                            ].map((stat, i) => (
                                <div key={i} style={{ padding: '12px', background: 'var(--bg-tertiary)', borderRadius: '12px', textAlign: 'center' }}>
                                    <div style={{ fontSize: '20px', marginBottom: '4px' }}>{stat.icon}</div>
                                    <div className="font-semibold">{stat.value}</div>
                                    <div className="text-xs text-gray">{stat.label}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Recent Activity */}
                    <div className="card">
                        <h3 className="card-title mb-4">🕐 Recent Activity</h3>
                        {recentActivity.map((activity, i) => (
                            <div
                                key={i}
                                className="flex items-center gap-4"
                                style={{
                                    padding: '12px 0',
                                    borderBottom: i < recentActivity.length - 1 ? '1px solid var(--glass-border)' : 'none'
                                }}
                            >
                                <span style={{ fontSize: '20px' }}>{activity.icon}</span>
                                <div style={{ flex: 1 }}>
                                    <div className="text-sm">{activity.action}</div>
                                    <div className="text-xs text-gray">{activity.time}</div>
                                </div>
                                <span className="tag success">+{activity.xp} XP</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right Column - Badges & Challenges */}
                <div>
                    {/* Active Challenges */}
                    <div className="mb-4" style={{ marginBottom: '32px' }}>
                        <div className="flex items-center justify-between mb-4" style={{ marginBottom: '16px' }}>
                            <h3 className="font-semibold" style={{ fontSize: '18px' }}>🎯 Active Challenges</h3>
                            <span className="text-xs text-gray">AI-powered recommendations</span>
                        </div>
                        <div className="grid grid-cols-3" style={{ gap: '16px' }}>
                            {challenges.map((challenge) => (
                                <ChallengeCard key={challenge.id} challenge={challenge} />
                            ))}
                        </div>
                    </div>

                    {/* Badges */}
                    <div>
                        <div className="flex items-center justify-between mb-4" style={{ marginBottom: '16px' }}>
                            <h3 className="font-semibold" style={{ fontSize: '18px' }}>🏆 Badges Collection</h3>
                            <span className="text-sm text-gray">
                                {badges.filter(b => b.earned).length} / {badges.length} earned
                            </span>
                        </div>
                        <div className="grid grid-cols-4" style={{ gap: '16px' }}>
                            {badges.map((badge) => (
                                <BadgeCard key={badge.id} badge={badge} />
                            ))}
                        </div>
                    </div>

                    {/* Skills */}
                    <div className="card mt-6" style={{ marginTop: '32px' }}>
                        <h3 className="card-title mb-4">💡 Your Skills</h3>
                        <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                            {user.profile.skills.map((skill, i) => (
                                <span key={i} className="tag primary">{skill}</span>
                            ))}
                        </div>
                        <div className="mt-4" style={{ marginTop: '16px' }}>
                            <span className="text-sm text-gray">Interests: </span>
                            <span className="text-sm">{user.profile.interests.join(", ")}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
