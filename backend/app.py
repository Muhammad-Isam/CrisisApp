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

@app.get("/api/status")
def get_status():
    """Health check endpoint for GCP Cloud Run"""
    return {"status": "online", "agent": "CrewAI (Gemini-Pro)"}

@app.get("/api/events")
def get_events():
    """Mobile App polls this to get the latest JSON payloads of agent decisions."""
    return {"events": event_payloads}

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
                "crisis_type": crisis_type,
                "location": location,
                "status": "Error Parsing Output",
                "raw_output": str(result)
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
