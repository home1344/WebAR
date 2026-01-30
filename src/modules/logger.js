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
      host: window.location.host
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

  logHitTestStatus(active, position = null) {
    this.event('HIT_TEST', active ? 'Surface detected' : 'Searching for surface', {
      active,
      position
    });
  }

  logModelLoad(modelName, url) {
    this.info('MODEL_LOAD', `Loading model: ${modelName}`, { name: modelName, url });
  }

  logModelLoaded(modelName) {
    this.success('MODEL_LOAD', `Model loaded: ${modelName}`);
  }

  logModelError(modelName, error) {
    this.error('MODEL_LOAD', `Failed to load model: ${modelName}`, { error: error.message || error });
  }

  logModelPlacement(position) {
    this.event('MODEL_PLACE', 'Model placed', { position });
  }

  logGesture(type, data) {
    this.event('GESTURE', `Gesture: ${type}`, data);
  }

  logNetworkRequest(method, url, status) {
    const level = status >= 400 ? 'error' : 'info';
    this.addLog(level, 'NETWORK', `${method} ${url}`, { status });
  }

  logError(context, error) {
    this.error('ERROR', `Error in ${context}`, {
      message: error.message || error,
      stack: error.stack
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
    return {
      totalLogs: this.logs.length,
      errors: this.logs.filter(l => l.level === 'error').length,
      warnings: this.logs.filter(l => l.level === 'warning').length,
      lastLog: this.logs[this.logs.length - 1] || null
    };
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
