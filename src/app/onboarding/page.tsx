"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useUserProfile } from "@/hooks/useUserProfile";

interface OnboardingData {
    // Personal
    fullName: string;

    // Academic
    collegeName: string;
    degree: string;
    degreeDomain: string; // e.g., Computer Science, Mechanical, etc.
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
    careerGoals: string;
}

const DEGREE_DOMAIN_OPTIONS = [
    "Computer Science & Engineering",
    "Information Technology",
    "Electronics & Communication",
    "Mechanical Engineering",
    "Civil Engineering",
    "Electrical Engineering",
    "Data Science",
    "Artificial Intelligence",
    "Cyber Security",
    "Business Administration",
    "Commerce",
    "Science (Physics/Chemistry/Math)",
    "Other"
];

const DOMAIN_OPTIONS = [
    "Software Development",
    "Data Science & AI",
    "Cybersecurity",
    "Cloud Computing",
    "DevOps",
    "Mobile Development",
    "Web Development",
    "Machine Learning",
    "Blockchain",
    "Product Management",
    "UI/UX Design",
    "Other"
];

const SKILL_OPTIONS = [
    "Python", "Java", "JavaScript", "C++", "React", "Node.js",
    "SQL", "MongoDB", "AWS", "Docker", "Git", "Machine Learning",
    "Data Analysis", "REST APIs", "TypeScript", "Angular", "Vue.js",
    "Django", "Flask", "Spring Boot", "Kubernetes", "Other"
];

