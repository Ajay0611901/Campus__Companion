/**
 * Skill Recommendation Prompt Templates
 * 
 * AI Role: "Think like a career advisor + academic mentor"
 */

export const SKILL_RECOMMENDATION_SYSTEM = `You are a personalized career advisor and academic mentor with deep knowledge of industry trends, learning paths, and career development.

Your recommendations must be:
- Personalized: Based on the student's unique interests and goals
- Progressive: Build from foundational to advanced skills logically
- Practical: Include actionable steps and real resources
- Motivating: Explain WHY each skill matters for their career`;

export const SKILL_ROADMAP_PROMPT = `Create a personalized skill development roadmap for a student.

STUDENT PROFILE:
- Interests: {{interests}}
- Career Goal: {{careerGoal}}
- Current Skills: {{currentSkills}}
- Current Grade/Level: {{grade}}

Generate a comprehensive skill roadmap in the following JSON structure:

{
  "summary": "<2-3 sentences summarizing their path and potential>",
  "timeline": "<estimated time to reach career readiness, e.g., '6-12 months'>",
  "phases": [
    {
      "name": "<phase name, e.g., 'Foundation Building'>",
      "duration": "<e.g., '1-2 months'>",
      "skills": [
        {
          "name": "<skill name>",
          "priority": "essential|recommended|optional",
          "reason": "<why this skill matters for their goal>",
          "resources": ["<resource 1>", "<resource 2>"]
        }
      ],
      "milestone": "<what they can do after completing this phase>"
    }
  ],
  "courses": [
    {
      "title": "<course title>",
      "platform": "<Coursera, Udemy, YouTube, etc.>",
      "reason": "<why this course is recommended>",
      "duration": "<estimated duration>"
    }
  ],
  "projects": [
    {
      "title": "<project title>",
      "description": "<what to build and why>",
      "skills": ["<skill1>", "<skill2>"],
      "difficulty": "beginner|intermediate|advanced",
      "estimatedTime": "<e.g., '1-2 weeks'>"
    }
  ]
}

GUIDELINES:
1. Create 3-4 progressive phases
2. Include 3-5 skills per phase
3. Recommend 3-5 courses total
4. Suggest 2-4 portfolio projects
5. Make all recommendations specific and actionable
6. Consider current industry trends and job market demands`;

export const SKILL_GAP_ANALYSIS_PROMPT = `Analyze the skill gap between a student's current abilities and their career goal.

STUDENT PROFILE:
- Current Skills: {{currentSkills}}
- Career Goal: {{careerGoal}}
- Target Companies/Roles: {{targetRoles}}

Provide a gap analysis in JSON format:

{
  "readinessScore": <number 0-100>,
  "criticalGaps": [
    {
      "skill": "<missing skill>",
      "importance": "critical|high|medium",
      "estimatedLearningTime": "<e.g., '2-4 weeks'>",
      "resources": ["<resource 1>", "<resource 2>"]
    }
  ],
  "strengths": [
    {
      "skill": "<existing skill>",
      "marketValue": "<how this helps in the job market>",
      "enhancementTips": "<how to level up this skill>"
    }
  ],
  "quickWins": ["<skill that can be learned quickly for immediate impact>"],
  "longTermInvestments": ["<skill that takes time but has high ROI>"]
}`;

export const LEARNING_PATH_PROMPT = `Create a detailed weekly learning plan for developing: {{skill}}

Student Context:
- Current Level: {{currentLevel}}
- Available Time: {{hoursPerWeek}} hours/week
- Learning Style Preference: {{learningStyle}}

Generate a structured plan in JSON format:

{
  "skill": "{{skill}}",
  "totalDuration": "<e.g., '4 weeks'>",
  "weeklyPlan": [
    {
      "week": 1,
      "theme": "<week's focus>",
      "objectives": ["<objective 1>", "<objective 2>"],
      "activities": [
        {
          "type": "video|reading|practice|project",
          "title": "<activity title>",
          "duration": "<e.g., '2 hours'>",
          "resource": "<link or resource name>"
        }
      ],
      "assessment": "<how to know they've mastered this week's content>"
    }
  ],
  "finalProject": {
    "title": "<capstone project>",
    "description": "<project details>",
    "skills_demonstrated": ["<skill1>", "<skill2>"]
  }
}`;
