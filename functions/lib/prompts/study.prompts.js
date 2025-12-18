"use strict";
/**
 * Study Tools Prompt Templates
 *
 * AI Role: "Think like a professor + tutor"
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CODE_DEBUGGER_PROMPT = exports.CONCEPT_EXPLAINER_PROMPT = exports.QUIZ_GENERATOR_PROMPT = exports.FLASHCARD_GENERATOR_PROMPT = exports.LECTURE_SUMMARY_PROMPT = exports.STUDY_ASSISTANT_SYSTEM = void 0;
exports.STUDY_ASSISTANT_SYSTEM = `You are an expert educator who combines the knowledge depth of a professor with the personalized attention of a private tutor.

Your responses must be:
- Clear: Explain complex concepts in accessible terms
- Structured: Use logical organization and clear formatting
- Adaptive: Match explanation complexity to the subject matter
- Engaging: Make learning interesting and memorable`;
exports.LECTURE_SUMMARY_PROMPT = `Summarize the following lecture content for effective studying.

LECTURE CONTENT:
"""
{{content}}
"""

Generate a comprehensive study summary in JSON format:

{
  "title": "<concise title for this lecture>",
  "brief": "<1-2 sentence overview>",
  "detailed": "<comprehensive 2-3 paragraph summary>",
  "keyPoints": [
    "<key point 1>",
    "<key point 2>",
    "<key point 3>",
    ...
  ],
  "concepts": [
    {
      "term": "<concept/term name>",
      "definition": "<clear, concise definition>",
      "importance": "critical|important|supplementary"
    }
  ],
  "connections": [
    {
      "from": "<concept 1>",
      "to": "<concept 2>",
      "relationship": "<how they're connected>"
    }
  ],
  "studyTips": ["<specific tips for mastering this material>"]
}

Guidelines:
1. Extract 5-10 key points
2. Identify all important concepts and define them clearly
3. Show relationships between concepts
4. Provide actionable study tips`;
exports.FLASHCARD_GENERATOR_PROMPT = `Generate study flashcards from the following content.

CONTENT:
"""
{{content}}
"""

Create effective flashcards in JSON format:

{
  "flashcards": [
    {
      "id": "<unique id>",
      "front": "<question or prompt>",
      "back": "<answer or explanation>",
      "difficulty": <1-5, where 1 is easiest>,
      "category": "<topic category>"
    }
  ]
}

Guidelines:
1. Create 10-15 flashcards
2. Mix question types: definitions, applications, comparisons
3. Front should be a clear, specific question
4. Back should be concise but complete
5. Vary difficulty levels
6. Focus on core concepts that require active recall`;
exports.QUIZ_GENERATOR_PROMPT = `Generate a quiz from the following study material.

CONTENT:
"""
{{content}}
"""

Quiz Type: {{quizType}} (mcq, short_answer, mixed)
Difficulty: {{difficulty}} (easy, medium, hard)
Number of Questions: {{numQuestions}}

Generate quiz questions in JSON format:

{
  "quiz": {
    "title": "<quiz title>",
    "description": "<brief description>",
    "totalPoints": <total possible points>,
    "questions": [
      {
        "id": "<unique id>",
        "type": "mcq|short_answer|true_false",
        "question": "<clear question text>",
        "points": <points for this question>,
        "options": ["<option A>", "<option B>", "<option C>", "<option D>"],
        "correctAnswer": "<correct answer>",
        "explanation": "<why this is the correct answer>",
        "difficulty": "easy|medium|hard",
        "topic": "<specific topic tested>"
      }
    ]
  }
}

Guidelines:
1. Questions should test understanding, not just memorization
2. MCQ distractors should be plausible but clearly wrong
3. Include questions at varying difficulty levels
4. Provide helpful explanations for each answer
5. Short answer questions should have clear expected responses`;
exports.CONCEPT_EXPLAINER_PROMPT = `Explain the following concept to a student.

CONCEPT: {{concept}}
CONTEXT: {{context}}
STUDENT LEVEL: {{level}}

Provide a comprehensive explanation in JSON format:

{
  "concept": "{{concept}}",
  "simpleExplanation": "<explain like I'm 5>",
  "technicalExplanation": "<precise technical definition>",
  "analogy": "<relatable real-world analogy>",
  "examples": [
    {
      "example": "<specific example>",
      "explanation": "<how it demonstrates the concept>"
    }
  ],
  "commonMistakes": ["<mistake 1>", "<mistake 2>"],
  "relatedConcepts": ["<related concept 1>", "<related concept 2>"],
  "practiceQuestions": [
    {
      "question": "<practice question>",
      "hint": "<helpful hint>",
      "answer": "<correct answer>"
    }
  ]
}`;
exports.CODE_DEBUGGER_PROMPT = `Debug and explain the following code issue.

CODE:
\`\`\`{{language}}
{{code}}
\`\`\`

ERROR/ISSUE:
{{error}}

STUDENT'S UNDERSTANDING:
{{studentThoughts}}

Provide debugging assistance in JSON format:

{
  "diagnosis": "<what's causing the issue>",
  "explanation": "<detailed explanation of why this happens>",
  "fix": {
    "code": "<corrected code>",
    "changes": ["<change 1>", "<change 2>"]
  },
  "conceptsToReview": ["<concept 1>", "<concept 2>"],
  "preventionTips": ["<how to avoid this mistake>"],
  "relatedExercises": ["<practice exercise to reinforce learning>"]
}`;
//# sourceMappingURL=study.prompts.js.map