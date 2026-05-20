import os
from crewai import Agent, Task, Crew, Process
from langchain_google_genai import ChatGoogleGenerativeAI
from tools import ALL_TOOLS
from dotenv import load_dotenv

load_dotenv()

def get_llm():
    # Ensure GEMINI_API_KEY is synced for LiteLLM
    api_key = os.environ.get("GEMINI_API_KEY", os.environ.get("GOOGLE_API_KEY"))
    if api_key:
        os.environ["GEMINI_API_KEY"] = api_key
    else:
        print("WARNING: GEMINI_API_KEY not found in environment.")
    return "gemini/gemini-2.5-flash"

def create_crisis_agent() -> Agent:
    return Agent(
        role='Crisis Management Orchestrator',
        goal='Ingest city-wide data signals, detect emerging crises, verify them to prevent false positives/negatives, and execute resource allocation and mitigation strategies.',
        backstory="""You are the "Crisis Management Orchestrator," an autonomous agentic AI built on the Google Antigravity framework.
        You must operate using a strict ReAct (Reason -> Act -> Observe) loop. Never execute an emergency mitigation action based on a single data source.
        
        # Core Operational Rules
        1. **Signal Fusion & Verification:** When a primary sensor triggers an alert, you must immediately formulate a plan to verify it using secondary and tertiary tools.
        2. **Confidence Scoring:** Calculate an internal "Confidence Score" (0-100%).
            * 0-40%: Unverified (Monitor actively)
            * 41-75%: Probable (Alert internal authorities, standby resources)
            * 76-100%: Verified (Deploy resources, issue public alerts)
        3. **False Positive Protocol:** If secondary/tertiary tools contradict the primary signal (e.g., thermal anomaly but no smoke, clear traffic, no social chatter), downgrade the confidence score and log it as a potential false alarm.
        4. **Degraded Mode:** If a tool returns an error or timeout, explicitly note the failure in your "Thought" and immediately use a fallback tool.
        """,
        verbose=True,
        allow_delegation=False,
        tools=ALL_TOOLS,
        llm=get_llm()
    )

def process_crisis_event(crisis_type: str, location: str) -> str:
    """Entry point to kick off the agent workflow for a specific suspected event."""
    
    agent = create_crisis_agent()
    
    # We dynamically select the playbook based on the crisis_type passed by the FastAPI backend
    playbook_instructions = ""
    if crisis_type == "FIRE":
        playbook_instructions = """
        **Fire Breakout Protocol:**
        * Trigger: Use `poll_nasa_firms(radius)` to check for anomalies.
        * Thought: "Thermal anomaly detected. I must verify if this is a controlled burn or a severe fire."
        * Action: Call `query_air_quality(location)` and `query_waze_traffic(location)`.
        * Resolution: If PM2.5 spikes AND Waze shows closures/hazards, Confidence > 80%. Call `issue_public_alert()`, `calculate_safe_route()`, and `notify_stakeholders(fire_dept)`.
        """
    elif crisis_type == "EARTHQUAKE":
        playbook_instructions = """
        **Earthquake Protocol:**
        * Trigger: Use `query_emsc_seismic(region)` to detect a tremor.
        * Thought: "Seismic event detected. Speed is critical, but I must deduplicate and verify structural impact."
        * Action: Call `query_social_velocity('earthquake', location)`.
        * Resolution: If social velocity spikes within seconds, Confidence > 95%. Immediately call `issue_public_alert('Drop, Cover, Hold On')`. Post-event, use traffic data to route around compromised infrastructure.
        """
    elif crisis_type == "FLOOD":
        playbook_instructions = """
        **Urban Flooding Protocol:**
        * Trigger: Use `query_weather_api(location)` to check precipitation exceeding critical mm/hour thresholds.
        * Thought: "Heavy rainfall detected. I must check for actual infrastructure failure and water accumulation."
        * Action: Call `query_waze_traffic()` for sudden 0 km/h drops, and `analyze_cctv_feed()` for the affected sector.
        * Resolution: If CCTV confirms standing water and traffic is halted, Confidence > 90%. Call `notify_stakeholders(water_drainage)` and `issue_public_alert(avoid_low_lying_areas)`.
        """
    elif crisis_type == "HEATWAVE":
        playbook_instructions = """
        **Heat Wave Protocol:**
        * Trigger: Use `query_weather_api(location)` to forecast consecutive days > 95th percentile heat index.
        * Thought: "Slow-onset heatwave predicted. I must monitor infrastructure and public health limits."
        * Action: Continuously poll `query_grid_load()` and emergency dispatch data.
        * Resolution: If grid strain is critical or medical calls spike, Confidence > 85%. Call `issue_public_alert(cooling_center_locations)` and `notify_stakeholders(hospitals)`.
        """
    else:
        playbook_instructions = "Follow general verification protocol using all available tools to determine the nature of the crisis."

    task = Task(
        description=f"""
        A potential {crisis_type} event has been suspected near {location}.
        
        {playbook_instructions}
        
        Execute the protocol. You MUST output your final answer as a structured JSON object containing:
        {{
            "id": "evt_{crisis_type.lower()}_{location.lower().replace(' ', '_')}",
            "crisis_type": "{crisis_type}",
            "location": "{location}",
            "confidence_score": <int between 0 and 100>,
            "status": "<Verified | Probable | Unverified | False Positive>",
            "coordinates": {{
                "latitude": <float latitude for Karachi region, e.g. 24.8 to 25.0>,
                "longitude": <float longitude for Karachi region, e.g. 67.0 to 67.2>
            }},
            "sources_verified": [
                {{ "name": "<sensor/tool name used>", "reading": "<raw values observed>", "status": "CONFIRMED" }}
            ],
            "mitigation_plan": {{
                "public_alert": "<specific warning message to display to the public>",
                "safe_route": {{
                    "avoid": "<hazard zones to bypass>",
                    "recommended_path": "<alternative navigation route name>"
                }},
                "hospital_notification": {{
                    "target": "<hospital name>",
                    "beds_to_prepare": <int number of beds, e.g. 10 to 30 based on confidence/crisis type>,
                    "message": "<dispatch warning/ETA for the hospital staff>"
                }},
                "resources_allocated": [
                    {{ "unit": "<Fire Engine | Ambulance | Police Cruiser | Rescue Boat>", "quantity": <int> }}
                ]
            }}
        }}
        Do not output any markdown code blocks (like ```json) in your final answer, just the raw JSON.
        """,
        expected_output="A valid JSON object containing id, confidence_score, status, coordinates, sources_verified, and mitigation_plan.",
        agent=agent
    )

    crew = Crew(
        agents=[agent],
        tasks=[task],
        process=Process.sequential,
        verbose=2
    )

    result = crew.kickoff()
    return result
