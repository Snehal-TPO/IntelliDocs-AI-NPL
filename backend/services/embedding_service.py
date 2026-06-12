import json
import math
import os
import re
from collections import Counter
from typing import Iterable

from openai import OpenAI

from services.ai_service import OpenAIUnavailableError


class EmbeddingService:
    def __init__(self):
        self.api_key = os.getenv("OPENAI_API_KEY")
        self.model = os.getenv("OPENAI_EMBEDDING_MODEL", "text-embedding-3-small")
        self.client = OpenAI(api_key=self.api_key) if self.api_key else None

    @property
    def is_available(self) -> bool:
        return bool(self.client)

    def embed_text(self, text: str) -> list[float]:
        if not self.client:
            raise OpenAIUnavailableError(
                "OPENAI_API_KEY is not configured. Embeddings and Q&A are unavailable."
            )

        response = self.client.embeddings.create(model=self.model, input=text)
        return response.data[0].embedding


def dumps_embedding(embedding: list[float]) -> str:
    return json.dumps(embedding, separators=(",", ":"))


def loads_embedding(raw: str | None) -> list[float] | None:
    if not raw:
        return None
    try:
        value = json.loads(raw)
    except json.JSONDecodeError:
        return None
    return value if isinstance(value, list) else None


def cosine_similarity(a: Iterable[float], b: Iterable[float]) -> float:
    a_list = list(a)
    b_list = list(b)
    dot = sum(x * y for x, y in zip(a_list, b_list))
    mag_a = math.sqrt(sum(x * x for x in a_list))
    mag_b = math.sqrt(sum(y * y for y in b_list))
    if not mag_a or not mag_b:
        return 0.0
    return dot / (mag_a * mag_b)


def keyword_score(question: str, chunk_text: str) -> float:
    question_tokens = Counter(_tokens(question))
    chunk_tokens = Counter(_tokens(chunk_text))
    if not question_tokens or not chunk_tokens:
        return 0.0
    overlap = sum(min(question_tokens[token], chunk_tokens[token]) for token in question_tokens)
    return overlap / max(1, len(question_tokens))


def _tokens(text: str) -> list[str]:
    return [token for token in re.findall(r"[a-zA-Z0-9]+", text.lower()) if len(token) > 2]
