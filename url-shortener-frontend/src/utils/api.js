import axios from 'axios';
import { logger } from './logger';

const API_BASE_URL = 'http://localhost:8080';

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for logging
apiClient.interceptors.request.use(
  (config) => {
    logger.info('API Request', {
      method: config.method?.toUpperCase(),
      url: config.url,
      data: config.data
    });
    return config;
  },
  (error) => {
    logger.error('API Request Error', error);
    return Promise.reject(error);
  }
);

// Response interceptor for logging
apiClient.interceptors.response.use(
  (response) => {
    logger.info('API Response', {
      status: response.status,
      url: response.config.url,
      data: response.data
    });
    return response;
  },
  (error) => {
    const errorDetails = {
      status: error.response?.status,
      statusText: error.response?.statusText,
      url: error.config?.url,
      message: error.response?.data?.error || error.message,
      code: error.response?.data?.code
    };
    
    logger.error('API Response Error', errorDetails);
    return Promise.reject(error);
  }
);

// API service methods
export const api = {
  // Create short URL
  createShortUrl: async (urlData) => {
    try {
      const response = await apiClient.post('/shorturls', urlData);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to create short URL',
        code: error.response?.data?.code || 'UNKNOWN_ERROR'
      };
    }
  },

  // Get URL statistics
  getUrlStats: async (shortcode) => {
    try {
      const response = await apiClient.get(`/shorturls/${shortcode}`);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to fetch statistics',
        code: error.response?.data?.code || 'UNKNOWN_ERROR'
      };
    }
  },

  // Get all URLs
  getAllUrls: async () => {
    try {
      const response = await apiClient.get('/shorturls?includeInactive=true');
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to fetch URLs',
        code: error.response?.data?.code || 'UNKNOWN_ERROR'
      };
    }
  },

  // Delete URL
  deleteUrl: async (shortcode) => {
    try {
      const response = await apiClient.delete(`/shorturls/${shortcode}`);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to delete URL',
        code: error.response?.data?.code || 'UNKNOWN_ERROR'
      };
    }
  },

  // Health check
  healthCheck: async () => {
    try {
      const response = await apiClient.get('/health');
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Health check failed'
      };
    }
  }
};