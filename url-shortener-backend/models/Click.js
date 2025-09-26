const mongoose = require('mongoose');

const clickSchema = new mongoose.Schema({
  shortcode: {
    type: String,
    required: true,
    index: true,
    ref: 'Url'
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  // Request information
  ip: {
    type: String,
    required: true
  },
  userAgent: {
    type: String,
    maxlength: 1000
  },
  referer: {
    type: String,
    maxlength: 1000,
    default: 'Direct'
  },
  // Geographic information
  location: {
    country: String,
    region: String,
    city: String,
    timezone: String,
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  // Device/Browser information
  device: {
    type: {
      type: String, // mobile, desktop, tablet
      enum: ['mobile', 'desktop', 'tablet', 'unknown']
    },
    browser: String,
    os: String,
    isMobile: {
      type: Boolean,
      default: false
    }
  },
  // Campaign tracking (UTM parameters)
  campaign: {
    source: String,      // utm_source
    medium: String,      // utm_medium
    campaign: String,    // utm_campaign
    term: String,        // utm_term
    content: String      // utm_content
  }
}, {
  timestamps: false, // We use our own timestamp field
  collection: 'clicks'
});

// Compound indexes for efficient analytics queries
clickSchema.index({ shortcode: 1, timestamp: -1 });
clickSchema.index({ timestamp: -1 });
clickSchema.index({ 'location.country': 1, timestamp: -1 });
clickSchema.index({ 'device.type': 1, timestamp: -1 });
clickSchema.index({ 'campaign.source': 1, timestamp: -1 });

// Static methods for analytics
clickSchema.statics.getClicksByShortcode = function(shortcode, limit = 100) {
  return this.find({ shortcode })
    .sort({ timestamp: -1 })
    .limit(limit)
    .select('-ip') // Exclude IP for privacy
    .lean();
};

clickSchema.statics.getClicksByDateRange = function(shortcode, startDate, endDate) {
  return this.find({
    shortcode,
    timestamp: {
      $gte: startDate,
      $lte: endDate
    }
  }).sort({ timestamp: -1 }).lean();
};

clickSchema.statics.getLocationStats = function(shortcode) {
  return this.aggregate([
    { $match: { shortcode } },
    {
      $group: {
        _id: {
          country: '$location.country',
          city: '$location.city'
        },
        count: { $sum: 1 },
        lastClick: { $max: '$timestamp' }
      }
    },
    { $sort: { count: -1 } },
    { $limit: 50 }
  ]);
};

clickSchema.statics.getDeviceStats = function(shortcode) {
  return this.aggregate([
    { $match: { shortcode } },
    {
      $group: {
        _id: {
          type: '$device.type',
          browser: '$device.browser',
          os: '$device.os'
        },
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1 } }
  ]);
};

clickSchema.statics.getRefererStats = function(shortcode) {
  return this.aggregate([
    { $match: { shortcode } },
    {
      $group: {
        _id: '$referer',
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1 } },
    { $limit: 20 }
  ]);
};

clickSchema.statics.getTimeSeriesData = function(shortcode, groupBy = 'day') {
  let dateFormat;
  switch (groupBy) {
    case 'hour':
      dateFormat = { $dateToString: { format: "%Y-%m-%d %H:00", date: "$timestamp" } };
      break;
    case 'day':
      dateFormat = { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } };
      break;
    case 'month':
      dateFormat = { $dateToString: { format: "%Y-%m", date: "$timestamp" } };
      break;
    default:
      dateFormat = { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } };
  }

  return this.aggregate([
    { $match: { shortcode } },
    {
      $group: {
        _id: dateFormat,
        count: { $sum: 1 }
      }
    },
    { $sort: { '_id': 1 } }
  ]);
};

module.exports = mongoose.model('Click', clickSchema);