// Enhanced Content Script - Runs inside the exam webpage
console.log("✅ Enhanced Proctoring Content Script Loaded (Monitoring INACTIVE)");

// Track monitoring state
let monitoringActive = false; // Will be activated after face verification

// Track activity
let lastMouseMove = Date.now();
let lastKeyPress = Date.now();
let isPageVisible = true;
let focusLostCount = 0;

// --- 1. Listen for messages from background.js ---
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "VIOLATION") {
        console.log("📨 Received violation from extension:", message.details);
        
        // Forward to the main proctoring app
        window.postMessage(message, "*");
        sendResponse({ received: true });
    } else if (message.type === "HEARTBEAT") {
        // Respond to heartbeat
        sendResponse({ alive: true, timestamp: Date.now() });
    } else if (message.type === "START_CONTENT_MONITORING") {
        monitoringActive = true;
        console.log("✅✅✅ CONTENT SCRIPT MONITORING ACTIVATED ✅✅✅");
        console.log("Now monitoring:");
        console.log("  • Page visibility (Alt+Tab)");
        console.log("  • Window blur/focus");
        console.log("  • Keyboard shortcuts");
        console.log("  • Copy/paste operations");
        console.log("  • Mouse tracking");
        sendResponse({ success: true });
    } else if (message.type === "STOP_CONTENT_MONITORING") {
        monitoringActive = false;
        console.log("⏹️ Content script monitoring stopped");
        sendResponse({ success: true });
    }
    return true;
});

// --- 2. Page Visibility API (Detects Alt+Tab, switching apps) ---
document.addEventListener("visibilitychange", () => {
    if (!monitoringActive) return; // Don't monitor before face verification
    
    if (document.hidden) {
        // Page is hidden - user switched to another app/tab
        isPageVisible = false;
        focusLostCount++;
        
        console.error("⚠️ VIOLATION: Page hidden - user switched away (Alt+Tab or app switch)");
        
        window.postMessage({
            type: "VIOLATION",
            details: `PAGE_HIDDEN: Switched to another application/window (occurrence #${focusLostCount})`,
            timestamp: Date.now()
        }, "*");
    } else {
        // Page is visible again
        isPageVisible = true;
        console.log("✓ User returned to exam page");
    }
});

// --- 3. Window Blur/Focus Detection (Additional layer) ---
window.addEventListener("blur", () => {
    if (!monitoringActive) return; // Don't monitor before face verification
    
    console.warn("⚠️ Window blur detected - focus lost");
    
    window.postMessage({
        type: "VIOLATION",
        details: "WINDOW_BLUR: Browser window lost focus",
        timestamp: Date.now()
    }, "*");
});

window.addEventListener("focus", () => {
    console.log("✓ Window focus restored");
});

// --- 4. Mouse Movement Tracking (Detect if user is active) ---
let mouseMoveTimeout;
document.addEventListener("mousemove", () => {
    lastMouseMove = Date.now();
    
    // Detect if mouse leaves the window
    clearTimeout(mouseMoveTimeout);
});

document.addEventListener("mouseleave", () => {
    if (!monitoringActive) return; // Don't monitor before face verification
    
    console.warn("⚠️ Mouse left the page area");
    
    // Don't log immediately, wait to see if it's just hovering outside
    mouseMoveTimeout = setTimeout(() => {
        window.postMessage({
            type: "VIOLATION",
            details: "MOUSE_LEFT_PAGE: Mouse pointer left exam page boundaries",
            timestamp: Date.now()
        }, "*");
    }, 2000); // 2 second delay
});

document.addEventListener("mouseenter", () => {
    clearTimeout(mouseMoveTimeout);
});

