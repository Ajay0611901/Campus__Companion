/**
 * Auth Context and Hook
 * 
 * Provides authentication state and methods throughout the app
 */

"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
    User,
    signInWithPopup,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut as firebaseSignOut,
    onAuthStateChanged,
    GoogleAuthProvider,
    OAuthProvider
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from '@/lib/firebase';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    error: string | null;
    signInWithGoogle: () => Promise<void>;
    signInWithMicrosoft: () => Promise<void>;
    signInWithEmail: (email: string, password: string) => Promise<void>;
    signUpWithEmail: (email: string, password: string) => Promise<void>;
    signOut: () => Promise<void>;
    isConfigured: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isConfigured, setIsConfigured] = useState(false);

    useEffect(() => {
        setIsConfigured(!!isFirebaseConfigured());

        if (!isFirebaseConfigured()) {
            setLoading(false);
            return;
        }

        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setUser(user);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const signInWithGoogle = async () => {
        setError(null);
        try {
            const provider = new GoogleAuthProvider();
            await signInWithPopup(auth, provider);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to sign in with Google');
            throw err;
        }
    };

    const signInWithMicrosoft = async () => {
        setError(null);
        try {
            const provider = new OAuthProvider('microsoft.com');
            await signInWithPopup(auth, provider);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to sign in with Microsoft');
            throw err;
        }
    };

    const signInWithEmail = async (email: string, password: string) => {
        setError(null);
        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to sign in');
            throw err;
        }
    };

    const signUpWithEmail = async (email: string, password: string) => {
        setError(null);
        try {
            await createUserWithEmailAndPassword(auth, email, password);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create account');
            throw err;
        }
    };

    const signOut = async () => {
        try {
            await firebaseSignOut(auth);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to sign out');
            throw err;
        }
    };

    return (
        <AuthContext.Provider value={{
            user,
            loading,
            error,
            signInWithGoogle,
            signInWithMicrosoft,
            signInWithEmail,
            signUpWithEmail,
            signOut,
            isConfigured
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
