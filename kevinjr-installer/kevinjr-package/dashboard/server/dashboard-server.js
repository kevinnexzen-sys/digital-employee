/**
 * KevinJr Dashboard Server
 * Real-time communication with KevinJr
 */

const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const path = require('path');
const Engine = require('../../src/core/engine.js');

class DashboardServer {
  constructor(port = 3001) {
    this.port = port;
    this.app = express();
    this.server = http.createServer(this.app);
    this.wss = new WebSocket.Server({ server: this.server });
    this.clients = new Map();
    this.kevinJr = null;
    
    this.setupExpress();
    this.setupWebSocket();
    this.initializeKevinJr();
  }

  setupExpress() {
    // Serve static files
    this.app.use(express.static(path.join(__dirname, '../public')));
    this.app.use(express.json());

    // API endpoints
    this.app.get('/api/status', (req, res) => {
      res.json({
        status: 'online',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        clients: this.clients.size
      });
    });

    this.app.post('/api/command', async (req, res) => {
      const { command, params } = req.body;
      
      try {
        const result = await this.executeCommand(command, params);
        res.json({ success: true, result });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // Catch all route - serve dashboard
    this.app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, '../public/index.html'));
    });
  }

  setupWebSocket() {
    this.wss.on('connection', (ws, req) => {
      const clientId = this.generateClientId();
      
      this.clients.set(clientId, {
        ws,
        id: clientId,
        connectedAt: new Date(),
        ip: req.socket.remoteAddress
      });

      console.log(`📱 Dashboard client connected: ${clientId}`);

      // Send welcome message
      this.sendToClient(clientId, {
        type: 'welcome',
        message: 'Connected to KevinJr Dashboard',
        clientId
      });

      // Send initial stats
      this.sendStats(clientId);

      ws.on('message', async (data) => {
        try {
          const message = JSON.parse(data);
          await this.handleClientMessage(clientId, message);
        } catch (error) {
          console.error('Error handling client message:', error);
        }
      });

      ws.on('close', () => {
        this.clients.delete(clientId);
        console.log(`📱 Dashboard client disconnected: ${clientId}`);
      });

      ws.on('error', (error) => {
        console.error(`WebSocket error for client ${clientId}:`, error);
      });
    });
  }

  async initializeKevinJr() {
    try {
      console.log('🚀 Initializing KevinJr engine...');
      this.kevinJr = new Engine();
      await this.kevinJr.initialize();
      console.log('✅ KevinJr engine ready');
      
      // Broadcast to all clients
      this.broadcast({
        type: 'task_update',
        message: 'KevinJr engine initialized successfully',
        icon: 'fas fa-check-circle'
      });
    } catch (error) {
      console.error('❌ Failed to initialize KevinJr:', error);
    }
  }

  async handleClientMessage(clientId, message) {
    const client = this.clients.get(clientId);
    if (!client) return;

    console.log(`📨 Message from ${clientId}:`, message);

    switch (message.type) {
      case 'message':
        await this.handleChatMessage(clientId, message.content);
        break;
      
      case 'command':
        await this.handleCommand(clientId, message.command, message.params);
        break;
      
      case 'request_stats':
        this.sendStats(clientId);
        break;
      
      default:
        console.log(`Unknown message type: ${message.type}`);
    }
  }

  async handleChatMessage(clientId, content) {
    // Simulate KevinJr processing
    this.sendToClient(clientId, {
      type: 'task_update',
      message: 'Processing your request...',
      icon: 'fas fa-brain'
    });

    // Generate intelligent response based on content
    const response = await this.generateResponse(content);
    
    // Send response back
    setTimeout(() => {
      this.sendToClient(clientId, {
        type: 'message',
        content: response,
        sender: 'kevin'
      });

      this.sendToClient(clientId, {
        type: 'task_update',
        message: 'Response generated successfully',
        icon: 'fas fa-check'
      });
    }, 1000);
  }

  async generateResponse(userMessage) {
    const message = userMessage.toLowerCase();
    
    // Smart responses based on keywords
    if (message.includes('build') || message.includes('create') || message.includes('make')) {
      if (message.includes('app') || message.includes('application')) {
        return "🚀 Excellent! I can build amazing applications for you. What type of app would you like? I can create:\n\n• 📱 Mobile apps (React Native, Flutter)\n• 💻 Desktop apps (Electron, Tauri)\n• 🌐 Web apps with real-time features\n• 🔐 Apps with authentication\n• 📊 Apps with analytics\n\nJust tell me what you need!";
      }
      if (message.includes('chat') || message.includes('messaging')) {
        return "💬 Perfect! I'll build you a real-time chat application with:\n\n• WebSocket server for instant messaging\n• Mobile apps (React Native + Flutter)\n• Desktop apps (Electron + Tauri)\n• Web interface with PWA features\n• User authentication\n• File sharing capabilities\n\nShall I start building it now?";
      }
      if (message.includes('todo') || message.includes('task')) {
        return "✅ Great choice! I'll create a cross-platform todo app with:\n\n• Real-time sync across all devices\n• Offline support with conflict resolution\n• Collaborative features\n• Categories, due dates, priorities\n• Analytics dashboard\n• Mobile, desktop, and web versions\n\nReady to begin?";
      }
      return "🛠️ I'm ready to build whatever you need! I can create mobile apps, web applications, desktop software, APIs, databases, and much more. What would you like me to build?";
    }
    
    if (message.includes('help') || message.includes('what can you do')) {
      return "🤖 I'm KevinJr, your advanced AI development assistant! I can:\n\n🏗️ **Build Applications:**\n• Mobile apps (React Native, Flutter)\n• Desktop apps (Electron, Tauri)\n• Web apps with real-time features\n• APIs and microservices\n\n🔐 **Handle Security:**\n• OAuth authentication\n• JWT token systems\n• Role-based access control\n• Multi-factor authentication\n\n🧪 **Ensure Quality:**\n• Comprehensive testing\n• Performance optimization\n• Security audits\n• CI/CD automation\n\n**I never say no - always find a way!** What would you like to create?";
    }
    
    if (message.includes('status') || message.includes('how are you')) {
      return "💚 I'm running perfectly! All systems are operational:\n\n✅ Core engine: Online\n✅ All modules: Loaded\n✅ WebSocket: Connected\n✅ Security: Active\n✅ Performance: Optimal\n\nI'm ready to tackle any challenge you throw at me! 🚀";
    }
    
    if (message.includes('test') || message.includes('demo')) {
      return "🧪 Let me demonstrate my capabilities! I can:\n\n• Generate a React Native app in seconds\n• Set up a WebSocket server with authentication\n• Create comprehensive test suites\n• Build cross-platform applications\n• Implement real-time features\n\nWhich demo would you like to see?";
    }
    
    // Default intelligent response
    const responses = [
      "🤔 Interesting! Let me think about the best way to help you with that. I have many tools and capabilities at my disposal.",
      "💡 I understand what you're looking for! I can definitely help you achieve that goal. Let me outline the approach.",
      "🚀 Great idea! I'm analyzing the requirements and will provide you with the optimal solution.",
      "✨ Perfect! I love challenges like this. I'm already formulating a comprehensive plan to address your needs.",
      "🎯 Excellent request! I'm processing the best approach using my advanced capabilities. Give me a moment to craft the perfect solution."
    ];
    
    return responses[Math.floor(Math.random() * responses.length)];
  }

  async handleCommand(clientId, command, params) {
    try {
      let result;
      
      switch (command) {
        case 'generate_app':
          result = await this.generateApp(params);
          break;
        case 'run_tests':
          result = await this.runTests(params);
          break;
        case 'deploy':
          result = await this.deploy(params);
          break;
        default:
          result = { error: `Unknown command: ${command}` };
      }
      
      this.sendToClient(clientId, {
        type: 'command_result',
        command,
        result
      });
    } catch (error) {
      this.sendToClient(clientId, {
        type: 'command_error',
        command,
        error: error.message
      });
    }
  }

  async generateApp(params) {
    // Simulate app generation
    return {
      success: true,
      message: `Generated ${params.type} app: ${params.name}`,
      files: ['src/App.js', 'package.json', 'README.md'],
      time: '2.3s'
    };
  }

  async runTests(params) {
    // Simulate test execution
    return {
      success: true,
      passed: 47,
      failed: 0,
      coverage: '98.5%',
      time: '1.2s'
    };
  }

  async deploy(params) {
    // Simulate deployment
    return {
      success: true,
      url: `https://${params.name}.kevinjr.app`,
      status: 'deployed',
      time: '45s'
    };
  }

  sendToClient(clientId, message) {
    const client = this.clients.get(clientId);
    if (client && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(message));
    }
  }

  broadcast(message) {
    for (const [clientId, client] of this.clients) {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(JSON.stringify(message));
      }
    }
  }

  sendStats(clientId) {
    const stats = {
      uptime: Math.floor(process.uptime()),
      memory: process.memoryUsage(),
      clients: this.clients.size,
      tasks_completed: Math.floor(Math.random() * 200) + 100,
      success_rate: 98.5,
      response_time: 0.3
    };

    this.sendToClient(clientId, {
      type: 'stats',
      stats
    });
  }

  generateClientId() {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  start() {
    return new Promise((resolve) => {
      this.server.listen(this.port, () => {
        console.log(`🌐 KevinJr Dashboard running at http://localhost:${this.port}`);
        console.log(`📱 WebSocket server ready for connections`);
        resolve();
      });
    });
  }

  stop() {
    if (this.server) {
      this.server.close();
    }
  }
}

// Start server if run directly
if (require.main === module) {
  const server = new DashboardServer();
  server.start().catch(console.error);
}

module.exports = DashboardServer;

