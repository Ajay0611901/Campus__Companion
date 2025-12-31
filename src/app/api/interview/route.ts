
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
            const { role, type, difficulty, currentSemester } = body;

            // Map semester to year for context
            const yearContext = currentSemester
                ? `a ${Math.ceil(parseInt(currentSemester) / 2)} year college student (semester ${currentSemester})`
                : 'a college student';

            const difficultyGuide = {
                entry: 'very easy and beginner-friendly, focusing on basic concepts and simple scenarios',
                mid: 'moderate difficulty, testing fundamental skills with practical examples',
                senior: 'challenging, testing deeper technical or behavioral competencies'
            };

            const prompt = `You are interviewing ${yearContext} for a ${role} internship or entry-level position.

Generate a ${difficultyGuide[difficulty as keyof typeof difficultyGuide] || difficultyGuide.entry} ${type} interview question.

IMPORTANT: 
- Keep questions simple and encouraging for students with limited work experience
- For technical questions, focus on fundamentals and classroom knowledge
- For behavioral questions, accept examples from college projects, group assignments, or extracurricular activities
- Avoid questions requiring years of professional experience

Return ONLY a JSON object with this format:
{
    "id": "q1",
    "question": "The actual question text (simple and encouraging)",
    "type": "${type}",
    "topic": "Specific topic (e.g. Basics, Teamwork, Problem Solving)"
}`;

            try {
                const aiResponse = await callAI(prompt);
                const firstQuestion = JSON.parse(aiResponse);

                return NextResponse.json({
                    success: true,
                    sessionId: Date.now().toString(),
                    firstQuestion
                });
            } catch (parseError) {
                console.error('Failed to parse AI response for interview question:', parseError);

                // Fallback question if AI returns invalid JSON
                const fallbackQuestion = {
                    id: "q1",
                    question: type === 'technical'
                        ? `Tell me about a challenging technical problem you've solved as a ${role}. What was your approach and what was the outcome?`
                        : `Describe a situation where you had to work with a difficult team member. How did you handle it and what was the result?`,
                    type: type,
                    topic: type === 'technical' ? 'Problem Solving' : 'Conflict Resolution'
                };

                return NextResponse.json({
                    success: true,
                    sessionId: Date.now().toString(),
                    firstQuestion: fallbackQuestion
                });
            }
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

            try {
                const aiResponse = await callAI(prompt);
                const feedback = JSON.parse(aiResponse);

                return NextResponse.json({
                    success: true,
                    feedback,
                    nextQuestion: null,
                    isComplete: true
                });
            } catch (parseError) {
                console.error('Failed to parse AI feedback:', parseError);

                // Generate basic feedback if AI parsing fails
                const answerLength = answer.length;
                const hasSTARElements = /situation|task|action|result/i.test(answer);
                const baseScore = Math.min(100, 40 + Math.floor(answerLength / 20) + (hasSTARElements ? 20 : 0));

                const fallbackFeedback = {
                    score: baseScore,
                    overallFeedback: answerLength > 200
                        ? "Good effort! Your answer provides detail. Consider structuring it using the STAR method for better clarity."
                        : "Your answer could be more detailed. Try using the STAR method: Situation, Task, Action, Result.",
                    starAnalysis: {
                        situation: { present: answerLength > 100, score: 60, feedback: "Consider adding more context about the situation" },
                        task: { present: answerLength > 150, score: 60, feedback: "Clarify what your specific responsibility was" },
                        action: { present: answerLength > 100, score: 65, feedback: "Detail the specific steps you took" },
                        result: { present: answerLength > 200, score: 55, feedback: "Quantify your results if possible" }
                    },
                    strengths: ["You attempted to answer the question", "You provided some context"],
                    improvements: ["Use the STAR method structure", "Add specific metrics and outcomes", "Be more detailed in your response"],
                    modelAnswer: "A strong answer would include: 1) A clear situation with context, 2) Your specific task/role, 3) Detailed actions you took, 4) Quantifiable results and what you learned."
                };

                return NextResponse.json({
                    success: true,
                    feedback: fallbackFeedback,
                    nextQuestion: null,
                    isComplete: true
                });
            }
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

    } catch (error: any) {
        console.error('Interview API Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

// Helper to call AI via OpenRouter
async function callAI(prompt: string) {
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
    let content = data.choices[0].message.content;

    // Clean up markdown code blocks if present
    content = content.replace(/```json/g, '').replace(/```/g, '').trim();
    return content;
}
