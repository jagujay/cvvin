// ============================================================================
// HR Interview Analysis System - MediaPipe Edition
// Clean, modern implementation using MediaPipe for all tracking
// ============================================================================

console.log("🎯 HR Analysis System (MediaPipe Edition) Loading...");

document.addEventListener('DOMContentLoaded', () => {
    console.log("🔷 DOMContentLoaded - Starting initialization...");
    main().catch(error => {
        console.error("🔴 FATAL ERROR:", error);
        alert(`Initialization failed: ${error.message}`);
    });
});

// ============================================================================
// GLOBAL VARIABLES
// ============================================================================

// DOM Elements
let webcam, overlay, overlayCtx;
let startBtn, stopBtn, exportBtn;
let statusText, statusIndicator;

// MediaPipe Solutions
let faceMesh = null;
let hands = null;
let pose = null;

// Camera
let camera = null;

// Analysis State
let isAnalyzing = false;
let frameCount = 0;

// Performance
const TARGET_FPS = 30;
const FRAME_INTERVAL = 1000 / TARGET_FPS;
let lastFrameTime = 0;

// ============================================================================
// INITIALIZATION
// ============================================================================

async function main() {
    console.log("🚀 Initializing MediaPipe HR Analysis System...");
    
    try {
        // Step 1: Initialize DOM elements
        console.log("Step 1: Initializing DOM elements...");
        initializeDOMElements();
        console.log("✅ DOM elements ready");
        
        // Step 2: Setup event listeners
        console.log("Step 2: Setting up event listeners...");
        setupEventListeners();
        console.log("✅ Event listeners attached");
        
        // Step 3: Initialize visualization
        console.log("Step 3: Initializing visualization...");
        if (typeof window.visualization !== 'undefined') {
            window.visualization.init();
            updateStatus("Initializing MediaPipe...", "idle");
        }
        console.log("✅ Visualization ready");
        
        // Step 4: Start webcam
        console.log("Step 4: Starting webcam...");
        await setupWebcam();
        console.log("✅ Webcam ready");
        
        // Step 5: Initialize MediaPipe solutions
        console.log("Step 5: Initializing MediaPipe solutions...");
        await initializeMediaPipe();
        console.log("✅ MediaPipe ready");
        
        // Step 6: System ready
        updateStatus("Ready to start analysis", "idle");
        console.log("✅✅✅ System ready!");
        console.log("\n💡 Click 'Start Analysis' to begin tracking");
        
    } catch (error) {
        console.error("❌ Initialization error:", error);
        updateStatus(`Error: ${error.message}`, "warning");
        throw error;
    }
}

function initializeDOMElements() {
    // Video and canvas
    webcam = document.getElementById('webcam');
    overlay = document.getElementById('overlay');
    overlayCtx = overlay.getContext('2d');
    
    // Buttons
    startBtn = document.getElementById('startBtn');
    stopBtn = document.getElementById('stopBtn');
    exportBtn = document.getElementById('exportBtn');
    
    // Status
    statusText = document.getElementById('statusText');
    statusIndicator = document.getElementById('statusIndicator');
    
    console.log("   All DOM elements found");
}

function setupEventListeners() {
    startBtn.addEventListener('click', startAnalysis);
    stopBtn.addEventListener('click', stopAnalysis);
    exportBtn.addEventListener('click', exportReport);
    console.log("   Buttons connected");
}

// ============================================================================
// WEBCAM SETUP
// ============================================================================

async function setupWebcam() {
    try {
        console.log("   Requesting camera access...");
        
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                facingMode: 'user'
            }
        });
        
        webcam.srcObject = stream;
        
        await new Promise((resolve) => {
            webcam.onloadedmetadata = () => {
                resolve();
            };
        });
        
        // Set canvas size to match video
        overlay.width = webcam.videoWidth;
        overlay.height = webcam.videoHeight;
        
        console.log(`   Camera: ${webcam.videoWidth}x${webcam.videoHeight}`);
        
    } catch (error) {
        console.error("   Camera error:", error);
        throw new Error(`Could not access webcam: ${error.message}`);
    }
}

