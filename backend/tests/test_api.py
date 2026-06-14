from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_health_endpoint_returns_seeded_equipment():
    response = client.get("/equipment/rm-motor-01/health")

    assert response.status_code == 200
    payload = response.json()
    assert payload["equipment"]["name"] == "Rolling Mill Stand 2 Drive Motor"
    assert payload["anomaly_score"] > 0


def test_chat_returns_structured_recommendation():
    response = client.post("/chat", json={"message": "Diagnose the rolling mill motor critical alert"})

    assert response.status_code == 200
    payload = response.json()
    assert payload["recommendation"]["risk_level"] in {"high", "critical"}
    assert payload["recommendation"]["evidence"]


def test_feedback_becomes_available_after_recommendation():
    rec_response = client.post("/recommendations", json={"equipment_id": "rm-motor-01", "query": "bearing overheating"})
    recommendation_id = rec_response.json()["id"]

    feedback_response = client.post(
        "/feedback",
        json={
            "recommendation_id": recommendation_id,
            "equipment_id": "rm-motor-01",
            "rating": "accepted",
            "actual_root_cause": "Bearing grease line blockage",
            "action_taken": "Cleared grease line and realigned coupling",
            "downtime_saved_minutes": 35,
        },
    )

    assert feedback_response.status_code == 200
    assert feedback_response.json()["rating"] == "accepted"


def test_dataset_status_and_stream_tick_are_available():
    status_response = client.get("/dataset")
    assert status_response.status_code == 200
    status = status_response.json()
    assert status["source"].startswith("UCI AI4I")
    assert status["rows_loaded"] >= 10000

    tick_response = client.post("/stream/tick?steps=1")
    assert tick_response.status_code == 200
    assert tick_response.json()["stream_step"] == status["stream_step"] + 1


def test_rag_evidence_endpoint_returns_retrieved_sources():
    response = client.get("/rag/evidence/rm-motor-01?q=bearing vibration lubrication")

    assert response.status_code == 200
    payload = response.json()
    assert payload
    assert payload[0]["source_type"] in {"manual", "sop", "failure_report", "maintenance_log", "feedback"}
    assert payload[0]["relevance"] > 0
