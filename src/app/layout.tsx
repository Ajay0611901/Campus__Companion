import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "AI Campus Companion - Your AI-Powered Student Growth Platform",
  description: "An AI-native platform for resume analysis, skill development, study tools, and interview preparation.",
};

// Navigation items
const navItems = [
  { href: "/", icon: "🏠", label: "Dashboard" },
  { href: "/resume", icon: "📄", label: "Resume Analyzer" },
  { href: "/skills", icon: "🎯", label: "Skill Roadmap" },
  { href: "/study", icon: "📚", label: "Study Tools" },
  { href: "/interview", icon: "🎤", label: "Interview Coach" },
  { href: "/chat", icon: "💬", label: "AI Chat" },
  { href: "/profile", icon: "👤", label: "Profile & Badges" },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <Providers>
          <div className="app-layout">
            {/* Sidebar */}
            <aside className="sidebar">
              {/* Logo */}
              <div className="logo">
                <div className="logo-icon">🎓</div>
                <span className="logo-text">AI Campus Companion</span>
              </div>

              {/* Navigation */}
              <nav className="nav-section">
                <div className="nav-label">Main Menu</div>
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="nav-item"
                  >
                    <span className="nav-icon">{item.icon}</span>
                    {item.label}
                  </Link>
                ))}
              </nav>

              {/* Login Link */}
              <div className="nav-section" style={{ marginTop: "auto" }}>
                <Link href="/settings" className="nav-item">
                  <span className="nav-icon">⚙️</span>
                  Settings
                </Link>
                <Link href="/login" className="nav-item">
                  <span className="nav-icon">🔐</span>
                  Login / Sign Up
                </Link>
              </div>

              {/* AI Status */}
              <div style={{ marginTop: "16px" }}>
                <div className="card" style={{ padding: "16px" }}>
                  <div className="flex items-center gap-2 mb-4">
                    <div style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      background: "#10b981",
                      boxShadow: "0 0 8px #10b981"
                    }}></div>
                    <span className="text-sm font-medium">AI Online</span>
                  </div>
                  <p className="text-xs text-gray">
                    Gemini 2.0 Flash ready to assist
                  </p>
                </div>
              </div>
            </aside>

            {/* Main Content */}
            <main className="main-content">
              {children}
            </main>
          </div>
        </Providers>

        {/* SVG Gradients for Score Rings */}
        <svg style={{ width: 0, height: 0, position: "absolute" }}>
          <defs>
            <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
            <linearGradient id="successGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#06b6d4" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
          </defs>
        </svg>
      </body>
    </html>
  );
}
