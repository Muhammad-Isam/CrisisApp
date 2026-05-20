import json
import asyncio
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Graceful crew import
CREW_AVAILABLE = False
try:
    from crew import process_crisis_event, generate_crisis_scenario
    CREW_AVAILABLE = True
    print("✅ CrewAI agent loaded successfully.")
except Exception as e:
    print(f"⚠️  CrewAI not available (running in mock-only mode): {e}")

APP_VERSION = "3.0.0"

app = FastAPI(
    title="CrisisAI Agentic Backend",
    description="Fully dynamic agentic crisis orchestration — Karachi Emergency Response System",
    version=APP_VERSION
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global state
event_payloads: list = []

class TriggerRequest(BaseModel):
    crisis_type: str
    location: str

class AnalyzeRequest(BaseModel):
    crisis_id: str


def get_initial_crises() -> list:
    """Return base crisis scenarios (minimal metadata — no hardcoded mitigation)."""
    return [
        {
            "id": "evt_fire_sector4",
            "crisis_type": "FIRE",
            "location": "Sector 4, North Karachi Industrial Zone",
            "coordinates": {"latitude": 24.965, "longitude": 67.062},
            "status": "PENDING_ANALYSIS",
            "confidence_score": 0,
            "analysis": None
        },
        {
            "id": "evt_flood_clifton",
            "crisis_type": "FLOOD",
            "location": "Block 5, Clifton — Sea View Drive",
            "coordinates": {"latitude": 24.793, "longitude": 67.034},
            "status": "PENDING_ANALYSIS",
            "confidence_score": 0,
            "analysis": None
        },
        {
            "id": "evt_earthquake_saddar",
            "crisis_type": "EARTHQUAKE",
            "location": "Saddar Town, Downtown Karachi",
            "coordinates": {"latitude": 24.858, "longitude": 67.009},
            "status": "PENDING_ANALYSIS",
            "confidence_score": 0,
            "analysis": None
        },
        {
            "id": "evt_heatwave_orangi",
            "crisis_type": "HEAT_WAVE",
            "location": "Orangi Town, Sector 9",
            "coordinates": {"latitude": 24.920, "longitude": 67.052},
            "status": "PENDING_ANALYSIS",
            "confidence_score": 0,
            "analysis": None
        }
    ]


async def analyze_crisis_async(crisis: dict):
    """Asynchronously invoke Gemini agent to analyze crisis."""
    if not CREW_AVAILABLE:
        print("⚠️  Crew not available, using mock analysis")
        crisis["status"] = "UNVERIFIED"
        crisis["analysis"] = {"error": "CrewAI unavailable"}
        return
    
    try:
        print(f"🤖 Analyzing crisis: {crisis['crisis_type']} at {crisis['location']}")
        
        # Invoke CrewAI dynamically
        analysis = process_crisis_event(crisis["crisis_type"], crisis["location"])
        
        # Update crisis with agentic analysis
        crisis["analysis"] = analysis
        crisis["confidence_score"] = analysis.get("confidence_score", 0)
        crisis["status"] = analysis.get("status", "UNVERIFIED")
        
        print(f"✅ Analysis complete: {crisis['crisis_type']} — Confidence: {crisis['confidence_score']}%")
        
    except Exception as e:
        print(f"❌ Analysis failed: {e}")
        crisis["status"] = "ERROR"
        crisis["analysis"] = {"error": str(e)}


# ────────────────────────────────────────────────────────────────────
# ENDPOINTS
# ────────────────────────────────────────────────────────────────────

@app.get("/api/status")
def get_status():
    """Health check endpoint."""
    return {
        "status": "online",
        "agent": "CrewAI (Gemini-3.5-Flash)" if CREW_AVAILABLE else "MOCK MODE",
        "version": APP_VERSION
    }


@app.get("/api/session/start")
@app.post("/api/session/start")
def start_session():
    """Initialize session with base crises."""
    global event_payloads
    event_payloads = get_initial_crises()
    print(f"✅ Session started. Loaded {len(event_payloads)} base crises.")
    return {
        "session": "initialized",
        "crises_loaded": len(event_payloads),
        "crises": event_payloads
    }


@app.get("/api/events")
def get_events():
    """Get all current crisis events."""
    return {
        "events": event_payloads,
        "total": len(event_payloads),
        "analyzed": sum(1 for c in event_payloads if c.get("analysis") is not None)
    }


@app.post("/api/analyze-crisis")
async def analyze_crisis(request: AnalyzeRequest, background_tasks: BackgroundTasks):
    """
    Trigger dynamic crisis analysis using CrewAI.
    Finds crisis by ID, invokes agent, returns analysis.
    """
    # Find crisis
    crisis = next((c for c in event_payloads if c["id"] == request.crisis_id), None)
    if not crisis:
        raise HTTPException(status_code=404, detail=f"Crisis {request.crisis_id} not found")
    
    # Run analysis asynchronously
    background_tasks.add_task(analyze_crisis_async, crisis)
    
    return {
        "crisis_id": crisis["id"],
        "status": "analysis_queued",
        "message": "Sending to agentic engine for verification..."
    }


@app.post("/api/simulate")
async def generate_new_simulation(background_tasks: BackgroundTasks):
    """
    Generate a NEW crisis scenario using LLM.
    Adds it to event_payloads and queues analysis.
    """
    if not CREW_AVAILABLE:
        raise HTTPException(status_code=503, detail="CrewAI not available")
    
    try:
        print("🎲 Generating new crisis scenario...")
        
        # Generate scenario with LLM
        scenario = generate_crisis_scenario()
        if not scenario or "error" in scenario:
            raise HTTPException(status_code=500, detail="Failed to generate scenario")
        
        # Create crisis object
        crisis = {
            "id": f"evt_{scenario['crisis_type'].lower()}_{len(event_payloads)}",
            "crisis_type": scenario["crisis_type"],
            "location": scenario["location"],
            "coordinates": scenario.get("coordinates", {"latitude": 24.9, "longitude": 67.1}),
            "status": "PENDING_ANALYSIS",
            "confidence_score": 0,
            "analysis": None
        }
        
        event_payloads.append(crisis)
        print(f"✅ Generated: {crisis['crisis_type']} at {crisis['location']}")
        
        # Queue analysis
        background_tasks.add_task(analyze_crisis_async, crisis)
        
        return {
            "crisis": crisis,
            "status": "created_and_queued_for_analysis"
        }
        
    except Exception as e:
        print(f"❌ Simulation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/crisis/{crisis_id}")
def get_crisis_detail(crisis_id: str):
    """Get detailed analysis of a specific crisis."""
    crisis = next((c for c in event_payloads if c["id"] == crisis_id), None)
    if not crisis:
        raise HTTPException(status_code=404, detail=f"Crisis {crisis_id} not found")
    return crisis


@app.post("/api/analyze-all")
async def analyze_all_crises(background_tasks: BackgroundTasks):
    """Analyze all pending crises."""
    pending = [c for c in event_payloads if c.get("analysis") is None]
    
    for crisis in pending:
        background_tasks.add_task(analyze_crisis_async, crisis)
    
    return {
        "crises_queued": len(pending),
        "message": "All crises sent to agentic engine"
    }


@app.get("/")
def root():
    """Root endpoint."""
    return {
        "name": "CrisisAI Agentic Backend",
        "version": APP_VERSION,
        "docs": "/docs",
        "crew_available": CREW_AVAILABLE,
        "endpoints": {
            "session": "/api/session/start (POST/GET)",
            "events": "/api/events",
            "analyze": "/api/analyze-crisis (POST)",
            "generate": "/api/simulate (POST)",
            "detail": "/api/crisis/{id}",
            "status": "/api/status"
        }
    }


if __name__ == "__main__":
    import uvicorn
    port = 8080
    print(f"🚀 Starting CrisisAI on port {port}...")
    uvicorn.run(app, host="0.0.0.0", port=port)
