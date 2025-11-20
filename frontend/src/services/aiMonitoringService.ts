/**
 * AI Monitoring Service
 * Comprehensive monitoring for face detection, audio, objects, gaze tracking, and head pose
 * Based on the MVP implementation
 */

import { faceVerificationService, FaceDescriptor } from './faceVerificationService';
import { proctoringService } from './proctoringService';
import { violationTracker } from './violationTracker';

// Configuration Constants
const MATCH_THRESHOLD = 0.5;
const MONITORING_INTERVAL = 2000; // 2 seconds
const GAZE_OFFSCREEN_THRESHOLD = 5; // Number of checks before violation
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

declare global {
  interface Window {
    faceapi: any;
    webgazer: any;
    cv: any;
    ort: any;
  }
}

export interface AIMonitoringConfig {
  enableFaceDetection: boolean;
  enableObjectDetection: boolean;
  enableGazeTracking: boolean;
  enableHeadPoseDetection: boolean;
}

class AIMonitoringService {
  private isMonitoring = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private sessionId: string | null = null;
  
  // Reference data
  private referenceDescriptor: any | null = null; // LabeledFaceDescriptors
  private videoElement: HTMLVideoElement | null = null;
  
  // Audio monitoring removed per user request
  
  // Gaze tracking
  private isGazeCalibrated = false;
  private lastGazePoint: { x: number; y: number } | null = null;
  private gazeOffScreenCount = 0;
  
  // Head pose violation cooldown (prevent spam)
  private lastHeadPoseViolation: { type: string; timestamp: number } | null = null;
  private headPoseViolationCooldown = 10000; // 10 seconds cooldown between same violation type
  private isHeadPoseViolationActive = false; // Track if violation is currently active
  
  // YOLO object detection
  private yoloSession: any = null;
  private isYoloReady = false;
  
  // OpenCV
  private isOpenCVReady = false;
  
  // Configuration
  private config: AIMonitoringConfig = {
    enableFaceDetection: true,
    enableObjectDetection: true, // Enable YOLO object detection
    enableGazeTracking: false, // Requires calibration
    enableHeadPoseDetection: false // Disabled - looking down violation not needed
  };

  /**
   * Initialize AI monitoring with reference face descriptor
   */
  async initialize(
    videoElement: HTMLVideoElement,
    referenceDescriptor: Float32Array,
    sessionId: string,
    config?: Partial<AIMonitoringConfig>
  ): Promise<boolean> {
    try {
      console.log('🤖 Initializing AI Monitoring Service...');
      
      this.videoElement = videoElement;
      
      // Create LabeledFaceDescriptors from the raw descriptor
      if (typeof window.faceapi !== 'undefined') {
        this.referenceDescriptor = new window.faceapi.LabeledFaceDescriptors(
          'Verified_Student',
          [referenceDescriptor]
        );
        console.log('✅ Reference face descriptor created');
      } else {
        console.warn('⚠️ face-api not loaded, face matching will not work');
      }
      
      this.sessionId = sessionId;
      
      if (config) {
        this.config = { ...this.config, ...config };
      }
      
      // Initialize YOLO object detection (if model available)
      if (this.config.enableObjectDetection) {
        await this.initializeYOLO();
      }
      
      // Check if WebGazer is ready for gaze tracking
      if (this.config.enableGazeTracking && typeof window.webgazer !== 'undefined') {
        this.isGazeCalibrated = true;
        this.setupGazeListener();
      }
      
      // Check if OpenCV is ready for head pose detection
      if (this.config.enableHeadPoseDetection && typeof window.cv !== 'undefined') {
        this.isOpenCVReady = true;
      }
      
      console.log('✅ AI Monitoring initialized with config:', this.config);
      return true;
      
    } catch (error) {
      console.error('❌ Failed to initialize AI monitoring:', error);
      return false;
    }
  }


