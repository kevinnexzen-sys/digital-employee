import express from 'express';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { createLogger } from '../utils/logger.js';
import config from '../utils/config.js';
import financialBlocker from '../security/financial-blocker.js';

const logger = createLogger('Gateway');

class GatewayServer {
  constructor() {
    this.app = express();
    this.server = createServer(this.app);
    this.wss = new WebSocketServer({ server: this.server });
    this.clients = new Map();
    this.sessions = new Map();
    this.isRunning = false;
    
    this.setupMiddleware();
    this.setupRoutes();
    this.setupWebSocket();
    this.setupFinancialBlocker();
  }

  setupMiddleware() {
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    
    // CORS
    this.app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
      next();
    });
    
    // Request logging
    this.app.use((req, res, next) => {
      logger.info(`${req.method} ${req.path}`);
      next();
    });
  }

  setupRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({ 
        status: 'ok', 
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
      });
    });

    // Status endpoint
    this.app.get('/api/status', (req, res) => {
      res.json({
        status: 'running',
        version: '2.2.0',
        clients: this.clients.size,
        sessions: this.sessions.size,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        config: {
          port: config.port,
          host: config.host,
          nodeEnv: config.nodeEnv
        }
      });
    });

    // Security stats
    this.app.get('/api/security/stats', (req, res) => {
      const stats = financialBlocker.getStatistics();
      res.json(stats);
    });

    // Blocked attempts
    this.app.get('/api/security/blocked', (req, res) => {
      const limit = parseInt(req.query.limit) || 10;
      const attempts = financialBlocker.getBlockedAttempts(limit);
      res.json({ attempts });
    });

    // Send message endpoint
    this.app.post('/api/message', async (req, res) => {
      try {
        const { message, userId } = req.body;
        
        if (!message) {
          return res.status(400).json({ error: 'Message is required' });
        }

        // Broadcast to all connected clients
        this.broadcast({
          type: 'message',
          data: { message, userId, timestamp: new Date().toISOString() }
        });

        res.json({ success: true, message: 'Message sent' });
      } catch (error) {
        logger.error('Error sending message:', error);
        res.status(500).json({ error: error.message });
      }
    });
  }

  setupWebSocket() {
    this.wss.on('connection', (ws, req) => {
      const clientId = this.generateClientId();
      this.clients.set(clientId, ws);
      
      logger.info(`Client connected: ${clientId}`);
      
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(clientId, message);
        } catch (error) {
          logger.error('Error parsing message:', error);
          ws.send(JSON.stringify({ error: 'Invalid message format' }));
        }
      });
      
      ws.on('close', () => {
        this.clients.delete(clientId);
        logger.info(`Client disconnected: ${clientId}`);
      });
      
      ws.on('error', (error) => {
        logger.error(`WebSocket error for client ${clientId}:`, error);
      });
      
      // Send welcome message
      ws.send(JSON.stringify({
        type: 'connected',
        clientId,
        timestamp: new Date().toISOString()
      }));
    });
  }

  setupFinancialBlocker() {
    // Integrate financial blocker with all routes
    this.app.use((req, res, next) => {
      const url = req.url;
      const method = req.method;
      
      if (financialBlocker.shouldBlock(url)) {
        const attempt = {
          url,
          method,
          timestamp: new Date().toISOString(),
          ip: req.ip
        };
        
        financialBlocker.logBlockedAttempt(attempt);
        
        return res.status(403).json({
          error: 'Access Denied',
          message: 'Financial operations are blocked for security',
          blocked: true
        });
      }
      
      next();
    });
  }

  handleMessage(clientId, message) {
    logger.info(`Message from ${clientId}:`, message);
    
    switch (message.type) {
      case 'ping':
        this.sendToClient(clientId, { type: 'pong', timestamp: new Date().toISOString() });
        break;
        
      case 'broadcast':
        this.broadcast({ type: 'message', data: message.data, from: clientId });
        break;
        
      default:
        logger.warn(`Unknown message type: ${message.type}`);
    }
  }

  sendToClient(clientId, data) {
    const client = this.clients.get(clientId);
    if (client && client.readyState === 1) { // OPEN
      client.send(JSON.stringify(data));
    }
  }

  broadcast(data) {
    const message = JSON.stringify(data);
    this.clients.forEach((client) => {
      if (client.readyState === 1) { // OPEN
        client.send(message);
      }
    });
  }

  generateClientId() {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  start() {
    return new Promise((resolve, reject) => {
      if (this.isRunning) {
        logger.warn('Gateway server is already running');
        return resolve();
      }

      const port = config.port || 18789;
      const host = config.host || '127.0.0.1';

      this.server.listen(port, host, (err) => {
        if (err) {
          logger.error('Failed to start gateway server:', err);
          return reject(err);
        }

        this.isRunning = true;
        
        logger.info(`🦞 PersonalClaw Gateway started`);
        logger.info(`   HTTP: http://${host}:${port}`);
        logger.info(`   WebSocket: ws://${host}:${port}`);
        logger.info(`   Environment: ${config.nodeEnv}`);
        logger.info(`   Financial Blocker: ACTIVE (cannot be disabled)`);
        
        resolve();
      });
    });
  }

  stop() {
    return new Promise((resolve) => {
      if (!this.isRunning) {
        return resolve();
      }

      logger.info('Stopping gateway server...');
      
      // Close all WebSocket connections
      this.clients.forEach((client) => {
        client.close();
      });
      this.clients.clear();
      
      // Close HTTP server
      this.server.close(() => {
        this.isRunning = false;
        logger.info('Gateway server stopped');
        resolve();
      });
    });
  }
}

export default GatewayServer;
