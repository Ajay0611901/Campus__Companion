/**
 * Resume Analyzer API Route
 * 
 * Replaces Firebase Cloud Function - runs on Vercel serverless
 */

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { verifyAuth } from '@/lib/auth';

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

        const { resumeText, targetRole } = await request.json();

        // Validate input
        if (!resumeText || !targetRole) {
            return NextResponse.json(
                { error: 'Missing resumeText or targetRole' },
                { status: 400 }
            );
        }

        // Call Gemini AI
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

        const prompt = `You are an expert ATS (Applicant Tracking System) and resume analyst.

Analyze this resume for the role: ${targetRole}

Resume:
${resumeText}

Provide a JSON response with:
{
  "score": number (0-100),
  "strengths": string[] (3-5 items),
  "missingSkills": string[] (3-5 skills needed for ${targetRole}),
  "suggestions": string[] (3-5 specific improvements)
}

Focus on:
1. Relevant skills for ${targetRole}
2. Quantifiable achievements
3. ATS keyword optimization
4. Professional formatting

Return ONLY valid JSON, no markdown.`;

        const result = await model.generateContent(prompt);
        const response = result.response.text();

        // Parse JSON response
        const cleanedResponse = response
            .replace(/```json\n?/g, '')
            .replace(/```\n?/g, '')
            .trim();

        const analysis = JSON.parse(cleanedResponse);

        return NextResponse.json({
            success: true,
            analysis,
            cached: false,
        });

    } catch (error) {
        console.error('Resume analysis error:', error);
        return NextResponse.json(
            { error: 'Failed to analyze resume', details: (error as Error).message },
            { status: 500 }
        );
    }
}
