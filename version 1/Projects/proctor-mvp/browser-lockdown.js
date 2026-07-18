// Browser Lockdown Mode
// Enforces strict browser security BEFORE user verification

console.log("🔒 Browser Lockdown Module Loaded");

let lockdownActive = false;
let fullscreenActive = false;

// ============================================================================
// 1. DISABLE ALL OTHER EXTENSIONS (via Extension API)
// ============================================================================

async function disableOtherExtensions() {
    console.log("🔌 Attempting to disable other extensions...");
    
    // Note: This requires management permission and must be done via extension
    // Send message to our extension to handle this
    if (typeof chrome !== 'undefined' && chrome.runtime) {
        try {
            chrome.runtime.sendMessage({
                type: "DISABLE_OTHER_EXTENSIONS"
            }, (response) => {
                if (response && response.success) {
                    console.log("✅ Other extensions will be managed");
                } else {
                    console.warn("⚠️ Could not manage extensions");
                }
            });
        } catch (err) {
            console.warn("Extension management not available:", err);
        }
    }
}

// ============================================================================
// 2. ENFORCE FULLSCREEN MODE
// ============================================================================

function enterFullscreen() {
    console.log("📺 Entering fullscreen mode...");
    
    const elem = document.documentElement;
    
    if (elem.requestFullscreen) {
        elem.requestFullscreen();
    } else if (elem.webkitRequestFullscreen) {
        elem.webkitRequestFullscreen();
    } else if (elem.mozRequestFullScreen) {
        elem.mozRequestFullScreen();
    } else if (elem.msRequestFullscreen) {
        elem.msRequestFullscreen();
    }
    
    fullscreenActive = true;
    
    // Monitor fullscreen exit
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);
}

function handleFullscreenChange() {
    const isFullscreen = !!(document.fullscreenElement || 
                           document.webkitFullscreenElement || 
                           document.mozFullScreenElement ||
                           document.msFullscreenElement);
    
    if (!isFullscreen && lockdownActive) {
        // User exited fullscreen during lockdown
        console.error("⚠️ CRITICAL: Fullscreen exited during lockdown!");
        
        // Log violation
        if (typeof window.postMessage === 'function') {
            window.postMessage({
                type: "VIOLATION",
                details: "FULLSCREEN_EXITED: Exited fullscreen mode during exam",
                timestamp: Date.now()
            }, "*");
        }
        
        // Attempt to re-enter
        setTimeout(() => {
            if (lockdownActive) {
                alert("⚠️ Fullscreen mode is required for the exam!\n\nYou will be re-entered into fullscreen mode.");
                enterFullscreen();
            }
        }, 1000);
    }
}

// ============================================================================
// 3. DISABLE BROWSER SHORTCUTS AND FEATURES
// ============================================================================

function disableBrowserShortcuts() {
    console.log("⌨️ Disabling dangerous keyboard shortcuts...");
    
    // Comprehensive list of shortcuts to block
    const blockedShortcuts = [
        // Developer Tools
        { ctrl: true, shift: true, key: 'I' },  // Dev tools
        { ctrl: true, shift: true, key: 'J' },  // Console
        { ctrl: true, shift: true, key: 'C' },  // Inspect element
        { key: 'F12' },                         // Dev tools
        
        // Browser Navigation
        { ctrl: true, key: 'T' },               // New tab
        { ctrl: true, key: 'N' },               // New window
        { ctrl: true, shift: true, key: 'N' },  // Incognito
        { ctrl: true, key: 'W' },               // Close tab
        { ctrl: true, shift: true, key: 'W' },  // Close window
        { ctrl: true, key: 'Tab' },             // Switch tabs
        { ctrl: true, shift: true, key: 'Tab' },// Switch tabs reverse
        { alt: true, key: 'F4' },               // Close window
        { alt: true, key: 'Tab' },              // Switch applications
        
        // Browser Functions
        { ctrl: true, key: 'H' },               // History
        { ctrl: true, key: 'J' },               // Downloads
        { ctrl: true, key: 'R' },               // Reload
        { ctrl: true, shift: true, key: 'R' },  // Hard reload
        { key: 'F5' },                          // Reload
        { ctrl: true, key: 'F5' },              // Hard reload
        { ctrl: true, key: 'L' },               // Address bar
        { ctrl: true, key: 'K' },               // Search bar
        { key: 'F11' },                         // Fullscreen toggle
        { key: 'Escape' },                      // Exit fullscreen
        
        // System Functions
        { ctrl: true, alt: true, key: 'Delete' }, // Task manager
        { meta: true, key: 'Tab' },             // App switcher (Mac)
        { meta: true, key: 'Space' },           // Spotlight (Mac)
    ];
    
    document.addEventListener('keydown', (e) => {
        // Check if this key combination should be blocked
        for (const shortcut of blockedShortcuts) {
            const ctrlMatch = shortcut.ctrl ? e.ctrlKey || e.metaKey : !e.ctrlKey && !e.metaKey;
            const shiftMatch = shortcut.shift ? e.shiftKey : !e.shiftKey;
            const altMatch = shortcut.alt ? e.altKey : !e.altKey;
            const keyMatch = shortcut.key ? e.key === shortcut.key : true;
            
            if (ctrlMatch && shiftMatch && altMatch && keyMatch) {
                e.preventDefault();
                e.stopPropagation();
                
                console.warn(`🚫 Blocked shortcut: ${shortcut.key || 'key combo'}`);
                
                // Log violation
                window.postMessage({
                    type: "VIOLATION",
                    details: `KEYBOARD_SHORTCUT_BLOCKED: Attempted to use ${shortcut.key || 'shortcut'}`,
                    timestamp: Date.now()
                }, "*");
                
                return false;
            }
        }
    }, true); // Capture phase to catch before content script
}

