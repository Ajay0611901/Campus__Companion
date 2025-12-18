/**
 * AI Chat API Route
 * 
 * Uses OpenRouter API (OpenAI-compatible) - Unlimited usage
 * Now with user profile personalization!
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { updateUserStats } from '@/lib/firebase-admin';

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

        // System message with personalization
        let systemPrompt = `You are an AI Learning Assistant for college students. You help with:
- Academic concepts and explanations
- Study techniques and tips
- Career guidance
- Technical interview preparation
- Project ideas and guidance

Be concise, friendly, and educational. Use examples when helpful.`;

        // Add personalized context if profile exists
        if (userProfile) {
            systemPrompt += `

STUDENT PROFILE:
- Name: ${userProfile.fullName || 'Student'}
- College: ${userProfile.collegeName || 'Unknown'}
- Degree: ${userProfile.degree || 'Unknown'} ${userProfile.degreeDomain ? `(${userProfile.degreeDomain})` : ''}
- Year: ${userProfile.graduationYear || 'Unknown'}
- Current Semester: ${userProfile.currentSemester || 'Unknown'}
- Target Role: ${userProfile.targetRole || 'Not specified'}
- Skills: ${userProfile.skillsLearned?.join(', ') || 'None specified'}
- Interested Domains: ${userProfile.interestedDomains?.join(', ') || 'None specified'}
- Experience Level: ${userProfile.experienceLevel || 'Fresher'}

IMPORTANT: Use this information to personalize your responses. When the student asks about themselves or their studies, reference this specific information. Tailor recommendations and advice to their degree, skills, and career goals.`;
        }

        messages.push({
            role: 'system',
            content: systemPrompt
        });

        // Add conversation history if exists
        if (conversationHistory) {
            const historyLines = conversationHistory.split('\n');
            historyLines.forEach((line: string) => {
                if (line.startsWith('User: ')) {
                    messages.push({
                        role: 'user',
                        content: line.replace('User: ', '')
                    });
                } else if (line.startsWith('Assistant: ')) {
                    messages.push({
                        role: 'assistant',
                        content: line.replace('Assistant: ', '')
                    });
                }
            });
        }

        // Add current user message
        messages.push({
            role: 'user',
            content: message
        });

        // Call OpenRouter API with streaming
        const apiResponse = await fetch(OPENROUTER_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'http://localhost:3000',
                'X-Title': 'AI Campus Companion'
            },
            body: JSON.stringify({
                model: 'google/gemini-2.0-flash-001',
                messages: messages,
                temperature: 0.7,
                max_tokens: 1000,
                stream: true // Enable streaming
            })
        });

        if (!apiResponse.ok) {
            const errorData = await apiResponse.json().catch(() => ({}));
            throw new Error(`OpenRouter API error: ${JSON.stringify(errorData)}`);
        }

        // Award XP at the start of the interaction
        updateUserStats(user.uid, 5).catch(err => console.error('XP update failed:', err));

        // Return the raw stream to the client
        return new Response(apiResponse.body, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        });

    } catch (error: any) {
        console.error('❌ Chat error:', {
            message: error.message,
            stack: error.stack,
        });

        return NextResponse.json(
            {
                success: false,
                error: 'Failed to process message',
                details: error.message
            },
            { status: 500 }
        );
    }
}
