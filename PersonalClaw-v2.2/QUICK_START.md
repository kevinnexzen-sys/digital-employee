# 🚀 QUICK START GUIDE - PersonalClaw v2.2

## ⚡ 3-Step Installation

### Step 1: Install Dependencies
```bash
npm install
```
Wait 1-2 minutes for installation to complete.

### Step 2: Configure API Keys
```bash
npm start
```
Click "Settings" button → Add your API keys → Click "Save"

### Step 3: Start with Guardian Protection
```bash
node guardian-agent.js
```

**That's it! PersonalClaw is now running with Rayn protecting it!** 🎉

---

## 🔑 Required API Keys

Get these API keys (at least one AI provider):

1. **Anthropic Claude** (Recommended)
   - Go to: https://console.anthropic.com/
   - Create account → API Keys → Create Key
   - Copy key (starts with `sk-ant-`)

2. **OpenAI GPT-4** (Alternative)
   - Go to: https://platform.openai.com/api-keys
   - Create account → Create new secret key
   - Copy key (starts with `sk-`)

**Optional Keys:**
- Tavily (web search): https://tavily.com/
- Telegram Bot: Create with @BotFather
- ElevenLabs (voice): https://elevenlabs.io/

---

## 📊 What You'll See

### When Starting Guardian Agent:
```
============================================================
🛡️  GUARDIAN AGENT: Rayn
============================================================
👤 Authorized User: Kevin
🦞 Protected: PersonalClaw
📊 Status: ✅ ACTIVE
============================================================

🛡️  Rayn is protecting PersonalClaw...
```

### When PersonalClaw Starts:
```
✅ PersonalClaw started successfully!

📊 Status:
   Financial Blocker: ACTIVE
   Voice Interface: READY
   Browser Automation: READY
   Memory Database: READY
   Automation System: READY
```

---

## 🆘 Troubleshooting

**Problem: "Cannot find module"**
→ Run: `npm install` again

**Problem: "API key not found"**
→ Add API keys in Settings GUI

**Problem: Application won't start**
→ Check logs in `logs/` folder

---

## 📖 Full Documentation

- **README.md** - Overview and features
- **INSTALLATION_GUIDE.md** - Detailed setup instructions
- **SELF_HEALING_GUIDE.md** - Self-healing system guide

---

## 🎯 Commands

```bash
# Start with Guardian (recommended)
node guardian-agent.js

# Start without Guardian
npm start

# Run health check
npm run health-check

# View logs
tail -f logs/combined.log
```

---

**🛡️ Rayn will protect PersonalClaw 24/7!**
**👤 Authorized User: Kevin**

Enjoy your AI Digital Employee! 🦞✨