// ============================================================================
// MEDIAPIPE INITIALIZATION
// ============================================================================

async function initializeMediaPipe() {
    console.log("📦 Loading MediaPipe solutions...");
    
    // STEP 1: Initialize Face Mesh (for face, eyes, expressions)
    await initializeFaceMesh();
    
    // STEP 2: Initialize Hands (for hand tracking)
    await initializeHands();
    
    // STEP 3: Initialize Pose (for body language)
    await initializePose();
    
    console.log("✅ All MediaPipe solutions loaded!");
}

async function initializeFaceMesh() {
    console.log("   Initializing Face Mesh...");
    
    faceMesh = new FaceMesh({
        locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
        }
    });
    
    faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,  // Enables iris tracking
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
    });
    
    faceMesh.onResults(onFaceMeshResults);
    
    console.log("   ✅ Face Mesh ready (468 landmarks + iris tracking)");
}

async function initializeHands() {
    console.log("   Initializing Hand Tracking...");
    
    hands = new Hands({
        locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
        }
    });
    
    hands.setOptions({
        maxNumHands: 2,
        modelComplexity: 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
    });
    
    hands.onResults(onHandsResults);
    
    console.log("   ✅ Hand Tracking ready (up to 2 hands, 21 landmarks each)");
}

async function initializePose() {
    console.log("   Initializing Pose Tracking...");
    
    pose = new Pose({
        locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
        }
    });
    
    pose.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        enableSegmentation: false,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
    });
    
    pose.onResults(onPoseResults);
    
    console.log("   ✅ Pose Tracking ready (33 body landmarks)");
}

// ============================================================================
// MEDIAPIPE RESULT HANDLERS (Step-by-step implementation)
// ============================================================================

function onFaceMeshResults(results) {
    if (!isAnalyzing) return;
    
    if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
        const landmarks = results.multiFaceLandmarks[0];
        
        // Draw face mesh
        drawFaceMesh(landmarks);
        
        // Analyze face data
        analyzeFaceExpression(landmarks);
        analyzeEyeGaze(landmarks);
        analyzeHeadPose(landmarks);
        
        // Log periodically (every 30 frames = ~1 second)
        if (frameCount % 30 === 0) {
            console.log("👤 Face detected:", landmarks.length, "landmarks");
        }
    }
}

function onHandsResults(results) {
    if (!isAnalyzing) return;
    
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        // Draw hands
        results.multiHandLandmarks.forEach((handLandmarks, index) => {
            const handedness = results.multiHandedness[index].label;
            drawHand(handLandmarks, handedness);
        });
        
        // Analyze hand data
        analyzeHandActivity(results);
        
        // Log periodically
        if (frameCount % 30 === 0) {
            console.log("👋 Hands detected:", results.multiHandLandmarks.length);
        }
    }
}

function onPoseResults(results) {
    if (!isAnalyzing) return;
    
    if (results.poseLandmarks) {
        // Draw pose
        drawPose(results.poseLandmarks);
        
        // Analyze posture
        analyzePosture(results.poseLandmarks);
        
        // Log periodically
        if (frameCount % 30 === 0) {
            console.log("🧘 Pose detected");
        }
    }
}

// ============================================================================
// DRAWING FUNCTIONS (Visualization)
// ============================================================================

function drawFaceMesh(landmarks) {
    // Draw face mesh overlay
    overlayCtx.save();
    
    // Draw all landmarks as small dots
    overlayCtx.fillStyle = 'rgba(0, 255, 0, 0.5)';
    landmarks.forEach(landmark => {
        const x = landmark.x * overlay.width;
        const y = landmark.y * overlay.height;
        overlayCtx.beginPath();
        overlayCtx.arc(x, y, 1, 0, 2 * Math.PI);
        overlayCtx.fill();
    });
    
    overlayCtx.restore();
}

