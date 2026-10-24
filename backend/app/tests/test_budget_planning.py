"""Tests for flexible preferences (uncapped categories/districts) and numeric budget planning."""

from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import app
from app.schemas.planning import PlanningRequest

client = TestClient(app)


def test_flexible_preferences_uncapped_submission() -> None:
    """Verify that requests with 6+ categories and 6+ districts are accepted without truncation."""
    categories = [
        "heritage",
        "nature",
        "waterfall",
        "hill_station",
        "architecture",
        "beach",
        "wildlife",
    ]
    districts = [
        "KA-BLRU",
        "KA-MYS",
        "KA-KOD",
        "KA-CKM",
        "KA-SHI",
        "KA-UKN",
        "KA-UDP",
    ]

    req_data = {
        "origin_label": "Bengaluru",
        "duration_days": 3,
        "travelers_count": 2,
        "categories": categories,
        "preferred_districts": districts,
        "pace": "balanced",
        "budget_limit_inr": 25000.0,
        "budget_scope": "total_trip",
    }

    # Verify Pydantic schema acceptance
    plan_req = PlanningRequest(**req_data)
    assert len(plan_req.categories) == 7
    assert len(plan_req.preferred_districts) == 7
    assert plan_req.budget_limit_inr == 25000.0
    assert plan_req.budget_scope == "total_trip"

    # Verify Planning API acceptance
    response = client.post("/api/v1/planning/recommendations", json=req_data)
    assert response.status_code == 200
    res_json = response.json()
    assert res_json["budget_breakdown"] is not None
    assert res_json["budget_breakdown"]["budget_limit_inr"] == 25000.0


def test_budget_overrun_warning_generated() -> None:
    """Verify that an unrealistically low budget cap produces an honest feasibility warning."""
    low_budget_req = PlanningRequest(
        origin_label="Bengaluru",
        duration_days=3,
        travelers_count=4,
        budget_limit_inr=1500.0,  # ₹1,500 is infeasible for 4 travelers for 3 days
        budget_scope="total_trip",
    )

    response = client.post(
        "/api/v1/planning/recommendations",
        json=low_budget_req.model_dump(),
    )
    assert response.status_code == 200
    res_json = response.json()
    budget = res_json["budget_breakdown"]
    assert budget["is_budget_feasible"] is False
    assert budget["budget_overrun_inr"] is not None
    assert budget["budget_overrun_inr"] > 0.0

    # Ensure warning mentions exceeded budget
    has_warning = any("Target budget of ₹1,500" in w for w in budget["warnings"])
    assert has_warning, f"Expected budget warning not found in: {budget['warnings']}"
