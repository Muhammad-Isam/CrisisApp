import json
import random
import threading
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Graceful crew import — app always starts even if crewai/LLM fails
CREW_AVAILABLE = False
try:
    from crew import process_crisis_event, generate_crisis_scenario
    CREW_AVAILABLE = True
    print("✅ CrewAI / LLM agent loaded successfully.")
except Exception as e:
    print(f"⚠️  Agent not available (mock-only mode): {e}")

APP_VERSION = "3.1.0"

app = FastAPI(
    title="CrisisAI Agentic Backend",
    description="Agentic crisis orchestration — Karachi Emergency Response System",
    version=APP_VERSION
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

event_payloads: list = []

class TriggerRequest(BaseModel):
    crisis_type: str
    location: str

class AnalyzeRequest(BaseModel):
    crisis_id: str


# ─── Rich mock data — always shown immediately ──────────────────────────────
def get_mock_crises() -> list:
    """Full rich crisis data. Shown instantly while LLM analysis runs in bg."""
    return [
        {
            "id": "evt_fire_sector4",
            "crisis_type": "FIRE",
            "location": "Sector 4, North Karachi Industrial Zone",
            "confidence_score": 94,
            "status": "Verified",
            "ai_enhanced": False,
            "coordinates": {"latitude": 24.965, "longitude": 67.062},
            "sources_verified": [
                {"name": "NASA FIRMS Satellite", "reading": "Thermal FRP: 380 MW — active fire pixel confirmed at 24.965°N, 67.062°E", "status": "CONFIRMED"},
                {"name": "AQ Sensor AQ-7 (Sector 4)", "reading": "PM2.5: 321 µg/m³ — Hazardous (threshold: 250 µg/m³)", "status": "CONFIRMED"},
                {"name": "Waze Traffic API", "reading": "Avg speed: 6 km/h | 3 road closures on Sector 4 Blvd", "status": "CONFIRMED"},
                {"name": "Twitter/X Social Monitor", "reading": "87 distress mentions in 4 min — #KarachiFire trending locally", "status": "CONFIRMED"}
            ],
            "social_feed": [
                {"user": "@NorthKarachiNews", "time": "3 mins ago", "text": "🔥 BREAKING: Massive fire at Korangi warehouse district. Thick black smoke visible for miles. Fire brigade en route! #Karachi #Fire", "credibility": "HIGH"},
                {"user": "@Siddique_Rashid", "time": "5 mins ago", "text": "Smoke from Sector 4 is unbearable — eyes burning inside my house. Avoid Sector 4 Main Boulevard completely.", "credibility": "MEDIUM"},
                {"user": "@PakistanAlertsLive", "time": "7 mins ago", "text": "ALERT: Industrial fire North Karachi. Multiple fire engines dispatched. Residents advised to shelter in place and close all windows.", "credibility": "HIGH"}
            ],
            "agent_flow": [
                {"step": "Signal Ingestion", "details": "NASA FIRMS thermal anomaly received — FRP 380 MW at 24.965°N, 67.062°E. Hotspot radius: ~400m.", "status": "COMPLETED", "timestamp": "20:31:02"},
                {"step": "Multi-Source Cross-Check", "details": "AQ-7 sensor: PM2.5 321 µg/m³. Waze: 3 closures, 6 km/h avg. Twitter: 87 mentions in 4 min. All 4 sources aligned.", "status": "COMPLETED", "timestamp": "20:31:09"},
                {"step": "False Positive Analysis", "details": "Historical fire probability at this coordinate: 0.3%. No recurring seasonal burn pattern. Debris fire ruled out. Signal: GENUINE.", "status": "COMPLETED", "timestamp": "20:31:14"},
                {"step": "Confidence Scoring", "details": "4/4 data sources confirmed. Severity: HIGH. Proximity to residential zone: 350m. Final confidence: 94%.", "status": "COMPLETED", "timestamp": "20:31:17"},
                {"step": "Hospital Dispatch", "details": "Karachi Trauma Centre alerted. 15 burn/smoke inhalation beds prepared. First responder ETA: 8 min.", "status": "DEPLOYED", "timestamp": "20:31:20"},
                {"step": "Traffic Rerouting", "details": "Sector 4 Boulevard auto-closed. 14,200 vehicles rerouted via Sher Shah Suri Road.", "status": "DEPLOYED", "timestamp": "20:31:22"}
            ],
            "mitigation_plan": {
                "public_alert": "⚠️ ACTIVE FIRE — Sector 4, North Karachi. Hazardous smoke (PM2.5: 321). DO NOT enter the area. Shelter in place if within 2km. Close all windows immediately.",
                "safe_route": {
                    "avoid": "Sector 4 Main Boulevard, Korangi Industrial Road (full stretch), Sher Shah Road Sector 3–5",
                    "recommended_path": "M-9 Motorway northbound → Northern Bypass → Superhighway alternate"
                },
                "hospital_notification": {
                    "target": "Karachi Trauma Centre, North Nazimabad",
                    "beds_available": 42,
                    "beds_to_prepare": 15,
                    "specialization": "Burn & Smoke Inhalation ICU",
                    "message": "Prepare 15 emergency beds: burn trauma + smoke inhalation. Stock IV fluids, morphine drips. ETA 8 min.",
                    "eta_minutes": 8
                },
                "authorities_notified": [
                    {"name": "Karachi Fire Brigade (North)", "units": 4, "eta_minutes": 7, "status": "EN ROUTE"},
                    {"name": "Rescue 1122", "units": 3, "eta_minutes": 9, "status": "EN ROUTE"},
                    {"name": "KDA Traffic Police (North Zone)", "units": 6, "eta_minutes": 5, "status": "DEPLOYED"},
                    {"name": "NDMA Regional Office Karachi", "units": 1, "eta_minutes": 20, "status": "NOTIFIED"}
                ],
                "resources_allocated": [
                    {"unit": "Fire Engine", "quantity": 4},
                    {"unit": "Ambulance", "quantity": 3},
                    {"unit": "Police Cruiser", "quantity": 6},
                    {"unit": "Emergency Medical Team", "quantity": 2}
                ]
            }
        },
        {
            "id": "evt_flood_clifton",
            "crisis_type": "FLOOD",
            "location": "Block 5, Clifton — Sea View Drive",
            "confidence_score": 89,
            "status": "Verified",
            "ai_enhanced": False,
            "coordinates": {"latitude": 24.818, "longitude": 67.033},
            "sources_verified": [
                {"name": "MetDept Rainfall API", "reading": "Rainfall: 78mm/hr — Severe cloudburst, active 45 min", "status": "CONFIRMED"},
                {"name": "CCTV Vision AI (Cam #108)", "reading": "Standing water: 2.8 ft | 7 stranded vehicles | 2 pedestrians trapped", "status": "CONFIRMED"},
                {"name": "Waze Traffic API", "reading": "Avg speed: 3 km/h — Gridlock. Clifton Underpass submerged.", "status": "CONFIRMED"},
                {"name": "Tide Gauge TG-3 (Sea View)", "reading": "Sea level: +1.4m above mean — High tide surge compounding rainfall", "status": "CONFIRMED"}
            ],
            "social_feed": [
                {"user": "@CliftonDriver", "time": "4 mins ago", "text": "Khayaban-e-Iqbal COMPLETELY FLOODED. Clifton underpass UNDERWATER. Cars floating. DO NOT COME HERE. Calling Rescue 1122. #KarachiRain 🌊", "credibility": "HIGH"},
                {"user": "@KarachiWeatherAlert", "time": "9 mins ago", "text": "⚠️ SEVERE CLOUDBURST: Clifton 78mm/hr rainfall. Flash flood risk EXTREME. Avoid ALL underpasses and low-lying roads.", "credibility": "HIGH"},
                {"user": "@SafetyFirst_PK", "time": "11 mins ago", "text": "If car stalls in floodwater ABANDON IT immediately and move to higher ground. Do NOT wait inside. #FloodSafety", "credibility": "MEDIUM"}
            ],
            "agent_flow": [
                {"step": "Signal Ingestion", "details": "MetDept severe cloudburst alert. Clifton: 78mm/hr — exceeds flash flood threshold (50mm/hr) by 56%.", "status": "COMPLETED", "timestamp": "20:25:11"},
                {"step": "CCTV Visual Confirmation", "details": "Vision AI camera #108: 2.8ft standing water, 7 stranded vehicles, 2 trapped pedestrians at Sea View Drive.", "status": "COMPLETED", "timestamp": "20:25:18"},
                {"step": "Tide & Traffic Correlation", "details": "Tide gauge TG-3: +1.4m above mean. Waze: complete gridlock. Compound flood risk (rain + tide) validated.", "status": "COMPLETED", "timestamp": "20:25:24"},
                {"step": "Confidence Scoring", "details": "4/4 sources confirmed flooding. Pedestrians at risk on CCTV. Severity: CRITICAL. Confidence: 89%.", "status": "COMPLETED", "timestamp": "20:25:29"},
                {"step": "Rescue Dispatch", "details": "2 rescue boats from Clifton Marine base (ETA 6 min). South City Hospital: 10 beds on standby.", "status": "DEPLOYED", "timestamp": "20:25:33"},
                {"step": "Traffic Rerouting", "details": "Clifton Underpass & Khayaban-e-Iqbal auto-closed. 9,200 vehicles rerouted via Sunset Boulevard.", "status": "DEPLOYED", "timestamp": "20:25:35"}
            ],
            "mitigation_plan": {
                "public_alert": "🌊 FLASH FLOOD ACTIVE — Clifton Block 5. Underpass submerged. 2.8ft standing water on Sea View Drive. EVACUATE NOW. Rescue boats deployed.",
                "safe_route": {
                    "avoid": "Clifton Underpass (submerged), Khayaban-e-Iqbal (flooded), Sea View Drive, Do Talwar Roundabout",
                    "recommended_path": "Sunset Boulevard → Korangi Road → Shaheed-e-Millat Expressway (elevated)"
                },
                "hospital_notification": {
                    "target": "South City Hospital, Clifton",
                    "beds_available": 38,
                    "beds_to_prepare": 10,
                    "specialization": "Drowning & Water Trauma",
                    "message": "Prepare 10 emergency beds: near-drowning, water trauma, hypothermia. First patients ETA 15 min.",
                    "eta_minutes": 15
                },
                "authorities_notified": [
                    {"name": "Karachi Marine Rescue Unit", "units": 2, "eta_minutes": 6, "status": "EN ROUTE"},
                    {"name": "PDMA Sindh (Provincial)", "units": 1, "eta_minutes": 25, "status": "NOTIFIED"},
                    {"name": "KDA Traffic Police (South)", "units": 4, "eta_minutes": 8, "status": "DEPLOYED"},
                    {"name": "Civil Defence Clifton Zone", "units": 3, "eta_minutes": 12, "status": "EN ROUTE"}
                ],
                "resources_allocated": [
                    {"unit": "Rescue Boat", "quantity": 2},
                    {"unit": "Ambulance", "quantity": 2},
                    {"unit": "Police Cruiser", "quantity": 4},
                    {"unit": "Water Pump Unit", "quantity": 3}
                ]
            }
        },
        {
            "id": "evt_quake_saddar_false",
            "crisis_type": "EARTHQUAKE",
            "location": "Saddar Town, Downtown Karachi",
            "confidence_score": 8,
            "status": "FALSE ALARM",
            "ai_enhanced": False,
            "coordinates": {"latitude": 24.860, "longitude": 67.010},
            "sources_verified": [
                {"name": "USGS Seismic Monitor", "reading": "No seismic activity at 24.86°N, 67.01°E (±50km radius) — all clear", "status": "NOT CONFIRMED"},
                {"name": "Pakistan Met Dept Seismograph", "reading": "Background noise only. Richter < 0.5. Zero ground motion detected.", "status": "NOT CONFIRMED"},
                {"name": "12-Sensor Accelerometer Network", "reading": "All 12 sensors nominal at 0.01g. No P-wave or S-wave detected in Karachi.", "status": "NOT CONFIRMED"},
                {"name": "Source Credibility Analysis", "reading": "Origin: 1 account (12 followers, 2 weeks old). Credibility score: 2/100. Pattern: panic amplification.", "status": "DEBUNKED"}
            ],
            "social_feed": [
                {"user": "@KarachiBuzzer99", "time": "18 mins ago", "text": "EARTHQUAKE!! Strong shaking in Saddar!! Everyone run outside NOW!! Buildings shaking!! #KarachiEarthquake 😱", "credibility": "LOW — UNVERIFIED RUMOUR"},
                {"user": "@QuakeAlertsPK", "time": "16 mins ago", "text": "✅ OFFICIAL: NO earthquake detected by USGS, PMD, or 12 Karachi seismic sensors. Viral post is FALSE INFORMATION. Do NOT panic.", "credibility": "HIGH — OFFICIAL"},
                {"user": "@PMDKarachiOfficial", "time": "14 mins ago", "text": "Pakistan Met Dept: All Karachi seismographs NORMAL. No earthquake has occurred. Disregard unverified social media posts.", "credibility": "HIGH — OFFICIAL"}
            ],
            "agent_flow": [
                {"step": "Signal Ingestion", "details": "Social media rumour ingested: 1 viral post claiming earthquake in Saddar — 234 retweets in 3 minutes. Priority alert triggered.", "status": "COMPLETED", "timestamp": "20:18:44"},
                {"step": "Seismic Sensor Query", "details": "Queried USGS + PMD seismograph + 12 local accelerometers. ALL report: no seismic activity. Richter < 0.5 everywhere in Karachi.", "status": "COMPLETED", "timestamp": "20:18:51"},
                {"step": "Source Credibility Analysis", "details": "@KarachiBuzzer99: 12 followers, account 2 weeks old, zero prior credible reports. Credibility: 2/100. No corroborating accounts.", "status": "COMPLETED", "timestamp": "20:18:56"},
                {"step": "False Positive Verdict", "details": "0/3 physical sensor networks confirmed any event. Single ultra-low-credibility source. VERDICT: FALSE ALARM.", "status": "COMPLETED", "timestamp": "20:19:01"},
                {"step": "Public Correction Issued", "details": "Counter-alert pushed to 47,000 Karachi app users. PMD + official channels notified. Post flagged for platform removal.", "status": "DEPLOYED", "timestamp": "20:19:05"}
            ],
            "mitigation_plan": {
                "public_alert": "✅ FALSE ALARM CONFIRMED — The earthquake rumour about Saddar is UNVERIFIED. All 12 Karachi seismic sensors show normal readings. NO earthquake occurred. Stay calm.",
                "safe_route": None,
                "hospital_notification": None,
                "authorities_notified": [
                    {"name": "Pakistan Met Dept (PMD)", "units": 0, "eta_minutes": 0, "status": "INFORMED — NO ACTION"},
                    {"name": "Karachi Commissioner Office", "units": 0, "eta_minutes": 0, "status": "INFORMED — NO ACTION"}
                ],
                "resources_allocated": []
            }
        },
        {
            "id": "evt_heatwave_orangi",
            "crisis_type": "HEATWAVE",
            "location": "Orangi Town, Sector 9",
            "confidence_score": 82,
            "status": "Verified",
            "ai_enhanced": False,
            "coordinates": {"latitude": 24.935, "longitude": 66.995},
            "sources_verified": [
                {"name": "MetDept Weather API", "reading": "Heat Index: 49°C | Humidity: 71% | 4th consecutive day above 46°C", "status": "CONFIRMED"},
                {"name": "KESC Grid Monitor", "reading": "Orangi feeder at 107% load. Transformer stress: CRITICAL. Failure risk 2–4 hrs.", "status": "CONFIRMED"},
                {"name": "Social Distress Monitor", "reading": "Heat distress mentions: 612/min — +400% above 7-day baseline", "status": "CONFIRMED"}
            ],
            "social_feed": [
                {"user": "@OrangiResident_Ali", "time": "11 mins ago", "text": "Electricity gone 6 hours. 47°C inside house. My elderly mother has heat stroke symptoms — dizziness, not responding. Help!! #OrangiHeatwave 🆘", "credibility": "HIGH"},
                {"user": "@EdhiFoundationPK", "time": "14 mins ago", "text": "🏥 EDHI COOLING CENTRES NOW OPEN: Sector 9 Community Hall, Orangi Town. Free water, ORS & medical staff 24/7. Call 115. #HeatRelief", "credibility": "HIGH"}
            ],
            "agent_flow": [
                {"step": "Signal Ingestion", "details": "MetDept 4th consecutive day heat advisory: 49°C heat index. Orangi Town: highest vulnerability zone in Karachi.", "status": "COMPLETED", "timestamp": "20:22:15"},
                {"step": "Grid Stress Analysis", "details": "KESC: Orangi feeder at 107% capacity. Risk model: transformer failure within 2–4 hours without load reduction.", "status": "COMPLETED", "timestamp": "20:22:21"},
                {"step": "Vulnerability Mapping", "details": "Social distress 612/min (+400%). Elderly + under-5 population density in Orangi: 34% — highest mortality risk bracket.", "status": "COMPLETED", "timestamp": "20:22:27"},
                {"step": "Confidence Scoring", "details": "3/3 data streams confirmed. Sustained multi-day heat event. Human vulnerability: HIGH. Confidence: 82%.", "status": "COMPLETED", "timestamp": "20:22:31"},
                {"step": "Cooling Centre Activation", "details": "Sector 9 Community Hall activated. Edhi Foundation dispatched with 200L water + ORS stock.", "status": "DEPLOYED", "timestamp": "20:22:35"},
                {"step": "Hospital & Grid Alert", "details": "Abbasi Shaheed Hospital: 20 heat stroke beds prepared + IV fluids. KESC emergency load reduction order issued.", "status": "DEPLOYED", "timestamp": "20:22:38"}
            ],
            "mitigation_plan": {
                "public_alert": "☀️ HEAT EMERGENCY — Orangi Town. Heat index 49°C. Power grid critical. Go to Sector 9 Community Cooling Hall NOW if unwell. Free medical help available.",
                "safe_route": {
                    "avoid": "Orangi Town Market Road (open-air commercial strip) — extreme sun exposure risk",
                    "recommended_path": "Sector 9 Community Cooling Hall (AC, 24/7) | Edhi Centre Block 11"
                },
                "hospital_notification": {
                    "target": "Abbasi Shaheed Hospital, Orangi",
                    "beds_available": 67,
                    "beds_to_prepare": 20,
                    "specialization": "Heat Stroke & Dehydration",
                    "message": "Prepare 20 beds: heat stroke, severe dehydration, heat exhaustion. ORS + IV fluids + cooling blankets pre-staged.",
                    "eta_minutes": 0
                },
                "authorities_notified": [
                    {"name": "KESC / K-Electric Emergency", "units": 3, "eta_minutes": 45, "status": "EN ROUTE"},
                    {"name": "Karachi City Health Dept", "units": 2, "eta_minutes": 30, "status": "NOTIFIED"},
                    {"name": "Edhi Foundation Orangi", "units": 4, "eta_minutes": 0, "status": "DEPLOYED"},
                    {"name": "Rescue 1122", "units": 2, "eta_minutes": 18, "status": "EN ROUTE"}
                ],
                "resources_allocated": [
                    {"unit": "Ambulance", "quantity": 3},
                    {"unit": "Utility Repair Van", "quantity": 3},
                    {"unit": "Cooling Supply Truck", "quantity": 2},
                    {"unit": "Medical Response Team", "quantity": 2}
                ]
            }
        }
    ]


def _normalize_status(raw: str) -> str:
    """Normalize LLM status strings to what the frontend expects."""
    s = str(raw).upper().strip()
    if "FALSE" in s or "ALARM" in s:
        return "FALSE ALARM"
    if "VERIFIED" in s or "CONFIRMED" in s:
        return "Verified"
    if "PROBABLE" in s:
        return "Probable"
    return "Verified"


def _run_llm_analysis(crisis: dict) -> None:
    """
    Synchronous LLM analysis — runs in a background thread.
    Updates the crisis dict in-place when complete.
    """
    if not CREW_AVAILABLE:
        return
    try:
        print(f"🤖 LLM analysing: {crisis['crisis_type']} @ {crisis['location']}")
        result = process_crisis_event(crisis["crisis_type"], crisis["location"])

        if not isinstance(result, dict) or result.get("status") == "PARSE_ERROR":
            print(f"⚠️  LLM returned unparseable result for {crisis['id']}, keeping mock data.")
            return

        # Merge LLM output into the existing crisis dict (preserving coords/id/type)
        crisis["ai_enhanced"]      = True
        crisis["confidence_score"] = result.get("confidence_score", crisis["confidence_score"])
        crisis["status"]           = _normalize_status(result.get("status", crisis["status"]))
        crisis["sources_verified"] = result.get("sources_verified", crisis["sources_verified"])
        crisis["social_feed"]      = result.get("social_feed",      crisis["social_feed"])
        crisis["agent_flow"]       = result.get("agent_flow",        crisis["agent_flow"])

        mp = result.get("mitigation_plan", {})
        if isinstance(mp, dict) and mp:
            existing_mp = crisis.get("mitigation_plan", {})
            crisis["mitigation_plan"] = {
                "public_alert":          mp.get("public_alert",          existing_mp.get("public_alert")),
                "safe_route":            mp.get("safe_route",            existing_mp.get("safe_route")),
                "hospital_notification": mp.get("hospital_notification", existing_mp.get("hospital_notification")),
                "authorities_notified":  mp.get("authorities_notified",  existing_mp.get("authorities_notified", [])),
                "resources_allocated":   mp.get("resources_allocated",   existing_mp.get("resources_allocated", [])),
            }

        print(f"✅ LLM enhanced: {crisis['id']} → {crisis['status']} ({crisis['confidence_score']}%)")

    except Exception as e:
        print(f"❌ LLM analysis failed for {crisis.get('id')}: {e}")


# Boot: load rich mock data immediately so API always has something to serve
event_payloads = get_mock_crises()
print(f"✅ CrisisAI v{APP_VERSION} started — {len(event_payloads)} crises pre-loaded.")


# ─── Endpoints ─────────────────────────────────────────────────────────────

@app.get("/api/status")
def get_status():
    ai_count = sum(1 for e in event_payloads if e.get("ai_enhanced"))
    return {
        "status": "online",
        "version": APP_VERSION,
        "agent": "CrisisAI v3 — Gemini Flash (LangChain direct)" if CREW_AVAILABLE else "CrisisAI v3 — Mock Mode",
        "crew_available": CREW_AVAILABLE,
        "active_events": len(event_payloads),
        "ai_enhanced_events": ai_count,
    }


@app.get("/api/events")
def get_events():
    return {
        "events": event_payloads,
        "total": len(event_payloads),
        "ai_enhanced": sum(1 for e in event_payloads if e.get("ai_enhanced")),
    }


@app.get("/api/session/start")
@app.post("/api/session/start")
def start_session(background_tasks: BackgroundTasks):
    """
    Resets to fresh mock data instantly (< 50ms response).
    Then triggers LLM enhancement in background threads — one per crisis.
    Frontend polls /api/events and sees ai_enhanced flip to True as each finishes.
    """
    global event_payloads
    event_payloads = get_mock_crises()

    if CREW_AVAILABLE:
        for crisis in event_payloads:
            background_tasks.add_task(_run_llm_analysis, crisis)

    return {
        "message": f"Session initialized with {len(event_payloads)} crises. AI analysis running in background.",
        "active_events_count": len(event_payloads),
        "crew_available": CREW_AVAILABLE,
    }


@app.post("/api/analyze-crisis")
def analyze_crisis(request: AnalyzeRequest, background_tasks: BackgroundTasks):
    """Trigger (or re-trigger) LLM analysis for a specific crisis ID."""
    crisis = next((c for c in event_payloads if c["id"] == request.crisis_id), None)
    if not crisis:
        raise HTTPException(status_code=404, detail=f"Crisis {request.crisis_id} not found")
    crisis["ai_enhanced"] = False  # reset so frontend sees it updating
    if CREW_AVAILABLE:
        background_tasks.add_task(_run_llm_analysis, crisis)
    return {"message": f"Analysis triggered for {request.crisis_id}", "crew_available": CREW_AVAILABLE}


@app.post("/api/simulate")
def generate_new_simulation(background_tasks: BackgroundTasks):
    """Generate and analyze a brand-new LLM-created crisis scenario."""
    if not CREW_AVAILABLE:
        raise HTTPException(status_code=503, detail="LLM agent not available")
    try:
        scenario = generate_crisis_scenario()
        if not scenario or "error" in scenario:
            raise HTTPException(status_code=500, detail="Failed to generate scenario")
        base = get_mock_crises()[0].copy()  # use FIRE mock as template
        base.update({
            "id": f"evt_{scenario.get('crisis_type','unknown').lower()}_{random.randint(100,999)}",
            "crisis_type": scenario.get("crisis_type", "FIRE"),
            "location": scenario.get("location", "Karachi"),
            "coordinates": scenario.get("coordinates", {"latitude": 24.9, "longitude": 67.0}),
            "ai_enhanced": False,
        })
        event_payloads.insert(0, base)
        background_tasks.add_task(_run_llm_analysis, base)
        return {"message": "New crisis scenario created. Analysis running.", "crisis": base}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/trigger")
def trigger_agent(request: TriggerRequest, background_tasks: BackgroundTasks):
    valid = ["FIRE", "EARTHQUAKE", "FLOOD", "HEATWAVE", "HEAT_WAVE"]
    if request.crisis_type.upper() not in valid:
        raise HTTPException(status_code=400, detail=f"Invalid crisis_type. Must be one of {valid}")
    new_crisis = {
        "id": f"evt_{request.crisis_type.lower()}_{random.randint(100,999)}",
        "crisis_type": request.crisis_type.upper(),
        "location": request.location,
        "confidence_score": 0,
        "status": "Analyzing",
        "ai_enhanced": False,
        "coordinates": {"latitude": 24.86, "longitude": 67.01},
        "sources_verified": [],
        "social_feed": [],
        "agent_flow": [{"step": "Signal Ingestion", "details": f"Alert received for {request.crisis_type} at {request.location}.", "status": "COMPLETED", "timestamp": "Live"}],
        "mitigation_plan": {"public_alert": f"Monitoring {request.crisis_type} report at {request.location}. Agents verifying.", "authorities_notified": [], "resources_allocated": []}
    }
    event_payloads.insert(0, new_crisis)
    if CREW_AVAILABLE:
        background_tasks.add_task(_run_llm_analysis, new_crisis)
    return {"message": "Agent workflow initiated.", "crisis_id": new_crisis["id"]}


@app.get("/")
def root():
    return {"name": "CrisisAI Agentic Backend", "version": APP_VERSION, "docs": "/docs"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8080, reload=True)