function drawHand(landmarks, handedness) {
    overlayCtx.save();
    
    // Draw hand landmarks
    overlayCtx.fillStyle = handedness === 'Left' ? 'rgba(255, 0, 0, 0.5)' : 'rgba(0, 0, 255, 0.5)';
    landmarks.forEach(landmark => {
        const x = landmark.x * overlay.width;
        const y = landmark.y * overlay.height;
        overlayCtx.beginPath();
        overlayCtx.arc(x, y, 3, 0, 2 * Math.PI);
        overlayCtx.fill();
    });
    
    overlayCtx.restore();
}

function drawPose(landmarks) {
    overlayCtx.save();
    
    // Draw key pose landmarks
    overlayCtx.fillStyle = 'rgba(255, 255, 0, 0.5)';
    [11, 12, 23, 24].forEach(index => {  // Shoulders and hips
        const landmark = landmarks[index];
        if (landmark) {
            const x = landmark.x * overlay.width;
            const y = landmark.y * overlay.height;
            overlayCtx.beginPath();
            overlayCtx.arc(x, y, 5, 0, 2 * Math.PI);
            overlayCtx.fill();
        }
    });
    
    overlayCtx.restore();
}

// ============================================================================
// ANALYSIS FUNCTIONS - Real Implementation
// ============================================================================

// Track metrics
let expressionData = { smile: 0, neutral: 0, stress: 0 };
let eyeContactData = { lookingAtCamera: 0, totalFrames: 0 };
let handActivityData = { visible: 0, movement: 0, lastPosition: null, fidgetCount: 0 };
let headPoseData = { forward: 0, away: 0 };
let postureData = { upright: 0, leaning: 0 };

// Update interval for overall scores
let scoreUpdateInterval = null;

function analyzeFaceExpression(landmarks) {
    try {
        // Key landmark indices for expression analysis
        const leftEyeTop = landmarks[159];
        const leftEyeBottom = landmarks[145];
        const rightEyeTop = landmarks[386];
        const rightEyeBottom = landmarks[374];
        const mouthLeft = landmarks[61];
        const mouthRight = landmarks[291];
        const mouthTop = landmarks[0];
        const mouthBottom = landmarks[17];
        const leftEyebrow = landmarks[70];
        const rightEyebrow = landmarks[300];
        
        // Calculate mouth aspect ratio (smile detection)
        const mouthWidth = Math.hypot(
            mouthRight.x - mouthLeft.x,
            mouthRight.y - mouthLeft.y
        );
        const mouthHeight = Math.hypot(
            mouthBottom.x - mouthTop.x,
            mouthBottom.y - mouthTop.y
        );
        const mouthRatio = mouthWidth / (mouthHeight + 0.001);
        
        // Calculate eye openness
        const leftEyeHeight = Math.hypot(
            leftEyeTop.x - leftEyeBottom.x,
            leftEyeTop.y - leftEyeBottom.y
        );
        const rightEyeHeight = Math.hypot(
            rightEyeTop.x - rightEyeBottom.x,
            rightEyeTop.y - rightEyeBottom.y
        );
        const avgEyeHeight = (leftEyeHeight + rightEyeHeight) / 2;
        
        // Determine expression
        let expression = "Neutral";
        let confidence = 0;
        
        if (mouthRatio > 3.5) {
            expression = "Smiling";
            confidence = Math.min((mouthRatio - 3.5) * 50, 100);
            expressionData.smile++;
        } else if (avgEyeHeight < 0.015) {
            expression = "Focused";
            confidence = 70;
        } else {
            expression = "Neutral";
            confidence = 60;
            expressionData.neutral++;
        }
        
        // Update dashboard
        updateMetric('expression', expression, `${confidence.toFixed(0)}% confidence`);
        
    } catch (error) {
        console.warn("Expression analysis error:", error);
    }
}

