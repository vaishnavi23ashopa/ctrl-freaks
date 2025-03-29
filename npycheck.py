import os
import face_recognition
import numpy as np
import cv2

# Path to dataset folder
DATASET_PATH = "Faces_datasets"
ENCODINGS_FILE = "face_encodings.npy"

# List to store encodings and names
known_encodings = []
known_names = []

# Loop through each person's folder
for person_name in os.listdir(DATASET_PATH):
    person_folder = os.path.join(DATASET_PATH, person_name)

    if os.path.isdir(person_folder):  # Ensure it's a folder
        for image_name in os.listdir(person_folder):
            image_path = os.path.join(person_folder, image_name)

            # Load and process the image
            image = face_recognition.load_image_file(image_path)
            face_encodings = face_recognition.face_encodings(image)

            if len(face_encodings) > 0:  # If a face is found
                known_encodings.append(face_encodings[0])  # Save first face encoding
                known_names.append(person_name)

# Save the encodings to a .npy file
np.save(ENCODINGS_FILE, {"encodings": known_encodings, "names": known_names})
print(f"✅ Encodings saved to {ENCODINGS_FILE}")
