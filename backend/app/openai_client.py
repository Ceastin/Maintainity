from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any, Sequence

import httpx

from . import data
from .models import Recommendation


OPENAI_EMBEDDINGS_URL = "https://api.openai.com/v1/embeddings"
OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses"
DEFAULT_MODEL = "gpt-5.5"
DEFAULT_EMBEDDING_MODEL = "text-embedding-3-small"


def openai_available() -> bool:
    return bool(_api_key())


def embedding_model() -> str:
    return (_env_value("OPENAI_EMBEDDING_MODEL") or DEFAULT_EMBEDDING_MODEL).strip()


def generate_embeddings(texts: Sequence[str]) -> list[list[float]] | None:
    api_key = _api_key()
    clean_texts = [text.strip() for text in texts if text and text.strip()]
    if not api_key or not clean_texts:
        return None

    payload = {
        "model": embedding_model(),
        "input": clean_texts,
    }

    try:
        with httpx.Client(timeout=30) as client:
            response = client.post(
                OPENAI_EMBEDDINGS_URL,
                headers=_headers(api_key),
                json=payload,
            )
            response.raise_for_status()
    except httpx.HTTPError:
        return None

    try:
        items = sorted(response.json().get("data", []), key=lambda item: item["index"])
        vectors = [item["embedding"] for item in items]
    except (KeyError, TypeError):
        return None

    if len(vectors) != len(clean_texts):
        return None
    return vectors


def generate_copilot_reply(message: str, recommendation: Recommendation, conversation_history: Sequence[str] | None = None) -> str | None:
    api_key = _api_key()
    if not api_key:
        return None

    equipment = data.EQUIPMENT[recommendation.equipment_id]
    latest = sorted(
        [reading for reading in data.SENSOR_READINGS if reading.equipment_id == recommendation.equipment_id],
        key=lambda item: item.timestamp,
    )[-1]
    active_alerts = [alert for alert in data.ALERTS.values() if alert.equipment_id == recommendation.equipment_id]
    spares = [part for part in data.SPARES if part.equipment_id == recommendation.equipment_id]

    context = {
        "equipment": {
            "id": equipment.id,
            "name": equipment.name,
            "area": equipment.area,
            "asset_type": equipment.asset_type,
            "criticality": equipment.criticality,
            "description": equipment.description,
        },
        "latest_metrics": latest.metrics,
        "active_alerts": [
            {
                "severity": alert.severity,
                "message": alert.message,
                "signal": alert.signal,
                "value": alert.value,
            }
            for alert in active_alerts[:3]
        ],
        "recommendation": {
            "diagnosis": recommendation.diagnosis,
            "risk_level": recommendation.risk_level,
            "urgency": recommendation.urgency,
            "rul_hours": recommendation.rul_estimate.hours,
            "confidence": recommendation.confidence,
            "probable_root_causes": recommendation.probable_root_causes,
            "immediate_actions": recommendation.immediate_actions,
            "long_term_actions": recommendation.long_term_actions,
            "spare_strategy": recommendation.spare_strategy,
            "escalation_trigger": recommendation.escalation_trigger,
            "ml_prediction": recommendation.ml_prediction.model_dump() if recommendation.ml_prediction else None,
            "process_defects": [item.model_dump() for item in recommendation.process_defects],
            "evidence": [
                {
                    "title": item.title,
                    "source_type": item.source_type,
                    "excerpt": item.excerpt,
                    "relevance": item.relevance,
                }
                for item in recommendation.evidence[:4]
            ],
        },
        "spares": [
            {
                "name": part.name,
                "stock": part.stock,
                "lead_time_days": part.lead_time_days,
                "critical": part.critical,
            }
            for part in spares[:5]
        ],
        "recent_conversation": list(conversation_history or [])[-8:],
    }

    payload = {
        "model": _env_value("OPENAI_MODEL") or DEFAULT_MODEL,
        "reasoning": {"effort": "low"},
        "instructions": (
            "You are Maintainence AI's maintenance copilot for a steel plant. "
            "Answer as a practical maintenance engineer. Use only the supplied equipment, telemetry, alert, evidence, "
            "spare, and recommendation context. Do not invent sensor values or source names. "
            "Be concise, operational, and specific. If the user asks for next actions, prioritize safety and production impact. "
            "Format with short section labels and plain line-separated bullets. Do not use markdown emphasis, asterisks, "
            "tables, or horizontal rules."
        ),
        "input": (
            "User question:\n"
            f"{message}\n\n"
            "Backend context JSON:\n"
            f"{json.dumps(context, default=str)}"
        ),
        "max_output_tokens": 520,
    }

    try:
        with httpx.Client(timeout=25) as client:
            response = client.post(
                OPENAI_RESPONSES_URL,
                headers=_headers(api_key),
                json=payload,
            )
            response.raise_for_status()
    except httpx.HTTPError:
        return None

    return _extract_response_text(response.json())


def _api_key() -> str:
    return _normalize_key(_env_value("OPENAI_API_KEY"))


def _headers(api_key: str) -> dict[str, str]:
    return {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }


def _env_value(name: str) -> str:
    return (os.getenv(name) or _read_dotenv_value(name)).strip()


