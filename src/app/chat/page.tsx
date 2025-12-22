"use client";

import { useState, useRef, useEffect } from "react";
import { streamChatMessage, isFirebaseConfigured, auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { AuthModal } from "@/components/AuthModal";

interface Message {
    role: "user" | "assistant";
    content: string;
}

export default function ChatPage() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [userId, setUserId] = useState<string | null>(null);
    const [userProfile, setUserProfile] = useState<any>(null);
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const assistantMessageRef = useRef<string>(""); // Track full message for stable streaming

    // Check if Firebase is configured
    const [isConfigured, setIsConfigured] = useState(true);

    useEffect(() => {
        setIsConfigured(!!isFirebaseConfigured());

        // Listen for auth state changes
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                setUserId(user.uid);
                console.log('👤 User logged in:', user.uid);

                // Load user profile for personalization
                try {
                    const userDoc = await getDoc(doc(db, 'users', user.uid));
                    if (userDoc.exists()) {
                        setUserProfile(userDoc.data());
                        console.log('✅ User profile loaded for AI personalization');
                    }
                } catch (err) {
                    console.error('Error loading profile:', err);
                }
            } else {
                setUserId(null);
                setUserProfile(null);
                console.log('👤 No user logged in');
            }
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || loading) return;

        const userMessage = input.trim();
        setInput("");
        setError(null);
        setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
        setLoading(true);

        try {
            // Convert history to string format
            const historyString = messages
                .slice(-10)
                .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
                .join('\n');

            // Add an empty assistant message to be filled by the stream
            setMessages((prev) => [...prev, { role: "assistant", content: "" }]);
            assistantMessageRef.current = ""; // Reset ref

            await streamChatMessage({
                message: userMessage,
                conversationHistory: historyString,
                userProfile: userProfile || undefined,
            }, (chunkValue: string) => {
                assistantMessageRef.current += chunkValue;
                const fullText = assistantMessageRef.current;

                setMessages((prev) => {
                    const newMessages = [...prev];
                    const lastMessage = newMessages[newMessages.length - 1];
                    if (lastMessage && lastMessage.role === "assistant") {
                        lastMessage.content = fullText; // Set to full accumulated text
                    }
                    return newMessages;
                });
            });

        } catch (err) {
            // Show detailed error message
            const message = err instanceof Error ? err.message : "Failed to send message";

            if (message.includes("Authentication required") || message.includes("401")) {
                setIsAuthModalOpen(true);
            } else {
                setError(message);
            }

            // Remove the user message if failed
            setMessages((prev) => prev.slice(0, -1));
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // Show config warning if Firebase not configured
    if (!isConfigured) {
        return (
            <div className="animate-fade-in">
                <div className="page-header">
                    <h1 className="page-title">💬 AI Learning Assistant</h1>
                </div>
                <div className="card" style={{ maxWidth: "600px", textAlign: "center", padding: "48px" }}>
                    <div style={{ fontSize: "48px", marginBottom: "24px" }}>⚙️</div>
                    <h3 className="font-semibold" style={{ marginBottom: "16px" }}>Firebase Setup Required</h3>
                    <p className="text-gray" style={{ marginBottom: "24px" }}>
                        To use AI Chat, please configure your Firebase credentials in <code>.env.local</code>
                    </p>
                    <div style={{ textAlign: "left", background: "var(--bg-tertiary)", padding: "16px", borderRadius: "12px" }}>
                        <code className="text-xs" style={{ whiteSpace: "pre-wrap" }}>
                            {`NEXT_PUBLIC_FIREBASE_API_KEY=your_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id`}
                        </code>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="animate-fade-in" style={{ height: "calc(100vh - 120px)", display: "flex", flexDirection: "column" }}>
            {/* Header */}
            <div className="page-header" style={{ flexShrink: 0 }}>
                <h1 className="page-title">💬 AI Learning Assistant</h1>
                <p className="page-subtitle">
                    Ask me anything about your studies. I&apos;m here to help you learn!
                </p>
            </div>

            <AuthModal
                isOpen={isAuthModalOpen}
                onClose={() => setIsAuthModalOpen(false)}
                title="💬 Chat requires Login"
                message="To chat with our AI Learning Assistant and get personalized study help, please log in or sign up."
            />

            {/* Chat Messages */}
            <div
                className="card"
                style={{
                    flex: 1,
                    overflow: "auto",
                    display: "flex",
                    flexDirection: "column",
                    marginBottom: "16px"
                }}
            >
                {messages.length === 0 ? (
                    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
                        <div style={{ fontSize: "64px", marginBottom: "24px" }}>🎓</div>
                        <h3 className="font-semibold" style={{ marginBottom: "8px" }}>Welcome to AI Learning Assistant</h3>
                        <p className="text-sm text-gray" style={{ textAlign: "center", maxWidth: "400px" }}>
                            Ask me about any topic you&apos;re studying. I can explain concepts, help solve problems, and answer questions.
                        </p>
                        <div className="flex gap-2 mt-4" style={{ marginTop: "24px", flexWrap: "wrap", justifyContent: "center" }}>
                            {["Explain machine learning", "Help with calculus", "What is recursion?", "Study tips"].map((suggestion) => (
                                <button
                                    key={suggestion}
                                    className="btn btn-secondary"
                                    style={{ fontSize: "12px" }}
                                    onClick={() => setInput(suggestion)}
                                >
                                    {suggestion}
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div style={{ flex: 1 }}>
                        {messages.map((message, i) => (
                            <div
                                key={i}
                                style={{
                                    display: "flex",
                                    justifyContent: message.role === "user" ? "flex-end" : "flex-start",
                                    marginBottom: "16px",
                                }}
                            >
                                <div
                                    style={{
                                        maxWidth: "70%",
                                        padding: "12px 16px",
                                        borderRadius: "16px",
                                        background: message.role === "user" ? "var(--gradient-primary)" : "var(--bg-tertiary)",
                                        border: message.role === "assistant" ? "1px solid var(--glass-border)" : "none",
                                    }}
                                >
                                    {message.role === "assistant" && (
                                        <div className="text-xs text-gray" style={{ marginBottom: "8px" }}>🤖 AI Assistant</div>
                                    )}
                                    <p className="text-sm" style={{ whiteSpace: "pre-wrap", lineHeight: "1.6" }}>
                                        {message.content}
                                    </p>
                                </div>
                            </div>
                        ))}
                        {loading && (
                            <div style={{ display: "flex", marginBottom: "16px" }}>
                                <div
                                    style={{
                                        padding: "12px 16px",
                                        borderRadius: "16px",
                                        background: "var(--bg-tertiary)",
                                        border: "1px solid var(--glass-border)",
                                    }}
                                >
                                    <span className="animate-pulse">🤖 Thinking...</span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                )}
            </div>

            {/* Error */}
            {error && (
                <div style={{
                    padding: "12px 16px",
                    background: "rgba(239, 68, 68, 0.1)",
                    borderRadius: "12px",
                    color: "#ef4444",
                    marginBottom: "16px"
                }}>
                    ⚠️ {error}
                </div>
            )}

            {/* Input */}
            <div className="card" style={{ flexShrink: 0, padding: "16px" }}>
                <div className="flex gap-2">
                    <textarea
                        className="form-textarea"
                        placeholder="Type your question..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={loading}
                        style={{
                            minHeight: "50px",
                            maxHeight: "150px",
                            resize: "none",
                            flex: 1
                        }}
                        rows={1}
                    />
                    <button
                        className="btn btn-primary"
                        onClick={handleSend}
                        disabled={loading || !input.trim()}
                        style={{ alignSelf: "flex-end" }}
                    >
                        {loading ? "..." : "Send"}
                    </button>
                </div>
            </div>
        </div>
    );
}
