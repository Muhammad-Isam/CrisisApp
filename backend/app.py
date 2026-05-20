import json
from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel
from crew import process_crisis_event

app = FastAPI(
    title="Crisis Management Agentic Backend",
    description="FastAPI wrapper for the CrewAI Crisis Orchestrator. Exposes JSON payloads for the Mobile App UI.",
    version="1.0.0"
)

# In-memory store for demo purposes to hold generated payloads
event_payloads = []

class TriggerRequest(BaseModel):
    crisis_type: str  # e.g., FIRE, EARTHQUAKE, FLOOD, HEATWAVE
    location: str     # e.g., "34.05,-118.24" or "Downtown Sector 4"

# Pre-populated detailed simulated crises for instant session display
def get_initial_crises():
    return [
        {
            "id": "evt_fire_sector_4",
            "crisis_type": "FIRE",
            "location": "Sector 4 (North Karachi)",
            "confidence_score": 92,
            "status": "Verified",
            "coordinates": {
                "latitude": 24.965,
                "longitude": 67.062
            },
            "sources_verified": [
                { "name": "NASA FIRMS", "reading": "Thermal FRP: 380", "status": "CONFIRMED" },
                { "name": "Air Quality Index", "reading": "PM2.5: 320 (Hazardous)", "status": "CONFIRMED" },
                { "name": "Waze Traffic", "reading": "Speed: 8 km/h, Road Closures", "status": "CONFIRMED" }
            ],
            "mitigation_plan": {
                "public_alert": "Severe warehouse fire in Sector 4. Heavy smoke plume blowing south. Nearby residents shelter in place.",
                "safe_route": {
                    "avoid": "Sector 4 Main Boulevard",
                    "recommended_path": "Route 9 via Sher Shah Suri Rd"
                },
                "hospital_notification": {
                    "target": "Karachi Trauma Centre",
                    "beds_to_prepare": 15,
                    "message": "Prepare 15 burn/inhalation trauma beds. ETA for first emergency responders: 12 minutes."
                },
                "resources_allocated": [
                    { "unit": "Fire Engine", "quantity": 4 },
                    { "unit": "Ambulance", "quantity": 3 },
                    { "unit": "Police Cruiser", "quantity": 2 }
                ]
            }
        },
        {
            "id": "evt_flood_clifton",
            "crisis_type": "FLOOD",
            "location": "Block 5, Clifton",
            "confidence_score": 88,
            "status": "Verified",
            "coordinates": {
                "latitude": 24.818,
                "longitude": 67.033
            },
            "sources_verified": [
                { "name": "Weather API", "reading": "Rainfall: 75mm/hr", "status": "CONFIRMED" },
                { "name": "CCTV Vision AI", "reading": "Standing water: 2.5 feet, stranded vehicles", "status": "CONFIRMED" },
                { "name": "Waze Traffic", "reading": "Avg Speed: 3 km/h (Gridlock)", "status": "CONFIRMED" }
            ],
            "mitigation_plan": {
                "public_alert": "High-tide urban flooding in Clifton Block 5. Avoid low-lying underpasses immediately.",
                "safe_route": {
                    "avoid": "Clifton Underpass & Khayaban-e-Iqbal",
                    "recommended_path": "Sunset Boulevard detour"
                },
                "hospital_notification": {
                    "target": "South City Hospital",
                    "beds_to_prepare": 10,
                    "message": "Prepare 10 beds for water-related trauma/drowning response. Rescue boat team on standby."
                },
                "resources_allocated": [
                    { "unit": "Rescue Boat", "quantity": 2 },
                    { "unit": "Ambulance", "quantity": 2 },
                    { "unit": "Police Cruiser", "quantity": 3 }
                ]
            }
        },
        {
            "id": "evt_heatwave_sector_9",
            "crisis_type": "HEATWAVE",
            "location": "Sector 9 (Orangi Town)",
            "confidence_score": 78,
            "status": "Probable",
            "coordinates": {
                "latitude": 24.935,
                "longitude": 66.995
            },
            "sources_verified": [
                { "name": "Weather API", "reading": "Heat Index: 47°C", "status": "CONFIRMED" },
                { "name": "Grid Load Monitor", "reading": "Capacity: 104% (Overload risk)", "status": "CONFIRMED" },
                { "name": "Social Media Velocity", "reading": "Distress mentions: 450/min", "status": "CONFIRMED" }
            ],
            "mitigation_plan": {
                "public_alert": "Extreme heat wave alert for Orangi. Local power outage risk. Cooling centers active.",
                "safe_route": {
                    "avoid": "Non-airconditioned outdoor markets",
                    "recommended_path": "Sector 9 Community Cooling Hall"
                },
                "hospital_notification": {
                    "target": "Abbasi Shaheed Hospital",
                    "beds_to_prepare": 20,
                    "message": "Prepare 20 hydration and heat stroke recovery beds. Setting up emergency coolers."
                },
                "resources_allocated": [
                    { "unit": "Ambulance", "quantity": 2 },
                    { "unit": "Utility Service Van", "quantity": 1 }
                ]
            }
        }
    ]

