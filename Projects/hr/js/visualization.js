// Visualization Dashboard Module
// Updates UI with real-time behavior metrics

console.log("📊 Visualization Module Loaded");

// ============================================================================
// DOM ELEMENTS
// ============================================================================

let visualizationElements = null;

function initializeVisualization() {
    visualizationElements = {
        // Status
        statusIndicator: document.getElementById('statusIndicator'),
        statusText: document.getElementById('statusText'),
        
        // Session info
        sessionDuration: document.getElementById('sessionDuration'),
        frameCount: document.getElementById('frameCount'),
        behaviorCount: document.getElementById('behaviorCount'),
        
        // Scores
        confidenceScore: document.getElementById('confidenceScore'),
        confidenceFill: document.getElementById('confidenceFill'),
        engagementScore: document.getElementById('engagementScore'),
        engagementFill: document.getElementById('engagementFill'),
        composureScore: document.getElementById('composureScore'),
        composureFill: document.getElementById('composureFill'),
        
        // Metrics
        eyeContactValue: document.getElementById('eyeContactValue'),
        eyeContactStatus: document.getElementById('eyeContactStatus'),
        eyeContactDetails: document.getElementById('eyeContactDetails'),
        
        expressionValue: document.getElementById('expressionValue'),
        expressionStatus: document.getElementById('expressionStatus'),
        expressionDetails: document.getElementById('expressionDetails'),
        
        headPoseValue: document.getElementById('headPoseValue'),
        headPoseStatus: document.getElementById('headPoseStatus'),
        headPoseDetails: document.getElementById('headPoseDetails'),
        
        movementValue: document.getElementById('movementValue'),
        movementStatus: document.getElementById('movementStatus'),
        movementDetails: document.getElementById('movementDetails'),
        
        // Timeline & Insights
        timelineContainer: document.getElementById('timelineContainer'),
        insightsContainer: document.getElementById('insightsContainer')
    };
    
    console.log("✅ Visualization elements initialized");
}

// ============================================================================
// STATUS UPDATES
// ============================================================================

function updateStatus(text, state = "active") {
    if (!visualizationElements) return;
    
    visualizationElements.statusText.textContent = text;
    
    // Update indicator
    visualizationElements.statusIndicator.className = "status-indicator";
    visualizationElements.statusIndicator.classList.add(`status-${state}`);
}

// ============================================================================
// SESSION INFO UPDATES
// ============================================================================

function updateSessionInfo(metrics) {
    if (!visualizationElements) return;
    
    // Duration
    const duration = metrics.session.duration;
    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    const displaySeconds = seconds % 60;
    
    visualizationElements.sessionDuration.textContent = 
        `${String(minutes).padStart(2, '0')}:${String(displaySeconds).padStart(2, '0')}`;
    
    // Frame count
    visualizationElements.frameCount.textContent = metrics.session.analyzedFrames;
    
    // Behavior count
    visualizationElements.behaviorCount.textContent = metrics.behaviors.total;
}

// ============================================================================
// SCORE UPDATES
// ============================================================================

function updateScores(scores) {
    if (!visualizationElements) return;
    
    // Confidence
    visualizationElements.confidenceScore.textContent = scores.confidence;
    visualizationElements.confidenceFill.style.width = `${scores.confidence}%`;
    
    // Engagement
    visualizationElements.engagementScore.textContent = scores.engagement;
    visualizationElements.engagementFill.style.width = `${scores.engagement}%`;
    
    // Composure
    visualizationElements.composureScore.textContent = scores.composure;
    visualizationElements.composureFill.style.width = `${scores.composure}%`;
}

// ============================================================================
// EYE CONTACT UPDATES
// ============================================================================

function updateEyeContactDisplay(eyeContactData) {
    if (!visualizationElements) return;
    
    const percentage = eyeContactData.percentage.toFixed(1);
    const rating = eyeContactData.rating;
    
    visualizationElements.eyeContactValue.textContent = `${percentage}%`;
    visualizationElements.eyeContactStatus.textContent = rating;
    
    // Color based on rating
    if (percentage >= 70) {
        visualizationElements.eyeContactValue.style.color = "#27ae60";
    } else if (percentage >= 50) {
        visualizationElements.eyeContactValue.style.color = "#3498db";
    } else if (percentage >= 30) {
        visualizationElements.eyeContactValue.style.color = "#f39c12";
    } else {
        visualizationElements.eyeContactValue.style.color = "#e74c3c";
    }
    
    // Details
    const looking = eyeContactData.lookingAtCamera;
    const away = eyeContactData.lookingAway;
    visualizationElements.eyeContactDetails.textContent = 
        `Looking at camera: ${looking} | Looking away: ${away}`;
}

