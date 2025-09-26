const Url = require('../models/Url');
const Click = require('../models/Click');
const geoip = require('geoip-lite');

class UrlService {
  // Create a new short URL
  static async createShortUrl(urlData) {
    try {
      const { originalUrl, validity = 30, shortcode, tags = [], description } = urlData;
      
      // Calculate expiry date
      const expiresAt = new Date(Date.now() + validity * 60 * 1000);
      
      // Check if custom shortcode already exists
      if (shortcode) {
        const existingUrl = await Url.findOne({ shortcode, isActive: true });
        if (existingUrl) {
          throw new Error('Custom shortcode already exists');
        }
      }
      
      // Create new URL document
      const urlDoc = new Url({
        originalUrl,
        expiresAt,
        shortcode, // Will auto-generate if not provided
        tags,
        description
      });
      
      await urlDoc.save();
      
      return {
        shortcode: urlDoc.shortcode,
        originalUrl: urlDoc.originalUrl,
        shortLink: `${process.env.BASE_URL || 'http://localhost:8080'}/${urlDoc.shortcode}`,
        expiresAt: urlDoc.expiresAt,
        createdAt: urlDoc.createdAt
      };
      
    } catch (error) {
      throw new Error(`Failed to create short URL: ${error.message}`);
    }
  }
  
  // Get URL by shortcode
  static async getUrlByShortcode(shortcode) {
    try {
      const url = await Url.findOne({ shortcode, isActive: true });
      
      if (!url) {
        return null;
      }
      
      // Check if expired
      if (url.isExpired) {
        // Mark as inactive
        await Url.updateOne({ _id: url._id }, { isActive: false });
        return null;
      }
      
      return url;
      
    } catch (error) {
      throw new Error(`Failed to get URL: ${error.message}`);
    }
  }
  
  // Record a click and return the original URL
  static async recordClick(shortcode, requestData) {
    try {
      const url = await this.getUrlByShortcode(shortcode);
      
      if (!url) {
        return null;
      }
      
      // Parse request data
      const clickData = this.parseRequestData(shortcode, requestData);
      
      // Save click record
      const click = new Click(clickData);
      await click.save();
      
      // Increment click count on URL
      await url.incrementClicks();
      
      return url.originalUrl;
      
    } catch (error) {
      throw new Error(`Failed to record click: ${error.message}`);
    }
  }
  
  // Get URL statistics
  static async getUrlStats(shortcode) {
    try {
      const url = await Url.findOne({ shortcode });
      
      if (!url) {
        return null;
      }
      
      // Get recent clicks (limit to 100 for performance)
      const clicks = await Click.getClicksByShortcode(shortcode, 100);
      
      // Get location stats
      const locationStats = await Click.getLocationStats(shortcode);
      
      // Get device stats
      const deviceStats = await Click.getDeviceStats(shortcode);
      
      // Get referer stats
      const refererStats = await Click.getRefererStats(shortcode);
      
      return {
        originalUrl: url.originalUrl,
        shortcode: url.shortcode,
        createdAt: url.createdAt,
        expiresAt: url.expiresAt,
        isActive: url.isActive,
        isExpired: url.isExpired,
        totalClicks: url.totalClicks,
        lastClickAt: url.lastClickAt,
        tags: url.tags,
        description: url.description,
        analytics: {
          recentClicks: clicks,
          locationStats,
          deviceStats,
          refererStats
        }
      };
      
    } catch (error) {
      throw new Error(`Failed to get URL stats: ${error.message}`);
    }
  }
  
