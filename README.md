# Resume Analyser Web App

A short college project that analyzes PDF resumes for a selected job role and returns an ATS-style report.

## Tech Stack

- Frontend: React + Tailwind CSS + Axios
- Backend: Node.js + Express
- Resume Parsing: `pdf-parse`
- AI Analysis: Groq API (`llama-3.1-8b-instant`)
- Database: None (stateless)

## Features

- Select target role from dropdown
- Upload resume in PDF format
- Get ATS report with:
  - Overall score out of 100
  - Key issues
  - Actionable suggestions
  - Keyword match (present vs missing)

## Run Locally

### 1) Backend

```bash
cd backend
npm install
copy .env.example .env
```

Set `GROQ_API_KEY` in `.env`, then:

```bash
npm start
```

Backend runs at `http://localhost:5000`.

### 2) Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:5173`.
