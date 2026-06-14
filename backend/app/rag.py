from __future__ import annotations

import hashlib
import math
import os
import re

from . import data
from .models import DocumentChunk, Evidence
from .openai_client import embedding_model, generate_embeddings, openai_available


TOKEN_RE = re.compile(r"[a-zA-Z0-9_]+")
LOCAL_VECTOR_DIMS = 256
LOCAL_RAG_MODES = {"0", "false", "off", "local", "offline", "disabled"}
_OPENAI_VECTOR_CACHE: dict[str, list[float]] = {}
_LOCAL_VECTOR_CACHE: dict[str, list[float]] = {}
_LAST_PROVIDER = "openai_embeddings" if openai_available() else "local_hash_vectors"


def tokenize(text: str) -> list[str]:
    stop = {
        "the",
        "and",
        "or",
        "for",
        "with",
        "this",
        "that",
        "from",
        "into",
        "more",
        "than",
        "must",
        "should",
        "until",
        "equipment",
    }
    return [token.lower() for token in TOKEN_RE.findall(text) if token.lower() not in stop and len(token) > 2]


def _log_chunks(equipment_id: str) -> list[DocumentChunk]:
    chunks: list[DocumentChunk] = []
    for log in data.MAINTENANCE_LOGS:
        if log.equipment_id != equipment_id:
            continue
        source_type = "delay_log" if log.downtime_minutes > 0 else "maintenance_log"
        chunks.append(
            DocumentChunk(
                id=log.id,
                equipment_id=log.equipment_id,
                source_type=source_type,  # type: ignore[arg-type]
                title=log.title,
                section="Historical maintenance",
                text=f"{log.summary} Root cause: {log.root_cause}. Action taken: {log.action_taken}.",
                metadata={"downtime_minutes": log.downtime_minutes, "timestamp": log.timestamp.isoformat()},
            )
        )
    return chunks


def _feedback_chunks(equipment_id: str) -> list[DocumentChunk]:
    chunks: list[DocumentChunk] = []
    for item in data.FEEDBACK:
        if item.equipment_id != equipment_id:
            continue
        text = " ".join(
            part
            for part in [
                f"Engineer feedback was {item.rating}.",
                f"Actual root cause: {item.actual_root_cause}." if item.actual_root_cause else "",
                f"Action taken: {item.action_taken}." if item.action_taken else "",
                item.note or "",
            ]
            if part
        )
        chunks.append(
            DocumentChunk(
                id=item.id,
                equipment_id=item.equipment_id,
                source_type="feedback",
                title="Engineer feedback memory",
                section="Outcome feedback",
                text=text,
                metadata={"recommendation_id": item.recommendation_id, "timestamp": item.timestamp.isoformat()},
            )
        )
    return chunks


def _spare_chunks(equipment_id: str) -> list[DocumentChunk]:
    chunks: list[DocumentChunk] = []
    for part in data.SPARES:
        if part.equipment_id != equipment_id:
            continue
        chunks.append(
            DocumentChunk(
                id=f"spare-live-{part.id}",
                equipment_id=part.equipment_id,
                source_type="spare_part",
                title=f"Spare part availability: {part.name}",
                section="Stores inventory",
                text=(
                    f"Spare part {part.name} has stock {part.stock}, procurement lead time {part.lead_time_days} days, "
                    f"supplier {part.supplier}, and critical flag {part.critical}."
                ),
                metadata={
                    "spare_id": part.id,
                    "stock": part.stock,
                    "lead_time_days": part.lead_time_days,
                    "supplier": part.supplier,
                    "critical": part.critical,
                },
            )
        )
    return chunks


def corpus_for_equipment(equipment_id: str) -> list[DocumentChunk]:
    return [
        chunk
        for chunk in data.DOCUMENTS
        if chunk.equipment_id == equipment_id
    ] + _log_chunks(equipment_id) + _feedback_chunks(equipment_id) + _spare_chunks(equipment_id)


def rag_status() -> dict[str, str | int | bool]:
    return {
        "provider": _LAST_PROVIDER,
        "preferred_provider": "openai_embeddings" if _openai_rag_enabled() else "local_hash_vectors",
        "embedding_model": embedding_model() if _openai_rag_enabled() else "local-hash-vectors",
        "openai_available": openai_available(),
        "cached_openai_vectors": len(_OPENAI_VECTOR_CACHE),
        "cached_local_vectors": len(_LOCAL_VECTOR_CACHE),
    }