  /**
   * Initialize YOLO object detection
   */
  private async initializeYOLO(): Promise<void> {
    try {
      // Load ONNX Runtime if not already loaded
      if (typeof window.ort === 'undefined') {
        console.log('Loading ONNX Runtime...');
        await this.loadONNXRuntime();
      }

      if (typeof window.ort === 'undefined') {
        console.warn('⚠️ ONNX Runtime not available, skipping YOLO');
        this.config.enableObjectDetection = false;
        return;
      }

      // Configure ONNX Runtime WASM paths (like MVP)
      window.ort.env.wasm.wasmPaths = '/libs/';
      console.log('📁 ONNX Runtime WASM path configured: /libs/');
      
      // Try to load YOLO model
      const modelPath = '/models/yolov8/yolov8n.onnx';
      console.log('📦 Loading YOLOv8 model from:', modelPath);
      
      // Check if model file exists
      const response = await fetch(modelPath);
      if (!response.ok) {
        throw new Error(`Model file not found: ${response.status}`);
      }

      const modelBuffer = await response.arrayBuffer();
      this.yoloSession = await window.ort.InferenceSession.create(modelBuffer);
      this.isYoloReady = true;
      
      console.log('✅ YOLOv8 model loaded successfully');
    } catch (error: any) {
      console.warn('⚠️ YOLOv8 not available:', error);
      this.isYoloReady = false;
      this.config.enableObjectDetection = false;
    }
  }

