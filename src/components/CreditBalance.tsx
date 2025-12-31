
"use client";

import { useEffect } from "react";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useAuth } from "@/context/AuthContext";

export function CreditBalance() {
    const { user } = useAuth();
    const { profile, refreshProfile } = useUserProfile();

    // Listen for credit deduction events and refresh the profile
    useEffect(() => {
        const handleCreditsUsed = () => {
            console.log('🔄 Credits used, refreshing profile...');
            refreshProfile();
        };

        window.addEventListener('credits-used', handleCreditsUsed);
        return () => window.removeEventListener('credits-used', handleCreditsUsed);
    }, [refreshProfile]);

    // Debugging visibility
    console.log('CreditBalance Render Check:', {
        hasUser: !!user,
        hasProfile: !!profile,
        hasStats: !!profile?.stats,
        credits: profile?.stats?.credits
    });

    // Only show if user is logged in
    if (!user) return null;

    // If profile is loading, maybe return null or a skeleton? 
    // For now, if no profile, we can't show credits accurately, but let's at least show placeholders if profile is loading?
    // Actually, just rely on user check. If profile is null, use defaults.

    const credits = profile?.stats?.credits ?? 30; // Default to 30
    const maxCredits = 30;
    const percentage = Math.min((credits / maxCredits) * 100, 100);
    const isLow = credits < 5;

    return (
        <div className="animate-fade-in" style={{
            position: 'fixed',
            top: '24px',
            right: '24px',
            zIndex: 9999, // Increased Z-Index to be topmost
            background: 'var(--bg-card)',
            backdropFilter: 'blur(12px)',
            border: '1px solid var(--glass-border)',
            borderRadius: '12px',
            padding: '12px 16px',
            boxShadow: 'var(--glass-shadow)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
        }}>
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end'
            }}>
                <div style={{
                    fontSize: '12px',
                    color: 'var(--gray-500)',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                }}>
                    Daily Credits
                </div>
                <div style={{
                    fontSize: '16px',
                    fontWeight: 700,
                    color: isLow ? 'var(--accent-rose)' : 'var(--gray-100)',
                    fontVariantNumeric: 'tabular-nums'
                }}>
                    {credits} / {maxCredits}
                </div>
            </div>

            {/* Circular Progress or Icon */}
            <div style={{
                position: 'relative',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                <svg width="32" height="32" viewBox="0 0 36 36">
                    <path
                        d="M18 2.0845
                          a 15.9155 15.9155 0 0 1 0 31.831
                          a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="var(--bg-tertiary)"
                        strokeWidth="4"
                    />
                    <path
                        d="M18 2.0845
                          a 15.9155 15.9155 0 0 1 0 31.831
                          a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke={isLow ? "var(--accent-rose)" : "var(--accent-emerald)"}
                        strokeWidth="4"
                        strokeDasharray={`${percentage}, 100`}
                        style={{
                            transition: 'stroke-dasharray 0.5s ease'
                        }}
                    />
                </svg>
                <div style={{
                    position: 'absolute',
                    fontSize: '10px'
                }}>
                    ⚡
                </div>
            </div>
        </div>
    );
}
