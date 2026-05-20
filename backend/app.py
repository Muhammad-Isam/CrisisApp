import json
import random
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from crew import process_crisis_event

app = FastAPI(
    title="CrisisAI Agentic Backend",
    description="Multi-crisis agentic orchestration API with full mitigation pipeline.",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

event_payloads = []

class TriggerRequest(BaseModel):
    crisis_type: str
    location: str

def get_initial_crises():
    return [
        # ── 1. FIRE (Verified) ──────────────────────────────────────
        {
            "id": "evt_fire_sector4",
            "crisis_type": "FIRE",
            "location": "Sector 4, North Karachi Industrial Zone",
            "confidence_score": 94,
            "status": "Verified",
            "coordinates": { "latitude": 24.965, "longitude": 67.062 },
            "sources_verified": [
                { "name": "NASA FIRMS Satellite", "reading": "Thermal FRP: 380 MW — active fire pixel confirmed", "status": "CONFIRMED" },
                { "name": "AQ Sensor AQ-7 (Sector 4)", "reading": "PM2.5: 321 µg/m³ — Hazardous (threshold: 250)", "status": "CONFIRMED" },
                { "name": "Waze Traffic API", "reading": "Avg speed: 6 km/h | 3 road closures detected", "status": "CONFIRMED" },
                { "name": "Twitter/X Monitor", "reading": "87 distress mentions in 4 min — #KarachiFire trending", "status": "CONFIRMED" }
            ],
            "social_feed": [
                { "user": "@NorthKarachiNews", "time": "3 mins ago", "text": "🔥 BREAKING: Massive fire at Korangi warehouse district. Thick black smoke visible for miles. Fire brigade en route! #Karachi #Fire", "credibility": "HIGH" },
                { "user": "@Siddique_Rashid", "time": "5 mins ago", "text": "The smoke from Sector 4 is unbearable — eyes are burning from inside my house. Please avoid Sector 4 Main Boulevard at all costs.", "credibility": "MEDIUM" },
                { "user": "@PakistanAlertsLive", "time": "7 mins ago", "text": "ALERT: Industrial fire North Karachi. Multiple fire engines dispatched. Residents advised to shelter in place and close windows.", "credibility": "HIGH" }
            ],
            "agent_flow": [
                { "step": "Signal Ingestion", "details": "NASA FIRMS thermal anomaly received — FRP 380 MW at 24.965°N, 67.062°E. Hotspot radius: ~400m.", "status": "COMPLETED", "timestamp": "20:31:02" },
                { "step": "Multi-Source Cross-Check", "details": "AQ-7 sensor confirms PM2.5 321 µg/m³. Waze: 3 closures, 6 km/h. Twitter: 87 mentions. All 4 sources aligned.", "status": "COMPLETED", "timestamp": "20:31:09" },
                { "step": "False Positive Analysis", "details": "Historical fire probability at this coordinate: 0.3%. No recurring seasonal burn pattern. Debris fire ruled out. Signal classified GENUINE.", "status": "COMPLETED", "timestamp": "20:31:14" },
                { "step": "Confidence Scoring", "details": "4/4 data sources confirmed. Severity: HIGH. Proximity to residential zone: 350m. Final confidence index: 94%.", "status": "COMPLETED", "timestamp": "20:31:17" },
                { "step": "Hospital Dispatch", "details": "Karachi Trauma Centre alerted via API. 15 burn/smoke inhalation beds prepared. First responder ETA: 8 min.", "status": "DEPLOYED", "timestamp": "20:31:20" },
                { "step": "Traffic Rerouting", "details": "Sector 4 Boulevard auto-closed in Waze/Google Maps via traffic authority API. 14,200 vehicles rerouted via Sher Shah Suri Road.", "status": "DEPLOYED", "timestamp": "20:31:22" }
            ],
            "mitigation_plan": {
                "public_alert": "⚠️ ACTIVE FIRE — Sector 4, North Karachi. Hazardous smoke (PM2.5: 321). DO NOT enter the area. Shelter in place if within 2km. Close all windows.",
                "safe_route": {
                    "avoid": "Sector 4 Main Boulevard, Korangi Industrial Road (full stretch), Sher Shah Road (between Sector 3–5)",
                    "recommended_path": "Reroute via M-9 Motorway northbound → Northern Bypass → Superhighway alternate"
                },
                "hospital_notification": {
                    "target": "Karachi Trauma Centre, North Nazimabad",
                    "beds_available": 42,
                    "beds_to_prepare": 15,
                    "specialization": "Burn & Smoke Inhalation ICU",
                    "message": "Prepare 15 emergency beds: burn trauma + smoke inhalation. Stock IV fluids, morphine drips. First responders ETA 8 min.",
                    "eta_minutes": 8
                },
                "authorities_notified": [
                    { "name": "Karachi Fire Brigade (North)", "units": 4, "eta_minutes": 7, "status": "EN ROUTE" },
                    { "name": "Rescue 1122", "units": 3, "eta_minutes": 9, "status": "EN ROUTE" },
                    { "name": "KDA Traffic Police (North Zone)", "units": 6, "eta_minutes": 5, "status": "DEPLOYED" },
                    { "name": "NDMA Regional Office Karachi", "units": 1, "eta_minutes": 20, "status": "NOTIFIED" }
                ],
                "resources_allocated": [
                    { "unit": "Fire Engine", "quantity": 4 },
                    { "unit": "Ambulance", "quantity": 3 },
                    { "unit": "Police Cruiser", "quantity": 6 },
                    { "unit": "Emergency Medical Team", "quantity": 2 }
                ]
            }
        },

        # ── 2. FLOOD (Verified) ─────────────────────────────────────
        {
            "id": "evt_flood_clifton",
            "crisis_type": "FLOOD",
            "location": "Block 5, Clifton — Sea View Drive",
            "confidence_score": 89,
            "status": "Verified",
            "coordinates": { "latitude": 24.818, "longitude": 67.033 },
            "sources_verified": [
                { "name": "MetDept Rainfall API", "reading": "Rainfall: 78mm/hr — Severe cloudburst, active since 45 min", "status": "CONFIRMED" },
                { "name": "CCTV Vision AI (Cam #108)", "reading": "Standing water: 2.8 ft | 7 stranded vehicles | 2 pedestrians trapped", "status": "CONFIRMED" },
                { "name": "Waze Traffic API", "reading": "Avg speed: 3 km/h — Gridlock. Clifton Underpass submerged.", "status": "CONFIRMED" },
                { "name": "Tide Gauge TG-3 (Sea View)", "reading": "Sea level: +1.4m above mean — High tide surge compounding rainfall", "status": "CONFIRMED" }
            ],
            "social_feed": [
                { "user": "@CliftonDriver", "time": "4 mins ago", "text": "Khayaban-e-Iqbal is COMPLETELY FLOODED. The Clifton underpass is UNDERWATER. Cars are floating. DO NOT COME HERE. Calling Rescue 1122. #KarachiRain 🌊", "credibility": "HIGH" },
                { "user": "@KarachiWeatherAlert", "time": "9 mins ago", "text": "⚠️ SEVERE CLOUDBURST WARNING: Clifton area 78mm/hr rainfall. Flash flood risk EXTREME. Avoid ALL underpasses and low-lying roads immediately.", "credibility": "HIGH" },
                { "user": "@SafetyFirst_PK", "time": "11 mins ago", "text": "If your car stalls in the floodwater, abandon it immediately and move to higher ground. Do NOT wait inside. #FloodSafety", "credibility": "MEDIUM" }
            ],
            "agent_flow": [
                { "step": "Signal Ingestion", "details": "MetDept issued severe cloudburst alert. Clifton station reading 78mm/hr — exceeds flash flood threshold (50mm/hr).", "status": "COMPLETED", "timestamp": "20:25:11" },
                { "step": "CCTV Visual Confirmation", "details": "Vision AI on camera #108 confirms 2.8ft standing water, 7 stranded vehicles, 2 trapped pedestrians at Sea View Drive.", "status": "COMPLETED", "timestamp": "20:25:18" },
                { "step": "Tide & Traffic Correlation", "details": "Tide gauge TG-3: +1.4m above mean. Waze confirms complete gridlock. Compound flood risk (rain + tide surge) validated.", "status": "COMPLETED", "timestamp": "20:25:24" },
                { "step": "Confidence Scoring", "details": "4/4 sources confirm active flooding. Pedestrians at risk confirmed. Severity: CRITICAL. Confidence: 89%.", "status": "COMPLETED", "timestamp": "20:25:29" },
                { "step": "Rescue Dispatch", "details": "2 rescue boats deployed from Clifton Marine base (ETA 6 min). South City Hospital notified — 10 beds standby.", "status": "DEPLOYED", "timestamp": "20:25:33" },
                { "step": "Traffic Rerouting", "details": "Clifton Underpass & Khayaban-e-Iqbal auto-closed. 9,200 vehicles rerouted via Sunset Boulevard — Shaheed-e-Millat Expressway.", "status": "DEPLOYED", "timestamp": "20:25:35" }
            ],
            "mitigation_plan": {
                "public_alert": "🌊 FLASH FLOOD ACTIVE — Clifton Block 5. Underpass submerged. 2.8ft standing water on Sea View Drive. EVACUATE low-lying areas NOW. Rescue boats deployed.",
                "safe_route": {
                    "avoid": "Clifton Underpass (submerged), Khayaban-e-Iqbal (flooded), Sea View Drive, Do Talwar Roundabout area",
                    "recommended_path": "Sunset Boulevard → Korangi Road → Shaheed-e-Millat Expressway (elevated)"
                },
                "hospital_notification": {
                    "target": "South City Hospital, Clifton",
                    "beds_available": 38,
                    "beds_to_prepare": 10,
                    "specialization": "Drowning & Water Trauma",
                    "message": "Prepare 10 emergency beds: near-drowning, water trauma, hypothermia. Rescue teams active — first patients ETA 15 min.",
                    "eta_minutes": 15
                },
                "authorities_notified": [
                    { "name": "Karachi Marine Rescue Unit", "units": 2, "eta_minutes": 6, "status": "EN ROUTE" },
                    { "name": "PDMA Sindh (Provincial)", "units": 1, "eta_minutes": 25, "status": "NOTIFIED" },
                    { "name": "KDA Traffic Police (South)", "units": 4, "eta_minutes": 8, "status": "DEPLOYED" },
                    { "name": "Civil Defence Clifton Zone", "units": 3, "eta_minutes": 12, "status": "EN ROUTE" }
                ],
                "resources_allocated": [
                    { "unit": "Rescue Boat", "quantity": 2 },
                    { "unit": "Ambulance", "quantity": 2 },
                    { "unit": "Police Cruiser", "quantity": 4 },
                    { "unit": "Water Pump Unit", "quantity": 3 }
                ]
            }
        },

        # ── 3. EARTHQUAKE — FALSE ALARM (Debunked) ─────────────────
        {
            "id": "evt_quake_saddar_false",
            "crisis_type": "EARTHQUAKE",
            "location": "Saddar Town, Downtown Karachi",
            "confidence_score": 8,
            "status": "FALSE ALARM",
            "coordinates": { "latitude": 24.860, "longitude": 67.010 },
            "sources_verified": [
                { "name": "USGS Seismic Monitor", "reading": "No seismic activity at 24.86°N, 67.01°E (±50km radius) — all clear", "status": "NOT CONFIRMED" },
                { "name": "Pakistan Met Dept Seismograph", "reading": "Background noise only. Richter < 0.5. Zero ground motion detected.", "status": "NOT CONFIRMED" },
                { "name": "12-Sensor Accelerometer Net", "reading": "All sensors nominal at 0.01g. No P-wave or S-wave detected.", "status": "NOT CONFIRMED" },
                { "name": "Source Credibility Analysis", "reading": "Origin: 1 account (12 followers, 2 wks old). Credibility score: 2/100. Pattern: Panic amplification.", "status": "DEBUNKED" }
            ],
            "social_feed": [
                { "user": "@KarachiBuzzer99", "time": "18 mins ago", "text": "EARTHQUAKE!! I felt strong shaking in Saddar!! Everyone run outside NOW!! Buildings shaking!! #KarachiEarthquake #Earthquake 😱", "credibility": "LOW — UNVERIFIED RUMOUR" },
                { "user": "@QuakeAlertsPK", "time": "16 mins ago", "text": "✅ OFFICIAL: We can CONFIRM — NO earthquake detected by USGS, PMD, or any seismic sensor in Karachi. Viral post is FALSE INFORMATION. Do NOT panic. #Misinformation", "credibility": "HIGH — OFFICIAL" },
                { "user": "@PMDKarachi", "time": "14 mins ago", "text": "Pakistan Meteorological Department: All seismographs across Karachi are NORMAL. No earthquake event has occurred. Please disregard unverified social media posts.", "credibility": "HIGH — OFFICIAL" }
            ],
            "agent_flow": [
                { "step": "Signal Ingestion", "details": "Social media rumour ingested: 1 viral post claiming earthquake in Saddar — 234 retweets in 3 minutes.", "status": "COMPLETED", "timestamp": "20:18:44" },
                { "step": "Seismic Sensor Network Query", "details": "Queried USGS API + PMD seismograph + 12 local accelerometers. ALL report: no seismic activity. Richter < 0.5.", "status": "COMPLETED", "timestamp": "20:18:51" },
                { "step": "Source Credibility Analysis", "details": "@KarachiBuzzer99: 12 followers, account created 2 weeks ago, no verified history. Credibility: 2/100. No corroborating accounts.", "status": "COMPLETED", "timestamp": "20:18:56" },
                { "step": "False Positive Verdict", "details": "0/3 physical sensor networks confirmed. Single low-credibility social source. VERDICT: FALSE ALARM. No dispatch warranted.", "status": "COMPLETED", "timestamp": "20:19:01" },
                { "step": "Public Correction Issued", "details": "Counter-alert pushed to 47,000 Karachi app users. PMD + official channels notified. Misinformation flagged for platform removal.", "status": "DEPLOYED", "timestamp": "20:19:05" }
            ],
            "mitigation_plan": {
                "public_alert": "✅ FALSE ALARM CONFIRMED — The earthquake rumour circulating about Saddar is UNVERIFIED. All 12 seismic sensors across Karachi show normal readings. NO earthquake occurred. Stay calm.",
                "safe_route": None,
                "hospital_notification": None,
                "authorities_notified": [
                    { "name": "Pakistan Met Dept (PMD)", "units": 0, "eta_minutes": 0, "status": "INFORMED — NO ACTION" },
                    { "name": "Karachi Commissioner Office", "units": 0, "eta_minutes": 0, "status": "INFORMED — NO ACTION" }
                ],
                "resources_allocated": []
            }
        },

        # ── 4. HEATWAVE (Verified) ──────────────────────────────────
        {
            "id": "evt_heatwave_orangi",
            "crisis_type": "HEATWAVE",
            "location": "Orangi Town, Sector 9",
            "confidence_score": 82,
            "status": "Verified",
            "coordinates": { "latitude": 24.935, "longitude": 66.995 },
            "sources_verified": [
                { "name": "MetDept Weather API", "reading": "Heat Index: 49°C | Humidity: 71% | 4th consecutive day above 46°C", "status": "CONFIRMED" },
                { "name": "KESC Grid Monitor", "reading": "Orangi feeder: 107% capacity — Transformer stress CRITICAL. Failure risk: 2–4 hrs.", "status": "CONFIRMED" },
                { "name": "Social Distress Monitor", "reading": "Heat-related distress mentions: 612/min (+400% above 7-day baseline)", "status": "CONFIRMED" }
            ],
            "social_feed": [
                { "user": "@OrangiResident_Ali", "time": "11 mins ago", "text": "Electricity gone for 6 hours straight. It is 47°C inside my house. My elderly mother has heat stroke symptoms — dizziness and not responding. Please someone help!! #OrangiHeatwave 🆘", "credibility": "HIGH" },
                { "user": "@EdhiFoundationPK", "time": "14 mins ago", "text": "🏥 EDHI COOLING CENTRES NOW OPEN: Sector 9 Community Hall, Orangi Town. Free water, ORS & medical staff available 24/7. Call 115. #HeatRelief", "credibility": "HIGH" }
            ],
            "agent_flow": [
                { "step": "Signal Ingestion", "details": "MetDept 4th consecutive day heat advisory: 49°C heat index. Orangi Town flagged as highest vulnerability zone.", "status": "COMPLETED", "timestamp": "20:22:15" },
                { "step": "Grid Stress Analysis", "details": "KESC reports Orangi feeder at 107% capacity. Risk model: transformer failure within 2–4 hours without load reduction.", "status": "COMPLETED", "timestamp": "20:22:21" },
                { "step": "Vulnerability Mapping", "details": "Social distress 612/min (+400%). Elderly and under-5 population density in Orangi: 34%. Highest mortality risk bracket.", "status": "COMPLETED", "timestamp": "20:22:27" },
                { "step": "Confidence Scoring", "details": "3/3 data streams confirmed. Sustained multi-day heat event. Human vulnerability index: HIGH. Confidence: 82%.", "status": "COMPLETED", "timestamp": "20:22:31" },
                { "step": "Cooling Centre Activation", "details": "Sector 9 Community Hall activated as emergency cooling centre. Edhi Foundation dispatched with 200L water and ORS stock.", "status": "DEPLOYED", "timestamp": "20:22:35" },
                { "step": "Hospital & Grid Alert", "details": "Abbasi Shaheed Hospital: 20 heat stroke beds prepared. KESC emergency load-shedding reduction issued for Orangi feeder.", "status": "DEPLOYED", "timestamp": "20:22:38" }
            ],
            "mitigation_plan": {
                "public_alert": "☀️ HEAT EMERGENCY — Orangi Town. Heat index 49°C. Power grid critical. Go to Sector 9 Community Hall cooling centre immediately if you feel unwell.",
                "safe_route": {
                    "avoid": "Open-air commercial strip (Orangi Town Market Road) — extreme direct sun exposure risk",
                    "recommended_path": "Sector 9 Community Cooling Hall (air-conditioned, 24/7) | Edhi Centre Block 11"
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
                    { "name": "KESC / K-Electric Emergency", "units": 3, "eta_minutes": 45, "status": "EN ROUTE" },
                    { "name": "Karachi City Health Dept", "units": 2, "eta_minutes": 30, "status": "NOTIFIED" },
                    { "name": "Edhi Foundation Orangi", "units": 4, "eta_minutes": 0, "status": "DEPLOYED" },
                    { "name": "Rescue 1122", "units": 2, "eta_minutes": 18, "status": "EN ROUTE" }
                ],
                "resources_allocated": [
                    { "unit": "Ambulance", "quantity": 3 },
                    { "unit": "Utility Repair Van", "quantity": 3 },
                    { "unit": "Cooling Supply Truck", "quantity": 2 },
                    { "unit": "Medical Response Team", "quantity": 2 }
                ]
            }
        }
    ]

# ── Boot: load crises immediately on startup ────────────────────────────────
event_payloads = get_initial_crises()

@app.get("/api/status")
def get_status():
    return {"status": "online", "agent": "CrisisAI v2.0 (Gemini Flash)", "active_events": len(event_payloads)}

@app.get("/api/events")
def get_events():
    return {"events": event_payloads}

@app.get("/api/session/start")
@app.post("/api/session/start")
def start_session(background_tasks: BackgroundTasks):
    global event_payloads
    event_payloads = get_initial_crises()
    background_tasks.add_task(run_agent_background, "EARTHQUAKE", "Saddar Town (Downtown)")
    return {
        "message": "Session initialized with 4 active crises. Live agent triggered for Saddar.",
        "active_events_count": len(event_payloads)
    }

def run_agent_background(crisis_type: str, location: str):
    try:
        result = process_crisis_event(crisis_type, location)
        try:
            cleaned = str(result).replace("```json", "").replace("```", "").strip()
            payload = json.loads(cleaned)
            # Ensure required keys exist with defaults
            payload.setdefault("social_feed", [])
            payload.setdefault("agent_flow", [])
            payload.setdefault("mitigation_plan", {})
            mp = payload["mitigation_plan"]
            mp.setdefault("resources_allocated", [])
            mp.setdefault("authorities_notified", [])
            event_payloads.insert(0, payload)
            if len(event_payloads) > 100:
                event_payloads.pop()
        except json.JSONDecodeError:
            event_payloads.insert(0, _fallback_payload(crisis_type, location, str(result)))
    except Exception as e:
        print(f"Agent execution failed: {e}")
        event_payloads.insert(0, _fallback_payload(crisis_type, location, str(e)))

def _fallback_payload(crisis_type: str, location: str, raw: str) -> dict:
    return {
        "id": f"evt_{crisis_type.lower()}_live_{random.randint(100, 999)}",
        "crisis_type": crisis_type,
        "location": location,
        "confidence_score": 55,
        "status": "Agent Processing",
        "coordinates": { "latitude": 24.86, "longitude": 67.01 },
        "sources_verified": [
            { "name": "Primary Signal", "reading": "Alert ingested — agent verification in progress", "status": "PENDING" }
        ],
        "social_feed": [
            { "user": "@KarachiSafetyNet", "time": "Just now", "text": f"Monitoring unconfirmed {crisis_type} report near {location}. Agents are cross-checking. Stay alert.", "credibility": "MEDIUM" }
        ],
        "agent_flow": [
            { "step": "Signal Ingestion", "details": f"Alert ingested for {crisis_type} at {location}. Cross-verification underway.", "status": "COMPLETED", "timestamp": "Live" },
            { "step": "Agent Verification", "details": f"CrewAI output could not be parsed. Raw: {raw[:120]}…", "status": "COMPLETED", "timestamp": "Live" },
            { "step": "Safety Protocol", "details": "Auto-fallback dispatch: Civil Hospital + 1 Ambulance unit.", "status": "DEPLOYED", "timestamp": "Live" }
        ],
        "mitigation_plan": {
            "public_alert": f"Unconfirmed {crisis_type} report near {location}. Agents are verifying. Exercise caution.",
            "safe_route": { "avoid": "Immediate area", "recommended_path": "Use alternate routes until verified" },
            "hospital_notification": {
                "target": "Civil Hospital Karachi",
                "beds_available": 120,
                "beds_to_prepare": 5,
                "specialization": "General Emergency",
                "message": "Low-priority standby. 5 beds pre-cleared pending agent verification.",
                "eta_minutes": 20
            },
            "authorities_notified": [
                { "name": "Karachi Police Control Room", "units": 1, "eta_minutes": 15, "status": "NOTIFIED" }
            ],
            "resources_allocated": [
                { "unit": "Ambulance", "quantity": 1 }
            ]
        }
    }

@app.post("/api/trigger")
def trigger_agent(request: TriggerRequest, background_tasks: BackgroundTasks):
    valid = ["FIRE", "EARTHQUAKE", "FLOOD", "HEATWAVE"]
    if request.crisis_type.upper() not in valid:
        raise HTTPException(status_code=400, detail=f"Invalid crisis_type. Must be one of {valid}")
    background_tasks.add_task(run_agent_background, request.crisis_type.upper(), request.location)
    return {
        "message": "Agent workflow initiated.",
        "crisis_type": request.crisis_type.upper(),
        "location": request.location
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8080, reload=True)
