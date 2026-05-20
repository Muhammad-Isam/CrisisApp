import json
import random

try:
    from crewai.tools import tool
except ImportError:
    # Fallback if crewai is not installed
    def tool(name=None):
        def decorator(func):
            return func
        return decorator

# ==========================================
# Ingestion & Verification Tools
# ==========================================

@tool("poll_nasa_firms")
def poll_nasa_firms(radius: str) -> str:
    """Returns thermal anomaly data for a given radius.
    Use this to detect potential fire breakouts.
    """
    # Dynamic Simulator: Returns high confidence anomaly sometimes
    if random.random() > 0.3:
        return json.dumps({
            "status": "anomaly_detected",
            "confidence": "high",
            "frp": round(random.uniform(100.0, 500.0), 2),
            "coordinates": "34.05,-118.24"
        })
    return json.dumps({"status": "clear", "confidence": "low", "frp": 0.0})

@tool("query_emsc_seismic")
def query_emsc_seismic(region: str) -> str:
    """Returns real-time earthquake P/S wave data.
    Use this to detect potential earthquakes.
    """
    if random.random() > 0.5:
        return json.dumps({
            "status": "tremor_detected",
            "magnitude": round(random.uniform(4.5, 7.5), 1),
            "depth_km": round(random.uniform(5.0, 30.0), 1)
        })
    return json.dumps({"status": "clear", "magnitude": 0.0})

@tool("query_weather_api")
def query_weather_api(location: str) -> str:
    """Returns precipitation intensity and heat index forecasts.
    Use this to detect floods or heat waves.
    """
    rand = random.random()
    if rand > 0.6:
        return json.dumps({
            "precipitation_mm_hr": round(random.uniform(50.0, 150.0), 1),
            "heat_index_c": round(random.uniform(25.0, 35.0), 1),
            "consecutive_heat_days": 0
        })
    elif rand > 0.3:
        return json.dumps({
            "precipitation_mm_hr": 0.0,
            "heat_index_c": round(random.uniform(40.0, 50.0), 1),
            "consecutive_heat_days": random.randint(3, 7)
        })
    return json.dumps({"precipitation_mm_hr": 0.0, "heat_index_c": 25.0, "consecutive_heat_days": 0})

@tool("query_air_quality")
def query_air_quality(location: str) -> str:
    """Returns PM2.5/PM10 particulate levels.
    Use this to verify fires.
    """
    return json.dumps({
        "pm25": round(random.uniform(150.0, 500.0), 1),
        "status": "hazardous" if random.random() > 0.4 else "moderate"
    })

@tool("query_waze_traffic")
def query_waze_traffic(location: str) -> str:
    """Returns traffic speeds, congestion levels, and hazard reports.
    Use this to verify floods, earthquakes, or fires.
    """
    return json.dumps({
        "avg_speed_kmh": round(random.uniform(0.0, 20.0), 1),
        "hazard_reports": random.randint(5, 50),
        "road_closures": True if random.random() > 0.5 else False
    })

@tool("analyze_cctv_feed")
def analyze_cctv_feed(camera_id: str) -> str:
    """Returns AI vision classification of camera frame.
    Use this to verify floods ("standing water") or fires.
    """
    events = ["standing water", "stranded vehicles", "clear", "smoke visible"]
    return json.dumps({
        "camera_id": camera_id,
        "classification": random.choice(events),
        "confidence": round(random.uniform(0.7, 0.99), 2)
    })

@tool("query_social_velocity")
def query_social_velocity(keyword: str, location: str) -> str:
    """Returns anomaly spikes in social media distress mentions.
    Use this to verify any crisis.
    """
    return json.dumps({
        "keyword": keyword,
        "mentions_per_minute": random.randint(100, 5000),
        "spike_detected": True if random.random() > 0.3 else False
    })

@tool("query_grid_load")
def query_grid_load() -> str:
    """Returns current public utility grid strain.
    Use this to verify heat waves.
    """
    return json.dumps({
        "capacity_pct": round(random.uniform(85.0, 105.0), 1),
        "status": "critical" if random.random() > 0.5 else "normal"
    })

# ==========================================
# Mitigation & Action Tools
# ==========================================

@tool("calculate_safe_route")
def calculate_safe_route(hazard_zones: str) -> str:
    """Returns optimal navigation paths avoiding crises.
    Call this to generate routing JSON for the UI.
    """
    return json.dumps({
        "action": "route_calculated",
        "avoid": hazard_zones,
        "recommended_path": "Route 17 via Elevated Interstate"
    })

@tool("allocate_resources")
def allocate_resources(resource_type: str, quantity: int, location: str) -> str:
    """Dispatches emergency units (police, rescue, ambulance).
    Call this to log resource allocation in the UI.
    """
    return json.dumps({
        "action": "resources_allocated",
        "type": resource_type,
        "quantity": quantity,
        "destination": location
    })

@tool("issue_public_alert")
def issue_public_alert(message: str, location: str, severity: str) -> str:
    """Broadcasts localized warnings to civilians.
    Call this to generate an alert payload for the UI.
    """
    return json.dumps({
        "action": "public_alert_issued",
        "message": message,
        "location": location,
        "severity": severity
    })

@tool("notify_stakeholders")
def notify_stakeholders(stakeholder_type: str, message: str) -> str:
    """Alerts hospitals, utilities, or fire departments.
    Call this to generate a stakeholder notification for the UI.
    """
    return json.dumps({
        "action": "stakeholder_notified",
        "target": stakeholder_type,
        "message": message
    })

# List of all tools to pass to CrewAI
ALL_TOOLS = [
    poll_nasa_firms, query_emsc_seismic, query_weather_api,
    query_air_quality, query_waze_traffic, analyze_cctv_feed,
    query_social_velocity, query_grid_load,
    calculate_safe_route, allocate_resources,
    issue_public_alert, notify_stakeholders
]
