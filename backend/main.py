import json
import shutil
import uuid
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, File, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import Base, engine, get_db
from models import Document, DocumentChunk
from schemas import AskRequest, AskResponse
from services.ai_service import AIService, OpenAIUnavailableError
from services.chunking_service import chunk_text
from services.document_parser import SUPPORTED_EXTENSIONS, DocumentParseError, extract_text
from services.embedding_service import (
    EmbeddingService,
    cosine_similarity,
    dumps_embedding,
    keyword_score,
    loads_embedding,
)


load_dotenv()

BASE_DIR = Path(__file__).resolve().parent
UPLOAD_DIR = BASE_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

Base.metadata.create_all(bind=engine)

# TODO: Replace local /uploads storage with AWS S3 or another object store for production.
# TODO: Add Azure Document Intelligence as an optional parser for high-accuracy layout extraction.
# TODO: Add user authentication, role-based access, and audit logging before multi-user deployment.
# TODO: Add multi-document semantic search, approval workflows, and Excel/PDF export jobs.

app = FastAPI(title="IntelliDocs AI API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ],
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1):\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def api_root():
    return {
        "message": "IntelliDocs AI API is running.",
        "frontend": "http://127.0.0.1:5173/dashboard",
        "api_docs": "http://127.0.0.1:8000/docs",
        "health": "http://127.0.0.1:8000/api/health",
    }


@app.get("/api/health")
def health_check():
    return {"status": "ok"}


@app.post("/api/documents/upload", status_code=status.HTTP_201_CREATED)
async def upload_document(file: UploadFile = File(...), db: Session = Depends(get_db)):
    original_filename = file.filename or "document"
    extension = Path(original_filename).suffix.lower()
    if extension not in SUPPORTED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type. Allowed: {', '.join(sorted(SUPPORTED_EXTENSIONS))}",
        )

    stored_filename = f"{uuid.uuid4().hex}{extension}"
    file_path = UPLOAD_DIR / stored_filename

    with file_path.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    if file_path.stat().st_size == 0:
        file_path.unlink(missing_ok=True)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is empty.")

    document = Document(
        filename=stored_filename,
        original_filename=original_filename,
        file_type=extension.lstrip("."),
        file_path=str(file_path),
        status="processing",
    )
    db.add(document)
    db.commit()
    db.refresh(document)

    try:
        text = extract_text(str(file_path), extension).strip()
        if not text:
            document.extracted_text = ""
            document.document_type = "Unknown"
            document.confidence_score = 0
            document.classification_reason = "No extractable text was found in the uploaded document."
            document.extracted_fields_json = json.dumps({})
            document.summary_json = json.dumps({})
            document.status = "failed_empty_text"
            db.commit()
            db.refresh(document)
            return serialize_document(document)

        document.extracted_text = text
        _process_document_ai(document, text, db)
        db.commit()
        db.refresh(document)
        return serialize_document(document)
    except DocumentParseError as exc:
        document.document_type = "Unknown"
        document.confidence_score = 0
        document.classification_reason = str(exc)
        document.extracted_fields_json = json.dumps({})
        document.summary_json = json.dumps({})
        document.status = "failed_parse"
        db.commit()
        db.refresh(document)
        return serialize_document(document)
    except Exception as exc:
        document.document_type = "Unknown"
        document.confidence_score = 0
        document.classification_reason = f"Processing failed: {exc}"
        document.extracted_fields_json = json.dumps({})
        document.summary_json = json.dumps({})
        document.status = "failed"
        db.commit()
        db.refresh(document)
        return serialize_document(document)
    finally:
        await file.close()


@app.get("/api/documents")
def list_documents(db: Session = Depends(get_db)):
    documents = db.query(Document).order_by(Document.created_at.desc()).all()
    return [serialize_document(document, include_text=False) for document in documents]


@app.get("/api/documents/{document_id}")
def get_document(document_id: int, db: Session = Depends(get_db)):
    document = db.get(Document, document_id)
    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")
    return serialize_document(document)


@app.delete("/api/documents/{document_id}")
def delete_document(document_id: int, db: Session = Depends(get_db)):
    document = db.get(Document, document_id)
    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")

    file_path = Path(document.file_path)
    db.delete(document)
    db.commit()
    file_path.unlink(missing_ok=True)
    return {"deleted": True, "id": document_id}


@app.post("/api/documents/{document_id}/ask", response_model=AskResponse)
def ask_document(document_id: int, payload: AskRequest, db: Session = Depends(get_db)):
    question = payload.question.strip()
    if not question:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Question cannot be empty.")

    document = db.get(Document, document_id)
    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")
    if not document.extracted_text:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="This document has no extracted text available for Q&A.",
        )

    embedding_service = EmbeddingService()
    ai_service = AIService()
    if not embedding_service.is_available or not ai_service.is_available:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="OPENAI_API_KEY is not configured. Document Q&A requires OpenAI embeddings and chat completion.",
        )

    contexts = _retrieve_contexts(document_id, question, embedding_service, db)
    if not contexts:
        contexts = [
            {
                "chunk_index": 0,
                "chunk_text": document.extracted_text[:4000],
                "score": None,
            }
        ]

    try:
        answer = ai_service.answer_question(question, contexts)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"OpenAI Q&A failed: {exc}",
        ) from exc

    return {
        "answer": answer,
        "sources": [
            {
                "chunk_index": item["chunk_index"],
                "preview": item["chunk_text"][:300],
                "score": item.get("score"),
            }
            for item in contexts
        ],
    }


