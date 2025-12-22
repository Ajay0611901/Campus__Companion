
import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { checkAndDeductCredits } from '@/lib/firebase-admin';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

export async function POST(request: NextRequest) {
    if (!OPENROUTER_API_KEY) {
        return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    try {

        const user = await verifyAuth(request);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Check credits
        const creditResult = await checkAndDeductCredits(user.uid);
        if (!creditResult.allowed) {
            return NextResponse.json(
                { error: `Insufficient credits. ${creditResult.error || 'Daily limit reached.'}` },
                { status: 403 }
            );
        }

        const body = await request.json();
        const { action } = body;

        // ==========================================
        // ACTION: START
        // ==========================================
        if (action === 'start') {
            const { role, type, difficulty } = body;

            const prompt = `Generate a realistic ${difficulty} level ${type} interview question for a ${role} position.
            Return ONLY a JSON object with this format:
            {
                "id": "q1",
                "question": "The actual question text",
                "type": "${type}",
                "topic": "Specific topic (e.g. System Design, Conflict Resolution)"
            }`;

            const aiResponse = await callGemini(prompt);
            const firstQuestion = JSON.parse(aiResponse);

            return NextResponse.json({
                success: true,
                sessionId: Date.now().toString(),
                firstQuestion
            });
        }

        // ==========================================
        // ACTION: SUBMIT
        // ==========================================
        if (action === 'submit') {
            const { answer } = body;

            // Evaluate the answer
            const prompt = `Evaluate this interview answer: "${answer}".
            Provide feedback in this JSON format:
            {
                "score": 85,
                "overallFeedback": "Brief summary",
                "starAnalysis": {
                    "situation": { "present": true, "score": 90, "feedback": "Good context" },
                    "task": { "present": true, "score": 85, "feedback": "Clear goal" },
                    "action": { "present": true, "score": 80, "feedback": "Specific actions" },
                    "result": { "present": true, "score": 85, "feedback": "Quantifiable results" }
                },
                "strengths": ["Strength 1", "Strength 2"],
                "improvements": ["Improvement 1", "Improvement 2"],
                "modelAnswer": "An ideal example answer..."
            }`;

            const aiResponse = await callGemini(prompt);
            const feedback = JSON.parse(aiResponse);

            // For this MVP, we end the session after 1 question to keep it simple
            // In future, generate nextQuestion here

            return NextResponse.json({
                success: true,
                feedback,
                nextQuestion: null,
                isComplete: true
            });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

    } catch (error: any) {
        console.error('Interview API Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

// Helper to call Gemini via OpenRouter
async function callGemini(prompt: string) {
    const response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'http://localhost:3000',
            'X-Title': 'AI Campus Companion'
        },
        body: JSON.stringify({
            model: 'google/gemini-2.0-flash-001',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7,
            response_format: { type: 'json_object' } // Enforce JSON if supported, otherwise prompt does it
        })
    });

    if (!response.ok) {
        throw new Error('AI Provider Error');
    }

    const data = await response.json();
    let content = data.choices[0].message.content;

    // Clean up markdown code blocks if present
    content = content.replace(/```json/g, '').replace(/```/g, '').trim();
    return content;
}
