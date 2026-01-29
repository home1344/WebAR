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

  // Hit Test Marker Component
  AFRAME.registerComponent('hit-test-marker', {
  init: function() {
    this.el.setAttribute('visible', false);
  },
  
  tick: function() {
    // Marker visibility is controlled by AR session
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
