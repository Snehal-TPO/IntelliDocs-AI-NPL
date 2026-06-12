import re


def chunk_text(text: str, max_chars: int = 1800, overlap: int = 250) -> list[dict]:
    cleaned = re.sub(r"\n{3,}", "\n\n", text.strip())
    if not cleaned:
        return []

    paragraphs = [p.strip() for p in re.split(r"\n\s*\n", cleaned) if p.strip()]
    chunks: list[str] = []
    current = ""

    for paragraph in paragraphs:
        if len(paragraph) > max_chars:
            if current:
                chunks.append(current.strip())
                current = ""
            chunks.extend(_split_long_text(paragraph, max_chars, overlap))
            continue

        candidate = f"{current}\n\n{paragraph}".strip() if current else paragraph
        if len(candidate) <= max_chars:
            current = candidate
        else:
            chunks.append(current.strip())
            current = _with_overlap(current, overlap, paragraph)

    if current:
        chunks.append(current.strip())

    return [{"chunk_index": index, "chunk_text": chunk} for index, chunk in enumerate(chunks)]


def _split_long_text(text: str, max_chars: int, overlap: int) -> list[str]:
    chunks: list[str] = []
    start = 0
    while start < len(text):
        end = min(start + max_chars, len(text))
        chunks.append(text[start:end].strip())
        if end == len(text):
            break
        start = max(end - overlap, start + 1)
    return chunks


def _with_overlap(previous: str, overlap: int, next_paragraph: str) -> str:
    tail = previous[-overlap:].strip() if overlap > 0 else ""
    return f"{tail}\n\n{next_paragraph}".strip() if tail else next_paragraph
