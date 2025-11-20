/**
 * Gaze Calibration Service
 * Handles WebGazer.js initialization and eye tracking calibration
 */

// Extend Window type to include webgazer
declare global {
  interface Window {
    webgazer: any;
  }
}

export interface CalibrationPoint {
  x: number;
  y: number;
}

export interface GazeData {
  x: number;
  y: number;
  timestamp: number;
}

export type CalibrationProgressCallback = (current: number, total: number, message: string) => void;
export type GazeCallback = (data: GazeData) => void;

class GazeCalibrationService {
  private isWebGazerLoaded = false;
  private isWebGazerInitialized = false;
  private isCalibrated = false;
  private lastGazePoint: GazeData | null = null;
  private gazeCallback: GazeCallback | null = null;

  /**
   * Load WebGazer.js library
   */
  async loadWebGazer(): Promise<boolean> {
    try {
      if (this.isWebGazerLoaded && typeof window.webgazer !== 'undefined') {
        console.log('✅ WebGazer.js already loaded');
        return true;
      }

      console.log('📦 Loading WebGazer.js...');

      // Try local first, then CDN
      const sources = [
        '/libs/webgazer.js',
        'https://webgazer.cs.brown.edu/webgazer.js',
      ];

      for (const src of sources) {
        try {
          await this.loadScript(src);
          await this.waitForWebGazer();

          if (typeof window.webgazer !== 'undefined') {
            console.log(`✅ WebGazer.js loaded from: ${src}`);
            this.isWebGazerLoaded = true;
            return true;
          }
        } catch (error: any) {
          console.warn(`   Failed to load WebGazer from ${src}:`, error.message);
          continue;
        }
      }

      throw new Error('WebGazer.js failed to load from all sources');
    } catch (error: any) {
      console.error('❌ Failed to load WebGazer.js:', error);
      return false;
    }
  }

