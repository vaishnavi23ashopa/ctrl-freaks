import cv2
import numpy as np
cap = cv2. VideoCapture (0)
face_cascade = cv2.CascadeClassifier("haarcascade_frontalface_alt.xml")
skip=0
face_data=[]
dataset_path = "./face_dataset/"

file_name=input("enter the name of person: ")

while True:
    ret,frame = cap.read()
    gray_frame=cv2.cvtColor(frame,cv2.COLOR_BGR2GRAY)
    if ret==False:
        continue
        
    cv2.imshow("video frame",frame)
    key_pressed= cv2.waitKey(1) & 0xFF

    if key_pressed==ord('q'):
        break
cap.release()
cv2.destroyAllWindows()
