from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class AskRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=2000)


class SourceChunk(BaseModel):
    chunk_index: int
    preview: str
    score: float | None = None


class AskResponse(BaseModel):
    answer: str
    sources: list[SourceChunk]


class DocumentListItem(BaseModel):
    id: int
    filename: str
    original_filename: str
    file_type: str
    document_type: str | None = None
    confidence_score: float | None = None
    status: str
    created_at: datetime
    updated_at: datetime


class DocumentDetail(DocumentListItem):
    file_path: str
    extracted_text: str | None = None
    classification_reason: str | None = None
    extracted_fields: dict[str, Any] = {}
    summary: dict[str, Any] = {}
    chunks_count: int = 0
