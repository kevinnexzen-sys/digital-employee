# 🦞 PersonalClaw - Complete Setup Instructions

## 📋 Table of Contents
1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Configuration](#configuration)
4. [Running PersonalClaw](#running-personalclaw)
5. [Using Skills Engine](#using-skills-engine)
6. [Troubleshooting](#troubleshooting)

---

## 1️⃣ Prerequisites

### Required Software:
- **Node.js** 18+ (with npm)
- **Python** 3.9+
- **Git**

### Required API Keys:
- **Anthropic Claude API** or **OpenAI GPT-4 API**
- **Telegram Bot Token** (from @BotFather)
- **Search API** (choose one):
  - Tavily API (recommended)
  - SerpAPI
  - Bing Search API

### Optional:
- **ElevenLabs API** (for text-to-speech)
- **Google Calendar API** (for calendar integration)
- **Gmail API** (for email integration)

---

## 2️⃣ Installation

### Step 1: Extract PersonalClaw
```bash
# Extract the archive
unzip PersonalClaw.zip
cd PersonalClaw
```

### Step 2: Install Node.js Dependencies
```bash
npm install
```

**This installs:**
- Playwright (browser automation)
- better-sqlite3 (database)
- Winston (logging)
- Express & Socket.io (web server)
- Telegram Bot API
- And more...

### Step 3: Install Python Dependencies (Optional)
```bash
# For skills that use Python
pip3 install requests schedule
```

### Step 4: Install Playwright Browsers
```bash
npx playwright install chromium
```

---

## 3️⃣ Configuration

### Step 1: Create Environment File
```bash
cp .env.example .env
```

### Step 2: Edit `.env` File

Open `.env` in your text editor and fill in your API keys:

```bash
# === LLM Provider ===
LLM_PROVIDER=anthropic          # or 'openai'
ANTHROPIC_API_KEY=sk-ant-xxx    # Your Claude API key
OPENAI_API_KEY=sk-xxx           # Your OpenAI API key (if using GPT-4)

# === Search Provider ===
SEARCH_PROVIDER=tavily          # or 'serpapi' or 'bing'
TAVILY_API_KEY=tvly-xxx         # Your Tavily API key
SERPAPI_API_KEY=xxx             # Your SerpAPI key (if using)
BING_SEARCH_API_KEY=xxx         # Your Bing key (if using)

# === Telegram ===
TELEGRAM_BOT_TOKEN=123456:ABC-DEF  # From @BotFather
TELEGRAM_CHAT_ID=123456789         # Your Telegram user ID

# === Voice (Optional) ===
ELEVENLABS_API_KEY=xxx          # For text-to-speech
WHISPER_API_KEY=xxx             # For speech-to-text

# === Server ===
PORT=18789
HOST=127.0.0.1

# === Database ===
DATABASE_PATH=./data/personalclaw.db

# === Logging ===
LOG_LEVEL=info
```

### Step 3: Get Your Telegram Chat ID

1. Start a chat with your bot
2. Send any message
3. Visit: `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
4. Find your `chat.id` in the response
5. Add it to `.env`

---

## 4️⃣ Running PersonalClaw

### Option A: Desktop App (Recommended)

```bash
npm run desktop
```

**Features:**
- System tray icon
- Overlay window
- Global shortcuts:
  - `Ctrl+Alt+C` - Toggle main window
  - `Ctrl+Alt+O` - Toggle overlay
  - `Ctrl+Alt+P` - Pause agent

### Option B: Server Only

```bash
npm start
```

Then open: `http://127.0.0.1:18789`

### Option C: Development Mode

```bash
npm run dev
```

---

## 5️⃣ Using Skills Engine

### Command Format

PersonalClaw understands these commands:

#### **Create a New Skill**
```
new: create a function that checks website uptime every minute
```

**What happens:**
1. 🔍 Searches web for "website uptime monitoring python"
2. 🤖 Generates executable Python code
3. 📱 Sends screenshot + code to Telegram for approval
4. 💾 Saves skill to `./skills/` directory
5. 📦 Installs dependencies automatically

#### **List All Skills**
```
list
```

**Output:**
```
Found 3 skill(s):
1. uptime_monitor (Python, v1)
2. pdf_merger (Python, v2)
3. data_scraper (JavaScript, v1)
```

#### **Run a Skill**
```
run uptime_monitor --url https://mysite.com --interval 60
```

**What happens:**
1. 📱 Sends confirmation request to Telegram
2. ✅ You approve
3. 🚀 Executes the actual Python script
4. 📊 Returns real output

#### **Customize a Skill**
```
customize uptime_monitor add slack notifications instead of email
```

**What happens:**
1. 🔍 Searches "slack webhook python"
2. 🤖 Modifies the code
3. 📱 Shows changes in Telegram
4. ✅ You approve
5. 💾 Saves as version 2

#### **View History**
```
history uptime_monitor
```

**Output:**
```
Version 1: Created 2025-03-13
Version 2: Added slack notifications (2025-03-13)
```

#### **Export a Skill**
```
export uptime_monitor
```

**Output:**
```
✅ Skill exported to: ./exports/uptime_monitor_export.py
```

#### **Delete a Skill**
```
delete uptime_monitor
```

**Requires Telegram confirmation!**

---

## 6️⃣ Troubleshooting

### Issue: "API key not found"
**Solution:** Check your `.env` file has the correct API keys

### Issue: "Telegram not responding"
**Solution:** 
1. Check bot token is correct
2. Make sure you've started a chat with the bot
3. Verify chat ID is correct

### Issue: "Playwright browser not found"
**Solution:**
```bash
npx playwright install chromium
```

### Issue: "Permission denied" on database
**Solution:**
```bash
chmod 600 ./data/personalclaw.db
```

### Issue: "Skill execution failed"
**Solution:**
1. Check if dependencies are installed
2. View logs: `./logs/combined.log`
3. Try running the skill file directly:
   ```bash
   python3 ./skills/uptime_monitor.py
   ```

### Issue: "Search API not working"
**Solution:**
1. Verify API key is correct
2. Check API quota/limits
3. Try a different search provider

---

## 📁 Directory Structure

```
PersonalClaw/
├── src/                    # Source code
│   ├── agent/             # LLM agent
│   ├── skills-engine/     # Search-to-skill system
│   ├── tools/             # Browser, files, etc.
│   └── ...
├── desktop/               # Electron app
├── skills/                # Generated skills (created on first run)
│   ├── .metadata/        # Skill metadata
│   └── .versions/        # Version history
├── data/                  # Database
├── logs/                  # Log files
├── .env                   # Your configuration
└── package.json

```

---

## 🔐 Security Notes

1. **Never share your `.env` file** - Contains API keys
2. **Review skills before running** - Check Telegram confirmation
3. **Skills are sandboxed** - 60s timeout, 10MB limit
4. **Financial sites blocked** - Cannot access banks, crypto, etc.
5. **All actions require approval** - Via Telegram

---

## 🚀 Quick Start Example

```bash
# 1. Install
npm install

# 2. Configure
cp .env.example .env
# Edit .env with your API keys

# 3. Run
npm run desktop

# 4. Create your first skill
# In PersonalClaw, type:
new: create a function that fetches weather data

# 5. Approve on Telegram

# 6. Run it
run weather_data --city London

# Done! 🎉
```

---

## 📚 Additional Resources

- **Logs:** `./logs/combined.log`
- **Skills:** `./skills/`
- **Database:** `./data/personalclaw.db`
- **Documentation:** `./documentation/`

---

## 💡 Tips

1. **Start simple** - Create basic skills first
2. **Use descriptive requests** - "create a function that..." works best
3. **Check Telegram** - All confirmations go there
4. **Review code** - Skills are saved as readable files
5. **Iterate** - Use `customize` to improve skills

---

## ✅ Verification Checklist

Before using PersonalClaw, verify:

- [ ] Node.js 18+ installed
- [ ] Python 3.9+ installed
- [ ] `npm install` completed successfully
- [ ] `.env` file created and filled
- [ ] Telegram bot token configured
- [ ] Telegram chat ID configured
- [ ] At least one LLM API key (Claude or OpenAI)
- [ ] At least one search API key (Tavily, SerpAPI, or Bing)
- [ ] Playwright browsers installed
- [ ] Desktop app launches successfully

---

**Need help?** Check the logs in `./logs/` or review the documentation in `./documentation/`

**Ready to go!** 🦞✨
