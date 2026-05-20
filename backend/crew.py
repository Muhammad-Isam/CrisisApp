import os
import json
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage
from tools import ALL_TOOLS
from dotenv import load_dotenv

load_dotenv()

def get_llm():
    """Initialize Gemini LLM directly (bypassing CrewAI provider issues)."""
    api_key = os.environ.get("GEMINI_API_KEY", os.environ.get("GOOGLE_API_KEY"))
    if not api_key:
        print("WARNING: GEMINI_API_KEY not found in environment.")
        api_key = "fake-key-for-testing"
    
    llm = ChatGoogleGenerativeAI(
        model="gemini-1.5-flash",
        google_api_key=api_key,
        temperature=0.7
    )
    return llm


def process_crisis_event(crisis_type: str, location: str) -> dict:
    """
    Directly analyze a crisis event using LLM (bypasses CrewAI provider registry issues).
    
    Flow:
    1. LLM reasons about crisis using simulated tools
    2. LLM generates confidence score
    3. LLM decides resource allocation
    4. LLM creates public alerts & safe routes
    5. Returns structured JSON response
    """
    
    llm = get_llm()
    
    # Dynamically select verification strategy based on crisis type
    crisis_prompt = f"""
    **CRISIS ALERT ANALYSIS REQUIRED**
    
    Crisis Type: {crisis_type}
    Location: {location}
    
    Your task:
    1. Verify this {crisis_type} alert by reasoning about available tools:
       - For FIRE: Use poll_nasa_firms, query_air_quality, query_waze_traffic, query_social_velocity
       - For FLOOD: Use query_weather_api, query_waze_traffic, analyze_cctv_feed, query_social_velocity
       - For EARTHQUAKE: Use query_emsc_seismic, query_social_velocity, query_grid_load
       - For HEAT_WAVE: Use query_weather_api, query_grid_load, query_social_velocity
    
    2. Simulate these tool responses and cross-check them:
       - Simulate typical sensor readings for {crisis_type} in {location}
       - Check consistency across multiple sources
       - Calculate confidence based on agreement between sources
    
    3. Calculate a CONFIDENCE SCORE (0-100%) based on your simulated verification results
    
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
    
    try:
        # Call LLM directly via langchain
        message = HumanMessage(content=crisis_prompt)
        response = llm.invoke([message])
        
        print(f"✅ LLM response:\n{response.content}")
        
        # Parse result as JSON
        parsed_result = parse_crew_response(response.content)
        return parsed_result
        
    except Exception as e:
        print(f"❌ LLM execution failed: {e}")
        import traceback
        traceback.print_exc()
        return {
            "status": "ERROR",
            "confidence_score": 0,
            "error": str(e),
            "fallback": "System entered degraded mode."
        }


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
        message = HumanMessage(content=prompt)
        result = llm.invoke([message])
        return parse_crew_response(result.content)
    except Exception as e:
        print(f"Failed to generate crisis: {e}")
        return None

