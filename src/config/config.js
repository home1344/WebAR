/**
 * Application Configuration
 * Central configuration for models, server endpoints, and app settings
 */

export const CONFIG = {
  // Server configuration
  server: {
    // Model server URL - will be updated for production
    modelBaseUrl: '/models/',
    // Enable CORS
    cors: true,
    // Request timeout in ms
    timeout: 30000
  },
  
  // Model configurations (hardcoded for MVP)
  models: [
    {
      id: 'house1',
      name: 'House 1',
      url: '/models/house1.glb',
      thumbnail: '/assets/thumbnails/house1.jpg',
      defaultScale: '0.1 0.1 0.1',
      layers: [
        { name: 'Roof', node: 'roof' },
        { name: 'Floor 1', node: 'floor1', alwaysVisible: true },
        { name: 'Floor 2', node: 'floor2' }
      ]
    },
    {
      id: 'house1-no-roof',
      name: 'House 1 (No Roof)',
      url: '/models/house1.glb',
      thumbnail: '/assets/thumbnails/house1-no-roof.jpg',
      defaultScale: '0.1 0.1 0.1',
      hiddenLayers: ['roof'],
      layers: [
        { name: 'Floor 1', node: 'floor1', alwaysVisible: true },
        { name: 'Floor 2', node: 'floor2' }
      ]
    },
    {
      id: 'house2',
      name: 'House 2',
      url: '/models/house2.glb',
      thumbnail: '/assets/thumbnails/house2.jpg',
      defaultScale: '0.1 0.1 0.1',
      layers: []
    },
    {
      id: 'house3',
      name: 'House 3',
      url: '/models/house3.glb',
      thumbnail: '/assets/thumbnails/house3.jpg',
      defaultScale: '0.1 0.1 0.1',
      layers: []
    }
  ],
  
  // AR Configuration
  ar: {
    // Hit test settings
    hitTest: {
      type: 'horizontal',
      maxDistance: 10,
      minConfidence: 0.5
    },
    // Anchor settings
    anchor: {
      persistent: true
    },
    // Light estimation
    lightEstimation: true
  },
  
  // UI Configuration
  ui: {
    // Show debug info in development
    showDebug: false,
    // Instruction display time in ms
    instructionTimeout: 5000,
    // Loading screen minimum display time
    minLoadingTime: 1000
  },
  
  // Gesture Configuration
  gestures: {
    // Rotation settings
    rotation: {
      enabled: true,
      speed: 0.5,
      axis: 'y' // Rotate around Y axis only
    },
    // Scale settings
    scale: {
      enabled: true,
      min: 0.05,
      max: 2.0,
      speed: 0.01
    }
  },
  
  // Performance settings
  performance: {
    // Max file size in MB
    maxModelSize: 50,
    // Recommended file size in MB
    recommendedModelSize: 20,
    // Texture resolution limit
    maxTextureSize: 2048,
    // Shadow settings
    shadows: true,
    // Anti-aliasing
    antialias: true
  }
};
