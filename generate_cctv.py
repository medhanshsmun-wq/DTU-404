import cv2
import numpy as np
import os

os.makedirs('frontend/public/cctv', exist_ok=True)

def generate_video(filename, text, is_incident=False):
    width, height = 640, 480
    fps = 10
    duration = 5
    out = cv2.VideoWriter(filename, cv2.VideoWriter_fourcc(*'mp4v'), fps, (width, height))
    
    for i in range(fps * duration):
        # Generate grainy noise
        frame = np.random.randint(0, 50, (height, width, 3), dtype=np.uint8)
        
        # Add a subtle moving "subject"
        x = int(100 + (i * 5) % 400)
        y = 240
        if is_incident:
            # "Incident" = red box moving
            cv2.rectangle(frame, (x, y), (x+50, y+50), (0, 0, 255), 2)
            cv2.putText(frame, "INCIDENT DETECTED", (x-20, y-10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 1)
        else:
            # "Normal" = green box moving
            cv2.rectangle(frame, (x, y), (x+50, y+50), (0, 255, 0), 2)
            
        # Timestamp
        cv2.putText(frame, text, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
        
        out.write(frame)
        
    out.release()

generate_video('frontend/public/cctv/cam01_normal.mp4', 'CAM 01 - LOBBY (NORMAL)', False)
generate_video('frontend/public/cctv/cam07_incident.mp4', 'CAM 07 - POOL (INCIDENT)', True)
print("Videos generated successfully.")
