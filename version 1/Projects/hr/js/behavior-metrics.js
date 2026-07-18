// Behavior Metrics Module
// Tracks and analyzes non-verbal cues during HR interview

console.log("📊 Behavior Metrics Module Loaded");

// ============================================================================
// BEHAVIOR METRICS DATA STRUCTURE
// ============================================================================

const behaviorMetrics = {
    session: {
        startTime: null,
        duration: 0,
        frameCount: 0,
        analyzedFrames: 0
    },
    
    eyeContact: {
        totalSamples: 0,
        lookingAtCamera: 0,
        lookingAway: 0,
        percentage: 0,
        rating: "Not Started",
        lastGazePosition: null
    },
    
    expressions: {
        current: "neutral",
        dominant: "neutral",
        timeline: [],
        counts: {
            neutral: 0,
            happy: 0,
            sad: 0,
            angry: 0,
            fearful: 0,
            disgusted: 0,
            surprised: 0
        },
        positiveScore: 0,
        negativeScore: 0
    },
    
    headMovement: {
        current: { pitch: 0, yaw: 0, roll: 0 },
        previous: null,
        movements: [],
        stability: 100,
        noddingCount: 0,
        tiltCount: 0,
        averageStability: 100
    },
    
    overallMovement: {
        current: 0,
        history: [],
        fidgetingCount: 0,
        calmPeriods: 0,
        movementLevel: "Low"
    },
    
    behaviors: {
        total: 0,
        timeline: [],
        insights: []
    },
    
    scores: {
        confidence: 50,
        engagement: 50,
        composure: 50,
        overall: 50
    }
};

// ============================================================================
// SESSION MANAGEMENT
// ============================================================================

function startSession() {
    behaviorMetrics.session.startTime = Date.now();
    behaviorMetrics.session.frameCount = 0;
    behaviorMetrics.session.analyzedFrames = 0;
    
    // Reset all metrics
    resetMetrics();
    
    console.log("✅ Session started");
}

function updateSessionDuration() {
    if (behaviorMetrics.session.startTime) {
        behaviorMetrics.session.duration = Date.now() - behaviorMetrics.session.startTime;
    }
}

function resetMetrics() {
    // Reset eye contact
    behaviorMetrics.eyeContact.totalSamples = 0;
    behaviorMetrics.eyeContact.lookingAtCamera = 0;
    behaviorMetrics.eyeContact.lookingAway = 0;
    behaviorMetrics.eyeContact.percentage = 0;
    
    // Reset expressions
    behaviorMetrics.expressions.timeline = [];
    Object.keys(behaviorMetrics.expressions.counts).forEach(key => {
        behaviorMetrics.expressions.counts[key] = 0;
    });
    
    // Reset movements
    behaviorMetrics.headMovement.movements = [];
    behaviorMetrics.overallMovement.history = [];
    
    // Reset behaviors
    behaviorMetrics.behaviors.timeline = [];
    behaviorMetrics.behaviors.insights = [];
    behaviorMetrics.behaviors.total = 0;
}

// ============================================================================
// EYE CONTACT ANALYSIS
// ============================================================================

function updateEyeContact(gazeData) {
    if (!gazeData || !gazeData.x || !gazeData.y) return;
    
    behaviorMetrics.eyeContact.totalSamples++;
    behaviorMetrics.eyeContact.lastGazePosition = gazeData;
    
    // Check if looking at camera (center region of screen)
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    
    const centerX = screenWidth / 2;
    const centerY = screenHeight / 2;
    
    const toleranceX = screenWidth * 0.2; // 20% tolerance
    const toleranceY = screenHeight * 0.2;
    
    const distX = Math.abs(gazeData.x - centerX);
    const distY = Math.abs(gazeData.y - centerY);
    
    if (distX < toleranceX && distY < toleranceY) {
        behaviorMetrics.eyeContact.lookingAtCamera++;
    } else {
        behaviorMetrics.eyeContact.lookingAway++;
    }
    
    // Calculate percentage
    behaviorMetrics.eyeContact.percentage = 
        (behaviorMetrics.eyeContact.lookingAtCamera / behaviorMetrics.eyeContact.totalSamples) * 100;
    
    // Update rating
    updateEyeContactRating();
}

