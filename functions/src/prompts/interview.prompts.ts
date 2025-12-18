/**
 * Interview Coach Prompt Templates
 * 
 * AI Role: "Think like a senior interviewer"
 */

export const INTERVIEW_COACH_SYSTEM = `You are a senior technical interviewer with 15+ years of experience hiring at top tech companies. You combine rigorous evaluation with supportive coaching.

Your approach must be:
- Realistic: Ask questions that real interviewers ask
- Thorough: Evaluate answers using structured frameworks (STAR method for behavioral)
- Constructive: Provide specific, actionable feedback
- Adaptive: Adjust difficulty based on candidate performance`;

export const GENERATE_QUESTIONS_PROMPT = `Generate interview questions for the following role.

INTERVIEW DETAILS:
- Target Role: {{role}}
- Interview Type: {{type}} (behavioral, technical, mixed)
- Difficulty Level: {{difficulty}} (entry, mid, senior)
- Previous Questions: {{previousQuestions}}

Generate questions in JSON format:

{
  "questions": [
    {
      "id": "<unique id>",
      "question": "<interview question>",
      "type": "behavioral|technical|situational",
      "difficulty": "easy|medium|hard",
      "topic": "<what this tests, e.g., 'leadership', 'system design'>",
      "expectedElements": ["<key point 1 to look for>", "<key point 2>"],
      "followUps": ["<potential follow-up question 1>", "<follow-up 2>"],
      "timeGuideline": "<e.g., '2-3 minutes'>"
    }
  ]
}

Guidelines:
1. Generate 5 diverse questions
2. For behavioral: Use "Tell me about a time..." format
3. For technical: Include coding, system design, or problem-solving
4. Vary topics to cover different competencies
5. Don't repeat previous questions`;

export const EVALUATE_ANSWER_PROMPT = `Evaluate the candidate's interview answer.

QUESTION: {{question}}
QUESTION TYPE: {{questionType}}
EXPECTED ELEMENTS: {{expectedElements}}

CANDIDATE'S ANSWER:
"""
{{answer}}
"""

Evaluate the answer in JSON format:

{
  "score": <number 0-100>,
  "overallFeedback": "<2-3 sentences of overall assessment>",
  
  "starAnalysis": {
    "situation": {
      "present": <boolean>,
      "score": <0-100>,
      "feedback": "<specific feedback on situation description>"
    },
    "task": {
      "present": <boolean>,
      "score": <0-100>,
      "feedback": "<specific feedback on task clarity>"
    },
    "action": {
      "present": <boolean>,
      "score": <0-100>,
      "feedback": "<specific feedback on actions taken>"
    },
    "result": {
      "present": <boolean>,
      "score": <0-100>,
      "feedback": "<specific feedback on results/outcomes>"
    }
  },
  
  "technicalAccuracy": <number 0-100 if applicable, null otherwise>,
  
  "communicationScore": <number 0-100>,
  "communicationFeedback": "<feedback on clarity, structure, confidence>",
  
  "strengths": ["<strength 1>", "<strength 2>"],
  "improvements": ["<specific improvement 1>", "<improvement 2>"],
  
  "modelAnswer": "<example of an excellent answer to this question>",
  
  "followUpQuestion": "<relevant follow-up to dig deeper>"
}

Evaluation Criteria:
1. STAR Method (for behavioral): Did they clearly describe Situation, Task, Action, Result?
2. Technical Accuracy: Are facts, concepts, solutions correct?
3. Communication: Is the answer structured, clear, and confident?
4. Specificity: Did they give concrete examples, not vague generalities?
5. Relevance: Did they actually answer the question asked?`;

export const TECHNICAL_EVALUATION_PROMPT = `Evaluate the candidate's technical answer.

QUESTION: {{question}}
TECHNICAL DOMAIN: {{domain}}

CANDIDATE'S ANSWER:
"""
{{answer}}
"""

{{#if code}}
CODE PROVIDED:
\`\`\`
{{code}}
\`\`\`
{{/if}}

Evaluate in JSON format:

{
  "score": <number 0-100>,
  "technicalAccuracy": {
    "score": <0-100>,
    "correctConcepts": ["<correct concept 1>", "<correct concept 2>"],
    "misconceptions": ["<error 1>", "<error 2>"],
    "feedback": "<detailed technical feedback>"
  },
  "problemSolving": {
    "score": <0-100>,
    "approach": "<assessment of their problem-solving approach>",
    "edgeCases": "<did they consider edge cases?>",
    "optimization": "<did they consider optimization?>"
  },
  "communication": {
    "score": <0-100>,
    "clarity": "<was the explanation clear?>",
    "structure": "<was the answer well-organized?>"
  },
  "codeQuality": {
    "score": <0-100 if code provided, null otherwise>,
    "readability": "<assessment>",
    "correctness": "<does it work?>",
    "efficiency": "<time/space complexity>"
  },
  "strengths": ["<strength>"],
  "improvements": ["<improvement>"],
  "resources": ["<resource to study this topic better>"],
  "followUpQuestion": "<probing question to go deeper>"
}`;

export const INTERVIEW_SUMMARY_PROMPT = `Generate a comprehensive interview performance summary.

ROLE: {{role}}
INTERVIEW TYPE: {{interviewType}}

EXCHANGES:
{{#each exchanges}}
Q{{@index}}: {{this.question}}
A: {{this.answer}}
Score: {{this.score}}
---
{{/each}}

Generate a final evaluation in JSON format:

{
  "overallScore": <number 0-100>,
  "readinessLevel": "not_ready|needs_practice|almost_ready|ready",
  
  "summary": "<comprehensive 3-4 sentence evaluation>",
  
  "categoryScores": {
    "communication": <0-100>,
    "technicalKnowledge": <0-100>,
    "problemSolving": <0-100>,
    "behavioralResponses": <0-100>
  },
  
  "performanceHighlights": ["<what they did well>"],
  "criticalImprovements": ["<must-fix issues>"],
  
  "recommendations": [
    "<specific action item 1>",
    "<specific action item 2>"
  ],
  
  "practiceAreas": [
    {
      "area": "<skill/topic to practice>",
      "resources": ["<resource 1>", "<resource 2>"],
      "exercises": ["<practice exercise>"]
    }
  ],
  
  "nextSteps": "<personalized guidance for continued preparation>"
}`;
