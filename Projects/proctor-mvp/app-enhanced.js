// Enhanced Proctoring System with YOLOv8, WebGazer, and OpenCV
// All processing happens locally - no external API calls

document.addEventListener('DOMContentLoaded', main);

// ============================================================================
// GLOBAL VARIABLES & CONFIGURATION
// ============================================================================

// DOM Elements
let webcam, overlay, webgazerCanvas, snapshotCanvas, referenceImage;
let captureIdBtn, loadReferenceBtn, captureFaceBtn, startCalibrationBtn;
let statusDiv, nameOutput, monitoringSection, violationLog, calibrationSection, calibrationProgress;

// AI Models
let tesseractWorker;
let yoloSession = null;
let isYoloReady = false;
let isWebGazerReady = false;
let isOpenCVReady = false;

// Monitoring State
let monitoringInterval;
let referenceFaceDescriptor;
let audioStream, audioContext, analyser, dataArray;
let isSpeaking = false;
let isCalibrated = false;
let lastGazePoint = null;
let gazeOffScreenCount = 0;

// Configuration Constants
const MATCH_THRESHOLD = 0.5;
const AUDIO_THRESHOLD = 40;
const MONITORING_INTERVAL = 2000; // 2 seconds
const GAZE_OFFSCREEN_THRESHOLD = 5; // Number of checks before violation
const YOLO_MODEL_PATH = 'models/yolov8/yolov8n.onnx';
const YOLO_CONFIDENCE_THRESHOLD = 0.5;

// YOLOv8 Class Names (COCO dataset)
const YOLO_CLASSES = [
    'person', 'bicycle', 'car', 'motorcycle', 'airplane', 'bus', 'train', 'truck', 'boat',
    'traffic light', 'fire hydrant', 'stop sign', 'parking meter', 'bench', 'bird', 'cat', 'dog',
    'horse', 'sheep', 'cow', 'elephant', 'bear', 'zebra', 'giraffe', 'backpack', 'umbrella',
    'handbag', 'tie', 'suitcase', 'frisbee', 'skis', 'snowboard', 'sports ball', 'kite',
    'baseball bat', 'baseball glove', 'skateboard', 'surfboard', 'tennis racket', 'bottle',
    'wine glass', 'cup', 'fork', 'knife', 'spoon', 'bowl', 'banana', 'apple', 'sandwich',
    'orange', 'broccoli', 'carrot', 'hot dog', 'pizza', 'donut', 'cake', 'chair', 'couch',
    'potted plant', 'bed', 'dining table', 'toilet', 'tv', 'laptop', 'mouse', 'remote',
    'keyboard', 'cell phone', 'microwave', 'oven', 'toaster', 'sink', 'refrigerator', 'book',
    'clock', 'vase', 'scissors', 'teddy bear', 'hair drier', 'toothbrush'
];

// Prohibited objects for exam
const PROHIBITED_OBJECTS = ['cell phone', 'book', 'laptop', 'remote', 'keyboard'];

// ============================================================================
// MAIN INITIALIZATION
// ============================================================================

