# Sample Input And Output

## Chat Input

```json
{
  "message": "Diagnose the rolling mill motor critical alert",
  "equipment_id": "rm-motor-01",
  "alert_id": "alert-rm-001"
}
```

## Dataset Status

```json
{
  "source": "UCI AI4I 2020 Predictive Maintenance Dataset",
  "rows_loaded": 10000,
  "failure_rows_loaded": 339,
  "stream_step": 0
}
```

## Recommendation Output Shape

```json
{
  "diagnosis": "Critical thermal-vibration event on the rolling mill drive motor derived from AI4I torque, speed, temperature, and wear telemetry...",
  "probable_root_causes": [
    "Drive-end or non-drive-end bearing lubrication breakdown causing heat and vibration rise.",
    "Coupling insert wear or misalignment increasing rotor load and current draw."
  ],
  "risk_level": "critical",
  "urgency": "shutdown_window",
  "rul_estimate": {
    "hours": 96,
    "confidence": 0.8,
    "degradation_score": 0.86
  },
  "evidence": [
    {
      "source_type": "manual",
      "title": "Rolling Mill Drive Motor Manual - Thermal and vibration limits",
      "relevance": 1.0
    }
  ],
  "immediate_actions": [
    "Notify area supervisor and open a critical maintenance case.",
    "Reduce rolling load and isolate the motor at the next safe pass gap."
  ],
  "spare_strategy": [
    "Reserve 1 x DE/NDE bearing kit; replenishment lead time is 18 days."
  ],
  "confidence": 0.88,
  "assumptions": [
    "Sensor data is simulated for the hackathon prototype."
  ]
}
```

Values vary slightly because each recommendation gets a generated id and may include feedback memory after the user submits feedback.
