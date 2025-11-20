import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, XCircle, Loader2, Camera, Image as ImageIcon, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { proctoringService } from '@/services/proctoringService';
import { consolidatedAPI } from '@/services/consolidatedAPI';
import { faceVerificationService } from '@/services/faceVerificationService';
import { gazeCalibrationService } from '@/services/gazeCalibrationService';
import { User } from 'firebase/auth';

interface ProctoringSetupProps {
  user: User;
  onComplete: () => void;
  onError?: (error: string) => void;
  skipGazeCalibration?: boolean; // Skip gaze calibration for HR round
}

type SetupStep = 
  | 'checking-extension'
  | 'extension-required'
  | 'requesting-permissions'
  | 'permissions-denied'
  | 'select-verification'
  | 'loading-reference'
  | 'verifying-face'
  | 'calibrating-gaze'
  | 'ready';

export default function ProctoringSetup({ user, onComplete, onError, skipGazeCalibration = false }: ProctoringSetupProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<SetupStep>('checking-extension');
  const [extensionInstalled, setExtensionInstalled] = useState(false);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [verificationMethod, setVerificationMethod] = useState<'profile' | 'id-card' | null>(null);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [calibrationProgress, setCalibrationProgress] = useState(0);
  const [isCheckingExtension, setIsCheckingExtension] = useState(false);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<string>('');
  const [blobUrlToCleanup, setBlobUrlToCleanup] = useState<string | null>(null);
  const [displayImageUrl, setDisplayImageUrl] = useState<string | null>(null); // For displaying the reference image
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null); // Track current stream for cleanup

  // Step 1: Check extension
  useEffect(() => {
    checkExtension();
  }, []);

  const checkExtension = async () => {
    if (isCheckingExtension) return; // Prevent multiple simultaneous checks
    
    console.log('🔍 ProctoringSetup: Starting extension check...');
    setIsCheckingExtension(true);
    setStep('checking-extension');
    
    try {
      // Check browser first
      const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc|Microsoft/.test(navigator.vendor);
      const isEdge = /Edg/.test(navigator.userAgent);
      
      if (!isChrome && !isEdge) {
        setStep('extension-required');
        toast({
          variant: 'destructive',
          title: 'Browser Not Supported',
          description: 'Please use Google Chrome or Microsoft Edge browser. The extension requires Chrome/Edge.',
        });
        setIsCheckingExtension(false);
        return;
      }
      
      console.log('🔍 Checking for extension...');
      
      // First check: Try to detect if extension was just installed
      // Content scripts only inject on page load, so if extension was just installed,
      // we need to check if chrome.runtime is now available
      const wasExtensionJustInstalled = typeof chrome !== 'undefined' && 
                                        chrome.runtime && 
                                        !extensionInstalled;
      
      const installed = await proctoringService.checkExtensionInstalled();
      setExtensionInstalled(installed);
      
      if (!installed) {
        // Check if chrome.runtime is available but content script isn't responding
        // This means extension is installed but content script hasn't injected yet
        const hasChromeRuntime = typeof chrome !== 'undefined' && chrome.runtime;
        
        if (hasChromeRuntime) {
          // Extension is installed but content script not loaded
          // This happens when extension is installed after page load
          // Automatically reload the page
          console.log('⚠️ Extension is installed but content script not loaded.');
          console.log('   Reloading page to inject content script...');
          toast({
            variant: 'default',
            title: 'Extension Detected!',
            description: 'Reloading page to activate extension...',
            duration: 2000,
          });
          // Small delay to show the toast, then reload
          setTimeout(() => {
            window.location.reload();
          }, 500);
          return; // Don't set isCheckingExtension to false, we're reloading
        } else {
          setStep('extension-required');
          toast({
            variant: 'destructive',
            title: 'Extension Not Detected',
            description: 'Please ensure the extension is installed and enabled. Check console for details.',
          });
          console.log('❌ Extension check failed. Make sure:');
          console.log('   1. Extension is installed in chrome://extensions');
          console.log('   2. Extension is enabled');
          console.log('   3. Extension has been reloaded');
          console.log('   4. Page URL matches: http://localhost:8080/*');
        }
      } else {
        console.log('✅ Extension detected!');
        // Setup violation listener
        proctoringService.setupViolationListener();
        // Move to permissions
        requestPermissions();
      }
    } catch (error: any) {
      console.error('Error checking extension:', error);
      setStep('extension-required');
      toast({
        variant: 'destructive',
        title: 'Check Failed',
        description: error.message || 'An error occurred while checking for the extension.',
      });
    } finally {
      setIsCheckingExtension(false);
    }
  };

  // Step 2: Request permissions
  const requestPermissions = async () => {
    setStep('requesting-permissions');
    try {
      const stream = await proctoringService.requestMediaPermissions();
      if (stream) {
        setMediaStream(stream);
        mediaStreamRef.current = stream; // Store in ref for cleanup
        // Wait a bit for video element to be ready
        await new Promise(resolve => setTimeout(resolve, 100));
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          // Ensure video plays
          videoRef.current.play().catch(err => {
            console.error('Video play error:', err);
          });
        }
        // Load user profile to check for image
        loadUserProfile();
      }
    } catch (error: any) {
      setStep('permissions-denied');
      toast({
        variant: 'destructive',
        title: 'Permissions Required',
        description: error.message || 'Camera and microphone access is required.',
      });
      if (onError) {
        onError(error.message);
      }
    }
  };

  // Load user profile to get profile image
  const loadUserProfile = async () => {
    try {
      const profile = await consolidatedAPI.getUserProfile(user);
      if (profile.profileImageUrl) {
        setProfileImageUrl(profile.profileImageUrl);
        setStep('select-verification');
      } else {
        // No profile image, only allow live capture
        setStep('select-verification');
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
      setStep('select-verification');
    }
  };

  // Step 3: Select verification method
  const handleVerificationMethodSelect = (method: 'profile' | 'id-card') => {
    setVerificationMethod(method);
    
    if (method === 'profile') {
      if (!profileImageUrl) {
        toast({
          variant: 'destructive',
          title: 'No Profile Image',
          description: 'Please update your profile with a profile photo first.',
        });
        return;
      }
      setStep('loading-reference');
      // Load reference image and verify
      verifyWithProfileImage();
    } else {
      // ID card scanning method
      setStep('verifying-face');
      verifyWithIdCard();
    }
  };

  // Verify with profile image
  const verifyWithProfileImage = async () => {
    if (!profileImageUrl) {
      toast({
        variant: 'destructive',
        title: 'No Profile Image',
        description: 'Please update your profile with a profile photo first.',
      });
      return;
    }

    setStep('loading-reference');
    setIsLoadingModels(true);
    setVerificationStatus('Loading face detection models...');

    try {
      // Load face-api models
      const modelsLoaded = await faceVerificationService.loadFaceAPI();
      if (!modelsLoaded) {
        throw new Error('Failed to load face detection models');
      }

      setVerificationStatus('Loading reference image...');
      
      // Validate URL before attempting to load
      if (!profileImageUrl || !profileImageUrl.trim()) {
        throw new Error('Profile image URL is empty. Please update your profile with a profile photo.');
      }

      console.log('📷 Attempting to load profile image from:', profileImageUrl);
      console.log('📷 Profile image URL type check:', {
        startsWithUploads: profileImageUrl.startsWith('/uploads/'),
        isAbsoluteUrl: profileImageUrl.startsWith('http://') || profileImageUrl.startsWith('https://'),
        isBlob: profileImageUrl.startsWith('blob:'),
        isBackendApiUrl: profileImageUrl.includes('/api/images/'),
        fullUrl: profileImageUrl
      });
      
      // If the image URL is a relative path (starts with /uploads/) OR a backend API URL, fetch it through backend with auth
      let imageUrlToUse = profileImageUrl;
      const BACKEND_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
      const isBackendApiUrl = profileImageUrl.includes('/api/images/') || profileImageUrl.startsWith(BACKEND_BASE_URL);
      
      if (profileImageUrl.startsWith('/uploads/') || isBackendApiUrl) {
        setVerificationStatus('Fetching authenticated image...');
        try {
          // Get auth token
          const token = await user.getIdToken();
          
          // Determine the correct backend URL
          let backendImageUrl: string;
          if (profileImageUrl.startsWith('/uploads/')) {
            // Relative path - use serve-by-path endpoint
            backendImageUrl = `${BACKEND_BASE_URL}/api/files/serve-by-path?path=${encodeURIComponent(profileImageUrl)}`;
          } else if (isBackendApiUrl) {
            // Already a backend API URL - use it directly with auth
            backendImageUrl = profileImageUrl;
          } else {
            throw new Error('Unexpected image URL format');
          }
          
          console.log('📥 Fetching authenticated image from backend:', backendImageUrl);
          console.log('📥 Auth token present:', !!token);
          
          // Fetch image with authentication
          const response = await fetch(backendImageUrl, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          console.log('📥 Response status:', response.status, response.statusText);
          console.log('📥 Response headers:', Object.fromEntries(response.headers.entries()));

          if (!response.ok) {
            let errorText = '';
            try {
              errorText = await response.text();
              console.error('❌ Backend error response:', errorText);
            } catch (e) {
              console.error('❌ Could not read error response');
            }
            throw new Error(`Failed to fetch image: HTTP ${response.status} - ${errorText || response.statusText}`);
          }

          const blob = await response.blob();
          console.log('📥 Blob received:', {
            size: blob.size,
            type: blob.type,
            isImage: blob.type.startsWith('image/')
          });
          
          if (!blob.type.startsWith('image/')) {
            throw new Error(`Response is not an image. Content-Type: ${blob.type}`);
          }

          // Create object URL from blob
          imageUrlToUse = URL.createObjectURL(blob);
          setBlobUrlToCleanup(imageUrlToUse); // Store for cleanup
          setDisplayImageUrl(imageUrlToUse); // Store for UI display
          console.log('✅ Image fetched successfully, created blob URL:', imageUrlToUse);
        } catch (fetchError: any) {
          console.error('❌ Failed to fetch authenticated image:', fetchError);
          console.error('❌ Error stack:', fetchError.stack);
          throw new Error(`Failed to load profile image: ${fetchError.message}. Please try using the "Use Identity Card" option instead.`);
        }
      } else {
        console.log('📷 Image URL is not a relative path, using directly:', profileImageUrl);
        setDisplayImageUrl(profileImageUrl); // Set for UI display
      }
      
      // Load reference face from profile image
      try {
        await faceVerificationService.loadReferenceFromImage(imageUrlToUse);
        
        // Clean up blob URL if we created one
        if (imageUrlToUse.startsWith('blob:')) {
          // Don't revoke immediately, wait until we're done with verification
          // We'll clean it up in the cleanup effect
        }
      } catch (error) {
        // Clean up blob URL on error
        if (imageUrlToUse.startsWith('blob:')) {
          URL.revokeObjectURL(imageUrlToUse);
        }
        throw error;
      }
      
      setVerificationStatus('Reference loaded. Verifying face...');
      setStep('verifying-face');

      // Wait for React to update the DOM and video element to be mounted
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Wait for video element to be in DOM
      let retries = 10;
      while (!videoRef.current && retries > 0) {
        console.log(`⏳ Waiting for video element to mount... (${retries} retries left)`);
        await new Promise(resolve => setTimeout(resolve, 100));
        retries--;
      }
      
      if (!videoRef.current) {
        throw new Error('Video element not found in DOM. Please refresh the page.');
      }
      
      // Additional wait for UI to fully update
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Ensure video element is ready and stream is attached
      if (!videoRef.current) {
        throw new Error('Video element not available');
      }

      // Ensure video stream is attached and playing
      if (!mediaStream) {
        throw new Error('Media stream not available. Please grant camera permissions.');
      }

      // Check if stream is still active and try to recover if not
      let activeTracks = mediaStream.getVideoTracks().filter(track => track.readyState === 'live');
      
      if (activeTracks.length === 0) {
        console.error('❌ No active video tracks in stream! Attempting to get new stream...');
        
        // Try to get a new stream
        try {
          const newStream = await proctoringService.requestMediaPermissions();
          if (newStream) {
            setMediaStream(newStream);
            mediaStreamRef.current = newStream; // Store in ref for cleanup
            // Update videoRef with new stream
            if (videoRef.current) {
              videoRef.current.srcObject = newStream;
              await videoRef.current.play();
            }
            // Check new stream
            activeTracks = newStream.getVideoTracks().filter(track => track.readyState === 'live');
            if (activeTracks.length === 0) {
              throw new Error('Unable to activate camera. Please check camera permissions and try again.');
            }
            console.log(`✅ New stream obtained with ${activeTracks.length} active video track(s)`);
            // Update mediaStream variable for rest of function
            // Use the newStream in videoRef
          } else {
            throw new Error('Failed to obtain new camera stream.');
          }
        } catch (streamError: any) {
          console.error('❌ Failed to recover stream:', streamError);
          throw new Error('Camera stream is not active and could not be recovered. Please refresh the page and ensure camera permissions are granted.');
        }
      } else {
        console.log(`✅ Stream has ${activeTracks.length} active video track(s)`);
      }

      if (videoRef.current) {
        console.log('📹 Checking video element state:', {
          hasSrcObject: !!videoRef.current.srcObject,
          srcObjectMatches: videoRef.current.srcObject === mediaStream,
          readyState: videoRef.current.readyState,
          paused: videoRef.current.paused,
          videoWidth: videoRef.current.videoWidth,
          videoHeight: videoRef.current.videoHeight
        });

        if (videoRef.current.srcObject !== mediaStream) {
          console.log('📹 Attaching video stream before verification');
          videoRef.current.srcObject = mediaStream;
        }
        
        // Ensure video has dimensions (means stream is working)
        if (videoRef.current.videoWidth === 0 || videoRef.current.videoHeight === 0) {
          console.warn('⚠️ Video has no dimensions, waiting for stream to start...');
          await new Promise((resolve) => {
            const checkDimensions = () => {
              if (videoRef.current && videoRef.current.videoWidth > 0 && videoRef.current.videoHeight > 0) {
                console.log('✅ Video dimensions available:', videoRef.current.videoWidth, 'x', videoRef.current.videoHeight);
                resolve(undefined);
              } else {
                setTimeout(checkDimensions, 100);
              }
            };
            setTimeout(() => {
              if (videoRef.current && videoRef.current.videoWidth === 0) {
                console.warn('⚠️ Video still has no dimensions after wait');
                resolve(undefined); // Continue anyway
              }
            }, 3000);
            checkDimensions();
          });
        }
        
        // Force play
        try {
          await videoRef.current.play();
          console.log('✅ Video play() called successfully');
        } catch (playError) {
          console.error('❌ Video play() failed:', playError);
          // Continue anyway, video might still work
        }
      }
      
      // Wait for video to be ready (give it time to load)
      await new Promise((resolve) => {
        if (videoRef.current) {
          if (videoRef.current.readyState >= 2) { // HAVE_CURRENT_DATA
            console.log('✅ Video already ready');
            resolve(undefined);
          } else {
            console.log('⏳ Waiting for video to load...');
            const timeout = setTimeout(() => {
              console.warn('⚠️ Video load timeout, continuing anyway');
              resolve(undefined);
            }, 3000);
            videoRef.current.addEventListener('loadeddata', () => {
              clearTimeout(timeout);
              console.log('✅ Video loaded data');
              resolve(undefined);
            }, { once: true });
          }
        } else {
          console.warn('⚠️ Video element not found, continuing anyway');
          resolve(undefined);
        }
      });

      // Countdown
      setVerificationStatus('Get ready... Look at the camera.');
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      for (let i = 3; i > 0; i--) {
        setVerificationStatus(`${i}...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      setVerificationStatus('Verifying...');
      
      // Perform verification
      const result = await faceVerificationService.verifyFace(videoRef.current);

      if (result.success) {
        setVerificationStatus(`Verification successful! (${result.confidence}% confidence)`);
        toast({
          title: 'Face Verified!',
          description: `Verification successful with ${result.confidence}% confidence.`,
        });
        
        // Move to gaze calibration or skip to ready
        setTimeout(() => {
          if (skipGazeCalibration) {
            // Skip gaze calibration and go directly to ready
            setStep('ready');
            finishSetup();
          } else {
            setStep('calibrating-gaze');
            startGazeCalibration();
          }
        }, 1500);
      } else {
        throw new Error(result.error || 'Face verification failed');
      }
    } catch (error: any) {
      console.error('Verification error:', error);
      const errorMessage = error.message || 'Failed to verify face. Please try again.';
      setVerificationStatus(`Error: ${errorMessage}`);
      
      // Provide more helpful error messages
      let userFriendlyMessage = errorMessage;
      if (errorMessage.includes('Failed to load image') || errorMessage.includes('CORS')) {
        userFriendlyMessage = 'Failed to load profile image. This may be due to CORS restrictions. Please try using the "Use Identity Card" option instead, or contact support if the issue persists.';
      } else if (errorMessage.includes('No face detected')) {
        userFriendlyMessage = 'No face detected in your profile photo. Please update your profile with a clear photo of your face, or use the "Use Identity Card" option instead.';
      } else if (errorMessage.includes('timeout')) {
        userFriendlyMessage = 'Image loading timed out. Please check your internet connection or try using the "Use Identity Card" option instead.';
      }
      
      toast({
        variant: 'destructive',
        title: 'Verification Failed',
        description: userFriendlyMessage,
        duration: 8000, // Show longer for helpful messages
      });
      setStep('select-verification');
    } finally {
      setIsLoadingModels(false);
    }
  };

  // Verify with ID card scanning
  const verifyWithIdCard = async () => {
    setStep('verifying-face');
    setIsLoadingModels(true);
    setVerificationStatus('Loading face detection and OCR models...');

    try {
      // Load face-api models
      const modelsLoaded = await faceVerificationService.loadFaceAPI();
      if (!modelsLoaded) {
        throw new Error('Failed to load face detection models');
      }

      // Load Tesseract for OCR
      await faceVerificationService.loadTesseract();

      if (!videoRef.current || !canvasRef.current) {
        throw new Error('Video or canvas element not available');
      }

      setVerificationStatus('Hold your ID card up to the camera...');
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Countdown for ID capture
      setVerificationStatus('Capturing ID card in...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      for (let i = 3; i > 0; i--) {
        setVerificationStatus(`${i}...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      setVerificationStatus('Scanning ID card...');
      
      // Capture ID card image to canvas
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Could not get canvas context');
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Perform OCR on ID card
      setVerificationStatus('Extracting text from ID card...');
      const extractedText = await faceVerificationService.scanIdCard(canvas);
      console.log('📄 Extracted text from ID:', extractedText);

      // Detect and extract face from ID card
      setVerificationStatus('Detecting face on ID card...');
      const idFaceDescriptor = await faceVerificationService.loadReferenceFromCanvas(canvas);
      
      if (!idFaceDescriptor) {
        throw new Error('No face found on ID card. Please ensure your face is clearly visible on the ID.');
      }

      setVerificationStatus('ID scanned! Now verify your face...');
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Countdown for face verification
      setVerificationStatus('Get ready... Look at the camera.');
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      for (let i = 3; i > 0; i--) {
        setVerificationStatus(`${i}...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      setVerificationStatus('Verifying...');
      
      // Verify current face against ID face
      const result = await faceVerificationService.verifyFace(videoRef.current);

      if (result.success) {
        setVerificationStatus(`Verification successful! (${result.confidence}% confidence)`);
        toast({
          title: 'Face Verified!',
          description: `ID scanned and face verified with ${result.confidence}% confidence.`,
        });
        
        // Move to gaze calibration or skip to ready
        setTimeout(() => {
          if (skipGazeCalibration) {
            // Skip gaze calibration and go directly to ready
            setStep('ready');
            finishSetup();
          } else {
            setStep('calibrating-gaze');
            startGazeCalibration();
          }
        }, 1500);
      } else {
        throw new Error(result.error || 'Face verification failed');
      }
    } catch (error: any) {
      console.error('ID card verification error:', error);
      setVerificationStatus(`Error: ${error.message}`);
      toast({
        variant: 'destructive',
        title: 'Verification Failed',
        description: error.message || 'Failed to scan ID or verify face. Please try again.',
      });
      setStep('select-verification');
    } finally {
      setIsLoadingModels(false);
    }
  };

  // Finish setup (skip gaze calibration for HR round)
  const finishSetup = async () => {
    setVerificationStatus('Setup complete!');
    
    // Start monitoring (extension-side only, NOT violation monitoring yet)
    await proctoringService.startMonitoring();
    
    // For HR round (skipGazeCalibration = true), show button to start (fullscreen needs user click)
    if (skipGazeCalibration) {
      // Just set step to ready - user will click button to start
      setStep('ready');
      return;
    }
    
    // For technical round, enter fullscreen automatically (after gaze calibration which is user interaction)
    console.log('🖥️ Requesting fullscreen...');
    toast({
      title: "Entering Fullscreen",
      description: "Interview will run in fullscreen mode for security"
    });
    
    const fullscreenSuccess = await proctoringService.enterFullscreen();
    if (!fullscreenSuccess) {
      console.warn('⚠️ Fullscreen request was denied by browser');
      // Still allow the interview to proceed
      toast({
        variant: "default",
        title: "Fullscreen Recommended",
        description: "For best experience, please enable fullscreen"
      });
      // Don't return - continue anyway
    } else {
      console.log('✅ Entered fullscreen successfully');
    }
    
    // Call onComplete after a moment
    console.log('✅ Proctoring setup complete. Starting interview...');
    setTimeout(() => {
      onComplete();
    }, 1000);
  };

  // Step 4: Gaze calibration
  const startGazeCalibration = async () => {
    setCalibrationProgress(0);
    setVerificationStatus('Loading WebGazer for eye tracking...');
    
    try {
      // Load WebGazer
      const loaded = await gazeCalibrationService.loadWebGazer();
      if (!loaded) {
        throw new Error('Failed to load WebGazer');
      }

      // Initialize WebGazer
      setVerificationStatus('Initializing eye tracking...');
      const initialized = await gazeCalibrationService.initialize();
      if (!initialized) {
        throw new Error('Failed to initialize WebGazer');
      }

      setVerificationStatus('Starting calibration...');
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Perform calibration
      const calibrated = await gazeCalibrationService.calibrate(
        (current, total, message) => {
          const progress = Math.round((current / total) * 100);
          setCalibrationProgress(progress);
          setVerificationStatus(message);
        }
      );

      if (!calibrated) {
        throw new Error('Calibration failed');
      }

      setVerificationStatus('Calibration complete!');
      toast({
        title: 'Calibration Complete',
        description: 'Eye tracking has been calibrated successfully.',
      });

      setStep('ready');
      
      // Use finishSetup to complete the setup
      await finishSetup();
    } catch (error: any) {
      console.error('Calibration error:', error);
      setVerificationStatus(`Error: ${error.message}`);
      toast({
        variant: 'destructive',
        title: 'Calibration Failed',
        description: error.message || 'Failed to calibrate eye tracking.',
      });
      
      // Allow retry
      setTimeout(() => {
        setStep('select-verification');
      }, 2000);
    }
  };

  // Ensure video stream is attached and playing whenever step changes
  useEffect(() => {
    if (mediaStream && videoRef.current) {
      console.log('📹 useEffect triggered - step:', step, 'hasStream:', !!mediaStream);
      
      // Always ensure stream is attached
      if (videoRef.current.srcObject !== mediaStream) {
        console.log('📹 Re-attaching video stream to video element');
        videoRef.current.srcObject = mediaStream;
      }
      
      // Try to play the video with retry logic
      const playVideo = async (retries = 3) => {
        if (!videoRef.current) return;
        
        try {
          await videoRef.current.play();
          console.log('✅ Video playing successfully');
        } catch (err: any) {
          console.error(`❌ Video play error (${retries} retries left):`, err);
          if (retries > 0) {
            // Retry after a short delay
            setTimeout(() => playVideo(retries - 1), 200);
          }
        }
      };
      
      // Small delay to ensure element is ready, especially after step change
      const delay = step === 'verifying-face' || step === 'loading-reference' ? 300 : 100;
      setTimeout(playVideo, delay);
    } else {
      console.warn('⚠️ Video stream or element not available:', {
        hasStream: !!mediaStream,
        hasElement: !!videoRef.current,
        step
      });
    }
  }, [step, mediaStream]);

  // Cleanup blob URL when it changes
  useEffect(() => {
    return () => {
      if (blobUrlToCleanup) {
        console.log('🧹 Cleaning up blob URL:', blobUrlToCleanup);
        URL.revokeObjectURL(blobUrlToCleanup);
      }
    };
  }, [blobUrlToCleanup]);

  // Cleanup media stream and WebGazer only when component unmounts
  useEffect(() => {
    return () => {
      console.log('🧹 Component unmounting, cleaning up...');
      
      // Stop media stream
      if (mediaStreamRef.current) {
        proctoringService.stopMediaStream(mediaStreamRef.current);
        mediaStreamRef.current = null;
      }
      
      // Stop WebGazer
      gazeCalibrationService.stop();
    };
  }, []); // Empty deps = only run on unmount

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      {/* Hidden video element - always mounted to maintain stream */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="hidden"
        onLoadedMetadata={() => {
          console.log('✅ Video metadata loaded (always-mounted element)');
          if (videoRef.current) {
            videoRef.current.play().catch(err => {
              console.error('❌ Video play error:', err);
            });
          }
        }}
        onPlay={() => {
          console.log('✅ Video playing (always-mounted element)');
        }}
      />
      
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-2xl">Proctoring Setup</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Step 1: Extension Check */}
          {step === 'checking-extension' && (
            <div className="flex items-center gap-4">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span>Checking for Proctoring Extension...</span>
            </div>
          )}

          {step === 'extension-required' && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-4">
                  <p className="font-semibold">The Proctoring Extension is required to continue.</p>
                  
                  <div className="text-sm space-y-2">
                    <p className="font-semibold">To install:</p>
                    <ol className="list-decimal list-inside space-y-1 ml-2">
                      <li>Open Chrome and go to <code className="bg-muted px-1 rounded">chrome://extensions</code></li>
                      <li>Enable &quot;Developer mode&quot; (toggle in top-right)</li>
                      <li>Click &quot;Load unpacked&quot;</li>
                      <li>Select the <code className="bg-muted px-1 rounded">Projects/proctor-extension</code> folder</li>
                      <li>Verify the extension is enabled (toggle should be ON)</li>
                      <li>Click the reload icon (🔄) on the extension</li>
                    </ol>
                  </div>

                  <Button 
                    onClick={() => window.location.reload()} 
                    className="mt-4 w-full"
                  >
                    Check Again
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Step 2: Permissions */}
          {step === 'requesting-permissions' && (
            <div className="flex items-center gap-4">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span>Requesting camera and microphone permissions...</span>
            </div>
          )}

          {step === 'permissions-denied' && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                <p>Camera and microphone access is required for proctoring.</p>
                <Button onClick={requestPermissions} className="mt-2">
                  Try Again
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Step 3: Verification Method Selection */}
          {step === 'select-verification' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Choose how you want to verify your identity:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card
                  className={`cursor-pointer transition-all ${
                    verificationMethod === 'profile' ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => handleVerificationMethodSelect('profile')}
                >
                  <CardContent className="p-6 text-center space-y-2">
                    <ImageIcon className="w-8 h-8 mx-auto" />
                    <h3 className="font-semibold">Use Profile Photo</h3>
                    <p className="text-sm text-muted-foreground">
                      Verify using your profile image
                    </p>
                    {!profileImageUrl && (
                      <p className="text-xs text-destructive mt-2">
                        No profile photo found. Please update your profile first.
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card
                  className={`cursor-pointer transition-all ${
                    verificationMethod === 'id-card' ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => handleVerificationMethodSelect('id-card')}
                >
                  <CardContent className="p-6 text-center space-y-2">
                    <Camera className="w-8 h-8 mx-auto" />
                    <h3 className="font-semibold">Use Identity Card</h3>
                    <p className="text-sm text-muted-foreground">
                      Scan your ID card to verify identity
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Step 4: Loading Reference / Verifying */}
          {step === 'loading-reference' && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Loader2 className="w-6 h-6 animate-spin" />
                <span>{verificationStatus || 'Loading reference image...'}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {displayImageUrl && (
                  <div className="flex flex-col items-center gap-2">
                    <div className="relative">
                      <img 
                        src={displayImageUrl} 
                        alt="Profile Reference" 
                        className="max-w-xs rounded-lg border"
                        onError={(e) => {
                          console.error('❌ Image failed to display in UI:', displayImageUrl);
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                        }}
                        onLoad={() => {
                          console.log('✅ Image displayed successfully in UI');
                        }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground text-center max-w-xs">
                      Loading face detection models and analyzing image...
                    </p>
                  </div>
                )}
                {mediaStream ? (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Live Camera</p>
                    <div className="relative w-full rounded-lg border bg-black overflow-hidden" style={{ aspectRatio: '4/3' }}>
                      {videoRef.current && (
                        <div 
                          className="absolute inset-0"
                          ref={(el) => {
                            if (el && videoRef.current && !el.contains(videoRef.current)) {
                              videoRef.current.className = "w-full h-full object-cover";
                              el.appendChild(videoRef.current);
                            }
                          }}
                        />
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Live Camera</p>
                    <div className="relative w-full rounded-lg border bg-muted flex items-center justify-center" style={{ aspectRatio: '4/3' }}>
                      <p className="text-sm text-muted-foreground">Camera feed not available</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 'verifying-face' && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                {isLoadingModels && <Loader2 className="w-6 h-6 animate-spin" />}
                <span className="font-semibold">{verificationStatus || 'Verifying your face...'}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {displayImageUrl && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Reference Image</p>
                    <img 
                      src={displayImageUrl} 
                      alt="Reference" 
                      className="w-full rounded-lg border"
                      onError={(e) => {
                        console.error('❌ Reference image failed to display');
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                  </div>
                )}
                {mediaStream ? (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Live Camera</p>
                    <div className="relative w-full rounded-lg border bg-black overflow-hidden" style={{ aspectRatio: '4/3' }}>
                      {videoRef.current && (
                        <div 
                          className="absolute inset-0"
                          ref={(el) => {
                            if (el && videoRef.current && !el.contains(videoRef.current)) {
                              videoRef.current.className = "w-full h-full object-cover";
                              el.appendChild(videoRef.current);
                            }
                          }}
                        />
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Live Camera</p>
                    <div className="relative w-full rounded-lg border bg-muted flex items-center justify-center" style={{ aspectRatio: '4/3' }}>
                      <p className="text-sm text-muted-foreground">Camera feed not available</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 5: Gaze Calibration */}
          {step === 'calibrating-gaze' && (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <Eye className="w-6 h-6" />
                <span className="font-semibold">Eye Tracking Calibration</span>
              </div>
              
              <Alert>
                <Eye className="h-4 w-4" />
                <AlertDescription>
                  <p className="mb-2 font-medium">Instructions:</p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>Red dots will appear on the screen</li>
                    <li>Look directly at each dot and click on it</li>
                    <li>Follow all 9 calibration points</li>
                    <li>Keep your head still and in the same position</li>
                  </ul>
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Progress value={calibrationProgress} />
                <p className="text-sm text-muted-foreground text-center">
                  {verificationStatus || `${calibrationProgress}% complete`}
                </p>
              </div>

              {isLoadingModels && (
                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Loading eye tracking models...</span>
                </div>
              )}
            </div>
          )}

          {/* Step 6: Ready */}
          {step === 'ready' && (
            <div className="space-y-4">
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  <p>Proctoring setup complete! You&apos;re ready to begin.</p>
                </AlertDescription>
              </Alert>
              {skipGazeCalibration && (
                <Button
                  onClick={async () => {
                    // Enter fullscreen on user click (required for browser security)
                    console.log('🖥️ User clicked to start - requesting fullscreen...');
                    const fullscreenSuccess = await proctoringService.enterFullscreen();
                    if (fullscreenSuccess) {
                      console.log('✅ Entered fullscreen successfully');
                      toast({
                        title: "Entering Fullscreen",
                        description: "Starting interview in fullscreen mode"
                      });
                      // Call onComplete after a moment
                      setTimeout(() => {
                        onComplete();
                      }, 500);
                    } else {
                      console.warn('⚠️ Fullscreen request was denied');
                      toast({
                        variant: "default",
                        title: "Fullscreen Recommended",
                        description: "For best experience, please enable fullscreen. Starting interview anyway..."
                      });
                      // Still continue
                      setTimeout(() => {
                        onComplete();
                      }, 1000);
                    }
                  }}
                  className="w-full"
                  size="lg"
                >
                  Start HR Interview
                </Button>
              )}
            </div>
          )}

          {/* Hidden canvas for ID card capture */}
          <canvas ref={canvasRef} className="hidden" />
          
          {/* Video Preview (when available, but not during loading-reference or verifying-face as they're shown above) */}
          {mediaStream && step !== 'ready' && step !== 'checking-extension' && step !== 'extension-required' && step !== 'loading-reference' && step !== 'verifying-face' && (
            <div className="mt-4 space-y-4">
              <div className="relative w-full rounded-lg border bg-black overflow-hidden" style={{ aspectRatio: '4/3' }}>
                {videoRef.current && (
                  <div 
                    className="absolute inset-0"
                    ref={(el) => {
                      if (el && videoRef.current && !el.contains(videoRef.current)) {
                        videoRef.current.className = "w-full h-full object-cover";
                        el.appendChild(videoRef.current);
                      }
                    }}
                  />
                )}
              </div>
              {step === 'select-verification' && verificationMethod === 'id-card' && (
                <div className="text-xs text-muted-foreground text-center">
                  Hold your ID card steady in front of the camera
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