async function main() {
    console.log("🚀 Initializing Enhanced Proctoring System...");
    
    // Get DOM references
    initializeDOMElements();
    
    try {
        // ========================================
        // STEP 1: PRE-VERIFICATION SECURITY CHECKS
        // ========================================
        updateStatus("Running security checks...", "status-loading");
        console.log("\n🔒 === STEP 1: SECURITY CHECKS ===");
        
        const securityResult = await runAllSecurityChecks();
        
        if (!securityResult.passed) {
            // Display security issues to user
            const issueMessage = displaySecurityIssues(securityResult.issues);
            const criticalIssues = securityResult.issues.filter(i => i.severity === 'CRITICAL');
            
            if (criticalIssues.length > 0) {
                // Critical issues - must be resolved
                alert("🔴 CRITICAL SECURITY ISSUES DETECTED\n\n" + issueMessage + 
                      "\nPlease resolve these issues and refresh the page.");
                updateStatus("Critical security issues detected. See console.", "status-error");
                return; // Stop initialization
            } else {
                // Non-critical issues - warn but allow to continue
                const proceed = confirm("⚠️ SECURITY WARNINGS\n\n" + issueMessage + 
                                       "\nDo you want to proceed anyway?");
                if (!proceed) {
                    updateStatus("Security check failed. Please resolve issues.", "status-error");
                    return;
                }
            }
        }
        
        console.log("✅ Security checks passed");
        
        // ========================================
        // STEP 2: ACTIVATE BROWSER LOCKDOWN
        // ========================================
        updateStatus("Activating browser security...", "status-loading");
        console.log("\n🔒 === STEP 2: BROWSER LOCKDOWN ===");
        
        if (typeof window.browserLockdown !== 'undefined') {
            window.browserLockdown.activate();
            console.log("✅ Browser lockdown activated");
        } else {
            console.warn("⚠️ Browser lockdown module not available");
        }
        
        // ========================================
        // STEP 3: REQUEST WEBCAM/MICROPHONE
        // ========================================
        updateStatus("Starting webcam and microphone...", "status-loading");
        console.log("\n📹 === STEP 3: MEDIA ACCESS ===");
        
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: 720, height: 560 },
            audio: true
        });
        
        webcam.srcObject = stream;
        audioStream = stream;
        
        // Set canvas dimensions
        overlay.width = webcam.width;
        overlay.height = webcam.height;
        webgazerCanvas.width = webcam.width;
        webgazerCanvas.height = webcam.height;
        
        console.log("✅ Media access granted");
        
        // ========================================
        // STEP 4: LOAD AI MODELS
        // ========================================
        updateStatus("Loading AI models (Face, OCR, YOLOv8, WebGazer, OpenCV)...", "status-loading");
        console.log("\n🤖 === STEP 4: AI MODELS ===");
        
        await loadAllModels();
        
        // Setup event listeners
        setupListeners();
        setupExtensionListener();
        
        // ========================================
        // STEP 5: READY FOR CALIBRATION
        // ========================================
        console.log("\n✅ === INITIALIZATION COMPLETE ===");
        console.log("System ready for calibration and verification");
        
        // Show calibration section
        calibrationSection.style.display = 'block';
        updateStatus("✅ All checks passed! Start with eye tracking calibration.", "status-ready");
        
        // Inform user about lockdown
        setTimeout(() => {
            alert("🔒 BROWSER SECURITY ACTIVATED\n\n" +
                  "• Fullscreen mode will be enforced\n" +
                  "• Keyboard shortcuts are disabled\n" +
                  "• Right-click is disabled\n" +
                  "• Copy/paste restricted\n" +
                  "• Tab/window switching monitored\n\n" +
                  "These restrictions protect exam integrity.");
        }, 1000);
        
    } catch (err) {
        handleInitializationError(err);
    }
}

function initializeDOMElements() {
    webcam = document.getElementById('webcam');
    overlay = document.getElementById('overlay');
    webgazerCanvas = document.getElementById('webgazerCanvas');
    snapshotCanvas = document.getElementById('snapshotCanvas');
    referenceImage = document.getElementById('referenceImage');
    
    captureIdBtn = document.getElementById('captureIdBtn');
    loadReferenceBtn = document.getElementById('loadReferenceBtn');
    captureFaceBtn = document.getElementById('captureFaceBtn');
    startCalibrationBtn = document.getElementById('startCalibrationBtn');
    
    statusDiv = document.getElementById('status');
    nameOutput = document.getElementById('nameOutput');
    monitoringSection = document.getElementById('monitoringSection');
    violationLog = document.getElementById('violationLog');
    calibrationSection = document.getElementById('calibrationSection');
    calibrationProgress = document.getElementById('calibrationProgress');
}

function handleInitializationError(err) {
    if (err.name === "NotAllowedError") {
        updateStatus("Error: Webcam and microphone access is required.", "status-error");
    } else {
        updateStatus(`Initialization Error: ${err.message}`, "status-error");
    }
    console.error(err);
}

