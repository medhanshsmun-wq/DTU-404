import cv2
import numpy as np

class MockDetector:
    """
    A lightweight CV Mock Detector for Hackathons.
    It reads frames from the webcam and overlays a HUD.
    You can trigger computer-vision style 'detections' via the keyboard 
    to test the hysteresis and temporal aggregation layers downstream.
    """
    def __init__(self):
        self.smoke_score = 0.0
        self.people_count = 5
        self.exit_blocked = False
        self.water_level = 0.0

    def process_frame(self, frame):
        """
        Takes the raw webcam frame and overlays the current state.
        This represents the output of a YOLO/Segmentation model.
        """
        # Create HUD overlay
        overlay = frame.copy()
        
        # Determine overall hazard level for color coding
        is_hazard = self.smoke_score > 0.5 or self.exit_blocked or self.water_level > 0.5
        color = (0, 0, 255) if is_hazard else (0, 255, 0)
        
        # Draw HUD Box
        cv2.rectangle(overlay, (10, 10), (320, 150), (0, 0, 0), -1)
        cv2.addWeighted(overlay, 0.6, frame, 0.4, 0, frame)

        # Draw HUD Text
        font = cv2.FONT_HERSHEY_SIMPLEX
        cv2.putText(frame, "[CV MOCK DETECTOR]", (20, 35), font, 0.6, (255, 255, 255), 1)
        cv2.putText(frame, f"Smoke Score:  {self.smoke_score:.2f}", (20, 65), font, 0.5, (255,100,100) if self.smoke_score > 0.5 else (255, 255, 255), 1)
        cv2.putText(frame, f"People Count: {self.people_count}", (20, 90), font, 0.5, (255, 255, 255), 1)
        cv2.putText(frame, f"Exit Blocked: {'YES' if self.exit_blocked else 'NO'}", (20, 115), font, 0.5, (0, 0, 255) if self.exit_blocked else (255, 255, 255), 1)
        cv2.putText(frame, f"Water Level:  {self.water_level:.2f}m", (20, 140), font, 0.5, (255, 150, 0) if self.water_level>0.5 else (255, 255, 255), 1)

        # Controls text at bottom
        h, w, _ = frame.shape
        cv2.rectangle(frame, (0, h - 30), (w, h), (0, 0, 0), -1)
        cv2.putText(frame, "Controls: [S]moke  [P]eople++  [O]eople--  [E]xit Toggle  [W]ater  [C]lear", (10, h - 10), font, 0.4, (200, 200, 200), 1)

        return {
            "smoke_score": self.smoke_score,
            "people_count": self.people_count,
            "exit_blocked": self.exit_blocked,
            "water_level": self.water_level
        }

    def handle_keyboard(self, key):
        """
        Modifies the detector state based on keyboard input to simulate CV triggering.
        """
        if key == ord('s'):
            self.smoke_score = min(1.0, self.smoke_score + 0.2)
        elif key == ord('p'):
            self.people_count += 5
        elif key == ord('o'):
            self.people_count = max(0, self.people_count - 5)
        elif key == ord('e'):
            self.exit_blocked = not self.exit_blocked
        elif key == ord('w'):
            self.water_level = min(2.0, self.water_level + 0.2)
        elif key == ord('c'):
            self.smoke_score = 0.0
            self.people_count = 5
            self.exit_blocked = False
            self.water_level = 0.0

