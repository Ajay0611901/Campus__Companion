import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { AppShell } from "@/components/AppShell";

export const metadata: Metadata = {
    title: "Campus Companion - AI-Powered Student Growth Platform | Resume Analyzer & Study Tools",
    description: "Campus Companion is your AI-powered student companion for resume analysis, lecture summarization, skill roadmaps, interview coaching, and study tools. The ultimate AI campus assistant for students.",
    keywords: [
        "campus companion",
        "ai campus companion",
        "ai campus",
        "ai companion",
        "lecture summarizer",
        "resume analyzer",
        "student ai assistant",
        "ai study tools",
        "interview coach",
        "skill roadmap",
        "student growth platform",
        "ai education",
        "college ai tools",
        "university ai assistant",
        "flashcard generator",
        "quiz generator",
    ],
    authors: [{ name: "Campus Companion" }],
    creator: "Campus Companion",
    publisher: "Campus Companion",
    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
        },
    },

    openGraph: {
        type: "website",
        locale: "en_US",
        siteName: "Campus Companion",
        title: "Campus Companion - AI-Powered Student Growth Platform",
        description: "Your AI companion for resume analysis, lecture summarization, skill roadmaps, and interview coaching. Built for students.",
        images: [{ url: "/logo.png", width: 512, height: 512, alt: "Campus Companion Logo" }],
    },
    twitter: {
        card: "summary_large_image",
        title: "Campus Companion - AI-Powered Student Growth Platform",
        description: "AI-powered resume analyzer, lecture summarizer, skill roadmaps, and interview coach for students.",
        images: ["/logo.png"],
    },
    alternates: {
        canonical: "https://aicampuscompanion.vercel.app",
    },
    category: "Education",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body suppressHydrationWarning>
                <Providers>
                    <AppShell>{children}</AppShell>
                </Providers>

                {/* SVG Gradients for Score Rings */}
                <svg style={{ width: 0, height: 0, position: "absolute" }}>
                    <defs>
                        <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#6366f1" />
                            <stop offset="100%" stopColor="#8b5cf6" />
                        </linearGradient>
                        <linearGradient id="successGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#06b6d4" />
                            <stop offset="100%" stopColor="#10b981" />
                        </linearGradient>
                    </defs>
                </svg>
            </body>
        </html>
    );
}
