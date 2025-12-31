import * as admin from 'firebase-admin';

// Check if we're in dev mode with auth bypass
const isDevBypass = process.env.SKIP_AUTH_DEV === 'true';

// Flag to track if we're properly initialized
let isInitialized = false;

// Initialize Firebase Admin (only if not in dev bypass mode)
function initializeFirebaseAdmin() {
    if (isDevBypass) {
        console.log('🔓 DEV MODE: Skipping Firebase Admin initialization');
        return null;
    }

    if (admin.apps.length) {
        isInitialized = true;
        return admin.app(); // Already initialized
    }

    try {
        if (process.env.FIREBASE_PRIVATE_KEY) {
            // Parse the private key - handle multiple formats
            let privateKey = process.env.FIREBASE_PRIVATE_KEY;

            // Try JSON.parse if it looks like a JSON string (wrapped in quotes)
            if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
                try {
                    privateKey = JSON.parse(privateKey);
                } catch (e) {
                    // Not valid JSON, continue with string processing
                }
            }

            // Replace escaped newlines with actual newlines
            // This handles both \\n (from dotenv) and \n (literal backslash-n)
            privateKey = privateKey.replace(/\\n/g, '\n');

            console.log('🔑 Private key processed, length:', privateKey.length);

            const app = admin.initializeApp({
                credential: admin.credential.cert({
                    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
                    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                    privateKey: privateKey,
                }),
            });
            isInitialized = true;
            return app;
        } else {
            console.warn('⚠️ FIREBASE_PRIVATE_KEY not found.');
            // Don't initialize without credentials - operations will be skipped
            return null;
        }
    } catch (error) {
        console.error('❌ Firebase Admin initialization error:', error);
        // Don't throw - allow app to build, operations will fail gracefully
        return null;
    }
}

// Try to initialize - but don't fail the build if it doesn't work
const app = initializeFirebaseAdmin();
if (app) {
    console.log('✅ Firebase Admin initialized successfully');
}

// Export auth and db - these will be real or mock depending on initialization
export const adminAuth = (isDevBypass || !isInitialized) ? ({} as admin.auth.Auth) : admin.auth();
export const adminDb = (isDevBypass || !isInitialized) ? ({} as admin.firestore.Firestore) : admin.firestore();

/**
 * Updates user statistics (XP, level, streaks) in Firestore.
 * This runs server-side to ensure security and consistency.
 */
export async function updateUserStats(userId: string, xpGain: number, features?: { resume?: number }) {
    // Skip if not initialized or in dev bypass mode
    if (isDevBypass || !isInitialized) {
        console.log(`🔓 Skipping updateUserStats for ${userId} (not initialized)`);
        return;
    }

    if (!userId) return;

    const userRef = adminDb.collection('users').doc(userId);
    const now = admin.firestore.Timestamp.now();

    try {
        await adminDb.runTransaction(async (transaction) => {
            const userDoc = await transaction.get(userRef);

            if (!userDoc.exists) return;

            const data = userDoc.data() || {};
            const currentStats = data.stats || {
                xp: 0,
                level: 1,
                streakDays: 0,
                totalBadges: 0,
            };

            // Calculate new XP and Level
            const newXp = (currentStats.xp || 0) + xpGain;
            const newLevel = Math.floor(newXp / 1000) + 1; // 1000 XP per level

            // Calculate Streak
            let newStreak = currentStats.streakDays || 0;
            const lastActive = currentStats.lastActive;

            if (lastActive) {
                const lastDate = lastActive.toDate();
                const today = now.toDate();

                // Reset time for comparison
                lastDate.setHours(0, 0, 0, 0);
                today.setHours(0, 0, 0, 0);

                const diffDays = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

                if (diffDays === 1) {
                    newStreak += 1; // Consecutive day
                } else if (diffDays > 1) {
                    newStreak = 1; // Reset streak
                }
            } else {
                newStreak = 1; // First activity
            }

            const updatedStats = {
                ...currentStats,
                xp: newXp,
                level: newLevel,
                streakDays: newStreak,
                lastActive: now,
                ...(features?.resume ? { resumeScore: features.resume } : {}),
            };

            transaction.update(userRef, {
                stats: updatedStats,
                updatedAt: now
            });
        });

        console.log(`✨ Stats updated for ${userId}: +${xpGain} XP`);
    } catch (error) {
        console.error('❌ Error updating user stats:', error);
    }
}

/**
 * Checks if user has enough credits and deducts one if available.
 * Handles daily reset logic automatically.
 * 
 * @returns {Promise<{ allowed: boolean; error?: string }>} Result object
 */
export async function checkAndDeductCredits(userId: string): Promise<{ allowed: boolean; error?: string }> {
    // Allow if not initialized or in dev bypass mode
    if (isDevBypass || !isInitialized) {
        console.log(`🔓 Auto-allowing credits for ${userId} (not initialized)`);
        return { allowed: true };
    }

    if (!userId) return { allowed: false, error: 'No user ID' };

    const userRef = adminDb.collection('users').doc(userId);
    const now = admin.firestore.Timestamp.now();
    const DAILY_LIMIT = 30;

    try {
        return await adminDb.runTransaction(async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists) return { allowed: false, error: 'User document not found' };

            const data = userDoc.data() || {};
            const stats = data.stats || {};

            const lastReset = stats.lastCreditReset?.toDate();
            const today = now.toDate();

            // Normalize to midnight for comparison
            const todayMidnight = new Date(today);
            todayMidnight.setHours(0, 0, 0, 0);

            let credits = stats.credits;

            // Initialize or Reset if new day
            // If credits is undefined, or lastReset is missing, or lastReset is before today's midnight
            if (credits === undefined || !lastReset || lastReset < todayMidnight) {
                const newCredits = DAILY_LIMIT; // Reset to full

                // Update reset time
                transaction.update(userRef, {
                    'stats.credits': newCredits - 1, // Deduct immediately for this request
                    'stats.lastCreditReset': now
                });
                return { allowed: true };
            }

            // Check if credits available
            if (credits > 0) {
                transaction.update(userRef, {
                    'stats.credits': credits - 1
                });
                return { allowed: true };
            }

            return { allowed: false, error: `Daily limit reached (${credits}/${DAILY_LIMIT})` };
        });
    } catch (error: any) {
        console.error('❌ Error managing credits:', error);
        return { allowed: false, error: `Transaction failed: ${error.message}` };
    }
}
