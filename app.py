from flask import Flask, jsonify, request, send_from_directory
import cv2
import dlib
import numpy as np
from scipy.spatial import distance as dist
import base64
from io import BytesIO
from PIL import Image
import time
import os
from flask_cors import CORS

app = Flask(__name__, static_folder='static')
CORS(app)  # Enable CORS for all routes

# Check if shape predictor file exists, if not, inform the user
predictor_path = "shape_predictor_68_face_landmarks.dat"
if not os.path.exists(predictor_path):
    print(f"ERROR: {predictor_path} not found!")
    print("Please download it from: https://github.com/davisking/dlib-models/raw/master/shape_predictor_68_face_landmarks.dat.bz2")
    print("Then extract it to the same directory as this script.")

# Load Dlib's face detector and landmark predictor
detector = dlib.get_frontal_face_detector()
try:
    predictor = dlib.shape_predictor(predictor_path)
    print("Successfully loaded facial landmark predictor")
except Exception as e:
    print(f"Error loading predictor: {e}")

# Function to calculate Eye Aspect Ratio (EAR)
def eye_aspect_ratio(eye):
    A = dist.euclidean(eye[1], eye[5])  
    B = dist.euclidean(eye[2], eye[4])  
    C = dist.euclidean(eye[0], eye[3])  
    return (A + B) / (2.0 * C)

# Improved pupil detection function
def detect_pupil_position(eye_region, eye_landmarks):
    try:
        eye_gray = cv2.cvtColor(eye_region, cv2.COLOR_BGR2GRAY)

        # Increase contrast
        eye_gray = cv2.equalizeHist(eye_gray)

        # Adaptive thresholding for robustness
        thresh = cv2.adaptiveThreshold(eye_gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
                                    cv2.THRESH_BINARY_INV, 11, 3)

        # Morphological operations to remove noise
        kernel = np.ones((3, 3), np.uint8)
        thresh = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, kernel, iterations=2)

        # Find contours of the pupil
        contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        if contours:
            largest_contour = max(contours, key=cv2.contourArea)
            if cv2.contourArea(largest_contour) > 10:  # Minimum area check
                ellipse = cv2.fitEllipse(largest_contour)  # Fit an ellipse to the pupil
                cx, cy = int(ellipse[0][0]), int(ellipse[0][1])

                # Get eye width
                eye_width = eye_landmarks[3][0] - eye_landmarks[0][0]
                if eye_width > 0:
                    # Normalize pupil position based on eye width
                    position_ratio = cx / eye_width

                    if position_ratio < 0.35:
                        return "LEFT"
                    elif position_ratio > 0.65:
                        return "RIGHT"
                    else:
                        return "CENTER"

        return "UNKNOWN"
    except Exception as e:
        print(f"Error in pupil detection: {e}")
        return "ERROR"

# Blink Detection Constants
EAR_THRESHOLD = 0.23  
BLINK_MIN_FRAMES = 3  
DROWSY_TIME = 5  

# Serve static files
@app.route('/')
def index():
    return send_from_directory('static', 'index.html')

@app.route('/<path:path>')
def static_files(path):
    return send_from_directory('static', path)

@app.route('/api/detect_drowsiness', methods=['POST'])
def detect_drowsiness():
    try:
        data = request.get_json()
        image_data = data['image'].split(',')[1]  # Remove the data:image/jpeg;base64, part

        img_data = base64.b64decode(image_data)
        img = Image.open(BytesIO(img_data))
        img = np.array(img)
        img = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)  # Convert from RGB to BGR

        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        faces = detector(gray)

        result = {
            "status": "NO_FACE_DETECTED",
            "blink_count": 0,
            "ear": 0,
            "left_eye_pos": "UNKNOWN",
            "right_eye_pos": "UNKNOWN",
            "drowsy": False
        }

        if len(faces) > 0:
            face = faces[0]  # Process the first face
            landmarks = predictor(gray, face)

            # Extract eye landmarks
            left_eye = np.array([(landmarks.part(n).x, landmarks.part(n).y) for n in range(42, 48)])
            right_eye = np.array([(landmarks.part(n).x, landmarks.part(n).y) for n in range(36, 42)])

            # Calculate EAR
            left_ear = eye_aspect_ratio(left_eye)
            right_ear = eye_aspect_ratio(right_eye)
            avg_ear = (left_ear + right_ear) / 2.0

            # Detect pupil position
            try:
                left_eye_region = img[min(left_eye[:,1]):max(left_eye[:,1]), min(left_eye[:,0]):max(left_eye[:,0])]
                right_eye_region = img[min(right_eye[:,1]):max(right_eye[:,1]), min(right_eye[:,0]):max(right_eye[:,0])]

                left_eye_pos = detect_pupil_position(left_eye_region, left_eye)
                right_eye_pos = detect_pupil_position(right_eye_region, right_eye)
            except Exception as e:
                print(f"Error extracting eye regions: {e}")
                left_eye_pos = "ERROR"
                right_eye_pos = "ERROR"

            # Determine if drowsy
            drowsy = avg_ear < EAR_THRESHOLD

            result = {
                "status": "FACE_DETECTED",
                "ear": float(avg_ear),
                "left_eye_pos": left_eye_pos,
                "right_eye_pos": right_eye_pos,
                "drowsy": drowsy
            }

        return jsonify(result)

    except Exception as e:
        print(f"Error in drowsiness detection: {e}")
        return jsonify({"error": str(e), "status": "ERROR"}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
