// Custom logging utility (as per requirements)
export const logger = {
  info: (message, data = {}) => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'INFO',
      message,
      data,
      source: 'frontend'
    };
    
    // In a real application, this would send logs to a logging service
    // For development, we'll use a structured approach instead of console.log
    if (process.env.NODE_ENV === 'development') {
      // Using a structured logging approach
      window.postMessage({
        type: 'LOG',
        payload: logEntry
      }, '*');
    }
    
    // Store in session storage for debugging (optional)
    try {
      const logs = JSON.parse(sessionStorage.getItem('app-logs') || '[]');
      logs.push(logEntry);
      // Keep only last 100 logs
      if (logs.length > 100) {
        logs.splice(0, logs.length - 100);
      }
      sessionStorage.setItem('app-logs', JSON.stringify(logs));
    } catch (e) {
      // Ignore storage errors
    }
  },

  error: (message, error = {}) => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      message,
      error: error.message || error,
      stack: error.stack,
      source: 'frontend'
    };
    
    if (process.env.NODE_ENV === 'development') {
      window.postMessage({
        type: 'LOG',
        payload: logEntry
      }, '*');
    }
    
    try {
      const logs = JSON.parse(sessionStorage.getItem('app-logs') || '[]');
      logs.push(logEntry);
      if (logs.length > 100) {
        logs.splice(0, logs.length - 100);
      }
      sessionStorage.setItem('app-logs', JSON.stringify(logs));
    } catch (e) {
      // Ignore storage errors
    }
  },

  warn: (message, data = {}) => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'WARN',
      message,
      data,
      source: 'frontend'
    };
    
    if (process.env.NODE_ENV === 'development') {
      window.postMessage({
        type: 'LOG',
        payload: logEntry
      }, '*');
    }
    
    try {
      const logs = JSON.parse(sessionStorage.getItem('app-logs') || '[]');
      logs.push(logEntry);
      if (logs.length > 100) {
        logs.splice(0, logs.length - 100);
      }
      sessionStorage.setItem('app-logs', JSON.stringify(logs));
    } catch (e) {
      // Ignore storage errors
    }
  }
};