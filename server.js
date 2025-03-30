const express = require("express")
const tf = require("@tensorflow/tfjs-node")
const cors = require("cors")

const app = express()
const port = 3001

app.use(cors())
app.use(express.json())

let model

async function loadModel() {
  try {
    model = await tf.loadLayersModel("file://model/model.json")
    console.log("Model loaded successfully")
  } catch (error) {
    console.error("Error loading model:", error)
  }
}

loadModel()

// Endpoint for drowsiness detection
app.post("/api/detect-drowsiness", async (req, res) => {
  try {
    const { landmarks } = req.body

    if (!landmarks || !Array.isArray(landmarks)) {
      return res.status(400).json({ error: "Invalid landmarks data" })
    }

    // Flatten landmarks into a 1D array
    const flattenedLandmarks = []
    for (const point of landmarks) {
      flattenedLandmarks.push(point.x, point.y)
    }

    // Make prediction
    const inputTensor = tf.tensor2d([flattenedLandmarks])
    const prediction = model.predict(inputTensor)
    const result = await prediction.data()

    // Get drowsiness probability (second class)
    const drowsinessProbability = result[1]

    // Calculate eye aspect ratio (EAR) for drowsiness detection
    const leftEyeEAR = calculateEAR(landmarks, "left")
    const rightEyeEAR = calculateEAR(landmarks, "right")
    const avgEAR = (leftEyeEAR + rightEyeEAR) / 2

    // Calculate head pose for additional drowsiness indicators
    const headPose = calculateHeadPose(landmarks)

    // Determine if user is drowsy based on multiple factors
    const isDrowsy = drowsinessProbability > 0.7 || avgEAR < 0.2 || headPose.nodding

    // Calculate stress level
    const stressLevel = calculateStressLevel(flattenedLandmarks)

    // Cleanup tensors
    inputTensor.dispose()
    prediction.dispose()

    // Return result with detailed information
    res.json({
      drowsinessProbability,
      eyeAspectRatio: avgEAR,
      headPose,
      isDrowsy,
      stressLevel,
      recommendations: isDrowsy
        ? ["Take a short break", "Get some fresh air", "Drink water", "Do some stretching exercises"]
        : [],
    })
  } catch (error) {
    console.error("Error detecting drowsiness:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Helper function to calculate Eye Aspect Ratio
function calculateEAR(landmarks, eyeSide) {
  // In a real implementation, you would use the actual landmark indices for eye points
  // This is a simplified placeholder implementation
  const eyePoints =
    eyeSide === "left"
      ? [landmarks[33], landmarks[160], landmarks[158], landmarks[133], landmarks[153], landmarks[144]]
      : [landmarks[362], landmarks[385], landmarks[387], landmarks[263], landmarks[373], landmarks[380]]

  // Calculate vertical distance (height)
  const height1 = distance(eyePoints[1], eyePoints[5])
  const height2 = distance(eyePoints[2], eyePoints[4])

  // Calculate horizontal distance (width)
  const width = distance(eyePoints[0], eyePoints[3])

  // Calculate EAR
  return (height1 + height2) / (2 * width)
}

// Helper function to calculate distance between two points
function distance(point1, point2) {
  return Math.sqrt(Math.pow(point2.x - point1.x, 2) + Math.pow(point2.y - point1.y, 2))
}

// Helper function to calculate head pose
function calculateHeadPose(landmarks) {
  // In a real implementation, you would analyze the 3D orientation of the face
  // This is a simplified placeholder implementation
  return {
    nodding: Math.random() < 0.2, // Simulated nodding detection
    rotation: {
      pitch: Math.random() * 30 - 15, // -15 to 15 degrees
      yaw: Math.random() * 30 - 15, // -15 to 15 degrees
      roll: Math.random() * 20 - 10, // -10 to 10 degrees
    },
  }
}

// Placeholder function to calculate stress level
function calculateStressLevel(landmarks) {
  // In a real implementation, you would analyze facial expressions and other indicators
  // This is a simplified placeholder implementation
  return Math.random() * 10 // Returns a random stress level between 0 and 10
}

app.listen(port, () => {
  console.log(`Server listening on port ${port}`)
})

