/**
 * Custom A-Frame Components for WebAR
 * Extends A-Frame with AR-specific functionality
 */

// Wait for A-Frame to be loaded
document.addEventListener('DOMContentLoaded', () => {
  // Check if A-Frame is loaded
  if (typeof AFRAME === 'undefined') {
    console.error('A-Frame not loaded. Make sure A-Frame script is in the head before this component.');
    return;
  }

  // Hit Test Marker Component — Hexagonal Reticle
  // Two visual states:
  //   'detecting'  → single large hexagon outline (shown while surface is being detected)
  //   'detected'   → honeycomb pattern: central double-hex + 6 surrounding hexagons + connecting lines
  AFRAME.registerComponent('hit-test-marker', {
  init: function() {
    this.el.setAttribute('visible', false);
    this.surfaceState = 'detecting'; // 'detecting' | 'detected'

    // Root group rotated to lay flat on the surface (XY → XZ)
    this.reticleRoot = new THREE.Group();
    this.reticleRoot.rotation.x = -Math.PI / 2;
    this.el.object3D.add(this.reticleRoot);

    // Build both visual states
    this.detectingGroup = this._buildDetectingReticle();
    this.detectedGroup  = this._buildDetectedReticle();

    this.reticleRoot.add(this.detectingGroup);
    this.reticleRoot.add(this.detectedGroup);

    // Initial visibility
    this.detectingGroup.visible = true;
    this.detectedGroup.visible  = false;

    // Slow idle rotation for visual polish
    this._rotationSpeed = 0.15; // radians per second
  },

  tick: function(time, delta) {
    // Gentle rotation of the reticle
    if (delta) {
      this.reticleRoot.rotation.z += this._rotationSpeed * (delta / 1000);
    }
  },

  /** Switch visual state ('detecting' or 'detected') */
  setSurfaceState: function(state) {
    if (this.surfaceState === state) return;
    this.surfaceState = state;
    this.detectingGroup.visible = (state === 'detecting');
    this.detectedGroup.visible  = (state === 'detected');
  },

  // ── Detecting state: single hexagon outline (Image 2) ──────────────
  _buildDetectingReticle: function() {
    const group = new THREE.Group();
    const hex = this._createHexRingMesh(0.15, 0.003, 0xffffff, 0.85);
    group.add(hex);
    return group;
  },

  // ── Detected state: honeycomb pattern (Image 3) ────────────────────
  _buildDetectedReticle: function() {
    const group = new THREE.Group();

    // Central double hexagon (inner + outer ring with gap)
    const outerHex = this._createHexRingMesh(0.075, 0.004, 0xffffff, 1.0);
    const innerHex = this._createHexRingMesh(0.055, 0.003, 0xffffff, 0.9);
    group.add(outerHex);
    group.add(innerHex);

    // 6 surrounding smaller hexagons + connecting lines
    const surroundRadius = 0.04;
    const distance = 0.16;

    for (let i = 0; i < 6; i++) {
      // Pointy-top: first vertex at –90° (top)
      const angle = (i * Math.PI / 3) - Math.PI / 2;
      const cx = distance * Math.cos(angle);
      const cy = distance * Math.sin(angle);

      // Small surrounding hexagon
      const smallHex = this._createHexRingMesh(surroundRadius, 0.0025, 0xffffff, 0.7);
      smallHex.position.set(cx, cy, 0);
      group.add(smallHex);

      // Connecting line from outer central hex vertex → nearest vertex of surrounding hex
      const outerR = 0.075;
      const startX = outerR * Math.cos(angle);
      const startY = outerR * Math.sin(angle);
      // The surrounding hex vertex closest to center is the one pointing inward (angle + PI)
      const innerAngle = angle + Math.PI;
      const endX = cx + surroundRadius * Math.cos(innerAngle);
      const endY = cy + surroundRadius * Math.sin(innerAngle);

      const connector = this._createLineMesh(startX, startY, endX, endY, 0.002, 0xffffff, 0.6);
      group.add(connector);
    }

    return group;
  },

  // ── Geometry helpers ───────────────────────────────────────────────

  /** Create a hexagonal ring (outline) as a mesh using THREE.Shape with a hole */
  _createHexRingMesh: function(radius, thickness, color, opacity) {
    const innerR = radius - thickness;

    const outerShape = new THREE.Shape();
    const holePath   = new THREE.Path();

    for (let i = 0; i < 6; i++) {
      // Pointy-top orientation: first vertex at –90°
      const a = (i * Math.PI / 3) - Math.PI / 2;
      const ox = radius  * Math.cos(a);
      const oy = radius  * Math.sin(a);
      const ix = innerR  * Math.cos(a);
      const iy = innerR  * Math.sin(a);

      if (i === 0) {
        outerShape.moveTo(ox, oy);
        holePath.moveTo(ix, iy);
      } else {
        outerShape.lineTo(ox, oy);
        holePath.lineTo(ix, iy);
      }
    }
    outerShape.closePath();
    holePath.closePath();
    outerShape.holes.push(holePath);

    const geometry = new THREE.ShapeGeometry(outerShape);
    const material = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: opacity,
      side: THREE.DoubleSide,
      depthTest: false
    });

    return new THREE.Mesh(geometry, material);
  },

  /** Create a thin rectangular plane between two 2-D points (connector line) */
  _createLineMesh: function(x1, y1, x2, y2, width, color, opacity) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);

    const geometry = new THREE.PlaneGeometry(len, width);
    const material = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: opacity,
      side: THREE.DoubleSide,
      depthTest: false
    });
    const mesh = new THREE.Mesh(geometry, material);
    // Position at midpoint, rotate to match direction
    mesh.position.set((x1 + x2) / 2, (y1 + y2) / 2, 0);
    mesh.rotation.z = angle;
    return mesh;
  }
});

