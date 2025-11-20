console.log("Enhanced Proctoring Extension Loaded (Monitoring INACTIVE until face verification)");

// Track monitoring state
let isMonitoring = false; // Will be activated after face verification
let lastActivityTime = Date.now();
let idleCheckInterval = null;

// --- Helper function to send a violation message ---
function sendViolation(details) {
  // Find the proctoring tab
  chrome.tabs.query({ url: "http://localhost:8080/*" }, (tabs) => {
    if (tabs.length > 0) {
      // Send to the proctoring tab
      chrome.tabs.sendMessage(tabs[0].id, {
        type: "VIOLATION",
        details: details,
        timestamp: Date.now()
      }).catch(err => {
        console.error("Could not send violation:", err);
      });
    }
  });
}

// --- Start/Stop Monitoring ---
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "START_MONITORING") {
    if (isMonitoring) {
      console.warn("⚠️ Monitoring already active");
      sendResponse({ success: true, alreadyActive: true });
      return true;
    }
    
    isMonitoring = true;
    startIdleDetection();
    
    console.log("✅✅✅ BACKGROUND MONITORING ACTIVATED ✅✅✅");
    console.log("Background script will now detect violations:");
    console.log("  • Tab switches");
    console.log("  • New tabs");
    console.log("  • Focus loss / App switching");
    console.log("  • URL navigation");
    console.log("  • File downloads");
    console.log("  • Extension changes");
    console.log("  • Idle detection");
    
    sendResponse({ success: true, message: "Background monitoring started after face verification" });
  } else if (message.type === "START_CONTENT_MONITORING") {
    // Forward this message to the content script
    chrome.tabs.query({ url: "http://localhost:8080/*" }, (tabs) => {
      if (tabs.length > 0) {
        chrome.tabs.sendMessage(tabs[0].id, { type: "START_CONTENT_MONITORING" }, (response) => {
          if (chrome.runtime.lastError) {
            console.error("❌ Could not activate content script:", chrome.runtime.lastError.message);
            sendResponse({ success: false, error: chrome.runtime.lastError.message });
          } else {
            console.log("✅ Content script monitoring activated");
            sendResponse({ success: true, message: "Content script monitoring activated" });
          }
        });
      } else {
        console.error("❌ Proctoring tab not found");
        sendResponse({ success: false, error: "Proctoring tab not found" });
      }
    });
    return true; // Keep channel open for async response
  } else if (message.type === "STOP_MONITORING") {
    isMonitoring = false;
    stopIdleDetection();
    console.log("⏹️ Monitoring stopped");
    
    // Also stop content script monitoring
    chrome.tabs.query({ url: "http://localhost:8080/*" }, (tabs) => {
      if (tabs.length > 0) {
        chrome.tabs.sendMessage(tabs[0].id, { type: "STOP_CONTENT_MONITORING" });
      }
    });
    
    sendResponse({ success: true });
  } else if (message.type === "DISABLE_OTHER_EXTENSIONS") {
    disableOtherExtensions(sendResponse);
    return true; // Keep channel open for async response
  } else if (message.type === "GET_EXTENSIONS_LIST") {
    getExtensionsList(sendResponse);
    return true;
  }
  return true;
});

// --- Extension Management ---
function disableOtherExtensions(sendResponse) {
  chrome.management.getAll((extensions) => {
    const ourExtension = chrome.runtime.id;
    const problematicExtensions = [];
    
    extensions.forEach((ext) => {
      // Skip our own extension
      if (ext.id === ourExtension) return;
      
      // Skip built-in components
      if (ext.type === 'component') return;
      
      // Check if extension is enabled
      if (ext.enabled) {
        console.log(`📌 Found enabled extension: ${ext.name}`);
        problematicExtensions.push({
          id: ext.id,
          name: ext.name,
          enabled: ext.enabled
        });
        
        // Note: We cannot actually disable extensions programmatically in Manifest V3
        // User must do it manually. We can only report them.
      }
    });
    
    if (problematicExtensions.length > 0) {
      console.warn(`⚠️ Found ${problematicExtensions.length} other extensions enabled`);
      sendResponse({
        success: false,
        extensions: problematicExtensions,
        message: "Other extensions detected. Please disable them manually."
      });
    } else {
      sendResponse({ success: true, message: "No other extensions detected" });
    }
  });
}

function getExtensionsList(sendResponse) {
  chrome.management.getAll((extensions) => {
    const ourExtension = chrome.runtime.id;
    const extList = extensions
      .filter(ext => ext.id !== ourExtension && ext.type !== 'component')
      .map(ext => ({
        id: ext.id,
        name: ext.name,
        enabled: ext.enabled,
        type: ext.type
      }));
    
    sendResponse({ extensions: extList });
  });
}

// --- 1. Tab Switch Detection ---
chrome.tabs.onActivated.addListener((activeInfo) => {
  if (!isMonitoring) return;
  
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    // Only log violation if switching away from proctoring page
    if (!tab.url || !tab.url.includes("localhost:8080")) {
      console.warn("⚠️ VIOLATION: Tab switched to:", tab.url || "unknown");
      sendViolation("TAB_SWITCH: Switched to different tab");
    }
  });
});

