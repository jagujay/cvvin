// Gesture Analysis Service
// Tracks eye contact, expressions, hand movements, and head pose using MediaPipe

interface GestureData {
  eyeContact: {
    percentage: number;
    breakCount?: number;          // Number of times eye contact was broken
    longestBreakSeconds?: number; // Longest break duration in seconds
  };
  expressions: {
    [key: string]: number; // milliseconds each expression occurred
  };
  handMovements: {
    [key: string]: number; // count of each gesture
  };
  headPose: {
    [key: string]: number; // count of each pose change
  };
}

class GestureAnalysisService {
  private isInitialized = false;
  private isAnalyzing = false;
  private faceMesh: any = null;
  private hands: any = null;
  private pose: any = null;
  private camera: any = null;
  private videoElement: HTMLVideoElement | null = null;
  private canvasElement: HTMLCanvasElement | null = null;
  private canvasContext: CanvasRenderingContext2D | null = null;

  // Tracking data
  private eyeContactData = {
    totalSamples: 0,
    lookingAtCamera: 0,
    lookingAway: 0,
    percentage: 0,
    consecutiveAwayFrames: 0,  // Track consecutive frames looking away
    breakCount: 0,              // Number of times eye contact was broken
    lastWasLooking: true,       // Track previous state to detect breaks
    longestBreakFrames: 0       // Longest continuous break
  };

  private expressionData = {
    current: 'neutral',
    startTime: Date.now(),
    counts: {
      neutral: 0,
      happy: 0,
      sad: 0,
      angry: 0,
      fearful: 0,
      disgusted: 0,
      surprised: 0
    } as { [key: string]: number }
  };

  private handMovementData = {
    gestures: {
      pointing: 0,
      openPalm: 0,
      fidgeting: 0,
      still: 0,
      thumbsUp: 0,
      waving: 0
    } as { [key: string]: number },
    lastPosition: null as { x: number; y: number; z: number } | null,
    fidgetCount: 0
  };

  private headPoseData = {
    current: 'forward',
    counts: {
      forward: 0,
      left: 0,
      right: 0,
      down: 0,
      up: 0
    } as { [key: string]: number },
    lastPose: null as string | null
  };

  private frameInterval = 1000 / 30; // 30 FPS
  private lastFrameTime = 0;
  private animationFrameId: number | null = null;

  async initialize(videoElement: HTMLVideoElement, canvasElement: HTMLCanvasElement): Promise<void> {
    if (this.isInitialized) return;

    this.videoElement = videoElement;
    this.canvasElement = canvasElement;
    this.canvasContext = canvasElement.getContext('2d');

    // Wait for MediaPipe to be available (loaded via CDN)
    await this.waitForMediaPipe();

    await this.initializeFaceMesh();
    await this.initializeHands();
    await this.initializePose();

    this.isInitialized = true;
  }

  private async waitForMediaPipe(): Promise<void> {
    const maxAttempts = 50;
    let attempts = 0;

    while (attempts < maxAttempts) {
      if (
        (window as any).FaceMesh &&
        (window as any).Hands &&
        (window as any).Pose
      ) {
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }

    throw new Error('MediaPipe libraries not loaded. Please ensure scripts are included in index.html');
  }

  private async initializeFaceMesh(): Promise<void> {
    const FaceMesh = (window as any).FaceMesh;
    if (!FaceMesh) throw new Error('FaceMesh not available');

    this.faceMesh = new FaceMesh({
      locateFile: (file: string) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
      }
    });

    this.faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

    this.faceMesh.onResults(this.onFaceMeshResults.bind(this));
  }

  private async initializeHands(): Promise<void> {
    const Hands = (window as any).Hands;
    if (!Hands) throw new Error('Hands not available');

    this.hands = new Hands({
      locateFile: (file: string) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
      }
    });

    this.hands.setOptions({
      maxNumHands: 2,
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

    this.hands.onResults(this.onHandsResults.bind(this));
  }

  private async initializePose(): Promise<void> {
    const Pose = (window as any).Pose;
    if (!Pose) throw new Error('Pose not available');

    this.pose = new Pose({
      locateFile: (file: string) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
      }
    });

    this.pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      enableSegmentation: false,
      smoothSegmentation: false,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

    this.pose.onResults(this.onPoseResults.bind(this));
  }

