# JobTrack 🚀
### Modern Job Portal & Applicant Tracking System (ATS)

JobTrack is a full-stack MERN application engineered for recruitment workflows. It enables job seekers to discover career opportunities and provides hiring teams with an intuitive Applicant Tracking System to evaluate candidates across custom hiring stages.

---

## 🛠️ Technology Stack

| Layer | Technology | Description |
| :--- | :--- | :--- |
| **Frontend** | React 19 + Vite | Fast, responsive single-page application |
| **Language** | JavaScript (ESM) | Modern ECMAScript module standard |
| **Styling** | Tailwind CSS v4 | Utility-first, responsive, and glassmorphic UI |
| **Routing** | React Router DOM v7 | Client-side declarative route management |
| **HTTP Client**| Axios | Promise-based HTTP client with interceptors |
| **Backend** | Node.js + Express.js | RESTful API server with modular routing |
| **Database** | MongoDB + Mongoose | Document datastore with schema modeling |
| **Tooling** | ESLint 9 (Flat Config) | Code quality and linting across monorepo |

---

## 📁 Monorepo Structure

```text
Job_Track/
├── client/                     # Frontend Application (React + Vite)
│   ├── public/
│   │   └── favicon.svg         # JobTrack branding icon
│   ├── src/
│   │   ├── api/                # Axios instance & health check service
│   │   ├── components/         # UI components (Navbar, Hero, HealthCard, etc.)
│   │   ├── pages/              # Page views (LandingPage)
│   │   ├── App.jsx             # React Router setup
│   │   ├── index.css           # Tailwind CSS imports & themes
│   │   └── main.jsx            # React root mount
│   ├── .env.example            # Client environment variable blueprint
│   ├── eslint.config.js        # ESLint flat config for React
│   ├── index.html              # HTML shell & font imports
│   ├── package.json            # Client dependencies & scripts
│   └── vite.config.js          # Vite config with proxy & Tailwind plugin
│
├── server/                     # Backend API Application (Node + Express)
│   ├── src/
│   │   ├── config/             # MongoDB connection logic (Mongoose)
│   │   ├── controllers/        # Request controllers (Health controller)
│   │   ├── routes/             # Express route definitions (/api/health)
│   │   ├── app.js              # Express app, middleware, and error handling
│   │   └── index.js            # Server entry point & graceful listener
│   ├── .env.example            # Server environment variable blueprint
│   ├── eslint.config.js        # ESLint flat config for Node.js
│   └── package.json            # Server dependencies & scripts
│
├── .gitignore                  # Monorepo git ignore specifications
├── package.json                # Root orchestration & scripts (concurrently)
└── README.md                   # Project documentation & runbook
```

---

## ⚙️ Environment Variables

### 1. Server Configuration (`server/.env`)
Copy `server/.env.example` to `server/.env`:
```bash
cp server/.env.example server/.env
```
Default values:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/jobtrack
CLIENT_URL=http://localhost:5173
```

### 2. Client Configuration (`client/.env`)
Copy `client/.env.example` to `client/.env`:
```bash
cp client/.env.example client/.env
```
Default values:
```env
VITE_API_BASE_URL=http://localhost:5000/api
```

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js**: v18+ (tested on Node v22.18)
- **npm**: v9+ (tested on npm 10.9)
- **MongoDB**: Local MongoDB community server (listening on port 27017) or a MongoDB Atlas URI. *(Note: The backend gracefully connects or reports disconnected state without crashing if MongoDB is starting up).*

### 2. Install Dependencies
Run from the root directory to install dependencies for root, client, and server:
```bash
npm run install:all
```
*(Or install in individual folders: `npm install`, `cd client && npm install`, `cd server && npm install`)*

### 3. Run the Applications

#### Option A: Run Both Simultaneously (Recommended)
From the project root:
```bash
npm run dev
```
This boots both the Express server on port 5000 and the Vite React client on port 5173 concurrently with color-coded terminal logs.

#### Option B: Run Individually
- **Run Backend only**:
  ```bash
  npm run server
  ```
  API will be available at `http://localhost:5000`.

- **Run Frontend only**:
  ```bash
  npm run client
  ```
  Vite will launch the web application at `http://localhost:5173`.

---

## 🩺 Health Check API

