/**
 * AR Session Manager
 * Handles WebXR session lifecycle and hit testing
 */

import { getLogger } from './logger.js';

export class ARSession {
  constructor(onPlaceCallback, onStartCallback, onEndCallback) {
    this.session = null;
    this.referenceSpace = null;
    this.viewerSpace = null;
    this.hitTestSource = null;
    this.hitTestAvailable = false;
    this.scene = null;
    this.renderer = null;
    this.lastHitPosition = null;
    this.logger = getLogger();
    this.lastHitLogTime = 0;
    this.hitLogInterval = 2000; // Log hit status every 2 seconds max
    
    // Callbacks
    this.onPlace = onPlaceCallback;
    this.onStart = onStartCallback;
    this.onEnd = onEndCallback;
    
    // Bind methods
    this.onSelect = this.onSelect.bind(this);
    this.onSessionEnd = this.onSessionEnd.bind(this);
    
    this.init();
  }

  init() {
    // Get A-Frame scene and renderer
    this.scene = document.querySelector('a-scene');
    if (!this.scene) {
      throw new Error('A-Frame scene not found');
    }
    
    // Store reference for hit test updates
    this.hitTestMarker = document.getElementById('marker');
  }

  async start() {
    if (this.session) {
      console.warn('AR session already active');
      return;
    }
    
    try {
      const overlayRoot = document.getElementById('ui-overlay');

      const sessionInitCandidates = [
        {
          requiredFeatures: ['hit-test'],
          optionalFeatures: ['dom-overlay'],
          ...(overlayRoot ? { domOverlay: { root: overlayRoot } } : {})
        },
        {
          requiredFeatures: ['hit-test'],
          optionalFeatures: []
        }
      ];

      let lastError = null;
      for (const sessionInit of sessionInitCandidates) {
        try {
          this.session = await navigator.xr.requestSession('immersive-ar', sessionInit);
          break;
        } catch (err) {
          lastError = err;
          if (err && err.name === 'NotSupportedError') {
            continue;
          }
          throw err;
        }
      }

      if (!this.session) {
        throw lastError || new Error('Failed to start AR session');
      }
      
      // Configure session
      try {
        await this.configureSession();
      } catch (error) {
        try {
          await this.session.end();
        } catch (_) {
          // ignore
        }
        this.session = null;
        throw error;
      }
      
      // Start render loop
      this.scene.renderer.xr.enabled = true;
      this.scene.renderer.xr.setSession(this.session);
      
      // Setup event listeners
      this.session.addEventListener('select', this.onSelect);
      this.session.addEventListener('end', this.onSessionEnd);
      
      // Notify session started
      if (this.onStart) {
        this.onStart();
      }
      
      console.log('AR Session started successfully');
      
    } catch (error) {
      console.error('Failed to start AR session:', error);
      throw error;
    }
  }

  async configureSession() {
    this.logger.info('AR_CONFIG', 'Configuring AR session...');
    
    // Create reference space
    this.referenceSpace = await this.session.requestReferenceSpace('local');
    this.viewerSpace = await this.session.requestReferenceSpace('viewer');
    this.logger.info('AR_CONFIG', 'Reference spaces created', { local: true, viewer: true });
    
    // Setup hit test source
    if (!this.session.requestHitTestSource) {
      this.hitTestAvailable = false;
      this.logger.error('HIT_TEST', 'Hit-test API not available on this session');
      throw new Error('Hit-test is not available in this AR session. Install/enable Google Play Services for AR (ARCore) and try again.');
    }

    const hitTestOptionsInit = {
      space: this.viewerSpace
    };

    if (typeof XRRay !== 'undefined') {
      hitTestOptionsInit.offsetRay = new XRRay();
      this.logger.info('HIT_TEST', 'Using XRRay for hit-test offset');
    }

    try {
      this.hitTestSource = await this.session.requestHitTestSource(hitTestOptionsInit);
      this.hitTestAvailable = true;
      this.logger.success('HIT_TEST', 'Hit-test source created successfully');
    } catch (error) {
      this.hitTestAvailable = false;
      this.logger.error('HIT_TEST', 'Failed to create hit-test source', { error: error.message });
      throw new Error('Failed to enable hit-test for AR session. Make sure Google Play Services for AR (ARCore) is installed/enabled, then retry.');
    }
    
    // Start frame loop for hit testing
    this.session.requestAnimationFrame(this.onXRFrame.bind(this));
    this.logger.info('AR_CONFIG', 'XR frame loop started');
  }

