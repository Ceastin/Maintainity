# Architecture Notes

## Backend

The FastAPI backend is intentionally dependency-light at runtime. It keeps demo state in memory and exposes the required API contracts. The modules are split by behavior:

- `app/dataset_loader.py`: downloads and reads the UCI AI4I 2020 dataset.
- `app/data.py`: loads equipment config, file-based manuals/logs/spares, maps AI4I rows into steel telemetry, and advances the stream.
- `app/scoring.py`: anomaly score, RUL estimate, priority score, risk and urgency mapping.
- `app/rag.py`: OpenAI embedding retrieval across manuals, SOPs, failure reports, logs, feedback memory, and external guidance, with a local vector fallback for offline testing.
- `app/agent.py`: agentic workflow that assembles diagnosis, root causes, actions, spare strategy, assumptions, escalation trigger, and report text.
- `app/main.py`: public FastAPI routes.

## Frontend

The Next.js app is a single operations screen designed for repeated engineering use:

- Plant summary, AI4I provenance, live stream controls, and alert list for triage.
- Equipment health detail with sensor trend chart.
- Recommendation panel with cited evidence and action plan.
- Chat panel for multi-turn maintenance questions.
- Report panel for the decision summary.
- Feedback buttons to close the recommendation loop.

## Production Extensions

- Replace in-memory state with PostgreSQL tables for equipment, alerts, readings, cases, reports, and feedback.
- Persist embeddings in Qdrant for larger document collections while keeping the AI4I stream as the demo telemetry source.
- Add OpenAI structured output calls inside the agent diagnosis node.
- Add auth, role-based notifications, audit logs, and plant-network deployment hardening.
