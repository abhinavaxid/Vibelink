# VibeLink Backend - Quick Start Guide

Get the VibeLink backend running in 5 minutes.

## 🚀 Quick Start (Docker)

```bash
# From the backend directory
cd backend

# Start everything with Docker Compose
docker-compose up -d

# Wait for services to initialize (~30 seconds)
sleep 30

# Check health
curl http://localhost:5000/health
```

That's it! Services running:
- **REST API**: http://localhost:5000
- **WebSocket**: http://localhost:4000
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

---

## 🚀 Quick Start (Local)

### Prerequisites
- Node.js 18+
- PostgreSQL 12+
- npm

### Setup

```bash
# 1. Install dependencies
npm install

# 2. Create .env file
cp .env.example .env

# 3. Update .env with your database credentials
# Edit DATABASE_URL, JWT_SECRET, etc.

# 4. Create database
createdb vibelink_db

# 5. Run migrations
npm run migrate

# 6. Start development server
npm run dev
```

Server running at:
- **REST API**: http://localhost:5000
- **WebSocket**: http://localhost:4000

---

## 📝 Common Commands

```bash
# Development
npm run dev                 # Start dev server with hot reload
npm run build              # Compile TypeScript

# Testing
npm test                   # Run all tests
npm run test:watch       # Watch mode
npm run test:coverage    # Coverage report

# Database
npm run migrate           # Initialize schema
npm run seed              # Add sample data

# Production
npm run build             # Build for production
npm start                 # Start production server

# Linting
npm run lint              # Check TypeScript
npm run format            # Auto-format code
```

---

## 🔐 Authentication

### Register User

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "username": "myusername",
    "password": "SecurePassword123!",
    "avatar": "👤"
  }'
```

Response:
```json
{
  "success": true,
  "data": {
    "user": { "id": "...", "username": "myusername" },
    "token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
    "refreshToken": "...",
    "expiresIn": 604800
  }
}
```

### Login

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123!"
  }'
```

### Use Token

```bash
curl -H "Authorization: Bearer {token}" \
  http://localhost:5000/api/auth/me
```

---

## 🎮 Game API Example

### Create Game Session

```bash
curl -X POST http://localhost:5000/api/games/session \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "roomId": "room-uuid-here",
    "participantIds": ["user-id-1", "user-id-2", "user-id-3"]
  }'
```

### Get Leaderboard

```bash
curl http://localhost:5000/api/games/session/{sessionId}/leaderboard
```

### Submit Round Response

```bash
curl -X POST http://localhost:5000/api/games/session/{sessionId}/response \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "roundNumber": 1,
    "roundType": "questions",
    "responseText": "My answer to the question"
  }'
```

---

## 🔌 WebSocket Example

### JavaScript Client

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:4000', {
  auth: {
    token: 'your-jwt-token'
  }
});

// Join session
socket.emit('join-session', { sessionId: 'uuid' }, (res) => {
  console.log('Joined:', res);
});

// Listen for events
socket.on('game-started', (data) => {
  console.log('Game started!', data);
});

socket.on('new-message', (msg) => {
  console.log('New message:', msg);
});

// Send message
socket.emit('send-message', {
  sessionId: 'uuid',
  message: 'Hello everyone!',
  roundType: 'general'
});
```

---

## 📊 Testing

### Run All Tests

```bash
npm test
```

### Test Specific Feature

```bash
npm test -- auth.test.ts
npm test -- games.test.ts
```

### Watch Tests

```bash
npm run test:watch
```

---

## 🐛 Debugging

### Enable Debug Logs

```bash
LOG_LEVEL=debug npm run dev
```

### Database Debugging

```bash
# Connect to PostgreSQL
psql postgresql://vibelink:password@localhost:5432/vibelink_db

# List tables
\dt

# Query users
SELECT * FROM users;

# Query game sessions
SELECT * FROM game_sessions;
```

### WebSocket Debugging

```javascript
// In browser console
localStorage.debug = 'socket.io-client:*';
```

---

## 📚 API Documentation

Full API docs available at:
- [README.md](./README.md) - Complete API reference
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Production deployment

---

## 🚀 Next Steps

1. **Test locally**: `npm run dev`
2. **Run tests**: `npm test`
3. **Connect frontend**: Update frontend API URL to `http://localhost:5000`
4. **Check database**: `npm run migrate`
5. **Deploy**: Follow [DEPLOYMENT.md](./DEPLOYMENT.md)

---

## 💡 Tips

- **Hot reload**: Changes to `src/` automatically reload in dev mode
- **Database resets**: `docker-compose down -v` to clear all data
- **View logs**: `docker-compose logs -f backend`
- **Error help**: Run with `LOG_LEVEL=debug`
- **Tests failing**: Delete node_modules and reinstall: `rm -rf node_modules && npm install`

---

## ⚠️ Common Issues

### "Cannot find module '@/...'"
- Make sure TypeScript is compiled: `npm run build`
- Check tsconfig.json paths

### "Database connection refused"
- Check PostgreSQL is running: `psql -U postgres`
- Review .env DATABASE_URL

### "Port already in use"
- Kill process: `lsof -i :5000 | kill -9 <PID>`
- Or use different port: `PORT=5001 npm run dev`

### "WebSocket not connecting"
- Check token is valid
- Verify CORS_ORIGIN in .env
- Check firewall isn't blocking port 4000

---

## 📞 Need Help?

Check these in order:
1. This guide
2. README.md - Full documentation
3. Test files - See examples: `src/__tests__/`
4. Database schema: DATABASE_SCHEMA.md
5. Deployment: DEPLOYMENT.md

---

🎉 **You're all set! Start building!**
