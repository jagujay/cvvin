// YOLOv8 Helper Functions for Object Detection
// Handles YOLO model inference and output processing

/**
 * Process YOLOv8 output tensor to extract bounding boxes and classes
 * YOLOv8 output format: [batch, 84, 8400] where:
 * - 84 = 4 box coords (xywh) + 80 class scores
 * - 8400 = number of predictions
 */
function processYOLOv8Output(output, confidenceThreshold = 0.5, iouThreshold = 0.45) {
    const boxes = [];
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
            label: YOLO_CLASSES[maxClassId]
        });
    }
    
    // Apply Non-Maximum Suppression (NMS)
    const finalBoxes = applyNMS(boxes, iouThreshold);
    
    return finalBoxes;
}

/**
 * Apply Non-Maximum Suppression to remove overlapping boxes
 */
function applyNMS(boxes, iouThreshold) {
    // Sort boxes by confidence (descending)
    boxes.sort((a, b) => b.confidence - a.confidence);
    
    const selected = [];
    const active = new Array(boxes.length).fill(true);
    
    for (let i = 0; i < boxes.length; i++) {
        if (!active[i]) continue;
        
        selected.push(boxes[i]);
        
        // Suppress boxes with high IoU with this box
        for (let j = i + 1; j < boxes.length; j++) {
            if (!active[j]) continue;
            
            // Only suppress boxes of the same class
            if (boxes[i].classId !== boxes[j].classId) continue;
            
            const iou = calculateIoU(boxes[i], boxes[j]);
            if (iou > iouThreshold) {
                active[j] = false;
            }
        }
    }
    
    return selected;
}

/**
 * Calculate Intersection over Union (IoU) between two boxes
 */
function calculateIoU(box1, box2) {
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
 * Prepare video frame for YOLOv8 input
 * Returns ONNX tensor in NCHW format
 */
async function prepareYOLOv8Input(videoElement, inputSize = 640) {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        canvas.width = inputSize;
        canvas.height = inputSize;
        const ctx = canvas.getContext('2d');
        
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
        const tensor = new ort.Tensor('float32', input, [1, 3, inputSize, inputSize]);
        
        resolve(tensor);
    });
}

/**
 * Draw bounding boxes on canvas
 */
function drawBoundingBoxes(canvas, boxes, inputSize = 640) {
    const ctx = canvas.getContext('2d');
    const scaleX = canvas.width / inputSize;
    const scaleY = canvas.height / inputSize;
    
    ctx.lineWidth = 2;
    ctx.font = '14px Arial';
    
    for (const box of boxes) {
        // Scale coordinates to canvas size
        const x1 = box.x1 * scaleX;
        const y1 = box.y1 * scaleY;
        const x2 = box.x2 * scaleX;
        const y2 = box.y2 * scaleY;
        const width = x2 - x1;
        const height = y2 - y1;
        
        // Draw box
        ctx.strokeStyle = PROHIBITED_OBJECTS.includes(box.label) ? '#e74c3c' : '#3498db';
        ctx.strokeRect(x1, y1, width, height);
        
        // Draw label background
        const label = `${box.label} ${(box.confidence * 100).toFixed(0)}%`;
        const textWidth = ctx.measureText(label).width;
        ctx.fillStyle = PROHIBITED_OBJECTS.includes(box.label) ? '#e74c3c' : '#3498db';
        ctx.fillRect(x1, y1 - 20, textWidth + 10, 20);
        
        // Draw label text
        ctx.fillStyle = 'white';
        ctx.fillText(label, x1 + 5, y1 - 5);
    }
}

/**
 * Run YOLOv8 inference on video frame
 */
async function runYOLOv8Inference(session, videoElement, confidenceThreshold = 0.5) {
    try {
        // Prepare input
        const inputTensor = await prepareYOLOv8Input(videoElement);
        
        // Run inference
        const feeds = {};
        feeds[session.inputNames[0]] = inputTensor;
        const results = await session.run(feeds);
        
        // Process output
        const output = results[session.outputNames[0]];
        const detections = processYOLOv8Output(output, confidenceThreshold);
        
        return detections;
        
    } catch (err) {
        console.error("YOLOv8 inference failed:", err);
        return [];
    }
}

// Export functions for use in main app
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        processYOLOv8Output,
        prepareYOLOv8Input,
        runYOLOv8Inference,
        drawBoundingBoxes,
        applyNMS,
        calculateIoU
    };
}

