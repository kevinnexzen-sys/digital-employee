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
        version: '1.0.0',
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

    // 404 handler
    this.app.use((req, res) => {
      res.status(404).json({ error: 'Not found' });
    });
  }

  setupWebSocket() {
    this.wss.on('connection', (ws, req) => {
      const clientId = this.generateClientId();
      this.clients.set(clientId, ws);
      
      logger.info(`Client connected: ${clientId}`);
      logger.info(`Total clients: ${this.clients.size}`);

      // Send welcome message
      ws.send(JSON.stringify({
        type: 'welcome',
        data: {
          clientId,
          message: 'Connected to PersonalClaw Gateway',
          timestamp: new Date().toISOString()
        }
      }));

      // Handle messages
      ws.on('message', async (data) => {
        try {
          const message = JSON.parse(data.toString());
          await this.handleMessage(clientId, message, ws);
        } catch (error) {
          logger.error(`Error handling message from ${clientId}:`, error);
          ws.send(JSON.stringify({
            type: 'error',
            data: { error: error.message }
          }));
        }
      });

      // Handle disconnect
      ws.on('close', () => {
        this.clients.delete(clientId);
        logger.info(`Client disconnected: ${clientId}`);
        logger.info(`Total clients: ${this.clients.size}`);
      });

      // Handle errors
      ws.on('error', (error) => {
        logger.error(`WebSocket error for ${clientId}:`, error);
      });
    });
  }

  async handleMessage(clientId, message, ws) {
    const { type, data } = message;

    logger.info(`Message from ${clientId}: ${type}`);

    switch (type) {
      case 'ping':
        ws.send(JSON.stringify({ type: 'pong', data: { timestamp: new Date().toISOString() } }));
        break;

      case 'chat':
        // Handle chat message
        await this.handleChatMessage(clientId, data, ws);
        break;

      case 'command':
        // Handle command
        await this.handleCommand(clientId, data, ws);
        break;

      case 'status':
        // Send status
        ws.send(JSON.stringify({
          type: 'status',
          data: {
            clients: this.clients.size,
            sessions: this.sessions.size,
            uptime: process.uptime()
          }
        }));
        break;

      default:
        ws.send(JSON.stringify({
          type: 'error',
          data: { error: `Unknown message type: ${type}` }
        }));
    }
  }

  async handleChatMessage(clientId, data, ws) {
    const { message } = data;
    
    logger.info(`Chat message from ${clientId}: ${message}`);

    // Echo back for now (will integrate with LLM later)
    ws.send(JSON.stringify({
      type: 'chat_response',
      data: {
        message: `Received: ${message}`,
        timestamp: new Date().toISOString()
      }
    }));
  }

  async handleCommand(clientId, data, ws) {
    const { command, params } = data;
    
    logger.info(`Command from ${clientId}: ${command}`);

    // Handle commands
    switch (command) {
      case 'get_stats':
        const stats = financialBlocker.getStatistics();
        ws.send(JSON.stringify({
          type: 'command_response',
          data: { command, result: stats }
        }));
        break;

      default:
        ws.send(JSON.stringify({
          type: 'command_response',
          data: { command, error: 'Unknown command' }
        }));
    }
  }

  setupFinancialBlocker() {
    // Register alert callback
    financialBlocker.onBlocked((attempt) => {
      logger.warn('Financial access blocked:', attempt);
      
      // Broadcast to all clients
      this.broadcast({
        type: 'security_alert',
        data: {
          alert: 'Financial access blocked',
          attempt,
          timestamp: new Date().toISOString()
        }
      });
    });
  }

  broadcast(message) {
    const data = JSON.stringify(message);
    this.clients.forEach((ws) => {
      if (ws.readyState === 1) { // OPEN
        ws.send(data);
      }
    });
  }

  generateClientId() {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  start() {
    this.server.listen(config.port, config.host, () => {
      logger.info(`🦞 PersonalClaw Gateway started`);
      logger.info(`   HTTP: http://${config.host}:${config.port}`);
      logger.info(`   WebSocket: ws://${config.host}:${config.port}`);
      logger.info(`   Environment: ${config.nodeEnv}`);
      logger.info(`   Financial Blocker: ACTIVE (cannot be disabled)`);
    });
  }

  stop() {
    logger.info('Shutting down gateway...');
    this.wss.close();
    this.server.close();
  }
}

// Create and start server
const gateway = new GatewayServer();
gateway.start();

// Handle shutdown
process.on('SIGINT', () => {
  logger.info('Received SIGINT, shutting down gracefully...');
  gateway.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down gracefully...');
  gateway.stop();
  process.exit(0);
});

export default GatewayServer;
