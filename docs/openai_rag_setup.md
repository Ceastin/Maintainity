# OpenAI RAG Setup

SteelGuard AI uses OpenAI in two places:

- The maintenance copilot response is generated with the OpenAI Responses API.
- RAG retrieval uses OpenAI embeddings to rank manuals, SOPs, failure notes, maintenance logs, engineer feedback, and external guidance chunks by vector similarity.

## Environment

Copy the project example file into the main env file:

```powershell
Copy-Item .env.example .env -Force
```

Required:

```env
OPENAI_API_KEY=...
```

Optional:

```env
OPENAI_MODEL=gpt-5.5
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
STEELGUARD_RAG_MODE=openai
```

Set `STEELGUARD_RAG_MODE=local` only for offline testing. In normal use, leave it unset or set it to `openai` so RAG uses OpenAI embeddings.

## What The Backend Reports

`GET /healthz` returns:

- `openai`: whether an API key is available.
- `rag.provider`: the last vector provider used by retrieval.
- `rag.embedding_model`: the active embedding model when OpenAI vectors are enabled.

Each evidence item also includes metadata such as `retrieval`, `embedding_model`, `vector_score`, and `source_url` when available.

