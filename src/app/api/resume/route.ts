/**
 * Resume Analyzer API Route
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

        const { resumeText, targetRole } = await request.json();

        if (!resumeText || !targetRole) {
            return NextResponse.json(
                { error: 'Missing resumeText or targetRole' },
                { status: 400 }
            );
        }

        const prompt = `You are an expert ATS (Applicant Tracking System) and resume analyst.

Analyze this resume for the role: ${targetRole}

Resume:
${resumeText}

Provide a comprehensive JSON response with:
{
  "score": number (0-100),
  "strengths": ["strength1", "strength2", "strength3"],
  "missingSkills": ["skill1", "skill2", "skill3"],
  "suggestions": ["suggestion1", "suggestion2", "suggestion3"],
  "sectionSuggestions": {
    "summary": "what to include in professional summary",
    "skills": ["skill to add 1", "skill to add 2"],
    "experience": ["tip1", "tip2"],
    "projects": ["project idea 1", "project idea 2"],
    "education": "education recommendation"
  },
  "atsKeywords": ["keyword1", "keyword2", "keyword3"],
  "contentToAdd": [
    {
      "section": "Skills",
      "suggestion": "Specific content to add",
      "example": "Example bullet point"
    }
  ]
}

Return ONLY valid JSON, no markdown.`;

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
                console.log(`🔄 Resume analyzer trying model: ${model}`);
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
                    console.log(`✅ Resume analyzer using model: ${model}`);
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

        // Parse JSON response - clean AI artifacts
        const cleanedResponse = responseText
            .replace(/```json\n?/g, '')
            .replace(/```\n?/g, '')
            .replace(/<s>/g, '')
            .replace(/<\/s>/g, '')
            .replace(/^\s*[\r\n]/gm, '')
            .trim();

        // Try to extract JSON object from response
        const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);

        let analysis;
        try {
            if (jsonMatch) {
                analysis = JSON.parse(jsonMatch[0]);
            } else {
                throw new Error('No JSON found');
            }
        } catch (parseError) {
            // Fallback if JSON parsing fails
            analysis = {
                score: 50,
                strengths: ['Resume content provided'],
                missingSkills: ['Could not analyze - please try again'],
                suggestions: ['Try providing more detailed resume content']
            };
        }

        // Update user stats
        await updateUserStats(user.uid, 50, { resume: analysis.score || 50 });

        return NextResponse.json({
            success: true,
            analysis,
            cached: false,
        });

    } catch (error: any) {
        console.error('Resume analysis error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to analyze resume' },
            { status: 500 }
        );
    }
}