def _read_dotenv_value(name: str) -> str:
    backend_root = Path(__file__).resolve().parents[1]
    project_root = backend_root.parent
    for path in (backend_root / ".env", project_root / ".env"):
        if not path.exists():
            continue
        for line in path.read_text(encoding="utf-8").splitlines():
            stripped = line.strip()
            if not stripped or stripped.startswith("#") or "=" not in stripped:
                continue
            key, value = stripped.split("=", 1)
            if key.strip() == name:
                return value.strip()
    return ""


def _normalize_key(value: str | None) -> str:
    normalized = (value or "").strip().strip('"').strip("'")
    while normalized.startswith("OPENAI_API_KEY="):
        normalized = normalized.split("=", 1)[1].strip().strip('"').strip("'")
    return normalized if normalized.startswith("sk-") else ""


def _extract_response_text(payload: dict[str, Any]) -> str | None:
    output_text = payload.get("output_text")
    if isinstance(output_text, str) and output_text.strip():
        return output_text.strip()

    parts: list[str] = []
    for item in payload.get("output", []):
        for content in item.get("content", []):
            text = content.get("text")
            if isinstance(text, str) and text.strip():
                parts.append(text.strip())
    return "\n".join(parts).strip() or None


def generate_diagnosis_and_actions(
    equipment_context: dict[str, Any],
    sensor_metrics: dict[str, float],
    evidence_items: list[dict[str, str]],
    anomaly_score: float,
    rul_hours: int,
    risk_level: str,
    urgency: str,
    ml_prediction: dict[str, Any] | None,
    process_defects: list[dict[str, Any]],
    alert_message: str | None,
) -> dict[str, Any] | None:
    """Call the LLM to generate context-aware root causes, actions, and escalation trigger.

    Returns a dict with keys: root_causes, immediate_actions, long_term_actions, escalation_trigger.
    Returns None if OpenAI is unavailable or the request fails.
    """
    api_key = _api_key()
    if not api_key:
        return None

    context = {
        "equipment": equipment_context,
        "latest_sensor_metrics": sensor_metrics,
        "anomaly_score": anomaly_score,
        "rul_hours": rul_hours,
        "risk_level": risk_level,
        "urgency": urgency,
        "ml_prediction": ml_prediction,
        "process_defects": process_defects,
        "evidence_from_rag": evidence_items,
        "active_alert": alert_message,
    }

    payload = {
        "model": _env_value("OPENAI_MODEL") or DEFAULT_MODEL,
        "reasoning": {"effort": "medium"},
        "instructions": (
            "You are  AI's maintenance reasoning engine for a steel manufacturing plant. "
            "Given the equipment context, live sensor readings, RAG-retrieved evidence (from manuals, SOPs, "
            "failure reports, maintenance logs, and engineer feedback), ML predictions, and process defect signals, "
            "generate a structured maintenance recommendation.\n\n"
            "RULES:\n"
            "- Base your root causes and actions on the EVIDENCE provided. Reference specific documents or patterns.\n"
            "- Be steel-industry specific. Mention actual equipment parts, failure modes, and maintenance procedures.\n"
            "- If ML predicts a specific failure mode, incorporate it into your root causes.\n"
            "- If process defects are detected, factor them into immediate actions.\n"
            "- Actions should be concrete and operational, not generic advice.\n"
            "- Escalation trigger should be a specific condition (threshold + time) that requires emergency response.\n\n"
            "Return ONLY valid JSON with this exact structure (no markdown, no code fences):\n"
            "{\n"
            '  "root_causes": ["cause 1", "cause 2", "cause 3", "cause 4"],\n'
            '  "immediate_actions": ["action 1", "action 2", "action 3", "action 4"],\n'
            '  "long_term_actions": ["action 1", "action 2", "action 3"],\n'
            '  "escalation_trigger": "One sentence describing the condition for emergency escalation."\n'
            "}"
        ),
        "input": json.dumps(context, default=str),
        "max_output_tokens": 700,
    }

    try:
        with httpx.Client(timeout=30) as client:
            response = client.post(
                OPENAI_RESPONSES_URL,
                headers=_headers(api_key),
                json=payload,
            )
            response.raise_for_status()
    except httpx.HTTPError:
        return None

    raw = _extract_response_text(response.json())
    if not raw:
        return None

    # Strip markdown code fences if the model wrapped the JSON
    cleaned = raw.strip()
    if cleaned.startswith("```"):
        lines = cleaned.split("\n")
        lines = [line for line in lines if not line.strip().startswith("```")]
        cleaned = "\n".join(lines).strip()

    try:
        parsed = json.loads(cleaned)
    except (json.JSONDecodeError, ValueError):
        return None

    # Validate shape
    if not isinstance(parsed, dict):
        return None
    root_causes = parsed.get("root_causes")
    immediate_actions = parsed.get("immediate_actions")
    long_term_actions = parsed.get("long_term_actions")
    escalation_trigger = parsed.get("escalation_trigger")

    if (
        not isinstance(root_causes, list)
        or not isinstance(immediate_actions, list)
        or not isinstance(long_term_actions, list)
        or not isinstance(escalation_trigger, str)
        or len(root_causes) < 2
        or len(immediate_actions) < 2
    ):
        return None

    return {
        "root_causes": [str(item) for item in root_causes[:6]],
        "immediate_actions": [str(item) for item in immediate_actions[:6]],
        "long_term_actions": [str(item) for item in long_term_actions[:5]],
        "escalation_trigger": str(escalation_trigger),
    }

