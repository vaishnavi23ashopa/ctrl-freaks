// wellness-monitor.js
class WellnessMonitor {
    constructor() {
      // Core properties
      this.video = document.getElementById("webcam")
      this.canvas = document.getElementById("webcam-overlay")
      this.ctx = this.canvas.getContext("2d")
      this.isRunning = false
      this.lastBlink = Date.now()
      this.blinkCount = 0
      this.lastDrowsinessCheck = Date.now()
      this.isDrowsy = false
      this.drowsinessNotified = false
      this.drowsyStartTime = null
  
      // Session properties
      this.sessionActive = false
      this.sessionStartTime = null
      this.screenTime = 0
      this.sessionTimer = null
      this.breakReminded = false
      this.stressLevel = "Low"
  
      // UI elements
      this.sessionStateElement = document.getElementById("session-state")
      this.sessionTimeElement = document.getElementById("session-time")
      this.sessionIndicator = document.querySelector(".session-indicator")
      this.startSessionBtn = document.getElementById("start-session-btn")
      this.endSessionBtn = document.getElementById("end-session-btn")
      this.startMonitoringBtn = document.getElementById("start-monitoring")
      this.stopMonitoringBtn = document.getElementById("stop-monitoring")
  
      // Initialize notification elements
      this.wellnessNotification = document.querySelector(".wellness-notification")
      this.notificationTitle = this.wellnessNotification.querySelector(".notification-content h4")
      this.notificationText = this.wellnessNotification.querySelector(".notification-content p")
  
      // Set up event listeners
      this.setupEventListeners()
  
      // Start tracking screen time immediately
      this.startScreenTimeTracking()
    }
  
    setupEventListeners() {
      // Session control buttons
      this.startSessionBtn.addEventListener("click", () => this.startSession())
      this.endSessionBtn.addEventListener("click", () => this.endSession())
  
      // Monitoring control buttons
      this.startMonitoringBtn.addEventListener("click", () => this.startDrowsinessMonitoring())
      this.stopMonitoringBtn.addEventListener("click", () => this.stopDrowsinessMonitoring())
  
      // Notification buttons
      const dismissBtn = this.wellnessNotification.querySelector(".btn-outline")
      dismissBtn.addEventListener("click", () => {
        this.wellnessNotification.classList.add("hidden")
      })
  
      const viewExercisesBtn = this.wellnessNotification.querySelector(".btn:not(.btn-outline)")
      viewExercisesBtn.addEventListener("click", () => {
        this.showExercises()
        this.wellnessNotification.classList.add("hidden")
      })
    }
  
    startScreenTimeTracking() {
      // Track screen time even without an active session
      this.screenTimeStarted = Date.now()
      setInterval(() => {
        const elapsedSeconds = Math.floor((Date.now() - this.screenTimeStarted) / 1000)
        const hours = Math.floor(elapsedSeconds / 3600)
        const minutes = Math.floor((elapsedSeconds % 3600) / 60)
  
        // Update screen time display
        const screenTimeElement = document.getElementById("screen-time")
        if (screenTimeElement) {
          screenTimeElement.textContent = `${hours}h ${minutes}m`
        }
  
        // Check for break reminder based on screen time
        if (elapsedSeconds > 45 * 60 && !this.breakReminded) {
          this.showBreakNotification()
          this.breakReminded = true
  
          // Reset break reminder after 15 minutes
          setTimeout(
            () => {
              this.breakReminded = false
            },
            15 * 60 * 1000,
          )
        }
      }, 1000)
    }
  
    startSession() {
      if (this.sessionActive) return
  
      // Check if camera permission was already granted
      if (localStorage.getItem("cameraPermissionChoice") === "granted") {
        this.startSessionWithMonitoring()
      } else {
        // Show camera permission dialog
        const permissionDialog = document.getElementById("camera-permission-dialog")
        permissionDialog.style.display = "flex"
  
        // Wait for user response
        const allowBtn = document.getElementById("allow-camera")
        const denyBtn = document.getElementById("deny-camera")
  
        const allowHandler = () => {
          permissionDialog.style.display = "none"
          localStorage.setItem("cameraPermissionChoice", "granted")
          this.startSessionWithMonitoring()
          allowBtn.removeEventListener("click", allowHandler)
          denyBtn.removeEventListener("click", denyHandler)
        }
  
        const denyHandler = () => {
          permissionDialog.style.display = "none"
          localStorage.setItem("cameraPermissionChoice", "denied")
          this.startTimerBasedSession()
          allowBtn.removeEventListener("click", allowHandler)
          denyBtn.removeEventListener("click", denyHandler)
        }
  
        allowBtn.addEventListener("click", allowHandler)
        denyBtn.addEventListener("click", denyHandler)
      }
    }
  
