# NPCCSM Academic Portal

A modern academic portal for students, teachers, and administrators. The project provides a role-based academic dashboard where students can track semester progress, access syllabus content, explore career guidance, manage learning resources, and work on practical projects. It also includes a backend-driven RAG assistant for academic support and a server for document processing and retrieval.

This documentation is intended to help project contributors and developers understand the purpose, structure, and workflow of the system.

---

## 1. Project Overview

The application is designed as a professional academic portal for a college or university environment. It supports multiple user roles and helps users navigate teaching, learning, and academic monitoring in one unified platform.

### Core goals
- provide a student dashboard with academic visibility
- expose semester-wise subject progress
- help students access notes, resources, and learning materials
- give career guidance and project recommendations
- support teachers in managing academic progress and updates
- provide administrators with a high-level academic overview
- integrate AI-style academic assistance for student queries

### Primary users
- Student
- Teacher
- Principal / Administrator

### Main features
- semester-based academic dashboard
- subject progress tracking
- course and syllabus coverage analysis
- study resources and notes
- project recommendation system
- AI-powered career assistant
- responsive academic UI
- admin and faculty monitoring views
- backend support for document retrieval and AI chat

---

## 2. Product Scope

The platform is organized around an academic ecosystem rather than a simple front-end website. It includes both the user interface and supporting backend services.

### Student-facing features
- dashboard overview
- subject progress tracking
- academic plan and syllabus view
- career mentor and guidance tools
- project list and project tracking
- resource center
- recent lecture/activity updates

### Teacher-facing features
- class monitoring
- academic updates
- subject delivery tracking
- notes and published topics
- workload and progress review

### Administrator-facing features
- overall semester analytics
- coverage overview
- subject health reporting
- at-risk academic monitoring
- institutional department visibility

### AI and retrieval features
- student query support
- knowledge retrieval from uploaded documents or dataset content
- AI-generated responses based on academic context

---

## 3. Technology Stack

### Frontend
- React
- Vite
- React Router
- Tailwind CSS

### Backend / server services
- Node.js
- Express
- PostgreSQL
- PDF processing support
- RAG pipeline services

### Additional capabilities
- API-based communication between frontend and server
- retrieval and generation pipeline for academic assistant
- local fallback behavior when backend services are unavailable

---

## 4. Project Structure

```text
npccsm-react/
├── api/
│   └── chat.js
├── database/
│   ├── init.sql
│   └── rag_schema.sql
├── server/
│   ├── index.js
│   ├── package.json
│   ├── rag/
│   │   ├── chunker.js
│   │   ├── embeddings.js
│   │   ├── generation.js
│   │   ├── index.js
│   │   └── pdfProcessor.js
│   ├── routes/
│   │   └── rag.js
│   └── uploads/
├── src/
│   ├── App.jsx
│   ├── index.css
│   ├── main.jsx
│   ├── api/
│   │   └── careerChat.js
│   ├── components/
│   │   ├── chat/
│   │   │   ├── ChatWindow.jsx
│   │   │   ├── MessageBubble.jsx
│   │   │   ├── SourcePanel.jsx
│   │   │   ├── SuggestionChips.jsx
│   │   │   └── useChatMock.js
│   │   ├── chatbot/
│   │   │   ├── ChatPage.jsx
│   │   │   └── useChatbotApi.js
│   │   ├── layout/
│   │   │   ├── AmbientBackground.jsx
│   │   │   ├── Header.jsx
│   │   │   ├── StudentLayout.jsx
│   │   │   └── ...
│   │   └── shared/
│   │       ├── Button.jsx
│   │       ├── ChatbotWidget.jsx
│   │       ├── ConnectionBanner.jsx
│   │       ├── EmptyState.jsx
│   │       ├── Modal.jsx
│   │       ├── ProtectedRoute.jsx
│   │       └── Toast.jsx
│   ├── context/
│   │   ├── AuthContext.jsx
│   │   └── SyllabusContext.jsx
│   ├── data/
│   │   └── syllabusDatabase.js
│   ├── hooks/
│   │   └── useReminderScheduler.js
│   │   └── ...
│   ├── cd "D:\collage project\npccsm-react"

git add .gitignore
git commit -m "Add project gitignore rules"
git push -u origin masterlib/
│   │   ├── apiClient.js
│   │   └── chatbotApi.js
│   ├── pages/
│   │   ├── LoginPage.jsx
│   │   ├── PrincipalDashboard.jsx
│   │   ├── StudentDashboard.jsx
│   │   ├── StudentPortal.jsx
│   │   ├── TeacherStudio.jsx
│   │   └── student/
│   │       ├── StudentCareer.jsx
│   │       ├── StudentOverview.jsx
│   │       ├── StudentProjects.jsx
│   │       ├── StudentResources.jsx
│   │       └── StudentSyllabus.jsx
│   ├── services/
│   │   └── ragService.js
│   └── ...
├── supabase/
│   └── schema.sql
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── vercel.json
├── RAG_SETUP.md
├── README.md
├── index.html
└── .env files / environment configuration
```

