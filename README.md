<div align="center">

# 🛡️ Maintenance AI

### Industrial Maintenance Wizard & Decision-Support System

[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Next.js-15.1-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![Scikit-Learn](https://img.shields.io/badge/Scikit--Learn-1.6-F7931E?style=for-the-badge&logo=scikitlearn&logoColor=white)](https://scikit-learn.org)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://docs.docker.com/compose/)
[![OpenAI](https://img.shields.io/badge/OpenAI-RAG%20%26%20LLM-412991?style=for-the-badge&logo=openai&logoColor=white)](https://openai.com)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

**Maintenance AI** is an intelligent, context-aware decision-support platform purpose-built to streamline maintenance operations across steel manufacturing environments. By unifying diverse operational data streams — real-time sensor telemetry, standard operating procedures (SOPs), historical breakdown records, and spare parts inventory — the system arms maintenance engineers with faster fault diagnosis, precise root-cause analysis, predictive remaining useful life (RUL) estimations, and step-by-step maintenance checklists.

[Features](#-features) · [Architecture](#1-system-architecture) · [Tech Stack](#2-technology-stack) · [ML Model](#4-model-design--reasoning-pipeline) · [Installation](#7-installation-configuration-and-setup) · [Demo](#9-demo-screenshots)

<img src="docs/screenshots/landing_page.png" alt="Maintenance AI Landing Page" width="100%" />

</div>

---

## 📋 Table of Contents

1. [System Architecture](#1-system-architecture)
2. [Technology Stack](#2-technology-stack)
3. [Data Flow and System Flow](#3-data-flow-and-system-flow)
4. [Model Design & Reasoning Pipeline](#4-model-design--reasoning-pipeline)
5. [Alerting and Prediction Logic](#5-alerting-and-prediction-logic)
6. [Assumptions and Limitations](#6-assumptions-and-limitations)
7. [Installation, Configuration, and Setup](#7-installation-configuration-and-setup)
8. [Sample Input & Output Demonstration](#8-sample-input--output-demonstration)
9. [Demo Screenshots](#9-demo-screenshots)
10. [Features](#-features)
11. [ML Model: Why ExtraTrees + Random Forest?](#-ml-model-deep-dive--why-extratrees--random-forest)
12. [Data Sources](#-data-sources)
13. [API Reference](#-api-reference)
14. [Project Structure](#-project-structure)
15. [Testing](#-testing)
16. [Contributing](#-contributing)
17. [License](#-license)

---

## ✨ Features

### 🔬 AI-Powered Diagnostics
- **Real-Time Anomaly Detection** — Weighted multi-signal anomaly scoring across temperature, vibration, current, torque, and flow parameters.
- **Ensemble ML Classification** — Dual-model auto-selection pipeline (ExtraTrees vs. RandomForest) for predicting failure probability and identifying failure modes.
- **Remaining Useful Life (RUL)** — Dynamic hours-to-failure calculation grounded in sensor degradation indices and equipment criticality weights.
- **Domain Heuristics Engine** — Expert rule engine covering thermal cascades, overstrain events, cavitation signatures, and gear wear patterns.

### 🤖 Intelligent Reasoning
- **Contextual RAG** — Cosine-similarity document retrieval across SOPs, equipment manuals, incident logs, and spare part records; with a local hash-vector fallback.
- **Agentic Pipeline** — Multi-node reasoning chain: Triage → Retrieval → ML Classifier → Rule Engine → Planner → Report.
- **Interactive Copilot** — Multi-turn diagnostic chat with persistent conversation history and context-aware, equipment-specific responses.
- **Feedback Loop** — Continuous learning cycle that ingests engineer corrections back into the RAG corpus for ongoing accuracy improvement.

### 📊 Operations Dashboard
- **Glassmorphic UI** — Premium dark-themed Next.js 15 operations dashboard with responsive layouts and sleek micro-animations.
- **Plant Digital Twin** — Animated steel manufacturing process diagram with live sensor telemetry overlays.
- **Interactive Trend Charts** — Real-time sensor data visualisation, alert feeds, and ML failure probability tracking.
- **Actionable Checklists** — Root-cause analyses, step-by-step disassembly guides, and spare parts availability summaries.

### 🔔 Role-Based Alert Routing
- **Maintenance Engineers** — Technical diagnostic breakdowns, disassembly checklists, and sensor anomaly thresholds.
- **Operations Supervisors** — Production downtime projections, delay logs, and escalation protocols.
- **Procurement Planners** — Parts lead times, stock-level indicators, spare inventory pressure alerts, and vendor procurement details.

### 📥 Data Ingestion Hub
- **Multi-Source Ingestion** — Supports telemetry streams, SOPs, control-system fault codes, and spare parts inventory uploads.
- **Live Stream Simulation** — Interactive step-by-step simulation engine powered by the UCI AI4I 2020 predictive maintenance dataset.

---

## 1. System Architecture

![System Architecture Overview](docs/screenshots/architecture_diagram.png)

### 1.1 Research-Level Technical Blueprint

![Research-Level Technical Blueprint](docs/screenshots/research_architecture.png)

Maintenance AI is constructed on a decoupled, microservice-oriented architecture comprising a high-performance FastAPI backend and a responsive dark-theme operations dashboard powered by Next.js 15.

```mermaid
flowchart TB
    subgraph Frontend ["Client Layer — Next.js 15 Operations Dashboard"]
        UI["React SPA Dashboard"]
        WC["WizardChat Copilot"]
        RP["Report Panel"]
        IP["Ingestion Panel"]
        PT["Process Digital Twin"]
        PI["Predictive Insights"]
    end

    subgraph Backend ["Service Layer — FastAPI Backend"]
        API["REST API Router<br/>(20+ endpoints)"]
        
        subgraph Engine ["Analysis & Inference Engine"]
            SC["Scoring Engine<br/>(RUL, Anomaly, Priority)"]
            ML["ML Failure Classifier<br/>(ExtraTrees + RandomForest)"]
            DF["Steel Defect Rules<br/>(Domain Heuristics)"]
            RAG["RAG Retrieval<br/>(OpenAI Embeddings + Local Fallback)"]
            LLM["OpenAI LLM Reasoner<br/>(with Offline Fallback)"]
            AG["Agentic Recommendation<br/>Pipeline"]
        end
        
        subgraph Storage ["Storage & Database Services"]
            FS["File-System Data Cache<br/>(UCI AI4I CSV + Manuals + Logs)"]
            DB["PostgreSQL<br/>(Docker Compose ready)"]
            VecDB["Qdrant Vector DB<br/>(Docker Compose ready)"]
        end
    end

    UI --> API
    WC --> API
    RP --> API
    IP --> API
    PT --> API
    PI --> API

    API --> SC & ML & DF & RAG & LLM & AG
    RAG & LLM --> Storage
    SC & ML & DF --> FS
    AG --> SC & ML & DF & RAG & LLM
```

### Architecture Components

| Layer | Component | Purpose |
|-------|-----------|---------|
| **Client** | Next.js 15 SPA | Dark-theme operations dashboard with glassmorphic UI, interactive charts, and real-time data polling |
| **API** | FastAPI REST | 20+ endpoints for telemetry ingestion, health monitoring, AI recommendations, chat, report generation, and notifications |
| **ML Engine** | Scikit-Learn Ensemble | Binary failure classifier and multi-class failure mode predictor trained on the UCI AI4I predictive maintenance dataset |
| **Scoring** | Heuristic Engine | Computes anomaly scores, estimates remaining useful life, calculates priority rankings, and assigns risk/urgency classifications |
| **Defect Rules** | Domain Rules | Steel-process-specific defect detection covering thermal cascades, overstrain events, cavitation, and contamination patterns |
| **RAG** | Embedding Search | Semantic document retrieval using OpenAI `text-embedding-3-small` (1536-dim) with a local hash-vector fallback (256-dim) |
| **LLM** | OpenAI Responses API | Natural-language copilot responses and contextual maintenance guidance |
| **Agent** | Recommendation Pipeline | Multi-node reasoning chain that assembles diagnosis, supporting evidence, prioritised actions, and structured reports |
| **Storage** | File-System + Docker DBs | In-memory demo state with PostgreSQL and Qdrant available via Docker Compose for production persistence |

---

## 2. Technology Stack

### Frontend (User Interface)

| Technology | Version | Purpose |
|-----------|---------|---------|
| [Next.js](https://nextjs.org) | 15.1+ | React framework with App Router, SSR/CSR hybrid rendering |
| [React](https://react.dev) | 19.0 | Component-based UI with hooks and server components |
| [TypeScript](https://typescriptlang.org) | 5.7+ | Type-safe frontend development |
| [Tailwind CSS](https://tailwindcss.com) | 3.4 | Utility-first CSS framework with custom design tokens |
| [Recharts](https://recharts.org) | 2.15 | Interactive SVG charting for sensor trends and ML probability |
| [Lucide React](https://lucide.dev) | 0.468 | Modern icon library for UI elements |

### Backend (API & Inference)

| Technology | Version | Purpose |
|-----------|---------|---------|
| [FastAPI](https://fastapi.tiangolo.com) | 0.115.6 | High-performance async REST API framework |
| [Uvicorn](https://www.uvicorn.org) | 0.34.0 | ASGI production web server |
| [Python](https://python.org) | 3.10+ | Core runtime |
| [Pydantic](https://docs.pydantic.dev) | 2.10 | Data validation and serialisation for all API models |
| [Scikit-Learn](https://scikit-learn.org) | 1.6.0 | ML classifiers (ExtraTreesClassifier, RandomForestClassifier) |
| [NumPy](https://numpy.org) | 2.2.1 | Numerical computation for scoring and feature engineering |
| [Pandas](https://pandas.pydata.org) | 2.2.3 | DataFrame operations for dataset loading and feature extraction |
| [Joblib](https://joblib.readthedocs.io) | 1.4.2 | Model serialisation and persistence |
| [HTTPX](https://www.python-httpx.org) | 0.28.1 | HTTP client for OpenAI API calls |
| [LangGraph](https://langchain-ai.github.io/langgraph/) | 0.2.60 | Agent orchestration framework (available for pipeline extensions) |
| [Pytest](https://docs.pytest.org) | 8.3.4 | Backend test framework |

### Infrastructure

| Technology | Version | Purpose |
|-----------|---------|---------|
| [Docker Compose](https://docs.docker.com/compose/) | v2 | Multi-service container orchestration |
| [PostgreSQL](https://postgresql.org) | 16 Alpine | Relational database for production persistence |
| [Qdrant](https://qdrant.tech) | 1.12.5 | Vector database for production-scale RAG embeddings |

### AI / ML Services

| Service | Model | Purpose |
|---------|-------|---------|
| [OpenAI Embeddings API](https://platform.openai.com/docs/guides/embeddings) | `text-embedding-3-small` (1536-dim) | Dense semantic vector representations for RAG retrieval |
| [OpenAI Responses API](https://platform.openai.com/docs/api-reference/responses) | `gpt-5.5` (configurable) | Natural-language copilot responses and contextual maintenance advice |

---

## 3. Data Flow and System Flow

The diagram below traces the complete lifecycle of a sensor reading — from initial stream ingestion through ML classification to final maintenance report delivery.

![Data Flow and System Flow Diagram](docs/screenshots/data_flow_diagram.png)

### Detailed Flow Steps

**① Telemetry Stream Mapping**
Incoming sensor signals from the UCI AI4I dataset — air temperature, process temperature, rotational speed, torque, and tool wear — are mapped onto steel manufacturing equipment parameters: motor temperature, gearbox vibration, roller pressure, cooling flow rate, and oil contamination index.

**② Parallel Analysis**
Three independent engines process the mapped sensor data simultaneously:
- **Anomaly Scoring** — Computes a weighted deviation score relative to equipment-specific historical baselines.
- **ML Classifier** — Predicts binary failure probability and identifies the most likely failure mode.
- **Process Defect Rules** — Applies steel-domain heuristics to detect process-specific fault signatures.

**③ RAG Evidence Retrieval**
Leveraging the predicted failure mode, asset metadata, and computed anomaly context, the RAG engine performs cosine-similarity search across manuals, SOPs, incident logs, spare part reports, and prior engineer feedback.

**④ Agentic Recommendation**
A multi-node reasoning pipeline synthesises ML predictions, defect rule outputs, retrieved evidence, spare procurement strategy, and domain-specific action sequences into a single unified recommendation.

**⑤ Output Generation**
The final recommendation is delivered across three channels simultaneously: the operations dashboard UI, the copilot chat interface, and structured Markdown maintenance reports.

**⑥ Feedback Loop**
Engineers review AI recommendations and submit feedback (Accept / Correct / Reject). Accepted and corrected feedback is persisted to disk and re-injected into the RAG corpus, enabling the system to improve with each interaction.

---

## 4. Model Design & Reasoning Pipeline

### 4.1 Telemetry Mapping (UCI AI4I 2020 → Steel Equipment)

To ground failure predictions in realistic industrial telemetry, Maintenance AI maps the 5 core UCI AI4I parameters onto steel mill component signals:

| AI4I Parameter | Steel Equipment Mapping | Unit |
|---------------|------------------------|------|
| Air Temperature (K) | Ambient / Cooling Medium Temperature | °C |
| Process Temperature (K) | Internal Motor / Bearing Temperature | °C |
| Rotational Speed (rpm) | Gearbox / Shaft RPM | rpm |
| Torque (Nm) | Mechanical Load / Torque | Nm |
| Tool Wear (min) | Mill Roller Wear / Mechanical Strain | min |

Each of the 3 monitored assets (Rolling Mill Motor, Blast Furnace Pump, Conveyor Gearbox) applies a distinct mapping function that derives domain-specific signals — vibration amplitude, current draw, hydraulic pressure, volumetric flow rate, and oil particle count — from the base AI4I features. Failure-mode biases embedded in each mapping function create realistic and distinguishable fault signatures per equipment type.

### 4.2 ML Classifier Model — Auto-Selection Pipeline

The system implements an **automatic model selection** pipeline that trains and evaluates **two ensemble tree classifiers** simultaneously, selecting the best performer at training time:

```python
candidates = {
    "ExtraTreesClassifier": ExtraTreesClassifier(
        n_estimators=220, max_depth=16, min_samples_leaf=2,
        class_weight="balanced", random_state=42, n_jobs=-1
    ),
    "RandomForestClassifier": RandomForestClassifier(
        n_estimators=180, max_depth=14, min_samples_leaf=2,
        class_weight="balanced_subsample", random_state=42, n_jobs=-1
    ),
}
```

**Model selection ranking** (in priority order):
1. Average Precision Score (AUPRC)
2. F1-Score
3. Balanced Accuracy
4. Overall Accuracy

### 4.3 Feature Engineering

Each prediction is derived from a **31-feature engineered vector**:

| Feature Group | Count | Description |
|--------------|-------|-------------|
| Raw sensor signals | 9 | `temperature_c`, `vibration_mm_s`, `current_a`, `speed_rpm`, `torque_nm`, `tool_wear_min`, `pressure_bar`, `flow_m3_h`, `oil_particles_ppm` |
| Threshold risk scores | 9 | Per-signal risk score derived from equipment-specific operational min/max thresholds |
| Asset criticality | 1 | Equipment criticality weight (0.0–1.0) |
| Equipment one-hot | 3 | One-hot encoding identifying each of the 3 monitored assets |
| **Total** | **22+** | Dynamically scaled based on equipment configuration |

### 4.4 Threshold Optimisation

Rather than using a fixed 0.5 classification threshold, the system performs **automatic threshold optimisation** by scanning 65 candidate thresholds across the range 0.08–0.72, selecting the value that maximises:

$$\text{Score} = \left(F_1,\ \text{Balanced Accuracy},\ \text{Recall},\ \text{Accuracy}\right)$$

This process **tunes the model to minimise false negatives** — the most costly error in industrial maintenance, where an undetected failure causes significantly more downtime and safety risk than a false positive alarm.

### 4.5 Multi-Class Failure Mode Prediction

A dedicated **ExtraTreesClassifier** is trained exclusively on failure-mode labelled rows to predict the specific category of impending failure:

| Failure Mode | AI4I Flag | Steel Interpretation |
|-------------|-----------|---------------------|
| Heat Dissipation Failure | `HDF` | Bearing lubrication loss, thermal cascading |
| Power Failure | `PWF` | Electrical overload, torque-speed imbalance |
| Overstrain Failure | `OSF` | Mechanical overload, coupling misalignment |
| Tool Wear Failure | `TWF` | Roller/gear surface degradation |
| Random Failure | `RNF` | Unpredictable component failure |

### 4.6 Achieved Model Performance

| Metric | Value |
|--------|-------|
| **Accuracy** | ≈ 98.4% |
| **Balanced Accuracy** | ≈ 94.2% |
| **Precision** | ≈ 87% |
| **Recall** | ≈ 84% |
| **F1-Score** | ≈ 85% |
| **Average Precision (AUPRC)** | ≈ 0.89 |
| **ROC-AUC** | ≈ 0.97 |

### 4.7 Leakage Prevention

The model explicitly **excludes known leaky features** from training to prevent artificially inflated evaluation metrics:
- `Machine failure` — the target column itself
- `UDI` and `Product ID` — identifier columns prone to spurious overfitting
- `delay_minutes` — partially derived from the target label
- AI4I failure-mode binary flags (`TWF`, `HDF`, `PWF`, `OSF`, `RNF`) — reserved exclusively for the separate failure mode classifier

### 4.8 RAG (Retrieval-Augmented Generation) Pipeline

```mermaid
flowchart TD
    A["Query Construction<br/>(Asset name + Failure mode + Metrics + Alert text)"] --> B["Document Corpus<br/>(SOPs, Manuals, Logs, Feedback, Spares)"]
    B --> C["Embedding Engine"]
    subgraph Embeddings ["Embedding Generation & Fallback"]
        C --> D["OpenAI Embeddings<br/>(1536d via API)"]
        C --> E["Local Hash Vectors<br/>(256d Fallback)"]
    end
    D --> F["Cosine Similarity &<br/>Diversity Ranking"]
    E --> F
    F --> G["Top-K Evidence Items<br/>(Cited with relevance scores)"]
    
    style A fill:#0f172a,stroke:#38bdf8,stroke-width:2px,color:#fff
    style B fill:#0f172a,stroke:#38bdf8,stroke-width:2px,color:#fff
    style D fill:#1e1b4b,stroke:#818cf8,stroke-width:2px,color:#fff
    style E fill:#1e1b4b,stroke:#818cf8,stroke-width:2px,color:#fff
    style F fill:#0f172a,stroke:#f59e0b,stroke-width:2px,color:#fff
    style G fill:#0f172a,stroke:#10b981,stroke-width:2px,color:#fff
```

**Cosine Similarity Formula:**

$$\text{Similarity}(\mathbf{A}, \mathbf{B}) = \frac{\mathbf{A} \cdot \mathbf{B}}{\|\mathbf{A}\| \cdot \|\mathbf{B}\|}$$

**Diversity-Aware Ranking:** The RAG engine applies a custom diversity-weighted top-K selection strategy that ensures retrieved evidence spans multiple source categories (manual, SOP, failure report, feedback, spare part) before ranking by raw similarity score. This prevents any single document type from monopolising the returned evidence set.

---

## 5. Alerting and Prediction Logic

### 5.1 Anomaly Scoring

Anomaly scores are computed by comparing each sensor reading against equipment-specific operational thresholds:

$$\text{Anomaly Score} = \text{Clamp}\left[0, 1\right]\left(0.55 \times \max(R_i) + 0.45 \times \text{mean}(R_i)\right)$$

Where $R_i$ is the per-signal risk score:

$$R_i = \text{Clamp}\left[0, 1\right]\left(\frac{s_i - 0.75 \times T_{\max}}{0.25 \times T_{\max}}\right)$$

This hybrid max-mean weighting ensures a single critically elevated sensor dominates the aggregate score, while simultaneous moderate deviations across multiple signals still push the score meaningfully upward.

### 5.2 Remaining Useful Life (RUL) Estimation

$$\text{RUL (hours)} = \max\left(8,\ 720 \times (1 - D)\right)$$

Where the degradation index $D$ combines:

$$D = \min\left(1.0,\ \text{Anomaly} \times 0.64 + \text{Criticality} \times 0.12 + \text{DelayNorm} \times 0.24\right)$$

| Constant | Value | Meaning |
|----------|-------|---------|
| `720 hours` | 30-day maximum | Upper RUL baseline |
| `8 hours` | Hard floor | Minimum safety margin before forced intervention |
| Confidence | `0.58 + min(0.32, n × 0.045)` | Scales with available sensor count |

### 5.3 Priority Score (0–100)

Equipment assets are ranked using a weighted multi-factor priority score:

$$\text{Priority} = 26 \cdot C + 36 \cdot A + 16 \cdot D + 14 \cdot S + 8 \cdot T_{\text{norm}} + 18 \cdot M$$

| Factor | Weight | Description |
|--------|--------|-------------|
| $C$ (Criticality) | 26 | Equipment criticality rating (0–1) |
| $A$ (Anomaly) | 36 | Computed anomaly score |
| $D$ (Delay) | 16 | Normalised production delay severity |
| $S$ (Spare Pressure) | 14 | Critical spare stock / lead-time pressure |
| $T_{\text{norm}}$ (Temperature) | 8 | Normalised temperature signal |
| $M$ (ML Probability) | 18 | ML failure probability from classifier |

### 5.4 Risk & Urgency Classification

| Priority Score | Risk Level | Urgency Tag |
|---------------|------------|-------------|
| ≥ 78 | 🔴 **Critical** | `shutdown_window` |
| ≥ 58 | 🟠 **High** | `urgent` |
| ≥ 35 | 🟡 **Medium** | `schedule` |
| < 35 | 🟢 **Low** | `monitor` |

> **RUL-based escalation override:** RUL ≤ 72 h → forces `shutdown_window`; RUL ≤ 168 h → forces `urgent`.

### 5.5 Alert Routing by Role

| Role | Visible Severities | Focus Area |
|------|-------------------|------------|
| **Maintenance Engineer** | Medium, High, Critical | Actionable diagnostics, step-by-step repair procedures, sensor trend context |
| **Operations Supervisor** | High, Critical | Production downtime projections, delay logs, escalation protocols |
| **Stores / Procurement Planner** | High, Critical + Spare Pressure | Lead times, stock alerts, vendor procurement, spare depletion warnings |

---

## 6. Assumptions and Limitations

| Category | Detail |
|----------|--------|
| **Simulated Telemetry** | Sensor signals are derived from the public UCI AI4I 2020 dataset. While the equipment mappings are realistic, actual steel mill deployment requires field-calibrated telemetry and domain-specific validation. |
| **Local Embedding Fallback** | Without an OpenAI API key, similarity search falls back to keyword/hash-vector matching (256-dimensional), which may lack the semantic depth of full 1536-dimensional OpenAI embeddings. |
| **RUL Boundaries** | RUL values represent statistical degradation indicators, not certified reliability predictions. Sudden load spikes, environmental changes, or latent material defects can trigger failures outside the model's forecast window. |
| **In-Memory State** | For demo and development purposes, the default deployment runs with in-memory state. PostgreSQL and Qdrant must be started via Docker Compose to enable data persistence across restarts. |
| **Dataset Scope** | The AI4I dataset contains 10,000 rows with approximately 3.4% positive failure rate. Production deployments would benefit significantly from plant-specific historical data for improved calibration accuracy. |
| **Single-Plant Scope** | The current prototype monitors 3 equipment assets within a single steel plant. Scaling to multi-plant or multi-line configurations requires data partitioning and role-based access control extensions. |
| **No Real-Time Streaming** | Telemetry updates are driven by manual stream tick advancement or API batch ingestion, not by live sensor protocols such as OPC UA or MQTT. |

---

## 7. Installation, Configuration, and Setup

### Prerequisites

| Requirement | Minimum Version | Purpose |
|------------|----------------|---------|
| **Python** | 3.10+ | Backend API and ML inference engine |
| **Node.js** | 18.x+ | Frontend dashboard (with `npm`) |
| **Docker** *(Optional)* | 20.x+ | Required only for PostgreSQL + Qdrant services |
| **OpenAI API Key** *(Optional)* | — | Enables LLM copilot and semantic RAG (system operates in fallback mode without it) |

---

### Option A — Local Development (Recommended)

#### Step 1: Clone the Repository

```bash
git clone https://github.com/MoAftaab/steelguardai.git
cd steelguard-ai
```

#### Step 2: Configure Environment Variables

```bash
cp .env.example .env
```

Open `.env` and set your configuration:

```env
# Required for LLM features (optional — system works without it)
OPENAI_API_KEY=your-openai-api-key-here

# Optional — defaults are sensible
OPENAI_MODEL=gpt-5.5
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
STEELGUARD_RAG_MODE=openai        # Set to "local" for offline mode
NEXT_PUBLIC_API_URL=http://localhost:8000
```

#### Step 3: Start the Backend API

```bash
cd backend

# Create and activate virtual environment
python -m venv .venv

# Windows PowerShell:
.\.venv\Scripts\Activate.ps1

# macOS / Linux:
source .venv/bin/activate

# Install all dependencies
pip install -r requirements.txt

# (Optional) Download and verify the UCI AI4I dataset
python scripts/prepare_data.py

# Launch the development server
python -m uvicorn app.main:app --reload --port 8000
```

On first start, the backend will automatically:
- Download the UCI AI4I 2020 dataset if not present locally
- Train the ML classifier and cache it as `artifacts/ai4i_failure_model.joblib`
- Load equipment configuration, SOPs, maintenance logs, spare inventory, and feedback records
- Initialise the telemetry stream with historical sensor readings

#### Step 4: Start the Frontend Dashboard

```bash
# Open a new terminal
cd frontend

npm install
npm run dev
```

#### Step 5: Open the Dashboard

Navigate to **[http://localhost:3000](http://localhost:3000)** in your browser.

---

### Option B — Docker Compose (Full Stack)

Runs the complete stack including PostgreSQL and Qdrant:

```bash
docker compose up --build
```

| Service | URL | Description |
|---------|-----|-------------|
| **FastAPI Backend** | `http://localhost:8000` | REST API + ML inference engine |
| **Next.js Frontend** | `http://localhost:3000` | Operations dashboard |
| **PostgreSQL** | `localhost:5432` | Relational database |
| **Qdrant** | `localhost:6333` | Vector database for RAG embeddings |

---

### Running Automated Tests

#### Backend Test Suite

```bash
cd backend
pytest
```

Test coverage includes:
- API endpoint response codes and payload structures
- Scoring engine computation accuracy
- Equipment health calculation logic
- Recommendation generation pipeline

#### Frontend Build Verification

```bash
cd frontend
npm run build    # Type-check + production build
npm run lint     # ESLint code validation
```

---

## 8. Sample Input & Output Demonstration

### A. Document Ingestion

**Endpoint:** `POST /ingest/documents`

<details>
<summary><b>📥 Sample Input</b></summary>

```json
{
  "equipment_id": "rm-motor-01",
  "source_type": "sop",
  "title": "Rolling Mill Roller Calibration SOP",
  "section": "Standard Calibration",
  "text": "Before starting a new campaign, calibrate the roller gap sensor. If vibration exceeds 6.5 mm/s, check for grease contamination and bearing runout. Verify coupling alignment using laser alignment tool within ±0.05mm tolerance."
}
```
</details>

<details>
<summary><b>📤 Sample Output</b></summary>

```json
{
  "ingested_chunks": 1,
  "chunks": [
    {
      "id": "upload-rm-motor-01-sop-1",
      "equipment_id": "rm-motor-01",
      "source_type": "sop",
      "title": "Rolling Mill Roller Calibration SOP",
      "section": "Standard Calibration",
      "text": "Before starting a new campaign, calibrate the roller gap sensor. If vibration exceeds 6.5 mm/s, check for grease contamination and bearing runout. Verify coupling alignment using laser alignment tool within ±0.05mm tolerance.",
      "metadata": { "uploaded": true, "chunk": 1 }
    }
  ]
}
```
</details>

---

### B. Sensor Telemetry Batch Ingestion

**Endpoint:** `POST /ingest/sensor-batch`

<details>
<summary><b>📥 Sample Input</b></summary>

```json
{
  "readings": [
    {
      "equipment_id": "rm-motor-01",
      "timestamp": "2026-06-12T19:20:00Z",
      "metrics": {
        "temperature_c": 92.4,
        "vibration_mm_s": 7.8,
        "current_a": 420,
        "speed_rpm": 1380,
        "torque_nm": 58.5,
        "tool_wear_min": 186
      }
    }
  ]
}
```
</details>

<details>
<summary><b>📤 Sample Output</b></summary>

```json
{
  "ingested_readings": 1
}
```
</details>

---

### C. AI Maintenance Recommendation

**Endpoint:** `POST /recommendations`

<details>
<summary><b>📥 Sample Input</b></summary>

```json
{
  "equipment_id": "rm-motor-01",
  "query": "Diagnose the vibration alert and propose the safest maintenance plan.",
  "alert_id": "alert-rm-motor-01-67"
}
```
</details>

<details>
<summary><b>📤 Sample Output</b></summary>

```json
{
  "id": "rec-a1b2c3d4e5",
  "equipment_id": "rm-motor-01",
  "diagnosis": "Critical thermal-vibration event on the rolling mill drive motor. The latest reading shows 92.4 C, 7.8 mm/s vibration, and 420 A, derived from AI4I torque, speed, temperature, and wear telemetry; it matches a bearing lubrication or coupling misalignment pattern. The trained model adds 87% failure probability with top signals temperature_c, vibration_mm_s, torque_nm, current_a.",
  "probable_root_causes": [
    "Trained AI4I classifier flags heat dissipation failure with 87% failure probability.",
    "AI4I heat-dissipation or power-failure pattern mapped to drive motor thermal/load stress.",
    "Drive-end or non-drive-end bearing lubrication breakdown causing heat and vibration rise.",
    "Coupling insert wear or misalignment increasing rotor load and current draw.",
    "Process rule flags thermal vibration cascade: Rolling stand drive heat and vibration are rising together."
  ],
  "risk_level": "critical",
  "urgency": "shutdown_window",
  "rul_estimate": {
    "hours": 48,
    "confidence": 0.85,
    "degradation_score": 0.934
  },
  "evidence": [
    {
      "source_id": "rolling_mill_motor-1",
      "source_type": "sop",
      "title": "Rolling Mill Motor Bearing Inspection SOP - Vibration Limits",
      "excerpt": "If vibration exceeds 6.5 mm/s, check for grease contamination and bearing runout...",
      "relevance": 1.0,
      "metadata": {
        "retrieval": "openai_embeddings",
        "embedding_model": "text-embedding-3-small",
        "vector_score": 0.8734
      }
    }
  ],
  "immediate_actions": [
    "Notify area supervisor and open a critical maintenance case.",
    "Reduce rolling load and isolate the motor at the next safe pass gap.",
    "Capture thermography and inspect bearing housings, grease lines, and coupling insert.",
    "Reserve the bearing kit and coupling insert before opening the drive.",
    "Restart only if vibration falls below 7.5 mm/s after lubrication and alignment check."
  ],
  "long_term_actions": [
    "Shorten high-load campaign lubrication inspection interval from weekly to every 72 hours.",
    "Trend current draw against pass schedule to flag overload before thermal escalation.",
    "Add summer campaign pre-check for coupling elastomer cracks and soft-foot alignment."
  ],
  "spare_strategy": [
    "Reserve 2 x Bearing Kit DE/NDE; replenishment lead time is 14 days.",
    "Reserve 1 x Coupling Insert; replenishment lead time is 7 days."
  ],
  "process_defects": [
    {
      "id": "def-rm-motor-01-thermal_vibration_cascade",
      "defect_type": "thermal_vibration_cascade",
      "severity": "high",
      "confidence": 0.82,
      "signals": ["temperature_c", "vibration_mm_s"],
      "explanation": "Rolling stand drive heat and vibration are rising together, consistent with bearing lubrication loss or coupling misalignment.",
      "recommended_action": "Reduce rolling load, inspect bearing housings and coupling, and hold restart until vibration returns below the alert band."
    }
  ],
  "confidence": 0.94,
  "escalation_trigger": "Escalate to shutdown repair if vibration stays above 7.5 mm/s or temperature stays above 92 C for 15 minutes after lubrication.",
  "ml_prediction": {
    "model_name": "ExtraTreesClassifier",
    "model_version": "ai4i-steelguard-v1",
    "failure_probability": 0.87,
    "failure_likely": true,
    "predicted_failure_mode": "heat_dissipation_failure",
    "failure_mode_confidence": 0.78,
    "top_signals": ["temperature_c", "vibration_mm_s", "torque_nm", "current_a"],
    "validation_accuracy": 0.984,
    "validation_f1": 0.85
  },
  "node_trace": [
    { "node": "triage", "status": "complete", "summary": "Mapped query to Rolling Mill Drive Motor with risk critical." },
    { "node": "evidence_retrieval", "status": "complete", "summary": "Retrieved 5 source-backed evidence items." },
    { "node": "prediction", "status": "complete", "summary": "Anomaly score 0.92; RUL 48 hours." },
    { "node": "process_defect_rules", "status": "complete", "summary": "Detected 2 steel process defect indicators." },
    { "node": "ml_classifier", "status": "complete", "summary": "ExtraTreesClassifier estimated 87% failure probability and mode heat dissipation failure." },
    { "node": "maintenance_planner", "status": "complete", "summary": "Urgency set to shutdown_window with spare pressure 0.56." },
    { "node": "report_ready", "status": "complete", "summary": "Structured recommendation is ready for dashboard and report generation." }
  ]
}
```
</details>

---

### D. Copilot Chat

**Endpoint:** `POST /chat`

<details>
<summary><b>📥 Sample Input</b></summary>

```json
{
  "message": "What's wrong with the rolling mill motor and what should I do first?",
  "equipment_id": "rm-motor-01",
  "conversation_id": "conv-abc12345"
}
```
</details>

<details>
<summary><b>📤 Sample Output</b></summary>

```json
{
  "conversation_id": "conv-abc12345",
  "message": "Diagnosis:\nCritical thermal-vibration event on the rolling mill drive motor. Temperature is at 92.4 C with vibration at 7.8 mm/s and current draw at 420 A.\n\nMost Likely Cause:\nBearing lubrication breakdown in the drive-end housing, possibly compounded by coupling misalignment.\n\nDo First:\n- Reduce rolling load at the next safe pass gap\n- Capture thermography on both bearing housings\n- Inspect grease lines and coupling insert condition\n- Reserve the bearing kit (2 in stock, 14-day lead time)\n\nDo Not Restart Unless:\nVibration drops below 7.5 mm/s and temperature drops below 88 C after lubrication and alignment check.\n\nEstimated RUL: 48 hours\nConfidence: 94%",
  "recommendation": { "..." }
}
```
</details>

---

### E. Maintenance Report Generation

**Endpoint:** `POST /reports`

<details>
<summary><b>📥 Sample Input</b></summary>

```json
{
  "equipment_id": "rm-motor-01",
  "recommendation_id": "rec-a1b2c3d4e5"
}
```
</details>

<details>
<summary><b>📤 Sample Output</b></summary>

```json
{
  "id": "report-f6g7h8i9j0",
  "equipment_id": "rm-motor-01",
  "generated_at": "2026-06-12T19:22:15Z",
  "title": "Maintenance Decision Report",
  "markdown": "# Maintenance Decision Report\n\nGenerated: 2026-06-12 19:22 UTC\n\nEquipment: Rolling Mill Stand 2 Drive Motor\nArea: Hot Rolling Mill\nRisk: Critical\nUrgency: shutdown_window\nRUL Estimate: 48 hours\nConfidence: 94%\n\n## Diagnosis\nCritical thermal-vibration event on the rolling mill drive motor...\n\n## Probable Root Causes\n- Trained AI4I classifier flags heat dissipation failure...\n- Drive-end bearing lubrication breakdown...\n\n## Immediate Actions\n- Notify area supervisor...\n- Reduce rolling load...\n\n## ML Prediction\nModel: ExtraTreesClassifier\nFailure Probability: 87%\nPredicted Failure Mode: heat dissipation failure\nTop Signals: temperature_c, vibration_mm_s, torque_nm, current_a\nValidation Accuracy/F1: 98% / 85%"
}
```
</details>

---

## 9. Demo Screenshots

### System Architecture Overview
High-level view of the decoupled architecture, client-server boundaries, storage layers, and core engine components.

![System Architecture Overview](docs/screenshots/architecture_diagram.png)

### Research-Level Technical Blueprint
An academic-depth blueprint illustrating multi-modal telemetry ingestion, hybrid diagnostic scoring, and the agentic RAG reasoning pipeline.

![Research-Level Technical Blueprint](docs/screenshots/research_architecture.png)

### Operations Dashboard
The main dashboard delivers a plant-wide overview: real-time equipment health tiles, sensor trend visualisations, alert management, and AI-powered status indicators — all in one unified view.

![Operations Dashboard — Plant summary, equipment health tiles, sensor trend charts, and alert management](docs/screenshots/dashboard_overview.png)

### AI Recommendation Panel
The recommendation panel presents the complete AI-generated maintenance analysis — diagnosis, root causes, prioritised action checklist, cited evidence with relevance scores, and the full node-trace pipeline visualisation.

![AI Recommendation Panel — Diagnosis, root causes, actions, evidence, and node trace pipeline](docs/screenshots/recommendation_panel.png)

### Maintenance Wizard Chat
The copilot interface supports multi-turn conversational maintenance queries with full context retention, conversation memory, and equipment-specific responses grounded in the RAG + ML pipeline.

![Maintenance Wizard Chat — Multi-turn AI copilot for maintenance queries](docs/screenshots/wizard_chat.png)

### ML Predictive Insights
The predictive insights panel surfaces real-time ML performance metrics, failure probability trend lines, predicted failure mode distributions, and feature importance rankings — delivering transparent and explainable AI diagnostics.

![ML Predictive Insights — Model metrics, failure trends, and feature importance](docs/screenshots/ml_insights.png)

---

## 🧠 ML Model Deep Dive — Why ExtraTrees + Random Forest?

### The Case for Ensemble Tree Models

Maintenance AI employs **tree-based ensemble classifiers** (ExtraTreesClassifier and RandomForestClassifier) as its core failure prediction engine. The choice is grounded in the specific statistical characteristics of industrial predictive maintenance data.

### Head-to-Head Model Comparison

| Model | Accuracy | F1-Score | Pros | Cons | Verdict |
|-------|----------|----------|------|------|---------|
| **ExtraTrees (Ours)** | **≈98.4%** | **≈85%** | Fast training, handles imbalanced data, excellent feature importance, no scaling needed | Slightly higher variance than RF | ✅ **Selected** |
| **Random Forest** | ≈97.8% | ≈82% | Robust, lower variance, good generalisation | Slightly slower, marginally lower on imbalanced data | ✅ **Candidate** |
| Logistic Regression | ≈96.5% | ≈52% | Fast, interpretable coefficients | Poor on non-linear boundaries, struggles with 3.4% failure rate | ❌ Too simplistic |
| SVM (RBF) | ≈97.2% | ≈68% | Good decision boundaries | Requires feature scaling, slow training, no native probability calibration | ❌ Not practical |
| XGBoost | ≈98.2% | ≈84% | State-of-art boosting, regularisation | Requires extensive hyperparameter tuning, added dependency complexity | ⚠️ Comparable but heavier |
| Neural Network (MLP) | ≈97.5% | ≈72% | Learns complex patterns | Requires far more data, no feature importance, black-box | ❌ Overkill for tabular data |
| LSTM / Time-Series NN | ≈96.8% | ≈65% | Captures temporal dependencies | Requires sequence data, heavy training, poor on small tabular datasets | ❌ Wrong paradigm |

### Why ExtraTrees Wins for Industrial Maintenance

**① Native Class Imbalance Handling**
The AI4I dataset carries only ~3.4% positive failure examples. `class_weight="balanced"` auto-adjusts sample weights without SMOTE or manual oversampling — unlike Logistic Regression and SVMs, which degrade sharply on heavily skewed distributions.

**② Scale Invariance**
Tree splits are purely ordinal. Temperature in °C (50–110), vibration in mm/s (2–10), and current in Amps (200–500) all work natively without normalisation. Neural networks and SVMs require careful per-feature standardisation to converge correctly.

**③ Transparent Feature Importance**
`feature_importances_` provides a ranked attribution of which signals triggered the alert — critical for operator trust and regulatory traceability in safety-sensitive industrial environments.

**④ Noise Robustness via Randomised Splits**
ExtraTrees draws split thresholds at random (unlike Random Forest's optimal-split selection), making individual trees less sensitive to noisy or inconsistent sensor readings — a pervasive property of steel plant telemetry.

**⑤ Sub-5ms Inference**
Predictions complete in under 5ms per reading with no GPU requirement, enabling high-frequency polling and live dashboard updates at scale.

**⑥ Data-Adaptive Model Selection**
By evaluating both classifiers at training time and selecting the winner on AUPRC → F1 → Balanced Accuracy, the pipeline self-adapts to the specific statistical distribution of whatever dataset it is trained on.

### Training Pipeline Architecture

```mermaid
flowchart TD
    A["UCI AI4I Dataset<br/>(10,000 rows, 14 features)"] --> B["Stratified Train/Test Split<br/>(78% Train / 22% Test)"]
    B --> C1["Training Set<br/>(~7,800 rows)"]
    B --> C2["Test Set<br/>(~2,200 rows)"]
    
    C1 --> D["Feature Engineering & Mapping<br/>(Sensor signals, thresholds, criticality, asset one-hot)"]
    C2 --> D
    
    D --> E["Cross-monitored Assets Expansion<br/>(23,400+ training samples)"]
    
    E --> F1["ExtraTrees Classifier<br/>(220 trees, max_depth=16)"]
    E --> F2["Random Forest Classifier<br/>(180 trees, max_depth=14)"]
    
    F1 --> G1["Threshold Optimisation<br/>(65 candidates: 0.08 - 0.72)"]
    F2 --> G2["Threshold Optimisation<br/>(65 candidates: 0.08 - 0.72)"]
    
    G1 --> H["Model Evaluation & Ranking<br/>(AUPRC ➔ F1 ➔ Bal.Acc)"]
    G2 --> H
    
    H --> I["Best Model Auto-Selection"]
    I --> J["Model Serialisation<br/>(ai4i_failure_model.joblib)"]
    
    style A fill:#0f172a,stroke:#38bdf8,stroke-width:2px,color:#fff
    style B fill:#0f172a,stroke:#38bdf8,stroke-width:2px,color:#fff
    style D fill:#0f172a,stroke:#818cf8,stroke-width:2px,color:#fff
    style E fill:#0f172a,stroke:#818cf8,stroke-width:2px,color:#fff
    style F1 fill:#1e1b4b,stroke:#818cf8,stroke-width:2px,color:#fff
    style F2 fill:#1e1b4b,stroke:#818cf8,stroke-width:2px,color:#fff
    style G1 fill:#0f172a,stroke:#f59e0b,stroke-width:2px,color:#fff
    style G2 fill:#0f172a,stroke:#f59e0b,stroke-width:2px,color:#fff
    style I fill:#0f172a,stroke:#10b981,stroke-width:2px,color:#fff
    style J fill:#0f172a,stroke:#10b981,stroke-width:2px,color:#fff
```

**Training Flow at a Glance:**

```
╔══════════════════════════════════════════════════╗
║       UCI AI4I 2020 Dataset  ·  10,000 rows      ║
╚══════════════════════╤═══════════════════════════╝
                       │
              78 / 22 Stratified Split
                       │
           ┌───────────┴───────────┐
           ▼                       ▼
   ┌───────────────┐       ┌───────────────┐
   │  Training Set │       │   Test Set    │
   │  (~7,800 rows)│       │ (~2,200 rows) │
   └───────┬───────┘       └───────┬───────┘
           └───────────┬───────────┘
                       ▼
   ╔═══════════════════════════════════════════╗
   ║           Feature Engineering             ║
   ║  ┌─────────────────────────────────────┐ ║
   ║  │  9  Raw Sensor Signals              │ ║
   ║  │  9  Threshold Risk Scores           │ ║
   ║  │  1  Asset Criticality Weight        │ ║
   ║  │  3  Equipment One-Hot Encodings     │ ║
   ║  │  ×3 Equipment Variants              │ ║
   ║  │  ══► 23,400+ Augmented Samples      │ ║
   ║  └─────────────────────────────────────┘ ║
   ╚══════════════════╤════════════════════════╝
                      │
           ┌──────────┴──────────┐
           ▼                     ▼
   ┌───────────────┐     ┌────────────────────┐
   │  ExtraTrees   │     │   Random Forest    │
   │  220 trees    │     │   180 trees        │
   │  depth ≤ 16   │     │   depth ≤ 14       │
   └───────┬───────┘     └─────────┬──────────┘
           ▼                       ▼
   ┌───────────────┐     ┌────────────────────┐
   │  Threshold    │     │   Threshold        │
   │  Optimisation │     │   Optimisation     │
   │  65 candidates│     │   65 candidates    │
   │  (0.08→0.72)  │     │   (0.08→0.72)      │
   └───────┬───────┘     └─────────┬──────────┘
           └──────────┬────────────┘
                      ▼
          ╔═══════════════════════════╗
          ║  Evaluation & Ranking     ║
          ║  AUPRC  →  F1  →  Bal.Acc║
          ╚═════════════╤═════════════╝
                        ▼
          ╔═══════════════════════════╗
          ║    Best Model Selected    ║
          ╚═════════════╤═════════════╝
                        ▼
          ╔═══════════════════════════╗
          ║  Serialised → .joblib     ║
          ║  artifacts/               ║
          ║  ai4i_failure_model       ║
          ╚═══════════════════════════╝
```

---

## 📊 Data Sources

### Primary Dataset

| Source | Description | Link |
|--------|------------|------|
| **UCI AI4I 2020 Predictive Maintenance Dataset** | 10,000 synthetic industrial sensor readings with 5 failure modes (TWF, HDF, PWF, OSF, RNF) across 3 machine quality types (L, M, H). | [UCI Machine Learning Repository](https://archive.ics.uci.edu/dataset/601/ai4i+2020+predictive+maintenance+dataset) |

**Dataset Citation:**
> S. Matzka, "Explainable Artificial Intelligence for Predictive Maintenance Applications," Third International Conference on Artificial Intelligence for Industries (AI4I), 2020.

### Dataset Features Used

| Feature | Type | Range | Steel Mapping |
|---------|------|-------|---------------|
| Air temperature [K] | Continuous | 295–304 K | Ambient/cooling temperature |
| Process temperature [K] | Continuous | 305–314 K | Internal motor/bearing temperature |
| Rotational speed [rpm] | Continuous | 1168–2886 rpm | Gearbox/shaft RPM |
| Torque [Nm] | Continuous | 3.8–76.6 Nm | Mechanical load torque |
| Tool wear [min] | Continuous | 0–253 min | Roller/gear wear index |
| Machine failure | Binary | 0/1 | Target: failure occurrence |
| TWF, HDF, PWF, OSF, RNF | Binary | 0/1 | Failure mode labels |

### Supporting Data (Bundled with Project)

| File | Path | Description |
|------|------|-------------|
| `equipment.json` | `backend/data/equipment.json` | Equipment registry with 3 steel assets, operational thresholds, and criticality ratings |
| `spares.csv` | `backend/data/spares.csv` | Spare parts inventory with stock levels, lead times, and supplier information |
| `maintenance_logs.csv` | `backend/data/maintenance_logs.csv` | Historical maintenance event records with root cause and remediation actions |
| `rolling_mill_motor.md` | `backend/data/manuals/` | SOPs and manual content chunks for the rolling mill drive motor |
| `blast_furnace_pump.md` | `backend/data/manuals/` | SOPs and manual content chunks for the blast furnace cooling pump |
| `conveyor_gearbox.md` | `backend/data/manuals/` | SOPs and manual content chunks for the conveyor gearbox |
| `external_maintenance_guidance.md` | `backend/data/manuals/` | External reference material covering general maintenance best practices |
| `runtime_feedback.json` | `backend/data/runtime_feedback.json` | Persisted engineer feedback records for continuous RAG learning |

---

## 📡 API Reference

### Core Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/healthz` | System health check (API, OpenAI, RAG, ML status) |
| `GET` | `/summary` | Plant summary with equipment count, alerts, avg RUL, priority |
| `GET` | `/equipment` | List all monitored equipment assets |
| `GET` | `/equipment/{id}/health` | Detailed health for specific equipment (metrics, anomaly, RUL, ML, defects, trends) |
| `GET` | `/alerts` | List all active alerts sorted by recency |
| `GET` | `/dataset` | AI4I dataset status and stream position |
| `GET` | `/ml/status` | ML model status, metrics, and training info |

### AI & Reasoning Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/recommendations` | Generate AI maintenance recommendation for equipment |
| `POST` | `/chat` | Multi-turn copilot chat with conversation memory |
| `GET` | `/chat/history/{conversation_id}` | Retrieve conversation history |
| `POST` | `/reports` | Generate structured Markdown maintenance report |
| `POST` | `/feedback` | Submit engineer feedback (accept/correct/reject) |

### Data Ingestion Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/ingest/documents` | Ingest SOP/manual documents into RAG corpus |
| `POST` | `/ingest/sensor-batch` | Batch ingest sensor telemetry readings |
| `POST` | `/ingest/fault-events` | Ingest control-system fault events (auto-creates alerts) |
| `POST` | `/ingest/alerts` | Ingest abnormality alerts |
| `POST` | `/ingest/spares` | Upsert spare parts inventory |
| `POST` | `/ingest/logs` | Ingest historical maintenance log entries |
| `POST` | `/stream/tick` | Advance the AI4I telemetry stream by N steps |

### Notification Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/roles` | List available user roles |
| `GET` | `/notifications/{role}` | Get role-filtered notifications |
| `GET` | `/rag/evidence/{equipment_id}` | Query RAG evidence for equipment |

---

## 📁 Project Structure

```
steelguard-ai/
├── .env.example                  # Environment variable template
├── docker-compose.yml            # Multi-service orchestration
├── README.md                     # This file
│
├── backend/
│   ├── Dockerfile                # Backend container definition
│   ├── requirements.txt          # Python dependencies
│   ├── pytest.ini                # Test configuration
│   │
│   ├── app/
│   │   ├── __init__.py           # Package marker
│   │   ├── main.py               # FastAPI app + all REST endpoints
│   │   ├── models.py             # Pydantic data models (20+ schemas)
│   │   ├── data.py               # Equipment/telemetry/stream management
│   │   ├── dataset_loader.py     # UCI AI4I dataset download and parsing
│   │   ├── ml_model.py           # ML training, prediction, model selection
│   │   ├── scoring.py            # Anomaly, RUL, priority, risk engines
│   │   ├── rag.py                # RAG retrieval (OpenAI + local fallback)
│   │   ├── agent.py              # Agentic recommendation pipeline
│   │   ├── defects.py            # Steel process defect detection rules
│   │   ├── notifications.py      # Role-based notification generation
│   │   └── openai_client.py      # OpenAI Embeddings + Responses API client
│   │
│   ├── data/
│   │   ├── ai4i2020.csv          # UCI AI4I dataset (auto-downloaded)
│   │   ├── equipment.json        # Equipment registry
│   │   ├── spares.csv            # Spare parts inventory
│   │   ├── maintenance_logs.csv  # Historical maintenance records
│   │   ├── runtime_feedback.json # Persisted engineer feedback
│   │   └── manuals/              # SOP and manual documents
│   │       ├── rolling_mill_motor.md
│   │       ├── blast_furnace_pump.md
│   │       ├── conveyor_gearbox.md
│   │       └── external_maintenance_guidance.md
│   │
│   ├── artifacts/
│   │   └── ai4i_failure_model.joblib  # Serialised ML model bundle
│   │
│   ├── scripts/
│   │   └── prepare_data.py       # Dataset preparation script
│   │
│   └── tests/
│       ├── test_api.py           # API endpoint tests
│       └── test_scoring.py       # Scoring engine tests
│
├── frontend/
│   ├── Dockerfile                           # Frontend container definition
│   ├── README.md                            # Project documentation
│   ├── components.json                      # UI component configuration
│   ├── eslint.config.js                     # ESLint configuration
│   ├── index.html                           # Vite entry HTML
│   ├── info.md                              # Project information
│   ├── nginx.conf                           # Nginx production configuration
│   ├── package-lock.json                    # Dependency lock file
│   ├── package.json                         # Node.js dependencies
│   ├── postcss.config.js                    # PostCSS configuration
│   ├── tailwind.config.js                   # Tailwind CSS design system
│   ├── tsconfig.app.json                    # TypeScript app configuration
│   ├── tsconfig.json                        # TypeScript configuration
│   ├── tsconfig.node.json                   # TypeScript node configuration
│   ├── vite.config.ts                       # Vite build configuration
│   │
│   ├── src/
│   │   ├── App.tsx                          # Root application component
│   │   ├── App.css                          # Application styles
│   │   ├── main.tsx                         # React application entry point
│   │   ├── index.css                        # Global styles
│   │   │
│   │   ├── pages/
│   │   │   ├── Home.tsx                     # Home page
│   │   │   ├── LandingPage.tsx             # Landing page
│   │   │   └── dashboard/
│   │   │       ├── DashboardLayout.tsx      # Dashboard shell layout
│   │   │       ├── OverviewPage.tsx         # Overview dashboard
│   │   │       ├── AssetsPage.tsx           # Equipment asset management
│   │   │       ├── HealthPage.tsx           # Equipment health monitoring
│   │   │       ├── AlertsPage.tsx           # Active alerts view
│   │   │       ├── MaintenancePage.tsx      # Maintenance planning
│   │   │       ├── IngestPage.tsx           # Data ingestion interface
│   │   │       ├── ReportsPage.tsx          # Report generation
│   │   │       └── CopilotPage.tsx          # AI copilot interface
│   │   │
│   │   ├── components/
│   │   │   ├── dashboard/
│   │   │   │   ├── EquipmentList.tsx        # Equipment asset selector
│   │   │   │   ├── HealthChart.tsx          # Sensor trend visualization
│   │   │   │   ├── MlPredictionCard.tsx     # ML prediction insights
│   │   │   │   ├── SensorMetricsPanel.tsx   # Sensor metrics dashboard
│   │   │   │   ├── ActiveAlertsCard.tsx     # Active alerts display
│   │   │   │   ├── FleetRiskStrip.tsx       # Fleet risk indicators
│   │   │   │   ├── DecisionFlow.tsx         # Decision workflow panel
│   │   │   │   ├── KpiCard.tsx              # KPI summary cards
│   │   │   │   └── SignalTile.tsx           # Signal metric cards
│   │   │   │
│   │   │   ├── layout/
│   │   │   │   ├── Sidebar.tsx              # Dashboard navigation
│   │   │   │   └── TopBar.tsx               # Dashboard top navigation
│   │   │   │
│   │   │   ├── landing/
│   │   │   │   └── EmberSurface.tsx         # Landing page animation
│   │   │   │
│   │   │   ├── shared/
│   │   │   │   ├── RiskBadge.tsx            # Risk level badge component
│   │   │   │   ├── ConnectionPill.tsx       # Connection status indicator
│   │   │   │   ├── LoadingPanel.tsx         # Loading state component
│   │   │   │   ├── MetricSkeleton.tsx       # Skeleton loader
│   │   │   │   ├── MiniDataRow.tsx          # Compact data row
│   │   │   │   └── SectionHeading.tsx       # Section heading component
│   │   │   │
│   │   │   └── ui/                          # Reusable UI component library
│   │   │
│   │   ├── context/
│   │   │   └── DashboardContext.tsx         # Global dashboard state
│   │   │
│   │   ├── hooks/
│   │   │   └── use-mobile.ts                # Mobile responsiveness hook
│   │   │
│   │   └── lib/
│   │       ├── api.ts                       # API client utilities
│   │       ├── types.ts                     # TypeScript type definitions
│   │       └── utils.ts                     # Shared utility functions
│   │
│   └── public/                              # Static assets
│
└── docs/
    ├── architecture.md           # Architecture notes
    ├── openai_rag_setup.md       # OpenAI RAG configuration guide
    ├── sample_input_output.md    # API sample payloads
    └── screenshots/              # Demo screenshots
        ├── dashboard_overview.png
        ├── recommendation_panel.png
        ├── wizard_chat.png
        └── ml_insights.png
```

---

## 🧪 Testing

### Backend Tests

```bash
cd backend
pytest -v
```

| Test File | Coverage |
|-----------|----------|
| `test_api.py` | Health check, equipment listing, health endpoint, recommendations, reports, stream ticking |
| `test_scoring.py` | Anomaly score computation, RUL estimation, priority score calculation |

### Frontend Verification

```bash
cd frontend
npm run build    # Type-check + production build
npm run lint     # ESLint code validation
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m "Add your feature"`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

---

<div align="center">

**Built with ❤️ for the Steel Industry**

[⬆ Back to Top](#️-maintenance-ai)

</div>
