/**
 * Skills Recommender API Route
 * Uses OpenRouter API for reliability
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

    const { interests, careerGoal, currentSkills, grade } = await request.json();

    const prompt = `Create a personalized skill roadmap for a ${grade} student.

Career Goal: ${careerGoal}
Interests: ${interests.join(', ')}
Current Skills: ${currentSkills.join(', ') || 'None specified'}

Return ONLY valid JSON with this EXACT structure:
{
  "summary": "Brief overview of the learning path",
  "timeline": "Expected timeframe like 6-12 months",
  "phases": [
    {
      "name": "Phase 1 name",
      "duration": "2-3 months",
      "skills": [{"name": "Skill name", "priority": "essential", "reason": "Why learn this"}],
      "milestone": "What you will achieve"
    }
  ],
  "courses": [{"title": "Course name", "platform": "Coursera/Udemy/etc", "reason": "Why", "duration": "4 weeks"}],
  "projects": [{"title": "Project name", "description": "What to build", "skills": ["skill1"], "difficulty": "beginner"}]
}`;

    // Try multiple models
    const FREE_MODELS = [
      'google/gemma-2-9b-it:free',
      'mistralai/mistral-7b-instruct:free',
      'meta-llama/llama-3.2-3b-instruct:free'
    ];

    let aiResponse = null;
    let lastError = null;

    for (const model of FREE_MODELS) {
      try {
        console.log(`🔄 Skills roadmap trying model: ${model}`);
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
            max_tokens: 3000
          })
        });

        if (response.ok) {
          aiResponse = await response.json();
          console.log(`✅ Skills roadmap using model: ${model}`);
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
      throw new Error(`All models failed. Last error: ${JSON.stringify(lastError)}`);
    }

    const responseText = aiResponse.choices?.[0]?.message?.content || '';

    // Clean the response - remove common AI output artifacts
    const cleanedResponse = responseText
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .replace(/<s>/g, '')
      .replace(/<\/s>/g, '')
      .replace(/^\s*[\r\n]/gm, '')
      .trim();

    // Find the JSON object in the response
    const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No valid JSON found in response');
    }

    let roadmap;
    try {
      roadmap = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      // Fallback roadmap if parsing fails
      roadmap = {
        summary: `Personalized learning roadmap for ${careerGoal}`,
        timeline: "6-12 months",
        phases: [
          {
            name: "Foundation Phase",
            duration: "2-3 months",
            skills: [{ name: "Core concepts", priority: "essential", reason: "Build fundamentals" }],
            milestone: "Understand the basics"
          }
        ],
        courses: [{ title: "Foundational Course", platform: "Coursera", reason: "Start learning", duration: "4 weeks" }],
        projects: [{ title: "Starter Project", description: "Build a basic project", skills: interests, difficulty: "beginner" }]
      };
    }

    return NextResponse.json({
      success: true,
      roadmap,
    });

  } catch (error: any) {
    console.error('Skills error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate roadmap' },
      { status: 500 }
    );
  }
}
