// Pre-Verification Security Checks
// Run BEFORE student verification to ensure secure environment

console.log("🔒 Initializing pre-verification security checks...");

// Store all detected issues
const securityIssues = [];
let checksComplete = false;

// ============================================================================
// 1. VIRTUAL MACHINE DETECTION
// ============================================================================

function detectVirtualMachine() {
    console.log("🖥️ Checking for virtual machine...");
    const issues = [];
    
    // Check 1: WebGL Renderer (VMs often have generic renderers)
    try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        
        if (gl) {
            const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
            if (debugInfo) {
                const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
                const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
                
                console.log(`GPU Renderer: ${renderer}`);
                console.log(`GPU Vendor: ${vendor}`);
                
                // Common VM indicators
                const vmIndicators = [
                    'VMware',
                    'VirtualBox',
                    'Virtual',
                    'llvmpipe',
                    'SwiftShader',
                    'Microsoft Basic Render Driver'
                ];
                
                const isVM = vmIndicators.some(indicator => 
                    renderer.includes(indicator) || vendor.includes(indicator)
                );
                
                if (isVM) {
                    issues.push({
                        type: 'VM_DETECTED',
                        severity: 'HIGH',
                        message: `Virtual Machine detected: ${renderer}`,
                        recommendation: 'Please use a physical computer, not a virtual machine'
                    });
                }
            }
        }
    } catch (err) {
        console.warn("Could not check GPU renderer:", err);
    }
    
    // Check 2: Hardware Concurrency (VMs often have limited cores)
    const cores = navigator.hardwareConcurrency || 0;
    console.log(`CPU Cores: ${cores}`);
    
    if (cores <= 2) {
        issues.push({
            type: 'LOW_CPU_CORES',
            severity: 'MEDIUM',
            message: `Only ${cores} CPU cores detected (may indicate VM)`,
            recommendation: 'Ensure you are using adequate hardware'
        });
    }
    
    // Check 3: Memory (VMs typically have less)
    if (navigator.deviceMemory) {
        const memory = navigator.deviceMemory; // In GB
        console.log(`Device Memory: ${memory} GB`);
        
        if (memory < 4) {
            issues.push({
                type: 'LOW_MEMORY',
                severity: 'MEDIUM',
                message: `Only ${memory}GB RAM detected (may indicate VM)`,
                recommendation: 'Minimum 4GB RAM recommended'
            });
        }
    }
    
    // Check 4: Canvas Fingerprinting (VMs produce different patterns)
    try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 200;
        canvas.height = 50;
        
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillText('VM Detection Test 🔒', 2, 2);
        
        const dataURL = canvas.toDataURL();
        const vmFingerprints = [
            // Common VM canvas fingerprints would go here
            // This is a simplified check
        ];
        
        // In production, you'd compare against known VM fingerprints
    } catch (err) {
        console.warn("Canvas fingerprint check failed:", err);
    }
    
    return issues;
}

// ============================================================================
// 2. HARDWARE MONITORING
// ============================================================================

async function checkHardware() {
    console.log("🔌 Checking hardware devices...");
    const issues = [];
    
    // Check 1: Connected Media Devices
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        
        const videoInputs = devices.filter(d => d.kind === 'videoinput');
        const audioInputs = devices.filter(d => d.kind === 'audioinput');
        const audioOutputs = devices.filter(d => d.kind === 'audiooutput');
        
        console.log(`Video devices: ${videoInputs.length}`);
        console.log(`Audio input devices: ${audioInputs.length}`);
        console.log(`Audio output devices: ${audioOutputs.length}`);
        
        // Multiple webcams might indicate screen capture devices
        if (videoInputs.length > 2) {
            issues.push({
                type: 'MULTIPLE_WEBCAMS',
                severity: 'MEDIUM',
                message: `${videoInputs.length} video devices detected`,
                recommendation: 'Multiple cameras detected. Disconnect unnecessary devices.'
            });
        }
        
        // Log device labels for analysis
        videoInputs.forEach(device => {
            console.log(`Video: ${device.label || 'Unknown'}`);
            
            // Check for virtual camera software
            const virtualCamIndicators = [
                'OBS Virtual Camera',
                'ManyCam',
                'Snap Camera',
                'XSplit VCam',
                'ChromaCam',
                'Virtual'
            ];
            
            const isVirtual = virtualCamIndicators.some(indicator =>
                (device.label || '').includes(indicator)
            );
            
            if (isVirtual) {
                issues.push({
                    type: 'VIRTUAL_CAMERA',
                    severity: 'CRITICAL',
                    message: `Virtual camera detected: ${device.label}`,
                    recommendation: 'Please disable virtual camera software (OBS, ManyCam, etc.)'
                });
            }
        });
        
    } catch (err) {
        console.error("Could not enumerate devices:", err);
        issues.push({
            type: 'DEVICE_PERMISSION_DENIED',
            severity: 'HIGH',
            message: 'Cannot check hardware - permission denied',
            recommendation: 'Please grant camera and microphone permissions'
        });
    }
    
    // Check 2: USB Devices (WebUSB API - limited support)
    if (navigator.usb) {
        try {
            const devices = await navigator.usb.getDevices();
            console.log(`USB devices connected: ${devices.length}`);
            
            // This requires user permission, so might not work without interaction
        } catch (err) {
            console.warn("USB device check failed:", err);
        }
    }
    
    // Check 3: Bluetooth Devices
    if (navigator.bluetooth) {
        console.log("Bluetooth API available");
        // Note: Can only check with user permission
    }
    
    // Check 4: Battery (can indicate physical vs VM)
    if (navigator.getBattery) {
        try {
            const battery = await navigator.getBattery();
            console.log(`Battery: ${battery.level * 100}%, Charging: ${battery.charging}`);
            
            // VMs typically don't report accurate battery info
            if (!battery.charging && battery.level === 1.0) {
                // Might be a VM (always shows 100% and not charging)
            }
        } catch (err) {
            console.warn("Battery check failed:", err);
        }
    }
    
    return issues;
}

