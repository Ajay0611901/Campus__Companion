/**
 * Study Tools API - Lecture Summarizer
 * Uses OpenRouter API for reliability
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { updateUserStats } from '@/lib/firebase-admin';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

export async function POST(request: NextRequest) {
    try {
        const user = await verifyAuth(request);
        if (!user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        if (!OPENROUTER_API_KEY) {
            console.error('OPENROUTER_API_KEY not configured');
            return NextResponse.json(
                { error: 'Server configuration error: Missing API key' },
                { status: 500 }
            );
        }

        const { content, title } = await request.json();

        if (!content) {
            return NextResponse.json(
                { error: 'Content is required' },
                { status: 400 }
            );
        }

        const prompt = `Summarize this lecture content for effective studying.

${title ? `Title: ${title}\n\n` : ''}Content:
${content}

Provide ONLY valid JSON with this structure:
{
  "title": "${title || 'Lecture Summary'}",
  "brief": "2-3 sentence overview",
  "detailed": "Comprehensive summary with key points",
  "keyPoints": ["point1", "point2", "point3"],
  "concepts": [{"term": "Term", "definition": "Explanation", "importance": "Why it matters"}]
}`;

        // Try multiple models for reliability
        const FREE_MODELS = [
            'google/gemma-2-9b-it:free',
            'mistralai/mistral-7b-instruct:free',
            'meta-llama/llama-3.2-3b-instruct:free'
        ];

        let aiResponse = null;
        let lastError = null;

        for (const model of FREE_MODELS) {
            try {
                console.log(`🔄 Summarizer trying model: ${model}`);
                const response = await fetch(OPENROUTER_API_URL, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                        'Content-Type': 'application/json',
                        'HTTP-Referer': 'http://localhost:3000',
                        'X-Title': 'AI Campus Companion'
                    },
                    body: JSON.stringify({
                        model: model,
                        messages: [{ role: 'user', content: prompt }],
                        temperature: 0.7,
                        max_tokens: 2000
                    })
                });

                if (response.ok) {
                    aiResponse = await response.json();
                    console.log(`✅ Summarizer using model: ${model}`);
                    break;
                } else {
                    lastError = await response.json().catch(() => ({}));
                    console.log(`⚠️ Model ${model} failed, trying next...`);
                }
            } catch (err) {
                lastError = err;
                console.log(`⚠️ Model ${model} error, trying next...`);
            }
        }

        if (!aiResponse) {
            throw new Error(`All AI models failed. Last error: ${JSON.stringify(lastError)}`);
        }

        const responseText = aiResponse.choices?.[0]?.message?.content || '';

        // Parse JSON from response - clean AI artifacts
        const cleanedResponse = responseText
            .replace(/```json\n?/g, '')
            .replace(/```\n?/g, '')
            .replace(/<s>/g, '')
            .replace(/<\/s>/g, '')
            .replace(/^\s*[\r\n]/gm, '')
            .trim();

        // Try to extract JSON object from response
        const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);

        let summary;
        try {
            if (jsonMatch) {
                summary = JSON.parse(jsonMatch[0]);
            } else {
                throw new Error('No JSON found');
            }
        } catch (parseError) {
            // Fallback if JSON parsing fails - use cleaned text
            const cleanText = cleanedResponse.replace(/<[^>]*>/g, '');
            summary = {
                title: title || 'Lecture Summary',
                brief: cleanText.slice(0, 200),
                detailed: cleanText,
                keyPoints: ['Content analyzed successfully'],
                concepts: []
            };
        }

        // Update user stats (20 XP per summary)
        await updateUserStats(user.uid, 20);

        return NextResponse.json({
            success: true,
            summary,
        });

    } catch (error: any) {
        console.error('Summarize error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to summarize' },
            { status: 500 }
        );
    }
}
