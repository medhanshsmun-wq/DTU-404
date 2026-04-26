import cv2
import time
import json
import base64
import requests
import threading
from collections import deque
from ultralytics import YOLO

# Configuration
VIDEO_PATH = "frontend/public/cctv/cam07_incident.mp4"
NODE_VERIFY_URL = "http://localhost:3001/api/cctv/verify_medical"
NODE_STREAM_URL = "http://localhost:3001/api/cctv/stream_event"
FPS_TARGET = 10
FRAME_DELAY = int(1000 / FPS_TARGET)
BUFFER_SECONDS = 2
HYSTERESIS_BUFFER_SIZE = FPS_TARGET * BUFFER_SECONDS

def main():
    print("🎥 Starting Hybrid Medical-Emergency CCTV Pipeline...")
    print("Loading YOLO model...")
    model = YOLO('yolov8n.pt')

    cap = cv2.VideoCapture(VIDEO_PATH)
    if not cap.isOpened():
        print(f"❌ Cannot open video file: {VIDEO_PATH}")
        return

    last_alert_time = 0
    ALERT_COOLDOWN = 15
    history_down = deque(maxlen=HYSTERESIS_BUFFER_SIZE)

    def send_to_gemini_and_trigger(frame, signals):
        def _run():
            print("[Hybrid] ⏳ Sending frame to Gemini for semantic verification...")
            _, buffer = cv2.imencode('.jpg', frame)
            base64_img = base64.b64encode(buffer).decode('utf-8')
            try:
                resp = requests.post(NODE_VERIFY_URL, json={
                    "frameBase64": base64_img,
                    "mimeType": "image/jpeg"
                }, timeout=15)
                if resp.status_code == 200:
                    data = resp.json()
                    print(f"[Hybrid] 🧠 Gemini Response: {json.dumps(data, indent=2)}")
                    if data.get("possibleMedicalEmergency"):
                        print("[Hybrid] ✅ Gemini CONFIRMED Medical Emergency! Dispatching real incident.")
                        payload = {
                            "source": "sensor_cctv",
                            "location": "Hallway Cam 07",
                            "description": data.get("description", "Person collapsed. Medical emergency verified by Vision."),
                            "sensorSignals": {
                                "personDown": True,
                                "helpersNearby": signals.get("helpersNearby", True),
                                "occupancyCount": signals.get("peopleCount", 1)
                            },
                            "ml": {"confidence": data.get("confidence", 0.9)}
                        }
                        r2 = requests.post(NODE_STREAM_URL, json=payload, timeout=5)
                        print(f"[Hybrid] 🚨 Incident dispatched to unified engine: HTTP {r2.status_code}")
                    else:
                        print("[Hybrid] ❌ Gemini REJECTED the alert. False positive avoided.")
            except Exception as e:
                print(f"[Hybrid] ⚠️ Gemini verification failed: {e}")

        threading.Thread(target=_run, daemon=True).start()

    print("✅ System Ready. Processing frames...")

    while True:
        ret, frame = cap.read()
        if not ret:
            cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
            continue
        
        # Resize for faster YOLO inference
        small_frame = cv2.resize(frame, (640, 360))
        results = model(small_frame, classes=[0], verbose=False)
        
        person_down = False
        helpers_nearby = False
        boxes = []
        
        for r in results:
            for box in r.boxes:
                x1, y1, x2, y2 = box.xyxy[0]
                w = x2 - x1
                h = y2 - y1
                boxes.append((x1, y1, x2, y2, w, h))
                
                # Heuristic: Width > Height usually means lying down
                if w > h * 1.1:
                    person_down = True
        
        if person_down and len(boxes) > 1:
            helpers_nearby = True

        history_down.append(1 if person_down else 0)
        
        is_critical = False
        if len(history_down) == HYSTERESIS_BUFFER_SIZE:
            ratio = sum(history_down) / HYSTERESIS_BUFFER_SIZE
            if ratio > 0.6:  # 60% of recent frames show someone down
                is_critical = True

        current_time = time.time()
        if is_critical and (current_time - last_alert_time > ALERT_COOLDOWN):
            print(f"\\n[CV] 🛑 Local CV Detected Person Down! Ratio: {ratio:.2f}. Triggering Hybrid Verification.")
            send_to_gemini_and_trigger(small_frame, {
                "helpersNearby": helpers_nearby,
                "peopleCount": len(boxes)
            })
            last_alert_time = current_time

        # Draw bounds
        for (x1, y1, x2, y2, w, h) in boxes:
            color = (0, 0, 255) if (w > h * 1.1) else (0, 255, 0)
            cv2.rectangle(small_frame, (int(x1), int(y1)), (int(x2), int(y2)), color, 2)
            if w > h * 1.1:
                cv2.putText(small_frame, "DOWN", (int(x1), int(y1)-10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)

        if is_critical:
            cv2.putText(small_frame, "POSSIBLE MEDICAL EMERGENCY", (20, 40), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 2)
            if (current_time - last_alert_time) < 3:
                cv2.putText(small_frame, "VERIFYING WITH GEMINI...", (20, 80), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 255), 2)

        cv2.imshow("Hybrid CCTV Pipeline", small_frame)
        if cv2.waitKey(FRAME_DELAY) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    main()