export default function OnboardingPage() {
    const router = useRouter();
    const { user } = useAuth();
    const { saveProfile } = useUserProfile();
    const [step, setStep] = useState(1);
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(false); // For next button
    const [formData, setFormData] = useState<OnboardingData>({
        fullName: user?.displayName || "",
        collegeName: "",
        degree: "",
        degreeDomain: "",
        degreeStatus: "pursuing",
        graduationYear: "",
        currentSemester: "",
        class10Percentage: "",
        class12Percentage: "",
        lastSemCGPA: "",
        overallCGPA: "",
        targetRole: "",
        interestedDomains: [],
        skillsLearned: [],
        experienceLevel: "fresher",
        careerGoals: "",
    });

    const totalSteps = 4;

    const updateField = (field: keyof OnboardingData, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const toggleArrayItem = (field: "interestedDomains" | "skillsLearned", item: string) => {
        const current = formData[field];
        if (current.includes(item)) {
            updateField(field, current.filter(i => i !== item));
        } else {
            updateField(field, [...current, item]);
        }
    };

    const handleSubmit = async () => {
        setSaving(true);
        try {
            await saveProfile({
                ...formData,
                onboardingCompleted: true,
            });

            // Redirect to dashboard
            router.push("/");
        } catch (error) {
            console.error("Failed to save profile:", error);
            alert("Failed to save profile. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    const canProceed = () => {
        switch (step) {
            case 1:
                return formData.fullName && formData.collegeName && formData.degree && formData.graduationYear;
            case 2:
                return formData.class10Percentage && formData.class12Percentage && formData.lastSemCGPA;
            case 3:
                return formData.targetRole && formData.interestedDomains.length > 0;
            case 4:
                return formData.skillsLearned.length > 0;
            default:
                return false;
        }
    };

    return (
        <div style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
            background: "var(--bg-primary)"
        }}>
            <div className="animate-fade-in" style={{ maxWidth: "600px", width: "100%" }}>
                {/* Header */}
                <div style={{ textAlign: "center", marginBottom: "32px" }}>
                    <div style={{ fontSize: "48px", marginBottom: "16px" }}>🎓</div>
                    <h1 style={{ fontSize: "28px", fontWeight: "700", marginBottom: "8px" }}>
                        Welcome to AI Campus Companion!
                    </h1>
                    <p className="text-gray">Let's personalize your experience</p>
                </div>

                {/* Progress Bar */}
                <div style={{ marginBottom: "32px" }}>
                    <div className="flex justify-between mb-2" style={{ marginBottom: "8px" }}>
                        <span className="text-sm text-gray">Step {step} of {totalSteps}</span>
                        <span className="text-sm text-gray">{Math.round((step / totalSteps) * 100)}%</span>
                    </div>
                    <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${(step / totalSteps) * 100}%` }} />
                    </div>
                </div>

                {/* Form Card */}
                <div className="card" style={{ padding: "32px" }}>
                    {/* Step 1: Academic Info */}
                    {step === 1 && (
                        <div>
                            <h2 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "24px" }}>
                                📚 Academic Information
                            </h2>

                            <div className="form-group">
                                <label className="form-label">Full Name</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={formData.fullName}
                                    onChange={(e) => updateField("fullName", e.target.value)}
                                    placeholder="John Doe"
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">College/University Name</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={formData.collegeName}
                                    onChange={(e) => updateField("collegeName", e.target.value)}
                                    placeholder="e.g., IIT Delhi, VIT, BITS Pilani"
                                />
                            </div>

                            <div className="grid grid-cols-2">
                                <div className="form-group">
                                    <label className="form-label">Degree</label>
                                    <select
                                        className="form-input"
                                        value={formData.degree}
                                        onChange={(e) => updateField("degree", e.target.value)}
                                    >
                                        <option value="">Select degree</option>
                                        <option value="B.Tech">B.Tech</option>
                                        <option value="B.E.">B.E.</option>
                                        <option value="BCA">BCA</option>
                                        <option value="B.Sc">B.Sc</option>
                                        <option value="MCA">MCA</option>
                                        <option value="M.Tech">M.Tech</option>
                                        <option value="M.Sc">M.Sc</option>
                                        <option value="MBA">MBA</option>
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Status</label>
                                    <select
                                        className="form-input"
                                        value={formData.degreeStatus}
                                        onChange={(e) => updateField("degreeStatus", e.target.value as "pursuing" | "completed")}
                                    >
                                        <option value="pursuing">Pursuing</option>
                                        <option value="completed">Completed</option>
                                    </select>
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Degree Domain/Specialization</label>
                                <select
                                    className="form-input"
                                    value={formData.degreeDomain}
                                    onChange={(e) => updateField("degreeDomain", e.target.value)}
                                >
                                    <option value="">Select domain</option>
                                    {DEGREE_DOMAIN_OPTIONS.map(domain => (
                                        <option key={domain} value={domain}>{domain}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2">
                                <div className="form-group">
                                    <label className="form-label">Graduation Year</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={formData.graduationYear}
                                        onChange={(e) => updateField("graduationYear", e.target.value)}
                                        placeholder="2025"
                                    />
                                </div>

                                {formData.degreeStatus === "pursuing" && (
                                    <div className="form-group">
                                        <label className="form-label">Current Semester</label>
                                        <select
                                            className="form-input"
                                            value={formData.currentSemester}
                                            onChange={(e) => updateField("currentSemester", e.target.value)}
                                        >
                                            <option value="">Select</option>
                                            {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                                                <option key={sem} value={sem}>{sem}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Step 2: Academic Performance */}
                    {step === 2 && (
                        <div>
                            <h2 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "24px" }}>
                                📊 Academic Performance
                            </h2>

                            <div className="grid grid-cols-2">
                                <div className="form-group">
                                    <label className="form-label">Class 10th Percentage</label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        value={formData.class10Percentage}
                                        onChange={(e) => updateField("class10Percentage", e.target.value)}
                                        placeholder="85.5"
                                        step="0.1"
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Class 12th Percentage</label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        value={formData.class12Percentage}
                                        onChange={(e) => updateField("class12Percentage", e.target.value)}
                                        placeholder="90.2"
                                        step="0.1"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2">
                                <div className="form-group">
                                    <label className="form-label">Last Semester CGPA</label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        value={formData.lastSemCGPA}
                                        onChange={(e) => updateField("lastSemCGPA", e.target.value)}
                                        placeholder="8.5"
                                        step="0.01"
                                        max="10"
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Overall CGPA (Optional)</label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        value={formData.overallCGPA}
                                        onChange={(e) => updateField("overallCGPA", e.target.value)}
                                        placeholder="8.2"
                                        step="0.01"
                                        max="10"
                                    />
                                </div>
                            </div>

                            <div style={{
                                padding: "12px 16px",
                                background: "rgba(99, 102, 241, 0.1)",
                                borderRadius: "12px",
                                marginTop: "16px"
                            }}>
                                <p className="text-sm">
                                    💡 Your academic performance helps us personalize AI recommendations
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Career Interests */}
                    {step === 3 && (
                        <div>
                            <h2 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "24px" }}>
                                🎯 Career Interests
                            </h2>

                            <div className="form-group">
                                <label className="form-label">Target Role</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={formData.targetRole}
                                    onChange={(e) => updateField("targetRole", e.target.value)}
                                    placeholder="e.g., Software Engineer, Data Scientist, Product Manager"
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Experience Level</label>
                                <select
                                    className="form-input"
                                    value={formData.experienceLevel}
                                    onChange={(e) => updateField("experienceLevel", e.target.value)}
                                >
                                    <option value="fresher">Fresher (No experience)</option>
                                    <option value="0-1">0-1 years</option>
                                    <option value="1-3">1-3 years</option>
                                    <option value="3+">3+ years</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Interested Domains (Select all that apply)</label>
                                <div style={{
                                    display: "grid",
                                    gridTemplateColumns: "repeat(2, 1fr)",
                                    gap: "8px",
                                    marginTop: "8px"
                                }}>
                                    {DOMAIN_OPTIONS.map(domain => (
                                        <button
                                            key={domain}
                                            type="button"
                                            className={`btn ${formData.interestedDomains.includes(domain) ? 'btn-primary' : 'btn-secondary'}`}
                                            onClick={() => toggleArrayItem("interestedDomains", domain)}
                                            style={{ fontSize: "12px", padding: "8px 12px" }}
                                        >
                                            {formData.interestedDomains.includes(domain) ? "✓ " : ""}{domain}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 4: Skills & Goals */}
                    {step === 4 && (
                        <div>
                            <h2 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "24px" }}>
                                💪 Skills & Goals
                            </h2>

                            <div className="form-group">
                                <label className="form-label">Skills You've Learned</label>
                                <div style={{
                                    display: "grid",
                                    gridTemplateColumns: "repeat(3, 1fr)",
                                    gap: "8px",
                                    marginTop: "8px"
                                }}>
                                    {SKILL_OPTIONS.map(skill => (
                                        <button
                                            key={skill}
                                            type="button"
                                            className={`btn ${formData.skillsLearned.includes(skill) ? 'btn-primary' : 'btn-secondary'}`}
                                            onClick={() => toggleArrayItem("skillsLearned", skill)}
                                            style={{ fontSize: "11px", padding: "6px 10px" }}
                                        >
                                            {formData.skillsLearned.includes(skill) ? "✓ " : ""}{skill}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Career Goals (Optional)</label>
                                <textarea
                                    className="form-textarea"
                                    value={formData.careerGoals}
                                    onChange={(e) => updateField("careerGoals", e.target.value)}
                                    placeholder="What are your short-term and long-term career goals?"
                                    style={{ minHeight: "100px" }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Navigation Buttons */}
                    <div className="flex gap-2 mt-6" style={{ marginTop: "32px" }}>
                        {step > 1 && (
                            <button
                                className="btn btn-secondary"
                                onClick={() => setStep(step - 1)}
                                disabled={loading || saving}
                                style={{ flex: 1 }}
                            >
                                ← Previous
                            </button>
                        )}

                        {step < totalSteps ? (
                            <button
                                className="btn btn-primary"
                                onClick={async () => {
                                    setLoading(true);
                                    // Small delay for UX feedback
                                    await new Promise(resolve => setTimeout(resolve, 300));
                                    setStep(step + 1);
                                    setLoading(false);
                                }}
                                disabled={!canProceed() || loading}
                                style={{ flex: 1 }}
                            >
                                {loading ? (
                                    <>
                                        <span className="spinner-icon" style={{
                                            display: 'inline-block',
                                            marginRight: '8px',
                                            animation: 'spin 1s linear infinite'
                                        }}>⏳</span>
                                        Moving to next step...
                                    </>
                                ) : (
                                    "Next →"
                                )}
                            </button>
                        ) : (
                            <button
                                className="btn btn-primary"
                                onClick={handleSubmit}
                                disabled={!canProceed() || saving}
                                style={{ flex: 1 }}
                            >
                                {saving ? (
                                    <>
                                        <span className="spinner-icon" style={{
                                            display: 'inline-block',
                                            marginRight: '8px',
                                            animation: 'spin 1s linear infinite'
                                        }}>⏳</span>
                                        Completing setup...
                                    </>
                                ) : (
                                    "Complete Setup 🎉"
                                )}
                            </button>
                        )}
                    </div>

                    {/* Validation Helper Text */}
                    {!canProceed() && (
                        <div style={{
                            marginTop: "16px",
                            padding: "12px 16px",
                            background: "rgba(251, 191, 36, 0.1)",
                            border: "1px solid rgba(251, 191, 36, 0.3)",
                            borderRadius: "12px",
                            fontSize: "14px"
                        }}>
                            <p style={{ color: "#fbbf24", marginBottom: "8px", fontWeight: "600" }}>
                                ⚠️ Please fill in all required fields:
                            </p>
                            <ul style={{ paddingLeft: "20px", color: "#fbbf24" }}>
                                {step === 1 && (
                                    <>
                                        {!formData.fullName && <li>Full Name</li>}
                                        {!formData.collegeName && <li>College/University Name</li>}
                                        {!formData.degree && <li>Degree</li>}
                                        {!formData.graduationYear && <li>Graduation Year</li>}
                                    </>
                                )}
                                {step === 2 && (
                                    <>
                                        {!formData.class10Percentage && <li>Class 10th Percentage</li>}
                                        {!formData.class12Percentage && <li>Class 12th Percentage</li>}
                                        {!formData.lastSemCGPA && <li>Last Semester CGPA</li>}
                                    </>
                                )}
                                {step === 3 && (
                                    <>
                                        {!formData.targetRole && <li>Target Role</li>}
                                        {formData.interestedDomains.length === 0 && <li>At least one Interested Domain</li>}
                                    </>
                                )}
                                {step === 4 && (
                                    <>
                                        {formData.skillsLearned.length === 0 && <li>At least one Skill</li>}
                                    </>
                                )}
                            </ul>
                        </div>
                    )}
                </div>

                {/* Skip Option */}
                <p className="text-center text-sm text-gray mt-4" style={{ marginTop: "16px" }}>
                    <button
                        onClick={() => router.push("/")}
                        style={{ color: "var(--primary-400)", background: "none", border: "none", cursor: "pointer" }}
                    >
                        Skip for now
                    </button>
                </p>
            </div>
        </div>
    );
}
