import cv2
import time
import json
import hashlib
import threading
from urllib.request import Request, urlopen
from urllib.error import URLError
from collections import deque
from detector import MockDetector
from local_ml import infer_ml_metadata

# Configuration
FPS_TARGET = 5  # Reduced from 10 — mock detector doesn't need high FPS
FRAME_DELAY = int(1000 / FPS_TARGET)
NODE_SERVER_URL = "http://localhost:3001/api/cctv/stream_event"
BUFFER_SECONDS = 5
HYSTERESIS_BUFFER_SIZE = FPS_TARGET * BUFFER_SECONDS  # 25 frames

class TemporalBuffer:
    def __init__(self, size):
        self.size = size
        self.history = deque(maxlen=size)
        
    def add(self, signals):
        self.history.append(signals)
        
    def check_threshold(self, key, threshold, required_ratio=0.6):
        """
        Check if the signal `key` exceeds `threshold` in at least 
        `required_ratio` of the recent frames.
        """
        if len(self.history) < self.size // 2:
            return False  # Not enough data yet
        
        count = sum(1 for s in self.history if s.get(key, 0) > threshold)
        return count / len(self.history) >= required_ratio

    def get_average(self, key):
        if not self.history:
            return 0
        return sum(s.get(key, 0) for s in self.history) / len(self.history)


class AsyncDispatcher:
    """Non-blocking HTTP dispatcher using threads."""
    
    def __init__(self, url):
        self.url = url
        self._pending = False
        self._last_response = None
        self._lock = threading.Lock()
    
    @property
    def is_pending(self):
        return self._pending
    
    @property
    def last_response(self):
        return self._last_response
    
    def dispatch(self, payload, on_success=None, on_error=None):
        """Fire-and-forget HTTP POST in a background thread."""
        with self._lock:
            if self._pending:
                return  # Don't stack up requests
            self._pending = True
        
        def _send():
            try:
                data = json.dumps(payload).encode("utf-8")
                req = Request(
                    self.url,
                    data=data,
                    headers={"Content-Type": "application/json"},
                    method="POST"
                )
                with urlopen(req, timeout=10) as resp:
                    body = json.loads(resp.read().decode("utf-8"))
                    self._last_response = body
                    if on_success:
                        on_success(body)
            except (URLError, Exception) as e:
                if on_error:
                    on_error(e)
            finally:
                with self._lock:
                    self._pending = False
        
        t = threading.Thread(target=_send, daemon=True)
        t.start()


def compute_state_hash(payload):
    """Hash the hazard state to detect actual changes."""
    key = json.dumps(payload.get("sensorSignals", {}), sort_keys=True)
    return hashlib.md5(key.encode()).hexdigest()[:12]


def main():
    print("🎥 Starting Hybrid CCTV Pipeline (Optimized)...")
    print("🔌 Connecting to Webcam...")
    
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("❌ Cannot open webcam.")
        return

    detector = MockDetector()
    buffer = TemporalBuffer(HYSTERESIS_BUFFER_SIZE)
    dispatcher = AsyncDispatcher(NODE_SERVER_URL)
    
    last_alert_time = 0
    last_state_hash = None
    ALERT_COOLDOWN = 10  # Minimum seconds between alerts
    dispatch_count = 0

    print("✅ System Ready. Press 'q' to quit.")
    print(f"📊 FPS Target: {FPS_TARGET} | Buffer: {BUFFER_SECONDS}s | Cooldown: {ALERT_COOLDOWN}s")

    while True:
        ret, frame = cap.read()
        if not ret:
            print("❌ Cannot read frame. Exiting...")
            break

        # 1. Run "Fast Lightweight CV Model"
        signals = detector.process_frame(frame)
        ml_meta = infer_ml_metadata(frame, signals)
        
        # 2. Add to Rolling Temporal Buffer
        buffer.add(signals)

        # 3. Apply Stateful Temporal Logic
        is_smoke_critical = buffer.check_threshold("smoke_score", 0.6, 0.6)
        is_water_critical = buffer.check_threshold("water_level", 0.4, 0.6)
        
        # Immediate state triggers
        current_exit_blocked = signals["exit_blocked"]
        avg_people = int(buffer.get_average("people_count"))

        is_incident = is_smoke_critical or current_exit_blocked or is_water_critical

        # 4. Dispatch Alert (with cooldown + state-change dedup)
        current_time = time.time()
        if is_incident and (current_time - last_alert_time > ALERT_COOLDOWN):
            # Build payload with NUMERIC values (not strings)
            issues = []
            if is_smoke_critical:
                issues.append("dense smoke")
            if current_exit_blocked:
                issues.append("a blocked exit")
            if is_water_critical:
                issues.append("rapidly rising water")
            
            description = f"CCTV detected {', '.join(issues)} in the Main Lobby area. There are approximately {avg_people} people visible in the frame."

            payload = {
                "source": "sensor_cctv",
                "location": detector.zone["name"],
                "description": description,
                "sensorSignals": {
                    "smokeDensity": round(buffer.get_average("smoke_score"), 3),
                    "occupancyCount": avg_people,
                    "exitBlocked": current_exit_blocked,
                    "waterLevel": round(buffer.get_average("water_level"), 3),
                },
                "ml": ml_meta,
            }

            # State-change dedup: only dispatch if the hazard signature changed
            state_hash = compute_state_hash(payload)
            if state_hash != last_state_hash:
                last_state_hash = state_hash
                dispatch_count += 1

                def on_success(resp):
                    band = resp.get("priorityBand", "?")
                    latency = resp.get("latencyMs", "?")
                    policy = resp.get("enrichmentPolicy", "?")
                    pending = resp.get("enrichmentPending", False)
                    enrich = "LLM pending" if pending else f"no LLM ({policy})"
                    print(f"  ✅ Dispatched #{dispatch_count} → {band} ({latency}ms) | {enrich}")

                def on_error(err):
                    print(f"  ⚠️ Dispatch failed: {err}")

                print(f"\n🚨 THRESHOLD BREACHED! Dispatching event #{dispatch_count}...")
                dispatcher.dispatch(payload, on_success=on_success, on_error=on_error)
                last_alert_time = current_time

                # Show visual feedback
                cv2.putText(frame, "DISPATCHING...", (50, 200), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 3)
            else:
                # Same state as before — skip
                cv2.putText(frame, "INCIDENT ACTIVE (no change)", (50, 200), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 165, 255), 2)

        # Show dispatch status on HUD
        if dispatcher.last_response:
            resp = dispatcher.last_response
            band = resp.get("priorityBand", "?")
            latency = resp.get("latencyMs", "?")
            h, _, _ = frame.shape
            cv2.putText(frame, f"Last: {band} | {latency}ms", (10, h - 45), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 200), 1)

        # 5. Display Frame
        cv2.imshow("Hybrid CCTV Pipeline [Optimized]", frame)

        # 6. Read Keyboard Commands
        key = cv2.waitKey(FRAME_DELAY) & 0xFF
        if key == ord('q'):
            break
        else:
            detector.handle_keyboard(key)

    cap.release()
    cv2.destroyAllWindows()
    print(f"\n📊 Session Stats: {dispatch_count} events dispatched")

if __name__ == "__main__":
    main()
