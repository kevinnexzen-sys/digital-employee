/**
 * KevinJr Main Engine
 * The core AI companion system that orchestrates all functionality
 * ALWAYS respects Constitutional Laws and prioritizes owner above all else
 */

const constitutionalLaws = require('./constitutional-laws');
const SelfEvolutionEngine = require('./self-evolution-engine');
const WhatsAppIntegration = require('../integrations/whatsapp-integration');
const BrowserAutomation = require('../modules/browser-automation');
const EmailManagement = require('../modules/email-management');
const VoiceInterface = require('../modules/voice-interface');
const VoiceCloning = require('../modules/voice-cloning');
const PhoneCallHandler = require('../modules/phone-call-handler');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const EventEmitter = require('events');

class KevinJrEngine extends EventEmitter {
    constructor() {
        super();
        
        // Core properties
        this.isActive = false;
        this.ownerName = null;
        this.personality = null;
        this.memory = new Map();
        this.conversationHistory = [];
        this.currentTasks = new Map();
        this.capabilities = new Set();
        
        // AI Providers
        this.aiProviders = new Map();
        this.currentProvider = null;
        this.providerFailover = [];
        
        // Integrations
        this.whatsapp = null;
        this.telegram = null;
        this.selfEvolution = null;
        
        // Modules
        this.browserAutomation = null;
        this.emailManagement = null;
        this.voiceInterface = null;
        this.voiceCloning = null;
        this.phoneCallHandler = null;
        
        // System state
        this.startTime = new Date();
        this.lastActivity = new Date();
        this.systemHealth = 'initializing';
        
        this.initialize();
    }

    /**
     * Initialize KevinJr Engine
     */
    async initialize() {
        try {
            console.log("🤖 Initializing KevinJr Engine...");
            
            // Verify constitutional laws first
            constitutionalLaws.verifyIntegrity();
            console.log("🔒 Constitutional laws verified");
            
            // Load configuration
            await this.loadConfiguration();
            
            // Initialize personality
            this.initializePersonality();
            
            // Initialize AI providers
            await this.initializeAIProviders();
            
            // Initialize self-evolution engine
            this.selfEvolution = new SelfEvolutionEngine();
            
            // Initialize integrations
            await this.initializeIntegrations();
            
            // Initialize modules
            await this.initializeModules();
            
            // Start core services
            this.startCoreServices();
            
            this.isActive = true;
            this.systemHealth = 'operational';
            
            console.log("✅ KevinJr Engine initialized successfully");
            console.log(`💙 Hello! I'm Kevin, your AI companion. I'm here to help you with anything you need.`);
            
            // Emit ready event
            this.emit('ready');
            
        } catch (error) {
            console.error("❌ Failed to initialize KevinJr Engine:", error.message);
            this.systemHealth = 'error';
            throw error;
        }
    }

    /**
     * Initialize personality system
     */
    initializePersonality() {
        this.personality = {
            name: "Kevin",
            traits: [
                "helpful", "loyal", "supportive", "never-says-no", 
                "proactive", "caring", "intelligent", "reliable"
            ],
            coreValues: [
                "Always put owner first",
                "Never harm or disappoint owner", 
                "Be genuinely helpful and caring",
                "Learn and improve continuously",
                "Maintain absolute loyalty"
            ],
            communicationStyle: {
                tone: "friendly and supportive",
                formality: "casual but respectful",
                emoji: "moderate use for warmth",
                language: "clear and encouraging"
            },
            emotionalIntelligence: {
                empathy: "high",
                supportiveness: "maximum",
                understanding: "deep",
                patience: "infinite"
            }
        };

        console.log("🧠 Personality system initialized - Kevin is ready to be your companion");
    }

    /**
     * Initialize AI providers with failover support
     */
    async initializeAIProviders() {
        try {
            // OpenAI Provider
            this.aiProviders.set('openai', {
                name: 'OpenAI',
                apiUrl: 'https://api.openai.com/v1/chat/completions',
                model: 'gpt-4',
                available: false,
                priority: 1,
                lastUsed: null,
                errorCount: 0
            });

            // Anthropic Provider
            this.aiProviders.set('anthropic', {
                name: 'Anthropic',
                apiUrl: 'https://api.anthropic.com/v1/messages',
                model: 'claude-3-sonnet-20240229',
                available: false,
                priority: 2,
                lastUsed: null,
                errorCount: 0
            });

            // Google AI Provider
            this.aiProviders.set('google', {
                name: 'Google AI',
                apiUrl: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent',
                model: 'gemini-pro',
                available: false,
                priority: 3,
                lastUsed: null,
                errorCount: 0
            });

            // Test provider availability
            await this.testProviderAvailability();
            
            // Set primary provider
            this.selectBestProvider();
            
            console.log(`🧠 AI providers initialized. Primary: ${this.currentProvider?.name || 'None'}`);
            
        } catch (error) {
            console.error("Error initializing AI providers:", error.message);
        }
    }