---

## 5. High-Level Architecture

The application follows a modular dashboard architecture combining a role-based frontend and a supporting backend service layer.

### Frontend architecture
- app shell and route management define the overall portal
- each user role has a dedicated dashboard view
- shared components are reused across screens
- context-based state management keeps academic data consistent

### Backend architecture
- server handles API and retrieval operations
- RAG layer handles document ingestion, chunking, querying, and response generation
- PDF processing supports file upload and knowledge extraction
- database layer stores academic data and vectorized knowledge records

### Role-based flow
- Student: dashboard, syllabus, career guidance, projects, resources
- Teacher: academic management and teaching updates
- Principal: monitoring and institutional oversight

---

## 6. Main Application Modules

### 1. Student module
This is the primary user journey in the application. It includes:
- overview dashboard
- academic subjects and progress tracking
- notes and topic updates
- learning resources
- career mentoring
- practical project recommendations

### 2. Teacher module
This area is used to manage academic content and updates. It supports:
- subject data management
- topic coverage tracking
- notes publication
- classroom academic updates

### 3. Principal module
This module gives leadership-level academic visibility, specifically:
- semester overview
- progress reporting
- risk detection
- coverage monitoring

### 4. RAG / assistant module
This module powers the AI-style academic assistant by:
- reading and splitting documents
- embedding relevant content
- storing and retrieving knowledge
- generating contextual answers for student questions

---

## 7. Features by Page

### Student Dashboard
The dashboard is a high-level overview page for students.

It includes:
- welcome text and profile information
- semester selector
- academic summary cards
- subject performance cards
- completion metrics
- recent lecture updates
- quick links to key academic sections
- action buttons for resources, advisor, and projects

### Student Syllabus Page
The syllabus page focuses on curriculum and academic completion.

It includes:
- subject selection
- unit breakdown
- topic tracking
- per-subject completion progress
- published notes
- exam-focused content

### Student Career Page
This page provides guidance and decision support.

It includes:
- career assistant interface
- student queries and recommendations
- career-oriented learning suggestions
- support for future planning

### Student Projects Page
This page is designed to encourage skill-building and portfolio development.

It includes:
- practical project list
- categories and difficulty levels
- skill tags
- time estimates
- status tracking

### Student Resources Page
This page is a central repository for academic support materials.

It includes:
- notes
- documents and learning items
- subject-specific resources
- quick access to educational content

---

## 8. Functional Flow

### User login flow
1. User opens the app.
2. User enters login credentials.
3. The app determines the role.
4. The user is redirected to a role-specific dashboard.
5. The dashboard loads academic data for that user.

### Student workflow
1. Student logs in.
2. Student selects current semester.
3. Student views course progress and overview.
4. Student navigates to syllabus or resources.
5. Student can ask for career guidance.
6. Student may start project tasks or review academic notes.

### Teacher workflow
1. Teacher logs in.
2. Teacher accesses teaching dashboard.
3. Teacher updates academic progress and course data.
4. Student views reflect updated content.

### Principal workflow
1. Principal logs in.
2. Principal opens the institutional dashboard.
3. Principal reviews semester health and course status.
4. Principal identifies subjects that need attention.

---

## 9. Data Model Overview

The project manages several categories of data.

### Academic data
- semester
- subjects
- units
- topics
- completion status
- notes and exam focus material
- faculty information
- course metadata

### User data
- user name
- role
- access rights
- session status
- selected semester

### Resource data
- notes
- study documents
- academic materials
- content metadata

### Project data
- project name
- description
- technology stack
- difficulty
- duration
- skill tags
- status

### RAG / AI data
- uploaded documents
- chunks of content
- embeddings
- retrieval matches
- generated responses

---

## 10. Environment Setup

### Prerequisites
Before running the project, ensure the following are available:
- Node.js and npm
- PostgreSQL database
- access to project environment configuration
- API keys for any AI or external services used by the assistant

### Install dependencies

```bash
npm install
```

### Start the frontend

```bash
npm run dev
```

### Start the backend server

```bash
cd server
npm install
npm run dev
```

### Full-stack development mode

```bash
npm run dev:full
```

This runs both the frontend and backend in the same development workflow.

---

## 11. Environment Variables

