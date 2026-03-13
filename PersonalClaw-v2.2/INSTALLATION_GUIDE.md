# 🦞 PersonalClaw Installation Guide

## Easy Installation - No Code Editing Required!

PersonalClaw comes with a **user-friendly Settings GUI** where you can add all your API keys through a simple interface. **You don't need to edit any code files!**

---

## 📦 Step 1: Download & Extract

1. Download `PersonalClaw-Complete-v2.2-FINAL.tar.gz`
2. Extract the archive to a folder (e.g., `C:\PersonalClaw`)
3. Open Command Prompt or PowerShell in that folder

---

## 🔧 Step 2: Install Dependencies

Run this command in the PersonalClaw folder:

```bash
npm install
```

This will install all required packages. **Wait for it to complete** (takes 1-2 minutes).

---

## ⚙️ Step 3: Configure Settings (Easy Way!)

### Option A: Using the Settings GUI (Recommended)

1. **Start PersonalClaw:**
   ```bash
   npm start
   ```

2. **Click "Settings" button** in the application window

3. **Add your API keys** in the Settings window:
   - **Anthropic API Key** (Required) - Get from [console.anthropic.com](https://console.anthropic.com/)
   - **OpenAI API Key** (Required) - Get from [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
   - **Tavily API Key** (Optional) - For web search from [tavily.com](https://tavily.com/)
   - **Telegram Bot Token** (Optional) - Create bot with [@BotFather](https://t.me/botfather)
   - **ElevenLabs API Key** (Optional) - For voice from [elevenlabs.io](https://elevenlabs.io/)

4. **Click "Save Settings"**

5. **Restart PersonalClaw** for changes to take effect

### Option B: Manual Configuration (If GUI doesn't work)

If the GUI doesn't open, you can create a `.env` file manually:

1. Create a file named `.env` in the PersonalClaw folder
2. Copy and paste this template:

```env
# PersonalClaw Configuration

# AI Providers (At least one required)
ANTHROPIC_API_KEY=your_anthropic_key_here
OPENAI_API_KEY=your_openai_key_here
LLM_PROVIDER=anthropic

# Search Provider (Optional)
SEARCH_PROVIDER=tavily
TAVILY_API_KEY=your_tavily_key_here

# Telegram Integration (Optional)
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_CHAT_ID=your_telegram_chat_id

# Voice Integration (Optional)
ELEVENLABS_API_KEY=your_elevenlabs_key

# Server Configuration
PORT=18789
HOST=127.0.0.1

# Features
SCREEN_WATCH_ENABLED=false
BROWSER_HEADLESS=false
ENABLE_FINANCIAL_BLOCKER=true

# Logging
LOG_LEVEL=info
```

3. **Replace the placeholder values** with your actual API keys
4. **Save the file**

---

## 🚀 Step 4: Start PersonalClaw

```bash
npm start
```

You should see:

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

## 🔑 Where to Get API Keys

### Required Keys:

1. **Anthropic (Claude AI)**
   - Go to: https://console.anthropic.com/
   - Sign up / Log in
   - Go to "API Keys"
   - Click "Create Key"
   - Copy the key (starts with `sk-ant-`)

2. **OpenAI (GPT-4)**
   - Go to: https://platform.openai.com/api-keys
   - Sign up / Log in
   - Click "Create new secret key"
   - Copy the key (starts with `sk-`)

### Optional Keys:

3. **Tavily (Web Search)**
   - Go to: https://tavily.com/
   - Sign up for free account
   - Get API key from dashboard

4. **Telegram Bot**
   - Open Telegram
   - Search for `@BotFather`
   - Send `/newbot`
   - Follow instructions
   - Copy the bot token

5. **ElevenLabs (Voice)**
   - Go to: https://elevenlabs.io/
   - Sign up
   - Go to Profile → API Keys
   - Copy your API key

---

## 🎯 Quick Start Checklist

- [ ] Downloaded and extracted PersonalClaw
- [ ] Ran `npm install`
- [ ] Got Anthropic API key
- [ ] Got OpenAI API key
- [ ] Added keys through Settings GUI (or `.env` file)
- [ ] Started PersonalClaw with `npm start`
- [ ] Saw "PersonalClaw started successfully!" message

---

## ❓ Troubleshooting

### "Cannot find module" error
**Solution:** Run `npm install` again

### "API key not found" error
**Solution:** 
1. Open Settings GUI and add your API keys
2. Or check your `.env` file has the correct keys
3. Restart PersonalClaw

### Settings GUI doesn't open
**Solution:** Use Option B (Manual Configuration) above

### Application won't start
**Solution:**
1. Make sure Node.js 20+ is installed
2. Delete `node_modules` folder
3. Run `npm install` again
4. Try starting again

---

## 🎉 You're Done!

PersonalClaw is now ready to use. You can:
- Chat with your AI assistant
- Automate tasks
- Browse the web
- Send Telegram messages
- Use voice commands (if configured)

**No code editing required!** Everything is configured through the Settings GUI.

---

## 📝 Notes

- **Financial Blocker** is always active and cannot be disabled (for your security)
- API keys are stored locally in the `.env` file
- You can change settings anytime through the Settings GUI
- Restart PersonalClaw after changing settings

---

## 🆘 Need Help?

If you encounter any issues:
1. Check the logs in the `logs/` folder
2. Make sure all API keys are valid
3. Try the "Test" button in Settings GUI to verify API keys
4. Restart PersonalClaw

---

**Enjoy your AI Digital Employee! 🦞**