// ============================================================================
// MODEL LOADING
// ============================================================================

async function loadAllModels() {
    console.log("📦 Loading models...");
    
    // Load face-api.js models
    await loadFaceModels();
    
    // Load Tesseract.js for OCR
    await loadTesseract();
    
    // Load YOLOv8 model (ONNX Runtime)
    await loadYOLOv8();
    
    // Initialize WebGazer
    await initializeWebGazer();
    
    // Wait for OpenCV
    await waitForOpenCV();
    
    console.log("✅ All models loaded successfully!");
}

async function loadFaceModels() {
    console.log("Loading face detection models...");
    await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
        faceapi.nets.faceLandmark68TinyNet.loadFromUri('/models'),
        faceapi.nets.faceRecognitionNet.loadFromUri('/models')
    ]);
    console.log("✅ Face models loaded");
}

async function loadTesseract() {
    console.log("Loading Tesseract OCR...");
    tesseractWorker = await Tesseract.createWorker();
    await tesseractWorker.loadLanguage('eng');
    await tesseractWorker.initialize('eng');
    console.log("✅ Tesseract loaded");
}

async function loadYOLOv8() {
    console.log("Loading YOLOv8 model...");
    try {
        // Check if ONNX Runtime is available
        if (typeof ort === 'undefined') {
            throw new Error("ONNX Runtime not loaded");
        }
        
        // Configure ONNX Runtime to find WASM files
        ort.env.wasm.wasmPaths = '/libs/';
        console.log("📁 ONNX Runtime WASM path configured: /libs/");
        
        // Try to load YOLOv8 ONNX model
        const response = await fetch(YOLO_MODEL_PATH);
        if (!response.ok) {
            throw new Error("YOLOv8 model file not found");
        }
        
        const modelBuffer = await response.arrayBuffer();
        yoloSession = await ort.InferenceSession.create(modelBuffer);
        isYoloReady = true;
        console.log("✅ YOLOv8 ONNX model loaded successfully");
        console.log(`🚫 Monitoring for prohibited objects: ${PROHIBITED_OBJECTS.join(', ')}`);
        
    } catch (err) {
        console.warn("⚠️ Could not load YOLOv8:", err.message);
        console.log("📌 Object detection will be limited. Please download YOLOv8 model.");
        isYoloReady = false;
    }
}

async function initializeWebGazer() {
    console.log("Initializing WebGazer...");
    try {
        if (typeof webgazer === 'undefined') {
            throw new Error("WebGazer not loaded");
        }
        
        // Configure WebGazer
        await webgazer.setGazeListener((data, timestamp) => {
            if (data == null) return;
            lastGazePoint = data;
            
            // Draw gaze point on canvas (optional, for debugging)
            if (isCalibrated) {
                drawGazePoint(data.x, data.y);
            }
        }).begin();
        
        // Hide the default WebGazer video feed
        webgazer.showVideoPreview(false)
                .showPredictionPoints(false);
        
        isWebGazerReady = true;
        console.log("✅ WebGazer initialized");
        
    } catch (err) {
        console.warn("⚠️ Could not initialize WebGazer:", err.message);
        isWebGazerReady = false;
    }
}

async function waitForOpenCV() {
    console.log("Waiting for OpenCV.js...");
    return new Promise((resolve) => {
        if (typeof cv !== 'undefined' && cv.Mat) {
            isOpenCVReady = true;
            console.log("✅ OpenCV.js ready");
            resolve();
        } else {
            // OpenCV loads asynchronously, wait for it
            const checkInterval = setInterval(() => {
                if (typeof cv !== 'undefined' && cv.Mat) {
                    clearInterval(checkInterval);
                    isOpenCVReady = true;
                    console.log("✅ OpenCV.js ready");
                    resolve();
                }
            }, 100);
            
            // Timeout after 10 seconds
            setTimeout(() => {
                clearInterval(checkInterval);
                console.warn("⚠️ OpenCV.js failed to load");
                isOpenCVReady = false;
                resolve();
            }, 10000);
        }
    });
}

