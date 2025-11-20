/**
 * Face Verification Service
 * Handles face detection and verification using face-api.js
 */

// Declare face-api types
declare global {
  interface Window {
    faceapi: any;
  }
}

export interface FaceDescriptor {
  descriptor: Float32Array;
  label: string;
}

export interface FaceVerificationResult {
  success: boolean;
  confidence: number;
  error?: string;
}

class FaceVerificationService {
  private modelsLoaded = false;
  private referenceDescriptor: FaceDescriptor | null = null;
  private readonly MATCH_THRESHOLD = 0.5; // Lower = stricter matching

  /**
   * Load face-api.js library and models
   */
  async loadFaceAPI(): Promise<boolean> {
    try {
      // Check if face-api is already loaded
      if (typeof window.faceapi !== 'undefined' && this.modelsLoaded) {
        console.log('✅ Face-api.js already loaded');
        return true;
      }

      // Step 1: Load TensorFlow.js first (required dependency)
      console.log('📦 Loading TensorFlow.js (required for face-api.js)...');
      const tfLoaded = await this.loadTensorFlow();
      if (!tfLoaded) {
        throw new Error('TensorFlow.js is required but failed to load');
      }

      // Step 2: Load face-api.js - try local first, then CDN
      if (typeof window.faceapi === 'undefined') {
        console.log('📦 Loading face-api.js library...');
        
        const faceApiSources = [
          '/libs/face-api.min.js', // Local file
          'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js', // CDN fallback
        ];

        let loaded = false;
        for (const src of faceApiSources) {
          try {
            await this.loadScript(src);
            // Wait a moment for the library to initialize
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            if (typeof window.faceapi !== 'undefined') {
              console.log(`✅ Face-api.js library loaded from: ${src}`);
              loaded = true;
              break;
            }
          } catch (error: any) {
            console.warn(`   Failed to load from ${src}:`, error.message);
            continue;
          }
        }

        if (!loaded || typeof window.faceapi === 'undefined') {
          throw new Error('face-api.js library failed to load from all sources');
        }
      }

      // Try multiple sources for models (local first, then CDN)
      const MODEL_URLS = [
        '/models', // Local models in public folder (preferred)
        'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/weights',
        'https://unpkg.com/face-api.js@0.22.2/weights',
      ];

      console.log('📦 Loading face-api.js models...');
      
      let modelsLoaded = false;
      let lastError: Error | null = null;

      // Try each URL until one works
      for (const MODEL_URL of MODEL_URLS) {
        try {
          console.log(`   Trying to load models from: ${MODEL_URL}`);
          
          // Load models one by one to see which one fails
          console.log('     Loading tinyFaceDetector...');
          await window.faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
          console.log('     ✅ tinyFaceDetector loaded');
          
          console.log('     Loading faceLandmark68TinyNet...');
          await window.faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL);
          console.log('     ✅ faceLandmark68TinyNet loaded');
          
          console.log('     Loading faceRecognitionNet...');
          await window.faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
          console.log('     ✅ faceRecognitionNet loaded');

          modelsLoaded = true;
          console.log(`✅ All face-api.js models loaded from: ${MODEL_URL}`);
          break;
        } catch (error: any) {
          console.error(`   ❌ Failed to load from ${MODEL_URL}:`, error.message);
          console.error(`   Error details:`, error);
          lastError = error;
          continue;
        }
      }

      if (!modelsLoaded) {
        const errorMsg = lastError 
          ? `Failed to load models. Last error: ${lastError.message}. Check console for details.`
          : 'All model URLs failed. Make sure models are in /public/models/ or CDN is accessible.';
        throw new Error(errorMsg);
      }

      this.modelsLoaded = true;
      return true;
    } catch (error: any) {
      console.error('❌ Failed to load face-api.js:', error);
      console.error('   Error details:', error.message);
      console.error('   Stack:', error.stack);
      return false;
    }
  }

  /**
   * Load script dynamically
   */
  private loadScript(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // Check if script is already loaded
      const existingScript = document.querySelector(`script[src="${src}"]`);
      if (existingScript) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = src;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
      document.head.appendChild(script);
    });
  }

  /**
   * Load TensorFlow.js (required by face-api.js)
   */
  private async loadTensorFlow(): Promise<boolean> {
    try {
      // Check if TensorFlow is already loaded
      if (typeof (window as any).tf !== 'undefined') {
        console.log('✅ TensorFlow.js already loaded');
        return true;
      }

      // Try local first, then CDN
      const tfSources = [
        '/libs/tf.min.js',
        'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.15.0/dist/tf.min.js',
      ];

      for (const src of tfSources) {
        try {
          await this.loadScript(src);
          await new Promise(resolve => setTimeout(resolve, 500));
          
          if (typeof (window as any).tf !== 'undefined') {
            console.log(`✅ TensorFlow.js loaded from: ${src}`);
            return true;
          }
        } catch (error: any) {
          console.warn(`   Failed to load TensorFlow from ${src}:`, error.message);
          continue;
        }
      }

      throw new Error('TensorFlow.js failed to load from all sources');
    } catch (error: any) {
      console.error('❌ Failed to load TensorFlow.js:', error);
      return false;
    }
  }

  /**
   * Load reference face from image URL (profile image)
   */
  async loadReferenceFromImage(imageUrl: string): Promise<FaceDescriptor | null> {
    try {
      if (!this.modelsLoaded) {
        await this.loadFaceAPI();
      }

      if (!imageUrl || imageUrl.trim() === '') {
        throw new Error('Image URL is empty or invalid');
      }

      console.log('📷 Loading reference image from:', imageUrl);
      
      // Try to load image with better error handling
      const img = await this.loadImageWithFallback(imageUrl);

      console.log('📐 Image dimensions:', {
        width: img.width,
        height: img.height,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight
      });

      // Detect face in image - try multiple detection strategies
      console.log('🔍 Detecting face in reference image...');
      
      // Strategy 1: Try with default TinyFaceDetectorOptions
      let detection = await window.faceapi
        .detectSingleFace(img, new window.faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks(true)
        .withFaceDescriptor();

      // Strategy 2: If no detection, try with more sensitive options (lower input size)
      if (!detection) {
        console.log('⚠️ No face detected with default options, trying more sensitive detection...');
        detection = await window.faceapi
          .detectSingleFace(img, new window.faceapi.TinyFaceDetectorOptions({ 
            inputSize: 320, // Lower = more sensitive (default is 416)
            scoreThreshold: 0.3 // Lower = more sensitive (default is 0.5)
          }))
          .withFaceLandmarks(true)
          .withFaceDescriptor();
      }

      // Strategy 3: If still no detection, try with even more sensitive options
      if (!detection) {
        console.log('⚠️ Still no face detected, trying very sensitive detection...');
        detection = await window.faceapi
          .detectSingleFace(img, new window.faceapi.TinyFaceDetectorOptions({ 
            inputSize: 224, // Even lower
            scoreThreshold: 0.2 // Even lower
          }))
          .withFaceLandmarks(true)
          .withFaceDescriptor();
      }

      // Strategy 4: Try detecting all faces and use the largest one
      if (!detection) {
        console.log('⚠️ Trying to detect all faces and use the largest one...');
        const allDetections = await window.faceapi
          .detectAllFaces(img, new window.faceapi.TinyFaceDetectorOptions({ 
            inputSize: 224,
            scoreThreshold: 0.2
          }))
          .withFaceLandmarks(true)
          .withFaceDescriptor();

        if (allDetections && allDetections.length > 0) {
          // Find the largest face (by bounding box area)
          detection = allDetections.reduce((largest, current) => {
            const currentArea = current.detection.box.width * current.detection.box.height;
            const largestArea = largest.detection.box.width * largest.detection.box.height;
            return currentArea > largestArea ? current : largest;
          });
          console.log(`✅ Found ${allDetections.length} face(s), using the largest one`);
        }
      }

      // Strategy 5: Try SsdMobilenetv1 if available (more accurate but slower)
      if (!detection && window.faceapi.nets.ssdMobilenetv1) {
        console.log('⚠️ Trying SsdMobilenetv1 detector as fallback...');
        try {
          // Check if model is loaded
          if (!window.faceapi.nets.ssdMobilenetv1.isLoaded) {
            console.log('📦 Loading SsdMobilenetv1 model...');
            await window.faceapi.nets.ssdMobilenetv1.loadFromUri('/models');
          }
          
          detection = await window.faceapi
            .detectSingleFace(img, new window.faceapi.SsdMobilenetv1Options())
            .withFaceLandmarks(true)
            .withFaceDescriptor();
        } catch (ssdError) {
          console.warn('⚠️ SsdMobilenetv1 not available, skipping:', ssdError);
        }
      }

      if (!detection) {
        // Provide helpful error message with image info
        const imageInfo = `Image size: ${img.width}x${img.height}px (natural: ${img.naturalWidth}x${img.naturalHeight}px)`;
        throw new Error(`No face detected in reference image after trying multiple detection methods. ${imageInfo}. Please ensure your profile photo: 1) Clearly shows your face, 2) Is well-lit, 3) Your face is centered and facing the camera, 4) No sunglasses or masks covering your face.`);
      }

      console.log('✅ Face detected successfully:', {
        confidence: detection.detection.score,
        box: detection.detection.box
      });

      this.referenceDescriptor = {
        descriptor: detection.descriptor,
        label: 'reference',
      };

      console.log('✅ Reference face loaded from image');
      return this.referenceDescriptor;
    } catch (error: any) {
      console.error('❌ Failed to load reference from image:', error);
      throw error;
    }
  }

  /**
   * Load image with CORS fallback and better error handling
   */
  private async loadImageWithFallback(imageUrl: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      // If it's a blob URL, load it directly without CORS
      if (imageUrl.startsWith('blob:')) {
        console.log('📷 Loading blob URL (no CORS needed)');
        const img = new Image();
        let timeoutId: NodeJS.Timeout;
        
        timeoutId = setTimeout(() => {
          reject(new Error('Blob URL image loading timeout. The image data may be corrupted.'));
        }, 10000);

        img.onload = () => {
          clearTimeout(timeoutId);
          console.log('✅ Blob URL image loaded successfully');
          resolve(img);
        };

        img.onerror = (error) => {
          clearTimeout(timeoutId);
          console.error('❌ Failed to load blob URL image:', error);
          reject(new Error('Failed to load image from blob URL. The image data may be corrupted or invalid.'));
        };

        img.src = imageUrl;
        return;
      }

      // For regular URLs, try with CORS first
      const img = new Image();
      let timeoutId: NodeJS.Timeout;
      
      // Set timeout (10 seconds)
      timeoutId = setTimeout(() => {
        reject(new Error('Image loading timeout. The image may be too large or the server is not responding.'));
      }, 10000);

      // Try with CORS first (for cross-origin images)
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        clearTimeout(timeoutId);
        console.log('✅ Image loaded successfully with CORS');
        resolve(img);
      };

      img.onerror = (error) => {
        clearTimeout(timeoutId);
        console.warn('⚠️ Failed to load image with CORS, trying without CORS...');
        
        // Try without CORS (for same-origin images or if server doesn't support CORS)
        const img2 = new Image();
        let timeoutId2: NodeJS.Timeout;
        
        timeoutId2 = setTimeout(() => {
          reject(new Error('Image loading timeout. Please check if the image URL is accessible.'));
        }, 10000);

        img2.onload = () => {
          clearTimeout(timeoutId2);
          console.log('✅ Image loaded without CORS');
          resolve(img2);
        };

        img2.onerror = (error2) => {
          clearTimeout(timeoutId2);
          console.error('❌ Image load failed with both CORS methods');
          
          // Try to fetch via fetch API as last resort (for Firebase Storage URLs or other CORS-restricted sources)
          this.fetchImageAsBlob(imageUrl)
            .then((blob) => {
              const url = URL.createObjectURL(blob);
              const img3 = new Image();
              img3.onload = () => {
                URL.revokeObjectURL(url);
                resolve(img3);
              };
              img3.onerror = (error3) => {
                URL.revokeObjectURL(url);
                console.error('❌ Failed to load image from blob URL:', error3);
                reject(new Error('Failed to load image. The image URL may be invalid, inaccessible, or blocked by CORS policy. Please check your profile image URL.'));
              };
              img3.src = url;
            })
            .catch((fetchError) => {
              console.error('❌ Failed to fetch image as blob:', fetchError);
              reject(new Error(`Failed to load image: ${fetchError.message}. The image may be from a different domain and blocked by CORS, or the URL is invalid.`));
            });
        };

        img2.src = imageUrl;
      };

      img.src = imageUrl;
    });
  }

  /**
   * Fetch image as blob (for CORS-restricted images like Firebase Storage)
   */
  private async fetchImageAsBlob(imageUrl: string): Promise<Blob> {
    try {
      console.log('📥 Fetching image as blob...');
      const response = await fetch(imageUrl, {
        mode: 'cors',
        credentials: 'omit',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const blob = await response.blob();
      if (!blob.type.startsWith('image/')) {
        throw new Error('Response is not an image');
      }

      return blob;
    } catch (error: any) {
      // If fetch fails, try with no-cors mode (but this won't work for cross-origin)
      console.warn('⚠️ CORS fetch failed, trying no-cors mode...');
      try {
        const response = await fetch(imageUrl, {
          mode: 'no-cors',
        });
        const blob = await response.blob();
        return blob;
      } catch (noCorsError: any) {
        throw new Error(`Failed to fetch image: ${error.message}. If this is a Firebase Storage URL, make sure CORS is configured correctly.`);
      }
    }
  }

  /**
   * Capture and store reference face from video stream
   */
  async captureReferenceFromVideo(videoElement: HTMLVideoElement): Promise<FaceDescriptor | null> {
    try {
      if (!this.modelsLoaded) {
        await this.loadFaceAPI();
      }

      console.log('📹 Capturing reference face from video...');

      // Detect face in video frame
      const detection = await window.faceapi
        .detectSingleFace(videoElement, new window.faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks(true)
        .withFaceDescriptor();

      if (!detection) {
        throw new Error('No face detected in video. Please position yourself clearly in front of the camera.');
      }

      this.referenceDescriptor = {
        descriptor: detection.descriptor,
        label: 'live_capture',
      };

      console.log('✅ Reference face captured from video');
      return this.referenceDescriptor;
    } catch (error: any) {
      console.error('❌ Failed to capture reference from video:', error);
      throw error;
    }
  }

  /**
   * Verify face against reference
   */
  async verifyFace(videoElement: HTMLVideoElement): Promise<FaceVerificationResult> {
    try {
      if (!this.referenceDescriptor) {
        return {
          success: false,
          confidence: 0,
          error: 'No reference face loaded. Please complete Step 1 first.',
        };
      }

      if (!this.modelsLoaded) {
        await this.loadFaceAPI();
      }

      console.log('🔍 Verifying face...');
      console.log('📹 Video element state:', {
        readyState: videoElement.readyState,
        paused: videoElement.paused,
        videoWidth: videoElement.videoWidth,
        videoHeight: videoElement.videoHeight,
        srcObject: !!videoElement.srcObject
      });

      // Ensure video is playing
      if (videoElement.paused) {
        console.log('▶️ Video is paused, attempting to play...');
        try {
          await videoElement.play();
          console.log('✅ Video started playing');
        } catch (err) {
          console.error('❌ Failed to play video:', err);
        }
      }

      // Try multiple detection attempts with different settings
      let detection = null;
      const detectionAttempts = [
        { options: new window.faceapi.TinyFaceDetectorOptions(), label: 'default' },
        { options: new window.faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.3 }), label: 'sensitive' },
        { options: new window.faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.2 }), label: 'very sensitive' }
      ];

      for (const attempt of detectionAttempts) {
        console.log(`🔍 Trying face detection with ${attempt.label} settings...`);
        try {
          detection = await window.faceapi
            .detectSingleFace(videoElement, attempt.options)
            .withFaceLandmarks(true)
            .withFaceDescriptor();
          
          if (detection) {
            console.log(`✅ Face detected with ${attempt.label} settings`);
            break;
          }
        } catch (err) {
          console.warn(`⚠️ Detection attempt with ${attempt.label} settings failed:`, err);
        }
      }

      // If still no detection, try detecting all faces
      if (!detection) {
        console.log('🔍 Trying to detect all faces...');
        try {
          const allDetections = await window.faceapi
            .detectAllFaces(videoElement, new window.faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.2 }))
            .withFaceLandmarks(true)
            .withFaceDescriptor();
          
          if (allDetections && allDetections.length > 0) {
            // Use the largest face
            detection = allDetections.reduce((largest, current) => {
              const currentArea = current.detection.box.width * current.detection.box.height;
              const largestArea = largest.detection.box.width * largest.detection.box.height;
              return currentArea > largestArea ? current : largest;
            });
            console.log(`✅ Found ${allDetections.length} face(s), using the largest one`);
          }
        } catch (err) {
          console.warn('⚠️ All faces detection failed:', err);
        }
      }

      if (!detection) {
        return {
          success: false,
          confidence: 0,
          error: 'No face detected in camera. Please ensure: 1) You are facing the camera, 2) Good lighting, 3) Your face is clearly visible, 4) Camera is not blocked.',
        };
      }

      // Create face matcher
      const labeledDescriptors = new window.faceapi.LabeledFaceDescriptors(
        this.referenceDescriptor.label,
        [this.referenceDescriptor.descriptor]
      );
      const faceMatcher = new window.faceapi.FaceMatcher(labeledDescriptors, this.MATCH_THRESHOLD);

      // Match faces
      const bestMatch = faceMatcher.findBestMatch(detection.descriptor);
      const confidence = 1 - bestMatch.distance; // Convert distance to confidence (0-1)
      const confidencePercent = Math.round(confidence * 100);

      console.log(`📊 Face match: ${bestMatch.label !== 'unknown' ? 'MATCH' : 'NO MATCH'} (${confidencePercent}% confidence)`);

      if (bestMatch.label !== 'unknown' && bestMatch.distance < this.MATCH_THRESHOLD) {
        return {
          success: true,
          confidence: confidencePercent,
        };
      } else {
        return {
          success: false,
          confidence: confidencePercent,
          error: `Face verification failed. Confidence: ${confidencePercent}% (required: ${Math.round((1 - this.MATCH_THRESHOLD) * 100)}%)`,
        };
      }
    } catch (error: any) {
      console.error('❌ Face verification error:', error);
      return {
        success: false,
        confidence: 0,
        error: error.message || 'Face verification failed',
      };
    }
  }

  /**
   * Check if reference face is loaded
   */
  hasReference(): boolean {
    return this.referenceDescriptor !== null;
  }

  /**
   * Load Tesseract OCR for ID card scanning
   */
  async loadTesseract(): Promise<boolean> {
    try {
      // Check if Tesseract is already loaded
      if (typeof (window as any).Tesseract !== 'undefined') {
        return true;
      }

      // Load Tesseract from CDN
      await this.loadScript('https://cdn.jsdelivr.net/npm/tesseract.js@4.1.1/dist/tesseract.min.js');
      
      console.log('✅ Tesseract.js loaded');
      return true;
    } catch (error) {
      console.error('❌ Failed to load Tesseract.js:', error);
      return false;
    }
  }

  /**
   * Scan ID card using OCR
   */
  async scanIdCard(canvas: HTMLCanvasElement): Promise<string> {
    try {
      if (typeof (window as any).Tesseract === 'undefined') {
        await this.loadTesseract();
      }

      const Tesseract = (window as any).Tesseract;
      console.log('📄 Performing OCR on ID card...');
      
      const { data: { text } } = await Tesseract.recognize(canvas, 'eng');
      
      console.log('✅ OCR completed');
      return text || '(Could not read any text)';
    } catch (error: any) {
      console.error('❌ OCR error:', error);
      throw new Error('Failed to scan ID card text');
    }
  }

  /**
   * Load reference face from canvas (for ID card)
   */
  async loadReferenceFromCanvas(canvas: HTMLCanvasElement): Promise<FaceDescriptor | null> {
    try {
      if (!this.modelsLoaded) {
        await this.loadFaceAPI();
      }

      console.log('📷 Detecting face in ID card image...');

      // Detect face in canvas
      const detection = await window.faceapi
        .detectSingleFace(canvas, new window.faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks(true)
        .withFaceDescriptor();

      if (!detection) {
        return null;
      }

      this.referenceDescriptor = {
        descriptor: detection.descriptor,
        label: 'id_card',
      };

      console.log('✅ Reference face loaded from ID card');
      return this.referenceDescriptor;
    } catch (error: any) {
      console.error('❌ Failed to load reference from canvas:', error);
      throw error;
    }
  }

  /**
   * Clear reference face
   */
  clearReference() {
    this.referenceDescriptor = null;
  }

  /**
   * Get reference descriptor (for storage if needed)
   */
  getReferenceDescriptor(): FaceDescriptor | null {
    return this.referenceDescriptor;
  }
}

export const faceVerificationService = new FaceVerificationService();

