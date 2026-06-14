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
def _mask_key(key: str | None) -> str:
    """Safely prints the first and last few characters of an API key for debugging."""
    if not key:
        return "NONE"
    return f"{key[:6]}...{key[-4:]}" if len(key) > 10 else "INVALID_LENGTH"

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
    # Update early exit: Proceed if either OpenAI or Fallback key is present
    if not api_key and not _env_value("FALLBACK_API_KEY"):
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

    raw = None
    # Only try OpenAI if the key is valid
    if api_key:
        try:
            with httpx.Client(timeout=25) as client:
                response = client.post(
                    OPENAI_RESPONSES_URL,
                    headers=_headers(api_key),
                    json=payload,
                )
                response.raise_for_status()
                raw = _extract_response_text(response.json())
        except httpx.HTTPError:
            print("OpenAI failed in copilot reply. Transitioning to Groq...")

    # Route to Groq fallback if OpenAI failed or key was missing
    if not raw:
        raw = _call_fallback_llm(payload["instructions"], payload["input"], 520)

    return raw

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
    safety_feedback: str | None = None,
) -> dict[str, Any] | None:
    """Call the LLM to generate context-aware root causes, actions, and escalation trigger.

    Returns a dict with keys: root_causes, immediate_actions, long_term_actions, escalation_trigger.
    Returns None if OpenAI is unavailable or the request fails.
    """
    api_key = _api_key()
    
    # Allow function to proceed if either OpenAI or Groq fallback key exists
    if not api_key and not _env_value("FALLBACK_API_KEY"):
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
    
    feedback_instruction = ""
    if safety_feedback:
        feedback_instruction = (
            f"\n\nCRITICAL SAFETY FEEDBACK FROM PREVIOUS DRAFT:\n{safety_feedback}\n"
            "You MUST revise your immediate_actions to address this safety violation.\n\n"
        )
        
    payload = {
        "model": _env_value("OPENAI_MODEL") or DEFAULT_MODEL,
        "reasoning": {"effort": "medium"},
        "instructions": (
            "You are AI's maintenance reasoning engine for a steel manufacturing plant. "
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
            f"{feedback_instruction}"
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

    print("\n=== [DEBUG] LLM DIAGNOSIS PIPELINE START ===")
    
    raw = None
    if api_key:
        try:
            print("[DEBUG OpenAI] Sending request to OpenAI API...")
            with httpx.Client(timeout=30) as client:
                response = client.post(
                    OPENAI_RESPONSES_URL,
                    headers=_headers(api_key),
                    json=payload,
                )
                response.raise_for_status()
                raw = _extract_response_text(response.json())
                print(f"[DEBUG OpenAI] SUCCESS! Received {len(raw if raw else '')} characters.")
                
        except httpx.HTTPStatusError as e:
            print(f"[ERROR OpenAI] HTTP Status Error: {e.response.status_code}")
            print(f"[ERROR OpenAI] Response Body: {e.response.text}")
        except Exception as e:
            print(f"[ERROR OpenAI] General Exception: {e}")

    # Route to Groq fallback if OpenAI failed or key was missing
    if not raw:
        raw = _call_fallback_llm(payload["instructions"], payload["input"], 700)

    # If BOTH models failed, safely exit to the local templates
    if not raw:
        print("[FATAL DEBUG] Both OpenAI and Groq failed. Falling back to local templates.")
        return None

    # Strip markdown code fences if the model wrapped the JSON
    cleaned = raw.strip()
    if cleaned.startswith("```"):
        lines = cleaned.split("\n")
        lines = [line for line in lines if not line.strip().startswith("```")]
        cleaned = "\n".join(lines).strip()

    print(f"[DEBUG Pipeline] Attempting to parse JSON string: {cleaned[:100]}...")

    try:
        parsed = json.loads(cleaned)
        print("[DEBUG Pipeline] JSON successfully parsed into a dictionary.")
    except (json.JSONDecodeError, ValueError) as e:
        print(f"[ERROR Pipeline] JSON Decode Failed: {e}")
        print(f"[ERROR Pipeline] Raw string was: {cleaned}")
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
def evaluate_safety(actions: list[str], evidence: list[dict[str, str]]) -> str:
    """Safety Agent: Evaluates proposed actions against SOP evidence."""
    api_key = _api_key()
    if not api_key and not _env_value("FALLBACK_API_KEY"):
        return "APPROVED" # Fallback to true bypass if no keys exist

    payload = {
        "model": _env_value("OPENAI_MODEL") or DEFAULT_MODEL,
        "instructions": (
            "You are the Chief Safety Officer at a steel plant. "
            "Review the proposed maintenance actions against the provided SOPs/Evidence. "
            "Look for missing Lockout/Tagout (LOTO) steps, ignored temperature cooling times, or unsafe interventions. "
            "If the plan is safe, output EXACTLY the word 'APPROVED'. "
            "If it is unsafe, output 'REJECTED:' followed by a 1-sentence explanation of what safety step must be added."
        ),
        "input": json.dumps({"proposed_actions": actions, "sops_and_evidence": evidence}),
        "max_output_tokens": 150,
    }

    raw = None
    if api_key:
        try:
            with httpx.Client(timeout=15) as client:
                response = client.post(OPENAI_RESPONSES_URL, headers=_headers(api_key), json=payload)
                response.raise_for_status()
                raw = _extract_response_text(response.json())
        except Exception:
            print("OpenAI failed in Safety Agent. Transitioning to Groq...")

    # Route to Groq fallback if OpenAI fails or key doesn't exist
    if not raw:
        raw = _call_fallback_llm(payload["instructions"], payload["input"], 150)

    return raw if raw else "APPROVED"

def _call_fallback_llm(system_instruction: str, user_input: str, max_tokens: int) -> str | None:
    """Cascading Fallback: Tries Groq first. If rate-limited, instantly falls back to OpenRouter."""
    
    # Define our fallback cascade order
    providers = [
        {
            "name": "Groq",
            "key": _env_value("FALLBACK_API_KEY"),
            "url": _env_value("FALLBACK_BASE_URL"),
            "model": _env_value("FALLBACK_MODEL")
        },
        {
            "name": "OpenRouter",
            "key": _env_value("OPENROUTER_API_KEY"),
            "url": _env_value("OPENROUTER_BASE_URL") or "https://openrouter.ai/api/v1/chat/completions",
            "model": _env_value("OPENROUTER_MODEL") or "google/gemini-2.0-flash-lite-preview-02-05:free"
        }
    ]

    for provider in providers:
        if not provider["key"]:
            continue

        print(f"\n--- [DEBUG] TRIGGERING {provider['name'].upper()} FALLBACK ---")
        
        payload = {
            "model": provider["model"],
            "messages": [
                {"role": "system", "content": system_instruction},
                {"role": "user", "content": user_input}
            ],
            "max_tokens": max_tokens,
            "temperature": 0.2
        }

        try:
            print(f"[DEBUG {provider['name']}] Sending request...")
            with httpx.Client(timeout=30) as client:
                response = client.post(
                    provider["url"],
                    headers={
                        "Authorization": f"Bearer {provider['key']}",
                        "Content-Type": "application/json",
                        # OpenRouter optional headers for ranking
                        "HTTP-Referer": "http://localhost:3000", 
                        "X-Title": "SteelGuard AI"
                    },
                    json=payload,
                )
                
                # If this provider rate limits us, don't sleep. Just move to the next provider!
                if response.status_code == 429:
                    print(f"[WARNING {provider['name']}] Rate limit hit (429). Cascading to next provider...")
                    continue 

                response.raise_for_status()
                result = response.json()["choices"][0]["message"]["content"].strip()
                print(f"[DEBUG {provider['name']}] SUCCESS! Received {len(result)} characters.")
                return result

        except httpx.HTTPStatusError as e:
            print(f"[ERROR {provider['name']}] HTTP Error: {e.response.status_code}. Moving to next provider...")
            print(f"[ERROR {provider['name']}] Details: {e.response.text}")
            continue
        except Exception as e:
            print(f"[ERROR {provider['name']}] Exception: {e}. Moving to next provider...")
            continue

    print("[FATAL DEBUG] All fallback providers (Groq & OpenRouter) exhausted. Using local templates.")
    return None