// AR Hit Test Component (renamed to avoid conflict with A-Frame's built-in ar-hit-test)
AFRAME.registerComponent('custom-ar-hit-test', {
  schema: {
    target: {type: 'selector'},
    type: {default: 'horizontal'}
  },
  
  init: function() {
    this.xrHitTestSource = null;
    this.viewerSpace = null;
    this.refSpace = null;
    
    this.sessionStarted = false;
    
    const sceneEl = this.el.sceneEl;
    
    sceneEl.addEventListener('enter-vr', async () => {
      const session = this.el.sceneEl.renderer.xr.getSession();
      
      if (session && session.requestHitTestSource) {
        await this.setupHitTest(session);
      }
    });
    
    sceneEl.addEventListener('exit-vr', () => {
      this.sessionStarted = false;
      if (this.xrHitTestSource) {
        this.xrHitTestSource.cancel();
        this.xrHitTestSource = null;
      }
    });
  },
  
  async setupHitTest(session) {
    try {
      const referenceSpace = await session.requestReferenceSpace('viewer');
      this.viewerSpace = referenceSpace;
      this.refSpace = await session.requestReferenceSpace('local');
      
      // Request hit test source
      this.xrHitTestSource = await session.requestHitTestSource({
        space: this.viewerSpace,
        entityTypes: ['plane'],
        offsetRay: new XRRay()
      });
      
      this.sessionStarted = true;
      console.log('Hit test source initialized');
      
    } catch (error) {
      console.error('Failed to setup hit test:', error);
    }
  },
  
  tick: function() {
    if (!this.sessionStarted || !this.xrHitTestSource) return;
    
    const frame = this.el.sceneEl.frame;
    if (!frame) return;
    
    const hitTestResults = frame.getHitTestResults(this.xrHitTestSource);
    
    if (hitTestResults.length > 0) {
      const hit = hitTestResults[0];
      const pose = hit.getPose(this.refSpace);
      
      if (pose && this.data.target) {
        const transform = pose.transform;
        
        // Update marker position
        this.data.target.object3D.position.set(
          transform.position.x,
          transform.position.y,
          transform.position.z
        );
        
        // Update marker rotation
        const quaternion = new THREE.Quaternion(
          transform.orientation.x,
          transform.orientation.y,
          transform.orientation.z,
          transform.orientation.w
        );
        this.data.target.object3D.quaternion.copy(quaternion);
        
        // Make marker visible
        this.data.target.setAttribute('visible', true);
        
        // Store last hit position for placement
        this.el.emit('ar-hit-detected', {
          position: transform.position,
          quaternion: transform.orientation
        });
      }
    } else {
      // No hit detected - hide marker
      if (this.data.target) {
        this.data.target.setAttribute('visible', false);
      }
    }
  }
});