# Populate with initial mock events for start
event_payloads = get_initial_crises()

@app.get("/api/status")
def get_status():
    """Health check endpoint for GCP Cloud Run"""
    return {"status": "online", "agent": "CrewAI (Gemini-2.5-Flash)"}

@app.get("/api/events")
def get_events():
    """Mobile App polls this to get the latest JSON payloads of agent decisions."""
    return {"events": event_payloads}

@app.get("/api/session/start")
@app.post("/api/session/start")
def start_session(background_tasks: BackgroundTasks):
    """
    Clears the active event log and initializes a new simulation session
    with 3 concurrent rich crises. Also starts a background task using the
    real CrewAI agent to evaluate a 4th crisis.
    """
    global event_payloads
    event_payloads = get_initial_crises()
    
    # Trigger a real background agent evaluation for an earthquake to show live thinking
    background_tasks.add_task(run_agent_background, "EARTHQUAKE", "Saddar Town (Downtown)")
    
    return {
        "message": "Session initialized with 3 active crises. Background Agent triggered for live evaluation.",
        "active_events_count": len(event_payloads)
    }

def run_agent_background(crisis_type: str, location: str):
    """Runs the CrewAI agent and appends the result to our payload store."""
    try:
        print(f"Triggering CrewAI Agent for {crisis_type} at {location}...")
        result = process_crisis_event(crisis_type, location)
        
        # Parse the JSON string returned by the agent
        try:
            # Clean up potential markdown formatting if the LLM outputted ```json
            cleaned_result = str(result).replace("```json", "").replace("```", "").strip()
            payload = json.loads(cleaned_result)
            event_payloads.insert(0, payload) # Prepend newest
            
            # Keep only the last 100 events to prevent memory bloat in Cloud Run
            if len(event_payloads) > 100:
                event_payloads.pop()
                
        except json.JSONDecodeError:
            print(f"Failed to parse agent output as JSON: {result}")
            # Still push a payload so the UI knows something happened
            event_payloads.insert(0, {
                "id": f"evt_{crisis_type.lower()}_err_{random.randint(100, 999)}",
                "crisis_type": crisis_type,
                "location": location,
                "confidence_score": 50,
                "status": "Error Parsing Output",
                "coordinates": {
                    "latitude": 24.86,
                    "longitude": 67.01
                },
                "sources_verified": [
                    { "name": "Raw LLM Result", "reading": "Output unparsed", "status": "PENDING" }
                ],
                "mitigation_plan": {
                    "public_alert": f"Raw Output: {str(result)[:100]}...",
                    "safe_route": {
                        "avoid": "Unknown",
                        "recommended_path": "Use general caution"
                    },
                    "hospital_notification": {
                        "target": "Civil Hospital Karachi",
                        "beds_to_prepare": 5,
                        "message": "Inbound reports. Monitor active dispatch."
                    },
                    "resources_allocated": [
                        { "unit": "Ambulance", "quantity": 1 }
                    ]
                }
            })
            
    except Exception as e:
        print(f"Agent execution failed: {e}")

@app.post("/api/trigger")
def trigger_agent(request: TriggerRequest, background_tasks: BackgroundTasks):
    """
    Simulates a primary sensor firing. This kicks off the Agent asynchronously 
    so the HTTP request doesn't timeout while CrewAI thinks.
    """
    valid_types = ["FIRE", "EARTHQUAKE", "FLOOD", "HEATWAVE"]
    if request.crisis_type.upper() not in valid_types:
        raise HTTPException(status_code=400, detail=f"Invalid crisis_type. Must be one of {valid_types}")

    # Run the ReAct loop in the background
    background_tasks.add_task(run_agent_background, request.crisis_type.upper(), request.location)
    
    return {
        "message": "Agent workflow initiated. The Crisis Orchestrator is verifying the signal.",
        "crisis_type": request.crisis_type.upper(),
        "location": request.location
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8080, reload=True)
