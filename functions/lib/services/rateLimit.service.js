"use strict";
/**
 * Rate Limiting Service
 *
 * Prevents cost explosion by enforcing daily AI call quotas per user
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkRateLimit = checkRateLimit;
exports.getUserUsage = getUserUsage;
exports.isApproachingLimit = isApproachingLimit;
const firebase_admin_1 = require("firebase-admin");
const https_1 = require("firebase-functions/v1/https");
const ai_utils_1 = require("./ai.utils");
// Default limits
const DEFAULT_LIMITS = {
    dailyLimit: 100, // 100 AI calls per day
    hourlyLimit: 30, // 30 calls per hour
    perMinuteLimit: 5, // 5 calls per minute
};
// Premium limits (for future use)
const PREMIUM_LIMITS = {
    dailyLimit: 500,
    hourlyLimit: 100,
    perMinuteLimit: 10,
};
/**
 * Check and update rate limits for a user
 */
async function checkRateLimit(userId, feature, isPremium = false) {
    const limits = isPremium ? PREMIUM_LIMITS : DEFAULT_LIMITS;
    const today = new Date().toISOString().split('T')[0];
    const now = Date.now();
    try {
        const db = (0, firebase_admin_1.firestore)();
        const usageRef = db.collection('usage').doc(userId);
        await db.runTransaction(async (transaction) => {
            var _a, _b;
            const doc = await transaction.get(usageRef);
            let usage;
            if (!doc.exists || ((_a = doc.data()) === null || _a === void 0 ? void 0 : _a.date) !== today) {
                // New day - reset counters
                usage = {
                    userId,
                    date: today,
                    dailyCount: 0,
                    hourlyCount: 0,
                    lastHourReset: now,
                    minuteCount: 0,
                    lastMinuteReset: now,
                    totalCalls: doc.exists ? (((_b = doc.data()) === null || _b === void 0 ? void 0 : _b.totalCalls) || 0) : 0,
                    lastCallTimestamp: now,
                };
            }
            else {
                usage = doc.data();
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
                ai_utils_1.aiLogger.warn('Daily rate limit exceeded', {
                    userId,
                    feature,
                    dailyCount: usage.dailyCount,
                    limit: limits.dailyLimit,
                });
                throw new https_1.HttpsError('resource-exhausted', `Daily AI limit reached (${limits.dailyLimit} calls/day). Try again tomorrow or upgrade to premium.`);
            }
            if (usage.hourlyCount >= limits.hourlyLimit) {
                ai_utils_1.aiLogger.warn('Hourly rate limit exceeded', {
                    userId,
                    feature,
                    hourlyCount: usage.hourlyCount,
                    limit: limits.hourlyLimit,
                });
                throw new https_1.HttpsError('resource-exhausted', `Hourly AI limit reached (${limits.hourlyLimit} calls/hour). Please wait a bit.`);
            }
            if (usage.minuteCount >= limits.perMinuteLimit) {
                ai_utils_1.aiLogger.warn('Per-minute rate limit exceeded', {
                    userId,
                    feature,
                    minuteCount: usage.minuteCount,
                    limit: limits.perMinuteLimit,
                });
                throw new https_1.HttpsError('resource-exhausted', `Too many requests. Please wait a minute before trying again.`);
            }
            // Prevent rapid-fire requests (anti-loop protection)
            if (now - usage.lastCallTimestamp < 1000) {
                ai_utils_1.aiLogger.warn('Rapid-fire request detected', {
                    userId,
                    feature,
                    timeSinceLastCall: now - usage.lastCallTimestamp,
                });
                throw new https_1.HttpsError('resource-exhausted', 'Please wait at least 1 second between AI requests.');
            }
            // Increment counters
            usage.dailyCount += 1;
            usage.hourlyCount += 1;
            usage.minuteCount += 1;
            usage.totalCalls += 1;
            usage.lastCallTimestamp = now;
            // Update Firestore
            transaction.set(usageRef, usage);
            ai_utils_1.aiLogger.info('Rate limit check passed', {
                userId,
                feature,
                dailyCount: usage.dailyCount,
                dailyLimit: limits.dailyLimit,
                remaining: limits.dailyLimit - usage.dailyCount,
            });
        });
    }
    catch (error) {
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        // Log error but allow request to proceed (fail-open for availability)
        ai_utils_1.aiLogger.error('Rate limit check failed', error, {
            userId,
            feature,
        });
    }
}
/**
 * Get user's current usage stats
 */
async function getUserUsage(userId) {
    try {
        const db = (0, firebase_admin_1.firestore)();
        const doc = await db.collection('usage').doc(userId).get();
        if (!doc.exists) {
            return null;
        }
        return doc.data();
    }
    catch (error) {
        ai_utils_1.aiLogger.error('Failed to get user usage', error, {
            userId,
            feature: 'rate_limit',
        });
        return null;
    }
}
/**
 * Check if user is approaching their daily limit
 */
function isApproachingLimit(usage, limits) {
    return usage.dailyCount >= limits.dailyLimit * 0.8; // 80% threshold
}
//# sourceMappingURL=rateLimit.service.js.map