import cv2
import time
import requests
import json
from collections import deque
from detector import MockDetector

# Configuration
FPS_TARGET = 10
FRAME_DELAY = int(1000 / FPS_TARGET)
NODE_SERVER_URL = "http://localhost:3001/api/cctv/stream_event"
BUFFER_SECONDS = 5
HYSTERESIS_BUFFER_SIZE = FPS_TARGET * BUFFER_SECONDS  # 50 frames

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
            return False # Not enough data yet
        
        count = sum(1 for s in self.history if s.get(key, 0) > threshold)
        return count / len(self.history) >= required_ratio

    def get_average(self, key):
        if not self.history: return 0
        return sum(s.get(key, 0) for s in self.history) / len(self.history)

def main():
    print("🎥 Starting Hybrid CCTV Pipeline...")
    print("🔌 Connecting to Webcam...")
    
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("❌ Cannot open webcam.")
        return

    detector = MockDetector()
    buffer = TemporalBuffer(HYSTERESIS_BUFFER_SIZE)
    
    last_alert_time = 0
    ALERT_COOLDOWN = 10 # Only send alert every 10 seconds per incident

    print("✅ System Ready. Press 'q' to quit.")

    while True:
        ret, frame = cap.read()
        if not ret:
            print("❌ Cannot read frame. Exiting...")
            break

        # 1. Run "Fast Lightweight CV Model"
        signals = detector.process_frame(frame)
        
        # 2. Add to Rolling Temporal Buffer
        buffer.add(signals)

        # 3. Apply Stateful Temporal Logic
        # e.g.: Smoke > 0.6 in 60% of the last 5 seconds?
        is_smoke_critical = buffer.check_threshold("smoke_score", 0.6, 0.6)
        is_water_critical = buffer.check_threshold("water_level", 0.4, 0.6)
        
        # Immediate state triggers
        current_exit_blocked = signals["exit_blocked"]
        avg_people = int(buffer.get_average("people_count"))

        is_incident = is_smoke_critical or current_exit_blocked or is_water_critical

        # 4. Dispatch Alert (with cooldown so we don't spam the server)
        current_time = time.time()
        if is_incident and (current_time - last_alert_time > ALERT_COOLDOWN):
            print("\n🚨 TEMPORAL THRESHOLD BREACHED! Sending incident to Node Backend...")
            
            # Construct semantic description for the Node backend to process
            issues = []
            if is_smoke_critical: issues.append("dense smoke")
            if current_exit_blocked: issues.append("a blocked exit")
            if is_water_critical: issues.append("rapidly rising water")
            
            description = f"CCTV detected {', '.join(issues)} in the Main Lobby area. There are approximately {avg_people} people visible in the frame."

            payload = {
                "source": "sensor_cctv",
                "location": "Main Lobby Camera A",
                "description": description,
                "sensorSignals": {
                    "smokeDensity": f"{buffer.get_average('smoke_score'):.2f}",
                    "occupancyCount": str(avg_people),
                    "exitBlocked": str(current_exit_blocked),
                    "waterLevel": f"{buffer.get_average('water_level'):.2f}m"
                }
            }

            try:
                # Send to Node endpoint
                res = requests.post(NODE_SERVER_URL, json=payload)
                if res.status_code == 200:
                    print(f"✅ Successfully dispatched! Server responded: Incident {res.json().get('priorityBand')} Priority")
                    last_alert_time = current_time
                    
                    # Display "ALERT SENT" on frame for feedback
                    cv2.putText(frame, "ALERT SENT TO BACKEND", (50, 200), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 3)
            except Exception as e:
                print(f"⚠️ Warning: Could not connect to Node server ({NODE_SERVER_URL})")

        # 5. Display Frame
        cv2.imshow("Hybrid CCTV Pipeline [Hackathon MVP]", frame)

        # 6. Read Keyboard Commands
        key = cv2.waitKey(FRAME_DELAY) & 0xFF
        if key == ord('q'):
            break
        else:
            detector.handle_keyboard(key)

    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    main()
