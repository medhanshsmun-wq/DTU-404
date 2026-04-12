"""
Autonomous edge ML stub — attach to each CCTV stream_event payload.

Replace `infer_ml_metadata` with a real export (ONNX / TorchScript / TensorRT):
  - multiclass head trained on UCF-Crime / ShanghaiTech / custom hotel footage
  - optional multi-label for compound cues (smoke + crowd)

The Node backend uses `ml.confidence` only for LLM gating today; scoring stays
deterministic until you wire hazard overrides from model logits.
"""


def infer_ml_metadata(frame_bgr, detector_signals: dict) -> dict:
    """
    :param frame_bgr: OpenCV BGR frame (unused in stub; real models consume it)
    :param detector_signals: dict from MockDetector.process_frame()
    :return: JSON-serializable object for POST body field `ml`
    """
    smoke = float(detector_signals.get("smoke_score", 0) or 0)
    water = float(detector_signals.get("water_level", 0) or 0)
    exit_blocked = bool(detector_signals.get("exit_blocked", False))
    people = int(detector_signals.get("people_count", 0) or 0)

    activity = max(
        smoke,
        min(1.0, water / 2.0),
        0.62 if exit_blocked else 0.0,
        min(1.0, people / 75.0),
    )
    confidence = min(0.96, 0.38 + activity * 0.55)

    top_labels = []
    if smoke > 0.18:
        top_labels.append({"label": "smoke_plume", "score": round(smoke, 3)})
    if water > 0.15:
        top_labels.append({"label": "water_ingress", "score": round(water, 3)})
    if exit_blocked:
        top_labels.append({"label": "exit_obstruction", "score": 0.88})
    if people >= 25:
        top_labels.append({"label": "high_occupancy", "score": round(min(1.0, people / 60.0), 3)})

    return {
        "version": "local-ml-stub/0.1.0",
        "confidence": round(confidence, 3),
        "topLabels": top_labels[:8],
    }