  // Get all URLs with pagination
  static async getAllUrls(options = {}) {
    try {
      const {
        page = 1,
        limit = 50,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        includeInactive = true
      } = options;
      
      const filter = includeInactive ? {} : { isActive: true };
      const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };
      
      const urls = await Url.find(filter)
        .sort(sort)
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .lean();
      
      // Add computed fields
      const baseUrl = process.env.BASE_URL || 'http://localhost:8080';
      const now = new Date();
      
      const urlsWithExtras = urls.map(url => ({
        ...url,
        shortLink: `${baseUrl}/${url.shortcode}`,
        isExpired: now > url.expiresAt,
        timeRemaining: url.expiresAt > now ? url.expiresAt - now : 0
      }));
      
      // Get total count for pagination
      const totalCount = await Url.countDocuments(filter);
      
      return {
        urls: urlsWithExtras,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalCount / limit),
          totalCount,
          hasNextPage: page < Math.ceil(totalCount / limit),
          hasPrevPage: page > 1
        }
      };
      
    } catch (error) {
      throw new Error(`Failed to get URLs: ${error.message}`);
    }
  }
  
  // Cleanup expired URLs
  static async cleanupExpiredUrls() {
    try {
      const result = await Url.cleanupExpired();
      return result.modifiedCount;
    } catch (error) {
      throw new Error(`Failed to cleanup expired URLs: ${error.message}`);
    }
  }
  
  // Parse request data for click tracking
  static parseRequestData(shortcode, requestData) {
    const { ip, userAgent, referer } = requestData;
    
    // Get geographic information
    let location = {};
    if (ip && ip !== '127.0.0.1' && ip !== '::1') {
      const geo = geoip.lookup(ip);
      if (geo) {
        location = {
          country: geo.country,
          region: geo.region,
          city: geo.city,
          timezone: geo.timezone,
          coordinates: {
            latitude: geo.ll ? geo.ll[0] : null,
            longitude: geo.ll ? geo.ll[1] : null
          }
        };
      }
    } else {
      location = {
        country: 'Local',
        city: 'Development'
      };
    }
    
    // Parse device information (basic parsing)
    const device = this.parseUserAgent(userAgent);
    
    return {
      shortcode,
      ip,
      userAgent: userAgent || 'Unknown',
      referer: referer || 'Direct',
      location,
      device
    };
  }
  
  // Basic user agent parsing
  static parseUserAgent(userAgent = '') {
    const ua = userAgent.toLowerCase();
    
    // Detect device type
    let type = 'desktop';
    if (/mobile|android|iphone|ipod|blackberry|iemobile|opera mini/i.test(ua)) {
      type = 'mobile';
    } else if (/tablet|ipad/i.test(ua)) {
      type = 'tablet';
    }
    
    // Detect browser
    let browser = 'Unknown';
    if (ua.includes('chrome')) browser = 'Chrome';
    else if (ua.includes('firefox')) browser = 'Firefox';
    else if (ua.includes('safari')) browser = 'Safari';
    else if (ua.includes('edge')) browser = 'Edge';
    else if (ua.includes('opera')) browser = 'Opera';
    
    // Detect OS
    let os = 'Unknown';
    if (ua.includes('windows')) os = 'Windows';
    else if (ua.includes('mac')) os = 'macOS';
    else if (ua.includes('linux')) os = 'Linux';
    else if (ua.includes('android')) os = 'Android';
    else if (ua.includes('ios') || ua.includes('iphone') || ua.includes('ipad')) os = 'iOS';
    
    return {
      type,
      browser,
      os,
      isMobile: type === 'mobile'
    };
  }

  // Delete URL and associated data
  static async deleteUrl(shortcode) {
    try {
      // First, delete all associated clicks
      await Click.deleteMany({ shortcode });
      
      // Then delete the URL document
      const deleteResult = await Url.deleteOne({ shortcode });
      
      if (deleteResult.deletedCount === 0) {
        return {
          success: false,
          error: 'URL not found or already deleted'
        };
      }
      
      return {
        success: true,
        deletedCount: deleteResult.deletedCount
      };
      
    } catch (error) {
      return {
        success: false,
        error: `Failed to delete URL: ${error.message}`
      };
    }
  }
}

module.exports = UrlService;