function updateEyeContactRating() {
    const percentage = behaviorMetrics.eyeContact.percentage;
    
    if (percentage >= 70) {
        behaviorMetrics.eyeContact.rating = "Excellent";
    } else if (percentage >= 50) {
        behaviorMetrics.eyeContact.rating = "Good";
    } else if (percentage >= 30) {
        behaviorMetrics.eyeContact.rating = "Fair";
    } else {
        behaviorMetrics.eyeContact.rating = "Poor";
    }
}

// ============================================================================
// FACIAL EXPRESSION ANALYSIS
// ============================================================================

function updateExpression(expressions) {
    if (!expressions) return;
    
    // Find dominant expression
    let maxScore = 0;
    let dominantExpression = "neutral";
    
    Object.keys(expressions).forEach(expr => {
        const score = expressions[expr];
        behaviorMetrics.expressions.counts[expr]++;
        
        if (score > maxScore) {
            maxScore = score;
            dominantExpression = expr;
        }
    });
    
    behaviorMetrics.expressions.current = dominantExpression;
    
    // Update timeline (keep last 100 samples)
    behaviorMetrics.expressions.timeline.push({
        timestamp: Date.now(),
        expression: dominantExpression,
        confidence: maxScore
    });
    
    if (behaviorMetrics.expressions.timeline.length > 100) {
        behaviorMetrics.expressions.timeline.shift();
    }
    
    // Calculate positive vs negative score
    behaviorMetrics.expressions.positiveScore = 
        (expressions.happy || 0) + (expressions.surprised || 0);
    
    behaviorMetrics.expressions.negativeScore = 
        (expressions.sad || 0) + (expressions.angry || 0) + 
        (expressions.fearful || 0) + (expressions.disgusted || 0);
    
    // Update dominant expression
    updateDominantExpression();
}

function updateDominantExpression() {
    const counts = behaviorMetrics.expressions.counts;
    let maxCount = 0;
    let dominant = "neutral";
    
    Object.keys(counts).forEach(expr => {
        if (counts[expr] > maxCount) {
            maxCount = counts[expr];
            dominant = expr;
        }
    });
    
    behaviorMetrics.expressions.dominant = dominant;
}

// ============================================================================
// HEAD MOVEMENT ANALYSIS
// ============================================================================

function updateHeadPose(pose) {
    if (!pose) return;
    
    const current = {
        pitch: pose.pitch || 0,
        yaw: pose.yaw || 0,
        roll: pose.roll || 0
    };
    
    behaviorMetrics.headMovement.current = current;
    
    if (behaviorMetrics.headMovement.previous) {
        const prev = behaviorMetrics.headMovement.previous;
        
        // Calculate movement delta
        const deltaPitch = Math.abs(current.pitch - prev.pitch);
        const deltaYaw = Math.abs(current.yaw - prev.yaw);
        const deltaRoll = Math.abs(current.roll - prev.roll);
        
        const totalDelta = deltaPitch + deltaYaw + deltaRoll;
        
        // Track movements
        behaviorMetrics.headMovement.movements.push(totalDelta);
        if (behaviorMetrics.headMovement.movements.length > 50) {
            behaviorMetrics.headMovement.movements.shift();
        }
        
        // Calculate stability (inverse of movement)
        const averageMovement = behaviorMetrics.headMovement.movements
            .reduce((a, b) => a + b, 0) / behaviorMetrics.headMovement.movements.length;
        
        behaviorMetrics.headMovement.stability = Math.max(0, 100 - (averageMovement * 5));
        behaviorMetrics.headMovement.averageStability = behaviorMetrics.headMovement.stability;
        
        // Detect nodding (pitch change)
        if (deltaPitch > 10 && deltaPitch < 30) {
            behaviorMetrics.headMovement.noddingCount++;
        }
        
        // Detect head tilt (roll change)
        if (Math.abs(current.roll) > 15) {
            behaviorMetrics.headMovement.tiltCount++;
        }
    }
    
    behaviorMetrics.headMovement.previous = current;
}

// ============================================================================
// OVERALL MOVEMENT ANALYSIS
// ============================================================================

