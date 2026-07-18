# Local Proctoring System - Setup Instructions

## Overview
This proctoring system now runs **100% locally** with no external API calls or CDN dependencies.

## Features
- ✅ **Face Detection & Recognition** (face-api.js)
- ✅ **OCR for ID Scanning** (Tesseract.js)
- ✅ **Object Detection** (YOLOv8 via ONNX Runtime)
- ✅ **Eye Tracking** (WebGazer.js)
- ✅ **Advanced Image Processing** (OpenCV.js)
- ✅ **Audio Monitoring**
- ✅ **Browser Tab/Window Monitoring** (Chrome Extension)

## Setup Steps

### 1. Download Dependencies

Run the PowerShell script to download all required libraries and models:

```powershell
cd proctor-mvp
.\download-dependencies.ps1
```

This will download:
- Tesseract.js (OCR)
- face-api.js (Face detection)
- TensorFlow.js
- ONNX Runtime Web
- WebGazer.js (Eye tracking)
- OpenCV.js (Image processing)
- YOLOv8n ONNX model

### 2. Verify Directory Structure

After download, your structure should look like:

```
proctor-mvp/
├── libs/
│   ├── tesseract.min.js
│   ├── face-api.min.js
│   ├── tf.min.js
│   ├── ort.min.js (ONNX Runtime)
│   ├── webgazer.js
│   └── opencv.js
├── models/
│   ├── face_landmark_68_tiny_model-*
│   ├── face_recognition_model-*
│   ├── tiny_face_detector_model-*
│   ├── yolov8/
│   │   └── yolov8n.onnx
│   └── webgazer/
│       └── (created automatically on calibration)
├── index.html
├── app.js
└── style.css
```

### 3. Start Local Server

The application requires a local server to work (file:// won't work due to CORS):

```powershell
# Option 1: Python
python -m http.server 8000

# Option 2: Node.js (if you have http-server installed)
npx http-server -p 8000

# Option 3: PHP
php -S localhost:8000
```

### 4. Load Chrome Extension

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (top right)
3. Click "Load unpacked"
4. Select the `proctor-extension` folder
5. Keep the extension enabled during proctoring

### 5. Access Application

Open your browser and navigate to:
```
http://localhost:8000
```

## Using the System

### Phase 1: Calibration
1. **Eye Tracking Calibration**: Follow on-screen prompts to calibrate WebGazer
2. **ID Verification**: Scan your ID or load reference image
3. **Face Verification**: Verify your face matches the ID

### Phase 2: Monitoring
Once verified, the system monitors for:

- ❌ **No face detected**
- ❌ **Multiple faces detected**
- ❌ **Suspicious audio/speech**
- ❌ **Prohibited objects** (phones, books, notes, tablets)
- ❌ **Looking away from screen** (eye tracking)
- ❌ **Head pose violations** (looking down)
- ❌ **Tab switching**
- ❌ **New tab creation**
- ❌ **Window focus loss**
- ❌ **Multiple monitors detected**

## Models Information

### YOLOv8n Model
- Size: ~6MB
- Speed: Real-time (30+ FPS)
- Detects: 80 object classes including phones, books, laptops, etc.

### Face-api.js Models
- Already included in the `models/` folder
- Tiny models for fast performance

### WebGazer
- Creates models automatically during calibration
- Stores calibration in browser localStorage
- Recalibrate if accuracy decreases

## Troubleshooting

### Libraries not loading
- Ensure you ran the download script
- Check browser console for errors
- Verify file permissions

### Models not found
- Check `models/` directory structure
- Re-run download script
- Ensure local server is running

### WebGazer not working
- Complete full calibration process
- Ensure good lighting
- Look directly at calibration points
- Re-calibrate if needed

### Performance issues
- Close other applications
- Use Chrome (recommended)
- Ensure good CPU/GPU
- Reduce webcam resolution if needed

## System Requirements

- **Browser**: Chrome 90+ (recommended), Firefox 88+, Edge 90+
- **RAM**: 4GB minimum, 8GB recommended
- **CPU**: Multi-core processor recommended
- **Webcam**: 720p or higher
- **Microphone**: Required for audio monitoring
- **Internet**: Only needed for initial download, then fully offline

## Privacy & Security

✅ All processing happens locally on your machine
✅ No data sent to external servers
✅ No API calls or cloud services
✅ Face data never leaves your browser
✅ Models run in-browser using WebAssembly

## Development

To modify or enhance:
1. Edit `app.js` for monitoring logic
2. Edit `style.css` for UI changes
3. Edit `index.html` for structure
4. Chrome extension files in `proctor-extension/`

## Support

For issues or questions, check:
- Browser console logs
- Violation log in the application
- Model loading status messages