// ============================================================================
// EVENT LISTENERS
// ============================================================================

function setupListeners() {
    captureIdBtn.addEventListener('click', handleIdCapture);
    loadReferenceBtn.addEventListener('click', handleReferenceLoad);
    captureFaceBtn.addEventListener('click', handleFaceCapture);
    startCalibrationBtn.addEventListener('click', startCalibration);
}

function setupExtensionListener() {
    console.log("Setting up enhanced extension listener...");
    window.addEventListener("message", (event) => {
        if (event.source !== window) return;
        const message = event.data;
        
        if (message && message.type === "VIOLATION") {
            logViolation(message.details);
        } else if (message && message.type === "MONITORING_READY") {
            console.log("✅ Extension monitoring READY (will activate after face verification)");
            console.log("📋 " + message.message);
            console.log("📊 Available features:");
            message.features.forEach(feature => {
                console.log(`  • ${feature}`);
            });
        } else if (message && message.type === "MONITORING_ACTIVE") {
            console.log("✅✅✅ EXTENSION MONITORING NOW ACTIVE ✅✅✅");
            console.log("📊 Active features:");
            message.features.forEach(feature => {
                console.log(`  • ${feature}`);
            });
        }
    }, false);
}

// ============================================================================
// WEBGAZER CALIBRATION
// ============================================================================

async function startCalibration() {
    if (!isWebGazerReady) {
        updateStatus("WebGazer is not available. Skipping calibration.", "status-error");
        calibrationSection.style.display = 'none';
        return;
    }
    
    updateStatus("Starting eye tracking calibration...", "status-loading");
    startCalibrationBtn.disabled = true;
    
    try {
        // Resume WebGazer if paused
        await webgazer.resume();
        
        // Show calibration instructions
        calibrationProgress.innerHTML = "Please click on the points that appear on the screen.";
        
        // Create calibration points
        await performCalibration();
        
        isCalibrated = true;
        calibrationSection.style.display = 'none';
        updateStatus("Calibration complete! Please choose a Step 1 option.", "status-ready");
        
    } catch (err) {
        updateStatus(`Calibration Error: ${err.message}`, "status-error");
        startCalibrationBtn.disabled = false;
    }
}

async function performCalibration() {
    // Create 9-point calibration grid
    const points = [
        { x: 0.1, y: 0.1 }, { x: 0.5, y: 0.1 }, { x: 0.9, y: 0.1 },
        { x: 0.1, y: 0.5 }, { x: 0.5, y: 0.5 }, { x: 0.9, y: 0.5 },
        { x: 0.1, y: 0.9 }, { x: 0.5, y: 0.9 }, { x: 0.9, y: 0.9 }
    ];
    
    const containerWidth = window.innerWidth;
    const containerHeight = window.innerHeight;
    
    for (let i = 0; i < points.length; i++) {
        const point = points[i];
        const x = point.x * containerWidth;
        const y = point.y * containerHeight;
        
        calibrationProgress.innerHTML = `Calibration point ${i + 1} of ${points.length}`;
        
        await showCalibrationPoint(x, y);
        await sleep(500); // Wait between points
    }
}

function showCalibrationPoint(x, y) {
    return new Promise((resolve) => {
        // Create calibration dot
        const dot = document.createElement('div');
        dot.style.position = 'fixed';
        dot.style.left = x + 'px';
        dot.style.top = y + 'px';
        dot.style.width = '20px';
        dot.style.height = '20px';
        dot.style.borderRadius = '50%';
        dot.style.backgroundColor = '#e74c3c';
        dot.style.border = '3px solid white';
        dot.style.cursor = 'pointer';
        dot.style.zIndex = '10000';
        dot.style.transform = 'translate(-50%, -50%)';
        
        document.body.appendChild(dot);
        
        // Wait for click
        dot.addEventListener('click', () => {
            // Record calibration point with WebGazer
            webgazer.recordScreenPosition(x, y);
            document.body.removeChild(dot);
            resolve();
        });
        
        // Auto-advance after 5 seconds if no click
        setTimeout(() => {
            if (document.body.contains(dot)) {
                webgazer.recordScreenPosition(x, y);
                document.body.removeChild(dot);
                resolve();
            }
        }, 5000);
    });
}