// Model Gestures Component
AFRAME.registerComponent('model-gestures', {
  schema: {
    rotationSpeed: {default: 0.5},
    scaleMin: {default: 0.05},
    scaleMax: {default: 2.0},
    scaleSpeed: {default: 0.01}
  },
  
  init: function() {
    this.isRotating = false;
    this.isScaling = false;
    this.lastTouchX = 0;
    this.lastTouchY = 0;
    this.lastDistance = 0;
    this.initialScale = this.el.getAttribute('scale');
    
    // Bind methods
    this.onTouchStart = this.onTouchStart.bind(this);
    this.onTouchMove = this.onTouchMove.bind(this);
    this.onTouchEnd = this.onTouchEnd.bind(this);
    
    // Add event listeners
    document.addEventListener('touchstart', this.onTouchStart, {passive: false});
    document.addEventListener('touchmove', this.onTouchMove, {passive: false});
    document.addEventListener('touchend', this.onTouchEnd);
  },
  
  remove: function() {
    document.removeEventListener('touchstart', this.onTouchStart);
    document.removeEventListener('touchmove', this.onTouchMove);
    document.removeEventListener('touchend', this.onTouchEnd);
  },
  
  onTouchStart: function(event) {
    const touches = event.touches;
    
    if (touches.length === 1) {
      // Single touch - rotation
      this.isRotating = true;
      this.lastTouchX = touches[0].clientX;
      this.lastTouchY = touches[0].clientY;
    } else if (touches.length === 2) {
      // Two touches - scaling
      this.isRotating = false;
      this.isScaling = true;
      this.lastDistance = this.getDistance(touches[0], touches[1]);
    }
  },
  
  onTouchMove: function(event) {
    const touches = event.touches;
    
    if (this.isRotating && touches.length === 1) {
      event.preventDefault();
      
      const deltaX = touches[0].clientX - this.lastTouchX;
      const rotation = this.el.getAttribute('rotation');
      rotation.y -= deltaX * this.data.rotationSpeed;
      this.el.setAttribute('rotation', rotation);
      
      this.lastTouchX = touches[0].clientX;
      this.lastTouchY = touches[0].clientY;
      
    } else if (this.isScaling && touches.length === 2) {
      event.preventDefault();
      
      const distance = this.getDistance(touches[0], touches[1]);
      const scaleFactor = distance / this.lastDistance;
      
      const scale = this.el.getAttribute('scale');
      const newScale = {
        x: scale.x * scaleFactor,
        y: scale.y * scaleFactor,
        z: scale.z * scaleFactor
      };
      
      // Clamp scale
      newScale.x = Math.max(this.data.scaleMin, Math.min(this.data.scaleMax, newScale.x));
      newScale.y = Math.max(this.data.scaleMin, Math.min(this.data.scaleMax, newScale.y));
      newScale.z = Math.max(this.data.scaleMin, Math.min(this.data.scaleMax, newScale.z));
      
      this.el.setAttribute('scale', newScale);
      this.lastDistance = distance;
    }
  },
  
  onTouchEnd: function(event) {
    const touches = event.touches;
    
    if (touches.length === 0) {
      this.isRotating = false;
      this.isScaling = false;
    } else if (touches.length === 1) {
      this.isScaling = false;
      this.isRotating = true;
      this.lastTouchX = touches[0].clientX;
      this.lastTouchY = touches[0].clientY;
    }
  },
  
  getDistance: function(touch1, touch2) {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }
});

// Model Loader Component with Progress
AFRAME.registerComponent('model-loader', {
  schema: {
    src: {type: 'string'},
    autoLoad: {default: true}
  },
  
  init: function() {
    if (this.data.autoLoad && this.data.src) {
      this.loadModel();
    }
  },
  
  loadModel: async function() {
    const loader = new THREE.GLTFLoader();
    
    // Create progress callback
    const onProgress = (xhr) => {
      const percentComplete = (xhr.loaded / xhr.total) * 100;
      this.el.emit('model-progress', {percent: percentComplete});
    };
    
    try {
      const gltf = await new Promise((resolve, reject) => {
        loader.load(
          this.data.src,
          resolve,
          onProgress,
          reject
        );
      });
      
      // Add model to entity
      this.el.setObject3D('mesh', gltf.scene);
      this.el.emit('model-loaded', {model: gltf});
      
    } catch (error) {
      console.error('Failed to load model:', error);
      this.el.emit('model-error', {error: error});
    }
  }
});

// Layer Toggle Component
AFRAME.registerComponent('layer-toggle', {
  schema: {
    layers: {type: 'array', default: []},
    hiddenLayers: {type: 'array', default: []}
  },
  
  init: function() {
    this.el.addEventListener('model-loaded', () => {
      this.setupLayers();
    });
  },
  
  setupLayers: function() {
    const model = this.el.getObject3D('mesh');
    if (!model) return;
    
    // Hide specified layers
    this.data.hiddenLayers.forEach(layerName => {
      this.setLayerVisibility(layerName, false);
    });
  },
  
  setLayerVisibility: function(layerName, visible) {
    const model = this.el.getObject3D('mesh');
    if (!model) return;
    
    model.traverse((child) => {
      if (child.name === layerName) {
        child.visible = visible;
      }
    });
  },
  
  toggleLayer: function(layerName) {
    const model = this.el.getObject3D('mesh');
    if (!model) return;
    
    model.traverse((child) => {
      if (child.name === layerName) {
        child.visible = !child.visible;
      }
    });
  }
});

// Anchor Component for persistent placement
AFRAME.registerComponent('ar-anchor', {
  schema: {
    persistent: {default: true}
  },
  
  init: function() {
    this.anchor = null;
    
    this.el.addEventListener('ar-hit-detected', (event) => {
      this.createAnchor(event.detail.position);
    });
  },
  
  async createAnchor(position) {
    const session = this.el.sceneEl.renderer.xr.getSession();
    
    if (!session || !session.createAnchor) {
      console.warn('Anchors not supported in this session');
      return;
    }
    
    try {
      // Create anchor at position
      const anchorSpace = await session.createAnchor(
        new XRRigidTransform(position),
        session.referenceSpace
      );
      
      this.anchor = anchorSpace;
      console.log('Anchor created at position:', position);
      
    } catch (error) {
      console.error('Failed to create anchor:', error);
    }
  },
  
  remove: function() {
    if (this.anchor) {
      this.anchor.delete();
      this.anchor = null;
    }
  }
});
}); // Close DOMContentLoaded listener
