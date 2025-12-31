
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

        const { content, quizType, difficulty, numQuestions } = await request.json();

        if (!content) {
            return NextResponse.json({ error: 'Content is required' }, { status: 400 });
        }

        const prompt = `Generate a ${numQuestions}-question ${difficulty} difficulty ${quizType} quiz based on this content:
        "${content.substring(0, 5000)}..." (truncated for brevity)
        
        Return ONLY a raw JSON object with this structure:
        {
            "title": "Quiz Title",
            "questions": [
                {
                    "id": "1",
                    "question": "Question text",
                    "type": "multiple-choice",
                    "options": ["A", "B", "C", "D"],
                    "correctAnswer": "The correct option text",
                    "explanation": "Why it is correct",
                    "difficulty": "${difficulty}"
                }
            ]
        }`;

        const response = await fetch(OPENROUTER_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'http://localhost:3000',
                'X-Title': 'AI Campus Companion'
            },
            body: JSON.stringify({
                model: 'meta-llama/llama-3.2-3b-instruct:free',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.7,
            })
        });

        if (!response.ok) {
            throw new Error('AI Provider Error');
        }

        const data = await response.json();
        let jsonContent = data.choices[0].message.content;
        jsonContent = jsonContent.replace(/```json/g, '').replace(/```/g, '').trim();

        const quiz = JSON.parse(jsonContent);

        return NextResponse.json({ success: true, quiz });

    } catch (error: any) {
        console.error('Quiz Generation Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