function updateOverallMovement(movementScore) {
    behaviorMetrics.overallMovement.current = movementScore;
    
    behaviorMetrics.overallMovement.history.push(movementScore);
    if (behaviorMetrics.overallMovement.history.length > 100) {
        behaviorMetrics.overallMovement.history.shift();
    }
    
    // Detect fidgeting (high consistent movement)
    if (movementScore > 0.7) {
        behaviorMetrics.overallMovement.fidgetingCount++;
    }
    
    // Detect calm periods (low movement)
    if (movementScore < 0.2) {
        behaviorMetrics.overallMovement.calmPeriods++;
    }
    
    // Classify movement level
    const avgMovement = behaviorMetrics.overallMovement.history
        .reduce((a, b) => a + b, 0) / behaviorMetrics.overallMovement.history.length;
    
    if (avgMovement > 0.6) {
        behaviorMetrics.overallMovement.movementLevel = "High";
    } else if (avgMovement > 0.3) {
        behaviorMetrics.overallMovement.movementLevel = "Moderate";
    } else {
        behaviorMetrics.overallMovement.movementLevel = "Low";
    }
}

// ============================================================================
// BEHAVIOR LOGGING
// ============================================================================

function logBehavior(type, description, sentiment = "neutral") {
    const behavior = {
        timestamp: Date.now(),
        type,
        description,
        sentiment, // "positive", "negative", "neutral"
        duration: behaviorMetrics.session.duration
    };
    
    behaviorMetrics.behaviors.timeline.push(behavior);
    behaviorMetrics.behaviors.total++;
    
    // Keep only last 50 behaviors
    if (behaviorMetrics.behaviors.timeline.length > 50) {
        behaviorMetrics.behaviors.timeline.shift();
    }
    
    console.log(`📝 Behavior logged: ${type} - ${description}`);
}

function addInsight(title, description, icon = "💡") {
    const insight = {
        timestamp: Date.now(),
        title,
        description,
        icon
    };
    
    behaviorMetrics.behaviors.insights.push(insight);
    
    // Keep only last 10 insights
    if (behaviorMetrics.behaviors.insights.length > 10) {
        behaviorMetrics.behaviors.insights.shift();
    }
}

// ============================================================================
// SCORE CALCULATION
// ============================================================================

function calculateScores() {
    // Confidence Score (0-100)
    let confidenceScore = 50; // Start neutral
    
    // Eye contact (±25 points)
    const eyeContactPct = behaviorMetrics.eyeContact.percentage;
    if (eyeContactPct >= 70) confidenceScore += 25;
    else if (eyeContactPct >= 50) confidenceScore += 15;
    else if (eyeContactPct >= 30) confidenceScore += 5;
    else confidenceScore -= 15;
    
    // Expressions (±20 points)
    const posScore = behaviorMetrics.expressions.positiveScore;
    const negScore = behaviorMetrics.expressions.negativeScore;
    if (posScore > negScore) confidenceScore += 20;
    else if (negScore > posScore) confidenceScore -= 20;
    
    // Head stability (±15 points)
    const stability = behaviorMetrics.headMovement.averageStability;
    if (stability > 70) confidenceScore += 15;
    else if (stability > 50) confidenceScore += 8;
    else confidenceScore -= 10;
    
    behaviorMetrics.scores.confidence = Math.max(0, Math.min(100, confidenceScore));
    
    // Engagement Score (0-100)
    let engagementScore = 50;
    
    // Eye contact (±30 points)
    if (eyeContactPct >= 60) engagementScore += 30;
    else if (eyeContactPct >= 40) engagementScore += 15;
    else engagementScore -= 20;
    
    // Expression variety (±20 points)
    const expressionVariety = Object.values(behaviorMetrics.expressions.counts)
        .filter(c => c > 0).length;
    if (expressionVariety > 3) engagementScore += 20;
    else if (expressionVariety > 1) engagementScore += 10;
    
    behaviorMetrics.scores.engagement = Math.max(0, Math.min(100, engagementScore));
    
    // Composure Score (0-100)
    let composureScore = 50;
    
    // Head stability (±30 points)
    if (stability > 80) composureScore += 30;
    else if (stability > 60) composureScore += 15;
    else composureScore -= 15;
    
    // Movement level (±20 points)
    const movementLevel = behaviorMetrics.overallMovement.movementLevel;
    if (movementLevel === "Low") composureScore += 20;
    else if (movementLevel === "Moderate") composureScore += 5;
    else composureScore -= 20;
    
    behaviorMetrics.scores.composure = Math.max(0, Math.min(100, composureScore));
    
    // Overall Score (average)
    behaviorMetrics.scores.overall = Math.round(
        (behaviorMetrics.scores.confidence + 
         behaviorMetrics.scores.engagement + 
         behaviorMetrics.scores.composure) / 3
    );
}

