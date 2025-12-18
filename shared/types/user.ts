/**
 * User Profile Types
 * Shared between frontend and Cloud Functions
 */

export interface UserProfile {
    userId: string;

    // Personal
    fullName: string;
    email: string;

    // Academic
    collegeName: string;
    degree: string;
    degreeStatus: "pursuing" | "completed";
    graduationYear: string;
    currentSemester?: string;

    // Marks
    class10Percentage: string;
    class12Percentage: string;
    lastSemCGPA: string;
    overallCGPA?: string;

    // Career
    targetRole: string;
    interestedDomains: string[];
    skillsLearned: string[];
    experienceLevel: "fresher" | "0-1" | "1-3" | "3+";

    // Goals
    careerGoals?: string;

    // Metadata
    createdAt: string;
    updatedAt: string;
    onboardingCompleted: boolean;
}

export interface UserContext {
    targetRole: string;
    skillsLearned: string[];
    interestedDomains: string[];
    experienceLevel: string;
    academicLevel?: string; // e.g., "B.Tech 3rd Semester"
}

export function buildUserContext(profile: UserProfile): UserContext {
    const academicLevel = profile.degreeStatus === "pursuing" && profile.currentSemester
        ? `${profile.degree} ${profile.currentSemester}${getSuffix(Number(profile.currentSemester))} Semester`
        : profile.degree;

    return {
        targetRole: profile.targetRole,
        skillsLearned: profile.skillsLearned,
        interestedDomains: profile.interestedDomains,
        experienceLevel: profile.experienceLevel,
        academicLevel,
    };
}

function getSuffix(num: number): string {
    if (num === 1) return "st";
    if (num === 2) return "nd";
    if (num === 3) return "rd";
    return "th";
}

export function formatUserContextForPrompt(context: UserContext): string {
    return `
USER CONTEXT:
- Target Role: ${context.targetRole}
- Experience Level: ${context.experienceLevel}
- Academic Level: ${context.academicLevel || "Not specified"}
- Skills: ${context.skillsLearned.join(", ")}
- Interested Domains: ${context.interestedDomains.join(", ")}

IMPORTANT: Tailor your response to match this user's level, role, and skills. Use terminology and examples relevant to their target role and domain.
`.trim();
}