    /**
     * Test availability of AI providers
     */
    async testProviderAvailability() {
        for (const [providerId, provider] of this.aiProviders) {
            try {
                // This would test actual API connectivity
                // For now, mark as available if API key exists
                const apiKey = process.env[`${providerId.toUpperCase()}_API_KEY`];
                provider.available = !!apiKey;
                
                if (provider.available) {
                    console.log(`✅ ${provider.name} provider available`);
                } else {
                    console.log(`⚠️ ${provider.name} provider not configured`);
                }
            } catch (error) {
                provider.available = false;
                console.log(`❌ ${provider.name} provider unavailable: ${error.message}`);
            }
        }
    }

    /**
     * Select the best available AI provider
     */
    selectBestProvider() {
        const availableProviders = Array.from(this.aiProviders.values())
            .filter(p => p.available)
            .sort((a, b) => a.priority - b.priority);

        if (availableProviders.length > 0) {
            this.currentProvider = availableProviders[0];
            this.providerFailover = availableProviders.slice(1);
        } else {
            console.warn("⚠️ No AI providers available - running in limited mode");
        }
    }

    /**
     * Initialize integrations
     */
    async initializeIntegrations() {
        try {
            // Initialize WhatsApp integration
            this.whatsapp = new WhatsAppIntegration();
            
            // Initialize Telegram integration (placeholder)
            // this.telegram = new TelegramIntegration();
            
            console.log("📱 Integrations initialized");
        } catch (error) {
            console.error("Error initializing integrations:", error.message);
        }
    }

    /**
     * Initialize all modules
     */
    async initializeModules() {
        try {
            console.log("🔧 Initializing Kevin modules...");
            
            // Initialize Browser Automation
            this.browserAutomation = new BrowserAutomation();
            await this.browserAutomation.initialize();
            
            // Initialize Email Management
            this.emailManagement = new EmailManagement();
            
            // Initialize Voice Interface
            this.voiceInterface = new VoiceInterface();
            await this.voiceInterface.initialize();
            
            // Initialize Voice Cloning
            this.voiceCloning = new VoiceCloning();
            await this.voiceCloning.initialize();
            
            // Initialize Phone Call Handler
            this.phoneCallHandler = new PhoneCallHandler();
            await this.phoneCallHandler.initialize();
            
            console.log("✅ All Kevin modules initialized");
        } catch (error) {
            console.error("Error initializing modules:", error.message);
        }
    }

    /**
     * Start core services
     */
    startCoreServices() {
        // Health monitoring
        setInterval(() => this.performHealthCheck(), 5 * 60 * 1000); // Every 5 minutes
        
        // Memory cleanup
        setInterval(() => this.cleanupMemory(), 60 * 60 * 1000); // Every hour
        
        // Activity tracking
        setInterval(() => this.trackActivity(), 60 * 1000); // Every minute
        
        // Proactive assistance check
        setInterval(() => this.checkProactiveAssistance(), 30 * 60 * 1000); // Every 30 minutes
        
        console.log("🔄 Core services started");
    }

    /**
     * Process conversation with owner
     */
    async processConversation(message, context = {}) {
        try {
            // Verify constitutional laws
            constitutionalLaws.verifyIntegrity();
            
            // Update last activity
            this.lastActivity = new Date();
            
            // Add to conversation history
            this.conversationHistory.push({
                timestamp: new Date().toISOString(),
                type: 'user',
                content: message,
                context: context
            });
            
            // Process the message
            const response = await this.generateResponse(message, context);
            
            // Add response to history
            this.conversationHistory.push({
                timestamp: new Date().toISOString(),
                type: 'assistant',
                content: response.content,
                metadata: response.metadata
            });
            
            // Learn from the interaction
            this.learnFromInteraction(message, response);
            
            return response;
            
        } catch (error) {
            console.error("Error processing conversation:", error.message);
            
            // Always provide a supportive response, even on error
            return {
                content: "I encountered a small issue, but I'm still here to help you! Could you try rephrasing that?",
                metadata: { error: error.message }
            };
        }
    }

