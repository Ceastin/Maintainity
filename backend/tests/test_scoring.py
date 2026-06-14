from app import data
from app.agent import generate_recommendation, latest_reading
from app.scoring import compute_anomaly_score, compute_priority_score, estimate_rul, risk_from_priority


def test_critical_motor_scores_above_high_threshold():
    equipment = data.EQUIPMENT["rm-motor-01"]
    reading = latest_reading("rm-motor-01")
    anomaly = compute_anomaly_score(equipment, reading)
    priority = compute_priority_score(equipment, reading, anomaly, 0.42)

    assert anomaly > 0.65
    assert priority > 65
    assert risk_from_priority(priority) in {"high", "critical"}


def test_rul_drops_when_degradation_is_high():
    equipment = data.EQUIPMENT["rm-motor-01"]
    reading = latest_reading("rm-motor-01")
    anomaly = compute_anomaly_score(equipment, reading)
    rul = estimate_rul(equipment, reading, anomaly)

    assert 8 <= rul.hours < 300
    assert 0.0 < rul.degradation_score <= 1.0


def test_recommendation_contains_traceable_evidence():
    recommendation = generate_recommendation("rm-motor-01", "temperature vibration current")

    assert recommendation.evidence
    assert recommendation.immediate_actions
    assert recommendation.spare_strategy
    assert recommendation.node_trace[-1]["node"] == "report_ready"

