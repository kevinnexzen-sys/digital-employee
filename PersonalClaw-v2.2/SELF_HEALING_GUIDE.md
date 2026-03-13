# 🤖 PersonalClaw Self-Healing System

## What is Self-Healing?

PersonalClaw includes an **intelligent self-healing system** that can:
- 🔍 **Detect broken code** automatically
- 🌐 **Search online** for solutions using AI
- 🔧 **Fix issues** automatically (with your permission)
- 📊 **Show notifications** when problems are found
- 📝 **Keep history** of all fixes applied

---

## How It Works

### 1. **Automatic Diagnostics** 🔍

PersonalClaw runs health checks:
- **On Startup** - Checks for issues when you start the app
- **Periodically** - Runs checks every hour (configurable)
- **On Demand** - You can trigger a health check anytime

**What it checks:**
- ✅ All required files exist
- ✅ Dependencies are installed
- ✅ No syntax errors in code
- ✅ Configuration is valid
- ✅ Core modules can load
- ✅ API keys are configured

### 2. **AI-Powered Solution Search** 🌐

When an issue is found:
1. **Analyzes the problem** using AI
2. **Searches for solutions** online (GitHub, Stack Overflow, docs)
3. **Evaluates confidence** level (0-100%)
4. **Suggests fix** with step-by-step instructions

### 3. **User Notification** 📢

You'll see a notification like this:

```
┌─────────────────────────────────────────┐
│ 📦 Missing Package Detected             │
├─────────────────────────────────────────┤
│ Missing dependency: better-sqlite3      │
│                                          │
│ 🔍 Diagnosis:                           │
│ NPM package is not installed            │
│                                          │
│ 💡 Suggested Fix:                       │
│ Run: npm install better-sqlite3         │
│                                          │
│ Confidence: High (90%)                  │
│                                          │
│ Would you like me to fix this?          │
│                                          │
│ [Fix Now] [Show Details] [Ignore]       │
└─────────────────────────────────────────┘
```

### 4. **Apply Fix (With Your Permission)** 🔧

When you click **"Fix Now"**:
1. **Asks for confirmation** - Shows what will be changed
2. **Creates backup** - Saves original files
3. **Applies fix** - Makes the changes
4. **Tests result** - Verifies fix worked
5. **Shows result** - Success or failure notification

---

## Types of Issues It Can Fix

### ✅ **Automatically Fixable:**

1. **Missing Dependencies** 📦
   - Detects: Package not installed
   - Fix: Runs `npm install <package>`
   - Example: `npm install better-sqlite3`

2. **Mixed Module Systems** 🔄
   - Detects: File uses both `require()` and `import`
   - Fix: Converts all `require()` to `import`
   - Example: Changes `const fs = require('fs')` to `import fs from 'fs'`

3. **Invalid Config Paths** ⚙️
   - Detects: Code uses wrong config path
   - Fix: Updates to correct path
   - Example: Changes `config.openai.apiKey` to `config.llm.openai.apiKey`

4. **Syntax Errors** ❌
   - Detects: Common JavaScript errors
   - Fix: Corrects syntax based on AI analysis
   - Example: Adds missing semicolons, fixes brackets

### ⚠️ **Requires Manual Action:**

1. **Missing API Keys** 🔑
   - Notification: "Please add API key in Settings"
   - Action: Opens Settings GUI

2. **Missing Files** 📄
   - Notification: "File missing, please restore"
   - Action: Shows download link

3. **Critical Errors** 🚨
   - Notification: "Manual intervention required"
   - Action: Shows detailed error and documentation

---

## Notification Actions

### **Fix Now** 🔧
- Applies the fix immediately
- Creates backup before changing files
- Shows progress and result

### **Show Details** 📋
- Shows full diagnostic report
- Displays AI analysis
- Lists resources (GitHub, docs, Stack Overflow)
- Shows old code vs new code comparison

### **Ignore** 🙈
- Dismisses notification
- Issue won't be shown again this session
- Can re-scan later

---

## Safety Features

### 🛡️ **Always Safe:**

1. **Requires Permission** ✋
   - Never fixes anything without asking
   - Shows exactly what will change
   - You approve every fix

2. **Creates Backups** 💾
   - Original files saved as `.backup`
   - Can restore if fix doesn't work
   - Backup location shown in notification

3. **Confidence Scoring** 📊
   - High (80-100%): Very likely to work
   - Medium (60-79%): Should work, test after
   - Low (0-59%): Experimental, review carefully

4. **Fix History** 📝
   - Records all fixes applied
   - Shows success/failure
   - Can review and undo

5. **Test After Fix** ✅
   - Automatically tests if fix worked
   - Rolls back if test fails
   - Shows clear success/failure message

---

## How to Use

### **Enable Self-Healing:**

1. Open PersonalClaw Settings
2. Go to "Advanced" tab
3. Enable "Self-Healing System"
4. Choose notification preferences

### **Run Health Check:**

**Option 1: Automatic (Recommended)**
- Runs on startup
- Runs every hour
- Runs after errors