function analyzeEyeGaze(landmarks) {
    try {
        // Iris landmarks (when refineLandmarks: true)
        // Left iris: 468-472
        // Right iris: 473-477
        const leftIrisCenter = landmarks[468];
        const rightIrisCenter = landmarks[473];
        
        // Eye corner landmarks
        const leftEyeLeft = landmarks[33];
        const leftEyeRight = landmarks[133];
        const rightEyeLeft = landmarks[362];
        const rightEyeRight = landmarks[263];
        
        if (!leftIrisCenter || !rightIrisCenter) {
            return; // Iris not detected
        }
        
        // Calculate iris position relative to eye corners
        const leftIrisRatio = (leftIrisCenter.x - leftEyeLeft.x) / (leftEyeRight.x - leftEyeLeft.x);
        const rightIrisRatio = (rightIrisCenter.x - rightEyeLeft.x) / (rightEyeRight.x - rightEyeLeft.x);
        const avgIrisRatio = (leftIrisRatio + rightIrisRatio) / 2;
        
        // Determine if looking at camera (iris centered)
        const lookingAtCamera = avgIrisRatio > 0.35 && avgIrisRatio < 0.65;
        
        eyeContactData.totalFrames++;
        if (lookingAtCamera) {
            eyeContactData.lookingAtCamera++;
        }
        
        // Calculate percentage
        const eyeContactPct = (eyeContactData.lookingAtCamera / eyeContactData.totalFrames * 100).toFixed(0);
        
        // Determine gaze direction
        let gazeDirection = "Center";
        if (avgIrisRatio < 0.35) gazeDirection = "Left";
        else if (avgIrisRatio > 0.65) gazeDirection = "Right";
        
        // Update dashboard
        updateMetric('eyeContact', `${eyeContactPct}%`, `Looking ${gazeDirection}`);
        
    } catch (error) {
        console.warn("Eye gaze analysis error:", error);
    }
}

function analyzeHeadPose(landmarks) {
    try {
        // Key points for head orientation
        const noseTip = landmarks[1];
        const chin = landmarks[152];
        const foreheadCenter = landmarks[10];
        
        // Calculate head tilt
        const verticalDist = Math.abs(noseTip.y - foreheadCenter.y);
        const horizontalDeviation = Math.abs(noseTip.x - 0.5); // Deviation from center
        
        // Determine pose
        let pose = "Forward";
        let status = "Good posture";
        
        if (horizontalDeviation > 0.15) {
            pose = horizontalDeviation > 0 ? "Turned Right" : "Turned Left";
            status = "Looking away";
            headPoseData.away++;
        } else if (verticalDist < 0.15) {
            pose = "Looking Down";
            status = "Looking down";
            headPoseData.away++;
        } else {
            headPoseData.forward++;
        }
        
        // Update dashboard
        updateMetric('headPose', pose, status);
        
    } catch (error) {
        console.warn("Head pose analysis error:", error);
    }
}

function analyzeHandActivity(results) {
    try {
        const numHands = results.multiHandLandmarks ? results.multiHandLandmarks.length : 0;
        
        if (numHands === 0) {
            updateMetric('hand', 'No hands visible', 'Hands below frame');
            handActivityData.lastPosition = null;
            return;
        }
        
        handActivityData.visible++;
        
        // Calculate hand movement
        const firstHand = results.multiHandLandmarks[0];
        const wrist = firstHand[0];
        
        if (handActivityData.lastPosition) {
            const movement = Math.hypot(
                wrist.x - handActivityData.lastPosition.x,
                wrist.y - handActivityData.lastPosition.y
            );
            handActivityData.movement += movement;
            
            // Classify activity
            let activity = "Still";
            let status = "Low movement";
            
            if (movement > 0.05) {
                activity = "Active";
                status = "High movement";
            } else if (movement > 0.02) {
                activity = "Moderate";
                status = "Some movement";
            }
            
            // Check for fidgeting (rapid small movements)
            if (movement > 0.01 && movement < 0.03) {
                activity = "Fidgeting";
                status = "Nervous movements";
                handActivityData.fidgetCount++;
            }
            
            updateMetric('hand', `${numHands} hand${numHands > 1 ? 's' : ''} - ${activity}`, status);
        }
        
        handActivityData.lastPosition = { x: wrist.x, y: wrist.y, z: wrist.z };
        
        // Detect simple gestures
        detectHandGestures(firstHand, results.multiHandedness[0].label);
        
    } catch (error) {
        console.warn("Hand activity analysis error:", error);
    }
}

