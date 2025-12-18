"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useUserProfile } from "@/hooks/useUserProfile";
import { AuthModal } from "@/components/AuthModal";

// Stat Card Component
function StatCard({
  icon,
  iconClass,
  title,
  value,
  subtitle,
  trend
}: {
  icon: string;
  iconClass: string;
  title: string;
  value: string | number;
  subtitle: string;
  trend?: { value: number; positive: boolean };
}) {
  return (
    <div className="card animate-fade-in">
      <div className="card-header">
        <div className={`card-icon ${iconClass}`}>{icon}</div>
        {trend && (
          <span className={`tag ${trend.positive ? 'success' : 'danger'}`}>
            {trend.positive ? '↑' : '↓'} {Math.abs(trend.value)}%
          </span>
        )}
      </div>
      <div className="text-sm text-gray mb-4">{title}</div>
      <div style={{ fontSize: "32px", fontWeight: "700", marginBottom: "4px" }}>
        {value}
      </div>
      <div className="text-xs text-gray">{subtitle}</div>
    </div>
  );
}

// Progress Card Component
function ProgressCard({
  title,
  icon,
  iconClass,
  progress,
  items
}: {
  title: string;
  icon: string;
  iconClass: string;
  progress: number;
  items: { label: string; done: boolean }[];
}) {
  return (
    <div className="card animate-fade-in">
      <div className="card-header">
        <h3 className="card-title">{title}</h3>
        <div className={`card-icon ${iconClass}`}>{icon}</div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-gray">Overall Progress</span>
        <span className="font-semibold">{progress}%</span>
      </div>
      <div className="progress-bar mb-4">
        <div className="progress-fill" style={{ width: `${progress}%` }}></div>
      </div>

      <div className="flex flex-col gap-2">
        {items.map((item, index) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <span style={{ color: item.done ? '#10b981' : '#6b7280' }}>
              {item.done ? '✓' : '○'}
            </span>
            <span style={{ color: item.done ? '#d1d5db' : '#6b7280' }}>
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Quick Action Card
function QuickActionCard({
  icon,
  title,
  description,
  href,
  gradient,
  isGuest,
  onGuestClick
}: {
  icon: string;
  title: string;
  description: string;
  href: string;
  gradient: string;
  isGuest: boolean;
  onGuestClick: () => void;
}) {
  const handleClick = (e: React.MouseEvent) => {
    if (isGuest) {
      e.preventDefault();
      onGuestClick();
    }
  };

  return (
    <Link
      href={href}
      onClick={handleClick}
      className="card animate-fade-in"
      style={{
        textDecoration: 'none',
        opacity: isGuest ? 0.8 : 1,
        cursor: 'pointer'
      }}
    >
      <div
        className="card-icon mb-4"
        style={{
          background: gradient,
          width: '48px',
          height: '48px',
          fontSize: '24px',
          position: 'relative'
        }}
      >
        {icon}
        {isGuest && (
          <div style={{
            position: 'absolute',
            top: -5,
            right: -5,
            fontSize: '12px'
          }}>🔒</div>
        )}
      </div>
      <h3 className="card-title mb-4">
        {title}
      </h3>
      <p className="text-sm text-gray">{description}</p>
    </Link>
  );
}

// Score Ring Component
function ScoreRing({ score, label, size = 120 }: { score: number; label: string; size?: number }) {
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = ((100 - score) / 100) * circumference;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
      <div className="score-ring" style={{ width: size, height: size, position: "relative" }}>
        <svg width={size} height={size}>
          <circle
            className="score-ring-bg"
            cx={size / 2}
            cy={size / 2}
            r={radius}
          />
          <circle
            className="score-ring-progress"
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeDasharray={circumference}
            strokeDashoffset={progress}
          />
        </svg>
        <div className="score-value">
          <div className="score-number">{score}</div>
        </div>
      </div>
      <div className="score-label" style={{ textAlign: "center", fontSize: "14px", fontWeight: "500" }}>
        {label}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const { profile } = useUserProfile();

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  // Use real data from profile, fallback to default 0s for guests/new users
  const stats = {
    resumeScore: profile?.stats?.resumeScore || 0,
    skillProgress: profile?.stats?.skillProgress || 0,
    interviewReadiness: profile?.stats?.interviewReadiness || 0,
    streakDays: profile?.stats?.streakDays || 0,
    xp: profile?.stats?.xp || 0,
    level: profile?.stats?.level || 1,
  };

  return (
    <div className={isLoaded ? 'animate-fade-in' : ''}>
      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">Welcome back! 👋</h1>
        <p className="page-subtitle">
          Your AI-powered journey to career success continues. Here&apos;s your progress overview.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 mb-4" style={{ marginBottom: '32px' }}>
        <StatCard
          icon="📄"
          iconClass="primary"
          title="Resume Score"
          value={stats.resumeScore}
          subtitle="ATS Compatibility"
          trend={{ value: 12, positive: true }}
        />
        <StatCard
          icon="🎯"
          iconClass="cyan"
          title="Skill Progress"
          value={`${stats.skillProgress}%`}
          subtitle="Toward Goal"
          trend={{ value: 8, positive: true }}
        />
        <StatCard
          icon="🎤"
          iconClass="emerald"
          title="Interview Ready"
          value={`${stats.interviewReadiness}%`}
          subtitle="Confidence Level"
        />
        <StatCard
          icon="🔥"
          iconClass="amber"
          title="Learning Streak"
          value={`${stats.streakDays} days`}
          subtitle="Keep it going!"
        />
      </div>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      {/* Main Content Grid */}
      <div className="grid" style={{ gridTemplateColumns: '2fr 1fr', gap: '24px', marginBottom: '32px' }}>
        {/* Quick Actions */}
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
            Quick Actions
          </h2>
          <div className="grid grid-cols-2">
            <QuickActionCard
              icon="📄"
              title="Analyze Resume"
              description="Get AI-powered feedback on your resume with ATS scoring"
              href="/resume"
              gradient="linear-gradient(135deg, rgba(99, 102, 241, 0.3), rgba(139, 92, 246, 0.3))"
              isGuest={!profile}
              onGuestClick={() => setIsAuthModalOpen(true)}
            />
            <QuickActionCard
              icon="🎯"
              title="Skill Roadmap"
              description="Generate a personalized learning path for your career"
              href="/skills"
              gradient="linear-gradient(135deg, rgba(6, 182, 212, 0.3), rgba(16, 185, 129, 0.3))"
              isGuest={!profile}
              onGuestClick={() => setIsAuthModalOpen(true)}
            />
            <QuickActionCard
              icon="📚"
              title="Study Tools"
              description="Summarize lectures, create flashcards, generate quizzes"
              href="/study"
              gradient="linear-gradient(135deg, rgba(245, 158, 11, 0.3), rgba(244, 63, 94, 0.3))"
              isGuest={!profile}
              onGuestClick={() => setIsAuthModalOpen(true)}
            />
            <QuickActionCard
              icon="🎤"
              title="Mock Interview"
              description="Practice with AI interviewer and get STAR feedback"
              href="/interview"
              gradient="linear-gradient(135deg, rgba(139, 92, 246, 0.3), rgba(236, 72, 153, 0.3))"
              isGuest={!profile}
              onGuestClick={() => setIsAuthModalOpen(true)}
            />
          </div>
        </div>

        {/* Score Overview */}
        <div className="card">
          <h3 className="card-title mb-4">Overall Readiness</h3>
          <div style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: "48px",
            padding: "24px 0"
          }}>
            <ScoreRing score={stats.resumeScore} label="Resume" size={140} />
            <ScoreRing score={stats.interviewReadiness} label="Interview" size={140} />
          </div>
          <div className="mt-6">
            <div className="text-sm text-gray mb-4">AI Recommendation</div>
            <div className="card" style={{ background: 'rgba(99, 102, 241, 0.1)', border: 'none' }}>
              <p className="text-sm">
                💡 Focus on adding more <strong>quantifiable achievements</strong> to your resume
                to boost your ATS score by ~15 points.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Progress & Activity */}
      <div className="grid grid-cols-3">
        <ProgressCard
          title="Skill Development"
          icon="🎯"
          iconClass="cyan"
          progress={45}
          items={[
            { label: "Python Fundamentals", done: true },
            { label: "Data Structures", done: true },
            { label: "Machine Learning Basics", done: false },
            { label: "Portfolio Project", done: false },
          ]}
        />

        <ProgressCard
          title="Interview Prep"
          icon="🎤"
          iconClass="emerald"
          progress={62}
          items={[
            { label: "Behavioral Questions", done: true },
            { label: "STAR Method Practice", done: true },
            { label: "Technical Round 1", done: true },
            { label: "System Design", done: false },
          ]}
        />

        <div className="card animate-fade-in">
          <div className="card-header">
            <h3 className="card-title">Recent Badges</h3>
            <span className="badge">3 new</span>
          </div>
          <div className="flex flex-col gap-4 mt-4">
            {[
              { icon: "🏆", name: "Resume Pro", desc: "Score 75+ on resume" },
              { icon: "🔥", name: "Week Warrior", desc: "7 day streak" },
              { icon: "💬", name: "Interview Ready", desc: "Complete 5 mocks" },
            ].map((badge, index) => (
              <div key={index} className="flex items-center gap-4">
                <div
                  style={{
                    fontSize: '24px',
                    width: '40px',
                    height: '40px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(245, 158, 11, 0.2)',
                    borderRadius: '10px'
                  }}
                >
                  {badge.icon}
                </div>
                <div>
                  <div className="font-medium text-sm">{badge.name}</div>
                  <div className="text-xs text-gray">{badge.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
