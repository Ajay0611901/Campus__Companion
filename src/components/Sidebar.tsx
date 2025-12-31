"use client";

import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";

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

export function Sidebar() {
    const { user, signOut } = useAuth();

    const handleSignOut = async () => {
        try {
            await signOut();
            window.location.href = "/login";
        } catch (err) {
            console.error("Failed to sign out:", err);
        }
    };

    return (
        <aside className="sidebar">
            {/* Logo */}
            <div className="logo">
                <Image
                    src="/icon.png"
                    alt="Campus Companion"
                    width={48}
                    height={48}
                    style={{ borderRadius: '12px' }}
                />
                <span className="logo-text">Campus Companion</span>
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

            {/* Auth Section */}
            <div className="nav-section" style={{ marginTop: "auto" }}>
                <Link href="/settings" className="nav-item">
                    <span className="nav-icon">⚙️</span>
                    Settings
                </Link>

                {user ? (
                    <button onClick={handleSignOut} className="nav-item" style={{ width: "100%", textAlign: "left", background: "none", border: "none", cursor: "pointer" }}>
                        <span className="nav-icon">🚪</span>
                        Sign Out
                    </button>
                ) : (
                    <Link href="/login" className="nav-item">
                        <span className="nav-icon">🔐</span>
                        Login / Sign Up
                    </Link>
                )}
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
    );
}