  onXRFrame(time, frame) {
    const session = frame.session;
    
    // Schedule next frame
    session.requestAnimationFrame(this.onXRFrame.bind(this));
    
    // Perform hit test
    if (this.hitTestSource && frame) {
      const hitTestResults = frame.getHitTestResults(this.hitTestSource);
      
      if (hitTestResults.length > 0) {
        const hit = hitTestResults[0];
        const pose = hit.getPose(this.referenceSpace);
        
        if (pose) {
          // Update hit marker position
          this.updateHitMarker(pose);
          
          // Store last hit position
          const transform = pose.transform;
          this.lastHitPosition = {
            x: transform.position.x,
            y: transform.position.y,
            z: transform.position.z
          };
          
          // Update UI status
          this.updateHitTestStatus(true);
          
          // Throttled logging for hit detection
          if (time - this.lastHitLogTime > this.hitLogInterval) {
            this.logger.event('HIT_TEST', 'Surface detected', {
              position: this.lastHitPosition,
              resultsCount: hitTestResults.length
            });
            this.lastHitLogTime = time;
          }
        }
      } else {
        // No hit detected
        this.updateHitTestStatus(false);
        this.hideHitMarker();
        
        // Throttled logging for no hit
        if (time - this.lastHitLogTime > this.hitLogInterval) {
          this.logger.info('HIT_TEST', 'Searching for surface...');
          this.lastHitLogTime = time;
        }
      }
    }
    
    // Update FPS counter if debug mode
    this.updateDebugInfo(time);
  }

  updateHitMarker(pose) {
    if (!this.hitTestMarker) return;
    
    const transform = pose.transform;
    
    // Use WebXR coordinates directly (consistent with lastHitPosition)
    const position = {
      x: transform.position.x,
      y: transform.position.y,
      z: transform.position.z
    };
    
    // Update marker position in world space
    this.hitTestMarker.object3D.position.set(position.x, position.y, position.z);
    this.hitTestMarker.setAttribute('visible', true);
    
    // Update rotation from hit pose quaternion
    const orientation = transform.orientation;
    if (orientation) {
      this.hitTestMarker.object3D.quaternion.set(
        orientation.x,
        orientation.y,
        orientation.z,
        orientation.w
      );
    }
  }

  hideHitMarker() {
    if (this.hitTestMarker) {
      this.hitTestMarker.setAttribute('visible', false);
    }
  }

  onSelect(event) {
    // Place model at hit location
    if (this.lastHitPosition && this.onPlace) {
      this.logger.event('USER_ACTION', 'Screen tap - placing model', { position: this.lastHitPosition });
      this.onPlace(this.lastHitPosition);
      
      // Hide marker after placement
      this.hideHitMarker();
    } else {
      this.logger.warning('USER_ACTION', 'Screen tap but no valid hit position available');
    }
  }

  updateHitTestStatus(active) {
    const statusEl = document.getElementById('hit-test-status');
    if (statusEl) {
      statusEl.textContent = active ? 'active' : 'searching...';
      statusEl.className = active ? 'active' : '';
    }
    
    // Update instructions
    const instructions = document.getElementById('instructions');
    if (instructions && active) {
      instructions.querySelector('p').textContent = 'Tap to place the model';
    }
  }

  updateDebugInfo(time) {
    const debugInfo = document.getElementById('debug-info');
    if (debugInfo && !debugInfo.classList.contains('hidden')) {
      // Calculate FPS
      if (!this.lastTime) this.lastTime = time;
      const delta = time - this.lastTime;
      const fps = Math.round(1000 / delta);
      this.lastTime = time;
      
      const fpsEl = document.getElementById('fps');
      if (fpsEl) {
        fpsEl.textContent = fps;
      }
    }
  }

  async end() {
    if (this.session) {
      await this.session.end();
    }
  }

  onSessionEnd() {
    this.logger.info('AR_SESSION', 'AR session ended');
    
    // Clean up
    this.session = null;
    this.referenceSpace = null;
    this.viewerSpace = null;
    this.hitTestSource = null;
    this.lastHitPosition = null;
    
    // Notify session ended
    if (this.onEnd) {
      this.onEnd();
    }
  }

  pause() {
    // Pause session if needed
    console.log('AR Session paused');
  }

  resume() {
    // Resume session if needed
    console.log('AR Session resumed');
  }
}
