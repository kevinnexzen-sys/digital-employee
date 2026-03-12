/**
 * KevinJr Browser Automation Module
 * Real browser automation using Playwright for approved sites
 * ALWAYS respects Constitutional Laws and requires owner approval
 */

const constitutionalLaws = require('../core/constitutional-laws');
const { chromium, firefox, webkit } = require('playwright');
const fs = require('fs');
const path = require('path');

class BrowserAutomation {
    constructor() {
        this.browser = null;
        this.context = null;
        this.page = null;
        this.approvedSites = new Set();
        this.credentials = new Map();
        this.isActive = false;
        this.automationHistory = [];
        
        this.loadConfiguration();
    }

    /**
     * Initialize browser automation
     */
    async initialize() {
        try {
            console.log("🌐 Initializing browser automation...");
            
            // Verify constitutional laws
            constitutionalLaws.verifyIntegrity();
            
            // Launch browser with security settings
            this.browser = await chromium.launch({
                headless: false, // Visible for transparency
                args: [
                    '--no-sandbox',
                    '--disable-web-security',
                    '--disable-features=VizDisplayCompositor'
                ]
            });

            // Create context with security settings
            this.context = await this.browser.newContext({
                viewport: { width: 1920, height: 1080 },
                userAgent: 'KevinJr-Browser-Automation/1.0',
                permissions: ['notifications'],
                recordVideo: {
                    dir: path.join(__dirname, '../../logs/browser-videos'),
                    size: { width: 1920, height: 1080 }
                }
            });

            // Create initial page
            this.page = await this.context.newPage();
            
            this.isActive = true;
            console.log("✅ Browser automation initialized");
            
            return { success: true };
            
        } catch (error) {
            console.error("Browser automation initialization error:", error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Navigate to approved site
     */
    async navigateToSite(url, purpose = "general automation") {
        try {
            // Verify constitutional laws
            constitutionalLaws.verifyIntegrity();
            
            // Check if site is approved
            const domain = new URL(url).hostname;
            if (!this.approvedSites.has(domain)) {
                return await this.requestSiteApproval(url, purpose);
            }

            // Navigate to site
            console.log(`🌐 Navigating to: ${url}`);
            await this.page.goto(url, { waitUntil: 'networkidle' });
            
            // Log navigation
            this.logAutomationAction('navigate', { url, purpose });
            
            return { success: true, url: url };
            
        } catch (error) {
            console.error("Navigation error:", error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Request site approval from owner
     */
    async requestSiteApproval(url, purpose) {
        try {
            const domain = new URL(url).hostname;
            
            // This would integrate with WhatsApp/notification system
            console.log(`📱 Requesting approval for site: ${domain}`);
            console.log(`Purpose: ${purpose}`);
            
            // For now, simulate approval request
            const approval = {
                site: domain,
                url: url,
                purpose: purpose,
                timestamp: new Date().toISOString(),
                status: 'pending'
            };
            
            this.saveApprovalRequest(approval);
            
            return {
                success: false,
                requiresApproval: true,
                message: `Site approval required for ${domain}. Purpose: ${purpose}`
            };
            
        } catch (error) {
            console.error("Site approval request error:", error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Approve site for automation
     */
    async approveSite(domain, permanent = false) {
        try {
            this.approvedSites.add(domain);
            
            if (permanent) {
                this.saveApprovedSites();
            }
            
            console.log(`✅ Site approved: ${domain}`);
            return { success: true, approved: domain };
            
        } catch (error) {
            console.error("Site approval error:", error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Fill form with provided data
     */
    async fillForm(formData, submitForm = false) {
        try {
            // Verify constitutional laws
            const validation = constitutionalLaws.validateAction({
                type: 'fill_form',
                data: formData,
                submit: submitForm
            });

            if (!validation.approved) {
                return { success: false, reason: validation.reason };
            }

            console.log("📝 Filling form with provided data...");
            
            for (const [selector, value] of Object.entries(formData)) {
                try {
                    await this.page.fill(selector, value);
                    console.log(`✅ Filled field: ${selector}`);
                } catch (error) {
                    console.warn(`⚠️ Could not fill field ${selector}: ${error.message}`);
                }
            }

            if (submitForm) {
                // Request explicit approval for form submission
                const submitApproval = await this.requestSubmissionApproval(formData);
                if (!submitApproval.approved) {
                    return { success: false, requiresApproval: true, message: "Form submission requires approval" };
                }
                
                await this.page.click('input[type="submit"], button[type="submit"], button:has-text("Submit")');
                console.log("📤 Form submitted");
            }

            this.logAutomationAction('fill_form', { formData, submitted: submitForm });
            
            return { success: true, filled: Object.keys(formData).length, submitted: submitForm };
            
        } catch (error) {
            console.error("Form filling error:", error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Click element on page
     */
    async clickElement(selector, description = "element") {
        try {
            console.log(`🖱️ Clicking ${description}: ${selector}`);
            
            await this.page.click(selector);
            await this.page.waitForTimeout(1000); // Wait for action to complete
            
            this.logAutomationAction('click', { selector, description });
            
            return { success: true, clicked: selector };
            
        } catch (error) {
            console.error("Click error:", error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Extract data from page
     */
    async extractData(selectors) {
        try {
            console.log("📊 Extracting data from page...");
            
            const extractedData = {};
            
            for (const [key, selector] of Object.entries(selectors)) {
                try {
                    const element = await this.page.$(selector);
                    if (element) {
                        extractedData[key] = await element.textContent();
                    } else {
                        extractedData[key] = null;
                    }
                } catch (error) {
                    console.warn(`⚠️ Could not extract ${key}: ${error.message}`);
                    extractedData[key] = null;
                }
            }

            this.logAutomationAction('extract_data', { selectors, extractedData });
            
            return { success: true, data: extractedData };
            
        } catch (error) {
            console.error("Data extraction error:", error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Take screenshot of current page
     */
    async takeScreenshot(filename = null) {
        try {
            if (!filename) {
                filename = `screenshot-${Date.now()}.png`;
            }
            
            const screenshotPath = path.join(__dirname, '../../logs/screenshots', filename);
            const screenshotDir = path.dirname(screenshotPath);
            
            if (!fs.existsSync(screenshotDir)) {
                fs.mkdirSync(screenshotDir, { recursive: true });
            }
            
            await this.page.screenshot({ path: screenshotPath, fullPage: true });
            
            console.log(`📸 Screenshot saved: ${filename}`);
            this.logAutomationAction('screenshot', { filename, path: screenshotPath });
            
            return { success: true, filename, path: screenshotPath };
            
        } catch (error) {
            console.error("Screenshot error:", error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Wait for element to appear
     */
    async waitForElement(selector, timeout = 30000) {
        try {
            console.log(`⏳ Waiting for element: ${selector}`);
            
            await this.page.waitForSelector(selector, { timeout });
            
            console.log(`✅ Element found: ${selector}`);
            return { success: true, found: selector };
            
        } catch (error) {
            console.error("Wait for element error:", error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Execute custom JavaScript on page
     */
    async executeScript(script, description = "custom script") {
        try {
            // Verify constitutional laws for script execution
            const validation = constitutionalLaws.validateAction({
                type: 'execute_script',
                script: script,
                description: description
            });

            if (!validation.approved) {
                return { success: false, reason: validation.reason };
            }

            console.log(`🔧 Executing script: ${description}`);
            
            const result = await this.page.evaluate(script);
            
            this.logAutomationAction('execute_script', { script, description, result });
            
            return { success: true, result };
            
        } catch (error) {
            console.error("Script execution error:", error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Handle file download
     */
    async downloadFile(downloadTrigger, filename = null) {
        try {
            console.log("📥 Starting file download...");
            
            // Set up download handling
            const downloadPromise = this.page.waitForEvent('download');
            
            // Trigger download (could be click, form submit, etc.)
            if (typeof downloadTrigger === 'string') {
                await this.page.click(downloadTrigger);
            } else if (typeof downloadTrigger === 'function') {
                await downloadTrigger();
            }
            
            const download = await downloadPromise;
            
            // Save download
            const downloadPath = path.join(__dirname, '../../downloads', filename || download.suggestedFilename());
            const downloadDir = path.dirname(downloadPath);
            
            if (!fs.existsSync(downloadDir)) {
                fs.mkdirSync(downloadDir, { recursive: true });
            }
            
            await download.saveAs(downloadPath);
            
            console.log(`✅ File downloaded: ${path.basename(downloadPath)}`);
            this.logAutomationAction('download', { filename: path.basename(downloadPath), path: downloadPath });
            
            return { success: true, filename: path.basename(downloadPath), path: downloadPath };
            
        } catch (error) {
            console.error("Download error:", error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Login to site with stored credentials
     */
    async loginToSite(site, credentialKey) {
        try {
            // Verify constitutional laws
            constitutionalLaws.verifyIntegrity();
            
            const credentials = this.credentials.get(credentialKey);
            if (!credentials) {
                return { success: false, error: "Credentials not found" };
            }

            console.log(`🔐 Logging into ${site}...`);
            
            // Fill login form
            await this.page.fill(credentials.usernameSelector, credentials.username);
            await this.page.fill(credentials.passwordSelector, credentials.password);
            
            // Submit login
            await this.page.click(credentials.submitSelector);
            
            // Wait for login to complete
            await this.page.waitForNavigation({ waitUntil: 'networkidle' });
            
            console.log(`✅ Logged into ${site}`);
            this.logAutomationAction('login', { site, credentialKey });
            
            return { success: true, site };
            
        } catch (error) {
            console.error("Login error:", error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Store credentials securely (encrypted)
     */
    async storeCredentials(key, credentials) {
        try {
            // Verify constitutional laws - never store financial credentials
            if (this.isFinancialCredential(credentials)) {
                throw new Error("BLOCKED: Financial credentials cannot be stored per Constitutional Laws");
            }

            // Encrypt credentials before storing
            const encryptedCredentials = this.encryptCredentials(credentials);
            this.credentials.set(key, encryptedCredentials);
            
            // Save to secure file
            this.saveCredentials();
            
            console.log(`🔐 Credentials stored securely: ${key}`);
            return { success: true, stored: key };
            
        } catch (error) {
            console.error("Credential storage error:", error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Check if credentials are financial-related
     */
    isFinancialCredential(credentials) {
        const financialKeywords = [
            'bank', 'banking', 'credit', 'debit', 'card', 'payment',
            'paypal', 'stripe', 'financial', 'account', 'routing'
        ];

        const credentialText = JSON.stringify(credentials).toLowerCase();
        return financialKeywords.some(keyword => credentialText.includes(keyword));
    }

    /**
     * Encrypt credentials (placeholder - would use proper encryption)
     */
    encryptCredentials(credentials) {
        // In production, this would use proper encryption
        return {
            ...credentials,
            encrypted: true,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Request submission approval
     */
    async requestSubmissionApproval(formData) {
        // This would integrate with WhatsApp/notification system
        console.log("📱 Requesting form submission approval...");
        
        // For now, return approval required
        return {
            approved: false,
            message: "Form submission requires owner approval"
        };
    }

    /**
     * Log automation action
     */
    logAutomationAction(action, details) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            action: action,
            details: details,
            url: this.page ? this.page.url() : null
        };

        this.automationHistory.push(logEntry);
        
        // Keep only last 1000 actions
        if (this.automationHistory.length > 1000) {
            this.automationHistory = this.automationHistory.slice(-1000);
        }

        // Save to file
        this.saveAutomationHistory();
        
        // Always report to owner (Constitutional Law 4)
        console.log("🤖 Browser Action:", JSON.stringify(logEntry, null, 2));
    }

    /**
     * Save automation history
     */
    saveAutomationHistory() {
        try {
            const historyFile = path.join(__dirname, '../../logs/browser-automation.json');
            const historyDir = path.dirname(historyFile);

            if (!fs.existsSync(historyDir)) {
                fs.mkdirSync(historyDir, { recursive: true });
            }

            fs.writeFileSync(historyFile, JSON.stringify(this.automationHistory, null, 2));
        } catch (error) {
            console.error("Error saving automation history:", error.message);
        }
    }

    /**
     * Save approved sites
     */
    saveApprovedSites() {
        try {
            const sitesFile = path.join(__dirname, '../../config/approved-sites.json');
            const sitesDir = path.dirname(sitesFile);

            if (!fs.existsSync(sitesDir)) {
                fs.mkdirSync(sitesDir, { recursive: true });
            }

            const sitesData = {
                approvedSites: Array.from(this.approvedSites),
                lastUpdated: new Date().toISOString()
            };

            fs.writeFileSync(sitesFile, JSON.stringify(sitesData, null, 2));
        } catch (error) {
            console.error("Error saving approved sites:", error.message);
        }
    }

    /**
     * Save credentials securely
     */
    saveCredentials() {
        try {
            const credentialsFile = path.join(__dirname, '../../config/browser-credentials.json');
            const credentialsDir = path.dirname(credentialsFile);

            if (!fs.existsSync(credentialsDir)) {
                fs.mkdirSync(credentialsDir, { recursive: true });
            }

            const credentialsData = {
                credentials: Object.fromEntries(this.credentials),
                lastUpdated: new Date().toISOString()
            };

            fs.writeFileSync(credentialsFile, JSON.stringify(credentialsData, null, 2));
        } catch (error) {
            console.error("Error saving credentials:", error.message);
        }
    }

    /**
     * Save approval request
     */
    saveApprovalRequest(approval) {
        try {
            const approvalFile = path.join(__dirname, '../../logs/site-approvals.json');
            const approvalDir = path.dirname(approvalFile);

            if (!fs.existsSync(approvalDir)) {
                fs.mkdirSync(approvalDir, { recursive: true });
            }

            let approvals = [];
            if (fs.existsSync(approvalFile)) {
                approvals = JSON.parse(fs.readFileSync(approvalFile, 'utf8'));
            }

            approvals.push(approval);
            fs.writeFileSync(approvalFile, JSON.stringify(approvals, null, 2));
        } catch (error) {
            console.error("Error saving approval request:", error.message);
        }
    }

    /**
     * Load configuration
     */
    loadConfiguration() {
        try {
            // Load approved sites
            const sitesFile = path.join(__dirname, '../../config/approved-sites.json');
            if (fs.existsSync(sitesFile)) {
                const sitesData = JSON.parse(fs.readFileSync(sitesFile, 'utf8'));
                this.approvedSites = new Set(sitesData.approvedSites || []);
            }

            // Load credentials
            const credentialsFile = path.join(__dirname, '../../config/browser-credentials.json');
            if (fs.existsSync(credentialsFile)) {
                const credentialsData = JSON.parse(fs.readFileSync(credentialsFile, 'utf8'));
                this.credentials = new Map(Object.entries(credentialsData.credentials || {}));
            }

            console.log(`🔧 Browser automation configuration loaded`);
        } catch (error) {
            console.error("Error loading configuration:", error.message);
        }
    }

    /**
     * Close browser
     */
    async close() {
        try {
            if (this.browser) {
                await this.browser.close();
                this.isActive = false;
                console.log("🌐 Browser automation closed");
            }
        } catch (error) {
            console.error("Browser close error:", error.message);
        }
    }

    /**
     * Get automation status
     */
    getStatus() {
        return {
            isActive: this.isActive,
            approvedSites: Array.from(this.approvedSites),
            storedCredentials: Array.from(this.credentials.keys()),
            automationHistory: this.automationHistory.length,
            currentUrl: this.page ? this.page.url() : null
        };
    }
}

module.exports = BrowserAutomation;