The project may rely on environment variables for service connectivity and runtime configuration.

### Frontend variables
- Vite application variables for API access
- optional local configuration for environment-based behavior

### Backend variables
- database connection variables
- application port
- AI model configuration
- API key values for LLM access

Example structure:

```env
PORT=5000
DATABASE_URL=your_database_url
GEMINI_API_KEY=your_api_key
GEMINI_CHAT_MODEL=gemini-2.5-flash
GEMINI_EMBEDDING_MODEL=text-embedding-004
```

> Store sensitive values securely and avoid committing them to source control.

---

## 12. Running the Project

### Frontend only

```bash
npm run dev
```

### Backend only

```bash
cd server
npm run dev
```

### Production build

```bash
npm run build
```

### Local preview

```bash
npm run preview
```

---

## 13. RAG / AI Assistant Setup

The project includes a retrieval-based assistant designed to answer academic questions using stored context.

### Purpose
The assistant helps students with academic queries by retrieving relevant materials and generating contextual answers.

### Workflow
1. Documents or knowledge entries are uploaded or imported.
2. Text is split into manageable chunks.
3. Chunks are converted into vector representations.
4. Query data is embedded and matched against stored content.
5. Relevant text is retrieved.
6. The assistant composes a response using the retrieved context.

### Server-side files
- `server/rag/chunker.js`
- `server/rag/embeddings.js`
- `server/rag/generation.js`
- `server/rag/pdfProcessor.js`
- `server/routes/rag.js`

### Ingestion options
- ingest PDF documents
- ingest syllabus-related content
- ingest text-based knowledge sources
- ingest all academic knowledge in one operation

---

## 14. Key Developer Notes

### Shared data logic
The project is structured so academic information is centralized and reused across screens. This keeps the application consistent and reduces duplication.

### Responsive behavior
The platform is designed for desktop, tablet, and mobile usage. The layout adapts to smaller screens with collapsible navigation and stacked content blocks.

### Role-based access
Different screens are designed to appear depending on the user role. This improves clarity and keeps user experience focused on the correct workflow.

### Local fallback support
If external services are not available, the system can still run in a reduced mode using local state or fallback responses.

---

## 15. Deployment and Production Considerations

### Production checklist
- ensure secure environment configuration
- configure database access
- configure AI service credentials
- verify API connectivity
- validate deployment URLs
- test role-based access rules
- validate production build

### Recommended operational checks
- monitor backend health
- test upload and retrieval flows
- verify AI response quality
- confirm protected routes behave correctly
- review error handling for failed external calls

---

## 16. Common Troubleshooting

### Frontend not loading
- confirm dependencies are installed
- verify the app is running in the correct directory
- check for environment misconfiguration

### Backend not responding
- confirm the server is running
- verify the configured port
- verify database connectivity
- check API keys for any external services

### AI assistant not returning answers
- verify ingestion has been completed
- confirm document content is available
- check retrieval service logs and response status
- validate the query input and configuration

### Build errors
- run the installation step again
- verify package compatibility
- check for missing environment variables

---

## 17. Security and Access Considerations

The project contains user-specific and institutional academic data. Security should be treated as a priority in production.

### Important concerns
- authentication and role validation
- restricting admin-only functions
- protecting user and academic data
- securing API endpoints
- validating user actions before processing
- controlling sensitive content exposure

---

## 18. Future Enhancements

Potential future improvements include:
- advanced teacher analytics
- enriched principal reporting
- more detailed student personalization
- expanded resource management
- improved notification system
- deeper AI-driven academic assistance
- stronger integration with institutional systems

---

## 19. Summary

The NPCCSM Academic Portal is a full academic management and student support application designed to combine curriculum, progress tracking, guidance, resources, and AI assistance in a single digital environment.

It is built to support:
- student learning continuity
- academic monitoring
- faculty updates
- administrator oversight
- practical skill development
- modern digital academic interaction

This project is structured to scale beyond the current interface and can serve as a strong foundation for a complete institutional education platform.

---

## 20. Quick Start Commands

```bash
# install frontend dependencies
npm install

# run frontend
npm run dev

# run backend
cd server
npm install
npm run dev

# build production frontend
cd ..
npm run build
```

---

## 21. Maintainer Notes

This project is intended to be developer-friendly and easy to extend. Most major features are organized by purpose and page responsibility, which supports easier maintenance, testing, and future enhancement.

For deeper implementation details, also refer to:
- `RAG_SETUP.md`
- `server/` backend modules
- `src/pages/` screens
- `src/components/` reusable UI blocks
- `src/context/` application state modules

---

This README is designed to be a practical starting point for project documentation and can be expanded further as the application grows.

