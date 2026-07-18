import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Camera, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { faceVerificationService } from '@/services/faceVerificationService';

interface Detection {
  type: 'face' | 'object';
  label: string;
  confidence: number;
  box?: { x: number; y: number; width: number; height: number };
}

export function AIMonitoringTest() {
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [faceApiLoaded, setFaceApiLoaded] = useState(false);
  const [yoloLoaded, setYoloLoaded] = useState(false);
  const [yoloSession, setYoloSession] = useState<any>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [mediaStream]);

  // Initialize camera and libraries - EXACT MVP APPROACH
  const handleInitialize = async () => {
    setIsLoading(true);
    try {
      toast({
        title: "Initializing",
        description: "Requesting camera access..."
      });

      // STEP 1: Get camera stream - EXACT MVP CODE
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 }
      });

      // STEP 2: Set video source - EXACT MVP CODE
      const webcam = videoRef.current;
      if (!webcam) throw new Error('Video element not found');
      
      webcam.srcObject = stream;
      setMediaStream(stream);
      
      console.log('✅ Camera stream attached');

      // STEP 3: Set canvas dimensions - EXACT MVP CODE
      const canvas = canvasRef.current;
      if (canvas && webcam) {
        canvas.width = 640;
        canvas.height = 480;
        console.log('✅ Canvas configured:', canvas.width, 'x', canvas.height);
      }

      // STEP 4: Load face-api.js
      toast({
        title: "Loading Models",
        description: "Loading face detection models..."
      });

      const faceApiSuccess = await faceVerificationService.loadFaceAPI();
      setFaceApiLoaded(faceApiSuccess);

      if (!faceApiSuccess) {
        throw new Error('Failed to load face-api.js');
      }

      // STEP 5: Try to load YOLO (optional)
      toast({
        title: "Loading YOLO",
        description: "Attempting to load object detection model..."
      });

      // Load ONNX Runtime if not already loaded
      if (typeof (window as any).ort === 'undefined') {
        console.log('Loading ONNX Runtime...');
        const script = document.createElement('script');
        script.src = '/libs/ort.min.js';
        script.async = true;
        await new Promise((resolve, reject) => {
          script.onload = () => {
            console.log('✅ ONNX Runtime loaded');
            resolve(null);
          };
          script.onerror = () => {
            console.warn('⚠️ Failed to load ONNX Runtime');
            reject(new Error('ONNX Runtime not available'));
          };
          document.head.appendChild(script);
        });
      }

      if (typeof (window as any).ort !== 'undefined') {
        try {
          // Configure ONNX Runtime WASM paths (like MVP)
          (window as any).ort.env.wasm.wasmPaths = '/libs/';
          console.log('📁 ONNX Runtime WASM path configured: /libs/');

          const modelPath = '/models/yolov8/yolov8n.onnx';
          console.log('Loading YOLO model from:', modelPath);
          
          // Check if model file exists
          const response = await fetch(modelPath);
          if (!response.ok) {
            throw new Error(`Model file not found: ${response.status}`);
          }

          const modelBuffer = await response.arrayBuffer();
          const session = await (window as any).ort.InferenceSession.create(modelBuffer);
          setYoloSession(session);
          setYoloLoaded(true);
          
          console.log('✅ YOLOv8 model loaded successfully');
          toast({
            title: "YOLO Loaded",
            description: "Object detection is ready!"
          });
        } catch (error: any) {
          console.warn('⚠️ YOLO model not available:', error);
          toast({
            title: "YOLO Not Available",
            description: error.message || "Object detection will be skipped (model file missing)",
            variant: "default"
          });
        }
      } else {
        toast({
          title: "YOLO Not Available",
          description: "ONNX Runtime could not be loaded",
          variant: "default"
        });
      }

      setIsInitialized(true);
      
      toast({
        title: "✅ Initialization Complete",
        description: "Camera is ready! You should see yourself on screen."
      });

    } catch (error: any) {
      console.error('Initialization error:', error);
      toast({
        variant: "destructive",
        title: "Initialization Failed",
        description: error.message || 'Failed to initialize monitoring'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Test face detection
  const testFaceDetection = async () => {
    console.log('🔍 Test Face Detection clicked');
    console.log('Video ref:', !!videoRef.current);
    console.log('Face API loaded:', faceApiLoaded);
    console.log('Canvas ref:', !!canvasRef.current);
    
    if (!videoRef.current || !faceApiLoaded || !canvasRef.current) {
      toast({
        variant: "destructive",
        title: "Not Ready",
        description: "Please initialize first"
      });
      return;
    }

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        addLog('Failed to get canvas context');
        return;
      }

      console.log('Video dimensions:', video.videoWidth, 'x', video.videoHeight);
      console.log('Canvas dimensions:', canvas.width, 'x', canvas.height);
      console.log('Video ready state:', video.readyState);
      console.log('Video paused:', video.paused);

      addLog('🔍 Running face detection...');

      // Check if video is actually playing
      if (video.readyState < 2) {
        addLog('❌ Video not ready (readyState: ' + video.readyState + ')');
        toast({
          variant: "destructive",
          title: "Video Not Ready",
          description: "Please wait for video to load"
        });
        return;
      }

      if (video.videoWidth === 0 || video.videoHeight === 0) {
        addLog('❌ Video dimensions are 0x0');
        toast({
          variant: "destructive",
          title: "Video Not Ready",
          description: "Video dimensions are invalid"
        });
        return;
      }

      // Ensure video is playing
      if (video.paused) {
        console.log('Video is paused, attempting to play...');
        await video.play();
        await new Promise(resolve => setTimeout(resolve, 500)); // Wait for frame
      }

      // Check TensorFlow.js backend
      const tf = (window as any).tf;
      if (tf) {
        console.log('TensorFlow.js available, backend:', tf.getBackend());
        // Wait for backend to be ready
        await tf.ready();
        console.log('TensorFlow.js backend ready');
      }

      // MVP approach: Detect directly on video element (line 691 of app-enhanced.js)
      console.log('Calling face-api detectAllFaces on video element (MVP approach)...');
      console.log('face-api available:', !!(window as any).faceapi);
      console.log('TinyFaceDetectorOptions:', !!(window as any).faceapi?.TinyFaceDetectorOptions);
      console.log('Video element:', video);
      console.log('Video srcObject:', !!video.srcObject);
      console.log('Video playing:', !video.paused);
      
      // EXACT MVP CODE from line 691:
      // const detections = await faceapi.detectAllFaces(webcam, new faceapi.TinyFaceDetectorOptions())
      //                                 .withFaceLandmarks(true)
      //                                 .withFaceDescriptors();
      
      const detectionPromise = (window as any).faceapi
        .detectAllFaces(video, new (window as any).faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks(true)
        .withFaceDescriptors();

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Face detection timeout (10s)')), 10000)
      );

      const detections = await Promise.race([detectionPromise, timeoutPromise]) as any;

      console.log('Detections:', detections);

      if (!detections || detections.length === 0) {
        addLog('❌ No faces detected');
        toast({
          title: "No Faces",
          description: "Make sure you're visible in the camera"
        });
        return;
      }

      addLog(`✅ Detected ${detections.length} face(s)`);

      // Clear canvas overlay and draw bounding boxes
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 3;
      
      detections.forEach((detection: any) => {
        const box = detection.detection.box;
        ctx.strokeRect(box.x, box.y, box.width, box.height);
        console.log('Drew box:', box);
      });

      if (detections.length > 1) {
        toast({
          variant: "destructive",
          title: "⚠️ Multiple Faces Detected",
          description: `Found ${detections.length} faces in frame`
        });
      } else {
        toast({
          title: "✅ Face Detected!",
          description: "Successfully detected your face"
        });
      }

    } catch (error: any) {
      console.error('Face detection error:', error);
      addLog(`❌ Error: ${error.message}`);
      toast({
        variant: "destructive",
        title: "Detection Failed",
        description: error.message
      });
    }
  };

  // Test object detection - MVP approach
  const testObjectDetection = async () => {
    if (!videoRef.current || !yoloLoaded || !yoloSession || !canvasRef.current) {
      toast({
        variant: "destructive",
        title: "Not Ready",
        description: "YOLO model not loaded"
      });
      return;
    }

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        addLog('Failed to get canvas context');
        return;
      }

      console.log('🔍 Test Object Detection clicked');
      addLog('🔍 Running YOLOv8 object detection...');

      // MVP approach: Use YOLO helper functions
      const detections = await runYOLOv8Inference(yoloSession, video, 0.5);

      console.log('YOLO detections:', detections);

      if (!detections || detections.length === 0) {
        addLog('❌ No objects detected');
        toast({
          title: "No Objects",
          description: "No objects detected in frame"
        });
        return;
      }

      addLog(`✅ Detected ${detections.length} object(s)`);

      // Clear canvas and draw bounding boxes
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const PROHIBITED_OBJECTS = ['cell phone', 'book', 'laptop', 'remote', 'keyboard'];
      let personCount = 0;
      const detectedObjects: string[] = [];

      detections.forEach((detection: any) => {
        const label = detection.label;
        const confidence = (detection.confidence * 100).toFixed(1);
        detectedObjects.push(`${label} (${confidence}%)`);

        if (label === 'person') personCount++;

        // Scale coordinates (YOLO uses 640x640, canvas is 640x480)
        const scaleX = canvas.width / 640;
        const scaleY = canvas.height / 640;
        const x1 = detection.x1 * scaleX;
        const y1 = detection.y1 * scaleY;
        const x2 = detection.x2 * scaleX;
        const y2 = detection.y2 * scaleY;
        const width = x2 - x1;
        const height = y2 - y1;

        // Draw box
        ctx.strokeStyle = PROHIBITED_OBJECTS.includes(label) ? '#e74c3c' : '#3498db';
        ctx.lineWidth = 2;
        ctx.strokeRect(x1, y1, width, height);

        // Draw label
        ctx.fillStyle = PROHIBITED_OBJECTS.includes(label) ? '#e74c3c' : '#3498db';
        ctx.font = '14px Arial';
        const labelText = `${label} ${confidence}%`;
        const textWidth = ctx.measureText(labelText).width;
        ctx.fillRect(x1, y1 - 20, textWidth + 10, 20);
        ctx.fillStyle = 'white';
        ctx.fillText(labelText, x1 + 5, y1 - 5);
      });

      console.log('Detected objects:', detectedObjects.join(', '));
      addLog(`Objects: ${detectedObjects.join(', ')}`);

      if (personCount > 1) {
        toast({
          variant: "destructive",
          title: "⚠️ Multiple People Detected",
          description: `Found ${personCount} people in frame`
        });
      }

      const prohibitedFound = detections.some((d: any) => PROHIBITED_OBJECTS.includes(d.label));
      if (prohibitedFound) {
        toast({
          variant: "destructive",
          title: "⚠️ Prohibited Object Detected",
          description: "Prohibited items found in frame"
        });
      } else {
        toast({
          title: "✅ Objects Detected",
          description: `Found ${detections.length} object(s)`
        });
      }

    } catch (error: any) {
      console.error('Object detection error:', error);
      addLog(`❌ Error: ${error.message}`);
      toast({
        variant: "destructive",
        title: "Detection Failed",
        description: error.message
      });
    }
  };

  // YOLO Helper Functions (from MVP yolo-helper.js)
  const prepareYOLOv8Input = async (videoElement: HTMLVideoElement, inputSize = 640): Promise<any> => {
    return new Promise((resolve) => {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = inputSize;
      tempCanvas.height = inputSize;
      const ctx = tempCanvas.getContext('2d');
      if (!ctx) throw new Error('Failed to get canvas context');
      
      ctx.drawImage(videoElement, 0, 0, inputSize, inputSize);
      const imageData = ctx.getImageData(0, 0, inputSize, inputSize);
      const pixels = imageData.data;
      
      const red = new Float32Array(inputSize * inputSize);
      const green = new Float32Array(inputSize * inputSize);
      const blue = new Float32Array(inputSize * inputSize);
      
      for (let i = 0; i < pixels.length; i += 4) {
        const idx = i / 4;
        red[idx] = pixels[i] / 255.0;
        green[idx] = pixels[i + 1] / 255.0;
        blue[idx] = pixels[i + 2] / 255.0;
      }
      
      const input = new Float32Array(3 * inputSize * inputSize);
      input.set(red, 0);
      input.set(green, inputSize * inputSize);
      input.set(blue, 2 * inputSize * inputSize);
      
      const ort = (window as any).ort;
      const tensor = new ort.Tensor('float32', input, [1, 3, inputSize, inputSize]);
      resolve(tensor);
    });
  };

  const processYOLOv8Output = (output: any, confidenceThreshold = 0.5, iouThreshold = 0.45): any[] => {
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

    const boxes: any[] = [];
    const data = output.data;
    const dims = output.dims;
    const numClasses = 80;
    const numBoxes = dims[2];
    
    for (let i = 0; i < numBoxes; i++) {
      let maxScore = 0;
      let maxClassId = 0;
      
      for (let j = 0; j < numClasses; j++) {
        const score = data[4 * numBoxes + j * numBoxes + i];
        if (score > maxScore) {
          maxScore = score;
          maxClassId = j;
        }
      }
      
      if (maxScore < confidenceThreshold) continue;
      
      const x = data[i];
      const y = data[numBoxes + i];
      const w = data[2 * numBoxes + i];
      const h = data[3 * numBoxes + i];
      
      boxes.push({
        x1: x - w / 2,
        y1: y - h / 2,
        x2: x + w / 2,
        y2: y + h / 2,
        classId: maxClassId,
        confidence: maxScore,
        label: YOLO_CLASSES[maxClassId]
      });
    }
    
    return applyNMS(boxes, iouThreshold);
  };

  const applyNMS = (boxes: any[], iouThreshold: number): any[] => {
    boxes.sort((a, b) => b.confidence - a.confidence);
    const selected: any[] = [];
    const active = new Array(boxes.length).fill(true);
    
    for (let i = 0; i < boxes.length; i++) {
      if (!active[i]) continue;
      selected.push(boxes[i]);
      
      for (let j = i + 1; j < boxes.length; j++) {
        if (!active[j] || boxes[i].classId !== boxes[j].classId) continue;
        const iou = calculateIoU(boxes[i], boxes[j]);
        if (iou > iouThreshold) active[j] = false;
      }
    }
    return selected;
  };

  const calculateIoU = (box1: any, box2: any): number => {
    const x1 = Math.max(box1.x1, box2.x1);
    const y1 = Math.max(box1.y1, box2.y1);
    const x2 = Math.min(box1.x2, box2.x2);
    const y2 = Math.min(box1.y2, box2.y2);
    const intersectionArea = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
    const box1Area = (box1.x2 - box1.x1) * (box1.y2 - box1.y1);
    const box2Area = (box2.x2 - box2.x1) * (box2.y2 - box2.y1);
    const unionArea = box1Area + box2Area - intersectionArea;
    return intersectionArea / unionArea;
  };

  const runYOLOv8Inference = async (session: any, videoElement: HTMLVideoElement, confidenceThreshold = 0.5): Promise<any[]> => {
    try {
      const inputTensor = await prepareYOLOv8Input(videoElement);
      const feeds: any = {};
      feeds[session.inputNames[0]] = inputTensor;
      const results = await session.run(feeds);
      const output = results[session.outputNames[0]];
      return processYOLOv8Output(output, confidenceThreshold);
    } catch (err: any) {
      console.error("YOLOv8 inference failed:", err);
      return [];
    }
  };

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[${timestamp}] ${message}`);
    setDetections(prev => [...prev.slice(-9), { 
      type: 'face', 
      label: message, 
      confidence: 0 
    }]);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="w-6 h-6" />
          AI Monitoring Test
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status */}
        <div className="flex gap-2">
          <Badge variant={faceApiLoaded ? "default" : "secondary"}>
            Face API: {faceApiLoaded ? "✅ Ready" : "❌ Not Loaded"}
          </Badge>
          <Badge variant={yoloLoaded ? "default" : "secondary"}>
            YOLO: {yoloLoaded ? "✅ Ready" : "❌ Not Available"}
          </Badge>
        </div>

        {/* Initialize Button */}
        {!isInitialized && (
          <Button 
            onClick={handleInitialize} 
            disabled={isLoading}
            className="w-full"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Initializing...
              </>
            ) : (
              <>
                <Camera className="w-4 h-4 mr-2" />
                Initialize AI Monitoring
              </>
            )}
          </Button>
        )}

        {/* Video Display - EXACT MVP STRUCTURE */}
        <div className="space-y-4" style={{ display: isInitialized ? 'block' : 'none' }}>
            {/* Video container - MVP style */}
            <div 
              style={{
                position: 'relative',
                width: '640px',
                height: '480px',
                margin: '0 auto',
                border: '1px solid #ccc',
                background: '#000'
              }}
            >
              {/* Video element - MVP exact attributes */}
              <video
                ref={videoRef}
                width="640"
                height="480"
                autoPlay
                muted
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0
                }}
              />
              
              {/* Canvas overlay - MVP exact attributes */}
              <canvas
                ref={canvasRef}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  pointerEvents: 'none'
                }}
              />
            </div>

            {/* Test Buttons */}
            <div className="grid grid-cols-2 gap-4">
              <Button
                onClick={testFaceDetection}
                disabled={!faceApiLoaded}
                variant="outline"
              >
                <Camera className="w-4 h-4 mr-2" />
                Test Face Detection
              </Button>
              
              <Button
                onClick={testObjectDetection}
                disabled={!yoloLoaded}
                variant="outline"
              >
                Test Object Detection
              </Button>
            </div>

            {/* Detection Log */}
            <div className="bg-muted p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Detection Log:</h3>
              <div className="space-y-1 max-h-40 overflow-y-auto font-mono text-sm">
                {detections.length === 0 ? (
                  <p className="text-muted-foreground">No detections yet. Click a test button above.</p>
                ) : (
                  detections.map((det, idx) => (
                    <div key={idx} className="text-xs">
                      [{new Date().toLocaleTimeString()}] {det.label}
                    </div>
                  ))
                )}
              </div>
            </div>
        </div>
      </CardContent>
    </Card>
  );
}
