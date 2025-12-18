# AI Campus Companion

**AI Campus Companion** is an intelligent, AI-native learning ecosystem designed to empower college students throughout their academic journey. By leveraging the power of **Google Gemini 2.0**, it provides a suite of advanced tools for personalized academic support, career preparation, and skill development, all within a secure and gamified environment.

## 🚀 Features

- **📄 AI Resume Analyzer** - Get ATS scores, skill gap analysis, and improvement suggestions
- **🎯 AI Skill Roadmap** - Personalized learning paths based on your goals
- **📚 AI Study Tools** - Lecture summarizer, flashcard generator, quiz creator
- **🎤 AI Interview Coach** - Mock interviews with STAR method feedback
- **🏆 Gamification** - Badges, challenges, and progress tracking

## 🛠 Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Backend**: Firebase Cloud Functions
- **AI**: Google Gemini 2.0 Flash
- **Database**: Firestore
- **Auth**: Firebase Authentication

## 📦 Setup

### 1. Install Dependencies

\`\`\`bash
# Frontend
npm install

# Cloud Functions
cd functions
npm install
\`\`\`

### 2. Configure Firebase

1. Create a Firebase project at https://console.firebase.google.com
2. Enable Authentication (Google Sign-in)
3. Create a Firestore database
4. Copy your config to \`.env.local\`:

\`\`\`env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
\`\`\`

### 3. Configure Gemini API

\`\`\`bash
# Set your Gemini API key in Firebase Functions config
firebase functions:config:set gemini.api_key="YOUR_GEMINI_API_KEY"
\`\`\`

### 4. Run Development Server

\`\`\`bash
npm run dev
\`\`\`

Open http://localhost:3000

### 5. Deploy Cloud Functions

\`\`\`bash
cd functions
npm run deploy
\`\`\`

## 📁 Project Structure

\`\`\`
ai-campus-companion/
├── src/
│   ├── app/                 # Next.js App Router pages
│   │   ├── resume/          # Resume Analyzer
│   │   ├── skills/          # Skill Roadmap
│   │   ├── study/           # Study Tools
│   │   ├── interview/       # Interview Coach
│   │   └── profile/         # Profile & Gamification
│   ├── lib/                 # Firebase client config
│   └── types/               # TypeScript interfaces
├── functions/
│   └── src/
│       ├── services/        # AI service module
│       ├── prompts/         # AI prompt templates
│       └── handlers/        # Cloud Function handlers
└── README.md
\`\`\`

## 🧠 AI Architecture

All AI processing happens in Firebase Cloud Functions:

1. Frontend sends request via \`httpsCallable()\`
2. Cloud Function builds prompt with context
3. Gemini AI generates structured JSON response
4. Result is cached in Firestore for efficiency
5. Response displayed in UI

**No API keys in frontend. All calls auditable.**

## 📜 License

MIT