The backend exposes a health diagnostic endpoint:

### Endpoint
`GET /api/health`

### Example Request
```bash
curl http://localhost:5000/api/health
```

### Example 200 OK Response
```json
{
  "status": "ok",
  "service": "JobTrack API",
  "version": "1.0.0",
  "environment": "development",
  "timestamp": "2026-10-15T14:48:00.000Z",
  "uptimeSeconds": 42,
  "database": {
    "status": "connected",
    "healthy": true
  }
}
```

---

## 🧹 Code Quality & Linting

Run ESLint across both client and server applications:
```bash
npm run lint
```
Or individually:
```bash
npm --prefix client run lint
npm --prefix server run lint
```

---

## 🛣️ Roadmap
- [x] User Authentication & JWT / OAuth2 (Recruiter & Candidate roles)
- [x] Job Postings CRUD & Filtering
- [x] Resume upload and applicant profile storage
- [x] AI-Powered ATS Resume Matching & Scoring (Step 19)
- [ ] Drag-and-drop Kanban hiring pipeline
- [ ] Email notifications & interview scheduling

---

## 🧠 AI-Powered ATS Resume Matching (Step 19)

JobTrack includes an AI-assisted Applicant Tracking System (ATS) matching module that evaluates candidate resumes against recruiter-defined job criteria using a deterministic baseline combined with Google Gemini generative AI semantic analysis.

### 1. ATS Architecture

```text
                                  ┌───────────────────────────┐
                                  │ Recruiter Job Criteria    │
                                  │ (Skills, Exp, Projects,   │
                                  │  Education, Weights)      │
                                  └─────────────┬─────────────┘
                                                │
Candidate Resume Upload (PDF / DOCX)            │
          │                                     │
          ▼                                     ▼
┌───────────────────────────┐          ┌───────────────────────────────────┐
│ resumeExtractor.service   │          │ atsEngine.service                 │
│ - Magic byte validation   │ ───────> │ - Deterministic Skills Matching   │
│ - Secure local extraction │ Text     │ - Experience & Education Parsing │
│ - Path-traversal guards   │          └─────────────────┬─────────────────┘
└───────────────────────────┘                            │
                                                         ▼
                                       ┌───────────────────────────────────┐
                                       │ aiProvider.service (Gemini LLM)   │
                                       │ - Project relevance scoring       │
                                       │ - Semantic keyword alignment      │
                                       │ - Structured rationale & fallback │
                                       └─────────────────┬─────────────────┘
                                                         │
                                                         ▼
                                       ┌───────────────────────────────────┐
                                       │ atsReport.model                   │
                                       │ - Criteria snapshot & versioning  │
                                       │ - Weighted score (0-100)          │
                                       │ - Category breakdown & evidence   │
                                       └───────────────────────────────────┘
```

1. **Extraction Layer (`resumeExtractor.service.js`)**: Safely parses text from PDF (`pdf-parse`) and DOCX (`mammoth`) files stored in private local storage without executing untrusted code or exposing storage paths.
2. **Deterministic Matching Engine (`atsEngine.service.js`)**: Computes objective scores for required/preferred skills, relevant years of experience, and minimum education thresholds.
3. **AI Provider Integration (`aiProvider.service.js`)**: Leverages Google Gemini (`@google/generative-ai`) to semantically evaluate complex project requirements and contextual job-description alignment, with automatic graceful fallback to deterministic token matching when Gemini is unconfigured or unavailable.
4. **Report & Snapshot Storage (`atsReport.model.js` & `jobCriteria.model.js`)**: Stores an immutable snapshot of criteria, weights, and scoring engine version (`v1.0.0`) with every evaluation to ensure auditability and historical reproducibility.

---

### 2. Scoring Methodology & Default Weights

The overall match score (0–100) is calculated as the normalized weighted sum of five key categories:

| Category | Default Weight | Description | Scoring Method |
| :--- | :---: | :--- | :--- |
| **Skills** | **35%** | Required and preferred technical & professional skills | Deterministic exact & alias matching (required skills weighted 80%, preferred 20%) |
| **Projects** | **25%** | Alignment with project requirements & technical challenges | Gemini AI semantic evaluation with token-overlap fallback |
| **Experience** | **20%** | Minimum required years of relevant professional experience | Deterministic regex extraction with proportional partial credit |
| **Education** | **10%** | Minimum degree requirements (High School, Associate, Bachelor, Master, Doctorate) | Hierarchical degree level detection |
| **JD Alignment**| **10%** | Core keywords and domain alignment with job description | Semantic and keyword frequency analysis |