function drawGazePoint(x, y) {
    const ctx = webgazerCanvas.getContext('2d');
    ctx.clearRect(0, 0, webgazerCanvas.width, webgazerCanvas.height);
    
    // Draw gaze point
    ctx.fillStyle = '#00ff00';
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, 2 * Math.PI);
    ctx.fill();
}

// ============================================================================
// ID CAPTURE & VERIFICATION
// ============================================================================

async function handleIdCapture() {
    try {
        updateStatus("Scanning ID card...", "status-loading");
        captureIdBtn.disabled = true;
        loadReferenceBtn.disabled = true;
        
        const context = snapshotCanvas.getContext('2d');
        snapshotCanvas.width = webcam.videoWidth;
        snapshotCanvas.height = webcam.videoHeight;
        context.drawImage(webcam, 0, 0, snapshotCanvas.width, snapshotCanvas.height);
        
        // OCR for text extraction
        const { data: { text } } = await tesseractWorker.recognize(snapshotCanvas);
        nameOutput.textContent = text || "(Could not read any text)";
        
        // Extract face descriptor
        const detection = await faceapi.detectSingleFace(snapshotCanvas, new faceapi.TinyFaceDetectorOptions())
                                     .withFaceLandmarks(true)
                                     .withFaceDescriptor();
        
        if (!detection) {
            throw new Error("No face found on the ID card. Please try again.");
        }
        
        referenceFaceDescriptor = new faceapi.LabeledFaceDescriptors(
            'ID_Scan_Reference',
            [detection.descriptor]
        );
        
        updateStatus("ID Scan Complete. Please verify your face.", "status-ready");
        captureFaceBtn.disabled = false;
        
    } catch (err) {
        updateStatus(`ID Scan Error: ${err.message}`, "status-error");
        captureIdBtn.disabled = false;
        loadReferenceBtn.disabled = false;
    }
}

async function handleReferenceLoad() {
    try {
        updateStatus("Loading reference image...", "status-loading");
        captureIdBtn.disabled = true;
        loadReferenceBtn.disabled = true;
        
        if (!referenceImage.complete || referenceImage.naturalHeight === 0) {
            throw new Error("Could not load reference.png. Is the file in the correct folder?");
        }
        
        const detection = await faceapi.detectSingleFace(referenceImage, new faceapi.TinyFaceDetectorOptions())
                                     .withFaceLandmarks(true)
                                     .withFaceDescriptor();
        
        if (!detection) {
            throw new Error("No face found in reference.png. Please use a clearer image.");
        }
        
        referenceFaceDescriptor = new faceapi.LabeledFaceDescriptors(
            'File_Reference',
            [detection.descriptor]
        );
        
        updateStatus("Reference Image Loaded. Please verify your face.", "status-ready");
        captureFaceBtn.disabled = false;
        
    } catch (err) {
        updateStatus(`Reference Load Error: ${err.message}`, "status-error");
        captureIdBtn.disabled = false;
        loadReferenceBtn.disabled = false;
    }
}

// ============================================================================
// FACE VERIFICATION
// ============================================================================