  startAnalysis(): void {
    if (!this.isInitialized || this.isAnalyzing) return;

    this.isAnalyzing = true;
    this.resetMetrics();
    this.processFrame();
  }

  stopAnalysis(): void {
    this.isAnalyzing = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    // Finalize current expression time
    this.finalizeCurrentExpression();
  }

  private resetMetrics(): void {
    this.eyeContactData = {
      totalSamples: 0,
      lookingAtCamera: 0,
      lookingAway: 0,
      percentage: 0
    };

    this.expressionData = {
      current: 'neutral',
      startTime: Date.now(),
      counts: {
        neutral: 0,
        happy: 0,
        sad: 0,
        angry: 0,
        fearful: 0,
        disgusted: 0,
        surprised: 0
      }
    };

    this.handMovementData = {
      gestures: {
        pointing: 0,
        openPalm: 0,
        fidgeting: 0,
        still: 0,
        thumbsUp: 0,
        waving: 0
      },
      lastPosition: null,
      fidgetCount: 0
    };

    this.headPoseData = {
      current: 'forward',
      counts: {
        forward: 0,
        left: 0,
        right: 0,
        down: 0,
        up: 0
      },
      lastPose: null
    };
  }

  private async processFrame(): Promise<void> {
    if (!this.isAnalyzing || !this.videoElement) return;

    const now = performance.now();

    if (now - this.lastFrameTime >= this.frameInterval) {
      if (this.faceMesh && this.videoElement.videoWidth > 0) {
        await this.faceMesh.send({ image: this.videoElement });
      }
      if (this.hands && this.videoElement.videoWidth > 0) {
        await this.hands.send({ image: this.videoElement });
      }
      if (this.pose && this.videoElement.videoWidth > 0) {
        await this.pose.send({ image: this.videoElement });
      }

      this.lastFrameTime = now;
    }

    this.animationFrameId = requestAnimationFrame(() => this.processFrame());
  }

  private onFaceMeshResults(results: any): void {
    if (!this.canvasContext || !this.canvasElement || !results.multiFaceLandmarks) return;

    // Clear canvas
    this.canvasContext.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);