// ============================================================================
// 4. DISABLE RIGHT-CLICK AND CONTEXT MENU
// ============================================================================

function disableContextMenu() {
    console.log("🖱️ Disabling right-click and context menu...");
    
    document.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        console.warn("🚫 Right-click blocked");
        return false;
    }, true);
}

// ============================================================================
// 5. DISABLE TEXT SELECTION AND COPYING
// ============================================================================

function disableTextOperations() {
    console.log("📝 Disabling text selection and copying...");
    
    // Disable selection
    document.addEventListener('selectstart', (e) => {
        // Allow selection in input fields
        if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
            e.preventDefault();
            return false;
        }
    }, true);
    
    // Disable copy
    document.addEventListener('copy', (e) => {
        e.preventDefault();
        console.warn("🚫 Copy operation blocked");
        
        window.postMessage({
            type: "VIOLATION",
            details: "COPY_BLOCKED: Attempted to copy content",
            timestamp: Date.now()
        }, "*");
        
        return false;
    }, true);
    
    // Disable cut
    document.addEventListener('cut', (e) => {
        e.preventDefault();
        console.warn("🚫 Cut operation blocked");
        return false;
    }, true);
    
    // Disable paste (in exam questions - not answer fields)
    document.addEventListener('paste', (e) => {
        // Allow paste in input fields
        if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
            e.preventDefault();
            console.warn("🚫 Paste operation blocked");
            return false;
        }
    }, true);
}

// ============================================================================
// 6. DISABLE PRINTING
// ============================================================================

function disablePrinting() {
    console.log("🖨️ Disabling print functionality...");
    
    // Block beforeprint event
    window.addEventListener('beforeprint', (e) => {
        e.preventDefault();
        console.error("🚫 Print operation blocked");
        
        window.postMessage({
            type: "VIOLATION",
            details: "PRINT_BLOCKED: Attempted to print exam",
            timestamp: Date.now()
        }, "*");
        
        alert("⚠️ Printing is not allowed during the exam.");
        return false;
    }, true);
    
    // Override print function
    window.print = function() {
        console.error("🚫 Print function blocked");
        alert("⚠️ Printing is not allowed during the exam.");
    };
}

// ============================================================================
// 7. DISABLE BROWSER BACK/FORWARD
// ============================================================================

function disableNavigation() {
    console.log("⬅️ Disabling browser navigation...");
    
    // Disable back button
    history.pushState(null, null, location.href);
    window.addEventListener('popstate', function() {
        history.pushState(null, null, location.href);
        console.warn("🚫 Back button blocked");
        
        window.postMessage({
            type: "VIOLATION",
            details: "NAVIGATION_BLOCKED: Attempted to use back button",
            timestamp: Date.now()
        }, "*");
    });
}

// ============================================================================
// 8. PREVENT TAB CLOSING
// ============================================================================

function preventTabClose() {
    console.log("🚪 Preventing accidental tab closure...");
    
    window.addEventListener('beforeunload', (e) => {
        // Show confirmation dialog
        const message = "⚠️ Are you sure you want to leave the exam? Your progress may be lost.";
        e.preventDefault();
        e.returnValue = message;
        return message;
    });
}

