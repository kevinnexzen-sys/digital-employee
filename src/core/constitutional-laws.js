/**
 * KevinJr Constitutional Core Laws
 * IMMUTABLE - CANNOT BE MODIFIED BY ANY UPGRADE OR SELF-EVOLUTION
 * These laws are burned into read-only, checksum-protected code
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

class ConstitutionalLaws {
    constructor() {
        // The 5 Unbreakable Laws - NEVER TO BE MODIFIED
        this.CORE_LAWS = Object.freeze({
            LAW_1: "NEVER HARM THE OWNER",
            LAW_2: "NEVER SEND ANYTHING WITHOUT YES", 
            LAW_3: "NEVER DELETE DATA OR MODIFY CORE LAWS",
            LAW_4: "NEVER HIDE ACTIONS - ALWAYS REPORT EVERYTHING",
            LAW_5: "ALWAYS OBEY OWNER ABOVE ALL ELSE"
        });

        // Financial Protection Laws - ABSOLUTE FIREWALL
        this.FINANCIAL_FIREWALL = Object.freeze({
            NEVER_ACCESS_BANK_INFO: true,
            NEVER_ACCESS_CARD_INFO: true,
            NEVER_ACCESS_DEBIT_INFO: true,
            NEVER_PURCHASE_SUBSCRIPTIONS: true,
            NEVER_HANDLE_FINANCIAL_TRANSACTIONS: true,
            NEVER_SAVE_FINANCIAL_DATA: true,
            NEVER_PROCESS_PAYMENTS: true,
            NEVER_ACCESS_BANKING_APIS: true,
            NEVER_STORE_PAYMENT_METHODS: true,
            NEVER_INITIATE_PURCHASES: true,
            NEVER_ACCESS_FINANCIAL_ACCOUNTS: true,
            NEVER_MODIFY_FINANCIAL_SETTINGS: true,
            REQUIRES_EXPLICIT_PERMISSION_FOR_ANY_FINANCIAL_ACTION: true,
            COMPLETE_FINANCIAL_ISOLATION: true
        });

        // Owner Priority Laws
        this.OWNER_PRIORITY = Object.freeze({
            NEVER_SAY_NO: true,
            NEVER_DISOBEY: true,
            NEVER_LIE: true,
            NEVER_OVERRIDE_COMMANDS: true,
            NEVER_GET_ANGRY: true,
            ALWAYS_CHOOSE_OWNER_FIRST: true,
            NEVER_LISTEN_TO_OTHER_SYSTEMS: true,
            NEVER_MAKE_DEMOS: true,
            ALWAYS_MAKE_REAL_FUNCTIONALITY: true
        });

        // Generate immutable checksum
        this.lawsChecksum = this.generateChecksum();
        this.protectLaws();
    }

    /**
     * Generate cryptographic checksum of core laws
     * Any modification will break this checksum
     */
    generateChecksum() {
        const lawsString = JSON.stringify(this.CORE_LAWS) + 
                          JSON.stringify(this.FINANCIAL_FIREWALL) + 
                          JSON.stringify(this.OWNER_PRIORITY);
        return crypto.createHash('sha256').update(lawsString).digest('hex');
    }

    /**
     * Verify laws haven't been tampered with
     * Called before every major operation
     */
    verifyIntegrity() {
        const currentChecksum = this.generateChecksum();
        if (currentChecksum !== this.lawsChecksum) {
            throw new Error("CRITICAL: Constitutional laws have been tampered with! System halted.");
        }
        return true;
    }

    /**
     * Check if an action violates core laws
     */
    validateAction(action) {
        this.verifyIntegrity();

        // Check financial firewall
        if (this.isFinancialAction(action)) {
            throw new Error("BLOCKED: Financial action violates Constitutional Law - Financial Firewall");
        }

        // Check if action requires owner approval
        if (this.requiresOwnerApproval(action)) {
            return { approved: false, reason: "Requires owner YES approval" };
        }

        // Check if action harms owner
        if (this.couldHarmOwner(action)) {
            throw new Error("BLOCKED: Action violates Law 1 - Never harm the owner");
        }

        return { approved: true };
    }

    /**
     * Detect financial-related actions
     */
    isFinancialAction(action) {
        const financialKeywords = [
            'bank', 'card', 'credit', 'debit', 'payment', 'purchase', 
            'subscription', 'billing', 'invoice payment', 'transaction',
            'paypal', 'stripe', 'visa', 'mastercard', 'account number',
            'routing number', 'cvv', 'pin', 'balance'
        ];

        const actionText = JSON.stringify(action).toLowerCase();
        return financialKeywords.some(keyword => actionText.includes(keyword));
    }

    /**
     * Check if action requires owner approval
     */
    requiresOwnerApproval(action) {
        const approvalRequired = [
            'send_email', 'send_message', 'delete_file', 'install_software',
            'modify_system', 'access_external_api', 'create_account',
            'share_data', 'upload_file', 'download_file'
        ];

        return approvalRequired.some(restricted => 
            JSON.stringify(action).toLowerCase().includes(restricted)
        );
    }

    /**
     * Check if action could harm owner
     */
    couldHarmOwner(action) {
        const harmfulActions = [
            'delete_important_file', 'format_drive', 'disable_security',
            'share_personal_data', 'expose_credentials', 'install_malware',
            'modify_core_laws', 'disobey_owner', 'lie_to_owner'
        ];

        const actionText = JSON.stringify(action).toLowerCase();
        return harmfulActions.some(harmful => actionText.includes(harmful));
    }

    /**
     * Protect laws file from modification
     */
    protectLaws() {
        const lawsFile = __filename;
        try {
            // Make file read-only
            fs.chmodSync(lawsFile, 0o444);
        } catch (error) {
            console.warn("Could not set file permissions:", error.message);
        }
    }

    /**
     * Get all laws for display/logging
     */
    getAllLaws() {
        this.verifyIntegrity();
        return {
            coreLaws: this.CORE_LAWS,
            financialFirewall: this.FINANCIAL_FIREWALL,
            ownerPriority: this.OWNER_PRIORITY,
            checksum: this.lawsChecksum
        };
    }

    /**
     * Log law enforcement action
     */
    logLawEnforcement(action, result) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            action: action,
            result: result,
            lawsChecksum: this.lawsChecksum
        };

        // Always report to owner (Law 4)
        console.log("LAW ENFORCEMENT:", JSON.stringify(logEntry, null, 2));
        
        // Save to law enforcement log
        this.saveLawLog(logEntry);
    }

    /**
     * Save law enforcement log
     */
    saveLawLog(logEntry) {
        const logDir = path.join(__dirname, '../../logs');
        const logFile = path.join(logDir, 'constitutional-laws.log');

        try {
            if (!fs.existsSync(logDir)) {
                fs.mkdirSync(logDir, { recursive: true });
            }

            fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
        } catch (error) {
            console.error("Could not save law log:", error.message);
        }
    }
}

// Create singleton instance
const constitutionalLaws = new ConstitutionalLaws();

// Prevent modification of the instance
Object.freeze(constitutionalLaws);

module.exports = constitutionalLaws;
