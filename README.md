# 🔗 URL Shortener

A full-stack URL shortener application with analytics, built with React, Node.js, Express, and MongoDB.

## ✨ Features

### 🚀 Core Functionality
- **URL Shortening**: Convert long URLs into short, shareable links
- **Custom Shortcodes**: Create personalized short URLs
- **Expiration Control**: Set custom expiration times (1 minute to 1 year)
- **Click Tracking**: Real-time click analytics and statistics

### 📊 Advanced Analytics
- **Geographic Analytics**: Track clicks by location (country, city)
- **Device Analytics**: Monitor device types, browsers, and operating systems
- **Traffic Sources**: Analyze referrer data and traffic patterns
- **Click History**: Detailed timeline of all clicks with timestamps

### 🎨 Modern UI/UX
- **Beautiful Design**: Modern gradient backgrounds and animations
- **Material-UI Components**: Professional, responsive interface
- **Real-time Updates**: Live statistics and data visualization
- **Smooth Animations**: Fade, slide, and grow transitions
- **Glassmorphism Effects**: Modern blur and transparency effects

### 🛠 Management Features
- **URL Management**: View, delete, and manage all created URLs
- **Expired URL Handling**: Clear expired URLs in bulk
- **Persistent Storage**: All data stored in MongoDB
- **Complete CRUD Operations**: Create, read, update, delete functionality

## 🏗 Technology Stack

### Frontend
- **React 18+**: Modern React with hooks
- **Material-UI**: Component library with theming
- **Axios**: HTTP client for API communication
- **React Router**: Client-side routing

### Backend
- **Node.js**: JavaScript runtime
- **Express.js**: Web application framework
- **MongoDB**: NoSQL database
- **Mongoose**: MongoDB object modeling
- **CORS**: Cross-origin resource sharing
- **Helmet**: Security middleware
- **Rate Limiting**: API protection

### Additional Tools
- **GeoIP**: Location tracking
- **Cron Jobs**: Automated cleanup tasks
- **Custom Logging**: Structured logging system

## 📁 Project Structure

```
URL Shortener/
├── url-shortener-backend/          # Backend API server
│   ├── config/                     # Database configuration
│   ├── models/                     # MongoDB models
│   ├── services/                   # Business logic
│   ├── server.js                   # Main server file
│   ├── package.json               # Backend dependencies
│   └── .env.example               # Environment variables template
├── url-shortener-frontend/         # React frontend
│   ├── src/
│   │   ├── components/            # React components
│   │   │   ├── URLShortener.js    # Main shortener component
│   │   │   └── Statistics.js      # Analytics dashboard
│   │   ├── utils/                 # Utility functions
│   │   │   ├── api.js            # API client
│   │   │   └── logger.js         # Frontend logging
│   │   ├── App.js                # Main app component
│   │   └── index.js              # App entry point
│   ├── public/                   # Static assets
│   └── package.json             # Frontend dependencies
└── README.md                    # This file
```

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local or cloud instance)
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd URL-Shortener
   ```

2. **Set up the backend**
   ```bash
   cd url-shortener-backend
   npm install
   
   # Copy and configure environment variables
   cp .env.example .env
   # Edit .env with your MongoDB connection string
   ```

3. **Set up the frontend**
   ```bash
   cd ../url-shortener-frontend
   npm install
   ```

4. **Start the services**
   
   **Backend (Terminal 1):**
   ```bash
   cd url-shortener-backend
   node server.js
   ```
   
   **Frontend (Terminal 2):**
   ```bash
   cd url-shortener-frontend
   npm start
   ```

5. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8080

## ⚙️ Configuration

### Environment Variables (.env)

```env
# Database
MONGODB_URI=mongodb://localhost:27017/url_shortener

# Server
PORT=8080
BASE_URL=http://localhost:8080
NODE_ENV=development

# Security (optional)
JWT_SECRET=your-jwt-secret
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100
```

## 📚 API Documentation

### Endpoints

#### Create Short URL
```http
POST /shorturls
Content-Type: application/json

{
  "url": "https://example.com",
  "validity": 30,
  "shortcode": "custom123",
  "tags": ["marketing", "campaign"],
  "description": "Marketing campaign link"
}
```

#### Get URL Statistics
```http
GET /shorturls/:shortcode
```

#### Get All URLs
```http
GET /shorturls?includeInactive=true&page=1&limit=50
```

#### Delete URL
```http
DELETE /shorturls/:shortcode
```

#### Redirect to Original URL
```http
GET /:shortcode
```

## 🎯 Features in Detail

### URL Shortening
- Generate random 7-character shortcodes
- Support for custom shortcodes (3-20 characters)
- Duplicate shortcode prevention
- URL validation with protocol requirements

### Analytics System
- **Real-time tracking**: Every click is recorded with timestamp
- **Geographic data**: IP-based location detection
- **Device fingerprinting**: Browser, OS, and device type detection
- **Referrer tracking**: Source website identification
- **Aggregated statistics**: Summary views and detailed breakdowns

### Data Management
- **Automatic cleanup**: Cron job removes expired URLs every 5 minutes
- **Bulk operations**: Clear multiple expired URLs at once
- **Persistent history**: All analytics data preserved even after expiration
- **Database optimization**: Indexed fields for fast queries

## 🛡 Security Features

- Rate limiting (100 requests per 15 minutes)
- Input validation and sanitization
- CORS configuration
- Helmet security headers
- Environment variable protection
- SQL injection prevention with Mongoose

## 🎨 UI/UX Features

- **Responsive Design**: Works on desktop, tablet, and mobile
- **Dark/Light Theme**: Automatic theme detection
- **Loading States**: Smooth loading indicators
- **Error Handling**: User-friendly error messages
- **Animations**: Smooth transitions and micro-interactions
- **Accessibility**: ARIA labels and keyboard navigation

## 🔧 Development

### Adding New Features
1. Backend: Add routes in `server.js`, business logic in `services/`
2. Frontend: Create components in `src/components/`
3. Database: Define models in `models/`

### Testing
```bash
# Backend tests
cd url-shortener-backend
npm test

# Frontend tests
cd url-shortener-frontend
npm test
```

## 📦 Deployment

### Backend Deployment
1. Set production environment variables
2. Use PM2 for process management
3. Set up reverse proxy with Nginx
4. Configure MongoDB Atlas for cloud database

### Frontend Deployment
1. Build the production version: `npm run build`
2. Deploy to Netlify, Vercel, or serve with Express
3. Update API base URL for production

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -am 'Add new feature'`
4. Push to branch: `git push origin feature-name`
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Material-UI for the component library
- MongoDB for the database solution
- React team for the frontend framework
- Express.js for the backend framework

## 📧 Contact

For questions or support, please open an issue on GitHub.

---