    startSessionWithMonitoring() {
      this.sessionActive = true
      this.sessionStartTime = Date.now()
      this.screenTime = 0
      this.blinkCount = 0
      this.breakReminded = false
      this.drowsinessNotified = false
  
      // Update UI
      this.sessionStateElement.textContent = "Session Active"
      this.sessionIndicator.classList.remove("offline")
      this.sessionIndicator.classList.add("online")
      this.startSessionBtn.style.display = "none"
      this.endSessionBtn.style.display = "block"
  
      // Start session timer
      this.sessionTimer = setInterval(() => this.updateSessionTime(), 1000)
  
      // Start monitoring
      this.startDrowsinessMonitoring()
  
      // Update wellness metrics
      this.updateWellnessMetrics()
  
      // Show session started notification
      this.showNotification(
        "Study Session Started",
        "We'll monitor for signs of stress, fatigue, and drowsiness and remind you to take breaks.",
      )
    }
  
    startTimerBasedSession() {
      // Fallback to timer-based session if camera access is denied
      this.sessionActive = true
      this.sessionStartTime = Date.now()
      this.screenTime = 0
      this.breakReminded = false
  
      // Update UI
      this.sessionStateElement.textContent = "Session Active (Timer Mode)"
      this.sessionIndicator.classList.remove("offline")
      this.sessionIndicator.classList.add("online")
      this.startSessionBtn.style.display = "none"
      this.endSessionBtn.style.display = "block"
  
      // Start session timer
      this.sessionTimer = setInterval(() => this.updateSessionTime(), 1000)
  
      // Setup timer-based notifications
      this.setupTimerBasedNotifications()
  
      // Show session started notification
      this.showNotification(
        "Study Session Started (Timer Mode)",
        "We'll provide timed break reminders to help maintain your wellness.",
      )
    }
  
    endSession() {
      if (!this.sessionActive) return
  
      this.sessionActive = false
      this.stopDrowsinessMonitoring()
  
      // Clear session timer
      clearInterval(this.sessionTimer)
  
      // Update UI
      this.sessionStateElement.textContent = "Session Inactive"
      this.sessionIndicator.classList.remove("online")
      this.sessionIndicator.classList.add("offline")
      this.startSessionBtn.style.display = "block"
      this.endSessionBtn.style.display = "none"
  
      // Calculate session statistics
      const sessionDuration = Math.floor((Date.now() - this.sessionStartTime) / 60000)
  
      // Show session ended notification
      this.showNotification("Study Session Ended", `You studied for ${this.formatTime(sessionDuration * 60)}. Great job!`)
    }
  
    updateSessionTime() {
      if (!this.sessionActive) return
  
      const elapsedSeconds = Math.floor((Date.now() - this.sessionStartTime) / 1000)
      this.screenTime = Math.floor(elapsedSeconds / 60)
  
      // Format time as HH:MM:SS
      this.sessionTimeElement.textContent = this.formatTime(elapsedSeconds)
  
      // Update wellness metrics
      this.updateWellnessMetrics()
  
      // Check for break notification in timer mode
      if (!this.isRunning && this.screenTime >= 45 && !this.breakReminded) {
        this.showBreakNotification()
        this.breakReminded = true
  
        // Reset break reminder after 15 minutes
        setTimeout(
          () => {
            this.breakReminded = false
          },
          15 * 60 * 1000,
        )
      }
    }
  
    formatTime(seconds) {
      const hours = Math.floor(seconds / 3600)
      const minutes = Math.floor((seconds % 3600) / 60)
      const secs = seconds % 60
  
      return [hours, minutes, secs].map((v) => (v < 10 ? "0" + v : v)).join(":")
    }
  
