/**
 * Debug Logger Module
 * Provides comprehensive logging for debugging WebAR application
 */

export class Logger {
  constructor() {
    this.logs = [];
    this.maxLogs = 500;
    this.logPanel = null;
    this.logContent = null;
    this.isVisible = false;
    
    this.init();
  }

  init() {
    this.logPanel = document.getElementById('log-panel');
    this.logContent = document.getElementById('log-content');
    
    this.setupEventListeners();
    
    // Log initial system info
    this.logSystemInfo();
  }

  setupEventListeners() {
    const logBtn = document.getElementById('log-btn');
    const closeBtn = document.getElementById('close-log-btn');
    const copyBtn = document.getElementById('copy-log-btn');
    const clearBtn = document.getElementById('clear-log-btn');

    if (logBtn) {
      logBtn.addEventListener('click', () => this.toggle());
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.hide());
    }

    if (copyBtn) {
      copyBtn.addEventListener('click', () => this.copyToClipboard());
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', () => this.clear());
    }
  }

  logSystemInfo() {
    const info = {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      devicePixelRatio: window.devicePixelRatio,
      isSecureContext: window.isSecureContext,
      protocol: window.location.protocol,
      host: window.location.host,
      pathname: window.location.pathname,
      origin: window.location.origin,
      timestamp: new Date().toISOString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      memory: performance.memory ? {
        usedJSHeapSize: performance.memory.usedJSHeapSize,
        totalJSHeapSize: performance.memory.totalJSHeapSize,
        jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
      } : 'unavailable'
    };

    this.info('SYSTEM_INFO', 'Application initialized', info);
  }

  getTimestamp() {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');
    const ms = now.getMilliseconds().toString().padStart(3, '0');
    return `${hours}:${minutes}:${seconds}.${ms}`;
  }

  getISOTimestamp() {
    return new Date().toISOString();
  }

  addLog(level, eventName, message, data = null) {
    const entry = {
      timestamp: this.getISOTimestamp(),
      displayTime: this.getTimestamp(),
      level,
      eventName,
      message,
      data
    };

    this.logs.push(entry);

    // Trim logs if exceeding max
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Update UI
    this.renderLogEntry(entry);

    // Also log to console
    const consoleMethod = level === 'error' ? 'error' : level === 'warning' ? 'warn' : 'log';
    console[consoleMethod](`[${entry.displayTime}] [${eventName}] ${message}`, data || '');
  }

  renderLogEntry(entry) {
    if (!this.logContent) return;

    const entryEl = document.createElement('div');
    entryEl.className = `log-entry ${entry.level}`;

    let html = `
      <span class="log-timestamp">${entry.displayTime}</span>
      <span class="log-event-name">[${entry.eventName}]</span>
      <span class="log-message">${entry.message}</span>
    `;

    if (entry.data) {
      const dataStr = typeof entry.data === 'object' 
        ? JSON.stringify(entry.data, null, 2) 
        : String(entry.data);
      html += `<div class="log-data">${this.escapeHtml(dataStr)}</div>`;
    }

    entryEl.innerHTML = html;
    this.logContent.appendChild(entryEl);

    // Auto-scroll to bottom
    this.logContent.scrollTop = this.logContent.scrollHeight;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Logging methods for different levels
  info(eventName, message, data = null) {
    this.addLog('info', eventName, message, data);
  }

  success(eventName, message, data = null) {
    this.addLog('success', eventName, message, data);
  }

  warning(eventName, message, data = null) {
    this.addLog('warning', eventName, message, data);
  }

  error(eventName, message, data = null) {
    this.addLog('error', eventName, message, data);
  }

  event(eventName, message, data = null) {
    this.addLog('event', eventName, message, data);
  }

  // WebXR specific logging
  logWebXRSupport(supported) {
    this.info('WEBXR_CHECK', `WebXR AR support: ${supported}`, { supported });
  }

  logSessionStart(sessionConfig) {
    this.success('AR_SESSION', 'AR session started', sessionConfig);
  }

  logSessionEnd() {
    this.info('AR_SESSION', 'AR session ended');
  }

  logHitTestStatus(active, position = null, resultsCount = 0) {
    this.event('HIT_TEST', active ? 'Surface detected' : 'Searching for surface', {
      active,
      position,
      resultsCount,
      timestamp: Date.now()
    });
  }

  logModelLoad(modelName, url) {
    this.info('MODEL_LOAD', `Loading model: ${modelName}`, { 
      name: modelName, 
      url,
      fullUrl: new URL(url, window.location.origin).href,
      timestamp: Date.now()
    });
  }

  logModelLoaded(modelName, details = {}) {
    this.success('MODEL_LOAD', `Model loaded: ${modelName}`, {
      name: modelName,
      loadTime: details.loadTime,
      size: details.size,
      cached: details.cached || false
    });
  }

  logModelError(modelName, error, context = {}) {
    this.error('MODEL_LOAD', `Failed to load model: ${modelName}`, { 
      error: error.message || error,
      stack: error.stack,
      url: context.url,
      httpStatus: context.httpStatus,
      responseType: context.responseType,
      timestamp: Date.now()
    });
  }

  logModelPlacement(position) {
    this.event('MODEL_PLACE', 'Model placed', { position });
  }

  logGesture(type, data) {
    this.event('GESTURE', `Gesture: ${type}`, data);
  }

  logNetworkRequest(method, url, status, details = {}) {
    const level = status >= 400 ? 'error' : 'info';
    this.addLog(level, 'NETWORK', `${method} ${url}`, { 
      status,
      method,
      url,
      fullUrl: new URL(url, window.location.origin).href,
      statusText: details.statusText,
      contentType: details.contentType,
      contentLength: details.contentLength,
      duration: details.duration,
      cached: details.cached || false,
      timestamp: Date.now()
    });
  }

  logError(context, error, additionalData = {}) {
    this.error('ERROR', `Error in ${context}`, {
      message: error.message || error,
      stack: error.stack,
      name: error.name,
      context,
      ...additionalData,
      timestamp: Date.now()
    });
  }

  // UI controls
  toggle() {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  show() {
    if (this.logPanel) {
      this.logPanel.classList.remove('hidden');
      this.isVisible = true;
    }
  }

  hide() {
    if (this.logPanel) {
      this.logPanel.classList.add('hidden');
      this.isVisible = false;
    }
  }

  clear() {
    this.logs = [];
    if (this.logContent) {
      this.logContent.innerHTML = '';
    }
    this.info('LOGGER', 'Log cleared');
  }

  copyToClipboard() {
    const logText = this.logs.map(entry => {
      let line = `[${entry.timestamp}] [${entry.level.toUpperCase()}] [${entry.eventName}] ${entry.message}`;
      if (entry.data) {
        line += `\n  Data: ${JSON.stringify(entry.data)}`;
      }
      return line;
    }).join('\n');

    navigator.clipboard.writeText(logText).then(() => {
      this.info('LOGGER', 'Log copied to clipboard');
    }).catch(err => {
      this.error('LOGGER', 'Failed to copy log', { error: err.message });
    });
  }

  // Export logs as JSON
  exportJSON() {
    return JSON.stringify(this.logs, null, 2);
  }

  // Get current status summary
  getStatus() {
    const errors = this.logs.filter(l => l.level === 'error');
    const warnings = this.logs.filter(l => l.level === 'warning');
    const networkErrors = errors.filter(l => l.eventName === 'NETWORK');
    
    return {
      totalLogs: this.logs.length,
      errors: errors.length,
      warnings: warnings.length,
      networkErrors: networkErrors.length,
      lastLog: this.logs[this.logs.length - 1] || null,
      errorSummary: errors.slice(-5).map(e => ({
        event: e.eventName,
        message: e.message,
        time: e.timestamp
      }))
    };
  }

  // Log fetch attempt with full details
  logFetchAttempt(url, options = {}) {
    this.info('FETCH_START', `Attempting to fetch: ${url}`, {
      url,
      fullUrl: new URL(url, window.location.origin).href,
      method: options.method || 'GET',
      headers: options.headers,
      timestamp: Date.now()
    });
  }

  // Log fetch response with full details
  logFetchResponse(url, response, startTime) {
    const duration = Date.now() - startTime;
    const level = response.ok ? 'success' : 'error';
    
    this.addLog(level, 'FETCH_RESPONSE', `Response from: ${url}`, {
      url,
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      redirected: response.redirected,
      type: response.type,
      headers: {
        contentType: response.headers.get('content-type'),
        contentLength: response.headers.get('content-length'),
        cacheControl: response.headers.get('cache-control'),
        lastModified: response.headers.get('last-modified')
      },
      duration: `${duration}ms`,
      timestamp: Date.now()
    });
  }
}

// Singleton instance
let loggerInstance = null;

export function getLogger() {
  if (!loggerInstance) {
    loggerInstance = new Logger();
  }
  return loggerInstance;
}