// ============================================================================
// 3. SCREEN RECORDING DETECTION (Limited)
// ============================================================================

function detectScreenRecording() {
    console.log("🎥 Checking for screen recording...");
    const issues = [];
    
    // Check 1: Media Capture API (if screen is being shared)
    if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
        // We can't directly detect if OBS is running, but we can check some indicators
        
        // Check if screen capture is active (this is limited)
        // Browser won't tell us if external tools are recording
    }
    
    // Check 2: Performance/CPU usage patterns
    // High CPU usage might indicate recording software
    if (performance && performance.memory) {
        const memory = performance.memory;
        console.log(`JS Heap Size: ${(memory.usedJSHeapSize / 1048576).toFixed(2)} MB`);
        console.log(`Total Heap Size: ${(memory.totalJSHeapSize / 1048576).toFixed(2)} MB`);
    }
    
    // Check 3: Window title detection (very limited in browser)
    // We cannot access window titles of other applications from browser
    
    // LIMITATION: Browser sandbox prevents detecting external recording software
    console.log("⚠️ Note: Cannot reliably detect external screen recorders (OBS, etc.)");
    console.log("   This requires OS-level access which browsers don't provide");
    
    return issues;
}

// ============================================================================
// 4. BROWSER ENVIRONMENT CHECK
// ============================================================================

function checkBrowserEnvironment() {
    console.log("🌐 Checking browser environment...");
    const issues = [];
    
    // Check 1: Extensions (detect if user has many extensions)
    // Note: Chrome doesn't allow reading other extensions for security
    
    // Check 2: Incognito Mode Detection
    if (window.webkitRequestFileSystem) {
        window.webkitRequestFileSystem(
            window.TEMPORARY,
            1,
            () => {
                console.log("Not in incognito mode");
            },
            () => {
                issues.push({
                    type: 'INCOGNITO_MODE',
                    severity: 'HIGH',
                    message: 'Browser is in incognito/private mode',
                    recommendation: 'Please use normal browsing mode for exam'
                });
            }
        );
    }
    
    // Check 3: Multiple Windows
    if (window.opener) {
        issues.push({
            type: 'POPUP_WINDOW',
            severity: 'MEDIUM',
            message: 'Exam opened in popup window',
            recommendation: 'Please use main browser window'
        });
    }
    
    // Check 4: Screen Size (detect if unusually small, might be VM)
    const screenWidth = window.screen.width;
    const screenHeight = window.screen.height;
    console.log(`Screen Resolution: ${screenWidth}x${screenHeight}`);
    
    if (screenWidth < 1024 || screenHeight < 768) {
        issues.push({
            type: 'LOW_RESOLUTION',
            severity: 'LOW',
            message: `Low screen resolution: ${screenWidth}x${screenHeight}`,
            recommendation: 'Recommended: 1280x720 or higher'
        });
    }
    
    // Check 5: Multiple Monitors
    if (window.screen.isExtended) {
        issues.push({
            type: 'MULTIPLE_MONITORS',
            severity: 'HIGH',
            message: 'Multiple monitors detected',
            recommendation: 'Please disconnect additional monitors before exam'
        });
    }
    
    // Check 6: Browser Type and Version
    const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
    const isEdge = /Edg/.test(navigator.userAgent);
    const isFirefox = /Firefox/.test(navigator.userAgent);
    
    if (!isChrome && !isEdge) {
        issues.push({
            type: 'UNSUPPORTED_BROWSER',
            severity: 'MEDIUM',
            message: 'Chrome or Edge browser recommended',
            recommendation: 'For best compatibility, use Google Chrome or Microsoft Edge'
        });
    }
    
    return issues;
}

