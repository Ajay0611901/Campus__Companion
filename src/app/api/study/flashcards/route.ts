
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

        const { content } = await request.json();

        if (!content) {
            return NextResponse.json({ error: 'Content is required' }, { status: 400 });
        }

        const prompt = `Generate 10 flashcards based on this content:
        "${content.substring(0, 5000)}..." (truncated for brevity)
        
        Return ONLY a raw JSON object with this structure:
        {
            "flashcards": [
                {
                    "id": "1",
                    "front": "Term or Question",
                    "back": "Definition or Answer",
                    "difficulty": 1
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
                model: 'google/gemini-2.0-flash-001',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.7,
                response_format: { type: 'json_object' }
            })
        });

        if (!response.ok) {
            throw new Error('AI Provider Error');
        }

        const data = await response.json();
        let jsonContent = data.choices[0].message.content;
        jsonContent = jsonContent.replace(/```json/g, '').replace(/```/g, '').trim();

        const result = JSON.parse(jsonContent);

        return NextResponse.json({ success: true, flashcards: result.flashcards });

    } catch (error: any) {
        console.error('Flashcard Generation Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