def search_evidence(equipment_id: str, query: str, limit: int = 5) -> list[Evidence]:
    global _LAST_PROVIDER

    corpus = corpus_for_equipment(equipment_id)
    if not corpus:
        return []

    query_text = query.strip() or equipment_id
    chunk_texts = [_chunk_embedding_text(chunk) for chunk in corpus]
    vectors = _openai_vectors([query_text, *chunk_texts]) if _openai_rag_enabled() else None
    provider = "openai_embeddings"

    if not vectors:
        provider = "local_hash_vectors"
        vectors = [_local_vector(query_text), *[_local_vector(text) for text in chunk_texts]]

    _LAST_PROVIDER = provider
    query_vector = vectors[0]
    scored = [
        (_cosine_similarity(query_vector, chunk_vector), chunk)
        for chunk, chunk_vector in zip(corpus, vectors[1:])
    ]
    scored = [(score, chunk) for score, chunk in scored if score > 0]
    scored.sort(key=lambda item: item[0], reverse=True)
    if not scored:
        scored = [(0.01, chunk) for chunk in corpus[:limit]]

    top = _diverse_top(scored, limit)
    max_score = max(score for score, _ in top) or 1.0
    return [
        Evidence(
            source_id=chunk.id,
            source_type=chunk.source_type,
            title=f"{chunk.title} - {chunk.section}",
            excerpt=chunk.text[:360],
            relevance=round(min(1.0, score / max_score), 2),
            metadata={
                **chunk.metadata,
                "retrieval": provider,
                "embedding_model": embedding_model() if provider == "openai_embeddings" else "local-hash-vectors",
                "vector_score": round(score, 4),
            },
        )
        for score, chunk in top
    ]


def add_document(equipment_id: str, source_type: str, title: str, section: str, text: str) -> list[DocumentChunk]:
    paragraphs = [part.strip() for part in re.split(r"\n\s*\n", text) if part.strip()]
    if not paragraphs:
        paragraphs = [text.strip()]
    chunks = []
    for index, paragraph in enumerate(paragraphs, start=1):
        chunk = DocumentChunk(
            id=f"upload-{equipment_id}-{source_type}-{len(data.DOCUMENTS) + index}",
            equipment_id=equipment_id,
            source_type=source_type,  # type: ignore[arg-type]
            title=title,
            section=section or f"Uploaded chunk {index}",
            text=paragraph,
            metadata={"uploaded": True, "chunk": index},
        )
        data.DOCUMENTS.append(chunk)
        chunks.append(chunk)
    return chunks


def _openai_rag_enabled() -> bool:
    mode = os.getenv("STEELGUARD_RAG_MODE", "openai").strip().lower()
    return openai_available() and mode not in LOCAL_RAG_MODES


def _chunk_embedding_text(chunk: DocumentChunk) -> str:
    metadata_text = " ".join(
        str(value)
        for key, value in sorted(chunk.metadata.items())
        if key in {"source_url", "asset_focus", "failure_mode", "maintenance_signal"}
    )
    return " ".join(
        part
        for part in [
            chunk.equipment_id,
            chunk.source_type,
            chunk.title,
            chunk.section,
            metadata_text,
            chunk.text,
        ]
        if part
    )


def _openai_vectors(texts: list[str]) -> list[list[float]] | None:
    missing = [text for text in texts if _cache_key(text) not in _OPENAI_VECTOR_CACHE]
    if missing:
        vectors = generate_embeddings(missing)
        if not vectors:
            return None
        for text, vector in zip(missing, vectors):
            _OPENAI_VECTOR_CACHE[_cache_key(text)] = vector
    return [_OPENAI_VECTOR_CACHE[_cache_key(text)] for text in texts]


def _local_vector(text: str) -> list[float]:
    key = _cache_key(text)
    if key in _LOCAL_VECTOR_CACHE:
        return _LOCAL_VECTOR_CACHE[key]

    vector = [0.0] * LOCAL_VECTOR_DIMS
    for token in tokenize(text):
        digest = hashlib.sha256(token.encode("utf-8")).digest()
        index = int.from_bytes(digest[:2], "big") % LOCAL_VECTOR_DIMS
        sign = 1.0 if digest[2] % 2 == 0 else -1.0
        vector[index] += sign

    magnitude = math.sqrt(sum(value * value for value in vector)) or 1.0
    normalized = [value / magnitude for value in vector]
    _LOCAL_VECTOR_CACHE[key] = normalized
    return normalized


def _cache_key(text: str) -> str:
    return hashlib.sha256(text.strip().encode("utf-8")).hexdigest()


def _cosine_similarity(left: list[float], right: list[float]) -> float:
    if not left or not right or len(left) != len(right):
        return 0.0
    left_norm = math.sqrt(sum(value * value for value in left)) or 1.0
    right_norm = math.sqrt(sum(value * value for value in right)) or 1.0
    return sum(a * b for a, b in zip(left, right)) / (left_norm * right_norm)


def _diverse_top(scored: list[tuple[float, DocumentChunk]], limit: int) -> list[tuple[float, DocumentChunk]]:
    selected: list[tuple[float, DocumentChunk]] = []
    seen_types: set[str] = set()
    for item in scored:
        source_type = item[1].source_type
        if source_type in seen_types:
            continue
        selected.append(item)
        seen_types.add(source_type)
        if len(selected) == limit:
            return selected

    for item in scored:
        if item in selected:
            continue
        selected.append(item)
        if len(selected) == limit:
            return selected
    return selected
