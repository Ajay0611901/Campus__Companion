import * as admin from 'firebase-admin';

if (!admin.apps.length) {
    try {
        admin.initializeApp({
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        });
        console.log('✅ Firebase Admin initialized');
    } catch (error) {
        console.error('❌ Firebase Admin initialization error:', error);
    }
}

export const adminAuth = admin.auth();
export const adminDb = admin.firestore();

/**
 * Updates user statistics (XP, level, streaks) in Firestore.
 * This runs server-side to ensure security and consistency.
 */
export async function updateUserStats(userId: string, xpGain: number, features?: { resume?: number }) {
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
