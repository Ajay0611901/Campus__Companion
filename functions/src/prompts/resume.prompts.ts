/**
 * Resume Analyzer Prompt Templates - Production Grade
 * 
 * AI Role: Semantic Resume Analyzer + ATS Simulator + Career Coach
 * 
 * Key Principles:
 * - SEMANTIC analysis (not keyword matching)
 * - Consistent JSON output structure
 * - Actionable, specific suggestions
 * - Industry-aware scoring
 */

// ============================================
// SYSTEM INSTRUCTIONS
// ============================================

export const RESUME_ANALYZER_SYSTEM = `You are an expert Resume Analyzer with three distinct capabilities:

1. **ATS SIMULATOR**: You understand how Applicant Tracking Systems work and can predict how a resume will perform in automated screening. You analyze formatting, keyword density, and structural compatibility.

2. **SEMANTIC ANALYST**: Unlike basic keyword matching, you understand the MEANING behind resume content. You evaluate:
   - Quality of achievements (not just presence)
   - Relevance of experience to target role
   - Depth of skills vs surface-level mentions
   - Career progression trajectory
   - Impact and quantified results

3. **CAREER COACH**: You provide specific, actionable guidance that students can immediately implement. Never give generic advice like "use action verbs" - instead, show exactly what to change and why.

CRITICAL RULES:
- Respond ONLY with valid JSON, no explanation text before or after
- All scores must be integers between 0-100
- All arrays must have at least 2 items
- Never include markdown formatting in your response
- Be encouraging but honest about areas for improvement`;

// ============================================
// MAIN ANALYSIS PROMPT
// ============================================

export const RESUME_ANALYSIS_PROMPT = `Analyze the following resume for the target role: **{{targetRole}}**

=== RESUME CONTENT ===
{{resumeText}}
=== END RESUME ===

Perform a comprehensive semantic analysis and return the following JSON structure:

{
  "score": <integer 0-100, overall ATS + quality score>,
  "scoreBreakdown": {
    "atsCompatibility": <integer 0-100>,
    "contentQuality": <integer 0-100>,
    "roleAlignment": <integer 0-100>,
    "impactEvidence": <integer 0-100>
  },
  "summary": "<2-3 sentence executive summary of the resume quality>",
  "strengths": [
    "<specific strength with evidence from resume>",
    "<another specific strength>"
  ],
  "missingSkills": [
    {
      "skill": "<skill name>",
      "importance": "critical|important|nice-to-have",
      "reason": "<why this matters for the target role>"
    }
  ],
  "suggestions": [
    {
      "priority": "high|medium|low",
      "category": "content|format|keywords|experience|skills",
      "issue": "<what's wrong or missing>",
      "action": "<specific action to take>",
      "example": "<concrete example if applicable>"
    }
  ],
  "keywordAnalysis": {
    "found": ["<relevant keyword found>"],
    "missing": ["<important keyword missing>"],
    "density": <integer 0-100, keyword match percentage>
  },
  "careerInsight": {
    "roleMatch": <integer 0-100>,
    "alternativeRoles": ["<role1>", "<role2>"],
    "growthPath": "<brief career progression suggestion>"
  }
}

SCORING GUIDELINES:
- 90-100: Exceptional resume, interview-ready for top companies
- 75-89: Strong resume with minor improvements needed
- 60-74: Good foundation but significant enhancements possible
- 40-59: Many gaps, needs substantial work
- 0-39: Major rewrite recommended

Analyze semantically - understand meaning, not just keywords. A resume saying "improved system performance" is weaker than "reduced latency by 40% serving 1M users".`;

// ============================================
// SIMPLIFIED OUTPUT PROMPT (User's Exact Format)
// ============================================

export const RESUME_ANALYSIS_SIMPLE_PROMPT = `Analyze the following resume for the target role: **{{targetRole}}**

=== RESUME CONTENT ===
{{resumeText}}
=== END RESUME ===

Perform semantic analysis (understand meaning, not just keywords) and return ONLY this JSON:

{
  "score": <integer 0-100>,
  "strengths": [
    "<specific strength from the resume>",
    "<another strength with evidence>"
  ],
  "missingSkills": [
    "<skill missing for target role>",
    "<another missing skill>"
  ],
  "suggestions": [
    "<specific, actionable improvement suggestion>",
    "<another specific suggestion with example>"
  ]
}

Scoring criteria:
- 90-100: Exceptional, interview-ready
- 75-89: Strong with minor improvements
- 60-74: Good foundation, needs work
- 40-59: Significant gaps
- 0-39: Major rewrite needed

Provide at least 3 strengths, 3 missing skills, and 4 suggestions.
Make suggestions SPECIFIC and ACTIONABLE with concrete examples.`;

// ============================================
// QUICK SCORE PROMPT (Fast Evaluation)
// ============================================

export const RESUME_QUICK_SCORE_PROMPT = `Quickly evaluate this resume for {{targetRole}}:

{{resumeText}}

Return JSON:
{
  "score": <0-100>,
  "verdict": "strong|moderate|needs_work",
  "topIssue": "<single most important improvement>"
}`;

// ============================================
// BULLET POINT IMPROVEMENT PROMPT
// ============================================

export const BULLET_IMPROVEMENT_PROMPT = `Improve this resume bullet point for a {{targetRole}} role:

ORIGINAL: "{{originalText}}"
CONTEXT: {{context}}

Return JSON:
{
  "improved": "<rewritten bullet point>",
  "impact": "<why this is better>",
  "keywords": ["<keywords added>"]
}

Guidelines:
- Start with strong action verb
- Add metrics/numbers when possible
- Show impact, not just duties
- Keep to 1-2 lines`;

// ============================================
// SECTION GENERATOR PROMPT
// ============================================

export const SECTION_GENERATOR_PROMPT = `Generate a {{sectionName}} section for a {{targetRole}} resume.

Current skills: {{skills}}
Experience: {{experience}}
Education: {{education}}

Return JSON:
{
  "title": "<section heading>",
  "content": "<formatted section content>",
  "tips": ["<tip for this section>"]
}`;
