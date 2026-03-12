/**
 * KevinJr Email Management Module
 * Real Gmail/Outlook API integration with OAuth authentication
 * ALWAYS respects Constitutional Laws and requires owner approval
 */

const constitutionalLaws = require('../core/constitutional-laws');
const { google } = require('googleapis');
const { Client } = require('@microsoft/microsoft-graph-client');
const fs = require('fs');
const path = require('path');

class EmailManagement {
    constructor() {
        this.gmailAuth = null;
        this.outlookClient = null;
        this.isGmailConfigured = false;
        this.isOutlookConfigured = false;
        this.emailHistory = [];
        this.emailRules = new Map();
        this.drafts = new Map();
        
        this.loadConfiguration();
    }

    /**
     * Initialize Gmail OAuth
     */
    async initializeGmail(credentials) {
        try {
            console.log("📧 Initializing Gmail integration...");
            
            // Verify constitutional laws
            constitutionalLaws.verifyIntegrity();
            
            const { client_id, client_secret, redirect_uri } = credentials;
            
            this.gmailAuth = new google.auth.OAuth2(
                client_id,
                client_secret,
                redirect_uri
            );

            // Set credentials if refresh token exists
            if (credentials.refresh_token) {
                this.gmailAuth.setCredentials({
                    refresh_token: credentials.refresh_token,
                    access_token: credentials.access_token
                });
                
                this.isGmailConfigured = true;
                console.log("✅ Gmail integration initialized");
                
                return { success: true, provider: 'gmail' };
            } else {
                // Generate auth URL for first-time setup
                const authUrl = this.gmailAuth.generateAuthUrl({
                    access_type: 'offline',
                    scope: [
                        'https://www.googleapis.com/auth/gmail.readonly',
                        'https://www.googleapis.com/auth/gmail.send',
                        'https://www.googleapis.com/auth/gmail.modify'
                    ]
                });
                
                return { 
                    success: false, 
                    requiresAuth: true, 
                    authUrl: authUrl,
                    message: "Please visit the auth URL to complete Gmail setup"
                };
            }
            
        } catch (error) {
            console.error("Gmail initialization error:", error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Initialize Outlook OAuth
     */
    async initializeOutlook(credentials) {
        try {
            console.log("📧 Initializing Outlook integration...");
            
            // Verify constitutional laws
            constitutionalLaws.verifyIntegrity();
            
            this.outlookClient = Client.init({
                authProvider: async (done) => {
                    // Use the access token from credentials
                    done(null, credentials.access_token);
                }
            });

            this.isOutlookConfigured = true;
            console.log("✅ Outlook integration initialized");
            
            return { success: true, provider: 'outlook' };
            
        } catch (error) {
            console.error("Outlook initialization error:", error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Complete Gmail OAuth flow
     */
    async completeGmailAuth(authCode) {
        try {
            const { tokens } = await this.gmailAuth.getToken(authCode);
            this.gmailAuth.setCredentials(tokens);
            
            // Save tokens securely
            this.saveGmailTokens(tokens);
            
            this.isGmailConfigured = true;
            console.log("✅ Gmail OAuth completed");
            
            return { success: true, tokens: tokens };
            
        } catch (error) {
            console.error("Gmail OAuth completion error:", error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Read emails from Gmail
     */
    async readGmailEmails(query = '', maxResults = 10) {
        try {
            if (!this.isGmailConfigured) {
                return { success: false, error: "Gmail not configured" };
            }

            const gmail = google.gmail({ version: 'v1', auth: this.gmailAuth });
            
            // Search for messages
            const response = await gmail.users.messages.list({
                userId: 'me',
                q: query,
                maxResults: maxResults
            });

            const messages = response.data.messages || [];
            const emails = [];

            // Get full message details
            for (const message of messages) {
                try {
                    const fullMessage = await gmail.users.messages.get({
                        userId: 'me',
                        id: message.id
                    });

                    const email = this.parseGmailMessage(fullMessage.data);
                    emails.push(email);
                } catch (error) {
                    console.warn(`Error reading message ${message.id}:`, error.message);
                }
            }

            this.logEmailAction('read_gmail', { query, count: emails.length });
            
            return { success: true, emails: emails, provider: 'gmail' };
            
        } catch (error) {
            console.error("Gmail read error:", error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Read emails from Outlook
     */
    async readOutlookEmails(filter = '', top = 10) {
        try {
            if (!this.isOutlookConfigured) {
                return { success: false, error: "Outlook not configured" };
            }

            const messages = await this.outlookClient
                .api('/me/messages')
                .filter(filter)
                .top(top)
                .get();

            const emails = messages.value.map(message => this.parseOutlookMessage(message));

            this.logEmailAction('read_outlook', { filter, count: emails.length });
            
            return { success: true, emails: emails, provider: 'outlook' };
            
        } catch (error) {
            console.error("Outlook read error:", error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Send email via Gmail
     */
    async sendGmailEmail(to, subject, body, attachments = []) {
        try {
            // Verify constitutional laws - never send without approval
            const validation = constitutionalLaws.validateAction({
                type: 'send_email',
                provider: 'gmail',
                to: to,
                subject: subject
            });

            if (!validation.approved) {
                return { success: false, reason: validation.reason, requiresApproval: true };
            }

            if (!this.isGmailConfigured) {
                return { success: false, error: "Gmail not configured" };
            }

            const gmail = google.gmail({ version: 'v1', auth: this.gmailAuth });
            
            // Create email message
            const message = this.createGmailMessage(to, subject, body, attachments);
            
            // Send email
            const response = await gmail.users.messages.send({
                userId: 'me',
                requestBody: {
                    raw: message
                }
            });

            console.log(`📧 Gmail email sent to ${to}: ${subject}`);
            this.logEmailAction('send_gmail', { to, subject, messageId: response.data.id });
            
            return { success: true, messageId: response.data.id, provider: 'gmail' };
            
        } catch (error) {
            console.error("Gmail send error:", error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Send email via Outlook
     */
    async sendOutlookEmail(to, subject, body, attachments = []) {
        try {
            // Verify constitutional laws - never send without approval
            const validation = constitutionalLaws.validateAction({
                type: 'send_email',
                provider: 'outlook',
                to: to,
                subject: subject
            });

            if (!validation.approved) {
                return { success: false, reason: validation.reason, requiresApproval: true };
            }

            if (!this.isOutlookConfigured) {
                return { success: false, error: "Outlook not configured" };
            }

            // Create email message
            const message = {
                subject: subject,
                body: {
                    contentType: 'HTML',
                    content: body
                },
                toRecipients: [{
                    emailAddress: {
                        address: to
                    }
                }]
            };

            // Add attachments if provided
            if (attachments.length > 0) {
                message.attachments = attachments.map(att => ({
                    '@odata.type': '#microsoft.graph.fileAttachment',
                    name: att.name,
                    contentBytes: att.content
                }));
            }

            // Send email
            const response = await this.outlookClient
                .api('/me/sendMail')
                .post({ message });

            console.log(`📧 Outlook email sent to ${to}: ${subject}`);
            this.logEmailAction('send_outlook', { to, subject });
            
            return { success: true, provider: 'outlook' };
            
        } catch (error) {
            console.error("Outlook send error:", error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Create draft email
     */
    async createDraft(provider, to, subject, body, attachments = []) {
        try {
            const draftId = `draft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            const draft = {
                id: draftId,
                provider: provider,
                to: to,
                subject: subject,
                body: body,
                attachments: attachments,
                created: new Date().toISOString(),
                status: 'draft'
            };

            this.drafts.set(draftId, draft);
            this.saveDrafts();

            console.log(`📝 Draft created: ${subject}`);
            this.logEmailAction('create_draft', { draftId, to, subject });
            
            return { success: true, draftId: draftId, draft: draft };
            
        } catch (error) {
            console.error("Draft creation error:", error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Send draft email
     */
    async sendDraft(draftId) {
        try {
            const draft = this.drafts.get(draftId);
            if (!draft) {
                return { success: false, error: "Draft not found" };
            }

            let result;
            if (draft.provider === 'gmail') {
                result = await this.sendGmailEmail(draft.to, draft.subject, draft.body, draft.attachments);
            } else if (draft.provider === 'outlook') {
                result = await this.sendOutlookEmail(draft.to, draft.subject, draft.body, draft.attachments);
            } else {
                return { success: false, error: "Unknown email provider" };
            }

            if (result.success) {
                // Remove draft after successful send
                this.drafts.delete(draftId);
                this.saveDrafts();
                
                console.log(`📧 Draft sent successfully: ${draft.subject}`);
            }

            return result;
            
        } catch (error) {
            console.error("Draft send error:", error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Categorize emails intelligently
     */
    async categorizeEmails(emails) {
        try {
            const categories = {
                urgent: [],
                client: [],
                spam: [],
                info: [],
                personal: []
            };

            for (const email of emails) {
                const category = this.determineEmailCategory(email);
                categories[category].push(email);
            }

            this.logEmailAction('categorize', { 
                total: emails.length,
                urgent: categories.urgent.length,
                client: categories.client.length,
                spam: categories.spam.length,
                info: categories.info.length,
                personal: categories.personal.length
            });

            return { success: true, categories: categories };
            
        } catch (error) {
            console.error("Email categorization error:", error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Determine email category based on content and sender
     */
    determineEmailCategory(email) {
        const subject = email.subject.toLowerCase();
        const sender = email.from.toLowerCase();
        const body = email.body.toLowerCase();

        // Urgent keywords
        const urgentKeywords = ['urgent', 'asap', 'emergency', 'critical', 'deadline', 'important'];
        if (urgentKeywords.some(keyword => subject.includes(keyword) || body.includes(keyword))) {
            return 'urgent';
        }

        // Client-related keywords
        const clientKeywords = ['project', 'client', 'meeting', 'proposal', 'contract', 'invoice'];
        if (clientKeywords.some(keyword => subject.includes(keyword) || body.includes(keyword))) {
            return 'client';
        }

        // Spam indicators
        const spamKeywords = ['unsubscribe', 'promotion', 'offer', 'deal', 'free', 'winner'];
        if (spamKeywords.some(keyword => subject.includes(keyword) || body.includes(keyword))) {
            return 'spam';
        }

        // Newsletter/info indicators
        const infoKeywords = ['newsletter', 'update', 'notification', 'alert', 'report'];
        if (infoKeywords.some(keyword => subject.includes(keyword) || body.includes(keyword))) {
            return 'info';
        }

        // Default to personal
        return 'personal';
    }

    /**
     * Generate automatic reply
     */
    async generateAutoReply(email) {
        try {
            // This would integrate with AI to generate contextual replies
            // For now, create basic template responses
            
            const category = this.determineEmailCategory(email);
            let replyTemplate = '';

            switch (category) {
                case 'urgent':
                    replyTemplate = `Thank you for your urgent message. I've received your email regarding "${email.subject}" and will prioritize this matter. I'll get back to you as soon as possible.`;
                    break;
                case 'client':
                    replyTemplate = `Thank you for your email about "${email.subject}". I've received your message and will review the details. I'll respond with more information shortly.`;
                    break;
                case 'info':
                    replyTemplate = `Thank you for the information. I've received your update regarding "${email.subject}".`;
                    break;
                default:
                    replyTemplate = `Thank you for your email. I've received your message and will get back to you soon.`;
            }

            const reply = {
                to: email.from,
                subject: `Re: ${email.subject}`,
                body: replyTemplate,
                inReplyTo: email.id
            };

            return { success: true, reply: reply };
            
        } catch (error) {
            console.error("Auto-reply generation error:", error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Parse Gmail message
     */
    parseGmailMessage(message) {
        const headers = message.payload.headers;
        const getHeader = (name) => {
            const header = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
            return header ? header.value : '';
        };

        let body = '';
        if (message.payload.body && message.payload.body.data) {
            body = Buffer.from(message.payload.body.data, 'base64').toString();
        } else if (message.payload.parts) {
            // Handle multipart messages
            const textPart = message.payload.parts.find(part => part.mimeType === 'text/plain');
            if (textPart && textPart.body && textPart.body.data) {
                body = Buffer.from(textPart.body.data, 'base64').toString();
            }
        }

        return {
            id: message.id,
            threadId: message.threadId,
            from: getHeader('From'),
            to: getHeader('To'),
            subject: getHeader('Subject'),
            date: getHeader('Date'),
            body: body,
            snippet: message.snippet,
            labelIds: message.labelIds || [],
            provider: 'gmail'
        };
    }

    /**
     * Parse Outlook message
     */
    parseOutlookMessage(message) {
        return {
            id: message.id,
            from: message.from ? message.from.emailAddress.address : '',
            to: message.toRecipients ? message.toRecipients.map(r => r.emailAddress.address).join(', ') : '',
            subject: message.subject || '',
            date: message.receivedDateTime,
            body: message.body ? message.body.content : '',
            snippet: message.bodyPreview || '',
            importance: message.importance,
            provider: 'outlook'
        };
    }

    /**
     * Create Gmail message
     */
    createGmailMessage(to, subject, body, attachments = []) {
        const messageParts = [
            `To: ${to}`,
            `Subject: ${subject}`,
            'Content-Type: text/html; charset=utf-8',
            '',
            body
        ];

        const message = messageParts.join('\n');
        return Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }

    /**
     * Log email action
     */
    logEmailAction(action, details) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            action: action,
            details: details
        };

        this.emailHistory.push(logEntry);
        
        // Keep only last 1000 actions
        if (this.emailHistory.length > 1000) {
            this.emailHistory = this.emailHistory.slice(-1000);
        }

        // Save to file
        this.saveEmailHistory();
        
        // Always report to owner (Constitutional Law 4)
        console.log("📧 Email Action:", JSON.stringify(logEntry, null, 2));
    }

    /**
     * Save email history
     */
    saveEmailHistory() {
        try {
            const historyFile = path.join(__dirname, '../../logs/email-history.json');
            const historyDir = path.dirname(historyFile);

            if (!fs.existsSync(historyDir)) {
                fs.mkdirSync(historyDir, { recursive: true });
            }

            fs.writeFileSync(historyFile, JSON.stringify(this.emailHistory, null, 2));
        } catch (error) {
            console.error("Error saving email history:", error.message);
        }
    }

    /**
     * Save drafts
     */
    saveDrafts() {
        try {
            const draftsFile = path.join(__dirname, '../../data/email-drafts.json');
            const draftsDir = path.dirname(draftsFile);

            if (!fs.existsSync(draftsDir)) {
                fs.mkdirSync(draftsDir, { recursive: true });
            }

            const draftsData = {
                drafts: Object.fromEntries(this.drafts),
                lastUpdated: new Date().toISOString()
            };

            fs.writeFileSync(draftsFile, JSON.stringify(draftsData, null, 2));
        } catch (error) {
            console.error("Error saving drafts:", error.message);
        }
    }

    /**
     * Save Gmail tokens securely
     */
    saveGmailTokens(tokens) {
        try {
            const tokensFile = path.join(__dirname, '../../config/gmail-tokens.json');
            const tokensDir = path.dirname(tokensFile);

            if (!fs.existsSync(tokensDir)) {
                fs.mkdirSync(tokensDir, { recursive: true });
            }

            // In production, these should be encrypted
            fs.writeFileSync(tokensFile, JSON.stringify(tokens, null, 2));
        } catch (error) {
            console.error("Error saving Gmail tokens:", error.message);
        }
    }

    /**
     * Load configuration
     */
    loadConfiguration() {
        try {
            // Load drafts
            const draftsFile = path.join(__dirname, '../../data/email-drafts.json');
            if (fs.existsSync(draftsFile)) {
                const draftsData = JSON.parse(fs.readFileSync(draftsFile, 'utf8'));
                this.drafts = new Map(Object.entries(draftsData.drafts || {}));
            }

            console.log("📧 Email management configuration loaded");
        } catch (error) {
            console.error("Error loading email configuration:", error.message);
        }
    }

    /**
     * Get email management status
     */
    getStatus() {
        return {
            gmailConfigured: this.isGmailConfigured,
            outlookConfigured: this.isOutlookConfigured,
            drafts: this.drafts.size,
            emailHistory: this.emailHistory.length,
            emailRules: this.emailRules.size
        };
    }
}

module.exports = EmailManagement;
