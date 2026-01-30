/**
 * Model Loader
 * Handles dynamic loading of GLB/glTF models from server
 */

import { getLogger } from './logger.js';

export class ModelLoader {
  constructor(modelConfigs) {
    this.models = modelConfigs;
    this.loadedModels = new Map();
    this.currentLoadingModel = null;
    this.loadingProgress = 0;
    this.logger = getLogger();
  }

  /**
   * Load a model from URL with progress tracking
   */
  async loadModel(url, onProgress) {
    // Check cache first
    if (this.loadedModels.has(url)) {
      this.logger.info('MODEL_CACHE', 'Model loaded from cache', { url });
      return this.loadedModels.get(url);
    }
    
    try {
      this.currentLoadingModel = url;
      this.logger.info('NETWORK', `Fetching model: ${url}`);
      
      // Fetch model with progress tracking
      const response = await this.fetchWithProgress(url, onProgress);
      
      if (!response.ok) {
        this.logger.logNetworkRequest('GET', url, response.status);
        throw new Error(`Failed to load model: HTTP ${response.status}`);
      }
      
      this.logger.logNetworkRequest('GET', url, response.status);
      
      // Get blob and create object URL
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      
      // Cache the object URL
      this.loadedModels.set(url, objectUrl);
      
      this.logger.success('NETWORK', 'Model downloaded successfully', { 
        url, 
        size: blob.size,
        type: blob.type 
      });
      return objectUrl;
      
    } catch (error) {
      this.logger.error('NETWORK', `Failed to fetch model: ${url}`, { 
        error: error.message 
      });
      throw error;
    } finally {
      this.currentLoadingModel = null;
      this.loadingProgress = 0;
    }
  }

  /**
   * Fetch with progress tracking
   */
  async fetchWithProgress(url, onProgress) {
    const response = await fetch(url);
    
    if (!response.ok) {
      return response;
    }
    
    // Get total size from headers
    const contentLength = response.headers.get('content-length');
    const total = parseInt(contentLength, 10);
    
    if (!contentLength || !response.body) {
      // Fallback if no content-length header
      return response;
    }
    
    // Read the response stream
    const reader = response.body.getReader();
    const chunks = [];
    let receivedLength = 0;
    
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;
      
      chunks.push(value);
      receivedLength += value.length;
      
      // Calculate progress
      const progress = Math.round((receivedLength / total) * 100);
      this.loadingProgress = progress;
      
      if (onProgress) {
        onProgress(progress, receivedLength, total);
      }
    }
    
    // Combine chunks into single array
    const chunksAll = new Uint8Array(receivedLength);
    let position = 0;
    for (const chunk of chunks) {
      chunksAll.set(chunk, position);
      position += chunk.length;
    }
    
    // Create new response with blob
    const blob = new Blob([chunksAll]);
    return new Response(blob, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers
    });
  }

  /**
   * Preload multiple models
   */
  async preloadModels(urls, onProgress) {
    const totalModels = urls.length;
    let loadedCount = 0;
    
    for (const url of urls) {
      try {
        await this.loadModel(url, (progress) => {
          const overallProgress = ((loadedCount + (progress / 100)) / totalModels) * 100;
          if (onProgress) {
            onProgress(overallProgress);
          }
        });
        
        loadedCount++;
      } catch (error) {
        console.error(`Failed to preload model: ${url}`, error);
      }
    }
    
    return loadedCount === totalModels;
  }

  /**
   * Get model configuration by ID
   */
  getModelConfig(modelId) {
    return this.models.find(m => m.id === modelId);
  }

  /**
   * Clear model cache
   */
  clearCache() {
    // Revoke all object URLs to free memory
    for (const [url, objectUrl] of this.loadedModels) {
      URL.revokeObjectURL(objectUrl);
    }
    
    this.loadedModels.clear();
    console.log('Model cache cleared');
  }

  /**
   * Get cache size
   */
  getCacheSize() {
    return this.loadedModels.size;
  }

  /**
   * Check if model is cached
   */
  isModelCached(url) {
    return this.loadedModels.has(url);
  }
}
