# 🛡️ SafetyFirst — AI-Powered Urban Crisis Management System

> **Google AI Hackathon 2026 Submission**
> Real-time agentic crisis detection, verification, and mitigation for Karachi — powered by Gemini 2.5 Flash.

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Problem Statement](#problem-statement)
3. [Solution Architecture](#solution-architecture)
4. [Agentic AI Design](#agentic-ai-design)
5. [APIs & Data Sources](#apis--data-sources)
6. [Backend — FastAPI on Cloud Run](#backend--fastapi-on-cloud-run)
7. [Frontend — React Native Mobile App](#frontend--react-native-mobile-app)
8. [CI/CD Pipeline](#cicd-pipeline)
9. [Crisis Scenarios Handled](#crisis-scenarios-handled)
10. [Running Locally](#running-locally)
11. [Environment Variables](#environment-variables)

---

## Overview

**SafetyFirst** is a full-stack agentic AI system that continuously monitors a city (Karachi) for emerging crises — fires, floods, earthquakes, and heatwaves — and autonomously verifies, scores, and coordinates emergency responses in real time.

The system ingests signals from satellite feeds, IoT sensors, traffic APIs, CCTV vision AI, and social media. A **Gemini 2.5 Flash** language model then acts as the "Crisis Orchestrator Agent" — cross-checking sources, computing a confidence score, debunking false alarms, and dispatching resources to hospitals, fire brigades, traffic authorities, and the public.

A **React Native** mobile app presents the full agentic decision flow — from raw signal ingestion to final resource deployment — with a live Leaflet map, hospital bed availability, authority dispatch status, and social media credibility scoring.

---

## Problem Statement

Urban emergency response systems are slow, fragmented, and reactive:

- **Fragmented sensors**: Satellite data, weather APIs, CCTV feeds, and social media are siloed — no single system correlates them.
- **False positives are costly**: A single viral tweet can mobilise thousands of emergency resources unnecessarily.
- **False negatives are deadly**: A real crisis can go undetected if only one sensor triggers.
- **Human bottlenecks**: Dispatchers manually coordinate hospitals, traffic rerouting, and authority notifications — losing critical minutes.

**SafetyFirst** solves this by deploying an autonomous AI agent that fuses all signals, computes evidence-weighted confidence, and acts within seconds — while providing full explainability to human operators.

---

## Solution Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                        SAFETYFIRST SYSTEM                           │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                    DATA INGESTION LAYER                     │    │
│  │  NASA FIRMS │ MetDept API │ Waze │ CCTV Vision │ Social     │    │
│  │  Satellite  │ Weather/Rain│Traffic│ AI Camera  │ Velocity   │    │
│  │  Thermal    │ Heat Index  │ Speed │ Standing   │ Keyword    │    │
│  │  FRP Data   │ Precipitation│Alerts│ Water/Smoke│ Spike Det. │    │
│  └──────────────────────┬──────────────────────────────────────┘    │
│                         │                                            │
│  ┌──────────────────────▼──────────────────────────────────────┐    │
│  │                  AGENTIC AI LAYER (Gemini 2.5 Flash)        │    │
│  │                                                             │    │
│  │  1. Signal Ingestion      → Receive primary alert           │    │
│  │  2. Multi-Source Check    → Cross-validate 3-4 sources      │    │
│  │  3. False Positive Test   → Credibility scoring             │    │
│  │  4. Confidence Scoring    → 0–100% weighted score           │    │
│  │  5. Mitigation Planning   → Route, hospital, resources      │    │
│  │  6. Deployment            → Dispatch + public alert         │    │
│  │                                                             │    │
│  │  Model: gemini-2.5-flash via LangChain (ChatGoogleGenerativeAI) │
│  └──────────────────────┬──────────────────────────────────────┘    │
│                         │                                            │
│  ┌──────────────────────▼──────────────────────────────────────┐    │
│  │                  BACKEND — FastAPI                          │    │
│  │              GCP Cloud Run (europe-west1)                   │    │
│  │                                                             │    │
│  │  /api/events          GET   → Current crisis list           │    │
│  │  /api/session/start   POST  → Reset + trigger LLM (bg)     │    │
│  │  /api/analyze-crisis  POST  → Re-analyze a specific event  │    │
│  │  /api/simulate        POST  → Generate new LLM scenario    │    │
│  │  /api/trigger         POST  → Inject custom crisis         │    │
│  │  /api/status          GET   → Health + version check       │    │
│  └──────────────────────┬──────────────────────────────────────┘    │
│                         │ HTTP/REST (8s polling)                     │
│  ┌──────────────────────▼──────────────────────────────────────┐    │
│  │              REACT NATIVE MOBILE APP (Android)              │    │
│  │                                                             │    │
│  │  • Crisis Feed with full agentic flow timeline              │    │
│  │  • Leaflet OpenStreetMap via WebView                        │    │
│  │  • Hospital bed availability + progress bars                │    │
│  │  • Authority dispatch status with ETA                      │    │
│  │  • Social feed with AI credibility labels                   │    │
│  │  • Traffic rerouting commands (avoid/use routes)            │    │
│  └─────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────┘
```

### Technology Stack

| Layer | Technology |
|---|---|
| **LLM / AI Model** | Gemini 2.5 Flash (`gemini-2.5-flash`) |
| **AI Framework** | LangChain (`langchain-google-genai`) |
| **Backend** | FastAPI + Uvicorn (Python 3.10) |
| **Cloud Hosting** | GCP Cloud Run (`europe-west1`) |
| **Container Build** | GCP Cloud Build + Docker |
| **Mobile App** | React Native 0.76 (TypeScript) |
| **Map** | Leaflet.js (OpenStreetMap tiles via WebView) |
| **APK CI/CD** | GitHub Actions |

---

## Agentic AI Design

### Agent: Crisis Orchestrator

The core AI component is a **single-agent orchestrator** implemented in [`backend/crew.py`](./backend/crew.py). Rather than a multi-agent pipeline, it operates as a **ReAct-style reasoner** — it receives a crisis type and location, then autonomously:

1. **Selects verification tools** based on crisis type (e.g., `poll_nasa_firms` for fires, `query_emsc_seismic` for earthquakes)
2. **Simulates and cross-checks** tool responses across 3–4 independent data sources
3. **Applies a confidence threshold** — below 15% → `FALSE ALARM`, above 75% → `VERIFIED`
4. **Generates a complete mitigation plan** including:
   - Public alert message
   - Safe evacuation routes (avoid / recommended path)
   - Hospital notification with bed preparation instructions
   - Authority dispatch list (fire, police, marine rescue, health dept) with unit counts and ETAs
   - Resource allocation (fire engines, ambulances, rescue boats, etc.)

### Prompt Engineering

The agent prompt is **dynamically constructed** per crisis type with crisis-specific tool chains:

```
FIRE:       poll_nasa_firms → query_air_quality → query_waze_traffic → query_social_velocity
FLOOD:      query_weather_api → analyze_cctv_feed → query_waze_traffic → query_social_velocity
EARTHQUAKE: query_emsc_seismic → query_social_velocity → query_grid_load
HEAT_WAVE:  query_weather_api → query_grid_load → query_social_velocity
```

The LLM is instructed to return **strict JSON** matching the frontend schema — with `sources_verified`, `social_feed`, `agent_flow` timeline, and `mitigation_plan` fields.

### Non-Blocking Architecture

`/api/session/start` **returns in under 50ms** and immediately serves pre-loaded mock data. LLM analysis runs in **background threads** (FastAPI `BackgroundTasks`), updating each crisis dict in-place. The frontend polls `/api/events` every 8 seconds and displays `ai_enhanced: true` events as AI analysis completes.

```
Client POST /api/session/start
    → Instantly returns 4 pre-loaded crises (< 50ms)
    → 4 background threads start LLM analysis
        → Thread 1: Gemini analyses FIRE → updates event dict
        → Thread 2: Gemini analyses FLOOD → updates event dict
        → Thread 3: Gemini analyses EARTHQUAKE → updates event dict
        → Thread 4: Gemini analyses HEATWAVE → updates event dict
Client GET /api/events (polls every 8s)
    → Each poll gets progressively AI-enhanced events
```

### False Positive / False Negative Handling

The system explicitly handles both failure modes:

- **False Positives (false alarms)**: If the LLM cross-checks and finds no physical sensor confirmation (e.g., 0/3 seismic sensors detect anything for a social media earthquake rumour), it classifies the event as `FALSE ALARM`, issues a public correction, and logs the source credibility score (account age, follower count, prior report history).

- **False Negatives (missed crises)**: The multi-source approach means a crisis must be confirmed by at least 2 independent signal types before dismissal. A thermal satellite anomaly alone is insufficient — it requires corroboration from air quality sensors + traffic + social velocity.

---

## APIs & Data Sources

### 🔴 Mock / Simulated APIs (Defined in [`backend/tools.py`](./backend/tools.py))

These are **LangChain tools** that simulate external API responses with realistic randomised values. They are designed to be swapped with real API integrations.

| Tool Name | Simulates | Crisis Type | Notes |
|---|---|---|---|
| `poll_nasa_firms` | NASA FIRMS fire radiative power (FRP) | FIRE | Simulates thermal anomaly detection; real API: [firms.modaps.eosdis.nasa.gov](https://firms.modaps.eosdis.nasa.gov/api/) |
| `query_emsc_seismic` | EMSC real-time earthquake P/S wave detection | EARTHQUAKE | Simulates Richter magnitude + depth; real API: [seismicportal.eu](https://www.seismicportal.eu/) |
| `query_weather_api` | MetDept precipitation + heat index | FLOOD / HEATWAVE | Simulates rainfall mm/hr + consecutive heat days |
| `query_air_quality` | PM2.5 / PM10 particulate levels | FIRE | Simulates AQI sensor readings; real API: OpenAQ / WAQI |
| `query_waze_traffic` | Average traffic speed, hazard reports, road closures | ALL | Simulates real-time traffic congestion data |
| `analyze_cctv_feed` | AI vision classification of CCTV frames | FLOOD / FIRE | Simulates "standing water", "smoke visible", "stranded vehicles" classifications |
| `query_social_velocity` | Social media distress keyword mention spikes | ALL | Simulates tweet volume anomalies per minute |
| `query_grid_load` | Power grid capacity percentage + strain status | HEATWAVE | Simulates utility grid overload detection |
| `calculate_safe_route` | Optimal evacuation routing JSON | ALL | Simulates Waze/Google Maps routing API |
| `allocate_resources` | Emergency unit dispatch logging | ALL | Simulates CAD (Computer-Aided Dispatch) system |
| `issue_public_alert` | Broadcast warning payload | ALL | Simulates push notification / emergency broadcast |
| `notify_stakeholders` | Hospital / authority notification | ALL | Simulates API calls to hospital systems, fire dept, etc. |

### 🟢 Real APIs / Services Used

| Service | Usage | Real |
|---|---|---|
| **Gemini 2.5 Flash** (`gemini-2.5-flash`) | Crisis analysis, confidence scoring, mitigation planning | ✅ Real |
| **LangChain Google GenAI** (`langchain-google-genai`) | LLM invocation, message formatting | ✅ Real |
| **OpenStreetMap** (via Leaflet.js CDN) | Interactive city map with crisis zone overlays | ✅ Real |
| **CartoDB Dark Matter tiles** | Dark-themed map tiles for the Leaflet map | ✅ Real |
| **GCP Cloud Run** | Backend container hosting | ✅ Real |
| **GCP Cloud Build** | Docker image build + deploy on git push | ✅ Real |
| **GitHub Actions** | Android APK build and artifact upload | ✅ Real |

---

## Backend — FastAPI on Cloud Run

### File Structure

```
backend/
├── app.py          # FastAPI application, endpoints, mock data, background task orchestration
├── crew.py         # Gemini LLM agent — crisis analysis + scenario generation
├── tools.py        # LangChain tool definitions (simulated sensor/API tools)
├── requirements.txt
└── Dockerfile
```

### Key Design Decisions

**Why FastAPI?**
- Async-native with `BackgroundTasks` support — critical for non-blocking LLM calls
- Auto-generated OpenAPI docs at `/docs`
- Sub-50ms response times for the feed endpoint

**Why LangChain direct (not CrewAI)?**
The original implementation used CrewAI for multi-agent orchestration. It was replaced with **direct LangChain `ChatGoogleGenerativeAI` invocation** due to CrewAI's provider registry having compatibility issues with newer Gemini model names in containerised environments. The LLM still follows the same ReAct reasoning pattern — the prompt instructs it to reason through tool selection, simulate responses, and return structured JSON.

**Two-tier data strategy:**
- **Tier 1 (Instant)**: Rich pre-seeded mock crisis data loads at module boot — `/api/events` always returns complete data in milliseconds.
- **Tier 2 (Background)**: On session start, Gemini analyses each crisis in parallel background threads, merging AI-generated insights into the mock baseline when complete. `ai_enhanced: true` flags AI-upgraded events.

### API Endpoints

```
GET  /api/status          Health check + version + crew availability
GET  /api/events          All current crisis events (pre-loaded + AI-enhanced)
POST /api/session/start   Reset events + trigger background LLM analysis
GET  /api/session/start   Same as POST (for easy browser testing)
POST /api/analyze-crisis  Re-run LLM on a specific crisis ID
POST /api/simulate        LLM generates + analyzes a brand-new random crisis
POST /api/trigger         Inject a custom crisis type + location
GET  /api/crisis/{id}     Get detailed JSON for a single crisis
GET  /docs                Auto-generated Swagger UI
```

### Live Backend URL

```
https://crisisapp-957944136608.europe-west1.run.app
```

---

## Frontend — React Native Mobile App

### File Structure

```
App.tsx               # Full application (single-file architecture)
├── Helpers           # getCrisisColor, getCrisisEmoji, getStatusColor, getCredibilityColor
├── buildMapHtml()    # Generates Leaflet HTML injected into WebView
├── SourceRows        # Sensor verification list with CONFIRMED/DEBUNKED badges
├── SocialFeed        # Social media posts with AI credibility labels
├── HospitalAlert     # Hospital card with bed availability progress bar
├── AuthoritiesList   # Authority dispatch rows (EN ROUTE / DEPLOYED / NOTIFIED)
├── ResourcePills     # Resource allocation pill badges
├── TrafficRouting    # AVOID / USE INSTEAD route boxes
├── AgentTimeline     # Timestamped agentic flow vertical timeline
├── CrisisCard        # Full crisis card (collapsible, all sections)
├── LeafletMapView    # WebView Leaflet map + traffic rerouting list
└── App               # Root: state, polling, stats header, tab navigation
```

### Key Features

| Feature | Implementation |
|---|---|
| **Live Leaflet Map** | OpenStreetMap rendered in `react-native-webview`. Crisis zones shown as coloured circles with confidence-labelled markers. Dark CartoDB tileset. |
| **Agentic Flow Timeline** | Vertical step-by-step timeline showing each AI decision (Signal Ingestion → Cross-Check → Scoring → Deployment) with timestamps and COMPLETED/DEPLOYED badges. |
| **Hospital Bed Dashboard** | Hospital name, specialisation, total beds available, beds being prepared, visual progress bar, ETA countdown. |
| **Authority Dispatch List** | Each notified authority shown with unit count, ETA, and status badge (EN ROUTE / DEPLOYED / INFORMED / NO ACTION). |
| **Social Feed with Credibility** | Ingested social media posts shown with AI-assessed credibility (HIGH/MEDIUM/LOW) colour-coded badges. |
| **False Alarm UX** | Separate banner design for debunked events — shows which sensors contradicted the rumour, public correction issued count, source credibility score. |
| **AI Enhancement Indicator** | `ai_enhanced` flag from backend drives a subtle indicator showing which cards have been upgraded from mock to live Gemini analysis. |
| **8-second Live Polling** | `setInterval` polls `/api/events` every 8 seconds — cards update in place as LLM analysis completes in the background. |
| **CTA Dispatch Buttons** | "DISPATCH ADD. UNITS" and "LOCAL COMMAND" action buttons on each verified crisis card. |

### Status Colour System

| Status | Colour | Meaning |
|---|---|---|
| `Verified` | 🟢 `#10b981` | Confirmed by ≥2 independent sources, resources deployed |
| `FALSE ALARM` | ⚫ `#64748b` | Physical sensors contradict social signal, debunked |
| `Probable` | 🟡 `#f59e0b` | Partial confirmation, standby mode |
| `Analyzing` | 🟣 `#6366f1` | LLM actively processing in background |

---

## CI/CD Pipeline

### Android APK — GitHub Actions

**File**: [`.github/workflows/android-build.yml`](./.github/workflows/android-build.yml)

Triggered on every push to `main`. Builds a release APK using:
- Node.js 22
- Java 17 (Temurin)
- Gradle (with dependency caching)

Artifact uploaded as `CrisisApp-Release-APK` — downloadable directly from GitHub Actions.

```yaml
Build trigger: push to main
Steps: checkout → node 22 → java 17 → npm install → gradle cache → assembleRelease → upload artifact
```

### Backend — GCP Cloud Build

**File**: [`cloudbuild.yaml`](./cloudbuild.yaml)

Triggered by GCP Cloud Build on every push to `main`. Builds the Docker image from `./backend`, pushes to Google Container Registry, and deploys to Cloud Run:

```yaml
Steps:
  1. docker build -t gcr.io/$PROJECT_ID/crisisapp:$COMMIT_SHA ./backend
  2. docker push gcr.io/$PROJECT_ID/crisisapp:$COMMIT_SHA
  3. gcloud run deploy crisisapp --image gcr.io/$PROJECT_ID/crisisapp:$COMMIT_SHA
       --region europe-west1 --allow-unauthenticated
```

---

## Crisis Scenarios Handled

### 1. 🔥 Industrial Fire — Verified (Confidence: 94%)
- **Location**: Sector 4, North Karachi Industrial Zone
- **Signals**: NASA FIRMS thermal FRP 380 MW + AQ sensor PM2.5 321 µg/m³ + Waze closures + 87 social mentions
- **Response**: 4 fire engines, 3 ambulances, 6 police cruisers | 15 ICU beds at Karachi Trauma Centre | M-9 motorway rerouting

### 2. 🌊 Flash Flood — Verified (Confidence: 89%)
- **Location**: Block 5, Clifton — Sea View Drive
- **Signals**: 78mm/hr rainfall + CCTV Vision AI (2.8ft standing water, 7 stranded vehicles) + Tide gauge +1.4m + Waze 3km/h
- **Response**: 2 rescue boats, 4 water pumps | 10 beds at South City Hospital | Clifton Underpass closed

### 3. 🌍 Earthquake Rumour — FALSE ALARM (Confidence: 8%)
- **Location**: Saddar Town, Downtown Karachi
- **Signal**: 1 viral tweet (account: 12 followers, 2 weeks old, credibility 2/100)
- **Counter-evidence**: 0/3 physical sensor networks (USGS + PMD + 12 accelerometers) detected anything
- **Response**: NO resources deployed. Counter-alert pushed to 47,000 users. Post flagged for removal.

### 4. ☀️ Heatwave — Verified (Confidence: 82%)
- **Location**: Orangi Town, Sector 9
- **Signals**: 49°C heat index (4th consecutive day) + KESC grid at 107% capacity + 612 distress mentions/min
- **Response**: 20 beds at Abbasi Shaheed Hospital | Edhi Foundation cooling centres activated | KESC emergency load shedding ordered

---

## Running Locally

### Backend

```bash
cd backend
pip install -r requirements.txt

# Create .env file
echo "GEMINI_API_KEY=your_key_here" > .env

python app.py
# → Starts on http://localhost:8080
# → API docs at http://localhost:8080/docs
```

### Frontend (React Native)

```bash
npm install

# Android (requires Android SDK or use GitHub Actions for APK)
npx react-native run-android

# Update BACKEND_URL in App.tsx if running backend locally:
# const BACKEND_URL = 'http://10.0.2.2:8080';  # Android emulator localhost
```

> **Note**: The APK build requires Android SDK. If you don't have it locally, push to `main` and download the APK artifact from GitHub Actions.

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | ✅ | Google AI Gemini API key — get from [aistudio.google.com](https://aistudio.google.com) |
| `GOOGLE_API_KEY` | Fallback | Alternative to `GEMINI_API_KEY` |
| `PORT` | Auto | Cloud Run sets this automatically (default: 8080) |

---

## Project Structure

```
CrisisApp/
├── App.tsx                          # React Native app (all UI components)
├── app.json                         # App config (name: SafetyFirst)
├── package.json                     # Node dependencies
├── cloudbuild.yaml                  # GCP Cloud Build pipeline
├── .github/
│   └── workflows/
│       └── android-build.yml        # GitHub Actions APK build
├── backend/
│   ├── app.py                       # FastAPI app + endpoints + mock data
│   ├── crew.py                      # Gemini LLM crisis analysis agent
│   ├── tools.py                     # Simulated sensor/API tool definitions
│   ├── requirements.txt             # Python dependencies
│   └── Dockerfile                   # Container definition
└── android/                         # Android native project (Gradle)
```

---

## Acknowledgements

Built with:
- [Google Gemini 2.5 Flash](https://ai.google.dev/) — crisis reasoning and structured output
- [LangChain](https://langchain.com/) — LLM invocation framework
- [FastAPI](https://fastapi.tiangolo.com/) — async Python web framework
- [React Native](https://reactnative.dev/) — cross-platform mobile
- [Leaflet.js](https://leafletjs.com/) + [OpenStreetMap](https://openstreetmap.org/) — interactive maps
- [GCP Cloud Run](https://cloud.google.com/run) — serverless container hosting