function detectHandGestures(landmarks, handedness) {
    try {
        // Finger tips and bases
        const thumb = landmarks[4];
        const indexTip = landmarks[8];
        const middleTip = landmarks[12];
        const ringTip = landmarks[16];
        const pinkyTip = landmarks[20];
        const indexBase = landmarks[5];
        const middleBase = landmarks[9];
        
        // Check if fingers are extended (tip higher than base)
        const indexExtended = indexTip.y < indexBase.y;
        const middleExtended = middleTip.y < middleBase.y;
        
        // Detect pointing (index extended, others not)
        if (indexExtended && !middleExtended) {
            console.log(`✋ Gesture detected: Pointing (${handedness} hand)`);
            if (window.behaviorMetrics) {
                window.behaviorMetrics.logBehavior('GESTURE', `Pointing gesture (${handedness} hand)`, 'neutral');
            }
        }
        
        // Detect open palm (all fingers extended)
        if (indexExtended && middleExtended) {
            console.log(`✋ Gesture detected: Open palm (${handedness} hand)`);
        }
        
    } catch (error) {
        // Gesture detection is optional
    }
}

function analyzePosture(landmarks) {
    try {
        // Key pose landmarks
        const leftShoulder = landmarks[11];
        const rightShoulder = landmarks[12];
        const leftHip = landmarks[23];
        const rightHip = landmarks[24];
        const nose = landmarks[0];
        
        if (!leftShoulder || !rightShoulder) {
            return; // Not enough visible
        }
        
        // Calculate shoulder alignment
        const shoulderAngle = Math.atan2(
            rightShoulder.y - leftShoulder.y,
            rightShoulder.x - leftShoulder.x
        );
        const shoulderTilt = Math.abs(shoulderAngle) * (180 / Math.PI);
        
        // Calculate forward lean (if hips visible)
        let posture = "Upright";
        let status = "Good posture";
        
        if (leftHip && rightHip) {
            const avgShoulderY = (leftShoulder.y + rightShoulder.y) / 2;
            const avgHipY = (leftHip.y + rightHip.y) / 2;
            const bodyLength = avgHipY - avgShoulderY;
            
            // Check if leaning forward (shoulders moved down significantly)
            if (bodyLength < 0.25) {
                posture = "Leaning Forward";
                status = "Engaged posture";
                postureData.leaning++;
            } else if (bodyLength > 0.35) {
                posture = "Leaning Back";
                status = "Relaxed posture";
                postureData.leaning++;
            } else {
                postureData.upright++;
            }
        }
        
        // Check shoulder tilt
        if (shoulderTilt > 10) {
            posture += " (tilted)";
            status = "Uneven posture";
        }
        
        // Update dashboard
        updateMetric('posture', posture, status);
        
    } catch (error) {
        console.warn("Posture analysis error:", error);
    }
}

// ============================================================================
// DASHBOARD UPDATE HELPER
// ============================================================================

function updateMetric(type, value, status) {
    try {
        switch(type) {
            case 'expression':
                const expValue = document.getElementById('expressionValue');
                const expStatus = document.getElementById('expressionStatus');
                if (expValue) expValue.textContent = value;
                if (expStatus) expStatus.textContent = status;
                break;
                
            case 'eyeContact':
                const eyeValue = document.getElementById('eyeContactValue');
                const eyeStatus = document.getElementById('eyeContactStatus');
                if (eyeValue) eyeValue.textContent = value;
                if (eyeStatus) eyeStatus.textContent = status;
                break;
                
            case 'hand':
                const handValue = document.getElementById('handValue');
                const handStatus = document.getElementById('handStatus');
                if (handValue) handValue.textContent = value;
                if (handStatus) handStatus.textContent = status;
                break;
                
            case 'headPose':
                const headValue = document.getElementById('headPoseValue');
                const headStatus = document.getElementById('headPoseStatus');
                if (headValue) headValue.textContent = value;
                if (headStatus) headStatus.textContent = status;
                break;
                
            case 'posture':
                const postureValue = document.getElementById('postureValue');
                const postureStatus = document.getElementById('postureStatus');
                if (postureValue) postureValue.textContent = value;
                if (postureStatus) postureStatus.textContent = status;
                break;
        }
    } catch (error) {
        // Dashboard update is optional
    }
}

