"""
Unit tests for the Varahi Disaster Priority Engine.
"""

import pytest
from fastapi.testclient import TestClient
from main import app, calculate_emergency_priority, PriorityRequest, PriorityLevel, ResponderType

client = TestClient(app)


def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_critical_combination():
    """
    Scenario from Hackathon Acceptance Test:
    4 people trapped, child present, injured, immediate life threat.
    Should produce CRITICAL (score 100).
    """
    req = PriorityRequest(
        request_type="emergency",
        category="trapped_person",
        people_count=4,
        child_present=True,
        elderly_present=False,
        injured=True,
        medical_emergency=False,
        trapped=True,
        life_threat=True
    )
    result = calculate_emergency_priority(req)
    assert result.score == 100
    assert result.priority == PriorityLevel.CRITICAL
    assert "trapped" in result.reason.lower()
    assert result.recommended_responder == ResponderType.RESCUE_TEAM


def test_elderly_needs_medicine():
    """
    Scenario: Elderly person requiring essential medicine.
    Resource request base (30) + Elderly (+10) + Medicine (+20) = 60 (HIGH).
    """
    req = PriorityRequest(
        request_type="resource",
        category="medicine",
        people_count=1,
        elderly_present=True,
        requested_resource="insulin medicine"
    )
    result = calculate_emergency_priority(req)
    assert result.score >= 60
    assert result.priority in [PriorityLevel.HIGH, PriorityLevel.CRITICAL]
    assert "medicine" in result.reason.lower()


def test_drinking_water_request():
    """
    Scenario: Stranded family of 5 needing drinking water.
    Resource request base (30) + Multiple people (+10) + Water (+15) = 55 (MEDIUM).
    """
    req = PriorityRequest(
        request_type="resource",
        category="water",
        people_count=5,
        requested_resource="drinking water"
    )
    result = calculate_emergency_priority(req)
    assert result.score == 55
    assert result.priority == PriorityLevel.MEDIUM


def test_basic_food_request():
    """
    Scenario: Single citizen needing food packet.
    Resource request base (30) + Food (+10) = 40 (MEDIUM).
    """
    req = PriorityRequest(
        request_type="resource",
        category="food",
        people_count=1,
        requested_resource="food rations"
    )
    result = calculate_emergency_priority(req)
    assert result.score == 40
    assert result.priority == PriorityLevel.MEDIUM
    assert result.recommended_responder == ResponderType.VOLUNTEER


def test_medical_emergency_triage():
    """
    Scenario: Medical emergency with injured person.
    Emergency (60) + Medical (+20) + Injured (+15) = 95 (CRITICAL)
    """
    req = PriorityRequest(
        request_type="emergency",
        category="medical",
        people_count=1,
        injured=True,
        medical_emergency=True,
        life_threat=False
    )
    result = calculate_emergency_priority(req)
    assert result.score == 95
    assert result.priority == PriorityLevel.CRITICAL
    assert result.recommended_responder == ResponderType.MEDICAL_TEAM


def test_api_endpoint_calculate():
    payload = {
        "request_type": "emergency",
        "category": "trapped_person",
        "people_count": 4,
        "child_present": True,
        "elderly_present": False,
        "injured": True,
        "medical_emergency": False,
        "trapped": True,
        "life_threat": True
    }
    response = client.post("/priority/calculate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["score"] == 100
    assert data["priority"] == "CRITICAL"
    assert data["recommended_responder"] == "RESCUE_TEAM"
    assert "trapped" in data["reason"].lower()