    async startDrowsinessMonitoring() {
      try {
        // Request camera access
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: 640, height: 480 },
        })
  
        this.video.srcObject = stream
        this.video.play()
  
        // Update UI
        this.startMonitoringBtn.style.display = "none"
        this.stopMonitoringBtn.style.display = "block"
  
        // Start monitoring
        this.isRunning = true
        this.monitorDrowsiness()
  
        // Show notification
        this.showNotification(
          "Drowsiness Monitoring Started",
          "We'll monitor for signs of drowsiness and alert you when needed.",
        )
      } catch (error) {
        console.error("Error accessing camera:", error)
        this.showNotification(
          "Camera Access Error",
          "Could not access your camera. Please check your permissions and try again.",
        )
      }
    }
  
    stopDrowsinessMonitoring() {
      this.isRunning = false
  
      // Stop camera
      if (this.video.srcObject) {
        const tracks = this.video.srcObject.getTracks()
        tracks.forEach((track) => track.stop())
        this.video.srcObject = null
      }
  
      // Clear canvas
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
  
      // Update UI
      this.startMonitoringBtn.style.display = "block"
      this.stopMonitoringBtn.style.display = "none"
  
      // Update drowsiness status
      document.getElementById("drowsiness-status").textContent = "Not Monitored"
      document.getElementById("drowsiness-progress").style.width = "0%"
    }
  
    async monitorDrowsiness() {
      if (!this.isRunning) return
  
      try {
        // Capture current frame
        this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height)
  
        // Convert canvas to base64 image
        const imageData = this.canvas.toDataURL("image/jpeg", 0.7)
  
        // Send to backend for drowsiness detection
        const response = await fetch("/api/detect_drowsiness", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ image: imageData }),
        })
  
        if (response.ok) {
          const result = await response.json()
  
          // Update UI with results
          this.updateDrowsinessUI(result)
  
          // Check for drowsiness
          if (result.drowsy && !this.drowsinessNotified) {
            this.showDrowsinessNotification()
            this.drowsinessNotified = true
  
            // Reset drowsiness notification flag after 2 minutes
            setTimeout(
              () => {
                this.drowsinessNotified = false
              },
              2 * 60 * 1000,
            )
          }
        }
  
        // Continue monitoring
        requestAnimationFrame(() => this.monitorDrowsiness())
      } catch (error) {
        console.error("Error in drowsiness monitoring:", error)
  
        // Continue monitoring despite errors
        setTimeout(() => {
          if (this.isRunning) {
            requestAnimationFrame(() => this.monitorDrowsiness())
          }
        }, 1000)
      }
    }
  
    updateDrowsinessUI(result) {
      // Update drowsiness status
      const drowsinessStatus = document.getElementById("drowsiness-status")
      const drowsinessProgress = document.getElementById("drowsiness-progress")
  
      if (result.status === "NO_FACE_DETECTED") {
        drowsinessStatus.textContent = "No Face Detected"
        drowsinessProgress.style.width = "0%"
        drowsinessProgress.style.backgroundColor = "var(--muted)"
      } else if (result.drowsy) {
        drowsinessStatus.textContent = "Drowsy"
        drowsinessProgress.style.width = "90%"
        drowsinessProgress.style.backgroundColor = "var(--danger)"
  
        // Draw red border on canvas to indicate drowsiness
        this.ctx.strokeStyle = "red"
        this.ctx.lineWidth = 5
        this.ctx.strokeRect(0, 0, this.canvas.width, this.canvas.height)
  
        // Check if drowsy for 5 seconds
        if (!this.drowsyStartTime) {
          this.drowsyStartTime = Date.now()
        } else if (Date.now() - this.drowsyStartTime >= 5000) {
          // Alert after 5 seconds of continuous drowsiness
          alert("WARNING: Drowsiness detected for 5 seconds!")
          // Reset timer after alert
          this.drowsyStartTime = null
        }
      } else {
        drowsinessStatus.textContent = "Alert"
        drowsinessProgress.style.width = "25%"
        drowsinessProgress.style.backgroundColor = "var(--success)"
  
        // Reset drowsy timer when alert
        this.drowsyStartTime = null
      }
  
      // Update stress level based on EAR
      if (result.ear) {
        let stressLevel = "Low"
        if (result.ear < 0.2) {
          stressLevel = "High"
        } else if (result.ear < 0.25) {
          stressLevel = "Moderate"
        }
  
        this.stressLevel = stressLevel
        this.updateWellnessMetrics()
      }
    }
  
    showDrowsinessNotification() {
      this.showNotification(
        "Drowsiness Detected",
        "You appear to be drowsy. Consider taking a short break, getting some fresh air, or having a glass of water.",
      )
  
      // Play alert sound
      const alertSound = document.getElementById("alert-sound")
      if (alertSound) {
        alertSound.play().catch((e) => console.log("Could not play alert sound", e))
      }
    }
  
    showBreakNotification() {
      this.showNotification(
        "Time for a break!",
        `You've been studying for ${this.screenTime} minutes. Consider taking a short break and doing some eye exercises.`,
      )
    }
  
    showStressNotification() {
      this.showNotification(
        "Signs of stress detected",
        "We noticed signs of stress or fatigue. Consider taking a short break, doing some stretching exercises, or practicing deep breathing.",
      )
    }
  
    showNotification(title, message) {
      this.notificationTitle.textContent = title
      this.notificationText.textContent = message
      this.wellnessNotification.classList.remove("hidden")
    }
  
    showExercises() {
      // Navigate to the wellness tab
      const wellnessTab = document.querySelector('[data-tab="wellness"]')
      if (wellnessTab) {
        wellnessTab.click()
      }
    }
  
    updateWellnessMetrics() {
      // Update stress level display
      const stressElement = document.getElementById("stress-level")
      if (stressElement) {
        stressElement.textContent = this.stressLevel
  
        // Update stress progress bar
        const stressProgress = document.getElementById("stress-progress")
        if (stressProgress) {
          let width = 25 // Default for Low
          if (this.stressLevel === "Moderate") width = 60
          if (this.stressLevel === "High") width = 90
          stressProgress.style.width = `${width}%`
  
          // Change color based on stress level
          stressProgress.style.backgroundColor =
            this.stressLevel === "Low"
              ? "var(--success)"
              : this.stressLevel === "Moderate"
                ? "var(--warning)"
                : "var(--danger)"
        }
      }
    }
  
    setupTimerBasedNotifications() {
      // Show break notification every 45 minutes
      const breakInterval = setInterval(() => {
        if (!this.sessionActive) {
          clearInterval(breakInterval)
          return
        }
  
        if (this.screenTime >= 45 && !this.breakReminded) {
          this.showBreakNotification()
          this.breakReminded = true
  
          // Reset break reminder after 15 minutes
          setTimeout(
            () => {
              this.breakReminded = false
            },
            15 * 60 * 1000,
          )
        }
      }, 60 * 1000) // Check every minute
  
      // Simulate stress detection occasionally
      const stressInterval = setInterval(
        () => {
          if (!this.sessionActive) {
            clearInterval(stressInterval)
            return
          }
  
          if (Math.random() < 0.3) {
            // 30% chance every 15 minutes
            this.stressLevel = Math.random() < 0.5 ? "Moderate" : "High"
            this.showStressNotification()
          } else {
            this.stressLevel = "Low"
          }
          this.updateWellnessMetrics()
        },
        15 * 60 * 1000,
      )
  
      // Simulate drowsiness detection occasionally
      const drowsinessInterval = setInterval(
        () => {
          if (!this.sessionActive) {
            clearInterval(drowsinessInterval)
            return
          }
  
          if (Math.random() < 0.2 && !this.drowsinessNotified) {
            // 20% chance every 10 minutes
            this.isDrowsy = true
            this.showDrowsinessNotification()
            this.drowsinessNotified = true
  
            // Reset drowsiness notification flag after 2 minutes
            setTimeout(() => {
              this.drowsinessNotified = false
            }, 2 * 1000)
          } else {
            this.isDrowsy = false
          }
        },
        10 * 60 * 1000,
      )
    }
  }
  
  // Initialize the wellness monitor when the page is loaded
  document.addEventListener("DOMContentLoaded", () => {
    // Show camera permission dialog on page load
    const permissionDialog = document.getElementById("camera-permission-dialog")
    permissionDialog.style.display = "flex"
  
    const allowBtn = document.getElementById("allow-camera")
    const denyBtn = document.getElementById("deny-camera")
  
    allowBtn.addEventListener("click", () => {
      localStorage.setItem("cameraPermissionChoice", "granted")
      permissionDialog.style.display = "none"
    })
  
    denyBtn.addEventListener("click", () => {
      localStorage.setItem("cameraPermissionChoice", "denied")
      permissionDialog.style.display = "none"
    })
  
    // Initialize the wellness monitor
    const wellnessMonitor = new WellnessMonitor()
  })