@app.get("/api/analytics/summary")
def analytics_summary(db: Session = Depends(get_db)):
    total = db.query(func.count(Document.id)).scalar() or 0
    average_confidence = db.query(func.avg(Document.confidence_score)).scalar()

    by_type_rows = (
        db.query(Document.document_type, func.count(Document.id))
        .group_by(Document.document_type)
        .order_by(func.count(Document.id).desc())
        .all()
    )
    by_status_rows = (
        db.query(Document.status, func.count(Document.id))
        .group_by(Document.status)
        .order_by(func.count(Document.id).desc())
        .all()
    )
    recent_uploads = db.query(Document).order_by(Document.created_at.desc()).limit(5).all()

    return {
        "total_documents": total,
        "documents_by_type": {doc_type or "Unknown": count for doc_type, count in by_type_rows},
        "status_counts": {status_name or "unknown": count for status_name, count in by_status_rows},
        "average_confidence": round(float(average_confidence), 3) if average_confidence is not None else 0,
        "recent_uploads": [serialize_document(document, include_text=False) for document in recent_uploads],
    }


def _process_document_ai(document: Document, text: str, db: Session) -> None:
    ai_service = AIService()
    embedding_service = EmbeddingService()

    document.chunks.clear()
    chunks = chunk_text(text)

    try:
        classification = ai_service.classify_document(text)
        document.document_type = classification["document_type"]
        document.confidence_score = classification["confidence_score"]
        document.classification_reason = classification["reason"]
        document.extracted_fields_json = json.dumps(
            ai_service.extract_fields(document.document_type, text),
            ensure_ascii=True,
        )
        document.summary_json = json.dumps(ai_service.summarize_document(text), ensure_ascii=True)

        chunk_rows = []
        for chunk in chunks:
            embedding = embedding_service.embed_text(chunk["chunk_text"])
            chunk_rows.append(
                DocumentChunk(
                    document_id=document.id,
                    chunk_index=chunk["chunk_index"],
                    chunk_text=chunk["chunk_text"],
                    embedding_json=dumps_embedding(embedding),
                )
            )

        db.add_all(chunk_rows)
        document.status = "processed"
    except OpenAIUnavailableError as exc:
        for chunk in chunks:
            db.add(
                DocumentChunk(
                    document_id=document.id,
                    chunk_index=chunk["chunk_index"],
                    chunk_text=chunk["chunk_text"],
                    embedding_json=None,
                )
            )
        document.document_type = "Unknown"
        document.confidence_score = 0
        document.classification_reason = str(exc)
        document.extracted_fields_json = json.dumps({"error": str(exc)}, ensure_ascii=True)
        document.summary_json = json.dumps({"error": str(exc)}, ensure_ascii=True)
        document.status = "processed_without_ai"
    except Exception as exc:
        for chunk in chunks:
            db.add(
                DocumentChunk(
                    document_id=document.id,
                    chunk_index=chunk["chunk_index"],
                    chunk_text=chunk["chunk_text"],
                    embedding_json=None,
                )
            )
        document.document_type = document.document_type or "Unknown"
        document.confidence_score = document.confidence_score or 0
        document.classification_reason = f"AI processing failed: {exc}"
        document.extracted_fields_json = document.extracted_fields_json or json.dumps({})
        document.summary_json = document.summary_json or json.dumps({})
        document.status = "ai_failed"


def _retrieve_contexts(
    document_id: int,
    question: str,
    embedding_service: EmbeddingService,
    db: Session,
) -> list[dict[str, Any]]:
    chunks = (
        db.query(DocumentChunk)
        .filter(DocumentChunk.document_id == document_id)
        .order_by(DocumentChunk.chunk_index.asc())
        .all()
    )
    if not chunks:
        return []

    try:
        question_embedding = embedding_service.embed_text(question)
        scored = []
        for chunk in chunks:
            embedding = loads_embedding(chunk.embedding_json)
            if embedding:
                scored.append(
                    {
                        "chunk_index": chunk.chunk_index,
                        "chunk_text": chunk.chunk_text,
                        "score": cosine_similarity(question_embedding, embedding),
                    }
                )
        if scored:
            return sorted(scored, key=lambda item: item["score"], reverse=True)[:5]
    except Exception:
        pass

    scored = [
        {
            "chunk_index": chunk.chunk_index,
            "chunk_text": chunk.chunk_text,
            "score": keyword_score(question, chunk.chunk_text),
        }
        for chunk in chunks
    ]
    return sorted(scored, key=lambda item: item["score"], reverse=True)[:5]


def serialize_document(document: Document, include_text: bool = True) -> dict[str, Any]:
    payload = {
        "id": document.id,
        "filename": document.filename,
        "original_filename": document.original_filename,
        "file_type": document.file_type,
        "document_type": document.document_type,
        "confidence_score": document.confidence_score,
        "classification_reason": document.classification_reason,
        "status": document.status,
        "created_at": document.created_at,
        "updated_at": document.updated_at,
        "chunks_count": len(document.chunks),
    }
    if include_text:
        payload.update(
            {
                "file_path": document.file_path,
                "extracted_text": document.extracted_text,
                "extracted_fields": _loads_json(document.extracted_fields_json, {}),
                "summary": _loads_json(document.summary_json, {}),
            }
        )
    return payload


def _loads_json(raw: str | None, fallback: Any) -> Any:
    if not raw:
        return fallback
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return fallback