async function handleFaceCapture() {
    try {
        if (!referenceFaceDescriptor) {
            throw new Error("Please complete Step 1 first.");
        }
        
        captureFaceBtn.disabled = true;
        
        // Countdown
        updateStatus("Get ready... Look at the camera.", "status-loading");
        await sleep(1500);
        updateStatus("3...", "status-loading");
        await sleep(1000);
        updateStatus("2...", "status-loading");
        await sleep(1000);
        updateStatus("1...", "status-loading");
        await sleep(1000);
        updateStatus("Verifying...", "status-loading");
        
        // Capture and verify
        const context = snapshotCanvas.getContext('2d');
        snapshotCanvas.width = webcam.videoWidth;
        snapshotCanvas.height = webcam.videoHeight;
        context.drawImage(webcam, 0, 0, snapshotCanvas.width, snapshotCanvas.height);
        
        const detection = await faceapi.detectSingleFace(snapshotCanvas, new faceapi.TinyFaceDetectorOptions())
                                     .withFaceLandmarks(true)
                                     .withFaceDescriptor();
        
        if (!detection) {
            throw new Error("No live face detected. Please position yourself clearly.");
        }
        
        const faceMatcher = new faceapi.FaceMatcher(referenceFaceDescriptor);
        const bestMatch = faceMatcher.findBestMatch(detection.descriptor);
        const confidence = (1 - bestMatch.distance).toFixed(2);
        
        if (bestMatch.label !== 'unknown' && bestMatch.distance < MATCH_THRESHOLD) {
            updateStatus(`Verification Successful! Entering fullscreen...`, "status-success");
            
            captureIdBtn.disabled = true;
            loadReferenceBtn.disabled = true;
            
            // Enter fullscreen mode AFTER verification
            if (typeof window.browserLockdown !== 'undefined') {
                window.browserLockdown.enterFullscreen();
                console.log("🔒 Entering fullscreen lockdown mode");
            }
            
            monitoringSection.style.display = 'block';
            
            // Wait a moment for fullscreen to activate
            setTimeout(() => {
                updateStatus(`Verification Successful! Monitoring started.`, "status-success");
                // Start comprehensive monitoring
                startRealtimeMonitoring(audioStream);
            }, 1000);
            
        } else {
            throw new Error(`Verification Failed. Mismatch. (Confidence: ${confidence})`);
        }
        
    } catch (err) {
        updateStatus(`Verification Error: ${err.message}`, "status-error");
        captureFaceBtn.disabled = false;
    }
}

// ============================================================================
// REAL-TIME MONITORING
// ============================================================================

function startRealtimeMonitoring(stream) {
    console.log("🔍 Starting comprehensive real-time monitoring...");
    
    // Setup audio analysis
    setupAudioMonitoring(stream);
    
    // Notify extension to start monitoring (background script + content script)
    if (typeof chrome !== 'undefined' && chrome.runtime) {
        // Activate background script monitoring
        chrome.runtime.sendMessage({ type: "START_MONITORING" }, (response) => {
            if (response && response.success) {
                console.log("✅ Extension background monitoring started");
            }
        });
        
        // Activate content script monitoring
        chrome.runtime.sendMessage({ type: "START_CONTENT_MONITORING" }, (response) => {
            if (response && response.success) {
                console.log("✅ Extension content script monitoring started");
            }
        });
    } else {
        console.warn("⚠️ Extension not detected - browser monitoring limited");
    }
    
    // Start monitoring loop
    const monitoringLoop = async () => {
        if (!webcam.srcObject) return;
        
        // Run all checks in parallel
        await Promise.all([
            checkFaceViolations(),
            checkAudioViolations(),
            checkObjectViolations(),
            checkGazeViolations(),
            checkHeadPoseViolations()
        ]);
        
        // Schedule next check
        monitoringInterval = setTimeout(monitoringLoop, MONITORING_INTERVAL);
    };
    
    monitoringLoop();
}

function setupAudioMonitoring(stream) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioContext.createAnalyser();
    const microphone = audioContext.createMediaStreamSource(stream);
    microphone.connect(analyser);
    analyser.fftSize = 256;
    const bufferLength = analyser.frequencyBinCount;
    dataArray = new Uint8Array(bufferLength);
}

// ============================================================================
// VIOLATION CHECKS
// ============================================================================

