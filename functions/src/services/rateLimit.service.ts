/**
 * Rate Limiting Service
 * 
 * Prevents cost explosion by enforcing daily AI call quotas per user
 */

import { firestore } from 'firebase-admin';
import { HttpsError } from 'firebase-functions/v1/https';
import { aiLogger } from './ai.utils';

interface RateLimitConfig {
    dailyLimit: number;
    hourlyLimit: number;
    perMinuteLimit: number;
}

interface UsageRecord {
    userId: string;
    date: string; // YYYY-MM-DD
    dailyCount: number;
    hourlyCount: number;
    lastHourReset: number; // timestamp
    minuteCount: number;
    lastMinuteReset: number; // timestamp
    totalCalls: number;
    lastCallTimestamp: number;
}

// Default limits
const DEFAULT_LIMITS: RateLimitConfig = {
    dailyLimit: 100,      // 100 AI calls per day
    hourlyLimit: 30,      // 30 calls per hour
    perMinuteLimit: 5,    // 5 calls per minute
};

// Premium limits (for future use)
const PREMIUM_LIMITS: RateLimitConfig = {
    dailyLimit: 500,
    hourlyLimit: 100,
    perMinuteLimit: 10,
};

/**
 * Check and update rate limits for a user
 */
export async function checkRateLimit(
    userId: string,
    feature: string,
    isPremium: boolean = false
): Promise<void> {
    const limits = isPremium ? PREMIUM_LIMITS : DEFAULT_LIMITS;
    const today = new Date().toISOString().split('T')[0];
    const now = Date.now();

    try {
        const db = firestore();
        const usageRef = db.collection('usage').doc(userId);

        await db.runTransaction(async (transaction) => {
            const doc = await transaction.get(usageRef);

            let usage: UsageRecord;

            if (!doc.exists || doc.data()?.date !== today) {
                // New day - reset counters
                usage = {
                    userId,
                    date: today,
                    dailyCount: 0,
                    hourlyCount: 0,
                    lastHourReset: now,
                    minuteCount: 0,
                    lastMinuteReset: now,
                    totalCalls: doc.exists ? (doc.data()?.totalCalls || 0) : 0,
                    lastCallTimestamp: now,
                };
            } else {
                usage = doc.data() as UsageRecord;

                // Reset hourly counter if an hour has passed
                if (now - usage.lastHourReset > 3600000) {
                    usage.hourlyCount = 0;
                    usage.lastHourReset = now;
                }

                // Reset minute counter if a minute has passed
                if (now - usage.lastMinuteReset > 60000) {
                    usage.minuteCount = 0;
                    usage.lastMinuteReset = now;
                }
            }

            // Check limits
            if (usage.dailyCount >= limits.dailyLimit) {
                aiLogger.warn('Daily rate limit exceeded', {
                    userId,
                    feature,
                    dailyCount: usage.dailyCount,
                    limit: limits.dailyLimit,
                });
                throw new HttpsError(
                    'resource-exhausted',
                    `Daily AI limit reached (${limits.dailyLimit} calls/day). Try again tomorrow or upgrade to premium.`
                );
            }

            if (usage.hourlyCount >= limits.hourlyLimit) {
                aiLogger.warn('Hourly rate limit exceeded', {
                    userId,
                    feature,
                    hourlyCount: usage.hourlyCount,
                    limit: limits.hourlyLimit,
                });
                throw new HttpsError(
                    'resource-exhausted',
                    `Hourly AI limit reached (${limits.hourlyLimit} calls/hour). Please wait a bit.`
                );
            }

            if (usage.minuteCount >= limits.perMinuteLimit) {
                aiLogger.warn('Per-minute rate limit exceeded', {
                    userId,
                    feature,
                    minuteCount: usage.minuteCount,
                    limit: limits.perMinuteLimit,
                });
                throw new HttpsError(
                    'resource-exhausted',
                    `Too many requests. Please wait a minute before trying again.`
                );
            }

            // Prevent rapid-fire requests (anti-loop protection)
            if (now - usage.lastCallTimestamp < 1000) {
                aiLogger.warn('Rapid-fire request detected', {
                    userId,
                    feature,
                    timeSinceLastCall: now - usage.lastCallTimestamp,
                });
                throw new HttpsError(
                    'resource-exhausted',
                    'Please wait at least 1 second between AI requests.'
                );
            }

            // Increment counters
            usage.dailyCount += 1;
            usage.hourlyCount += 1;
            usage.minuteCount += 1;
            usage.totalCalls += 1;
            usage.lastCallTimestamp = now;

            // Update Firestore
            transaction.set(usageRef, usage);

            aiLogger.info('Rate limit check passed', {
                userId,
                feature,
                dailyCount: usage.dailyCount,
                dailyLimit: limits.dailyLimit,
                remaining: limits.dailyLimit - usage.dailyCount,
            });
        });
    } catch (error) {
        if (error instanceof HttpsError) {
            throw error;
        }

        // Log error but allow request to proceed (fail-open for availability)
        aiLogger.error('Rate limit check failed', error as Error, {
            userId,
            feature,
        });
    }
}

/**
 * Get user's current usage stats
 */
export async function getUserUsage(userId: string): Promise<UsageRecord | null> {
    try {
        const db = firestore();
        const doc = await db.collection('usage').doc(userId).get();

        if (!doc.exists) {
            return null;
        }

        return doc.data() as UsageRecord;
    } catch (error) {
        aiLogger.error('Failed to get user usage', error as Error, {
            userId,
            feature: 'rate_limit',
        });
        return null;
    }
}

/**
 * Check if user is approaching their daily limit
 */
export function isApproachingLimit(usage: UsageRecord, limits: RateLimitConfig): boolean {
    return usage.dailyCount >= limits.dailyLimit * 0.8; // 80% threshold
}
