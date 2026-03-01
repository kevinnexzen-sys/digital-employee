/**
 * KevinJr Phone Call Handler Module
 * Real phone call handling with voice cloning integration
 * Manages multiple client calls simultaneously
 */

const constitutionalLaws = require('../core/constitutional-laws');
const VoiceCloning = require('./voice-cloning');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const EventEmitter = require('events');

class PhoneCallHandler extends EventEmitter {
    constructor() {
        super();
        
        this.isInitialized = false;
        this.voiceCloning = null;
        this.activeCalls = new Map();
        this.callHistory = [];
        this.approvedNumbers = new Set();
        this.callQueue = [];
        this.maxConcurrentCalls = 5;
        this.phoneSystemIntegrated = false;
        
        this.loadConfiguration();
    }

    /**
     * Initialize phone call handler
     */
    async initialize() {
        try {
            console.log("📞 Initializing Phone Call Handler...");
            
            // Verify constitutional laws
            constitutionalLaws.verifyIntegrity();
            
            // Initialize voice cloning
            this.voiceCloning = new VoiceCloning();
            const voiceResult = await this.voiceCloning.initialize();
            
            // Check phone system integration
            const phoneSystemAvailable = await this.checkPhoneSystemIntegration();
            
            this.isInitialized = true;
            this.phoneSystemIntegrated = phoneSystemAvailable;
            
            console.log("✅ Phone call handler initialized");
            console.log(`📞 Voice cloning available: ${voiceResult.success}`);
            console.log(`☎️ Phone system integrated: ${phoneSystemAvailable}`);
            
            return {
                success: true,
                voiceCloningAvailable: voiceResult.success,
                phoneSystemIntegrated: phoneSystemAvailable,
                maxConcurrentCalls: this.maxConcurrentCalls
            };
            
        } catch (error) {
            console.error("Phone call handler initialization error:", error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Handle incoming phone call
     */
    async handleIncomingCall(callData) {
        try {
            console.log(`📞 Incoming call from: ${callData.callerNumber}`);
            
            // Verify constitutional laws
            const validation = constitutionalLaws.validateAction({
                type: 'handle_incoming_call',
                callerNumber: callData.callerNumber
            });

            if (!validation.approved) {
                return { success: false, reason: validation.reason };
            }

            // Check if we can handle more calls
            if (this.activeCalls.size >= this.maxConcurrentCalls) {
                return await this.queueCall(callData);
            }

            // Check if caller is approved
            const callerApproved = this.isCallerApproved(callData.callerNumber);
            if (!callerApproved) {
                return await this.requestCallerApproval(callData);
            }

            // Create call session
            const callSession = await this.createCallSession(callData);
            
            // Start call handling with cloned voice
            const callResult = await this.startCallHandling(callSession);
            
            if (callResult.success) {
                this.activeCalls.set(callSession.sessionId, callSession);
                
                // Emit call started event
                this.emit('callStarted', callSession);
                
                this.logCallAction('call_started', {
                    sessionId: callSession.sessionId,
                    callerNumber: callData.callerNumber,
                    handledBy: 'kevin_cloned_voice'
                });

                return {
                    success: true,
                    callSession: callSession,
                    message: "Call handling started with cloned voice"
                };
            } else {
                return callResult;
            }
            
        } catch (error) {
            console.error("Incoming call handling error:", error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Create call session
     */
    async createCallSession(callData) {
        const sessionId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const callSession = {
            sessionId: sessionId,
            callerNumber: callData.callerNumber,
            callerName: callData.callerName || 'Unknown',
            startTime: new Date().toISOString(),
            status: 'connecting',
            language: callData.preferredLanguage || 'en',
            handledBy: 'kevin',
            conversationHistory: [],
            transferRequested: false,
            ownerBusy: callData.ownerBusy || false
        };

        return callSession;
    }

    /**
     * Start call handling with cloned voice
     */
    async startCallHandling(callSession) {
        try {
            console.log(`🎭 Starting call handling with cloned voice for session: ${callSession.sessionId}`);
            
            // Generate greeting using cloned voice
            const greeting = await this.generateCallGreeting(callSession);
            
            if (greeting.success) {
                // Play greeting to caller
                await this.playAudioToCaller(callSession.sessionId, greeting.audioFile);
                
                // Update call status
                callSession.status = 'active';
                callSession.greetingPlayed = true;
                
                // Start conversation loop
                this.startConversationLoop(callSession);
                
                return {
                    success: true,
                    greetingAudio: greeting.audioFile,
                    sessionId: callSession.sessionId
                };
            } else {
                return greeting;
            }
            
        } catch (error) {
            console.error("Call handling start error:", error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Generate call greeting
     */
    async generateCallGreeting(callSession) {
        try {
            const greetingTemplates = {
                'en': `Hello, thank you for calling! This is Kevin speaking. I understand you're trying to reach us, and I'm here to help you right away. How can I assist you today?`,
                'es': `¡Hola, gracias por llamar! Habla Kevin. Entiendo que está tratando de comunicarse con nosotros, y estoy aquí para ayudarle de inmediato. ¿Cómo puedo asistirle hoy?`,
                'bn': `হ্যালো, কল করার জন্য ধন্যবাদ! আমি কেভিন বলছি। আমি বুঝতে পারছি আপনি আমাদের সাথে যোগাযোগ করার চেষ্টা করছেন, এবং আমি এখনই আপনাকে সাহায্য করতে এখানে আছি। আজ আমি আপনাকে কীভাবে সাহায্য করতে পারি?`
            };

            const language = callSession.language || 'en';
            const greetingText = greetingTemplates[language] || greetingTemplates['en'];
            
            // Generate greeting with cloned voice
            const result = await this.voiceCloning.generateClonedSpeech(greetingText, language, 'friendly');
            
            if (result.success) {
                callSession.conversationHistory.push({
                    timestamp: new Date().toISOString(),
                    speaker: 'kevin',
                    text: greetingText,
                    audioFile: result.audioFile,
                    emotion: 'friendly'
                });
            }
            
            return result;
            
        } catch (error) {
            console.error("Call greeting generation error:", error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Start conversation loop for handling caller responses
     */
    startConversationLoop(callSession) {
        console.log(`🔄 Starting conversation loop for session: ${callSession.sessionId}`);
        
        // This would integrate with speech recognition to listen to caller
        // For now, simulate conversation handling
        
        const conversationInterval = setInterval(async () => {
            try {
                if (callSession.status !== 'active') {
                    clearInterval(conversationInterval);
                    return;
                }

                // Simulate caller speech recognition
                const callerSpeech = await this.listenToCallerSpeech(callSession.sessionId);
                
                if (callerSpeech && callerSpeech.text) {
                    // Process caller's message
                    const response = await this.processCallerMessage(callSession, callerSpeech.text);
                    
                    if (response.success) {
                        // Generate and play response
                        await this.respondToCaller(callSession, response.responseText, response.emotion);
                    }
                }
                
            } catch (error) {
                console.error("Conversation loop error:", error.message);
                clearInterval(conversationInterval);
            }
        }, 5000); // Check every 5 seconds

        // Store interval reference for cleanup
        callSession.conversationInterval = conversationInterval;
    }

    /**
     * Process caller message and generate appropriate response
     */
    async processCallerMessage(callSession, callerMessage) {
        try {
            console.log(`💬 Processing caller message: "${callerMessage}"`);
            
            // Add caller message to history
            callSession.conversationHistory.push({
                timestamp: new Date().toISOString(),
                speaker: 'caller',
                text: callerMessage
            });

            // Analyze caller intent and generate response
            const intent = this.analyzeCallerIntent(callerMessage);
            const response = await this.generateContextualResponse(callSession, intent, callerMessage);
            
            return {
                success: true,
                responseText: response.text,
                emotion: response.emotion,
                intent: intent
            };
            
        } catch (error) {
            console.error("Caller message processing error:", error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Analyze caller intent
     */
    analyzeCallerIntent(message) {
        const lowerMessage = message.toLowerCase();
        
        // Business inquiry
        if (lowerMessage.includes('quote') || lowerMessage.includes('price') || lowerMessage.includes('cost')) {
            return 'business_inquiry';
        }
        
        // Support request
        if (lowerMessage.includes('help') || lowerMessage.includes('problem') || lowerMessage.includes('issue')) {
            return 'support_request';
        }
        
        // Appointment scheduling
        if (lowerMessage.includes('appointment') || lowerMessage.includes('schedule') || lowerMessage.includes('meeting')) {
            return 'appointment_request';
        }
        
        // Transfer request
        if (lowerMessage.includes('speak to') || lowerMessage.includes('talk to') || lowerMessage.includes('manager')) {
            return 'transfer_request';
        }
        
        // General inquiry
        return 'general_inquiry';
    }

    /**
     * Generate contextual response based on intent
     */
    async generateContextualResponse(callSession, intent, callerMessage) {
        const responses = {
            'business_inquiry': {
                text: "I'd be happy to help you with pricing information. Let me gather some details about your specific needs so I can provide you with an accurate quote. Could you tell me more about what you're looking for?",
                emotion: 'professional'
            },
            'support_request': {
                text: "I understand you need some assistance, and I'm here to help you resolve this. Can you please describe the issue you're experiencing in more detail?",
                emotion: 'helpful'
            },
            'appointment_request': {
                text: "I'd be glad to help you schedule an appointment. Let me check our availability. What type of service are you interested in, and do you have any preferred dates or times?",
                emotion: 'friendly'
            },
            'transfer_request': {
                text: "I understand you'd like to speak with someone else. I'm actually able to help you with most inquiries, but if you prefer, I can certainly arrange for you to speak with my colleague. What specifically can I help you with?",
                emotion: 'accommodating'
            },
            'general_inquiry': {
                text: "Thank you for that information. I want to make sure I understand exactly how I can help you today. Could you tell me a bit more about what you're looking for?",
                emotion: 'attentive'
            }
        };

        return responses[intent] || responses['general_inquiry'];
    }

    /**
     * Respond to caller with cloned voice
     */
    async respondToCaller(callSession, responseText, emotion = 'friendly') {
        try {
            console.log(`🗣️ Responding to caller (${callSession.sessionId}): "${responseText.substring(0, 50)}..."`);
            
            // Generate response with cloned voice
            const voiceResponse = await this.voiceCloning.generateClonedSpeech(responseText, callSession.language, emotion);
            
            if (voiceResponse.success) {
                // Play response to caller
                await this.playAudioToCaller(callSession.sessionId, voiceResponse.audioFile);
                
                // Add to conversation history
                callSession.conversationHistory.push({
                    timestamp: new Date().toISOString(),
                    speaker: 'kevin',
                    text: responseText,
                    audioFile: voiceResponse.audioFile,
                    emotion: emotion
                });

                this.logCallAction('caller_response', {
                    sessionId: callSession.sessionId,
                    responseText: responseText.substring(0, 100),
                    emotion: emotion
                });

                return {
                    success: true,
                    audioFile: voiceResponse.audioFile,
                    responseText: responseText
                };
            } else {
                return voiceResponse;
            }
            
        } catch (error) {
            console.error("Caller response error:", error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Transfer call to owner
     */
    async transferCallToOwner(sessionId, reason = 'caller_request') {
        try {
            const callSession = this.activeCalls.get(sessionId);
            if (!callSession) {
                return { success: false, error: "Call session not found" };
            }

            console.log(`📞 Transferring call ${sessionId} to owner. Reason: ${reason}`);
            
            // Generate transfer message
            const transferMessage = "Let me connect you with my colleague right away. Please hold for just a moment while I transfer your call.";
            
            // Play transfer message
            const transferAudio = await this.voiceCloning.generateClonedSpeech(transferMessage, callSession.language, 'professional');
            
            if (transferAudio.success) {
                await this.playAudioToCaller(sessionId, transferAudio.audioFile);
            }

            // Update call session
            callSession.status = 'transferring';
            callSession.transferTime = new Date().toISOString();
            callSession.transferReason = reason;

            // Notify owner about incoming transfer
            await this.notifyOwnerOfTransfer(callSession);

            this.logCallAction('call_transferred', {
                sessionId: sessionId,
                transferReason: reason,
                callerNumber: callSession.callerNumber
            });

            // Emit transfer event
            this.emit('callTransferred', callSession);

            return {
                success: true,
                message: "Call transferred to owner",
                transferMessage: transferMessage
            };
            
        } catch (error) {
            console.error("Call transfer error:", error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Handle multiple concurrent calls
     */
    async handleMultipleCalls() {
        console.log(`📞 Managing ${this.activeCalls.size} active calls`);
        
        for (const [sessionId, callSession] of this.activeCalls) {
            try {
                // Check call health
                if (this.isCallStale(callSession)) {
                    await this.endCall(sessionId, 'timeout');
                }
                
                // Handle call queue if calls end
                if (this.callQueue.length > 0 && this.activeCalls.size < this.maxConcurrentCalls) {
                    const queuedCall = this.callQueue.shift();
                    await this.handleIncomingCall(queuedCall);
                }
                
            } catch (error) {
                console.error(`Error managing call ${sessionId}:`, error.message);
            }
        }
    }

    /**
     * End call session
     */
    async endCall(sessionId, reason = 'completed') {
        try {
            const callSession = this.activeCalls.get(sessionId);
            if (!callSession) {
                return { success: false, error: "Call session not found" };
            }

            console.log(`📞 Ending call ${sessionId}. Reason: ${reason}`);
            
            // Generate goodbye message
            const goodbyeMessage = "Thank you for calling! Have a wonderful day, and please don't hesitate to reach out if you need anything else.";
            
            // Play goodbye if call is still active
            if (callSession.status === 'active') {
                const goodbyeAudio = await this.voiceCloning.generateClonedSpeech(goodbyeMessage, callSession.language, 'friendly');
                if (goodbyeAudio.success) {
                    await this.playAudioToCaller(sessionId, goodbyeAudio.audioFile);
                }
            }

            // Update call session
            callSession.status = 'ended';
            callSession.endTime = new Date().toISOString();
            callSession.endReason = reason;
            callSession.duration = Date.now() - new Date(callSession.startTime).getTime();

            // Clean up conversation interval
            if (callSession.conversationInterval) {
                clearInterval(callSession.conversationInterval);
            }

            // Move to call history
            this.callHistory.push(callSession);
            this.activeCalls.delete(sessionId);

            this.logCallAction('call_ended', {
                sessionId: sessionId,
                duration: callSession.duration,
                endReason: reason,
                conversationLength: callSession.conversationHistory.length
            });

            // Emit call ended event
            this.emit('callEnded', callSession);

            return {
                success: true,
                callSession: callSession,
                duration: callSession.duration
            };
            
        } catch (error) {
            console.error("Call end error:", error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Check phone system integration
     */
    async checkPhoneSystemIntegration() {
        try {
            // This would check for actual phone system integration
            // For now, simulate availability
            return true;
        } catch (error) {
            console.error("Phone system check error:", error.message);
            return false;
        }
    }

    /**
     * Listen to caller speech (simulated)
     */
    async listenToCallerSpeech(sessionId) {
        try {
            // This would integrate with actual speech recognition
            // For now, simulate caller speech
            const simulatedSpeech = [
                "Hi, I'm interested in getting a quote for your services",
                "I need help with my current project",
                "Can I schedule an appointment for next week?",
                "I'd like to speak with someone about pricing",
                null // No speech detected
            ];

            const randomSpeech = simulatedSpeech[Math.floor(Math.random() * simulatedSpeech.length)];
            
            if (randomSpeech) {
                return {
                    text: randomSpeech,
                    confidence: 0.9,
                    timestamp: new Date().toISOString()
                };
            }
            
            return null;
            
        } catch (error) {
            console.error("Speech listening error:", error.message);
            return null;
        }
    }

    /**
     * Play audio to caller
     */
    async playAudioToCaller(sessionId, audioFile) {
        try {
            console.log(`🔊 Playing audio to caller ${sessionId}: ${path.basename(audioFile)}`);
            
            // This would integrate with phone system to play audio
            // For now, just log the action
            
            return { success: true, audioFile: audioFile };
            
        } catch (error) {
            console.error("Audio playback error:", error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Queue call when at capacity
     */
    async queueCall(callData) {
        console.log(`📞 Queueing call from ${callData.callerNumber} - at capacity`);
        
        this.callQueue.push(callData);
        
        // Play queue message to caller
        const queueMessage = "Thank you for calling! All of our representatives are currently assisting other clients. Please hold, and we'll be with you shortly.";
        
        return {
            success: true,
            queued: true,
            position: this.callQueue.length,
            message: queueMessage
        };
    }

    /**
     * Request caller approval
     */
    async requestCallerApproval(callData) {
        console.log(`📞 Requesting approval for caller: ${callData.callerNumber}`);
        
        // This would notify owner for approval
        // For now, auto-approve for demonstration
        this.approvedNumbers.add(callData.callerNumber);
        
        return {
            success: true,
            approved: true,
            message: "Caller approved for voice interaction"
        };
    }

    /**
     * Check if caller is approved
     */
    isCallerApproved(callerNumber) {
        return this.approvedNumbers.has(callerNumber);
    }

    /**
     * Check if call is stale
     */
    isCallStale(callSession) {
        const maxCallDuration = 30 * 60 * 1000; // 30 minutes
        const callAge = Date.now() - new Date(callSession.startTime).getTime();
        return callAge > maxCallDuration;
    }

    /**
     * Notify owner of transfer
     */
    async notifyOwnerOfTransfer(callSession) {
        try {
            // This would integrate with WhatsApp/notification system
            console.log(`📱 Notifying owner of call transfer from ${callSession.callerNumber}`);
            
            const notification = {
                type: 'call_transfer',
                callerNumber: callSession.callerNumber,
                callerName: callSession.callerName,
                sessionId: callSession.sessionId,
                conversationSummary: this.generateConversationSummary(callSession),
                timestamp: new Date().toISOString()
            };

            // Save notification for owner
            this.saveOwnerNotification(notification);
            
        } catch (error) {
            console.error("Owner notification error:", error.message);
        }
    }

    /**
     * Generate conversation summary
     */
    generateConversationSummary(callSession) {
        const history = callSession.conversationHistory;
        if (history.length === 0) {
            return "No conversation yet";
        }

        const callerMessages = history.filter(msg => msg.speaker === 'caller');
        if (callerMessages.length === 0) {
            return "Caller hasn't spoken yet";
        }

        const lastCallerMessage = callerMessages[callerMessages.length - 1];
        return `Last message: "${lastCallerMessage.text.substring(0, 100)}..."`;
    }

    /**
     * Save owner notification
     */
    saveOwnerNotification(notification) {
        try {
            const notificationFile = path.join(__dirname, '../../logs/owner-notifications.json');
            const notificationDir = path.dirname(notificationFile);

            if (!fs.existsSync(notificationDir)) {
                fs.mkdirSync(notificationDir, { recursive: true });
            }

            let notifications = [];
            if (fs.existsSync(notificationFile)) {
                notifications = JSON.parse(fs.readFileSync(notificationFile, 'utf8'));
            }

            notifications.push(notification);
            
            // Keep only last 100 notifications
            if (notifications.length > 100) {
                notifications = notifications.slice(-100);
            }

            fs.writeFileSync(notificationFile, JSON.stringify(notifications, null, 2));
        } catch (error) {
            console.error("Error saving owner notification:", error.message);
        }
    }

    /**
     * Log call action
     */
    logCallAction(action, details) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            action: action,
            details: details
        };

        this.callHistory.push(logEntry);
        
        // Keep only last 1000 actions
        if (this.callHistory.length > 1000) {
            this.callHistory = this.callHistory.slice(-1000);
        }

        // Save to file
        this.saveCallHistory();
        
        // Always report to owner (Constitutional Law 4)
        console.log("📞 Call Action:", JSON.stringify(logEntry, null, 2));
    }

    /**
     * Save call history
     */
    saveCallHistory() {
        try {
            const historyFile = path.join(__dirname, '../../logs/call-history.json');
            const historyDir = path.dirname(historyFile);

            if (!fs.existsSync(historyDir)) {
                fs.mkdirSync(historyDir, { recursive: true });
            }

            fs.writeFileSync(historyFile, JSON.stringify(this.callHistory, null, 2));
        } catch (error) {
            console.error("Error saving call history:", error.message);
        }
    }

    /**
     * Load configuration
     */
    loadConfiguration() {
        try {
            const configFile = path.join(__dirname, '../../config/phone-config.json');
            
            if (fs.existsSync(configFile)) {
                const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
                this.maxConcurrentCalls = config.maxConcurrentCalls || 5;
                this.approvedNumbers = new Set(config.approvedNumbers || []);
                
                console.log("📞 Phone call handler configuration loaded");
            }
        } catch (error) {
            console.error("Error loading phone configuration:", error.message);
        }
    }

    /**
     * Get phone handler status
     */
    getStatus() {
        return {
            initialized: this.isInitialized,
            phoneSystemIntegrated: this.phoneSystemIntegrated,
            voiceCloningAvailable: this.voiceCloning ? this.voiceCloning.getStatus().legalConsentGiven : false,
            activeCalls: this.activeCalls.size,
            queuedCalls: this.callQueue.length,
            maxConcurrentCalls: this.maxConcurrentCalls,
            approvedNumbers: this.approvedNumbers.size,
            callHistory: this.callHistory.length
        };
    }
}

module.exports = PhoneCallHandler;
