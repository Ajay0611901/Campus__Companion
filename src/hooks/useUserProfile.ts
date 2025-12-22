/**
 * User Profile Hook
 * 
 * Manages user profile data with Firestore integration
 */

"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '@/lib/firebase';

export interface UserProfile {
    userId: string;
    fullName: string;
    email: string;
    collegeName: string;
    degree: string;
    degreeStatus: "pursuing" | "completed";
    graduationYear: string;
    currentSemester?: string;
    class10Percentage: string;
    class12Percentage: string;
    lastSemCGPA: string;
    overallCGPA?: string;
    targetRole: string;
    interestedDomains: string[];
    skillsLearned: string[];
    experienceLevel: "fresher" | "0-1" | "1-3" | "3+";
    careerGoals?: string;
    createdAt?: any;
    updatedAt?: any;
    onboardingCompleted: boolean;
    stats?: {
        xp: number;
        level: number;
        streakDays: number;
        totalBadges: number;
        resumeScore?: number;
        skillProgress?: number;
        interviewReadiness?: number;
        lastActive?: any;
        credits?: number;
        lastCreditReset?: any;
    };
}

export function useUserProfile() {
    const { user } = useAuth();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!user || !isFirebaseConfigured()) {
            setLoading(false);
            return;
        }

        loadProfile();
    }, [user]);

    const loadProfile = async () => {
        if (!user) return;

        try {
            const docRef = doc(db, 'users', user.uid);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                setProfile(docSnap.data() as UserProfile);
            } else {
                setProfile(null);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load profile');
        } finally {
            setLoading(false);
        }
    };

    const saveProfile = async (data: Omit<UserProfile, 'userId' | 'email' | 'createdAt' | 'updatedAt'>) => {
        if (!user) {
            throw new Error('User not authenticated');
        }

        if (!isFirebaseConfigured()) {
            // Store in localStorage as fallback
            const profileData = {
                ...data,
                userId: user.uid,
                email: user.email || '',
            };
            localStorage.setItem('userProfile', JSON.stringify(profileData));
            setProfile(profileData as UserProfile);
            return;
        }

        try {
            const profileData: UserProfile = {
                ...data,
                userId: user.uid,
                email: user.email || '',
                updatedAt: serverTimestamp(),
                createdAt: profile?.createdAt || serverTimestamp(),
            };

            const docRef = doc(db, 'users', user.uid);
            await setDoc(docRef, profileData, { merge: true });
            setProfile(profileData);
        } catch (err) {
            throw new Error(err instanceof Error ? err.message : 'Failed to save profile');
        }
    };

    const updateProfile = async (updates: Partial<UserProfile>) => {
        if (!user || !profile) {
            throw new Error('No profile to update');
        }

        await saveProfile({
            ...profile,
            ...updates,
        } as any);
    };

    const addXP = async (amount: number) => {
        if (!user || !profile) return;

        const currentStats = profile.stats || {
            xp: 0,
            level: 1,
            streakDays: 0,
            totalBadges: 0,
            resumeScore: 0,
            skillProgress: 0,
            interviewReadiness: 0,
        };

        const newXP = currentStats.xp + amount;
        // Simple level up formula: Level = floor(sqrt(XP / 100)) + 1
        // e.g. 100xp = lvl 2, 400xp = lvl 3
        const newLevel = Math.floor(Math.sqrt(newXP / 100)) + 1;
        const leveledUp = newLevel > currentStats.level;

        const updates = {
            stats: {
                ...currentStats,
                xp: newXP,
                level: newLevel,
            }
        };

        await updateProfile(updates);

        if (leveledUp) {
            // You could trigger a celebration effect here or return it
            return { leveledUp: true, newLevel };
        }
        return { leveledUp: false, newLevel };
    };

    return {
        profile,
        loading,
        error,
        saveProfile,
        updateProfile,
        addXP,
        hasProfile: !!profile?.onboardingCompleted,
    };
}

export function buildUserContext(profile: UserProfile | null) {
    if (!profile) return null;

    const academicLevel = profile.degreeStatus === "pursuing" && profile.currentSemester
        ? `${profile.degree} ${profile.currentSemester}${getSuffix(Number(profile.currentSemester))} Semester`
        : profile.degree;

    return {
        targetRole: profile.targetRole,
        skillsLearned: profile.skillsLearned,
        interestedDomains: profile.interestedDomains,
        experienceLevel: profile.experienceLevel,
        academicLevel,
    };
}

function getSuffix(num: number): string {
    if (num === 1) return "st";
    if (num === 2) return "nd";
    if (num === 3) return "rd";
    return "th";
}

// Helper to get user context from localStorage for Cloud Function calls
export function getUserContextForAPI() {
    if (typeof window === 'undefined') return null;

    const profileStr = localStorage.getItem('userProfile');
    if (!profileStr) return null;

    try {
        const profile = JSON.parse(profileStr) as UserProfile;
        return buildUserContext(profile);
    } catch {
        return null;
    }
}
