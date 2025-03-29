from flask import Flask, render_template
from flask_socketio import SocketIO
import cv2
import dlib
import numpy as np
import time
from scipy.spatial import distance as dist
from threading import Thread

app = Flask(__name__)
socketio = SocketIO(app)

# Load Dlib model
detector = dlib.get_frontal_face_detector()
predictor = dlib.shape_predictor("shape_predictor_68_face_landmarks.dat")

# Eye aspect ratio function
def eye_aspect_ratio(eye):
    A = dist.euclidean(eye[1], eye[5])
    B = dist.euclidean(eye[2], eye[4])
    C = dist.euclidean(eye[0], eye[3])
    return (A + B) / (2.0 * C)

# Eye indices
LEFT_EYE = list(range(42, 48))
RIGHT_EYE = list(range(36, 42))

# Constants
EAR_THRESHOLD = 0.22
DROWSINESS_THRESHOLD = 5  # Seconds

def eye_tracking():
    cap = cv2.VideoCapture(0)
    eyes_closed_time = None

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = detector(gray)

        for face in faces:
            landmarks = predictor(gray, face)

            left_eye = np.array([(landmarks.part(n).x, landmarks.part(n).y) for n in LEFT_EYE])
            right_eye = np.array([(landmarks.part(n).x, landmarks.part(n).y) for n in RIGHT_EYE])

            left_ear, right_ear = eye_aspect_ratio(left_eye), eye_aspect_ratio(right_eye)
            avg_ear = (left_ear + right_ear) / 2.0

            if avg_ear < EAR_THRESHOLD:
                if eyes_closed_time is None:
                    eyes_closed_time = time.time()
                elif (time.time() - eyes_closed_time) >= DROWSINESS_THRESHOLD:
                    socketio.emit("sleep_alert", {"message": "Wake up! You are sleeping!"})
            else:
                eyes_closed_time = None

        cv2.imshow("Eye Tracking", frame)
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()

# Start tracking in a separate thread
Thread(target=eye_tracking, daemon=True).start()

@app.route("/")
def index():
    return render_template("index.html")

if __name__ == "__main__":
    socketio.run(app, debug=True)
