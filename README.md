# IntelliDocs AI

IntelliDocs AI is a full-stack document intelligence NLP application. Users can upload PDF, DOCX, TXT, PNG, JPG, and JPEG files; extract text; classify the document type; extract key fields; generate structured summaries; ask questions against document chunks; and review processing history.

## Tech Stack

- Frontend: React, Vite, Tailwind CSS, Axios
- Backend: FastAPI, SQLite, SQLAlchemy
- Extraction: PyMuPDF, python-docx, pytesseract
- AI: OpenAI chat completions and embeddings
- Storage: local files in `backend/uploads`

## Prerequisites

- Python 3.10+
- Node.js 18+
- Tesseract OCR installed locally for image OCR
- An OpenAI API key for AI classification, summarization, field extraction, embeddings, and Q&A

macOS Tesseract install example:

```bash
brew install tesseract
```

## Backend Setup

```bash
cd intellidocs-ai/backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Edit `.env` and set:

```bash
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o-mini
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
DATABASE_URL=sqlite:///./intellidocs.db
```

Run the API:

```bash
uvicorn main:app --reload
```

The backend runs at `http://localhost:8000`.

## Frontend Setup

```bash
cd intellidocs-ai/frontend
npm install
npm run dev
```

The frontend runs at `http://localhost:5173`.

Optional frontend environment override:

```bash
VITE_API_BASE_URL=http://localhost:8000/api
```

## GitHub Pages

The frontend can be deployed to GitHub Pages from the `main` branch using the included workflow:

```text
https://snehal-tpo.github.io/IntelliDocs-AI-NPL/
```

GitHub Pages only hosts the static React frontend. The FastAPI backend still needs to run locally or be deployed to a backend host such as Render, Railway, Fly.io, AWS, or Azure. Set `VITE_API_BASE_URL` during the frontend build if the backend is deployed somewhere other than `http://localhost:8000/api`.

## API Endpoints

- `POST /api/documents/upload`
- `GET /api/documents`
- `GET /api/documents/{id}`
- `DELETE /api/documents/{id}`
- `POST /api/documents/{id}/ask`
- `GET /api/analytics/summary`

## Sample Documents To Test

- Invoice PDF with vendor, invoice number, due date, tax, and total
- Contract DOCX with parties, terms, dates, renewal, and termination clauses
- Resume TXT or PDF with candidate details and skills
- Scanned claim or receipt image after Tesseract is installed
- Bank statement PDF with account activity

## Behavior Without `OPENAI_API_KEY`

Uploads still save locally and text extraction still runs. AI classification, field extraction, summarization, embeddings, and document Q&A return clear unavailable states instead of mock output.

## Future Improvements

- TODO: AWS S3 storage for uploaded originals and generated artifacts
- TODO: Azure Document Intelligence integration for layout-aware parsing
- TODO: User authentication and session management
- TODO: Role-based access controls for teams and departments
- TODO: Multi-document semantic search across a workspace
- TODO: Approval workflow for extracted fields and summary review
- TODO: Export results to Excel and PDF
