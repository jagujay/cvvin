# PowerShell script to download all dependencies locally
# Run this script to download all required libraries and models

Write-Host "Starting download of proctoring dependencies..." -ForegroundColor Green

# Create directories if they don't exist
$dirs = @("libs", "models/yolov8", "models/webgazer")
foreach ($dir in $dirs) {
    if (!(Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir | Out-Null
    }
}

# Function to download files
function Download-File {
    param (
        [string]$url,
        [string]$output
    )
    Write-Host "Downloading $output..." -ForegroundColor Cyan
    try {
        Invoke-WebRequest -Uri $url -OutFile $output -UseBasicParsing
        Write-Host "Downloaded $output" -ForegroundColor Green
    }
    catch {
        Write-Host "Failed to download $output" -ForegroundColor Red
        Write-Host "  Error: $_" -ForegroundColor Red
    }
}

# Download JavaScript Libraries
Write-Host "`n=== Downloading JavaScript Libraries ===" -ForegroundColor Yellow

Download-File `
    "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js" `
    "libs/tesseract.min.js"

Download-File `
    "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1/dist/face-api.min.js" `
    "libs/face-api.min.js"

Download-File `
    "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@latest/dist/tf.min.js" `
    "libs/tf.min.js"

Download-File `
    "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.16.3/dist/ort.min.js" `
    "libs/ort.min.js"

# Download ONNX Runtime WebAssembly files (required for YOLOv8)
Write-Host "Downloading ONNX Runtime WASM files..." -ForegroundColor Cyan
Download-File `
    "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.16.3/dist/ort-wasm.wasm" `
    "libs/ort-wasm.wasm"

Download-File `
    "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.16.3/dist/ort-wasm-simd.wasm" `
    "libs/ort-wasm-simd.wasm"

Download-File `
    "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.16.3/dist/ort-wasm-threaded.wasm" `
    "libs/ort-wasm-threaded.wasm"

Download-File `
    "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.16.3/dist/ort-wasm-simd-threaded.wasm" `
    "libs/ort-wasm-simd-threaded.wasm"

Download-File `
    "https://webgazer.cs.brown.edu/webgazer.js" `
    "libs/webgazer.js"

Download-File `
    "https://docs.opencv.org/4.8.0/opencv.js" `
    "libs/opencv.js"

# Download YOLOv8 model
Write-Host "`n=== Downloading YOLOv8 Model ===" -ForegroundColor Yellow
Write-Host "Note: We will use a web-compatible YOLOv8 model" -ForegroundColor Cyan

# Download YOLOv8n ONNX model (small, fast)
Download-File `
    "https://github.com/ultralytics/assets/releases/download/v0.0.0/yolov8n.onnx" `
    "models/yolov8/yolov8n.onnx"

Write-Host "`n=== Download Complete! ===" -ForegroundColor Green
Write-Host "All dependencies have been downloaded locally." -ForegroundColor Green
Write-Host "`nNote: WebGazer will create its own models on first calibration." -ForegroundColor Cyan
Write-Host "Please ensure you have enough disk space." -ForegroundColor Cyan
