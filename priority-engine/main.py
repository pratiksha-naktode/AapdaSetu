"""
AI-Powered Disaster Response & Relief Coordination Platform
Priority Engine - Rule-Based Emergency Triage Service
"""

from typing import Optional, List, Dict, Any
from enum import Enum
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field


app = FastAPI(
    title="Varahi Disaster Priority Engine",
    description="Intelligent AI-assisted emergency triage and prioritization service for disaster coordination.",
    version="1.0.0"
)

# Enable CORS for backend & local integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class PriorityLevel(str, Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


class ResponderType(str, Enum):
    RESCUE_TEAM = "RESCUE_TEAM"
    MEDICAL_TEAM = "MEDICAL_TEAM"
    POLICE = "POLICE"
    VOLUNTEER = "VOLUNTEER"
    FIRE_SERVICES = "FIRE_SERVICES"


class PriorityRequest(BaseModel):
    request_type: str = Field(..., description="'emergency' or 'resource'")
    category: Optional[str] = Field(default="general", description="Category like trapped_person, medical, flooded_house, food, water, medicine")
    people_count: int = Field(default=1, ge=1, description="Number of people affected")
    child_present: bool = Field(default=False, description="Whether children are present")
    elderly_present: bool = Field(default=False, description="Whether elderly persons are present")
    injured: bool = Field(default=False, description="Whether there are injured people")
    medical_emergency: bool = Field(default=False, description="Urgent medical emergency")
    trapped: bool = Field(default=False, description="Whether people are trapped inside house/building")
    life_threat: bool = Field(default=False, description="Immediate life-threatening situation")
    requested_resource: Optional[str] = Field(default=None, description="Requested resource type: medicine, water, food, first_aid, etc.")
    damage_severity: Optional[str] = Field(default=None, description="Optional Phase-2 AI Damage triage: none, minor, moderate, severe")
    additional_notes: Optional[str] = Field(default="", description="Additional citizen context")


class PriorityResult(BaseModel):
    score: int
    priority: PriorityLevel
    reason: str
    recommended_responder: ResponderType
    factors_breakdown: Dict[str, Any]


def calculate_emergency_priority(req: PriorityRequest) -> PriorityResult:
    """
    Transparent rule-based scoring algorithm for disaster emergencies and resources.
    Triage is formulated to identify who needs urgent assistance first.
    """
    factors = {}
    reason_clauses: List[str] = []
    
    # 1. Base Score
    is_emergency = req.request_type.lower() in ["emergency", "rescue"]
    if is_emergency:
        base_score = 60
        factors["Base Emergency Score"] = 60
    else:
        base_score = 30
        factors["Base Resource Score"] = 30
        
    score = base_score
    
    # 2. Additive Factors
    if req.trapped:
        score += 20
        factors["People Trapped"] = +20
        reason_clauses.append("people are trapped")
        
    if req.life_threat:
        score += 20
        factors["Immediate Life Threat"] = +20
        reason_clauses.append("there is an immediate life threat")
        
    if req.medical_emergency:
        score += 20
        factors["Medical Emergency"] = +20
        reason_clauses.append("urgent medical emergency is reported")
        
    if req.injured:
        score += 15
        factors["Injured People Present"] = +15
        reason_clauses.append("injured individuals require urgent attention")
        
    if req.child_present:
        score += 10
        factors["Children Present"] = +10
        reason_clauses.append("children are present")
        
    if req.elderly_present:
        score += 10
        factors["Elderly Present"] = +10
        reason_clauses.append("elderly persons need rescue")
        
    if req.people_count > 1:
        score += 10
        factors[f"Multiple People ({req.people_count})"] = +10
        reason_clauses.append(f"{req.people_count} people are affected")
        
    # Resource Specific Rules
    if not is_emergency or req.requested_resource:
        res = (req.requested_resource or "").lower()
        if "med" in res or "insulin" in res:
            score += 20
            factors["Critical Medicine Required"] = +20
            reason_clauses.append("essential medicine required")
        elif "water" in res or "drink" in res:
            score += 15
            factors["Drinking Water Required"] = +15
            reason_clauses.append("drinking water urgently needed")
        elif "food" in res or "ration" in res:
            score += 10
            factors["Food Supplies Required"] = +10
            reason_clauses.append("food supplies required")
        elif "first" in res or "aid" in res:
            score += 15
            factors["First Aid Supplies Required"] = +15
            reason_clauses.append("first-aid supplies needed")
        elif res:
            score += 5
            factors["Essential Relief Item"] = +5
            reason_clauses.append(f"{res} requested")

    # Phase 2: Computer Vision Damage Severity hook (if supplied)
    if req.damage_severity:
        sev = req.damage_severity.lower()
        if sev == "severe":
            score += 20
            factors["AI Damage Triage: Severe Structural Damage"] = +20
            reason_clauses.append("AI photo analysis indicates severe structural damage")
        elif sev == "moderate":
            score += 10
            factors["AI Damage Triage: Moderate Visible Damage"] = +10
            reason_clauses.append("AI photo analysis indicates moderate damage")

    # Score Capping (0 - 100)
    final_score = max(0, min(100, score))
    
    # Priority Level Mapping
    if final_score >= 80:
        priority_level = PriorityLevel.CRITICAL
    elif final_score >= 60:
        priority_level = PriorityLevel.HIGH
    elif final_score >= 40:
        priority_level = PriorityLevel.MEDIUM
    else:
        priority_level = PriorityLevel.LOW

    # Recommended Responder Determination
    if req.trapped or (is_emergency and req.life_threat):
        recommended_responder = ResponderType.RESCUE_TEAM
    elif req.medical_emergency or (req.injured and req.life_threat):
        recommended_responder = ResponderType.MEDICAL_TEAM
    elif is_emergency:
        recommended_responder = ResponderType.POLICE
    else:
        recommended_responder = ResponderType.VOLUNTEER

    # Human-Readable Explanation Formulation
    if reason_clauses:
        clause_str = ", ".join(reason_clauses[:-1]) + (" and " + reason_clauses[-1] if len(reason_clauses) > 1 else reason_clauses[0])
        reason = f"{priority_level.value} — {clause_str.capitalize()}."
    else:
        reason = f"{priority_level.value} — Standard priority level based on category and request type."

    return PriorityResult(
        score=final_score,
        priority=priority_level,
        reason=reason,
        recommended_responder=recommended_responder,
        factors_breakdown=factors
    )


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "service": "Varahi Disaster Priority Engine",
        "version": "1.0.0"
    }


@app.post("/priority/calculate", response_model=PriorityResult)
def calculate_priority(req: PriorityRequest):
    try:
        return calculate_emergency_priority(req)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