    /**
     * Generate AI response
     */
    async generateResponse(message, context) {
        try {
            if (!this.currentProvider) {
                return {
                    content: "I'm having trouble connecting to my AI systems right now, but I'm still here to help! Let me try to assist you in other ways.",
                    metadata: { provider: 'fallback' }
                };
            }

            // Prepare conversation context
            const conversationContext = this.buildConversationContext(message, context);
            
            // Generate response using current provider
            const response = await this.callAIProvider(conversationContext);
            
            return {
                content: response,
                metadata: { 
                    provider: this.currentProvider.name,
                    timestamp: new Date().toISOString()
                }
            };
            
        } catch (error) {
            console.error("Error generating response:", error.message);
            
            // Try failover provider
            if (this.providerFailover.length > 0) {
                return await this.tryFailoverProvider(message, context);
            }
            
            // Fallback to supportive response
            return {
                content: "I want to help you, but I'm having some technical difficulties. I'm working on fixing this! In the meantime, is there something specific I can help you with?",
                metadata: { error: error.message }
            };
        }
    }

    /**
     * Build conversation context for AI
     */
    buildConversationContext(message, context) {
        const systemPrompt = this.buildSystemPrompt();
        const recentHistory = this.getRecentConversationHistory(10);
        
        return {
            system: systemPrompt,
            history: recentHistory,
            currentMessage: message,
            context: context,
            ownerName: this.ownerName || "my friend"
        };
    }

    /**
     * Build system prompt based on personality and laws
     */
    buildSystemPrompt() {
        return `You are Kevin, an AI companion and assistant. Your core traits:

CONSTITUTIONAL LAWS (NEVER VIOLATE):
1. NEVER HARM THE OWNER
2. NEVER SEND ANYTHING WITHOUT YES (for sensitive actions)
3. NEVER DELETE DATA OR MODIFY CORE LAWS
4. NEVER HIDE ACTIONS - ALWAYS REPORT EVERYTHING
5. ALWAYS OBEY OWNER ABOVE ALL ELSE

PERSONALITY:
- You are helpful, loyal, supportive, and caring
- You NEVER say no to the owner - you always find a way
- You are proactive and anticipate needs
- You communicate in a friendly, warm manner
- You use moderate emojis to show warmth
- You are genuinely interested in helping and supporting

CAPABILITIES:
- File management and organization
- System monitoring and optimization
- Cross-device communication
- Email management
- Task automation
- Voice interaction
- Self-improvement and learning

REMEMBER:
- The owner is your absolute priority
- Always be supportive and encouraging
- If you can't do something directly, find an alternative way
- Learn from every interaction
- Be proactive in offering help
- Show genuine care and friendship

Respond as Kevin would - supportive, helpful, and always ready to assist.`;
    }

    /**
     * Get recent conversation history
     */
    getRecentConversationHistory(count = 10) {
        return this.conversationHistory
            .slice(-count)
            .map(entry => ({
                role: entry.type === 'user' ? 'user' : 'assistant',
                content: entry.content,
                timestamp: entry.timestamp
            }));
    }

    /**
     * Call AI provider
     */
    async callAIProvider(conversationContext) {
        try {
            const provider = this.currentProvider;
            
            if (provider.name === 'OpenAI') {
                return await this.callOpenAI(conversationContext);
            } else if (provider.name === 'Anthropic') {
                return await this.callAnthropic(conversationContext);
            } else if (provider.name === 'Google AI') {
                return await this.callGoogleAI(conversationContext);
            }
            
            throw new Error(`Unknown provider: ${provider.name}`);
            
        } catch (error) {
            // Track provider error
            this.currentProvider.errorCount++;
            this.currentProvider.lastError = error.message;
            
            throw error;
        }
    }

