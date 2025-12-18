"use client";

import Link from "next/link";

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    message?: string;
}

export function AuthModal({
    isOpen,
    onClose,
    title = "🔐 Unlock the Full Potential",
    message = "We're glad you're exploring! To use our AI-powered features like Resume Analysis, Skill Roadmaps, and Chat, please log in or sign up for a free account."
}: AuthModalProps) {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <button className="modal-close" onClick={onClose}>&times;</button>

                <div style={{ textAlign: 'center' }}>
                    <div style={{
                        fontSize: '48px',
                        marginBottom: '24px',
                        background: 'var(--glass-bg)',
                        width: '80px',
                        height: '80px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 24px'
                    }}>
                        🎓
                    </div>

                    <h2 className="font-semibold" style={{ fontSize: '24px', marginBottom: '16px' }}>
                        {title}
                    </h2>

                    <p className="text-gray mb-4" style={{ marginBottom: '32px', lineHeight: '1.6' }}>
                        {message}
                    </p>

                    <div className="flex flex-col gap-4">
                        <Link href="/login" className="btn btn-primary" style={{ width: '100%' }}>
                            Login to Continue
                        </Link>
                        <Link href="/signup" className="btn btn-secondary" style={{ width: '100%' }}>
                            Create a Free Account
                        </Link>
                    </div>

                    <button
                        onClick={onClose}
                        className="btn btn-ghost mt-4"
                        style={{ width: '100%', fontSize: '12px' }}
                    >
                        Maybe Later
                    </button>
                </div>
            </div>
        </div>
    );
}
