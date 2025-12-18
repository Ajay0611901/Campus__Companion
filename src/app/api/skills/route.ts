/**
 * Skills Recommender API Route
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

    const { interests, careerGoal, currentSkills, grade } = await request.json();

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    const prompt = `Create a personalized skill roadmap for a ${grade} student.

Career Goal: ${careerGoal}
Interests: ${interests.join(', ')}
Current Skills: ${currentSkills.join(', ')}

Provide a JSON response with:
{
  "summary": "Brief overview",
  "timeline": "Expected timeframe",
  "phases": [
    {
      "name": "Phase name",
      "duration": "Time estimate",
      "skills": [{"name": "Skill", "priority": "high/medium", "reason": "Why"}],
      "milestone": "What you'll achieve"
    }
  ],
  "courses": [{"title": "Course name", "platform": "Where", "reason": "Why", "duration": "Time"}],
  "projects": [{"title": "Project", "description": "What to build", "skills": ["skills"], "difficulty": "beginner/intermediate/advanced"}]
}`;

    const result = await model.generateContent(prompt);
    const response = result.response.text();

    const cleanedResponse = response
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    const roadmap = JSON.parse(cleanedResponse);

    return NextResponse.json({
      success: true,
      roadmap,
    });

  } catch (error) {
    console.error('Skills error:', error);
    return NextResponse.json(
      { error: 'Failed to generate roadmap' },
      { status: 500 }
    );
  }
}
