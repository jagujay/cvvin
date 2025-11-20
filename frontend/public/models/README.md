# Face-API.js Models

This folder should contain the face-api.js model files.

## Required Files:

1. `tiny_face_detector_model-weights_manifest.json`
2. `tiny_face_detector_model-shard1`
3. `face_landmark_68_tiny_model-weights_manifest.json`
4. `face_landmark_68_tiny_model-shard1`
5. `face_recognition_model-weights_manifest.json`
6. `face_recognition_model-shard1`
7. `face_recognition_model-shard2`

## How to Get Models:

### Option 1: Copy from proctor-mvp
Copy the model files from `Projects/proctor-mvp/models/` to this folder.

### Option 2: Download from GitHub
Download from: https://github.com/justadudewhohacks/face-api.js/tree/master/weights

### Option 3: Use CDN (automatic fallback)
The service will try to load from CDN if local models are not available.