// ============================================================================
// EXPRESSION UPDATES
// ============================================================================

function updateExpressionDisplay(expressionData) {
    if (!visualizationElements) return;
    
    const current = expressionData.current;
    const dominant = expressionData.dominant;
    
    // Expression emoji mapping
    const expressionEmojis = {
        neutral: "😐",
        happy: "😊",
        sad: "😢",
        angry: "😠",
        fearful: "😰",
        disgusted: "😖",
        surprised: "😲"
    };
    
    visualizationElements.expressionValue.textContent = 
        `${expressionEmojis[current] || "😐"} ${current.charAt(0).toUpperCase() + current.slice(1)}`;
    
    visualizationElements.expressionStatus.textContent = 
        `Dominant: ${dominant.charAt(0).toUpperCase() + dominant.slice(1)}`;
    
    // Color based on sentiment
    const positive = expressionData.positiveScore;
    const negative = expressionData.negativeScore;
    
    if (positive > negative) {
        visualizationElements.expressionValue.style.color = "#27ae60";
    } else if (negative > positive) {
        visualizationElements.expressionValue.style.color = "#e74c3c";
    } else {
        visualizationElements.expressionValue.style.color = "#3498db";
    }
    
    // Details - show top 3 expressions
    const counts = expressionData.counts;
    const sorted = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);
    
    const details = sorted.map(([expr, count]) => 
        `${expr}: ${count}`
    ).join(" | ");
    
    visualizationElements.expressionDetails.textContent = details;
}

// ============================================================================
// HEAD POSE UPDATES
// ============================================================================

function updateHeadPoseDisplay(headData) {
    if (!visualizationElements) return;
    
    const stability = headData.averageStability.toFixed(1);
    
    // Status based on stability
    let status = "Stable";
    if (stability > 80) {
        status = "Very Stable";
        visualizationElements.headPoseValue.style.color = "#27ae60";
    } else if (stability > 60) {
        status = "Stable";
        visualizationElements.headPoseValue.style.color = "#3498db";
    } else if (stability > 40) {
        status = "Moderate";
        visualizationElements.headPoseValue.style.color = "#f39c12";
    } else {
        status = "Restless";
        visualizationElements.headPoseValue.style.color = "#e74c3c";
    }
    
    visualizationElements.headPoseValue.textContent = status;
    visualizationElements.headPoseStatus.textContent = `Stability: ${stability}%`;
    
    // Details
    const nodding = headData.noddingCount;
    const tilts = headData.tiltCount;
    visualizationElements.headPoseDetails.textContent = 
        `Nods: ${nodding} | Tilts: ${tilts}`;
}

// ============================================================================
// MOVEMENT UPDATES
// ============================================================================

function updateMovementDisplay(movementData) {
    if (!visualizationElements) return;
    
    const level = movementData.movementLevel;
    
    visualizationElements.movementValue.textContent = level;
    
    // Color based on level
    if (level === "Low") {
        visualizationElements.movementValue.style.color = "#27ae60";
        visualizationElements.movementStatus.textContent = "Calm and composed";
    } else if (level === "Moderate") {
        visualizationElements.movementValue.style.color = "#3498db";
        visualizationElements.movementStatus.textContent = "Normal activity";
    } else {
        visualizationElements.movementValue.style.color = "#e74c3c";
        visualizationElements.movementStatus.textContent = "High movement detected";
    }
    
    // Details
    const fidgeting = movementData.fidgetingCount;
    const calm = movementData.calmPeriods;
    visualizationElements.movementDetails.textContent = 
        `Fidgeting: ${fidgeting} | Calm periods: ${calm}`;
}

// ============================================================================
// TIMELINE UPDATES
// ============================================================================

