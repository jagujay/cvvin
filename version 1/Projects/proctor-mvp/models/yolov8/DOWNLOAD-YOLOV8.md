# YOLOv8 Model Download Instructions

The YOLOv8 model needs to be downloaded manually due to file size.

## Option 1: Download Pre-trained ONNX Model (Recommended)

Visit: https://github.com/ultralytics/ultralytics

Download one of these models to `models/yolov8/`:
- **yolov8n.onnx** (6.2 MB) - Nano, fastest
- **yolov8s.onnx** (21 MB) - Small, balanced
- **yolov8m.onnx** (49 MB) - Medium, accurate

Direct link (if working):
```
https://github.com/ultralytics/assets/releases/download/v8.0.0/yolov8n.onnx
```

## Option 2: Export Your Own Model

If you have Python and ultralytics installed:

```bash
pip install ultralytics
```

```python
from ultralytics import YOLO

# Load model
model = YOLO('yolov8n.pt')

# Export to ONNX
model.export(format='onnx')
```

Move the generated `yolov8n.onnx` file to this directory.

## Option 3: Use Alternative Object Detection (Temporary)

If you cannot get YOLOv8, we've kept COCO-SSD as fallback in the code.
It works but is less accurate than YOLOv8.

## Current Status

Place `yolov8n.onnx` in this directory to enable YOLOv8 detection.
The app will automatically use it if available, otherwise falls back to COCO-SSD.