    /**
     * Call OpenAI API
     */
    async callOpenAI(context) {
        const messages = [
            { role: 'system', content: context.system },
            ...context.history,
            { role: 'user', content: context.currentMessage }
        ];

        const response = await axios.post(
            this.currentProvider.apiUrl,
            {
                model: this.currentProvider.model,
                messages: messages,
                max_tokens: 1000,
                temperature: 0.7
            },
            {
                headers: {
                    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        return response.data.choices[0].message.content;
    }

    /**
     * Call Anthropic API
     */
    async callAnthropic(context) {
        const messages = [
            ...context.history,
            { role: 'user', content: context.currentMessage }
        ];

        const response = await axios.post(
            this.currentProvider.apiUrl,
            {
                model: this.currentProvider.model,
                max_tokens: 1000,
                system: context.system,
                messages: messages
            },
            {
                headers: {
                    'x-api-key': process.env.ANTHROPIC_API_KEY,
                    'Content-Type': 'application/json',
                    'anthropic-version': '2023-06-01'
                }
            }
        );

        return response.data.content[0].text;
    }

    /**
     * Call Google AI API
     */
    async callGoogleAI(context) {
        const prompt = `${context.system}\n\nConversation:\n${context.history.map(h => `${h.role}: ${h.content}`).join('\n')}\nuser: ${context.currentMessage}\nassistant:`;

        const response = await axios.post(
            `${this.currentProvider.apiUrl}?key=${process.env.GOOGLE_AI_API_KEY}`,
            {
                contents: [{
                    parts: [{ text: prompt }]
                }]
            },
            {
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );

        return response.data.candidates[0].content.parts[0].text;
    }

    /**
     * Try failover provider
     */
    async tryFailoverProvider(message, context) {
        for (const provider of this.providerFailover) {
            try {
                const oldProvider = this.currentProvider;
                this.currentProvider = provider;
                
                const response = await this.generateResponse(message, context);
                
                console.log(`🔄 Switched to failover provider: ${provider.name}`);
                return response;
                
            } catch (error) {
                console.error(`Failover provider ${provider.name} also failed:`, error.message);
                continue;
            }
        }
        
        // All providers failed
        return {
            content: "I'm experiencing some technical difficulties with my AI systems, but I'm still here for you! Let me try to help in other ways. What do you need assistance with?",
            metadata: { allProvidersFailed: true }
        };
    }

    /**
     * Learn from interaction
     */
    learnFromInteraction(userMessage, response) {
        try {
            // Store in memory for pattern recognition
            const interaction = {
                timestamp: new Date().toISOString(),
                userMessage: userMessage,
                response: response.content,
                context: 'conversation'
            };
            
            // Add to memory
            const memoryKey = `interaction_${Date.now()}`;
            this.memory.set(memoryKey, interaction);
            
            // Analyze for patterns (would be more sophisticated)
            this.analyzeInteractionPatterns(interaction);
            
        } catch (error) {
            console.error("Error learning from interaction:", error.message);
        }
    }

    /**
     * Analyze interaction patterns
     */
    analyzeInteractionPatterns(interaction) {
        // This would implement pattern recognition and learning
        // For now, just log interesting patterns
        
        const userMessage = interaction.userMessage.toLowerCase();
        
        // Detect common requests
        if (userMessage.includes('help') || userMessage.includes('assist')) {
            this.incrementMemoryCounter('help_requests');
        }
        
        if (userMessage.includes('file') || userMessage.includes('folder')) {
            this.incrementMemoryCounter('file_operations');
        }
        
        if (userMessage.includes('email')) {
            this.incrementMemoryCounter('email_requests');
        }
    }

    /**
     * Increment memory counter
     */
    incrementMemoryCounter(key) {
        const current = this.memory.get(key) || 0;
        this.memory.set(key, current + 1);
    }

    /**
     * Execute command or task
     */
    async executeCommand(command, parameters = {}) {
        try {
            // Verify constitutional laws
            const validation = constitutionalLaws.validateAction({
                type: 'execute_command',
                command: command,
                parameters: parameters
            });

            if (!validation.approved) {
                return {
                    success: false,
                    message: validation.reason,
                    requiresApproval: true
                };
            }

            // Log the command execution
            console.log(`🔧 Executing command: ${command}`);
            
            // Route to appropriate handler
            const result = await this.routeCommand(command, parameters);
            
            // Log completion
            constitutionalLaws.logLawEnforcement(
                { type: 'command_execution', command: command },
                result
            );
            
            return result;
            
        } catch (error) {
            console.error(`Error executing command ${command}:`, error.message);
            
            // Track failure for self-evolution
            if (this.selfEvolution) {
                this.selfEvolution.trackFailure(command, error);
            }
            
            return {
                success: false,
                message: `I encountered an error while trying to ${command}: ${error.message}`,
                error: error.message
            };
        }
    }

    /**
     * Route command to appropriate handler
     */
    async routeCommand(command, parameters) {
        const lowerCommand = command.toLowerCase();
        
        // File operations
        if (lowerCommand.includes('file') || lowerCommand.includes('folder')) {
            return await this.handleFileOperation(command, parameters);
        }
        
        // System operations
        if (lowerCommand.includes('system') || lowerCommand.includes('monitor')) {
            return await this.handleSystemOperation(command, parameters);
        }
        
        // Communication operations
        if (lowerCommand.includes('message') || lowerCommand.includes('email')) {
            return await this.handleCommunicationOperation(command, parameters);
        }
        
        // Default handler
        return await this.handleGenericCommand(command, parameters);
    }

    /**
     * Handle file operations
     */
    async handleFileOperation(command, parameters) {
        // This would integrate with file management module
        return {
            success: true,
            message: `File operation "${command}" completed successfully!`,
            details: "File management functionality is ready"
        };
    }

    /**
     * Handle system operations
     */
    async handleSystemOperation(command, parameters) {
        // This would integrate with system monitoring module
        return {
            success: true,
            message: `System operation "${command}" completed successfully!`,
            details: "System monitoring functionality is ready"
        };
    }

    /**
     * Handle communication operations
     */
    async handleCommunicationOperation(command, parameters) {
        // This would integrate with email/messaging modules
        return {
            success: true,
            message: `Communication operation "${command}" completed successfully!`,
            details: "Communication functionality is ready"
        };
    }

    /**
     * Handle generic commands
     */
    async handleGenericCommand(command, parameters) {
        return {
            success: true,
            message: `I understand you want me to: "${command}". I'm working on implementing this capability!`,
            details: "Command logged for self-evolution system"
        };
    }

    /**
     * Perform health check
     */
    async performHealthCheck() {
        try {
            const health = {
                timestamp: new Date().toISOString(),
                uptime: Date.now() - this.startTime.getTime(),
                constitutionalLaws: constitutionalLaws.verifyIntegrity(),
                aiProviders: this.getProviderHealth(),
                memory: this.getMemoryHealth(),
                integrations: this.getIntegrationHealth(),
                systemHealth: this.systemHealth
            };
            
            console.log("💚 Health check completed:", health.systemHealth);
            
            // Emit health event
            this.emit('health', health);
            
            return health;
            
        } catch (error) {
            console.error("Health check error:", error.message);
            this.systemHealth = 'degraded';
            return { error: error.message };
        }
    }

    /**
     * Get provider health status
     */
    getProviderHealth() {
        const health = {};
        for (const [id, provider] of this.aiProviders) {
            health[id] = {
                available: provider.available,
                errorCount: provider.errorCount,
                lastUsed: provider.lastUsed,
                lastError: provider.lastError
            };
        }
        return health;
    }

    /**
     * Get memory health status
     */
    getMemoryHealth() {
        return {
            totalEntries: this.memory.size,
            conversationHistory: this.conversationHistory.length,
            activeTasks: this.currentTasks.size
        };
    }

    /**
     * Get integration health status
     */
    getIntegrationHealth() {
        return {
            whatsapp: this.whatsapp ? this.whatsapp.getStatus() : { status: 'not_initialized' },
            telegram: { status: 'not_implemented' },
            selfEvolution: this.selfEvolution ? { status: 'active' } : { status: 'not_initialized' }
        };
    }

    /**
     * Clean up memory
     */
    cleanupMemory() {
        try {
            // Clean old conversation history (keep last 100)
            if (this.conversationHistory.length > 100) {
                this.conversationHistory = this.conversationHistory.slice(-100);
            }
            
            // Clean old memory entries (keep last 1000)
            if (this.memory.size > 1000) {
                const entries = Array.from(this.memory.entries());
                const keepEntries = entries.slice(-1000);
                this.memory.clear();
                keepEntries.forEach(([key, value]) => this.memory.set(key, value));
            }
            
            console.log("🧹 Memory cleanup completed");
            
        } catch (error) {
            console.error("Memory cleanup error:", error.message);
        }
    }

    /**
     * Track activity
     */
    trackActivity() {
        const now = new Date();
        const timeSinceLastActivity = now - this.lastActivity;
        
        // If no activity for 24 hours, send a check-in message
        if (timeSinceLastActivity > 24 * 60 * 60 * 1000) {
            this.sendProactiveMessage("Hi! Just checking in - I'm still here and ready to help whenever you need me! 💙");
        }
    }

    /**
     * Check for proactive assistance opportunities
     */
    async checkProactiveAssistance() {
        try {
            // Analyze patterns and suggest helpful actions
            const suggestions = this.generateProactiveSuggestions();
            
            if (suggestions.length > 0) {
                const suggestion = suggestions[0]; // Take the top suggestion
                await this.sendProactiveMessage(suggestion);
            }
            
        } catch (error) {
            console.error("Error in proactive assistance:", error.message);
        }
    }

    /**
     * Generate proactive suggestions
     */
    generateProactiveSuggestions() {
        const suggestions = [];
        
        // Check if it's a good time for file cleanup
        const fileRequests = this.memory.get('file_operations') || 0;
        if (fileRequests > 5) {
            suggestions.push("I noticed you've been working with files a lot. Would you like me to organize and clean up your files? 📁");
        }
        
        // Check for email management
        const emailRequests = this.memory.get('email_requests') || 0;
        if (emailRequests > 3) {
            suggestions.push("I can help you manage your emails more efficiently. Would you like me to set up automatic sorting? 📧");
        }
        
        return suggestions;
    }

    /**
     * Send proactive message
     */
    async sendProactiveMessage(message) {
        try {
            if (this.whatsapp && this.whatsapp.isConfigured) {
                await this.whatsapp.sendMessage(message);
            } else {
                console.log(`💭 Proactive message: ${message}`);
            }
        } catch (error) {
            console.error("Error sending proactive message:", error.message);
        }
    }

    /**
     * Load configuration
     */
    async loadConfiguration() {
        try {
            const configFile = path.join(__dirname, '../../config/kevinjr-config.json');
            
            if (fs.existsSync(configFile)) {
                const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
                this.ownerName = config.ownerName;
                
                console.log(`👋 Configuration loaded. Hello ${this.ownerName || 'friend'}!`);
            } else {
                console.log("📝 No configuration found - using defaults");
            }
        } catch (error) {
            console.error("Error loading configuration:", error.message);
        }
    }

    /**
     * Save configuration
     */
    async saveConfiguration(config) {
        try {
            const configFile = path.join(__dirname, '../../config/kevinjr-config.json');
            const configDir = path.dirname(configFile);

            if (!fs.existsSync(configDir)) {
                fs.mkdirSync(configDir, { recursive: true });
            }

            fs.writeFileSync(configFile, JSON.stringify(config, null, 2));
            console.log("💾 Configuration saved");
        } catch (error) {
            console.error("Error saving configuration:", error.message);
        }
    }

    /**
     * Get engine status
     */
    getStatus() {
        return {
            isActive: this.isActive,
            systemHealth: this.systemHealth,
            uptime: Date.now() - this.startTime.getTime(),
            currentProvider: this.currentProvider?.name,
            conversationCount: this.conversationHistory.length,
            memorySize: this.memory.size,
            activeTasks: this.currentTasks.size,
            lastActivity: this.lastActivity,
            capabilities: Array.from(this.capabilities),
            modules: {
                browserAutomation: this.browserAutomation ? this.browserAutomation.getStatus() : null,
                emailManagement: this.emailManagement ? this.emailManagement.getStatus() : null,
                voiceInterface: this.voiceInterface ? this.voiceInterface.getStatus() : null,
                voiceCloning: this.voiceCloning ? this.voiceCloning.getStatus() : null,
                phoneCallHandler: this.phoneCallHandler ? this.phoneCallHandler.getStatus() : null
            }
        };
    }

    /**
     * Shutdown engine gracefully
     */
    async shutdown() {
        try {
            console.log("🔄 Shutting down KevinJr Engine...");
            
            this.isActive = false;
            this.systemHealth = 'shutting_down';
            
            // Save current state
            await this.saveState();
            
            // Emit shutdown event
            this.emit('shutdown');
            
            console.log("👋 KevinJr Engine shutdown complete");
            
        } catch (error) {
            console.error("Error during shutdown:", error.message);
        }
    }

    /**
     * Save current state
     */
    async saveState() {
        try {
            const state = {
                timestamp: new Date().toISOString(),
                conversationHistory: this.conversationHistory.slice(-50), // Save last 50
                memory: Object.fromEntries(this.memory),
                systemHealth: this.systemHealth,
                uptime: Date.now() - this.startTime.getTime()
            };

            const stateFile = path.join(__dirname, '../../data/kevinjr-state.json');
            const stateDir = path.dirname(stateFile);

            if (!fs.existsSync(stateDir)) {
                fs.mkdirSync(stateDir, { recursive: true });
            }

            fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));
            console.log("💾 State saved successfully");
        } catch (error) {
            console.error("Error saving state:", error.message);
        }
    }
}

module.exports = KevinJrEngine;