**Option 2: Manual**
- Click "Health Check" button in dashboard
- Or run: `npm run health-check`

### **Review Notifications:**

1. Click notification icon (🔔) in dashboard
2. See list of issues found
3. Click on issue to see details
4. Choose action: Fix, Details, or Ignore

### **Apply Fix:**

1. Click "Fix Now" on notification
2. Review what will change
3. Click "Confirm" to apply
4. Wait for result
5. See success message or error

### **View Fix History:**

1. Go to Settings → Advanced
2. Click "Fix History"
3. See all fixes applied
4. Can restore backups if needed

---

## Examples

### Example 1: Missing Package

**Issue Detected:**
```
Missing dependency: playwright@^1.42.0
```

**AI Analysis:**
```
Diagnosis: NPM package 'playwright' is not installed
Solution: Run npm install playwright@^1.42.0
Confidence: 95%
Resources: https://playwright.dev/docs/intro
```

**Fix Applied:**
```bash
npm install playwright@^1.42.0
```

**Result:**
```
✅ Successfully installed playwright@^1.42.0
Backup: Not needed (no files changed)
```

---

### Example 2: Code Compatibility

**Issue Detected:**
```
File mixes CommonJS and ES modules
File: src/memory/database.js
```

**AI Analysis:**
```
Diagnosis: File uses both require() and import statements
Solution: Convert all require() to import
Confidence: 85%
Resources: https://nodejs.org/api/esm.html
```

**Changes:**
```javascript
// OLD CODE:
const fs = require('fs');
import Database from 'better-sqlite3';

// NEW CODE:
import fs from 'fs';
import Database from 'better-sqlite3';
```

**Result:**
```
✅ Converted require() to import in src/memory/database.js
Backup: src/memory/database.js.backup
```

---

### Example 3: Config Path Error

**Issue Detected:**
```
Invalid config path: config.openai.apiKey
File: src/voice/speech-to-text.js
```

**AI Analysis:**
```
Diagnosis: Config structure changed, path is outdated
Solution: Update to config.llm.openai.apiKey
Confidence: 90%
Resources: See src/utils/config.js
```

**Changes:**
```javascript
// OLD CODE:
if (!config.openai.apiKey) {

// NEW CODE:
if (!config.llm.openai.apiKey) {
```

**Result:**
```
✅ Updated config paths in src/voice/speech-to-text.js
Backup: src/voice/speech-to-text.js.backup
```

---

## Configuration

### Settings Options:

```javascript
{
  "selfHealing": {
    "enabled": true,              // Enable/disable system
    "autoFix": false,             // Auto-fix without asking (not recommended)
    "checkOnStartup": true,       // Run check when app starts
    "checkInterval": 3600000,     // Check every hour (ms)
    "notificationLevel": "all",   // "all", "high", "critical"
    "createBackups": true,        // Always create backups
    "minConfidence": 60           // Minimum confidence to suggest fix
  }
}
```

### Notification Levels:

- **All**: Show all issues (recommended)
- **High**: Only high and critical severity
- **Critical**: Only critical issues

---

## Troubleshooting

### **Self-Healing Not Working?**

1. Check if enabled in Settings
2. Make sure AI provider (Claude/GPT-4) is configured
3. Check logs in `logs/self-healing.log`
4. Try manual health check

### **Fix Failed?**

1. Check error message in notification
2. Review backup file (`.backup`)
3. Restore backup if needed
4. Report issue with error details

### **False Positives?**

1. Click "Ignore" on notification
2. Issue won't show again this session
3. Can add to ignore list in Settings

---

## Advanced Features

### **Custom Fix Rules:**

Create `self-healing-rules.json`:
```json
{
  "rules": [
    {
      "pattern": "config\\.openai",
      "replace": "config.llm.openai",
      "confidence": 95
    }
  ]
}
```

### **Fix History Export:**

```bash
npm run export-fix-history
```

Creates `fix-history-YYYY-MM-DD.json` with all fixes.

### **Restore Backup:**

```bash
npm run restore-backup <file.js.backup>
```

---

## FAQ

**Q: Will it break my code?**
A: No! It always creates backups and asks permission first.

**Q: Can I disable it?**
A: Yes, in Settings → Advanced → Disable Self-Healing

**Q: Does it send my code online?**
A: Only issue descriptions are sent to AI (Claude/GPT-4). No full code is uploaded.

**Q: What if I don't trust a fix?**
A: Click "Show Details" to review, or "Ignore" to skip it.

**Q: Can I undo a fix?**
A: Yes! Backup files are created. Restore from Settings → Fix History.

---

## Summary

The Self-Healing System:
- ✅ **Detects issues** automatically
- ✅ **Finds solutions** using AI
- ✅ **Asks permission** before fixing
- ✅ **Creates backups** always
- ✅ **Shows notifications** clearly
- ✅ **Keeps history** of all fixes
- ✅ **Safe and transparent**

**You're always in control!** 🎮

---

**Enjoy worry-free PersonalClaw! 🦞**