function updateTimeline(behaviors) {
    if (!visualizationElements) return;
    
    const container = visualizationElements.timelineContainer;
    
    // Clear empty state
    container.innerHTML = "";
    
    // Show last 10 behaviors
    const recentBehaviors = behaviors.slice(-10).reverse();
    
    if (recentBehaviors.length === 0) {
        container.innerHTML = '<div class="timeline-empty">No behaviors logged yet</div>';
        return;
    }
    
    recentBehaviors.forEach(behavior => {
        const elapsed = Math.floor((Date.now() - behavior.timestamp) / 1000);
        const timeText = elapsed < 60 ? `${elapsed}s ago` : `${Math.floor(elapsed / 60)}m ago`;
        
        // Icon mapping
        const icons = {
            "EYE_CONTACT": "👁️",
            "EXPRESSION": "😊",
            "HEAD_MOVEMENT": "🧠",
            "FIDGETING": "📈",
            "NODDING": "👍",
            "CALM": "😌",
            "STRESS": "😰"
        };
        
        const icon = icons[behavior.type] || "📝";
        
        const eventDiv = document.createElement('div');
        eventDiv.className = `timeline-event ${behavior.sentiment}`;
        eventDiv.innerHTML = `
            <span class="timeline-time">${timeText}</span>
            <span class="timeline-icon">${icon}</span>
            <span class="timeline-text">${behavior.description}</span>
        `;
        
        container.appendChild(eventDiv);
    });
}

// ============================================================================
// INSIGHTS UPDATES
// ============================================================================

function updateInsights(insights) {
    if (!visualizationElements) return;
    
    const container = visualizationElements.insightsContainer;
    
    // Clear empty state
    container.innerHTML = "";
    
    if (insights.length === 0) {
        container.innerHTML = '<div class="insight-empty">Analysis in progress...</div>';
        return;
    }
    
    insights.forEach(insight => {
        const insightDiv = document.createElement('div');
        insightDiv.className = "insight-item";
        insightDiv.innerHTML = `
            <span class="insight-icon">${insight.icon}</span>
            <div class="insight-text">
                <div class="insight-title">${insight.title}</div>
                <div class="insight-description">${insight.description}</div>
            </div>
        `;
        
        container.appendChild(insightDiv);
    });
}

// ============================================================================
// MAIN UPDATE FUNCTION
// ============================================================================

function updateDashboard(metrics) {
    if (!visualizationElements) return;
    
    // Update session info
    updateSessionInfo(metrics);
    
    // Update scores
    updateScores(metrics.scores);
    
    // Update metrics
    updateEyeContactDisplay(metrics.eyeContact);
    updateExpressionDisplay(metrics.expressions);
    updateHeadPoseDisplay(metrics.headMovement);
    updateMovementDisplay(metrics.overallMovement);
    
    // Update timeline
    updateTimeline(metrics.behaviors.timeline);
    
    // Update insights
    updateInsights(metrics.behaviors.insights);
}

// ============================================================================
// DRAWING UTILITIES
// ============================================================================

function drawFaceBox(canvas, detection) {
    const ctx = canvas.getContext('2d');
    
    if (!detection || !detection.detection) return;
    
    const box = detection.detection.box;
    
    // Draw box
    ctx.strokeStyle = "#27ae60";
    ctx.lineWidth = 2;
    ctx.strokeRect(box.x, box.y, box.width, box.height);
    
    // Draw label
    if (detection.expressions) {
        const expressions = detection.expressions;
        const dominant = Object.keys(expressions)
            .reduce((a, b) => expressions[a] > expressions[b] ? a : b);
        
        ctx.fillStyle = "#27ae60";
        ctx.fillRect(box.x, box.y - 25, box.width, 25);
        
        ctx.fillStyle = "white";
        ctx.font = "14px Arial";
        ctx.fillText(
            `${dominant.charAt(0).toUpperCase() + dominant.slice(1)}`,
            box.x + 5,
            box.y - 8
        );
    }
}

function drawGazePoint(canvas, prediction) {
    const ctx = canvas.getContext('2d');
    
    if (!prediction || !prediction.x || !prediction.y) return;
    
    // Draw gaze point
    ctx.fillStyle = "rgba(255, 0, 0, 0.6)";
    ctx.beginPath();
    ctx.arc(prediction.x, prediction.y, 10, 0, 2 * Math.PI);
    ctx.fill();
    
    // Draw crosshair
    ctx.strokeStyle = "rgba(255, 0, 0, 0.8)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(prediction.x - 15, prediction.y);
    ctx.lineTo(prediction.x + 15, prediction.y);
    ctx.moveTo(prediction.x, prediction.y - 15);
    ctx.lineTo(prediction.x, prediction.y + 15);
    ctx.stroke();
}

function clearCanvas(canvas) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

// ============================================================================
// EXPORT FUNCTIONS
// ============================================================================

window.visualization = {
    init: initializeVisualization,
    updateStatus,
    updateDashboard,
    drawFaceBox,
    drawGazePoint,
    clearCanvas
};

console.log("✅ Visualization API ready");

