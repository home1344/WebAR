/**
 * Gesture Handler
 * Manages touch gestures for model manipulation (rotate, scale)
 */

import { CONFIG } from '../config/config.js';

export class GestureHandler {
  constructor() {
    this.model = null;
    this.isRotating = false;
    this.isScaling = false;
    this.lastTouchX = 0;
    this.lastTouchY = 0;
    this.lastDistance = 0;
    this.initialScale = null;
    
    // Gesture configuration
    this.config = CONFIG.gestures;
    
    // Bind methods
    this.onTouchStart = this.onTouchStart.bind(this);
    this.onTouchMove = this.onTouchMove.bind(this);
    this.onTouchEnd = this.onTouchEnd.bind(this);
  }

  /**
   * Attach gesture handlers to a model
   */
  attachToModel(modelEntity) {
    if (this.model) {
      this.detach();
    }
    
    this.model = modelEntity;
    
    // Get initial scale
    const scale = this.model.getAttribute('scale');
    this.initialScale = {
      x: scale.x,
      y: scale.y,
      z: scale.z
    };
    
    // Add touch event listeners
    document.addEventListener('touchstart', this.onTouchStart, { passive: false });
    document.addEventListener('touchmove', this.onTouchMove, { passive: false });
    document.addEventListener('touchend', this.onTouchEnd);
    
    console.log('Gesture handler attached to model');
  }

  /**
   * Detach gesture handlers
   */
  detach() {
    document.removeEventListener('touchstart', this.onTouchStart);
    document.removeEventListener('touchmove', this.onTouchMove);
    document.removeEventListener('touchend', this.onTouchEnd);
    
    this.model = null;
    this.isRotating = false;
    this.isScaling = false;
    
    console.log('Gesture handler detached');
  }

  /**
   * Handle touch start
   */
  onTouchStart(event) {
    if (!this.model) return;
    
    // Check if touching the UI overlay
    if (this.isTouchingUI(event.target)) {
      return;
    }
    
    event.preventDefault();
    
    const touches = event.touches;
    
    if (touches.length === 1) {
      // Single touch - start rotation
      if (this.config.rotation.enabled) {
        this.isRotating = true;
        this.lastTouchX = touches[0].clientX;
        this.lastTouchY = touches[0].clientY;
      }
    } else if (touches.length === 2) {
      // Two touches - start scaling
      if (this.config.scale.enabled) {
        this.isRotating = false;
        this.isScaling = true;
        this.lastDistance = this.getDistance(touches[0], touches[1]);
      }
    }
  }

  /**
   * Handle touch move
   */
  onTouchMove(event) {
    if (!this.model) return;
    
    // Check if touching the UI overlay
    if (this.isTouchingUI(event.target)) {
      return;
    }
    
    event.preventDefault();
    
    const touches = event.touches;
    
    if (this.isRotating && touches.length === 1) {
      // Rotate model
      this.handleRotation(touches[0]);
    } else if (this.isScaling && touches.length === 2) {
      // Scale model
      this.handleScale(touches[0], touches[1]);
    }
  }

  /**
   * Handle touch end
   */
  onTouchEnd(event) {
    if (!this.model) return;
    
    const touches = event.touches;
    
    if (touches.length === 0) {
      // All touches ended
      this.isRotating = false;
      this.isScaling = false;
    } else if (touches.length === 1) {
      // One touch remaining - switch to rotation
      if (this.config.rotation.enabled) {
        this.isScaling = false;
        this.isRotating = true;
        this.lastTouchX = touches[0].clientX;
        this.lastTouchY = touches[0].clientY;
      }
    }
  }

  /**
   * Handle rotation gesture
   */
  handleRotation(touch) {
    const deltaX = touch.clientX - this.lastTouchX;
    const deltaY = touch.clientY - this.lastTouchY;
    
    // Get current rotation
    const rotation = this.model.getAttribute('rotation');
    
    // Apply rotation based on configured axis
    const rotationSpeed = this.config.rotation.speed;
    
    if (this.config.rotation.axis === 'y') {
      // Rotate around Y axis only
      rotation.y -= deltaX * rotationSpeed;
    } else if (this.config.rotation.axis === 'xy') {
      // Rotate around both X and Y
      rotation.y -= deltaX * rotationSpeed;
      rotation.x += deltaY * rotationSpeed;
    }
    
    // Apply rotation
    this.model.setAttribute('rotation', rotation);
    
    // Update last position
    this.lastTouchX = touch.clientX;
    this.lastTouchY = touch.clientY;
  }

  /**
   * Handle scale gesture
   */
  handleScale(touch1, touch2) {
    const distance = this.getDistance(touch1, touch2);
    
    if (this.lastDistance === 0) {
      this.lastDistance = distance;
      return;
    }
    
    // Calculate scale factor
    const scaleFactor = distance / this.lastDistance;
    
    // Get current scale
    const scale = this.model.getAttribute('scale');
    
    // Apply scale with speed factor
    const scaleSpeed = this.config.scale.speed;
    const newScale = {
      x: scale.x * (1 + (scaleFactor - 1) * scaleSpeed * 10),
      y: scale.y * (1 + (scaleFactor - 1) * scaleSpeed * 10),
      z: scale.z * (1 + (scaleFactor - 1) * scaleSpeed * 10)
    };
    
    // Clamp scale to min/max
    const minScale = this.config.scale.min;
    const maxScale = this.config.scale.max;
    
    newScale.x = Math.max(minScale, Math.min(maxScale, newScale.x));
    newScale.y = Math.max(minScale, Math.min(maxScale, newScale.y));
    newScale.z = Math.max(minScale, Math.min(maxScale, newScale.z));
    
    // Apply new scale
    this.model.setAttribute('scale', newScale);
    
    // Update last distance
    this.lastDistance = distance;
  }

  /**
   * Calculate distance between two touch points
   */
  getDistance(touch1, touch2) {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Check if touching UI element
   */
  isTouchingUI(target) {
    // Check if target or its parents are UI elements
    let element = target;
    while (element) {
      if (element.classList && (
        element.classList.contains('ui-btn') ||
        element.classList.contains('gallery-modal') ||
        element.classList.contains('controls-panel') ||
        element.classList.contains('layer-btn') ||
        element.id === 'ui-overlay'
      )) {
        return true;
      }
      element = element.parentElement;
    }
    return false;
  }

  /**
   * Reset model to initial scale
   */
  resetScale() {
    if (this.model && this.initialScale) {
      this.model.setAttribute('scale', this.initialScale);
    }
  }

  /**
   * Reset model rotation
   */
  resetRotation() {
    if (this.model) {
      this.model.setAttribute('rotation', '0 0 0');
    }
  }
}