  /**
   * Load ONNX Runtime dynamically
   */
  private async loadONNXRuntime(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Check if already loaded
      if (typeof window.ort !== 'undefined') {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = '/libs/ort.min.js';
      script.async = true;
      
      script.onload = () => {
        console.log('✅ ONNX Runtime loaded');
        resolve();
      };
      
      script.onerror = () => {
        console.warn('⚠️ Failed to load ONNX Runtime');
        reject(new Error('ONNX Runtime not available'));
      };
      
      document.head.appendChild(script);
    });
  }

  /**
   * Setup gaze tracking listener
   */
  private setupGazeListener(): void {
    if (typeof window.webgazer === 'undefined') return;
    
    window.webgazer.setGazeListener((data: any) => {
      if (data) {
        this.lastGazePoint = { x: data.x, y: data.y };
      } else {
        this.lastGazePoint = null;
      }
    });
  }

  /**
   * Start AI monitoring
   */
  startMonitoring(): void {
    if (this.isMonitoring) {
      console.warn('⚠️ AI monitoring already active');
      return;
    }
    
    console.log('✅ Starting AI monitoring...');
    this.isMonitoring = true;
    
    // Run checks immediately
    this.runAllChecks();
    
    // Then run checks at intervals
    this.monitoringInterval = setInterval(() => {
      console.log('🔄 Running periodic AI monitoring checks...');
      this.runAllChecks();
    }, MONITORING_INTERVAL);
    
    console.log(`✅ AI monitoring started - checks every ${MONITORING_INTERVAL}ms`);
  }

  /**
   * Stop AI monitoring
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) return;
    
    console.log('🛑 Stopping AI monitoring...');
    this.isMonitoring = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  /**
   * Run all monitoring checks
   */
  private async runAllChecks(): Promise<void> {
    if (!this.isMonitoring || !this.videoElement) return;
    
    try {
      // 1. Face detection and verification
      if (this.config.enableFaceDetection) {
        await this.checkFaceViolations();
      }
      
      // 2. Object detection
      if (this.config.enableObjectDetection) {
        // Check if YOLO is ready, if not try to initialize it
        if (!this.isYoloReady && !this.yoloSession) {
          console.log('🔄 YOLO not ready, attempting to initialize...');
          await this.initializeYOLO();
        }
        
        if (this.isYoloReady && this.yoloSession) {
          await this.checkObjectViolations();
        }
      }
      
      // 3. Gaze tracking
      if (this.config.enableGazeTracking && this.isGazeCalibrated) {
        this.checkGazeViolations();
      }
      
      // 4. Head pose detection (uses face-api.js landmarks, no OpenCV needed)
      if (this.config.enableHeadPoseDetection) {
        await this.checkHeadPoseViolations();
      }
      
    } catch (error) {
      console.error('❌ Error during monitoring checks:', error);
    }
  }

  /**
   * Check for face detection violations
   */
  private async checkFaceViolations(): Promise<void> {
    if (!this.videoElement || typeof window.faceapi === 'undefined') return;
    
    try {
      // Detect all faces with landmarks and descriptors (MVP approach - line 691)
      const detections = await window.faceapi
        .detectAllFaces(this.videoElement, new window.faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks(true)
        .withFaceDescriptors();
      
      // NO_FACE_DETECTED
      if (detections.length === 0) {
        this.logViolation('NO_FACE_DETECTED', 'Student not visible in camera', 'high');
        return;
      }
      
      // MULTIPLE_FACES_DETECTED
      if (detections.length > 1) {
        this.logViolation('MULTIPLE_FACES_DETECTED', `${detections.length} faces detected - unauthorized person present`, 'high');
        return;
      }
      
      // UNAUTHORIZED_PERSON - Verify identity
      if (this.referenceDescriptor && detections.length === 1) {
        const faceMatcher = new window.faceapi.FaceMatcher(this.referenceDescriptor, MATCH_THRESHOLD);
        const bestMatch = faceMatcher.findBestMatch(detections[0].descriptor);
        
        if (bestMatch.label === 'unknown') {
          const distance = bestMatch.distance.toFixed(2);
          const confidence = ((1 - bestMatch.distance) * 100).toFixed(1);
          this.logViolation(
            'UNAUTHORIZED_PERSON',
            `Face does not match verified student (confidence: ${confidence}%)`,
            'critical'
          );
          return;
        } else {
          // Face matches - all good
          console.log(`✓ Face check: OK (confidence: ${((1 - bestMatch.distance) * 100).toFixed(1)}%)`);
        }
      } else {
        // Single face detected
        console.log('✓ Face check: OK (1 face detected)');
      }
      
    } catch (error) {
      console.error('❌ Face detection error:', error);
    }
  }


  /**
   * Check for object detection violations (YOLOv8)
   */
  private async checkObjectViolations(): Promise<void> {
    if (!this.videoElement || !this.yoloSession) return;
    
    try {
      // Run YOLO inference
      const detections = await this.runYOLOInference();
      
      let violationFound = false;
      let personCount = 0;
      const detectedObjects: string[] = [];
      
      for (const detection of detections) {
        const objectName = detection.label;
        const confidence = (detection.confidence * 100).toFixed(1);
        
        detectedObjects.push(`${objectName} (${confidence}%)`);
        
        // Check for prohibited items
        if (PROHIBITED_OBJECTS.includes(objectName)) {
          this.logViolation(
            'PROHIBITED_OBJECT',
            `${objectName.toUpperCase()} detected with ${confidence}% confidence`,
            'high'
          );
          violationFound = true;
        }
        
        // Count people
        if (objectName === 'person') {
          personCount++;
        }
      }
      
      // Log detected objects
      if (detectedObjects.length > 0) {
        console.log(`📦 YOLOv8 detected: ${detectedObjects.join(', ')}`);
      } else {
        console.log('📦 YOLOv8: No objects detected');
      }
      
      // Check for multiple people
      if (personCount > 1) {
        this.logViolation(
          'MULTIPLE_PEOPLE_DETECTED',
          `${personCount} people detected in frame (via YOLOv8)`,
          'high'
        );
        violationFound = true;
      }
      
      if (!violationFound && detectedObjects.length > 0) {
        console.log('✓ Object check: OK (No prohibited items)');
      }
      
    } catch (error) {
      console.error('❌ YOLO inference error:', error);
    }
  }

  /**
   * Prepare video frame for YOLOv8 input
   */
  private async prepareYOLOv8Input(videoElement: HTMLVideoElement, inputSize = 640): Promise<any> {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      canvas.width = inputSize;
      canvas.height = inputSize;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        resolve(null);
        return;
      }
      
      // Draw video frame to canvas
      ctx.drawImage(videoElement, 0, 0, inputSize, inputSize);
      
      // Get image data
      const imageData = ctx.getImageData(0, 0, inputSize, inputSize);
      const pixels = imageData.data;
      
      // Convert to float32 RGB channels (normalized to 0-1)
      const red = new Float32Array(inputSize * inputSize);
      const green = new Float32Array(inputSize * inputSize);
      const blue = new Float32Array(inputSize * inputSize);
      
      for (let i = 0; i < pixels.length; i += 4) {
        const idx = i / 4;
        red[idx] = pixels[i] / 255.0;
        green[idx] = pixels[i + 1] / 255.0;
        blue[idx] = pixels[i + 2] / 255.0;
      }
      
      // Concatenate channels in CHW format
      const input = new Float32Array(3 * inputSize * inputSize);
      input.set(red, 0);
      input.set(green, inputSize * inputSize);
      input.set(blue, 2 * inputSize * inputSize);
      
      // Create ONNX tensor
      const tensor = new window.ort.Tensor('float32', input, [1, 3, inputSize, inputSize]);
      
      resolve(tensor);
    });
  }

  /**
   * Process YOLOv8 output tensor
   */
  private processYOLOv8Output(output: any, confidenceThreshold = 0.5): Array<{ label: string; confidence: number; classId: number }> {
    const boxes: any[] = [];
    const data = output.data;
    const dims = output.dims; // [1, 84, 8400]
    
    const numClasses = 80;
    const numBoxes = dims[2]; // 8400
    
    // Parse detections
    for (let i = 0; i < numBoxes; i++) {
      // Get class scores (indices 4 to 83)
      let maxScore = 0;
      let maxClassId = 0;
      
      for (let j = 0; j < numClasses; j++) {
        const score = data[4 * numBoxes + j * numBoxes + i];
        if (score > maxScore) {
          maxScore = score;
          maxClassId = j;
        }
      }
      
      // Filter by confidence threshold
      if (maxScore < confidenceThreshold) continue;
      
      // Get box coordinates (first 4 values)
      const x = data[i];
      const y = data[numBoxes + i];
      const w = data[2 * numBoxes + i];
      const h = data[3 * numBoxes + i];
      
      // Convert from center format to corner format
      const x1 = x - w / 2;
      const y1 = y - h / 2;
      const x2 = x + w / 2;
      const y2 = y + h / 2;
      
      boxes.push({
        x1, y1, x2, y2,
        classId: maxClassId,
        confidence: maxScore,
        label: YOLO_CLASSES[maxClassId] || 'unknown'
      });
    }
    
    // Apply Non-Maximum Suppression (NMS)
    const finalBoxes = this.applyNMS(boxes, 0.45);
    
    return finalBoxes;
  }

  /**
   * Apply Non-Maximum Suppression
   */
  private applyNMS(boxes: any[], iouThreshold: number): any[] {
    // Sort boxes by confidence (descending)
    boxes.sort((a, b) => b.confidence - a.confidence);
    
    const selected: any[] = [];
    const active = new Array(boxes.length).fill(true);
    
    for (let i = 0; i < boxes.length; i++) {
      if (!active[i]) continue;
      
      selected.push(boxes[i]);
      
      // Suppress boxes with high IoU with this box
      for (let j = i + 1; j < boxes.length; j++) {
        if (!active[j]) continue;
        
        // Only suppress boxes of the same class
        if (boxes[i].classId !== boxes[j].classId) continue;
        
        const iou = this.calculateIoU(boxes[i], boxes[j]);
        if (iou > iouThreshold) {
          active[j] = false;
        }
      }
    }
    
    return selected;
  }

  /**
   * Calculate Intersection over Union
   */
  private calculateIoU(box1: any, box2: any): number {
    const x1 = Math.max(box1.x1, box2.x1);
    const y1 = Math.max(box1.y1, box2.y1);
    const x2 = Math.min(box1.x2, box2.x2);
    const y2 = Math.min(box1.y2, box2.y2);
    
    const intersectionArea = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
    
    const box1Area = (box1.x2 - box1.x1) * (box1.y2 - box1.y1);
    const box2Area = (box2.x2 - box2.x1) * (box2.y2 - box2.y1);
    
    const unionArea = box1Area + box2Area - intersectionArea;
    
    return intersectionArea / unionArea;
  }

  /**
   * Run YOLO inference on video frame
   */
  private async runYOLOInference(): Promise<Array<{ label: string; confidence: number }>> {
    if (!this.videoElement || !this.yoloSession) return [];
    
    try {
      // Prepare input
      const inputTensor = await this.prepareYOLOv8Input(this.videoElement);
      if (!inputTensor) return [];
      
      // Run inference
      const feeds: any = {};
      feeds[this.yoloSession.inputNames[0]] = inputTensor;
      const results = await this.yoloSession.run(feeds);
      
      // Process output
      const output = results[this.yoloSession.outputNames[0]];
      const detections = this.processYOLOv8Output(output, YOLO_CONFIDENCE_THRESHOLD);
      
      return detections;
      
    } catch (err) {
      console.error("❌ YOLOv8 inference error:", err);
      return [];
    }
  }

  /**
   * Check for gaze tracking violations
   */
  private checkGazeViolations(): void {
    if (!this.lastGazePoint) {
      this.gazeOffScreenCount++;
      console.log(`👀 No gaze data (${this.gazeOffScreenCount}/${GAZE_OFFSCREEN_THRESHOLD})`);
      
      if (this.gazeOffScreenCount >= GAZE_OFFSCREEN_THRESHOLD) {
        this.logViolation('LOOKING_AWAY_FROM_SCREEN', 'No eye tracking data detected', 'medium');
        this.gazeOffScreenCount = 0;
      }
      return;
    }
    
    // Check if gaze is within screen bounds
    const isOnScreen = (
      this.lastGazePoint.x >= 0 && this.lastGazePoint.x <= window.innerWidth &&
      this.lastGazePoint.y >= 0 && this.lastGazePoint.y <= window.innerHeight
    );
    
    if (!isOnScreen) {
      this.gazeOffScreenCount++;
      console.log(`👀 Gaze off-screen (${this.gazeOffScreenCount}/${GAZE_OFFSCREEN_THRESHOLD})`);
      
      if (this.gazeOffScreenCount >= GAZE_OFFSCREEN_THRESHOLD) {
        this.logViolation(
          'GAZE_OFF_SCREEN',
          `Eyes looking away from screen (x: ${this.lastGazePoint.x.toFixed(0)}, y: ${this.lastGazePoint.y.toFixed(0)})`,
          'medium'
        );
        this.gazeOffScreenCount = 0;
      }
    } else {
      this.gazeOffScreenCount = 0;
      console.log('✓ Gaze check: OK');
    }
  }

  /**
   * Check for head pose violations
   */
  private async checkHeadPoseViolations(): Promise<void> {
    if (!this.videoElement || typeof window.faceapi === 'undefined') {
      console.log('⚠️ Head pose check skipped: video or faceapi not available');
      return;
    }
    
    try {
      // Get face landmarks (MVP uses withFaceLandmarks(true))
      const detections = await window.faceapi
        .detectSingleFace(this.videoElement, new window.faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks(true);
      
      if (!detections) {
        console.log('⚠️ Head pose check: No face detected');
        return;
      }
      
      // Analyze head pose from landmarks
      const landmarks = detections.landmarks;
      const nose = landmarks.getNose();
      const leftEye = landmarks.getLeftEye();
      const rightEye = landmarks.getRightEye();
      
      if (!nose || !leftEye || !rightEye || nose.length < 4) {
        console.log('⚠️ Head pose check: Insufficient landmarks');
        return;
      }
      
      // Calculate eye midpoint
      const eyeMidpoint = {
        x: (leftEye[0].x + rightEye[0].x) / 2,
        y: (leftEye[0].y + rightEye[0].y) / 2
      };
      
      const noseTip = nose[3];
      
      // Calculate angles (exact MVP approach - pixel offsets only)
      const horizontalOffset = Math.abs(noseTip.x - eyeMidpoint.x);
      const verticalOffset = Math.abs(noseTip.y - eyeMidpoint.y);
      
      // MVP exact thresholds (50px vertical, 80px horizontal)
      const verticalThreshold = 50; // pixels (matches MVP exactly)
      const horizontalThreshold = 80; // pixels (matches MVP exactly)
      
      const now = Date.now();
      let currentViolationType: string | null = null;
      
      // Check for violations (MVP exact thresholds)
      if (verticalOffset > verticalThreshold) {
        currentViolationType = 'LOOKING_DOWN';
      } else if (horizontalOffset > horizontalThreshold) {
        currentViolationType = 'LOOKING_SIDEWAYS';
      }
      
      // Check if violation state changed (cleared or new type)
      const violationCleared = this.isHeadPoseViolationActive && !currentViolationType;
      const violationTypeChanged = this.isHeadPoseViolationActive && 
                                   currentViolationType && 
                                   this.lastHeadPoseViolation?.type !== currentViolationType;
      
      // If violation cleared, reset cooldown
      if (violationCleared) {
        console.log('✓ Head pose violation cleared - user looking back');
        this.isHeadPoseViolationActive = false;
        this.lastHeadPoseViolation = null;
      }
      
      // If violation detected
      if (currentViolationType) {
        const timeSinceLastViolation = this.lastHeadPoseViolation 
          ? now - this.lastHeadPoseViolation.timestamp 
          : Infinity;
        
        // Check cooldown (prevent spam)
        if (timeSinceLastViolation < this.headPoseViolationCooldown) {
          // Still in cooldown - don't trigger again
          const remainingCooldown = Math.ceil((this.headPoseViolationCooldown - timeSinceLastViolation) / 1000);
          console.log(`🔍 Head pose violation detected (cooldown active, ${remainingCooldown}s remaining): ${currentViolationType} - vertical=${verticalOffset.toFixed(1)}px, horizontal=${horizontalOffset.toFixed(1)}px`);
          return;
        }
        
        // Cooldown expired or violation type changed - trigger violation
        if (violationTypeChanged || !this.isHeadPoseViolationActive) {
          console.log(`🚨 ${currentViolationType} violation detected! verticalOffset=${verticalOffset.toFixed(1)}px, horizontalOffset=${horizontalOffset.toFixed(1)}px`);
          this.logViolation(
            currentViolationType, 
            currentViolationType === 'LOOKING_DOWN' 
              ? 'Looking down (possibly at phone or paper)' 
              : 'Looking sideways (not facing camera)', 
            'medium'
          );
          
          // Set cooldown timestamp
          this.lastHeadPoseViolation = { type: currentViolationType, timestamp: now };
          this.isHeadPoseViolationActive = true;
        }
      } else {
        // No violation - just log OK status
        if (!this.isHeadPoseViolationActive) {
          console.log('✓ Head pose check: OK');
        }
      }
      
    } catch (error) {
      console.error('❌ Head pose detection error:', error);
    }
  }

  /**
   * Log a violation
   */
  private logViolation(type: string, details: string, severity: 'low' | 'medium' | 'high' | 'critical'): void {
    console.warn(`⚠️ AI VIOLATION: ${type} - ${details}`);
    
    // Update violation tracker
    violationTracker.recordViolation(type);
    
    // Record violation using proctoringService
    if (this.sessionId) {
      proctoringService.recordViolation({
        type,
        details,
        severity,
        timestamp: new Date(),
        metadata: {
          sessionId: this.sessionId,
          source: 'ai_monitoring'
        }
      });
    }
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<AIMonitoringConfig>): void {
    this.config = { ...this.config, ...config };
    console.log('✅ AI monitoring config updated:', this.config);
  }

  /**
   * Get current monitoring status
   */
  getStatus() {
    return {
      isMonitoring: this.isMonitoring,
      config: this.config,
      features: {
        yolo: this.isYoloReady,
        gaze: this.isGazeCalibrated,
        opencv: this.isOpenCVReady
      }
    };
  }
}

// Export singleton instance
export const aiMonitoringService = new AIMonitoringService();