#### Weight Normalization
Recruiters may customize weights on a per-job basis. All weights must be non-negative ($w_i \ge 0$). When computing the overall score, weights are automatically normalized to 100%:
$$\text{Weight}_i^{\text{normalized}} = \frac{w_i}{\sum_{k} w_k} \times 100$$
If all weights are set to 0, an equal distribution (20% each) is automatically applied as a safeguard.

---

### 3. Supported Resume Formats

- **PDF (`application/pdf`)**: Parsed via `pdf-parse`. Supports text-based multi-page PDFs with page counts.
- **DOCX (`application/vnd.openxmlformats-officedocument.wordprocessingml.document`)**: Parsed via `mammoth` raw text extraction.
- **File Validation & Safety**:
  - Magic byte validation prevents executable files disguised as PDFs or documents.
  - Strict 5 MB extraction safety cap prevents memory exhaustion denial-of-service.
  - Path-traversal sanitization guarantees files are only accessed within the designated private storage directory.
  - Cloudinary-stored resumes trigger an informative unavailable state with instructions for manual recruiter review.

---

### 4. AI Provider Configuration

The ATS module supports Google Gemini models.

Add the following environment variable to `server/.env`:
```env
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-1.5-flash
```

- **Graceful Fallback**: If `GEMINI_API_KEY` is not provided or API calls fail (e.g. rate limit, network timeout, quota exceeded), the system automatically falls back to deterministic text matching and marks the report with `aiAssisted: false`.
- **JSON Schema Validation**: AI outputs are strictly constrained and validated against a schema before being accepted.

---

### 5. Data Privacy & Fair Hiring Safeguards

- **Decision Support Only**: ATS scores are designed solely as decision-support indicators, never as automated rejection mechanisms. Candidates are never auto-rejected based on an ATS score.
- **Protected Characteristics Guard**: The scoring engine explicitly excludes names, photos, gender, age, ethnicity, caste, religion, disability, marital status, and physical location from evaluation.
- **Role-Based Isolation**: ATS evaluation criteria and candidate match reports are accessible **only to authorized recruiters who own the job** and platform administrators. Candidates cannot view ATS reports, notes, or score breakdowns.
- **Confidential Storage**: Resume storage keys and server paths are never exposed to clients. Resumes are streamed through authenticated endpoints.

---

### 6. ATS API Endpoints

All endpoints require authentication (`Bearer <token>` or HTTP-only cookie):

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `PUT` | `/api/jobs/:jobId/criteria` | Recruiter (Owner) / Admin | Create or update evaluation criteria and weights |
| `GET` | `/api/jobs/:jobId/criteria` | Recruiter (Owner) / Admin | Retrieve evaluation criteria for a job listing |
| `POST`| `/api/applications/:applicationId/ats` | Recruiter (Owner) / Admin | Request or trigger ATS scoring (`?force=true` to reprocess) |
| `GET` | `/api/applications/:applicationId/ats` | Recruiter (Owner) / Admin | Retrieve full ATS score report and category evidence |
| `GET` | `/api/jobs/:jobId/ats-reports` | Recruiter (Owner) / Admin | Retrieve match score map for all applicants to a job |

---

### 7. Test Commands

Run the dedicated ATS test suite:
```bash
cd server
npm run test:ats
```

Run the full end-to-end regression test suite:
```bash
cd server
npm test
```

Run security audit tests:
```bash
cd server
npm run test:security
```

---

### 8. Known Limitations

1. **Scanned Images / Non-OCR PDFs**: Resumes containing only scanned images without an embedded text layer cannot be parsed without an OCR pre-processor. The system marks these resumes with an informative warning and leaves manual evaluation to the recruiter.
2. **Cloudinary Resumes**: Resumes stored in Cloudinary currently indicate that automated text extraction is unavailable and offer a direct recruiter review link. Local private storage is recommended for automated ATS analysis.
3. **Complex Layout Tables**: Multi-column or complex graphic resume layouts may interleave text lines during plain-text extraction.

