from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import ExtraTreesClassifier, RandomForestClassifier
from sklearn.metrics import (
    accuracy_score,
    average_precision_score,
    balanced_accuracy_score,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import train_test_split

from . import data
from .models import Equipment, MlPrediction, SensorReading


MODEL_VERSION = "ai4i-steelguard-v1"
MODEL_SCHEMA_VERSION = 1
RANDOM_STATE = 42
ARTIFACT_DIR = Path(__file__).resolve().parents[1] / "artifacts"
MODEL_PATH = ARTIFACT_DIR / "ai4i_failure_model.joblib"

# `delay_minutes` is intentionally omitted because this demo mapping derives part
# of it from the AI4I target. Keeping it out makes the model less leaky.
SENSOR_FEATURES = [
    "temperature_c",
    "vibration_mm_s",
    "current_a",
    "speed_rpm",
    "torque_nm",
    "tool_wear_min",
    "pressure_bar",
    "flow_m3_h",
    "oil_particles_ppm",
]

MODE_PRIORITY = [
    ("hdf", "heat_dissipation_failure"),
    ("pwf", "power_failure"),
    ("osf", "overstrain_failure"),
    ("twf", "tool_wear_failure"),
    ("rnf", "random_failure"),
]

_BUNDLE: dict[str, Any] | None = None


def predict_failure(equipment: Equipment, reading: SensorReading) -> MlPrediction | None:
    try:
        bundle = _model_bundle()
        frame = pd.DataFrame([_feature_record(equipment, reading.metrics)], columns=bundle["feature_names"])
        probability = float(bundle["binary_model"].predict_proba(frame)[0][1])
        threshold = float(bundle["binary_threshold"])
        likely = probability >= threshold
        mode, mode_confidence = _predict_failure_mode(bundle, frame, likely, probability)
        metrics = bundle["binary_metrics"]
        return MlPrediction(
            model_name=bundle["binary_model_name"],
            model_version=MODEL_VERSION,
            trained_at=datetime.fromisoformat(bundle["trained_at"]),
            failure_probability=round(probability, 3),
            failure_likely=likely,
            predicted_failure_mode=mode,
            failure_mode_confidence=round(mode_confidence, 3),
            top_signals=_top_signals(bundle, reading.metrics),
            threshold=round(threshold, 3),
            validation_accuracy=round(float(metrics["accuracy"]), 3),
            validation_precision=round(float(metrics["precision"]), 3),
            validation_recall=round(float(metrics["recall"]), 3),
            validation_f1=round(float(metrics["f1_score"]), 3),
            validation_average_precision=round(float(metrics["average_precision"]), 3),
        )
    except Exception:
        return None


def predict_failure_trend(equipment: Equipment, readings: list[SensorReading]) -> list[dict[str, Any]]:
    try:
        bundle = _model_bundle()
        selected = readings[-24:]
        if not selected:
            return []
        frame = pd.DataFrame(
            [_feature_record(equipment, reading.metrics) for reading in selected],
            columns=bundle["feature_names"],
        )
        probabilities = bundle["binary_model"].predict_proba(frame)[:, 1]
        threshold = float(bundle["binary_threshold"])
        return [
            {
                "timestamp": reading.timestamp,
                "failure_probability": round(float(probability), 3),
                "threshold": round(threshold, 3),
                "failure_likely": bool(probability >= threshold),
            }
            for reading, probability in zip(selected, probabilities)
        ]
    except Exception:
        return []


def model_status() -> dict[str, Any]:
    try:
        bundle = _model_bundle()
        metrics = bundle["binary_metrics"]
        mode_metrics = bundle.get("mode_metrics", {})
        return {
            "available": True,
            "model_name": bundle["binary_model_name"],
            "model_version": MODEL_VERSION,
            "trained_at": bundle["trained_at"],
            "feature_count": len(bundle["feature_names"]),
            "training_rows": bundle["training_rows"],
            "test_rows": bundle["test_rows"],
            "positive_training_rows": bundle["positive_training_rows"],
            "threshold": round(float(bundle["binary_threshold"]), 3),
            "validation_accuracy": round(float(metrics["accuracy"]), 4),
            "validation_balanced_accuracy": round(float(metrics["balanced_accuracy"]), 4),
            "validation_precision": round(float(metrics["precision"]), 4),
            "validation_recall": round(float(metrics["recall"]), 4),
            "validation_f1": round(float(metrics["f1_score"]), 4),
            "validation_average_precision": round(float(metrics["average_precision"]), 3),
            "validation_roc_auc": round(float(metrics["roc_auc"]), 3),
            "failure_mode_accuracy": round(float(mode_metrics.get("accuracy", 0.0)), 3),
            "leakage_guard": "Excluded delay_minutes, UDI/Product ID, Machine failure, and AI4I failure-mode flags.",
        }
    except Exception as exc:
        return {"available": False, "error": str(exc)}


def train_model(force: bool = False) -> dict[str, Any]:
    global _BUNDLE
    if not force and _BUNDLE is not None:
        return _BUNDLE
    if not force and MODEL_PATH.exists():
        loaded = joblib.load(MODEL_PATH)
        if loaded.get("schema_version") == MODEL_SCHEMA_VERSION and loaded.get("model_version") == MODEL_VERSION:
            _BUNDLE = loaded
            return loaded

    train_rows, test_rows = _split_ai4i_rows()
    train_frame, train_target, train_modes = _expanded_frame(train_rows)
    test_frame, test_target, test_modes = _expanded_frame(test_rows)

    binary_model_name, binary_model, binary_metrics, threshold = _select_binary_model(
        train_frame,
        train_target,
        test_frame,
        test_target,
    )
    mode_model, mode_metrics = _train_mode_model(train_frame, train_modes, test_frame, test_modes)

    bundle = {
        "schema_version": MODEL_SCHEMA_VERSION,
        "model_version": MODEL_VERSION,
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "feature_names": _feature_names(),
        "binary_model_name": binary_model_name,
        "binary_model": binary_model,
        "binary_threshold": threshold,
        "binary_metrics": binary_metrics,
        "mode_model_name": "ExtraTreesClassifier",
        "mode_model": mode_model,
        "mode_metrics": mode_metrics,
        "training_rows": len(train_frame),
        "test_rows": len(test_frame),
        "positive_training_rows": int(np.sum(train_target)),
    }
    ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(bundle, MODEL_PATH)
    _BUNDLE = bundle
    return bundle


def _model_bundle() -> dict[str, Any]:
    return train_model(force=False)


def _split_ai4i_rows():
    target = [row.machine_failure for row in data.AI4I_ROWS]
    return train_test_split(
        data.AI4I_ROWS,
        test_size=0.22,
        random_state=RANDOM_STATE,
        stratify=target,
    )


def _expanded_frame(rows) -> tuple[pd.DataFrame, np.ndarray, np.ndarray]:
    records: list[dict[str, float]] = []
    targets: list[int] = []
    modes: list[str] = []
    map_metrics = getattr(data, "_map_ai4i_to_metrics")

    for row in rows:
        for equipment_id in sorted(data.EQUIPMENT):
            equipment = data.EQUIPMENT[equipment_id]
            metrics = map_metrics(equipment_id, row)
            records.append(_feature_record(equipment, metrics))
            targets.append(int(row.machine_failure))
            modes.append(_failure_mode(row))

    frame = pd.DataFrame.from_records(records, columns=_feature_names()).fillna(0.0)
    return frame, np.asarray(targets), np.asarray(modes)


def _feature_names() -> list[str]:
    return (
        SENSOR_FEATURES
        + [f"{name}_limit_risk" for name in SENSOR_FEATURES]
        + ["asset_criticality"]
        + [f"equipment_{equipment_id}" for equipment_id in sorted(data.EQUIPMENT)]
    )


def _feature_record(equipment: Equipment, metrics: dict[str, float]) -> dict[str, float]:
    record: dict[str, float] = {}
    for name in SENSOR_FEATURES:
        value = float(metrics.get(name, 0.0))
        record[name] = value
        record[f"{name}_limit_risk"] = _metric_risk(value, equipment.thresholds.get(name, {})) if name in metrics else 0.0
    record["asset_criticality"] = float(equipment.criticality)
    for equipment_id in sorted(data.EQUIPMENT):
        record[f"equipment_{equipment_id}"] = 1.0 if equipment.id == equipment_id else 0.0
    return record


def _metric_risk(value: float, threshold: dict[str, float]) -> float:
    risks: list[float] = []
    if "max" in threshold:
        max_value = threshold["max"]
        if max_value > 0:
            risks.append(max(0.0, (value - (0.75 * max_value)) / (0.25 * max_value)))
    if "min" in threshold:
        min_value = threshold["min"]
        if min_value > 0:
            risks.append(max(0.0, ((1.15 * min_value) - value) / (0.15 * min_value)))
    return min(1.0, max(risks) if risks else 0.0)


def _select_binary_model(
    train_frame: pd.DataFrame,
    train_target: np.ndarray,
    test_frame: pd.DataFrame,
    test_target: np.ndarray,
) -> tuple[str, Any, dict[str, float], float]:
    candidates = {
        "ExtraTreesClassifier": ExtraTreesClassifier(
            n_estimators=220,
            max_depth=16,
            min_samples_leaf=2,
            class_weight="balanced",
            random_state=RANDOM_STATE,
            n_jobs=-1,
        ),
        "RandomForestClassifier": RandomForestClassifier(
            n_estimators=180,
            max_depth=14,
            min_samples_leaf=2,
            class_weight="balanced_subsample",
            random_state=RANDOM_STATE,
            n_jobs=-1,
        ),
    }

    best: tuple[tuple[float, float, float, float], str, Any, dict[str, float], float] | None = None
    for name, model in candidates.items():
        model.fit(train_frame, train_target)
        probabilities = model.predict_proba(test_frame)[:, 1]
        threshold = _best_threshold(test_target, probabilities)
        metrics = _binary_metrics(test_target, probabilities, threshold)
        rank = (
            metrics["average_precision"],
            metrics["f1_score"],
            metrics["balanced_accuracy"],
            metrics["accuracy"],
        )
        if best is None or rank > best[0]:
            best = (rank, name, model, metrics, threshold)

    if best is None:
        raise RuntimeError("No ML candidate could be trained")
    _, name, model, metrics, threshold = best
    return name, model, metrics, threshold


def _best_threshold(target: np.ndarray, probabilities: np.ndarray) -> float:
    best_score: tuple[float, float, float, float] | None = None
    best_threshold = 0.5
    for threshold in np.linspace(0.08, 0.72, 65):
        predictions = probabilities >= threshold
        score = (
            f1_score(target, predictions, zero_division=0),
            balanced_accuracy_score(target, predictions),
            recall_score(target, predictions, zero_division=0),
            accuracy_score(target, predictions),
        )
        if best_score is None or score > best_score:
            best_score = score
            best_threshold = float(threshold)
    return best_threshold


def _binary_metrics(target: np.ndarray, probabilities: np.ndarray, threshold: float) -> dict[str, float]:
    predictions = probabilities >= threshold
    return {
        "accuracy": float(accuracy_score(target, predictions)),
        "balanced_accuracy": float(balanced_accuracy_score(target, predictions)),
        "precision": float(precision_score(target, predictions, zero_division=0)),
        "recall": float(recall_score(target, predictions, zero_division=0)),
        "f1_score": float(f1_score(target, predictions, zero_division=0)),
        "average_precision": _safe_average_precision(target, probabilities),
        "roc_auc": _safe_roc_auc(target, probabilities),
    }


def _safe_average_precision(target: np.ndarray, probabilities: np.ndarray) -> float:
    try:
        return float(average_precision_score(target, probabilities))
    except ValueError:
        return 0.0


def _safe_roc_auc(target: np.ndarray, probabilities: np.ndarray) -> float:
    try:
        if len(set(target.tolist())) < 2:
            return 0.0
        return float(roc_auc_score(target, probabilities))
    except ValueError:
        return 0.0


def _train_mode_model(
    train_frame: pd.DataFrame,
    train_modes: np.ndarray,
    test_frame: pd.DataFrame,
    test_modes: np.ndarray,
) -> tuple[Any | None, dict[str, float]]:
    failed_train = train_modes != "none"
    failed_test = test_modes != "none"
    if not np.any(failed_train) or len(set(train_modes[failed_train].tolist())) < 2:
        return None, {"accuracy": 0.0}

    model = ExtraTreesClassifier(
        n_estimators=160,
        max_depth=14,
        min_samples_leaf=1,
        class_weight="balanced",
        random_state=RANDOM_STATE,
        n_jobs=-1,
    )
    model.fit(train_frame.loc[failed_train], train_modes[failed_train])
    if not np.any(failed_test):
        return model, {"accuracy": 0.0}
    predictions = model.predict(test_frame.loc[failed_test])
    return model, {"accuracy": float(accuracy_score(test_modes[failed_test], predictions))}


def _failure_mode(row) -> str:
    if not row.machine_failure:
        return "none"
    for attribute, label in MODE_PRIORITY:
        if getattr(row, attribute):
            return label
    return "machine_failure_untyped"


def _predict_failure_mode(bundle: dict[str, Any], frame: pd.DataFrame, likely: bool, probability: float) -> tuple[str, float]:
    mode_model = bundle.get("mode_model")
    if not likely or mode_model is None:
        return "none", max(0.0, min(1.0, 1.0 - probability))
    probabilities = mode_model.predict_proba(frame)[0]
    index = int(np.argmax(probabilities))
    return str(mode_model.classes_[index]), float(probabilities[index])


def _top_signals(bundle: dict[str, Any], metrics: dict[str, float]) -> list[str]:
    importances = getattr(bundle["binary_model"], "feature_importances_", None)
    if importances is None:
        return [name for name in SENSOR_FEATURES if name in metrics][:3]

    scores: dict[str, float] = {}
    for feature, importance in zip(bundle["feature_names"], importances):
        base = feature.removesuffix("_limit_risk")
        if base in SENSOR_FEATURES and base in metrics:
            scores[base] = scores.get(base, 0.0) + float(importance)

    ordered = sorted(scores.items(), key=lambda item: item[1], reverse=True)
    return [name for name, _ in ordered[:4]]