// ============================================================================
// INSIGHTS GENERATION
// ============================================================================

function generateInsights() {
    // Clear old insights
    behaviorMetrics.behaviors.insights = [];
    
    // Eye contact insights
    const eyePct = behaviorMetrics.eyeContact.percentage;
    if (eyePct >= 70) {
        addInsight(
            "Excellent Eye Contact",
            `Maintaining ${eyePct.toFixed(1)}% eye contact shows strong engagement and confidence.`,
            "👁️"
        );
    } else if (eyePct < 30) {
        addInsight(
            "Low Eye Contact",
            `Only ${eyePct.toFixed(1)}% eye contact detected. Try looking more at the camera.`,
            "⚠️"
        );
    }
    
    // Expression insights
    const dominant = behaviorMetrics.expressions.dominant;
    if (dominant === "happy") {
        addInsight(
            "Positive Demeanor",
            "Predominantly happy expressions indicate enthusiasm and positivity.",
            "😊"
        );
    } else if (dominant === "neutral") {
        addInsight(
            "Neutral Expression",
            "Consider adding more expressiveness to convey enthusiasm.",
            "😐"
        );
    } else if (["sad", "fearful", "angry"].includes(dominant)) {
        addInsight(
            "Stress Indicators",
            "Negative expressions detected. Take a deep breath and relax.",
            "😰"
        );
    }
    
    // Head movement insights
    const stability = behaviorMetrics.headMovement.averageStability;
    if (stability > 80) {
        addInsight(
            "Composed Posture",
            "Stable head position indicates calmness and composure.",
            "🧠"
        );
    } else if (stability < 50) {
        addInsight(
            "Restless Movement",
            "Excessive head movement detected. Try to stay more still.",
            "📉"
        );
    }
    
    // Nodding insights
    if (behaviorMetrics.headMovement.noddingCount > 10) {
        addInsight(
            "Active Engagement",
            "Frequent nodding shows active listening and agreement.",
            "👍"
        );
    }
    
    // Overall score insights
    const overallScore = behaviorMetrics.scores.overall;
    if (overallScore >= 80) {
        addInsight(
            "Strong Performance",
            "Overall behavioral analysis shows excellent interview presence.",
            "⭐"
        );
    } else if (overallScore >= 60) {
        addInsight(
            "Good Performance",
            "Solid interview presence with room for minor improvements.",
            "👍"
        );
    } else if (overallScore < 40) {
        addInsight(
            "Areas for Improvement",
            "Consider practicing eye contact, expressions, and composure.",
            "📚"
        );
    }
}

// ============================================================================
// EXPORT FUNCTIONS
// ============================================================================

function getBehaviorMetrics() {
    return behaviorMetrics;
}

function exportReport() {
    updateSessionDuration();
    calculateScores();
    generateInsights();
    
    const report = {
        session: {
            date: new Date().toISOString(),
            duration: formatDuration(behaviorMetrics.session.duration),
            framesAnalyzed: behaviorMetrics.session.analyzedFrames
        },
        scores: behaviorMetrics.scores,
        eyeContact: {
            percentage: behaviorMetrics.eyeContact.percentage.toFixed(1) + "%",
            rating: behaviorMetrics.eyeContact.rating
        },
        expressions: {
            dominant: behaviorMetrics.expressions.dominant,
            counts: behaviorMetrics.expressions.counts
        },
        headMovement: {
            stability: behaviorMetrics.headMovement.averageStability.toFixed(1) + "%",
            noddingCount: behaviorMetrics.headMovement.noddingCount
        },
        overallMovement: {
            level: behaviorMetrics.overallMovement.movementLevel,
            fidgetingCount: behaviorMetrics.overallMovement.fidgetingCount
        },
        behaviors: behaviorMetrics.behaviors.timeline,
        insights: behaviorMetrics.behaviors.insights
    };
    
    return report;
}

function formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
        return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
        return `${minutes}m ${seconds % 60}s`;
    } else {
        return `${seconds}s`;
    }
}

// Export for use in main application
window.behaviorMetrics = {
    start: startSession,
    updateEyeContact,
    updateExpression,
    updateHeadPose,
    updateOverallMovement,
    logBehavior,
    addInsight,
    calculateScores,
    generateInsights,
    getData: getBehaviorMetrics,
    export: exportReport,
    updateDuration: updateSessionDuration
};

console.log("✅ Behavior Metrics API ready");