// --- 2. New Tab Detection ---
chrome.tabs.onCreated.addListener((tab) => {
  if (!isMonitoring) return;
  
  console.error("⚠️ VIOLATION: New tab created");
  sendViolation("NEW_TAB_CREATED: Opened new browser tab");
});

// --- 3. Window Focus Loss Detection ---
let focusLostTime = null;
chrome.windows.onFocusChanged.addListener((windowId) => {
  if (!isMonitoring) return;
  
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    // User switched to a different application
    focusLostTime = Date.now();
    console.error("⚠️ VIOLATION: Browser focus lost - switched to another application");
    sendViolation("FOCUS_LOST: Switched to another application (e.g., Cursor, VS Code)");
  } else {
    // User returned to browser
    if (focusLostTime) {
      const awayDuration = Math.round((Date.now() - focusLostTime) / 1000);
      console.log(`✓ User returned to browser after ${awayDuration} seconds`);
      focusLostTime = null;
    }
  }
});

// --- 4. Tab Update Detection (URL changes) ---
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (!isMonitoring) return;
  
  // Detect navigation away from proctoring page
  if (changeInfo.url && !changeInfo.url.includes("localhost:8080")) {
    console.error("⚠️ VIOLATION: Navigated to:", changeInfo.url);
    sendViolation(`NAVIGATION: Navigated to ${changeInfo.url}`);
  }
});

// --- 5. Tab Removal Detection ---
chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  if (!isMonitoring) return;
  
  // Check if proctoring tab was closed
  chrome.tabs.query({ url: "http://localhost:8080/*" }, (tabs) => {
    if (tabs.length === 0) {
      console.error("⚠️ CRITICAL: Proctoring tab closed!");
      // Can't send violation since tab is gone
      // But we log it for any monitoring system
    }
  });
});

// --- 6. Idle Detection (No activity for extended period) ---
function startIdleDetection() {
  idleCheckInterval = setInterval(() => {
    const idleTime = Math.round((Date.now() - lastActivityTime) / 1000);
    
    // If idle for more than 60 seconds, it's suspicious
    if (idleTime > 60) {
      console.warn(`⚠️ User idle for ${idleTime} seconds`);
      sendViolation(`SUSPICIOUS_INACTIVITY: No activity for ${idleTime} seconds`);
      lastActivityTime = Date.now(); // Reset to avoid spam
    }
  }, 30000); // Check every 30 seconds
}

function stopIdleDetection() {
  if (idleCheckInterval) {
    clearInterval(idleCheckInterval);
    idleCheckInterval = null;
  }
}

// --- 7. Download Detection ---
chrome.downloads.onCreated.addListener((downloadItem) => {
  if (!isMonitoring) return;
  
  console.error("⚠️ VIOLATION: File download started:", downloadItem.filename);
  sendViolation(`FILE_DOWNLOAD: Attempted to download ${downloadItem.filename}`);
  
  // Optionally cancel the download
  chrome.downloads.cancel(downloadItem.id);
});

// --- 8. Bookmark/History Detection ---
chrome.history.onVisited.addListener((historyItem) => {
  if (!isMonitoring) return;
  
  if (!historyItem.url.includes("localhost:8080")) {
    console.warn("⚠️ Visited URL:", historyItem.url);
    // This can be used for post-exam analysis
  }
});

// --- 9. Extension Management Detection ---
chrome.management.onEnabled.addListener((info) => {
  if (!isMonitoring) return;
  
  console.warn("⚠️ Extension enabled:", info.name);
  sendViolation(`EXTENSION_ENABLED: ${info.name}`);
});

chrome.management.onInstalled.addListener((info) => {
  if (!isMonitoring) return;
  
  console.error("⚠️ VIOLATION: New extension installed:", info.name);
  sendViolation(`EXTENSION_INSTALLED: ${info.name}`);
});

// --- 10. Alarm for Periodic Checks ---
chrome.alarms.create("heartbeat", { periodInMinutes: 0.5 }); // Every 30 seconds

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "heartbeat" && isMonitoring) {
    // Check if proctoring tab still exists and is focused
    chrome.tabs.query({ url: "http://localhost:8080/*" }, (tabs) => {
      if (tabs.length === 0) {
        console.error("⚠️ Proctoring tab not found during heartbeat!");
      } else {
        // Send heartbeat to content script to verify it's still alive
        chrome.tabs.sendMessage(tabs[0].id, {
          type: "HEARTBEAT",
          timestamp: Date.now()
        }).catch(() => {
          console.error("⚠️ Content script not responding to heartbeat!");
        });
      }
    });
  }
});

// --- Helper: Check for multiple monitors ---
chrome.system.display.getInfo((displays) => {
  if (displays.length > 1) {
    console.warn(`⚠️ Multiple displays detected: ${displays.length} monitors`);
    if (isMonitoring) {
      sendViolation(`MULTIPLE_MONITORS: ${displays.length} displays detected`);
    }
  }
});

console.log("✅ Enhanced proctoring extension ready");
console.log("📊 Monitoring capabilities:");
console.log("  • Tab switches");
console.log("  • New tabs");
console.log("  • Focus loss (switching to other apps)");
console.log("  • URL navigation");
console.log("  • File downloads");
console.log("  • Extension changes");
console.log("  • Idle detection");
console.log("  • Multiple monitors");