// ============================================================================
// 5. SOCIAL ENGINEERING / REMOTE ACCESS DETECTION (Very Limited)
// ============================================================================

function detectRemoteAccess() {
    console.log("🔍 Checking for remote access indicators...");
    const issues = [];
    
    // MAJOR LIMITATION: Browsers cannot detect:
    // - TeamViewer, AnyDesk, Chrome Remote Desktop
    // - Other remote desktop software
    // This requires OS-level access
    
    // Check 1: Network RTT patterns (might indicate remote connection)
    if (navigator.connection) {
        const conn = navigator.connection;
        console.log(`Connection Type: ${conn.effectiveType}`);
        console.log(`Downlink: ${conn.downlink} Mbps`);
        console.log(`RTT: ${conn.rtt} ms`);
        
        // Very high RTT might indicate remote connection
        if (conn.rtt > 200) {
            issues.push({
                type: 'HIGH_LATENCY',
                severity: 'MEDIUM',
                message: `High network latency: ${conn.rtt}ms`,
                recommendation: 'Check your network connection. High latency detected.'
            });
        }
    }
    
    // Check 2: Pointer behavior (very subtle)
    // Remote desktop often has slightly different pointer behavior
    // This would require behavioral analysis over time
    
    console.log("⚠️ Note: Cannot reliably detect remote desktop software");
    console.log("   Browser security prevents detecting OS-level applications");
    
    return issues;
}

// ============================================================================
// RUN ALL CHECKS
// ============================================================================

async function runAllSecurityChecks() {
    console.log("\n🔒 ============================================");
    console.log("🔒  RUNNING PRE-VERIFICATION SECURITY CHECKS");
    console.log("🔒 ============================================\n");
    
    securityIssues.length = 0; // Clear previous issues
    
    // Run all checks
    const vmIssues = detectVirtualMachine();
    const hardwareIssues = await checkHardware();
    const recordingIssues = detectScreenRecording();
    const browserIssues = checkBrowserEnvironment();
    const remoteIssues = detectRemoteAccess();
    
    // Combine all issues
    securityIssues.push(...vmIssues);
    securityIssues.push(...hardwareIssues);
    securityIssues.push(...recordingIssues);
    securityIssues.push(...browserIssues);
    securityIssues.push(...remoteIssues);
    
    checksComplete = true;
    
    // Display results
    console.log("\n📊 Security Check Results:");
    console.log("==========================================");
    
    if (securityIssues.length === 0) {
        console.log("✅ All security checks passed!");
        return { passed: true, issues: [] };
    } else {
        console.log(`⚠️ Found ${securityIssues.length} security issue(s):\n`);
        
        securityIssues.forEach((issue, index) => {
            const icon = issue.severity === 'CRITICAL' ? '🔴' : 
                        issue.severity === 'HIGH' ? '🟠' : 
                        issue.severity === 'MEDIUM' ? '🟡' : '🔵';
            
            console.log(`${icon} ${index + 1}. [${issue.severity}] ${issue.type}`);
            console.log(`   ${issue.message}`);
            console.log(`   → ${issue.recommendation}\n`);
        });
        
        return { passed: false, issues: securityIssues };
    }
}

// ============================================================================
// DISPLAY ISSUES TO USER
// ============================================================================

function displaySecurityIssues(issues) {
    const criticalIssues = issues.filter(i => i.severity === 'CRITICAL');
    const highIssues = issues.filter(i => i.severity === 'HIGH');
    const otherIssues = issues.filter(i => i.severity === 'MEDIUM' || i.severity === 'LOW');
    
    let message = "⚠️ Security Issues Detected:\n\n";
    
    if (criticalIssues.length > 0) {
        message += "🔴 CRITICAL Issues (Must Fix):\n";
        criticalIssues.forEach(issue => {
            message += `  • ${issue.message}\n    → ${issue.recommendation}\n\n`;
        });
    }
    
    if (highIssues.length > 0) {
        message += "🟠 HIGH Priority Issues:\n";
        highIssues.forEach(issue => {
            message += `  • ${issue.message}\n    → ${issue.recommendation}\n\n`;
        });
    }
    
    if (otherIssues.length > 0) {
        message += "🟡 Other Issues:\n";
        otherIssues.forEach(issue => {
            message += `  • ${issue.message}\n    → ${issue.recommendation}\n\n`;
        });
    }
    
    return message;
}

// Export for use in main app
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        runAllSecurityChecks,
        displaySecurityIssues,
        securityIssues
    };
}

