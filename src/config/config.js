/**
 * Application Configuration
 * Central configuration for models, server endpoints, and app settings
 * 
 * Supports two modes:
 * 1. Backend API mode: fetches config from /api/config at runtime
 * 2. Fallback mode: uses hardcoded defaults when API is unavailable
 */

// Default rendering images used when a model has no per-model rendering images
const DEFAULT_RENDERING_IMAGES = [
  '/rendering/rendering00.png',
  '/rendering/rendering25.png',
  '/rendering/rendering50.png',
  '/rendering/rendering75.png'
];

// Hardcoded fallback config (used when backend API is unreachable)
const FALLBACK_CONFIG = {
  // Server configuration
  server: {
    // Model server URL - will be updated for production
    modelBaseUrl: '/models/',
    // Enable CORS
    cors: true,
    // Request timeout in ms
    timeout: 30000
  },
  
  // Model configurations - URLs must match actual filenames in public/models/
  models: [
    {
      id: 'house0',
      name: 'House 0',
      url: '/models/House0.gltf',
      thumbnail: '/thumbnails/preview0.png',
      renderingImages: DEFAULT_RENDERING_IMAGES,
      defaultScale: '1 1 1',
      targetSizeMeters: 0.5,
      layers: []
    },
    {
      id: 'house1',
      name: 'House 1',
      url: '/models/House1.gltf',
      thumbnail: '/thumbnails/preview1.png',
      renderingImages: DEFAULT_RENDERING_IMAGES,
      defaultScale: '1 1 1',
      targetSizeMeters: 0.5,
      layers: []
    },
    {
      id: 'house2',
      name: 'House 2',
      url: '/models/House2.gltf',
      thumbnail: '/thumbnails/preview2.png',
      renderingImages: DEFAULT_RENDERING_IMAGES,
      defaultScale: '1 1 1',
      targetSizeMeters: 0.5,
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
      minFactor: 1,   // 
      maxFactor: 10.0,    // Can grow to 5x normalized base size
      speed: 1.0  // Direct 1:1 pinch-to-scale ratio for responsive feel
    },
    // Pinch-rotate settings (two-finger twist)
    pinchRotate: {
      enabled: true,
      speed: 1.0
    }
  },
  
  // Performance settings
  performance: {
    // Max file size in MB
    maxModelSize: 100,
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

// Cached config instance (populated by loadConfig)
let _configCache = null;

/**
 * Ensure every model in the config has a valid renderingImages array.
 * Falls back to DEFAULT_RENDERING_IMAGES if missing or incomplete.
 */
function normalizeModels(config) {
  if (config && Array.isArray(config.models)) {
    config.models = config.models.map(model => ({
      ...model,
      renderingImages: (Array.isArray(model.renderingImages) && model.renderingImages.length === 4)
        ? model.renderingImages
        : DEFAULT_RENDERING_IMAGES
    }));
  }
  return config;
}

/**
 * Load configuration from backend API with fallback to hardcoded defaults.
 * Caches the result for subsequent calls.
 * @returns {Promise<object>} The application config
 */
export async function loadConfig() {
  if (_configCache) return _configCache;
  
  try {
    const response = await fetch('/api/config', {
      signal: AbortSignal.timeout(5000)
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const apiConfig = await response.json();
    _configCache = normalizeModels(apiConfig);
    console.log('[CONFIG] Loaded from backend API');
    return _configCache;
  } catch (e) {
    console.warn('[CONFIG] Backend API unavailable, using fallback config:', e.message);
    _configCache = normalizeModels({ ...FALLBACK_CONFIG });
    return _configCache;
  }
}

/**
 * Get the current config synchronously.
 * Returns cached config if loadConfig() was called, otherwise returns fallback.
 * @returns {object} The application config
 */
export function getConfig() {
  return _configCache || normalizeModels({ ...FALLBACK_CONFIG });
}

// Legacy export: synchronous CONFIG constant for backward compatibility
// Code that imports CONFIG directly will get the fallback until loadConfig() is called
export const CONFIG = FALLBACK_CONFIG;

// Export defaults for use by other modules
export { DEFAULT_RENDERING_IMAGES };