    if (results.multiFaceLandmarks.length > 0) {
      const landmarks = results.multiFaceLandmarks[0];
      this.analyzeEyeContact(landmarks);
      this.analyzeExpression(landmarks);
      this.analyzeHeadPose(landmarks);
    }
  }

  private onHandsResults(results: any): void {
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      this.analyzeHandActivity(results);
    }
  }

  private onPoseResults(results: any): void {
    // Pose results can be used for additional body language analysis if needed
  }

  private analyzeEyeContact(landmarks: any[]): void {
    try {
      // Iris landmarks (when refineLandmarks: true)
      // Left iris: 468-472, Right iris: 473-477
      const leftIrisCenter = landmarks[468];
      const rightIrisCenter = landmarks[473];

      // Eye corner landmarks
      const leftEyeLeft = landmarks[33];
      const leftEyeRight = landmarks[133];
      const rightEyeLeft = landmarks[362];
      const rightEyeRight = landmarks[263];
      
      // Eye top/bottom landmarks for vertical checking
      const leftEyeTop = landmarks[159];
      const leftEyeBottom = landmarks[145];
      const rightEyeTop = landmarks[386];
      const rightEyeBottom = landmarks[374];

      if (!leftIrisCenter || !rightIrisCenter) return;

      // Calculate iris position relative to eye corners (HORIZONTAL)
      const leftIrisRatioX = (leftIrisCenter.x - leftEyeLeft.x) / (leftEyeRight.x - leftEyeLeft.x);
      const rightIrisRatioX = (rightIrisCenter.x - rightEyeLeft.x) / (rightEyeRight.x - rightEyeLeft.x);
      const avgIrisRatioX = (leftIrisRatioX + rightIrisRatioX) / 2;

      // Calculate iris position relative to eye height (VERTICAL)
      const leftIrisRatioY = (leftIrisCenter.y - leftEyeTop.y) / (leftEyeBottom.y - leftEyeTop.y);
      const rightIrisRatioY = (rightIrisCenter.y - rightEyeTop.y) / (rightEyeBottom.y - rightEyeTop.y);
      const avgIrisRatioY = (leftIrisRatioY + rightIrisRatioY) / 2;

      // LENIENT THRESHOLDS for more realistic eye contact detection:
      // Horizontal: Wide range (0.30-0.70) - 40% tolerance for natural eye movement
      // Vertical: Wide range (0.30-0.70) - allows for natural up/down gaze
      const horizontalCentered = avgIrisRatioX > 0.30 && avgIrisRatioX < 0.70;
      const verticalCentered = avgIrisRatioY > 0.30 && avgIrisRatioY < 0.70;
      
      // BOTH horizontal AND vertical must be in acceptable range
      const lookingAtCamera = horizontalCentered && verticalCentered;

      this.eyeContactData.totalSamples++;
      
      // Track breaks and consecutive away frames
      if (lookingAtCamera) {
        this.eyeContactData.lookingAtCamera++;
        
        // If was looking away before, this is end of a break
        if (!this.eyeContactData.lastWasLooking) {
          // Update longest break if this was longer
          if (this.eyeContactData.consecutiveAwayFrames > this.eyeContactData.longestBreakFrames) {
            this.eyeContactData.longestBreakFrames = this.eyeContactData.consecutiveAwayFrames;
          }
          this.eyeContactData.consecutiveAwayFrames = 0;
        }
        
        this.eyeContactData.lastWasLooking = true;
      } else {
        this.eyeContactData.lookingAway++;
        this.eyeContactData.consecutiveAwayFrames++;
        
        // If was looking at camera before, this is a new break
        if (this.eyeContactData.lastWasLooking) {
          this.eyeContactData.breakCount++;
        }
        
        this.eyeContactData.lastWasLooking = false;
      }

      // Calculate percentage - NO PENALTIES, just raw percentage
      // This is more lenient and realistic for interview scenarios
      const percentage = (this.eyeContactData.lookingAtCamera / this.eyeContactData.totalSamples) * 100;
      
      this.eyeContactData.percentage = percentage;
    } catch (error) {
      console.warn('Eye contact analysis error:', error);
    }
  }

  private analyzeExpression(landmarks: any[]): void {
    try {
      // Mouth landmarks
      const mouthTop = landmarks[13];
      const mouthBottom = landmarks[14];
      const mouthLeft = landmarks[61];
      const mouthRight = landmarks[291];
      const mouthCornerLeft = landmarks[61];
      const mouthCornerRight = landmarks[291];

      // Eye landmarks
      const leftEyeTop = landmarks[159];
      const leftEyeBottom = landmarks[145];
      const rightEyeTop = landmarks[386];
      const rightEyeBottom = landmarks[374];
      
      // Eyebrow landmarks for better expression detection
      const leftEyebrowInner = landmarks[70];
      const leftEyebrowOuter = landmarks[46];
      const rightEyebrowInner = landmarks[300];
      const rightEyebrowOuter = landmarks[276];

      if (!mouthTop || !mouthBottom || !mouthLeft || !mouthRight) return;

      // Calculate mouth metrics
      const mouthWidth = Math.abs(mouthRight.x - mouthLeft.x);
      const mouthHeight = Math.abs(mouthBottom.y - mouthTop.y);
      const mouthRatio = mouthWidth / (mouthHeight + 0.0001);

      // Calculate mouth corner position (for smile detection)
      const mouthCenterY = (mouthTop.y + mouthBottom.y) / 2;
      const leftCornerRise = mouthCenterY - mouthCornerLeft.y;
      const rightCornerRise = mouthCenterY - mouthCornerRight.y;
      const avgCornerRise = (leftCornerRise + rightCornerRise) / 2;

      // Calculate eye metrics
      const leftEyeHeight = Math.abs(leftEyeTop.y - leftEyeBottom.y);
      const rightEyeHeight = Math.abs(rightEyeTop.y - rightEyeBottom.y);
      const avgEyeHeight = (leftEyeHeight + rightEyeHeight) / 2;

      // Calculate eyebrow position (for surprise/anger detection)
      const leftEyebrowHeight = leftEyebrowInner && leftEyeTop ? Math.abs(leftEyebrowInner.y - leftEyeTop.y) : 0;
      const rightEyebrowHeight = rightEyebrowInner && rightEyeTop ? Math.abs(rightEyebrowInner.y - rightEyeTop.y) : 0;
      const avgEyebrowHeight = (leftEyebrowHeight + rightEyebrowHeight) / 2;

      // SIMPLIFIED AND LENIENT EXPRESSION DETECTION
      // Most people appear neutral/calm during interviews - this is expected and good!
      let expression = 'neutral';
      
      // Happy: Clear smile (LENIENT - easy to detect genuine smiles)
      if (mouthRatio > 3.0 && avgCornerRise > 0.005) {
        expression = 'happy';
      }
      // Surprised: Very wide eyes and raised eyebrows (rare, needs clear signal)
      else if (avgEyeHeight > 0.030 && avgEyebrowHeight > 0.045) {
        expression = 'surprised';
      }
      // Sad: Clear frown (needs strong signal to avoid false positives)
      else if (avgCornerRise < -0.012) {
        expression = 'sad';
      }
      // Angry: Requires VERY clear signals (eyebrows very low, eyes narrow)
      // Made much stricter to avoid false positives
      else if (avgEyebrowHeight < 0.020 && avgEyeHeight < 0.015 && mouthRatio < 2.5) {
        expression = 'angry';
      }
      // Fearful: Wide eyes with tension (needs clear signal)
      else if (avgEyeHeight > 0.028 && mouthHeight > 0.025) {
        expression = 'fearful';
      }
      // Neutral: Default - most common and APPROPRIATE for interviews!
      // This is the expected baseline for professional settings
      else {
        expression = 'neutral';
      }

      // Update expression tracking
      if (expression !== this.expressionData.current) {
        // Finalize previous expression
        this.finalizeCurrentExpression();
        // Start new expression
        this.expressionData.current = expression;
        this.expressionData.startTime = Date.now();
      }
    } catch (error) {
      console.warn('Expression analysis error:', error);
    }
  }

  private finalizeCurrentExpression(): void {
    const duration = Date.now() - this.expressionData.startTime;
    const currentExpr = this.expressionData.current;
    if (this.expressionData.counts[currentExpr] !== undefined) {
      this.expressionData.counts[currentExpr] += duration;
    }
  }

  private analyzeHeadPose(landmarks: any[]): void {
    try {
      const noseTip = landmarks[1];
      const chin = landmarks[152];
      const foreheadCenter = landmarks[10];

      if (!noseTip || !foreheadCenter) return;

      // Calculate head orientation
      const horizontalDeviation = Math.abs(noseTip.x - 0.5);
      const verticalDist = Math.abs(noseTip.y - foreheadCenter.y);

      let pose = 'forward';

      if (horizontalDeviation > 0.15) {
        pose = noseTip.x > 0.5 ? 'right' : 'left';
      } else if (verticalDist < 0.15) {
        pose = 'down';
      } else if (noseTip.y < foreheadCenter.y - 0.1) {
        pose = 'up';
      } else {
        pose = 'forward';
      }

      // Track pose changes
      if (pose !== this.headPoseData.current) {
        const previousPose = this.headPoseData.current;
        
        if (this.headPoseData.lastPose && this.headPoseData.lastPose !== pose) {
          // Count the previous pose
          if (this.headPoseData.counts[this.headPoseData.lastPose] !== undefined) {
            this.headPoseData.counts[this.headPoseData.lastPose]++;
          }
        }
        
        this.headPoseData.lastPose = this.headPoseData.current;
        this.headPoseData.current = pose;
        
        // Console log head pose change
        console.log('🔄 Head Pose Changed:', {
          from: previousPose,
          to: pose,
          timestamp: new Date().toISOString(),
          counts: { ...this.headPoseData.counts },
          horizontalDeviation: horizontalDeviation.toFixed(3),
          verticalDist: verticalDist.toFixed(3)
        });
      }
    } catch (error) {
      console.warn('Head pose analysis error:', error);
    }
  }

  private analyzeHandActivity(results: any): void {
    try {
      const numHands = results.multiHandLandmarks ? results.multiHandLandmarks.length : 0;

      if (numHands === 0) {
        if (this.handMovementData.lastPosition !== null) {
          console.log('✋ Hand Lost: Hands no longer visible');
          this.handMovementData.lastPosition = null;
        }
        return;
      }

      const firstHand = results.multiHandLandmarks[0];
      const wrist = firstHand[0];
      const handedness = results.multiHandedness?.[0]?.label || 'Unknown';

      // Store previous gesture counts to detect changes
      const previousGestures = { ...this.handMovementData.gestures };

      // Detect gestures
      this.detectHandGestures(firstHand, handedness);

      // Check if any gesture count changed
      const gestureChanged = Object.keys(this.handMovementData.gestures).some(
        key => this.handMovementData.gestures[key] !== previousGestures[key]
      );

      // Track movement
      let movementDetected = false;
      let movementType = '';
      
      if (this.handMovementData.lastPosition) {
        const movement = Math.hypot(
          wrist.x - this.handMovementData.lastPosition.x,
          wrist.y - this.handMovementData.lastPosition.y
        );

        // Detect fidgeting (rapid small movements)
        if (movement > 0.01 && movement < 0.03) {
          this.handMovementData.fidgetCount++;
          this.handMovementData.gestures.fidgeting++;
          movementDetected = true;
          movementType = 'fidgeting';
        } else if (movement < 0.01) {
          this.handMovementData.gestures.still++;
          movementDetected = true;
          movementType = 'still';
        } else if (movement >= 0.03) {
          movementDetected = true;
          movementType = 'active';
        }
      }

      // Log hand movement changes
      if (gestureChanged || movementDetected) {
        const changedGestures = Object.keys(this.handMovementData.gestures)
          .filter(key => this.handMovementData.gestures[key] !== previousGestures[key])
          .map(key => ({
            gesture: key,
            previous: previousGestures[key],
            current: this.handMovementData.gestures[key],
            change: this.handMovementData.gestures[key] - previousGestures[key]
          }));

        if (changedGestures.length > 0 || movementDetected) {
          console.log('✋ Hand Movement Detected:', {
            handedness: handedness,
            numHands: numHands,
            movementType: movementType,
            gestureChanges: changedGestures,
            currentGestures: { ...this.handMovementData.gestures },
            fidgetCount: this.handMovementData.fidgetCount,
            timestamp: new Date().toISOString()
          });
        }
      }

      this.handMovementData.lastPosition = { x: wrist.x, y: wrist.y, z: wrist.z };
    } catch (error) {
      console.warn('Hand activity analysis error:', error);
    }
  }

  private detectHandGestures(landmarks: any[], handedness: string): void {
    try {
      const thumb = landmarks[4];
      const indexTip = landmarks[8];
      const middleTip = landmarks[12];
      const ringTip = landmarks[16];
      const pinkyTip = landmarks[20];
      const indexBase = landmarks[5];
      const middleBase = landmarks[9];
      const ringBase = landmarks[13];
      const pinkyBase = landmarks[17];

      // Check if fingers are extended
      const indexExtended = indexTip.y < indexBase.y;
      const middleExtended = middleTip.y < middleBase.y;
      const ringExtended = ringTip.y < ringBase.y;
      const pinkyExtended = pinkyTip.y < pinkyBase.y;
      const thumbExtended = thumb.x > indexBase.x;

      // Detect pointing (index extended, others not)
      if (indexExtended && !middleExtended && !ringExtended && !pinkyExtended) {
        this.handMovementData.gestures.pointing++;
      }

      // Detect open palm (all fingers extended)
      if (indexExtended && middleExtended && ringExtended && pinkyExtended) {
        this.handMovementData.gestures.openPalm++;
      }

      // Detect thumbs up (thumb extended, others not)
      if (thumbExtended && !indexExtended && !middleExtended) {
        this.handMovementData.gestures.thumbsUp++;
      }
    } catch (error) {
      // Gesture detection is optional
    }
  }

  getGestureData(): GestureData {
    // Finalize current expression before returning
    this.finalizeCurrentExpression();

    // Finalize head pose
    if (this.headPoseData.current && this.headPoseData.counts[this.headPoseData.current] !== undefined) {
      this.headPoseData.counts[this.headPoseData.current]++;
    }

    return {
      eyeContact: {
        percentage: this.eyeContactData.percentage,
        breakCount: this.eyeContactData.breakCount,
        longestBreakSeconds: Math.round((this.eyeContactData.longestBreakFrames / 30) * 10) / 10 // Convert frames to seconds (30fps)
      },
      expressions: { ...this.expressionData.counts },
      handMovements: { ...this.handMovementData.gestures },
      headPose: { ...this.headPoseData.counts }
    };
  }

  cleanup(): void {
    this.stopAnalysis();
    this.isInitialized = false;
    this.faceMesh = null;
    this.hands = null;
    this.pose = null;
  }
}

export const gestureAnalysisService = new GestureAnalysisService();
export type { GestureData };


