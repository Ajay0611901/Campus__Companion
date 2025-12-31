/**
 * AI Chat API Route
 * 
 * Uses OpenRouter API (OpenAI-compatible) - Unlimited usage
 * Now with user profile personalization!
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { updateUserStats, checkAndDeductCredits } from '@/lib/firebase-admin';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Log API key status on startup
if (!OPENROUTER_API_KEY) {
    console.error('❌ OPENROUTER_API_KEY is missing!');
} else {
    console.log('✅ OPENROUTER_API_KEY loaded');
}

export async function POST(request: NextRequest) {
    try {
        if (!OPENROUTER_API_KEY) {
            console.error('❌ OpenRouter API not configured');
            return NextResponse.json(
                { error: 'Server configuration error: Missing API key' },
                { status: 500 }
            );
        }

        const user = await verifyAuth(request);
        if (!user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Check and deduct credits
        const creditResult = await checkAndDeductCredits(user.uid);
        if (!creditResult.allowed) {
            return NextResponse.json(
                { error: `Insufficient credits. ${creditResult.error || 'Daily limit reached.'}` },
                { status: 403 }
            );
        }

        const { message, conversationHistory, userProfile } = await request.json();

        if (!message) {
            return NextResponse.json(
                { error: 'Message is required' },
                { status: 400 }
            );
        }

        console.log('📨 Chat request received:', { messageLength: message.length, hasProfile: !!userProfile });

        // Build messages array for OpenAI-compatible API
        const messages = [];

        // Build personalized system prompt
        let systemPrompt = `You are an intelligent, friendly, and helpful AI Learning Assistant for college students.
Your goal is to help students learn effectively, answer their questions clearly, and make studying engaging.
Be conversational, encouraging, and adapt your explanations to be easily understood.

Guidelines:
- Provide clear, well-structured answers
- Use examples when explaining complex topics
- Be encouraging and supportive
- If you're not sure about something, say so
- Keep responses focused and relevant`;

        // Add personalization if profile is available
        if (userProfile) {
            const personalizations = [];
            if (userProfile.name) personalizations.push(`Student's name is ${userProfile.name}`);
            if (userProfile.major) personalizations.push(`studying ${userProfile.major}`);
            if (userProfile.careerGoal) personalizations.push(`career goal: ${userProfile.careerGoal}`);
            if (userProfile.learningStyle) personalizations.push(`prefers ${userProfile.learningStyle} learning`);

            if (personalizations.length > 0) {
                systemPrompt += `\n\nStudent Profile: ${personalizations.join(', ')}. Personalize your responses accordingly.`;
            }
        }

        messages.push({
            role: 'system',
            content: systemPrompt
        });

        // Add conversation history if provided
        if (conversationHistory && typeof conversationHistory === 'string') {
            messages.push({
                role: 'assistant',
                content: `Previous context:\n${conversationHistory}`
            });
        }

        // Add the user's message
        messages.push({
            role: 'user',
            content: message
        });

        // Try multiple free models in case one is rate-limited
        const FREE_MODELS = [
            'google/gemma-2-9b-it:free',      // Google's Gemma - usually good availability
            'mistralai/mistral-7b-instruct:free', // Mistral as backup
            'meta-llama/llama-3.2-3b-instruct:free' // Llama as last resort
        ];

        let apiResponse = null;
        let lastError = null;

        for (const model of FREE_MODELS) {
            try {
                console.log(`🤖 Trying model: ${model}`);
                apiResponse = await fetch(OPENROUTER_API_URL, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                        'Content-Type': 'application/json',
                        'HTTP-Referer': 'http://localhost:3000',
                        'X-Title': 'AI Campus Companion'
                    },
                    body: JSON.stringify({
                        model: model,
                        messages: messages,
                        temperature: 0.7,
                        max_tokens: 1000,
                        stream: true
                    })
                });

                if (apiResponse.ok) {
                    console.log(`✅ Using model: ${model}`);
                    break;
                } else {
                    const errorData = await apiResponse.json().catch(() => ({}));
                    lastError = errorData;
                    console.log(`⚠️ Model ${model} failed, trying next...`);
                }
            } catch (err) {
                lastError = err;
                console.log(`⚠️ Model ${model} error, trying next...`);
            }
        }

        if (!apiResponse || !apiResponse.ok) {
            throw new Error(`All AI models are currently rate-limited. Please try again in a few minutes. (Last error: ${JSON.stringify(lastError)})`);
        }

        // Award XP at the start of the interaction
        updateUserStats(user.uid, 5).catch((err: any) => console.error('XP update failed:', err));

        // Return the raw stream to the client
        return new Response(apiResponse.body, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        });

    } catch (error: any) {
        console.error('❌ Chat error:', error);
        return NextResponse.json(
            {
                error: 'Failed to process message',
                details: error.message || 'Unknown error'
            },
            { status: 500 }
        );
    }
}

export async function GET() {
    return NextResponse.json({
        status: 'AI Chat is online',
        provider: 'OpenRouter (OpenAI-compatible)',
        model: 'meta-llama/llama-3.2-3b-instruct:free',
        features: ['Streaming', 'User Personalization', 'Unlimited Usage']
    });
}
