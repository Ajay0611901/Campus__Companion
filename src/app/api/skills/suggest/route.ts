/**
 * Skills Suggestion API
 * Generates suggested interests and skills based on career goal
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';

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
            return NextResponse.json(
                { error: 'Server configuration error' },
                { status: 500 }
            );
        }

        const { careerGoal } = await request.json();

        if (!careerGoal || careerGoal.length < 3) {
            return NextResponse.json(
                { error: 'Career goal is required (min 3 characters)' },
                { status: 400 }
            );
        }

        const prompt = `For someone interested in becoming a "${careerGoal}", suggest relevant interests and current skills they might have.

Return ONLY valid JSON:
{
  "interests": ["interest1", "interest2", "interest3", "interest4", "interest5", "interest6"],
  "skills": ["skill1", "skill2", "skill3", "skill4", "skill5", "skill6"]
}

- interests: 6 relevant areas/topics they might be interested in (e.g., "Web Development", "Data Analysis", "Cloud Computing")
- skills: 6 foundational/entry-level skills they might already have or need to start with (e.g., "Python", "HTML/CSS", "Problem Solving")

Keep suggestions practical and appropriate for students/beginners.`;

        // Try models for reliability
        const FREE_MODELS = [
            'google/gemma-2-9b-it:free',
            'mistralai/mistral-7b-instruct:free',
            'meta-llama/llama-3.2-3b-instruct:free'
        ];

        let aiResponse = null;

        for (const model of FREE_MODELS) {
            try {
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
                        max_tokens: 500
                    })
                });

                if (response.ok) {
                    aiResponse = await response.json();
                    break;
                }
            } catch (err) {
                console.log(`Model ${model} failed, trying next...`);
            }
        }

        if (!aiResponse) {
            // Fallback suggestions if AI fails
            return NextResponse.json({
                suggestions: {
                    interests: ['Technology', 'Problem Solving', 'Innovation', 'Learning'],
                    skills: ['Communication', 'Teamwork', 'Basic Programming', 'Research']
                }
            });
        }

        const responseText = aiResponse.choices?.[0]?.message?.content || '';
        const cleanedResponse = responseText
            .replace(/```json\n?/g, '')
            .replace(/```\n?/g, '')
            .trim();

        let suggestions;
        try {
            suggestions = JSON.parse(cleanedResponse);
        } catch {
            suggestions = {
                interests: ['Technology', 'Problem Solving', 'Innovation', 'Learning'],
                skills: ['Communication', 'Teamwork', 'Basic Programming', 'Research']
            };
        }

        return NextResponse.json({ suggestions });

    } catch (error: any) {
        console.error('Skills suggest error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to generate suggestions' },
            { status: 500 }
        );
    }
}