async function checkFaceViolations() {
    if (!webcam.srcObject) return;
    
    // Detect all faces with landmarks and descriptors for identity verification
    const detections = await faceapi.detectAllFaces(webcam, new faceapi.TinyFaceDetectorOptions())
                                    .withFaceLandmarks(true)
                                    .withFaceDescriptors();
    
    if (detections.length === 0) {
        logViolation("NO_FACE_DETECTED: Student not visible");
        return;
    }
    
    if (detections.length > 1) {
        logViolation("MULTIPLE_FACES_DETECTED: Unauthorized person present");
        return;
    }
    
    // Single face detected - now verify identity
    if (referenceFaceDescriptor && detections.length === 1) {
        const faceMatcher = new faceapi.FaceMatcher(referenceFaceDescriptor, MATCH_THRESHOLD);
        const bestMatch = faceMatcher.findBestMatch(detections[0].descriptor);
        
        if (bestMatch.label === 'unknown') {
            // Face doesn't match the verified student
            const distance = bestMatch.distance.toFixed(2);
            logViolation(`UNAUTHORIZED_PERSON: Face does not match verified student (confidence: ${(1-distance)*100}%)`);
            return;
        } else {
            // Face matches - all good
            console.log(`✓ Face check: OK (Verified student, confidence: ${(1-bestMatch.distance)*100}%)`);
            if (statusDiv.className.includes('status-error')) {
                updateStatus("Monitoring Live... (Last violation logged)", "status-ready");
            }
        }
    } else {
        // Fallback if no reference descriptor (shouldn't happen during monitoring)
        console.log("✓ Face check: OK (1 face detected, identity not verified)");
    }
}

function checkAudioViolations() {
    analyser.getByteFrequencyData(dataArray);
    
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
    }
    let averageVolume = sum / dataArray.length;
    
    console.log(`🔊 Audio level: ${averageVolume.toFixed(2)}`);
    
    if (averageVolume > AUDIO_THRESHOLD) {
        if (!isSpeaking) {
            isSpeaking = true;
            logViolation("SUSPICIOUS_AUDIO_DETECTED");
            setTimeout(() => {
                isSpeaking = false;
            }, 5000);
        }
    }
}

async function checkObjectViolations() {
    if (!webcam.srcObject) return;
    
    if (isYoloReady) {
        await checkWithYOLO();
    } else {
        console.log("⚠️ YOLOv8 not available, skipping object detection");
    }
}

async function checkWithYOLO() {
    try {
        // Use YOLO helper function to run inference
        const detections = await runYOLOv8Inference(yoloSession, webcam, YOLO_CONFIDENCE_THRESHOLD);
        
        // Draw bounding boxes on overlay (optional, for debugging)
        // drawBoundingBoxes(overlay, detections);
        
        // Check for prohibited objects
        let violationFound = false;
        let personCount = 0;
        const detectedObjects = [];
        
        for (const detection of detections) {
            const objectName = detection.label;
            const confidence = (detection.confidence * 100).toFixed(1);
            
            detectedObjects.push(`${objectName} (${confidence}%)`);
            
            // Check for prohibited items
            if (PROHIBITED_OBJECTS.includes(objectName)) {
                logViolation(`PROHIBITED_OBJECT: ${objectName.toUpperCase()} detected with ${confidence}% confidence`);
                violationFound = true;
            }
            
            // Count people in frame
            if (objectName === 'person') {
                personCount++;
            }
        }
        
        // Log all detected objects for transparency
        if (detectedObjects.length > 0) {
            console.log(`📦 YOLOv8 detected: ${detectedObjects.join(', ')}`);
        } else {
            console.log("📦 YOLOv8: No objects detected");
        }
        
        // Check for multiple people
        if (personCount > 1) {
            logViolation(`MULTIPLE_PEOPLE_DETECTED: ${personCount} people in frame (via YOLOv8)`);
            violationFound = true;
        }
        
        if (!violationFound) {
            console.log("✓ Object check: OK (No prohibited items)");
        }
        
    } catch (err) {
        console.error("YOLOv8 inference error:", err);
    }
}

// Note: YOLO helper functions are now in yolo-helper.js
// prepareYOLOv8Input, processYOLOv8Output, and runYOLOv8Inference are defined there

