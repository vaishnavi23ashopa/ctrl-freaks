import cv2
import dlib
import numpy as np
import time
from scipy.spatial import distance as dist
from collections import deque

# Load Dlib's face detector and landmark predictor
detector = dlib.get_frontal_face_detector()
predictor = dlib.shape_predictor("shape_predictor_68_face_landmarks.dat")

# Function to calculate Eye Aspect Ratio (EAR)
def eye_aspect_ratio(eye):
    A = dist.euclidean(eye[1], eye[5])  
    B = dist.euclidean(eye[2], eye[4])  
    C = dist.euclidean(eye[0], eye[3])  
    return (A + B) / (2.0 * C)

# Function to detect pupil position
def detect_pupil_position(eye_region, eye_landmarks):
    eye_gray = cv2.cvtColor(eye_region, cv2.COLOR_BGR2GRAY)
    _, thresh = cv2.threshold(eye_gray, 30, 255, cv2.THRESH_BINARY_INV)

    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    if contours:
        largest_contour = max(contours, key=cv2.contourArea)
        (cx, cy), radius = cv2.minEnclosingCircle(largest_contour)
        cx, cy = int(cx), int(cy)
        
        # Get eye width
        eye_width = eye_landmarks[3][0] - eye_landmarks[0][0]
        
        # Classify eye position based on pupil location
        if cx < eye_width * 0.35:
            return "LEFT"
        elif cx > eye_width * 0.65:
            return "RIGHT"
        else:
            return "CENTER"
    
    return "UNKNOWN"

# Indices for left and right eyes in facial landmarks
LEFT_EYE, RIGHT_EYE = list(range(42, 48)), list(range(36, 42))

# Blink Detection Constants
EAR_THRESHOLD = 0.23   # Set to a reasonable default
BLINK_MIN_FRAMES = 3   # Frames required for a blink
DROWSY_TIME = 5        # Time in seconds before drowsiness is detected

# Blink tracking variables
blink_count = 0
frame_counter = 0
eyes_closed_time = None
ear_history = deque(maxlen=5)  # Use a 5-frame window to smooth EAR changes

# Start video capture
cap = cv2.VideoCapture(0)

while True:
    ret, frame = cap.read()
    if not ret:
        print("[ERROR] Cannot access webcam.")
        break

    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    faces = detector(gray)

    for face in faces:
        landmarks = predictor(gray, face)

        left_eye = np.array([(landmarks.part(n).x, landmarks.part(n).y) for n in LEFT_EYE])
        right_eye = np.array([(landmarks.part(n).x, landmarks.part(n).y) for n in RIGHT_EYE])

        left_ear, right_ear = eye_aspect_ratio(left_eye), eye_aspect_ratio(right_eye)
        avg_ear = (left_ear + right_ear) / 2.0

        # Smooth EAR value using a rolling average
        ear_history.append(avg_ear)
        smooth_ear = np.mean(ear_history)

        # Adjust EAR threshold dynamically
        dynamic_threshold = max(EAR_THRESHOLD * 0.9, 0.18)

        # Blink detection logic
        if smooth_ear < dynamic_threshold:
            if eyes_closed_time is None:
                eyes_closed_time = time.time()
            frame_counter += 1
        else:
            if frame_counter >= BLINK_MIN_FRAMES:
                blink_count += 1
            frame_counter = 0  # Reset blink counter
            eyes_closed_time = None  # Reset drowsiness timer

        # Detect drowsiness if eyes are closed for too long
        if eyes_closed_time and (time.time() - eyes_closed_time) > DROWSY_TIME:
            cv2.putText(frame, "DROWSINESS ALERT!", (50, 200), 
                        cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)

        # Detect eyeball movement
        left_eye_region = frame[min(left_eye[:,1]):max(left_eye[:,1]), min(left_eye[:,0]):max(left_eye[:,0])]
        right_eye_region = frame[min(right_eye[:,1]):max(right_eye[:,1]), min(right_eye[:,0]):max(right_eye[:,0])]

        left_eye_pos = detect_pupil_position(left_eye_region, left_eye)
        right_eye_pos = detect_pupil_position(right_eye_region, right_eye)

        # Draw eye bounding boxes
        cv2.polylines(frame, [left_eye], isClosed=True, color=(0, 255, 0), thickness=2)
        cv2.polylines(frame, [right_eye], isClosed=True, color=(0, 255, 0), thickness=2)

        # Display Blink Count and Eye Position
        cv2.putText(frame, f"Blinks: {blink_count}", (20, 50), 
                    cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 255), 2)
        cv2.putText(frame, f"Left Eye: {left_eye_pos}", (20, 100), 
                    cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 0), 2)
        cv2.putText(frame, f"Right Eye: {right_eye_pos}", (20, 150), 
                    cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 0), 2)

    cv2.imshow("Eye Tracking & Blink Detection", frame)

    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()