// ============================================================================
// OVERALL SCORING SYSTEM
// ============================================================================

function calculateOverallScores() {
    try {
        // Calculate Engagement Score (0-100)
        // Based on: eye contact, head pose, expression
        let engagementScore = 0;
        
        if (eyeContactData.totalFrames > 0) {
            const eyeContactPct = (eyeContactData.lookingAtCamera / eyeContactData.totalFrames) * 100;
            engagementScore += eyeContactPct * 0.5; // 50% weight
        }
        
        const totalHeadFrames = headPoseData.forward + headPoseData.away;
        if (totalHeadFrames > 0) {
            const headForwardPct = (headPoseData.forward / totalHeadFrames) * 100;
            engagementScore += headForwardPct * 0.3; // 30% weight
        }
        
        const totalExpressionFrames = expressionData.smile + expressionData.neutral;
        if (totalExpressionFrames > 0) {
            const positiveExpressionPct = (expressionData.smile / totalExpressionFrames) * 100;
            engagementScore += positiveExpressionPct * 0.2; // 20% weight
        }
        
        // Calculate Confidence Score (0-100)
        // Based on: posture, expression, eye contact
        let confidenceScore = 0;
        
        const totalPostureFrames = postureData.upright + postureData.leaning;
        if (totalPostureFrames > 0) {
            const uprightPct = (postureData.upright / totalPostureFrames) * 100;
            confidenceScore += uprightPct * 0.4; // 40% weight
        }
        
        if (eyeContactData.totalFrames > 0) {
            const eyeContactPct = (eyeContactData.lookingAtCamera / eyeContactData.totalFrames) * 100;
            confidenceScore += eyeContactPct * 0.35; // 35% weight
        }
        
        if (totalExpressionFrames > 0) {
            const positiveExpressionPct = (expressionData.smile / totalExpressionFrames) * 100;
            confidenceScore += positiveExpressionPct * 0.25; // 25% weight
        }
        
        // Calculate Composure Score (0-100)
        // Based on: hand fidgeting (inverse), posture stability, expression calmness
        let composureScore = 100; // Start at max, deduct for issues
        
        // Deduct for fidgeting
        if (handActivityData.visible > 0) {
            const fidgetRate = (handActivityData.fidgetCount / handActivityData.visible) * 100;
            composureScore -= fidgetRate * 0.5; // Deduct up to 50 points
        }
        
        // Deduct for excessive movement
        if (handActivityData.visible > 0 && handActivityData.movement > 0) {
            const avgMovement = handActivityData.movement / handActivityData.visible;
            const movementPenalty = Math.min(avgMovement * 500, 30); // Up to 30 points
            composureScore -= movementPenalty;
        }
        
        // Deduct for unstable posture
        if (totalPostureFrames > 0) {
            const leaningPct = (postureData.leaning / totalPostureFrames) * 100;
            composureScore -= leaningPct * 0.2; // Deduct up to 20 points
        }
        
        // Ensure scores are in 0-100 range
        engagementScore = Math.max(0, Math.min(100, engagementScore));
        confidenceScore = Math.max(0, Math.min(100, confidenceScore));
        composureScore = Math.max(0, Math.min(100, composureScore));
        
        // Update dashboard
        updateScoreCard('engagement', engagementScore);
        updateScoreCard('confidence', confidenceScore);
        updateScoreCard('composure', composureScore);
        
    } catch (error) {
        console.warn("Score calculation error:", error);
    }
}