async function checkGazeViolations() {
    if (!isCalibrated || !isWebGazerReady) {
        console.log("⚠️ Eye tracking not calibrated, skipping");
        return;
    }
    
    if (!lastGazePoint) {
        gazeOffScreenCount++;
        console.log(`👀 No gaze data (${gazeOffScreenCount}/${GAZE_OFFSCREEN_THRESHOLD})`);
        
        if (gazeOffScreenCount >= GAZE_OFFSCREEN_THRESHOLD) {
            logViolation("LOOKING_AWAY_FROM_SCREEN");
            gazeOffScreenCount = 0;
        }
        return;
    }
    
    // Check if gaze is within screen bounds
    const isOnScreen = (
        lastGazePoint.x >= 0 && lastGazePoint.x <= window.innerWidth &&
        lastGazePoint.y >= 0 && lastGazePoint.y <= window.innerHeight
    );
    
    if (!isOnScreen) {
        gazeOffScreenCount++;
        console.log(`👀 Gaze off-screen (${gazeOffScreenCount}/${GAZE_OFFSCREEN_THRESHOLD})`);
        
        if (gazeOffScreenCount >= GAZE_OFFSCREEN_THRESHOLD) {
            logViolation("GAZE_OFF_SCREEN");
            gazeOffScreenCount = 0;
        }
    } else {
        gazeOffScreenCount = 0;
        console.log("✓ Gaze check: OK");
    }
}

async function checkHeadPoseViolations() {
    if (!webcam.srcObject || !isOpenCVReady) {
        console.log("⚠️ OpenCV not ready, skipping head pose check");
        return;
    }
    
    try {
        // Get face landmarks
        const detections = await faceapi.detectSingleFace(webcam, new faceapi.TinyFaceDetectorOptions())
                                       .withFaceLandmarks(true);
        
        if (!detections) return;
        
        // Analyze head pose from landmarks
        const landmarks = detections.landmarks;
        const nose = landmarks.getNose();
        const leftEye = landmarks.getLeftEye();
        const rightEye = landmarks.getRightEye();
        
        // Simple head pose estimation based on facial landmarks
        const eyeMidpoint = {
            x: (leftEye[0].x + rightEye[0].x) / 2,
            y: (leftEye[0].y + rightEye[0].y) / 2
        };
        
        const noseTip = nose[3];
        
        // Calculate angle (simplified)
        const horizontalOffset = Math.abs(noseTip.x - eyeMidpoint.x);
        const verticalOffset = Math.abs(noseTip.y - eyeMidpoint.y);
        
        // Thresholds for looking down (at phone/paper) or away
        if (verticalOffset > 50) {
            logViolation("HEAD_POSE_VIOLATION: Looking down");
        } else if (horizontalOffset > 80) {
            logViolation("HEAD_POSE_VIOLATION: Looking sideways");
        } else {
            console.log("✓ Head pose check: OK");
        }
        
    } catch (err) {
        console.error("Head pose check error:", err);
    }
}

// ============================================================================
// VIOLATION LOGGING
// ============================================================================

function logViolation(details) {
    console.warn("⚠️ VIOLATION:", details);
    updateStatus(`VIOLATION: ${details}`, 'status-error');
    
    const li = document.createElement('li');
    li.textContent = `[${new Date().toLocaleTimeString()}] VIOLATION: ${details}`;
    li.className = 'violation';
    violationLog.prepend(li);
    
    // Could save to database or file here
    // For now, just logging to console and UI
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function updateStatus(message, statusType) {
    statusDiv.textContent = message;
    statusDiv.className = `status-box ${statusType}`;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// CLEANUP
// ============================================================================

window.addEventListener('beforeunload', () => {
    // Cleanup resources
    if (monitoringInterval) {
        clearTimeout(monitoringInterval);
    }
    
    if (audioContext) {
        audioContext.close();
    }
    
    if (isWebGazerReady) {
        webgazer.end();
    }
    
    if (webcam.srcObject) {
        webcam.srcObject.getTracks().forEach(track => track.stop());
    }
});

console.log("✅ Proctoring system script loaded");

