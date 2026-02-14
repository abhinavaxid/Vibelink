# VibeLink Backend

Production-ready backend API and WebSocket server for VibeLink - Reality Show for Real Connections.

## 📋 Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Setup](#setup)
- [Configuration](#configuration)
- [Running](#running)
- [API Documentation](#api-documentation)
- [Socket.io Events](#socketio-events)
- [Testing](#testing)
- [Deployment](#deployment)

---

## 🎯 Overview

The VibeLink backend provides:

- **RESTful API** for user management, authentication, and game data
- **Real-time WebSocket** for live game sessions, messaging, and match updates
- **PostgreSQL Database** with comprehensive schema for users, games, matches, and analytics
- **Authentication** with JWT tokens and password hashing
- **Error handling** and input validation
- **Comprehensive testing** with Jest

---

## 🏗️ Tech Stack

- **Node.js** (v18+)
- **TypeScript** for type safety
- **Express** for REST API
- **Socket.io** for real-time communication
- **PostgreSQL** for data storage
- **Jest** for testing
- **Bcryptjs** for password hashing
- **JWT** for authentication

---

## 📁 Project Structure

```
backend/
├── src/
│   ├── __tests__/           # Test files
│   │   ├── setup.ts
│   │   ├── auth.test.ts
│   │   └── games.test.ts
│   ├── database/
│   │   ├── connection.ts    # PostgreSQL connection pooling
│   │   └── init.ts          # Schema initialization
│   ├── middleware/
│   │   └── index.ts         # Auth, logging, CORS, rate limiting
│   ├── repositories/        # Database access layer
│   │   ├── UserRepository.ts
│   │   └── GameSessionRepository.ts
│   ├── routes/              # API endpoints
│   │   ├── auth.ts
│   │   ├── users.ts
│   │   ├── rooms.ts
│   │   ├── games.ts
│   │   └── matches.ts
│   ├── socket/
│   │   └── index.ts         # Socket.io handlers
│   ├── types/
│   │   └── models.ts        # TypeScript interfaces
│   ├── utils/
│   │   ├── auth.ts          # JWT & password utilities
│   │   └── errors.ts        # Error handling
│   └── index.ts             # Server entry point
├── package.json
├── tsconfig.json
├── jest.config.js
├── .env.example             # Environment variables template
└── README.md
```

---

## 🚀 Setup

### Prerequisites

- Node.js 18+ installed
- PostgreSQL 12+ running
- npm or yarn package manager

### Installation

1. **Clone repository**
```bash
cd backend
```

2. **Install dependencies**
```bash
npm install
```

3. **Setup environment variables**
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```env
NODE_ENV=development
PORT=5000
DATABASE_URL=postgresql://user:password@localhost:5432/vibelink

JWT_SECRET=your_secret_key_here
```

4. **Create PostgreSQL database**
```bash
psql -U postgres
CREATE DATABASE vibelink_db;
```

5. **Initialize schema**
```bash
npm run build
npm run migrate
```

---

## ⚙️ Configuration

### Environment Variables

```env
# Server
NODE_ENV=development|production
PORT=5000
HOST=localhost

# Database
DATABASE_URL=postgresql://user:password@host:5432/db
DB_HOST=localhost
DB_PORT=5432
DB_USER=vibelink
DB_PASSWORD=password
DB_NAME=vibelink_db

# Authentication
JWT_SECRET=super_secret_key_change_in_production
JWT_EXPIRY=7d
REFRESH_TOKEN_SECRET=refresh_secret_key
REFRESH_TOKEN_EXPIRY=30d

# WebSocket
SOCKET_PORT=4000
SOCKET_URL=http://localhost:4000

# CORS
CORS_ORIGIN=http://localhost:3000,http://localhost:3001

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=debug|info|warn|error
```

---

## ▶️ Running

### Development

```bash
npm run dev
```

Starts both TypeScript compiler in watch mode and the server.

Access:
- REST API: http://localhost:5000
- WebSocket: http://localhost:4000
- Health: http://localhost:5000/health

### Production

```bash
npm run build
npm start
```

### Database Migrations

```bash
npm run migrate       # Run migrations
npm run seed         # Seed sample data (if available)
```

---

## 📚 API Documentation

### Authentication Routes

#### Register
```
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "username": "myusername",
  "password": "SecurePassword123!",
  "avatar": "👤"
}

Response: 201 Created
{
  "success": true,
  "data": {
    "user": { "id", "email", "username", "avatar" },
    "token": "jwt_token",
    "refreshToken": "refresh_token",
    "expiresIn": 604800
  }
}
```

#### Login
```
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}

Response: 200 OK
{
  "success": true,
  "data": {
    "user": { ... },
    "token": "jwt_token",
    "refreshToken": "refresh_token",
    "expiresIn": 604800
  }
}
```

#### Get Current User
```
GET /api/auth/me
Authorization: Bearer {jwt_token}

Response: 200 OK
{
  "success": true,
  "data": {
    "user": { "id", "username", "avatar", "bio", "profile" }
  }
}
```

#### Refresh Token
```
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "refresh_token"
}

Response: 200 OK
{
  "success": true,
  "data": {
    "token": "new_jwt_token",
    "expiresIn": 604800
  }
}
```

### User Routes

#### List Users
```
GET /api/users?page=1&pageSize=20&sortBy=created_at&sortOrder=desc
```

#### Get User Profile
```
GET /api/users/{userId}
```

#### Update Profile
```
PATCH /api/users/{userId}
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "bio": "Updated bio",
  "avatar": "👽",
  "communication_style": "direct",
  "energy_level": "high"
}
```

#### Search Users
```
GET /api/users/search?q=username
```

### Room Routes

#### List Rooms
```
GET /api/rooms?type=friendship
```

#### Get Room Details
```
GET /api/rooms/{roomId}
```

#### Get Active Sessions
```
GET /api/rooms/{roomId}/sessions
```

### Game Routes

#### Create Session
```
POST /api/games/session
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "roomId": "room-uuid",
  "participantIds": ["user-id1", "user-id2", ...]
}
```

#### Get Session
```
GET /api/games/session/{sessionId}
```

#### Get Leaderboard
```
GET /api/games/session/{sessionId}/leaderboard
```

#### Submit Response
```
POST /api/games/session/{sessionId}/response
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "roundNumber": 1,
  "roundType": "questions",
  "responseText": "My answer here"
}
```

### Match Routes

#### Get Session Matches
```
GET /api/matches/session/{sessionId}
```

#### Get User Matches
```
GET /api/matches/user/{userId}?limit=10
```

#### Get Global Leaderboard
```
GET /api/matches/leaderboard?limit=100&leaderboard_type=all_time
```

---

## 🔌 Socket.io Events

### Client → Server Events

#### Join Session
```javascript
socket.emit('join-session', { sessionId: 'uuid' }, (response) => {
  // response: { success: bool, data?: {...}, error?: string }
});
```

#### Start Game
```javascript
socket.emit('start-game', { sessionId: 'uuid' }, (response) => {});
```

#### Submit Response
```javascript
socket.emit('submit-response', {
  sessionId: 'uuid',
  roundNumber: 1,
  roundType: 'questions',
  responseText: 'My answer'
}, (response) => {});
```

#### Send Message
```javascript
socket.emit('send-message', {
  sessionId: 'uuid',
  message: 'Hello!',
  roundType: 'general'
}, (response) => {});
```

#### Vote on Meme
```javascript
socket.emit('vote-meme', {
  sessionId: 'uuid',
  memeId: 'uuid',
  reactionType: 'funny'
}, (response) => {});
```

#### Audience Vote
```javascript
socket.emit('audience-vote', {
  sessionId: 'uuid',
  category: 'best_communicator',
  nomineeId: 'user-uuid'
}, (response) => {});
```

### Server → Client Events

#### User Joined
```javascript
socket.on('user-joined', {
  userId: 'uuid',
  username: 'name'
});
```

#### Game Started
```javascript
socket.on('game-started', {
  session: {...},
  timestamp: Date
});
```

#### Response Submitted
```javascript
socket.on('response-submitted', {
  userId: 'uuid',
  username: 'name',
  roundNumber: 1
});
```

#### New Message
```javascript
socket.on('new-message', {
  id: 'uuid',
  sender: { id, username },
  message: 'text',
  roundType: 'type',
  timestamp: Date
});
```

#### Round Changed
```javascript
socket.on('round-changed', {
  round: 1,
  gameState: 'questions',
  timestamp: Date
});
```

#### Game Finished
```javascript
socket.on('game-finished', {
  timestamp: Date
});
```

---

## ✅ Testing

### Run All Tests
```bash
npm test
```

### Run Tests in Watch Mode
```bash
npm run test:watch
```

### Generate Coverage Report
```bash
npm run test:coverage
```

### Test Structure

Tests are organized by feature:
- `auth.test.ts` - Authentication and user management
- `games.test.ts` - Game sessions and leaderboards

Each test file includes:
- Setup/teardown with database initialization
- Unit tests for repositories
- Integration tests for API endpoints
- Error handling tests

---

## 🚢 Deployment

### Production Checklist

- [ ] Update `.env` with production values
- [ ] Set `NODE_ENV=production`
- [ ] Use strong JWT secrets (generate with `openssl rand -hex 32`)
- [ ] Enable HTTPS/TLS
- [ ] Setup database backups
- [ ] Configure rate limiting appropriately
- [ ] Enable access logging
- [ ] Setup error monitoring (e.g., Sentry)
- [ ] Configure health checks
- [ ] Setup auto-scaling if using cloud platform

### Docker Deployment

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY dist/ ./dist/

EXPOSE 5000 4000

CMD ["node", "dist/index.js"]
```

Build: `docker build -t vibelink-backend .`
Run: `docker run -p 5000:5000 -p 4000:4000 vibelink-backend`

### Deployment Platforms

#### Heroku
```bash
heroku create vibelink-backend
heroku addons:create heroku-postgresql:standard-0
git push heroku main
```

#### Railway
```bash
railway init
railway up
```

#### DigitalOcean App Platform
1. Connect GitHub repository
2. Set environment variables
3. Deploy

---

## 🐛 Troubleshooting

### Database Connection Issues
```
Error: connect ECONNREFUSED
```
- Check PostgreSQL is running: `psql -U postgres`
- Verify connection string in `.env`
- Check firewall rules

### JWT Token Errors
```
Error: Invalid token
```
- Ensure JWT_SECRET is set in `.env`
- Verify token hasn't expired
- Check Authorization header format: `Bearer {token}`

### Socket.io Connection Failed
```
Error: Connection refused
```
- Verify WebSocket server is running on SOCKET_PORT
- Check CORS configuration
- Verify client-side token is valid

---

## 📞 Support

For issues or questions:
1. Check error logs: `npm run dev` with `LOG_LEVEL=debug`
2. Review test output: `npm test`
3. Check database: `psql vibelink_db \dt`
4. Enable debug mode: `DEBUG=* npm run dev`

---

## 📄 License

MIT

---

## 🎉 Next Steps

1. **Locally test**: `npm run dev`
2. **Run tests**: `npm test`
3. **Deploy**: Push to production using your platform
4. **Monitor**: Setup logging and error tracking
5. **Scale**: Add caching layer (Redis) for high traffic