function updateScoreCard(type, score) {
    try {
        const scoreValue = document.getElementById(`${type}Score`);
        const scoreFill = document.getElementById(`${type}Fill`);
        
        if (scoreValue) {
            scoreValue.textContent = Math.round(score);
        }
        
        if (scoreFill) {
            scoreFill.style.width = `${score}%`;
            
            // Color based on score
            if (score >= 70) {
                scoreFill.style.backgroundColor = '#27ae60'; // Green
            } else if (score >= 40) {
                scoreFill.style.backgroundColor = '#f39c12'; // Orange
            } else {
                scoreFill.style.backgroundColor = '#e74c3c'; // Red
            }
        }
    } catch (error) {
        // Score update is optional
    }
}

// ============================================================================
// ANALYSIS CONTROL
// ============================================================================

async function startAnalysis() {
    console.log("▶️ Starting analysis...");
    
    if (!faceMesh || !hands || !pose) {
        alert("MediaPipe not initialized. Please wait or refresh.");
        return;
    }
    
    isAnalyzing = true;
    frameCount = 0;
    
    // Initialize metrics
    if (typeof window.behaviorMetrics !== 'undefined') {
        window.behaviorMetrics.start();
    }
    
    // Update UI
    startBtn.disabled = true;
    stopBtn.disabled = false;
    exportBtn.disabled = true;
    updateStatus("Analysis in progress...", "active");
    
    // Start processing loop
    processFrame();
    
    // Start overall score updates (every 2 seconds)
    scoreUpdateInterval = setInterval(calculateOverallScores, 2000);
    calculateOverallScores(); // Calculate immediately
    
    console.log("✅ Analysis started!");
}

function stopAnalysis() {
    console.log("⏹️ Stopping analysis...");
    
    isAnalyzing = false;
    
    // Stop score updates
    if (scoreUpdateInterval) {
        clearInterval(scoreUpdateInterval);
        scoreUpdateInterval = null;
    }
    
    // Final score calculation
    calculateOverallScores();
    
    // Update UI
    startBtn.disabled = false;
    stopBtn.disabled = true;
    exportBtn.disabled = false;
    updateStatus("Analysis stopped", "idle");
    
    console.log("✅ Analysis stopped");
    console.log("📊 Final Scores:");
    console.log(`   Engagement: ${document.getElementById('engagementScore')?.textContent}`);
    console.log(`   Confidence: ${document.getElementById('confidenceScore')?.textContent}`);
    console.log(`   Composure: ${document.getElementById('composureScore')?.textContent}`);
}

async function processFrame() {
    if (!isAnalyzing) return;
    
    const now = performance.now();
    
    if (now - lastFrameTime >= FRAME_INTERVAL) {
        // Clear canvas
        overlayCtx.clearRect(0, 0, overlay.width, overlay.height);
        
        // Process with MediaPipe solutions
        await faceMesh.send({image: webcam});
        await hands.send({image: webcam});
        await pose.send({image: webcam});
        
        frameCount++;
        lastFrameTime = now;
        
        // Update frame counter
        const frameCountElem = document.getElementById('frameCount');
        if (frameCountElem) {
            frameCountElem.textContent = frameCount;
        }
    }
    
    // Continue loop
    requestAnimationFrame(processFrame);
}

function exportReport() {
    console.log("📊 Exporting report...");
    
    if (typeof window.behaviorMetrics !== 'undefined') {
        const data = window.behaviorMetrics.getData();
        const json = JSON.stringify(data, null, 2);
        
        const blob = new Blob([json], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `hr-analysis-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        console.log("✅ Report exported");
    }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function updateStatus(text, state) {
    if (statusText) {
        statusText.textContent = text;
    }
    
    if (statusIndicator) {
        statusIndicator.className = `status-indicator status-${state}`;
    }
}

console.log("✅ MediaPipe HR Analysis System loaded!");

