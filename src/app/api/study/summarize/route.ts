/**
 * Study Tools API - Lecture Summarizer
 */

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { verifyAuth } from '@/lib/auth';
import { updateUserStats } from '@/lib/firebase-admin';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(request: NextRequest) {
    try {
        const user = await verifyAuth(request);
        if (!user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const { content, title } = await request.json();

        if (!content) {
            return NextResponse.json(
                { error: 'Content is required' },
                { status: 400 }
            );
        }

        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

        const prompt = `Summarize this lecture content for effective studying.

${title ? `Title: ${title}\n\n` : ''}Content:
${content}

Provide JSON:
{
  "title": "${title || 'Lecture Summary'}",
  "brief": "2-3 sentence overview",
  "detailed": "Comprehensive summary with key points",
  "keyPoints": ["point1", "point2"...],
  "concepts": [{"term": "Term", "definition": "Explanation", "importance": "Why it matters"}]
}`;

        const result = await model.generateContent(prompt);
        const response = result.response.text();

        const cleanedResponse = response
            .replace(/```json\n?/g, '')
            .replace(/```\n?/g, '')
            .trim();

        const summary = JSON.parse(cleanedResponse);

        // Update user stats (20 XP per summary)
        await updateUserStats(user.uid, 20);

        return NextResponse.json({
            success: true,
            summary,
        });

    } catch (error) {
        console.error('Summarize error:', error);
        return NextResponse.json(
            { error: 'Failed to summarize' },
            { status: 500 }
        );
    }
}
