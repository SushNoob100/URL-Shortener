const mongoose = require('mongoose');

const urlSchema = new mongoose.Schema({
  shortcode: {
    type: String,
    required: true,
    unique: true,
    index: true,
    trim: true,
    minlength: 3,
    maxlength: 20
  },
  originalUrl: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        const urlPattern = /^https?:\/\/.+/;
        return urlPattern.test(v);
      },
      message: 'Invalid URL format'
    }
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  createdBy: {
    type: String,
    default: 'anonymous'
  },
  // Embedded analytics for quick access
  totalClicks: {
    type: Number,
    default: 0,
    min: 0
  },
  lastClickAt: {
    type: Date
  },
  // Metadata
  tags: [{
    type: String,
    trim: true
  }],
  description: {
    type: String,
    maxlength: 500
  }
}, {
  timestamps: true,
  collection: 'urls'
});

// Compound indexes for efficient queries
urlSchema.index({ createdAt: -1, isActive: 1 });
urlSchema.index({ expiresAt: 1, isActive: 1 });
urlSchema.index({ totalClicks: -1 });

// Virtual for checking if URL is expired
urlSchema.virtual('isExpired').get(function() {
  return new Date() > this.expiresAt;
});

// Virtual for time remaining
urlSchema.virtual('timeRemaining').get(function() {
  const now = new Date();
  const remaining = this.expiresAt - now;
  return remaining > 0 ? remaining : 0;
});

// Instance method to increment click count
urlSchema.methods.incrementClicks = function() {
  this.totalClicks += 1;
  this.lastClickAt = new Date();
  return this.save();
};

// Static method to find active URLs
urlSchema.statics.findActive = function() {
  return this.find({ 
    isActive: true, 
    expiresAt: { $gt: new Date() } 
  });
};

// Static method to cleanup expired URLs
urlSchema.statics.cleanupExpired = function() {
  return this.updateMany(
    { expiresAt: { $lt: new Date() } },
    { $set: { isActive: false } }
  );
};

// Pre-save middleware to ensure shortcode uniqueness
urlSchema.pre('save', async function(next) {
  if (this.isNew && !this.shortcode) {
    // Auto-generate shortcode if not provided
    let shortcode;
    let exists = true;
    
    while (exists) {
      shortcode = generateRandomShortcode();
      exists = await this.constructor.exists({ shortcode });
    }
    
    this.shortcode = shortcode;
  }
  next();
});

// Helper function for generating random shortcodes
function generateRandomShortcode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 7; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

module.exports = mongoose.model('Url', urlSchema);