// --- 5. Keyboard Activity Tracking ---
document.addEventListener("keydown", (e) => {
    if (!monitoringActive) return; // Don't monitor before face verification
    
    lastKeyPress = Date.now();
    
    // Detect suspicious keyboard shortcuts
    const suspiciousKeys = [
        { key: "F12", name: "Developer Tools" },
        { key: "F11", name: "Fullscreen Toggle" },
        { key: "Escape", name: "Escape (may exit fullscreen)" }
    ];
    
    // Alt+Tab (handled by visibility API, but log it)
    if (e.altKey && e.key === "Tab") {
        console.warn("⚠️ Alt+Tab pressed");
    }
    
    // Ctrl+T (new tab)
    if (e.ctrlKey && e.key === "t") {
        e.preventDefault();
        window.postMessage({
            type: "VIOLATION",
            details: "KEYBOARD_SHORTCUT: Attempted to open new tab (Ctrl+T)",
            timestamp: Date.now()
        }, "*");
    }
    
    // Ctrl+W (close tab)
    if (e.ctrlKey && e.key === "w") {
        e.preventDefault();
        window.postMessage({
            type: "VIOLATION",
            details: "KEYBOARD_SHORTCUT: Attempted to close tab (Ctrl+W)",
            timestamp: Date.now()
        }, "*");
    }
    
    // Ctrl+Shift+N (incognito)
    if (e.ctrlKey && e.shiftKey && e.key === "N") {
        e.preventDefault();
        window.postMessage({
            type: "VIOLATION",
            details: "KEYBOARD_SHORTCUT: Attempted to open incognito window",
            timestamp: Date.now()
        }, "*");
    }
    
    // Developer tools shortcuts
    if ((e.ctrlKey && e.shiftKey && e.key === "I") || 
        (e.ctrlKey && e.shiftKey && e.key === "J") ||
        e.key === "F12") {
        e.preventDefault();
        window.postMessage({
            type: "VIOLATION",
            details: "KEYBOARD_SHORTCUT: Attempted to open Developer Tools",
            timestamp: Date.now()
        }, "*");
    }
});

// --- 6. Copy/Paste Detection ---
document.addEventListener("copy", (e) => {
    if (!monitoringActive) return; // Don't monitor before face verification
    
    console.warn("⚠️ Copy operation detected");
    
    window.postMessage({
        type: "VIOLATION",
        details: "COPY_DETECTED: Attempted to copy text from exam page",
        timestamp: Date.now()
    }, "*");
});

document.addEventListener("paste", (e) => {
    if (!monitoringActive) return; // Don't monitor before face verification
    
    console.warn("⚠️ Paste operation detected");
    
    window.postMessage({
        type: "VIOLATION",
        details: "PASTE_DETECTED: Attempted to paste content into exam page",
        timestamp: Date.now()
    }, "*");
});

document.addEventListener("cut", (e) => {
    if (!monitoringActive) return; // Don't monitor before face verification
    
    console.warn("⚠️ Cut operation detected");
    
    window.postMessage({
        type: "VIOLATION",
        details: "CUT_DETECTED: Attempted to cut text from exam page",
        timestamp: Date.now()
    }, "*");
});

// --- 7. Right-Click Prevention ---
document.addEventListener("contextmenu", (e) => {
    if (!monitoringActive) return; // Don't monitor before face verification
    
    e.preventDefault();
    
    window.postMessage({
        type: "VIOLATION",
        details: "RIGHT_CLICK: Attempted to open context menu",
        timestamp: Date.now()
    }, "*");
    
    return false;
});

// --- 8. Print Detection ---
window.addEventListener("beforeprint", () => {
    if (!monitoringActive) return; // Don't monitor before face verification
    
    window.postMessage({
        type: "VIOLATION",
        details: "PRINT_ATTEMPT: Attempted to print exam page",
        timestamp: Date.now()
    }, "*");
});

// --- 9. Fullscreen Detection ---
document.addEventListener("fullscreenchange", () => {
    if (!monitoringActive) return; // Don't monitor before face verification
    
    if (!document.fullscreenElement) {
        console.warn("⚠️ Exited fullscreen mode");
        
        window.postMessage({
            type: "VIOLATION",
            details: "FULLSCREEN_EXIT: Exited fullscreen mode",
            timestamp: Date.now()
        }, "*");
    }
});

// --- 10. Network Request Monitoring (via Performance API) ---
if (window.PerformanceObserver) {
    const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
            if (entry.entryType === "resource") {
                // Check for suspicious external requests
                if (entry.name.includes("chatgpt") || 
                    entry.name.includes("google.com/search") ||
                    entry.name.includes("stackoverflow")) {
                    
                    console.error("⚠️ VIOLATION: Suspicious network request:", entry.name);
                    
                    window.postMessage({
                        type: "VIOLATION",
                        details: `SUSPICIOUS_REQUEST: Detected request to ${entry.name}`,
                        timestamp: Date.now()
                    }, "*");
                }
            }
        }
    });
    
    observer.observe({ entryTypes: ["resource"] });
}

