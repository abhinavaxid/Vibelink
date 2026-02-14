import express, { Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import dotenv from 'dotenv';

import { initializeDatabase } from './database/init';
import { disconnect } from './database/connection';
import {
  authMiddleware,
  loggingMiddleware,
  rateLimitMiddleware,
} from './middleware';
import { errorHandler } from './utils/errors';
import { setupSocketHandlers } from './socket';

// Load environment variables
dotenv.config();

const app: Express = express();
const PORT = parseInt(process.env.PORT || '5000');
const SOCKET_PORT = parseInt(process.env.SOCKET_PORT || '4000');
const NODE_ENV = process.env.NODE_ENV || 'development';

// Create HTTP servers
const httpServer = http.createServer(app);

// Socket.io CORS config - handle wildcard properly
const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000';
const socketCorsOrigin = corsOrigin === '*' ? '*' : corsOrigin.split(',');

const socketServer = new SocketIOServer(httpServer, {
  cors: {
    origin: socketCorsOrigin,
    methods: ['GET', 'POST'],
    credentials: socketCorsOrigin !== '*',
  },
});

/** ===================== MIDDLEWARE ===================== */

// CORS configuration
const corsOptions = corsOrigin === '*' 
  ? { origin: '*', credentials: false }
  : { origin: corsOrigin.split(','), credentials: true };

// Security middleware
app.use(helmet());
app.use(cors(corsOptions));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Logging
app.use(loggingMiddleware);

// Rate limiting
app.use(rateLimitMiddleware(
  parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
  parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100')
));

/** ===================== HEALTH CHECK ===================== */

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
  });
});

/** ===================== API ROUTES ===================== */

// Import route handlers
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import roomRoutes from './routes/rooms';
import gameRoutes from './routes/games';
import matchRoutes from './routes/matches';

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/matches', matchRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      message: 'Route not found',
      path: req.path,
    },
  });
});

// Global error handler
app.use(errorHandler);

/** ===================== SOCKET.IO SETUP ===================== */

setupSocketHandlers(socketServer);

/** ===================== SERVER STARTUP ===================== */

async function startServer(): Promise<void> {
  try {
    // Initialize database
    console.log('🗄️  Initializing database...');
    await initializeDatabase();

    // Start HTTP server
    httpServer.listen(SOCKET_PORT, '0.0.0.0', () => {
      console.log(`✅ WebSocket server running on http://0.0.0.0:${SOCKET_PORT}`);
    });

    // Start Express server on different port (optional, for REST API)
    const expressApp = express();
    expressApp.use(express.json());
    
    // Health check endpoint
    expressApp.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: NODE_ENV,
      });
    });
    
    expressApp.use('/api/auth', authRoutes);
    expressApp.use('/api/users', userRoutes);
    expressApp.use('/api/rooms', roomRoutes);
    expressApp.use('/api/games', gameRoutes);
    expressApp.use('/api/matches', matchRoutes);
    expressApp.listen(PORT, '0.0.0.0', () => {
      console.log(`✅ REST API server running on http://0.0.0.0:${PORT}`);
    });

    console.log(`
╔═══════════════════════════════════════════════════╗
║         🎉 VibeLink Backend Started! 🎉          ║
║───────────────────────────────────────────────────║
║  Environment: ${NODE_ENV.padEnd(39)} │
║  WebSocket: http://0.0.0.0:${SOCKET_PORT.toString().padEnd(33)} │
║  REST API: http://0.0.0.0:${PORT.toString().padEnd(37)} │
╚═══════════════════════════════════════════════════╝
    `);
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    await disconnect();
    process.exit(1);
  }
}

/** ===================== GRACEFUL SHUTDOWN ===================== */

async function shutdown(signal: string): Promise<void> {
  console.log(`\n🛑 Received ${signal} signal, shutting down gracefully...`);

  httpServer.close(() => {
    console.log('🔌 HTTP server closed');
  });

  try {
    await disconnect();
    console.log('✅ Server shutdown complete');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Start the server
if (require.main === module) {
  startServer();
}

export { app, httpServer, socketServer };
