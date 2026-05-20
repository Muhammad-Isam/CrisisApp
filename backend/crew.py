import os
import json
from crewai import Agent, Task, Crew, Process
from langchain_google_genai import ChatGoogleGenerativeAI
from tools import ALL_TOOLS
from dotenv import load_dotenv

load_dotenv()

def get_llm():
    api_key = os.environ.get("GEMINI_API_KEY", os.environ.get("GOOGLE_API_KEY"))
    if not api_key:
        print("WARNING: GEMINI_API_KEY not found in environment.")
    return ChatGoogleGenerativeAI(
        model="gemini-3.5-flash",
        google_api_key=api_key,
        temperature=0.7
    )


def create_crisis_agent() -> Agent:
    """Create the crisis management agent with all available tools."""
    return Agent(
        role='Crisis Management Orchestrator',
        goal='Analyze incoming crisis signals, verify them through multi-source fusion, calculate confidence scores, and dynamically generate mitigation plans with resource allocation.',
        backstory="""You are the "Crisis Management Orchestrator," an autonomous agentic AI system.
        You operate using a strict ReAct (Reason -> Act -> Observe) loop and NEVER make decisions based on single data sources.
        
        # Core Rules:
        1. **Multi-Source Verification:** Always cross-check primary signals with secondary/tertiary sources.
        2. **Confidence Scoring:** 
           - 0-40%: Unverified (Monitor)
           - 41-75%: Probable (Alert authorities)
           - 76-100%: Verified (Deploy resources & public alerts)
        3. **False Positive Prevention:** If secondary tools contradict primary signal, downgrade confidence.
        4. **Dynamic Planning:** Generate specific, actionable mitigation strategies based on verified threat level.
        5. **Resource Optimization:** Allocate minimum necessary resources for maximum impact.
        """,
        verbose=True,
        allow_delegation=False,
        tools=ALL_TOOLS,
        llm=get_llm()
    )


def process_crisis_event(crisis_type: str, location: str) -> dict:
    """
    Dynamically analyze a crisis event and return structured mitigation plan.
    
    Flow:
    1. Agent verifies crisis through tools
    2. Agent generates confidence score
    3. Agent decides resource allocation
    4. Agent creates public alerts & safe routes
    5. Returns structured JSON response
    """
    
    agent = create_crisis_agent()
    
    # Dynamically select verification strategy based on crisis type
    crisis_prompt = f"""
    **CRISIS ALERT ANALYSIS REQUIRED**
    
    Crisis Type: {crisis_type}
    Location: {location}
    
    Your task:
    1. Verify this {crisis_type} alert through appropriate tools ({get_crisis_tools(crisis_type)})
    2. Check cross-signals (traffic, social media, air quality, etc.)
    3. Calculate a CONFIDENCE SCORE (0-100%) based on verification results
    4. If confidence > 75%, generate a MITIGATION PLAN with:
       - Public alert message
       - Safe route for evacuation
       - Hospitals/facilities to notify
       - Emergency units to dispatch (specify type, quantity, ETA)
       - Resources to allocate
    5. If confidence < 75%, mark as UNVERIFIED and log reason
    
    **CRITICAL:** Return your response as valid JSON with this exact structure:
    {{
        "status": "VERIFIED" | "UNVERIFIED" | "FALSE_ALARM",
        "confidence_score": <0-100>,
        "verification_details": "<what you verified>",
        "public_alert": "<alert message>",
        "safe_route": {{"avoid": "<areas>", "recommended": "<path>"}},
        "hospital_notification": {{"target": "<name>", "beds_to_prepare": <num>, "specialization": "<type>", "eta_minutes": <num>}},
        "authorities_notified": [
            {{"name": "<agency>", "units": <num>, "eta_minutes": <num>}},
            ...
        ],
        "resources_allocated": [
            {{"unit": "<type>", "quantity": <num>}},
            ...
        ],
        "reasoning": "<explain your analysis>"
    }}
    
    Start your analysis NOW."""
    


def get_crisis_tools(crisis_type: str) -> str:
    """Return relevant tools for each crisis type."""
    tools_map = {
        "FIRE": "poll_nasa_firms, query_air_quality, query_waze_traffic, query_social_velocity",
        "FLOOD": "query_weather_api, query_waze_traffic, analyze_cctv_feed, query_social_velocity",
        "EARTHQUAKE": "query_emsc_seismic, query_social_velocity, query_grid_load",
        "HEAT_WAVE": "query_weather_api, query_grid_load, query_social_velocity",
    }
    return tools_map.get(crisis_type, "all available tools")


def parse_crew_response(response: str) -> dict:
    """
    Extract JSON from crew response and parse it.
    Handles cases where LLM wraps JSON in markdown code blocks.
    """
    import json
    import re
    
    response_str = str(response).strip()
    
    # Try to extract JSON from markdown code blocks
    json_match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', response_str)
    if json_match:
        response_str = json_match.group(1)
    
    # Try direct JSON parsing
    try:
        parsed = json.loads(response_str)
        return parsed
    except json.JSONDecodeError:
        # If that fails, extract JSON object manually
        try:
            json_start = response_str.find('{')
            json_end = response_str.rfind('}') + 1
            if json_start >= 0 and json_end > json_start:
                json_str = response_str[json_start:json_end]
                parsed = json.loads(json_str)
                return parsed
        except:
            pass
    
    # Fallback: return error response
    return {
        "status": "PARSE_ERROR",
        "confidence_score": 0,
        "raw_response": response_str[:500],
        "error": "Failed to parse crew response as JSON"
    }


def generate_crisis_scenario() -> dict:
    """Use LLM to generate a new random crisis scenario."""
    llm = get_llm()
    
    prompt = """Generate a single realistic urban crisis scenario for Karachi.
    
    Return as JSON:
    {
        "crisis_type": "<FIRE | FLOOD | EARTHQUAKE | HEAT_WAVE>",
        "location": "<specific Karachi neighborhood/area>",
        "coordinates": {
            "latitude": <24.8 to 25.0>,
            "longitude": <67.0 to 67.2>
        },
        "description": "<brief scenario description>"
    }
    
    Return ONLY valid JSON, no markdown."""
    
    try:
        result = llm.invoke(prompt)
        return parse_crew_response(result.content)
    except Exception as e:
        print(f"Failed to generate crisis: {e}")
        return None