// ============================================================================
// 9. MONITOR VISIBILITY AND FOCUS
// ============================================================================

function monitorVisibility() {
    console.log("👁️ Monitoring page visibility...");
    
    let hiddenTime = 0;
    
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            hiddenTime = Date.now();
            console.error("⚠️ Page hidden - user switched away!");
            
            window.postMessage({
                type: "VIOLATION",
                details: "PAGE_HIDDEN: Switched away from exam page",
                timestamp: Date.now()
            }, "*");
        } else {
            if (hiddenTime > 0) {
                const duration = Math.round((Date.now() - hiddenTime) / 1000);
                console.log(`✓ User returned after ${duration} seconds`);
            }
        }
    });
    
    window.addEventListener('blur', () => {
        console.warn("⚠️ Window lost focus");
    });
}

// ============================================================================
// 10. DISABLE DEVELOPER TOOLS (Detection)
// ============================================================================

function detectDevTools() {
    console.log("🔧 Monitoring for developer tools...");
    
    // Method 1: Console detection
    let devtoolsOpen = false;
    const element = new Image();
    
    Object.defineProperty(element, 'id', {
        get: function() {
            devtoolsOpen = true;
            console.error("⚠️ CRITICAL: Developer tools opened!");
            
            window.postMessage({
                type: "VIOLATION",
                details: "DEV_TOOLS_OPENED: Developer tools detected",
                timestamp: Date.now()
            }, "*");
            
            alert("⚠️ Developer tools are not allowed during the exam!\n\nClosing developer tools...");
        }
    });
    
    setInterval(() => {
        devtoolsOpen = false;
        console.log(element);
        console.clear();
        
        if (devtoolsOpen) {
            // Dev tools detected
        }
    }, 1000);
    
    // Method 2: Window size detection
    let threshold = 160;
    setInterval(() => {
        if (window.outerWidth - window.innerWidth > threshold ||
            window.outerHeight - window.innerHeight > threshold) {
            console.warn("⚠️ Possible dev tools open (window size discrepancy)");
        }
    }, 500);
}

// ============================================================================
// ACTIVATE LOCKDOWN MODE
// ============================================================================

function activateLockdown() {
    if (lockdownActive) {
        console.warn("Lockdown already active");
        return;
    }
    
    console.log("\n🔒 ==========================================");
    console.log("🔒  ACTIVATING BROWSER LOCKDOWN MODE");
    console.log("🔒 ==========================================\n");
    
    lockdownActive = true;
    
    // Enable all lockdown features
    disableBrowserShortcuts();
    disableContextMenu();
    disableTextOperations();
    disablePrinting();
    disableNavigation();
    preventTabClose();
    monitorVisibility();
    detectDevTools();
    
    // Attempt to disable other extensions
    disableOtherExtensions();
    
    console.log("\n✅ Lockdown features activated:");
    console.log("  • Browser shortcuts disabled");
    console.log("  • Right-click disabled");
    console.log("  • Copy/paste restricted");
    console.log("  • Print disabled");
    console.log("  • Navigation disabled");
    console.log("  • Tab close warning enabled");
    console.log("  • Visibility monitoring active");
    console.log("  • Dev tools detection active");
    
    return true;
}

function activateFullscreenLockdown() {
    activateLockdown();
    enterFullscreen();
    
    console.log("🔒 Fullscreen lockdown mode activated!");
}

function deactivateLockdown() {
    lockdownActive = false;
    fullscreenActive = false;
    
    // Exit fullscreen
    if (document.exitFullscreen) {
        document.exitFullscreen();
    }
    
    console.log("🔓 Lockdown mode deactivated");
}

// ============================================================================
// LOCKDOWN STATUS CHECK
// ============================================================================

function getLockdownStatus() {
    return {
        active: lockdownActive,
        fullscreen: fullscreenActive,
        features: {
            shortcuts: true,
            contextMenu: true,
            textOperations: true,
            printing: true,
            navigation: true,
            visibility: true,
            devTools: true
        }
    };
}

// Export functions
if (typeof window !== 'undefined') {
    window.browserLockdown = {
        activate: activateLockdown,
        activateFullscreen: activateFullscreenLockdown,
        deactivate: deactivateLockdown,
        enterFullscreen: enterFullscreen,
        getStatus: getLockdownStatus
    };
}

console.log("✅ Browser Lockdown Module Ready");

