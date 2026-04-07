import cv2
import numpy as np

# Available camera zones for multi-zone testing
CAMERA_ZONES = [
    {"id": "lobby_a", "name": "Main Lobby Camera A"},
    {"id": "kitchen", "name": "Kitchen Camera B"},
    {"id": "basement", "name": "Basement Camera C"},
    {"id": "pool", "name": "Pool Area Camera D"},
    {"id": "ballroom", "name": "Crystal Ballroom Camera E"},
]


class MockDetector:
    """
    A lightweight CV Mock Detector for Hackathons.
    It reads frames from the webcam and overlays a HUD.
    You can trigger computer-vision style 'detections' via the keyboard 
    to test the hysteresis and temporal aggregation layers downstream.
    
    Improvements:
    - Multi-zone support (Tab to switch)
    - Severity trend tracking (rising/stable/falling)
    - Better HUD with escalation indicators
    """
    def __init__(self):
        self.smoke_score = 0.0
        self.people_count = 5
        self.exit_blocked = False
        self.water_level = 0.0
        
        # State tracking
        self._prev_smoke = 0.0
        self._prev_water = 0.0
        self._current_zone = 0  # index into CAMERA_ZONES

    @property
    def zone(self):
        return CAMERA_ZONES[self._current_zone]

    @property
    def smoke_trend(self):
        if self.smoke_score > self._prev_smoke + 0.05:
            return "RISING"
        elif self.smoke_score < self._prev_smoke - 0.05:
            return "FALLING"
        return "STABLE"

    @property
    def water_trend(self):
        if self.water_level > self._prev_water + 0.05:
            return "RISING"
        elif self.water_level < self._prev_water - 0.05:
            return "FALLING"
        return "STABLE"

    def process_frame(self, frame):
        """
        Takes the raw webcam frame and overlays the current state.
        Returns signal dict for temporal buffer.
        """
        # Track trends
        self._prev_smoke = self.smoke_score
        self._prev_water = self.water_level
        
        overlay = frame.copy()
        
        # Determine overall hazard level for color coding
        is_hazard = self.smoke_score > 0.5 or self.exit_blocked or self.water_level > 0.5
        is_warning = self.smoke_score > 0.2 or self.water_level > 0.2
        
        # Border color based on severity
        if is_hazard:
            border_color = (0, 0, 255)  # Red
        elif is_warning:
            border_color = (0, 165, 255)  # Orange
        else:
            border_color = (0, 255, 0)  # Green
        
        # Draw hazard border around frame
        h, w, _ = frame.shape
        cv2.rectangle(frame, (0, 0), (w-1, h-1), border_color, 3)
        
        # Draw HUD Box (larger, more info)
        cv2.rectangle(overlay, (10, 10), (360, 200), (0, 0, 0), -1)
        cv2.addWeighted(overlay, 0.65, frame, 0.35, 0, frame)

        font = cv2.FONT_HERSHEY_SIMPLEX
        
        # Zone indicator
        zone_name = self.zone["name"]
        cv2.putText(frame, f"[{zone_name}]", (20, 35), font, 0.55, (0, 200, 255), 1)
        
        # Smoke score with trend
        smoke_color = (0, 0, 255) if self.smoke_score > 0.5 else (255, 100, 100) if self.smoke_score > 0.2 else (255, 255, 255)
        smoke_bar_w = int(self.smoke_score * 120)
        cv2.putText(frame, f"Smoke:  {self.smoke_score:.2f} [{self.smoke_trend}]", (20, 60), font, 0.45, smoke_color, 1)
        cv2.rectangle(frame, (220, 48), (220 + smoke_bar_w, 62), smoke_color, -1)
        cv2.rectangle(frame, (220, 48), (340, 62), (100, 100, 100), 1)
        
        # People count
        people_color = (0, 150, 255) if self.people_count > 30 else (255, 255, 255)
        cv2.putText(frame, f"People: {self.people_count}", (20, 85), font, 0.45, people_color, 1)
        
        # Exit blocked
        exit_color = (0, 0, 255) if self.exit_blocked else (0, 200, 0)
        exit_text = "BLOCKED" if self.exit_blocked else "CLEAR"
        cv2.putText(frame, f"Exit:   {exit_text}", (20, 110), font, 0.45, exit_color, 1)
        if self.exit_blocked:
            cv2.putText(frame, "!!!", (180, 110), font, 0.5, (0, 0, 255), 2)
        
        # Water level with trend
        water_color = (255, 100, 0) if self.water_level > 0.5 else (255, 180, 80) if self.water_level > 0.2 else (255, 255, 255)
        water_bar_w = int(min(self.water_level / 2.0, 1.0) * 120)
        cv2.putText(frame, f"Water:  {self.water_level:.2f}m [{self.water_trend}]", (20, 135), font, 0.45, water_color, 1)
        cv2.rectangle(frame, (220, 123), (220 + water_bar_w, 137), water_color, -1)
        cv2.rectangle(frame, (220, 123), (340, 137), (100, 100, 100), 1)
        
        # Overall severity indicator
        severity = self._compute_severity()
        sev_label = "CRITICAL" if severity > 7 else "HIGH" if severity > 5 else "MODERATE" if severity > 3 else "LOW"
        sev_color = (0, 0, 255) if severity > 7 else (0, 100, 255) if severity > 5 else (0, 200, 255) if severity > 3 else (0, 200, 0)
        cv2.putText(frame, f"Severity: {severity:.1f}/10 [{sev_label}]", (20, 165), font, 0.5, sev_color, 2)
        
        # Escalation warning
        if severity > 7:
            # Flashing effect
            if int(cv2.getTickCount() / cv2.getTickFrequency() * 2) % 2 == 0:
                cv2.putText(frame, "CRITICAL ALERT", (w // 2 - 120, 40), font, 0.9, (0, 0, 255), 3)

        # Controls text at bottom
        cv2.rectangle(frame, (0, h - 35), (w, h), (0, 0, 0), -1)
        cv2.putText(frame, "[S]moke [P]eople+ [O]eople-  [E]xit  [W]ater  [C]lear  [Tab]Zone  [Q]uit", (10, h - 12), font, 0.35, (200, 200, 200), 1)

        return {
            "smoke_score": self.smoke_score,
            "people_count": self.people_count,
            "exit_blocked": self.exit_blocked,
            "water_level": self.water_level,
        }

    def _compute_severity(self):
        """Overall severity score (0-10) for HUD display."""
        score = 0
        score += min(self.smoke_score * 10, 10) * 0.35
        score += min(self.people_count / 50 * 10, 10) * 0.2
        score += (8 if self.exit_blocked else 0) * 0.2
        score += min(self.water_level * 5, 10) * 0.25
        return round(min(score, 10), 1)

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
        elif key == 9:  # Tab key
            self._current_zone = (self._current_zone + 1) % len(CAMERA_ZONES)
            print(f"📷 Switched to zone: {self.zone['name']}")
