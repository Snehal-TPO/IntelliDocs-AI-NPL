import json
import os
from typing import Any

from openai import OpenAI


DOCUMENT_TYPES = [
    "Invoice",
    "Contract",
    "Insurance Claim",
    "Resume",
    "Medical Report",
    "Bank Statement",
    "Purchase Order",
    "Unknown",
]


class OpenAIUnavailableError(Exception):
    pass


class AIService:
    def __init__(self):
        self.api_key = os.getenv("OPENAI_API_KEY")
        self.model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
        self.client = OpenAI(api_key=self.api_key) if self.api_key else None

    @property
    def is_available(self) -> bool:
        return bool(self.client)

    def classify_document(self, text: str) -> dict[str, Any]:
        payload = self._chat_json(
            system=(
                "You are a document classification engine for an enterprise document "
                "intelligence platform. Return strict JSON only."
            ),
            user=(
                "Classify the document into exactly one of these types: "
                f"{', '.join(DOCUMENT_TYPES)}.\n\n"
                "Return JSON with keys: document_type, confidence_score, reason. "
                "confidence_score must be a number between 0 and 1.\n\n"
                f"Document text:\n{_trim_text(text)}"
            ),
        )
        document_type = payload.get("document_type", "Unknown")
        if document_type not in DOCUMENT_TYPES:
            document_type = "Unknown"

        return {
            "document_type": document_type,
            "confidence_score": _bounded_float(payload.get("confidence_score")),
            "reason": str(payload.get("reason", "")).strip(),
        }

    def extract_fields(self, document_type: str, text: str) -> dict[str, Any]:
        schema_hint = _field_schema_for(document_type)
        return self._chat_json(
            system=(
                "You extract structured fields from business documents. Return strict "
                "JSON only. Use null for unavailable scalar values and [] for "
                "unavailable lists. Do not invent values."
            ),
            user=(
                f"Document type: {document_type}\n"
                f"Required JSON shape:\n{json.dumps(schema_hint, indent=2)}\n\n"
                f"Document text:\n{_trim_text(text)}"
            ),
        )

    def summarize_document(self, text: str) -> dict[str, Any]:
        return self._chat_json(
            system=(
                "You summarize documents for enterprise operations teams. Return "
                "strict JSON only and do not invent facts."
            ),
            user=(
                "Return JSON with keys: executive_summary, key_points, action_items, "
                "risks_or_missing_information. key_points, action_items, and "
                "risks_or_missing_information must be arrays of concise strings.\n\n"
                f"Document text:\n{_trim_text(text)}"
            ),
        )

    def answer_question(self, question: str, contexts: list[dict[str, Any]]) -> str:
        context_text = "\n\n".join(
            f"[Chunk {item['chunk_index']}]\n{item['chunk_text']}" for item in contexts
        )
        payload = self._chat_json(
            system=(
                "You answer questions using only the provided document chunks. If the "
                "answer is not present, say that the document does not provide enough "
                "information. Return strict JSON only."
            ),
            user=(
                f"Question: {question}\n\n"
                f"Document chunks:\n{context_text}\n\n"
                "Return JSON with key: answer."
            ),
        )
        return str(payload.get("answer", "")).strip()

    def _chat_json(self, system: str, user: str) -> dict[str, Any]:
        if not self.client:
            raise OpenAIUnavailableError(
                "OPENAI_API_KEY is not configured. Text extraction was saved, but AI processing is unavailable."
            )

        response = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            response_format={"type": "json_object"},
            temperature=0,
        )
        content = response.choices[0].message.content or "{}"
        try:
            parsed = json.loads(content)
        except json.JSONDecodeError as exc:
            raise ValueError(f"OpenAI returned invalid JSON: {content[:300]}") from exc
        if not isinstance(parsed, dict):
            raise ValueError("OpenAI response was not a JSON object.")
        return parsed


def _field_schema_for(document_type: str) -> dict[str, Any]:
    schemas: dict[str, dict[str, Any]] = {
        "Invoice": {
            "vendor_name": None,
            "invoice_number": None,
            "invoice_date": None,
            "due_date": None,
            "total_amount": None,
            "tax_amount": None,
            "payment_terms": None,
        },
        "Contract": {
            "party_names": [],
            "start_date": None,
            "end_date": None,
            "contract_value": None,
            "renewal_terms": None,
            "termination_clause": None,
            "risk_flags": [],
        },
        "Insurance Claim": {
            "claimant_name": None,
            "claim_number": None,
            "incident_date": None,
            "claim_amount": None,
            "incident_type": None,
            "missing_information": [],
            "fraud_indicators": [],
        },
        "Resume": {
            "candidate_name": None,
            "email": None,
            "phone": None,
            "skills": [],
            "years_of_experience": None,
            "latest_role": None,
        },
    }
    return schemas.get(
        document_type,
        {
            "important_fields": {},
            "missing_information": [],
            "risk_flags": [],
        },
    )


def _trim_text(text: str, limit: int = 14000) -> str:
    text = text.strip()
    if len(text) <= limit:
        return text
    return text[:limit] + "\n\n[Text truncated for model input]"


def _bounded_float(value: Any) -> float:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return 0.0
    return max(0.0, min(1.0, number))
