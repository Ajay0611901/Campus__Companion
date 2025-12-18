"use client";

import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";

export default function SettingsPage() {
    const { theme, setTheme, resolvedTheme } = useTheme();
    const { user, signOut, isConfigured } = useAuth();

    const handleSignOut = async () => {
        try {
            await signOut();
        } catch {
            // Error handled by context
        }
    };

    return (
        <div className="animate-fade-in">
            {/* Page Header */}
            <div className="page-header">
                <h1 className="page-title">⚙️ Settings</h1>
                <p className="page-subtitle">
                    Customize your AI Campus Companion experience.
                </p>
            </div>

            <div style={{ maxWidth: "600px" }}>
                {/* Appearance Section */}
                <div className="card mb-4" style={{ marginBottom: "24px" }}>
                    <h3 className="card-title mb-4" style={{ marginBottom: "24px" }}>
                        🎨 Appearance
                    </h3>

                    <div className="form-group">
                        <label className="form-label">Theme</label>
                        <p className="text-sm text-gray" style={{ marginBottom: "16px" }}>
                            Choose how AI Campus Companion looks to you.
                        </p>

                        <div className="flex gap-2">
                            {[
                                { id: 'light' as const, icon: '☀️', label: 'Light' },
                                { id: 'dark' as const, icon: '🌙', label: 'Dark' },
                                { id: 'system' as const, icon: '💻', label: 'System' },
                            ].map((option) => (
                                <button
                                    key={option.id}
                                    className={`btn ${theme === option.id ? 'btn-primary' : 'btn-secondary'}`}
                                    onClick={() => setTheme(option.id)}
                                    style={{ flex: 1 }}
                                >
                                    {option.icon} {option.label}
                                </button>
                            ))}
                        </div>

                        <p className="text-xs text-gray mt-4" style={{ marginTop: "12px" }}>
                            Current: {resolvedTheme === 'dark' ? '🌙 Dark mode' : '☀️ Light mode'}
                        </p>
                    </div>
                </div>

                {/* Account Section */}
                <div className="card mb-4" style={{ marginBottom: "24px" }}>
                    <h3 className="card-title mb-4" style={{ marginBottom: "24px" }}>
                        👤 Account
                    </h3>

                    {user ? (
                        <div>
                            <div style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "16px",
                                padding: "16px",
                                background: "var(--bg-tertiary)",
                                borderRadius: "12px",
                                marginBottom: "16px"
                            }}>
                                <div style={{
                                    width: "48px",
                                    height: "48px",
                                    borderRadius: "50%",
                                    background: "var(--gradient-primary)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: "20px"
                                }}>
                                    {user.photoURL ? (
                                        <img
                                            src={user.photoURL}
                                            alt="Profile"
                                            style={{ width: "100%", height: "100%", borderRadius: "50%" }}
                                        />
                                    ) : (
                                        user.email?.[0]?.toUpperCase() || "?"
                                    )}
                                </div>
                                <div>
                                    <p className="font-medium">{user.displayName || "User"}</p>
                                    <p className="text-sm text-gray">{user.email}</p>
                                </div>
                            </div>

                            <button
                                className="btn btn-secondary"
                                style={{ width: "100%" }}
                                onClick={handleSignOut}
                            >
                                Sign Out
                            </button>
                        </div>
                    ) : (
                        <div>
                            <p className="text-gray mb-4" style={{ marginBottom: "16px" }}>
                                {isConfigured
                                    ? "Sign in to save your progress and access your data across devices."
                                    : "Firebase authentication is not configured yet."
                                }
                            </p>
                            <Link href="/login" className="btn btn-primary" style={{ display: "inline-flex" }}>
                                {isConfigured ? "Sign In / Sign Up" : "Go to Login"}
                            </Link>
                        </div>
                    )}
                </div>

                {/* Notifications Section */}
                <div className="card mb-4" style={{ marginBottom: "24px" }}>
                    <h3 className="card-title mb-4" style={{ marginBottom: "24px" }}>
                        🔔 Notifications
                    </h3>

                    <div className="form-group" style={{ marginBottom: "16px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                                <p className="font-medium text-sm">Study Reminders</p>
                                <p className="text-xs text-gray">Get reminded to complete daily challenges</p>
                            </div>
                            <ToggleSwitch defaultChecked />
                        </div>
                    </div>

                    <div className="form-group" style={{ marginBottom: "16px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                                <p className="font-medium text-sm">Achievement Alerts</p>
                                <p className="text-xs text-gray">Notify when you earn badges</p>
                            </div>
                            <ToggleSwitch defaultChecked />
                        </div>
                    </div>

                    <div className="form-group" style={{ marginBottom: "0" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                                <p className="font-medium text-sm">Weekly Progress Report</p>
                                <p className="text-xs text-gray">Email summary of your weekly progress</p>
                            </div>
                            <ToggleSwitch />
                        </div>
                    </div>
                </div>

                {/* AI Preferences */}
                <div className="card mb-4" style={{ marginBottom: "24px" }}>
                    <h3 className="card-title mb-4" style={{ marginBottom: "24px" }}>
                        🤖 AI Preferences
                    </h3>

                    <div className="form-group">
                        <label className="form-label">Response Style</label>
                        <select className="form-input">
                            <option value="balanced">Balanced (Default)</option>
                            <option value="concise">Concise - Brief answers</option>
                            <option value="detailed">Detailed - Thorough explanations</option>
                        </select>
                    </div>

                    <div className="form-group" style={{ marginBottom: "0" }}>
                        <label className="form-label">Difficulty Level</label>
                        <select className="form-input">
                            <option value="adaptive">Adaptive (Recommended)</option>
                            <option value="beginner">Beginner</option>
                            <option value="intermediate">Intermediate</option>
                            <option value="advanced">Advanced</option>
                        </select>
                    </div>
                </div>

                {/* Data & Privacy */}
                <div className="card">
                    <h3 className="card-title mb-4" style={{ marginBottom: "24px" }}>
                        🔒 Data & Privacy
                    </h3>

                    <div className="form-group" style={{ marginBottom: "16px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                                <p className="font-medium text-sm">Save Chat History</p>
                                <p className="text-xs text-gray">Store conversations for reference</p>
                            </div>
                            <ToggleSwitch defaultChecked />
                        </div>
                    </div>

                    <div className="form-group" style={{ marginBottom: "16px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                                <p className="font-medium text-sm">Analytics</p>
                                <p className="text-xs text-gray">Help improve AI Campus Companion</p>
                            </div>
                            <ToggleSwitch defaultChecked />
                        </div>
                    </div>

                    <button className="btn btn-secondary" style={{ marginTop: "8px" }}>
                        🗑️ Clear All Data
                    </button>
                </div>
            </div>
        </div>
    );
}

// Toggle Switch Component
function ToggleSwitch({ defaultChecked = false }: { defaultChecked?: boolean }) {
    return (
        <label style={{ position: "relative", display: "inline-block", width: "48px", height: "26px" }}>
            <input
                type="checkbox"
                defaultChecked={defaultChecked}
                style={{ opacity: 0, width: 0, height: 0 }}
            />
            <span style={{
                position: "absolute",
                cursor: "pointer",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: defaultChecked ? "var(--primary-500)" : "var(--bg-tertiary)",
                borderRadius: "26px",
                transition: "0.3s",
            }}>
                <span style={{
                    position: "absolute",
                    content: "",
                    height: "20px",
                    width: "20px",
                    left: defaultChecked ? "24px" : "3px",
                    bottom: "3px",
                    background: "white",
                    borderRadius: "50%",
                    transition: "0.3s",
                }} />
            </span>
        </label>
    );
}