  /**
   * Load script dynamically
   */
  private loadScript(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // Check if script is already loaded
      const existingScript = document.querySelector(`script[src="${src}"]`);
      if (existingScript) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
      document.head.appendChild(script);
    });
  }

  /**
   * Wait for WebGazer to be available
   */
  private waitForWebGazer(): Promise<void> {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const maxAttempts = 50; // 5 seconds

      const checkInterval = setInterval(() => {
        attempts++;

        if (typeof window.webgazer !== 'undefined') {
          clearInterval(checkInterval);
          resolve();
        }

        if (attempts >= maxAttempts) {
          clearInterval(checkInterval);
          reject(new Error('WebGazer timeout'));
        }
      }, 100);
    });
  }

  /**
   * Initialize WebGazer
   */
  async initialize(): Promise<boolean> {
    try {
      if (!this.isWebGazerLoaded) {
        const loaded = await this.loadWebGazer();
        if (!loaded) {
          throw new Error('Failed to load WebGazer');
        }
      }

      if (this.isWebGazerInitialized) {
        console.log('✅ WebGazer already initialized');
        return true;
      }

      console.log('🔧 Initializing WebGazer...');

      // Configure WebGazer
      await window.webgazer
        .setGazeListener((data: any, timestamp: number) => {
          if (data == null) return;

          this.lastGazePoint = {
            x: data.x,
            y: data.y,
            timestamp: timestamp,
          };

          // Call user-provided callback
          if (this.gazeCallback && this.isCalibrated) {
            this.gazeCallback(this.lastGazePoint);
          }
        })
        .begin();

      // Hide the default WebGazer video feed
      window.webgazer.showVideoPreview(false).showPredictionPoints(false);

      this.isWebGazerInitialized = true;
      console.log('✅ WebGazer initialized');

      return true;
    } catch (error: any) {
      console.error('❌ Failed to initialize WebGazer:', error);
      return false;
    }
  }

  /**
   * Perform 9-point calibration
   */
  async calibrate(progressCallback?: CalibrationProgressCallback): Promise<boolean> {
    try {
      if (!this.isWebGazerInitialized) {
        const initialized = await this.initialize();
        if (!initialized) {
          throw new Error('WebGazer not initialized');
        }
      }

      console.log('🎯 Starting calibration...');

      // Resume WebGazer if paused
      await window.webgazer.resume();

      // Create 9-point calibration grid
      const points: CalibrationPoint[] = [
        { x: 0.1, y: 0.1 }, { x: 0.5, y: 0.1 }, { x: 0.9, y: 0.1 },
        { x: 0.1, y: 0.5 }, { x: 0.5, y: 0.5 }, { x: 0.9, y: 0.5 },
        { x: 0.1, y: 0.9 }, { x: 0.5, y: 0.9 }, { x: 0.9, y: 0.9 },
      ];

      const containerWidth = window.innerWidth;
      const containerHeight = window.innerHeight;

      for (let i = 0; i < points.length; i++) {
        const point = points[i];
        const x = point.x * containerWidth;
        const y = point.y * containerHeight;

        if (progressCallback) {
          progressCallback(i + 1, points.length, `Calibrating point ${i + 1} of ${points.length}`);
        }

        await this.showCalibrationPoint(x, y);
        await this.sleep(500); // Wait between points
      }

      this.isCalibrated = true;
      console.log('✅ Calibration complete');

      if (progressCallback) {
        progressCallback(points.length, points.length, 'Calibration complete!');
      }

      return true;
    } catch (error: any) {
      console.error('❌ Calibration failed:', error);
      return false;
    }
  }

  /**
   * Show calibration point and wait for user interaction
   */
  private showCalibrationPoint(x: number, y: number): Promise<void> {
    return new Promise((resolve) => {
      // Create calibration dot
      const dot = document.createElement('div');
      dot.style.position = 'fixed';
      dot.style.left = x + 'px';
      dot.style.top = y + 'px';
      dot.style.width = '30px';
      dot.style.height = '30px';
      dot.style.borderRadius = '50%';
      dot.style.backgroundColor = '#ef4444'; // Red
      dot.style.border = '4px solid white';
      dot.style.cursor = 'pointer';
      dot.style.zIndex = '10000';
      dot.style.transform = 'translate(-50%, -50%)';
      dot.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
      dot.style.transition = 'transform 0.2s';

      // Add pulsing animation
      const style = document.createElement('style');
      style.textContent = `
        @keyframes pulse {
          0%, 100% { transform: translate(-50%, -50%) scale(1); }
          50% { transform: translate(-50%, -50%) scale(1.2); }
        }
      `;
      document.head.appendChild(style);
      dot.style.animation = 'pulse 1s ease-in-out infinite';

      document.body.appendChild(dot);

      // Wait for click
      const handleClick = () => {
        // Record calibration point with WebGazer
        window.webgazer.recordScreenPosition(x, y);
        
        // Visual feedback
        dot.style.backgroundColor = '#22c55e'; // Green
        dot.style.transform = 'translate(-50%, -50%) scale(0.5)';
        
        setTimeout(() => {
          if (document.body.contains(dot)) {
            document.body.removeChild(dot);
          }
          resolve();
        }, 200);
      };

      dot.addEventListener('click', handleClick);

      // Auto-advance after 5 seconds if no click
      setTimeout(() => {
        if (document.body.contains(dot)) {
          window.webgazer.recordScreenPosition(x, y);
          document.body.removeChild(dot);
          resolve();
        }
      }, 5000);
    });
  }

  /**
   * Set gaze callback for real-time gaze tracking
   */
  setGazeCallback(callback: GazeCallback) {
    this.gazeCallback = callback;
  }

  /**
   * Remove gaze callback
   */
  removeGazeCallback() {
    this.gazeCallback = null;
  }

  /**
   * Get last gaze point
   */
  getLastGazePoint(): GazeData | null {
    return this.lastGazePoint;
  }

  /**
   * Pause eye tracking
   */
  pause() {
    if (window.webgazer) {
      window.webgazer.pause();
    }
  }

  /**
   * Resume eye tracking
   */
  resume() {
    if (window.webgazer) {
      window.webgazer.resume();
    }
  }

  /**
   * Stop and cleanup WebGazer
   */
  stop() {
    try {
      if (window.webgazer) {
        window.webgazer.end();
        this.isWebGazerInitialized = false;
        this.isCalibrated = false;
        this.lastGazePoint = null;
        this.gazeCallback = null;
        console.log('🛑 WebGazer stopped');
      }
    } catch (error: any) {
      console.error('❌ Error stopping WebGazer:', error);
    }
  }

  /**
   * Check if calibrated
   */
  isCalibrationComplete(): boolean {
    return this.isCalibrated;
  }

  /**
   * Utility: sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const gazeCalibrationService = new GazeCalibrationService();







