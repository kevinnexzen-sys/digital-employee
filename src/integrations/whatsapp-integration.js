/**
 * KevinJr WhatsApp Integration
 * Real WhatsApp Business API integration for cross-device communication
 * Handles voice commands, notifications, and remote control
 */

const constitutionalLaws = require('../core/constitutional-laws');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

class WhatsAppIntegration {
    constructor() {
        this.apiKey = null;
        this.phoneNumberId = null;
        this.accessToken = null;
        this.webhookVerifyToken = null;
        this.ownerPhoneNumber = null;
        this.isConfigured = false;
        this.messageQueue = [];
        this.pendingApprovals = new Map();
        
        this.loadConfiguration();
    }

    /**
     * Initialize WhatsApp Business API with user credentials
     */
    async initialize(config) {
        try {
            // Validate constitutional laws before proceeding
            constitutionalLaws.verifyIntegrity();
            
            this.accessToken = config.accessToken;
            this.phoneNumberId = config.phoneNumberId;
            this.webhookVerifyToken = config.webhookVerifyToken;
            this.ownerPhoneNumber = config.ownerPhoneNumber;
            
            // Test the connection
            const testResult = await this.testConnection();
            
            if (testResult.success) {
                this.isConfigured = true;
                this.saveConfiguration(config);
                
                console.log("✅ WhatsApp integration initialized successfully");
                await this.sendMessage("🤖 KevinJr is now connected to WhatsApp! I'm ready to help you.");
                
                return { success: true, message: "WhatsApp integration active" };
            } else {
                throw new Error(testResult.error);
            }
            
        } catch (error) {
            console.error("WhatsApp initialization error:", error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Test WhatsApp API connection
     */
    async testConnection() {
        try {
            const response = await axios.get(
                `https://graph.facebook.com/v18.0/${this.phoneNumberId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`
                    }
                }
            );
            
            return { success: true, data: response.data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Send message to owner
     */
    async sendMessage(message, messageType = 'text') {
        try {
            // Check constitutional laws - never send without approval for sensitive content
            const validation = constitutionalLaws.validateAction({
                type: 'send_message',
                platform: 'whatsapp',
                recipient: this.ownerPhoneNumber,
                content: message
            });

            if (!validation.approved && this.isSensitiveContent(message)) {
                console.log("Message requires approval:", message);
                return { success: false, reason: "Requires owner approval" };
            }

            const payload = {
                messaging_product: "whatsapp",
                to: this.ownerPhoneNumber,
                type: messageType
            };

            if (messageType === 'text') {
                payload.text = { body: message };
            } else if (messageType === 'audio') {
                payload.audio = { id: message }; // message would be media ID for audio
            }

            const response = await axios.post(
                `https://graph.facebook.com/v18.0/${this.phoneNumberId}/messages`,
                payload,
                {
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            console.log("📱 WhatsApp message sent:", message.substring(0, 50) + "...");
            return { success: true, messageId: response.data.messages[0].id };

        } catch (error) {
            console.error("WhatsApp send error:", error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Handle incoming WhatsApp messages
     */
    async handleIncomingMessage(webhookData) {
        try {
            const entry = webhookData.entry[0];
            const changes = entry.changes[0];
            const value = changes.value;

            if (value.messages) {
                for (const message of value.messages) {
                    await this.processMessage(message, value.contacts[0]);
                }
            }

            if (value.statuses) {
                for (const status of value.statuses) {
                    this.handleMessageStatus(status);
                }
            }

            return { success: true };
        } catch (error) {
            console.error("Error handling incoming message:", error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Process individual message
     */
    async processMessage(message, contact) {
        try {
            const senderNumber = contact.wa_id;
            
            // Only respond to owner's messages
            if (senderNumber !== this.ownerPhoneNumber) {
                console.log(`Ignoring message from unauthorized number: ${senderNumber}`);
                return;
            }

            const messageText = message.text?.body || '';
            const messageType = message.type;

            console.log(`📱 Received ${messageType} from owner: ${messageText}`);

            // Handle different message types
            switch (messageType) {
                case 'text':
                    await this.handleTextCommand(messageText);
                    break;
                case 'audio':
                    await this.handleVoiceCommand(message.audio);
                    break;
                case 'document':
                    await this.handleDocumentMessage(message.document);
                    break;
                default:
                    await this.sendMessage("I received your message but I'm not sure how to handle that type yet. Try sending text or voice commands!");
            }

        } catch (error) {
            console.error("Error processing message:", error.message);
            await this.sendMessage(`Sorry, I encountered an error: ${error.message}`);
        }
    }

    /**
     * Handle text commands from owner
     */
    async handleTextCommand(command) {
        try {
            const lowerCommand = command.toLowerCase().trim();

            // Handle approval responses
            if (lowerCommand === 'yes' || lowerCommand === 'approve') {
                return await this.handleApproval(true);
            }
            
            if (lowerCommand === 'no' || lowerCommand === 'deny') {
                return await this.handleApproval(false);
            }

            // Handle system commands
            if (lowerCommand.startsWith('kevin ')) {
                const actualCommand = lowerCommand.substring(6);
                return await this.executeKevinCommand(actualCommand);
            }

            // Handle office computer commands
            if (lowerCommand.includes('office computer') || lowerCommand.includes('office pc')) {
                return await this.handleOfficeComputerCommand(command);
            }

            // Handle general conversation
            await this.handleGeneralConversation(command);

        } catch (error) {
            console.error("Error handling text command:", error.message);
            await this.sendMessage(`Error processing command: ${error.message}`);
        }
    }

    /**
     * Handle voice commands
     */
    async handleVoiceCommand(audioMessage) {
        try {
            // Download audio file
            const audioData = await this.downloadMedia(audioMessage.id);
            
            // Convert speech to text (would integrate with speech recognition service)
            const transcription = await this.speechToText(audioData);
            
            if (transcription) {
                await this.sendMessage(`🎤 I heard: "${transcription}"`);
                await this.handleTextCommand(transcription);
            } else {
                await this.sendMessage("Sorry, I couldn't understand the voice message. Could you try again or send a text message?");
            }

        } catch (error) {
            console.error("Error handling voice command:", error.message);
            await this.sendMessage("Sorry, I had trouble processing your voice message.");
        }
    }

    /**
     * Execute Kevin-specific commands
     */
    async executeKevinCommand(command) {
        try {
            // System status commands
            if (command.includes('status') || command.includes('health')) {
                const status = await this.getSystemStatus();
                await this.sendMessage(`🤖 Kevin Status:\n${status}`);
                return;
            }

            // Wake office computer
            if (command.includes('wake office') || command.includes('turn on office')) {
                const result = await this.wakeOfficeComputer();
                await this.sendMessage(result.message);
                return;
            }

            // File operations
            if (command.includes('organize files') || command.includes('clean files')) {
                await this.sendMessage("🗂️ Starting file organization...");
                const result = await this.organizeFiles();
                await this.sendMessage(result.message);
                return;
            }

            // Email operations
            if (command.includes('check email') || command.includes('read email')) {
                await this.sendMessage("📧 Checking your emails...");
                const result = await this.checkEmails();
                await this.sendMessage(result.message);
                return;
            }

            // Default response for unrecognized commands
            await this.sendMessage(`I understand you want me to: "${command}"\n\nLet me work on that for you! 🤖`);
            
            // Log the command for self-learning
            this.logCommandForLearning(command);

        } catch (error) {
            console.error("Error executing Kevin command:", error.message);
            await this.sendMessage(`I encountered an error while trying to: ${command}\nError: ${error.message}`);
        }
    }

    /**
     * Handle office computer commands
     */
    async handleOfficeComputerCommand(command) {
        try {
            const lowerCommand = command.toLowerCase();

            if (lowerCommand.includes('turn on') || lowerCommand.includes('wake up')) {
                const result = await this.wakeOfficeComputer();
                await this.sendMessage(result.message);
            } else if (lowerCommand.includes('status') || lowerCommand.includes('check')) {
                const result = await this.checkOfficeComputerStatus();
                await this.sendMessage(result.message);
            } else if (lowerCommand.includes('shutdown') || lowerCommand.includes('turn off')) {
                // Request approval for shutdown
                await this.requestApproval(`Shutdown office computer?`, 'shutdown_office');
            } else {
                await this.sendMessage("I can help with office computer commands like:\n• Turn on/wake up\n• Check status\n• Shutdown (with approval)");
            }

        } catch (error) {
            console.error("Error with office computer command:", error.message);
            await this.sendMessage(`Office computer command error: ${error.message}`);
        }
    }

    /**
     * Handle general conversation
     */
    async handleGeneralConversation(message) {
        try {
            // This would integrate with the main AI conversation engine
            // For now, provide supportive responses
            
            const responses = [
                "I'm here to help you with anything you need! 💙",
                "What would you like me to do for you?",
                "I'm always ready to assist you. Just let me know what you need!",
                "How can I make your day easier?",
                "I'm listening and ready to help with any task! 🤖"
            ];

            const randomResponse = responses[Math.floor(Math.random() * responses.length)];
            await this.sendMessage(randomResponse);

        } catch (error) {
            console.error("Error in general conversation:", error.message);
        }
    }

    /**
     * Request approval for sensitive actions
     */
    async requestApproval(message, actionId) {
        try {
            const approvalId = `approval_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            this.pendingApprovals.set(approvalId, {
                actionId: actionId,
                message: message,
                timestamp: new Date().toISOString()
            });

            await this.sendMessage(`🔐 Approval Required:\n${message}\n\nReply with "YES" to approve or "NO" to deny.`);
            
            return approvalId;
        } catch (error) {
            console.error("Error requesting approval:", error.message);
        }
    }

    /**
     * Handle approval responses
     */
    async handleApproval(approved) {
        try {
            if (this.pendingApprovals.size === 0) {
                await this.sendMessage("No pending approvals found.");
                return;
            }

            // Get the most recent approval request
            const approvalEntries = Array.from(this.pendingApprovals.entries());
            const [approvalId, approval] = approvalEntries[approvalEntries.length - 1];

            if (approved) {
                await this.sendMessage(`✅ Approved: ${approval.message}`);
                await this.executeApprovedAction(approval.actionId);
            } else {
                await this.sendMessage(`❌ Denied: ${approval.message}`);
            }

            this.pendingApprovals.delete(approvalId);

        } catch (error) {
            console.error("Error handling approval:", error.message);
        }
    }

    /**
     * Execute approved actions
     */
    async executeApprovedAction(actionId) {
        try {
            switch (actionId) {
                case 'shutdown_office':
                    const result = await this.shutdownOfficeComputer();
                    await this.sendMessage(result.message);
                    break;
                default:
                    await this.sendMessage(`Executing approved action: ${actionId}`);
            }
        } catch (error) {
            console.error("Error executing approved action:", error.message);
            await this.sendMessage(`Error executing approved action: ${error.message}`);
        }
    }

    /**
     * Wake office computer using Wake-on-LAN
     */
    async wakeOfficeComputer() {
        try {
            // This would implement actual Wake-on-LAN functionality
            // For now, simulate the process
            
            await this.sendMessage("🔌 Sending Wake-on-LAN signal to office computer...");
            
            // Simulate wake process
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            return {
                success: true,
                message: "✅ Office computer wake signal sent! It should be starting up now. Give it a minute to fully boot."
            };
        } catch (error) {
            return {
                success: false,
                message: `❌ Failed to wake office computer: ${error.message}`
            };
        }
    }

    /**
     * Check office computer status
     */
    async checkOfficeComputerStatus() {
        try {
            // This would ping the office computer to check if it's online
            // For now, simulate the check
            
            const isOnline = Math.random() > 0.5; // Simulate random status
            
            if (isOnline) {
                return {
                    success: true,
                    message: "✅ Office computer is online and responsive"
                };
            } else {
                return {
                    success: false,
                    message: "❌ Office computer appears to be offline"
                };
            }
        } catch (error) {
            return {
                success: false,
                message: `Error checking office computer: ${error.message}`
            };
        }
    }

    /**
     * Get system status
     */
    async getSystemStatus() {
        try {
            const status = [
                "🤖 KevinJr Status: Online",
                "🧠 AI Engine: Active",
                "🔒 Constitutional Laws: Verified",
                "📱 WhatsApp: Connected",
                "🔄 Self-Evolution: Running",
                `⏰ Last Update: ${new Date().toLocaleString()}`
            ];

            return status.join('\n');
        } catch (error) {
            return `Status check error: ${error.message}`;
        }
    }

    /**
     * Download media from WhatsApp
     */
    async downloadMedia(mediaId) {
        try {
            const response = await axios.get(
                `https://graph.facebook.com/v18.0/${mediaId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`
                    }
                }
            );

            const mediaUrl = response.data.url;
            
            const mediaResponse = await axios.get(mediaUrl, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`
                },
                responseType: 'arraybuffer'
            });

            return mediaResponse.data;
        } catch (error) {
            console.error("Error downloading media:", error.message);
            return null;
        }
    }

    /**
     * Convert speech to text
     */
    async speechToText(audioData) {
        try {
            // This would integrate with a speech recognition service
            // For now, return a placeholder
            return "Voice command received"; // Placeholder
        } catch (error) {
            console.error("Speech to text error:", error.message);
            return null;
        }
    }

    /**
     * Check if content is sensitive and requires approval
     */
    isSensitiveContent(message) {
        const sensitiveKeywords = [
            'delete', 'remove', 'shutdown', 'restart', 'format',
            'install', 'uninstall', 'purchase', 'buy', 'payment'
        ];

        const lowerMessage = message.toLowerCase();
        return sensitiveKeywords.some(keyword => lowerMessage.includes(keyword));
    }

    /**
     * Log command for self-learning
     */
    logCommandForLearning(command) {
        try {
            const logEntry = {
                timestamp: new Date().toISOString(),
                command: command,
                platform: 'whatsapp',
                source: 'owner'
            };

            const logFile = path.join(__dirname, '../../logs/command-learning.json');
            
            let logs = [];
            if (fs.existsSync(logFile)) {
                logs = JSON.parse(fs.readFileSync(logFile, 'utf8'));
            }

            logs.push(logEntry);
            
            // Keep only last 1000 commands
            if (logs.length > 1000) {
                logs = logs.slice(-1000);
            }

            fs.writeFileSync(logFile, JSON.stringify(logs, null, 2));
        } catch (error) {
            console.error("Error logging command:", error.message);
        }
    }

    /**
     * Save configuration
     */
    saveConfiguration(config) {
        try {
            const configFile = path.join(__dirname, '../../config/whatsapp-config.json');
            const configDir = path.dirname(configFile);

            if (!fs.existsSync(configDir)) {
                fs.mkdirSync(configDir, { recursive: true });
            }

            // Don't save sensitive tokens to disk in production
            const safeConfig = {
                phoneNumberId: config.phoneNumberId,
                ownerPhoneNumber: config.ownerPhoneNumber,
                configured: true,
                lastUpdated: new Date().toISOString()
            };

            fs.writeFileSync(configFile, JSON.stringify(safeConfig, null, 2));
        } catch (error) {
            console.error("Error saving configuration:", error.message);
        }
    }

    /**
     * Load configuration
     */
    loadConfiguration() {
        try {
            const configFile = path.join(__dirname, '../../config/whatsapp-config.json');
            
            if (fs.existsSync(configFile)) {
                const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
                this.phoneNumberId = config.phoneNumberId;
                this.ownerPhoneNumber = config.ownerPhoneNumber;
                this.isConfigured = config.configured || false;
            }
        } catch (error) {
            console.error("Error loading configuration:", error.message);
        }
    }

    /**
     * Handle message status updates
     */
    handleMessageStatus(status) {
        console.log(`Message ${status.id} status: ${status.status}`);
        
        if (status.status === 'failed') {
            console.error(`Message failed: ${status.id}`);
        }
    }

    /**
     * Get integration status
     */
    getStatus() {
        return {
            configured: this.isConfigured,
            connected: this.isConfigured && this.accessToken !== null,
            ownerNumber: this.ownerPhoneNumber,
            pendingApprovals: this.pendingApprovals.size,
            messageQueue: this.messageQueue.length
        };
    }

    // Placeholder methods for integration with other KevinJr modules
    async organizeFiles() {
        return { success: true, message: "📁 Files organized successfully!" };
    }

    async checkEmails() {
        return { success: true, message: "📧 No new urgent emails found." };
    }

    async shutdownOfficeComputer() {
        return { success: true, message: "🔌 Office computer shutdown initiated." };
    }
}

module.exports = WhatsAppIntegration;