// --- 11. Idle Detection (No activity for 2 minutes) ---
setInterval(() => {
    if (!monitoringActive) return; // Don't monitor before face verification
    
    const timeSinceMouseMove = Date.now() - lastMouseMove;
    const timeSinceKeyPress = Date.now() - lastKeyPress;
    const minIdle = Math.min(timeSinceMouseMove, timeSinceKeyPress);
    
    // If no activity for 2 minutes
    if (minIdle > 120000) {
        console.warn("⚠️ User appears idle (no mouse/keyboard activity)");
        
        window.postMessage({
            type: "VIOLATION",
            details: `USER_IDLE: No mouse/keyboard activity for ${Math.round(minIdle/1000)} seconds`,
            timestamp: Date.now()
        }, "*");
        
        // Reset to avoid spam
        lastMouseMove = Date.now();
        lastKeyPress = Date.now();
    }
}, 60000); // Check every minute

// --- 12. Screen Size/Resize Detection ---
let originalWidth = window.innerWidth;
let originalHeight = window.innerHeight;

window.addEventListener("resize", () => {
    if (!monitoringActive) return; // Don't monitor before face verification
    
    const widthChange = Math.abs(window.innerWidth - originalWidth);
    const heightChange = Math.abs(window.innerHeight - originalHeight);
    
    // Significant resize might indicate screen sharing or layout changes
    if (widthChange > 100 || heightChange > 100) {
        console.warn("⚠️ Significant window resize detected");
        
        window.postMessage({
            type: "VIOLATION",
            details: `WINDOW_RESIZE: Window resized significantly (${window.innerWidth}x${window.innerHeight})`,
            timestamp: Date.now()
        }, "*");
        
        originalWidth = window.innerWidth;
        originalHeight = window.innerHeight;
    }
});

// --- 13. Multiple Tabs Detection (using localStorage) ---
// Set a flag when this tab is active
localStorage.setItem("proctoringActiveTab", Date.now().toString());

// Check periodically if another tab is also active
setInterval(() => {
    if (!monitoringActive) return; // Don't monitor before face verification
    
    const lastUpdate = parseInt(localStorage.getItem("proctoringActiveTab") || "0");
    const timeDiff = Date.now() - lastUpdate;
    
    // If another tab updated very recently, multiple tabs might be open
    if (timeDiff < 1000 && timeDiff > 0) {
        console.error("⚠️ VIOLATION: Multiple proctoring tabs may be open");
        
        window.postMessage({
            type: "VIOLATION",
            details: "MULTIPLE_TABS_SUSPECTED: Multiple exam tabs detected",
            timestamp: Date.now()
        }, "*");
    }
    
    localStorage.setItem("proctoringActiveTab", Date.now().toString());
}, 2000);

// --- 14. Notify app that enhanced monitoring is ready (but not active yet) ---
function sendMonitoringReady() {
    window.postMessage({
        type: "MONITORING_READY",
        message: "Content script loaded, waiting for face verification to activate monitoring",
        features: [
            "Page Visibility API",
            "Window Blur/Focus",
            "Mouse Tracking",
            "Keyboard Shortcuts",
            "Copy/Paste Detection",
            "Right-Click Prevention",
            "Print Detection",
            "Fullscreen Monitoring",
            "Network Monitoring",
            "Idle Detection",
            "Window Resize",
            "Multiple Tabs Detection"
        ],
        timestamp: Date.now()
    }, "*");
}

// Send immediately when script loads
sendMonitoringReady();

// Also listen for CHECK_EXTENSION requests and respond
window.addEventListener('message', (event) => {
    // Accept messages from same origin (the page itself)
    // Note: window.postMessage with "*" allows any origin, but we verify it's from our page
    if (event.data?.type === 'CHECK_EXTENSION') {
        // Re-send MONITORING_READY when requested
        console.log('📨 Received CHECK_EXTENSION request, sending MONITORING_READY');
        sendMonitoringReady();
    }
});

console.log("✅ Enhanced content script READY (waiting for activation)");
console.log("📊 Available features (will activate after face verification):");
console.log("  • Page visibility (Alt+Tab detection)");
console.log("  • Window blur/focus");
console.log("  • Mouse movement tracking");
console.log("  • Keyboard shortcut prevention");
console.log("  • Copy/paste detection");
console.log("  • Right-click prevention");
console.log("  • Print attempt detection");
console.log("  • Fullscreen monitoring");
console.log("  • Network request monitoring");
console.log("  • Idle detection");
console.log("  • Window resize detection");
console.log("  • Multiple tabs detection");
