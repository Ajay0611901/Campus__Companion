"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";

export default function LoginPage() {
    const [mode, setMode] = useState<"login" | "signup">("login");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [localError, setLocalError] = useState<string | null>(null);

    const router = useRouter();
    const { signInWithGoogle, signInWithMicrosoft, signInWithEmail, signUpWithEmail, error, isConfigured } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLocalError(null);

        if (!email || !password) {
            setLocalError("Please fill in all fields");
            return;
        }

        if (password.length < 6) {
            setLocalError("Password must be at least 6 characters");
            return;
        }

        setLoading(true);

        try {
            if (mode === "login") {
                await signInWithEmail(email, password);
                router.push("/");
            } else {
                await signUpWithEmail(email, password);
                // Redirect to onboarding for new users
                router.push("/onboarding");
            }
        } catch {
            // Error handled by context
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setLoading(true);
        try {
            await signInWithGoogle();
            // For now, redirect all to onboarding - can check if user profile exists in future
            router.push("/onboarding");
        } catch {
            // Error handled by context
        } finally {
            setLoading(false);
        }
    };

    const handleMicrosoftLogin = async () => {
        setLoading(true);
        try {
            await signInWithMicrosoft();
            // For now, redirect all to onboarding - can check if user profile exists in future
            router.push("/onboarding");
        } catch {
            // Error handled by context
        } finally {
            setLoading(false);
        }
    };

    // Show config message if Firebase not set up
    if (!isConfigured) {
        return (
            <div className="animate-fade-in" style={{
                minHeight: "100vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "24px"
            }}>
                <div className="card" style={{ maxWidth: "450px", width: "100%", textAlign: "center", padding: "48px" }}>
                    <div style={{ fontSize: "64px", marginBottom: "24px" }}>🔐</div>
                    <h2 style={{ fontSize: "24px", fontWeight: "700", marginBottom: "16px" }}>
                        Authentication Setup Required
                    </h2>
                    <p className="text-gray" style={{ marginBottom: "24px" }}>
                        Configure your Firebase credentials to enable authentication.
                    </p>
                    <Link href="/" className="btn btn-primary" style={{ display: "inline-block" }}>
                        Continue Without Login →
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
            background: "var(--bg-primary)"
        }}>
            <div className="animate-fade-in" style={{ maxWidth: "420px", width: "100%" }}>
                {/* Logo */}
                <div style={{ textAlign: "center", marginBottom: "32px" }}>
                    <div style={{
                        fontSize: "48px",
                        marginBottom: "16px",
                        display: "inline-block",
                        padding: "16px",
                        background: "var(--gradient-primary)",
                        borderRadius: "20px"
                    }}>
                        🎓
                    </div>
                    <h1 style={{ fontSize: "28px", fontWeight: "700", marginBottom: "8px" }}>
                        AI Campus Companion
                    </h1>
                    <p className="text-gray">Your AI-powered student growth platform</p>
                </div>

                {/* Auth Card */}
                <div className="card" style={{ padding: "32px" }}>
                    {/* Mode Toggle */}
                    <div className="flex gap-2 mb-4" style={{ marginBottom: "24px" }}>
                        <button
                            className={`btn ${mode === 'login' ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => setMode('login')}
                            style={{ flex: 1 }}
                        >
                            Sign In
                        </button>
                        <button
                            className={`btn ${mode === 'signup' ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => setMode('signup')}
                            style={{ flex: 1 }}
                        >
                            Sign Up
                        </button>
                    </div>

                    {/* Social Login */}
                    <div className="flex flex-col gap-2" style={{ marginBottom: "24px" }}>
                        <button
                            className="btn btn-secondary"
                            onClick={handleGoogleLogin}
                            disabled={loading}
                            style={{ width: "100%", justifyContent: "center" }}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" style={{ marginRight: "12px" }}>
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                            Continue with Google
                        </button>

                        <button
                            className="btn btn-secondary"
                            onClick={handleMicrosoftLogin}
                            disabled={loading}
                            style={{ width: "100%", justifyContent: "center" }}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" style={{ marginRight: "12px" }}>
                                <path fill="#F25022" d="M1 1h10v10H1z" />
                                <path fill="#00A4EF" d="M1 13h10v10H1z" />
                                <path fill="#7FBA00" d="M13 1h10v10H13z" />
                                <path fill="#FFB900" d="M13 13h10v10H13z" />
                            </svg>
                            Continue with Microsoft
                        </button>
                    </div>

                    {/* Divider */}
                    <div style={{
                        display: "flex",
                        alignItems: "center",
                        marginBottom: "24px",
                        gap: "16px"
                    }}>
                        <div style={{ flex: 1, height: "1px", background: "var(--glass-border)" }} />
                        <span className="text-sm text-gray">or</span>
                        <div style={{ flex: 1, height: "1px", background: "var(--glass-border)" }} />
                    </div>

                    {/* Email Form */}
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label className="form-label">Email</label>
                            <input
                                type="email"
                                className="form-input"
                                placeholder="you@university.edu"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={loading}
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Password</label>
                            <input
                                type="password"
                                className="form-input"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={loading}
                            />
                        </div>

                        {(error || localError) && (
                            <div style={{
                                padding: "12px 16px",
                                background: "rgba(239, 68, 68, 0.1)",
                                borderRadius: "12px",
                                color: "#ef4444",
                                marginBottom: "16px",
                                fontSize: "14px"
                            }}>
                                ⚠️ {error || localError}
                            </div>
                        )}

                        <button
                            type="submit"
                            className="btn btn-primary"
                            style={{ width: "100%" }}
                            disabled={loading}
                        >
                            {loading ? (
                                <span className="animate-pulse">Loading...</span>
                            ) : mode === "login" ? (
                                "Sign In"
                            ) : (
                                "Create Account"
                            )}
                        </button>
                    </form>

                    {mode === "login" && (
                        <p className="text-center text-sm text-gray mt-4" style={{ marginTop: "16px" }}>
                            <a href="#" style={{ color: "var(--primary)" }}>Forgot password?</a>
                        </p>
                    )}
                </div>

                {/* Footer */}
                <p className="text-center text-sm text-gray mt-4" style={{ marginTop: "24px" }}>
                    {mode === "login" ? "Don't have an account? " : "Already have an account? "}
                    <button
                        onClick={() => setMode(mode === "login" ? "signup" : "login")}
                        style={{ color: "var(--primary)", background: "none", border: "none", cursor: "pointer" }}
                    >
                        {mode === "login" ? "Sign up" : "Sign in"}
                    </button>
                </p>
            </div>
        </div>
    );
}
