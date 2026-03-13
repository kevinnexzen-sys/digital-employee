# PersonalClaw Installation Guide

Complete step-by-step installation instructions for PersonalClaw.

## Prerequisites

### Required Software
- **Node.js 20+** - [Download](https://nodejs.org/)
- **npm 10+** (comes with Node.js)
- **Git** - [Download](https://git-scm.com/)

### Optional (for full functionality)
- **Redis** - For task queuing (optional)
- **Python 3.8+** - For advanced OCR features (optional)

## Installation Steps

### 1. Clone or Download Repository

```bash
# If using git
git clone https://github.com/yourusername/personalclaw.git
cd personalclaw

# Or download and extract the ZIP file
```

### 2. Install Dependencies

```bash
npm install
```

This will install all required packages (~50 dependencies).

**Expected time:** 2-5 minutes depending on your internet connection.

### 3. Configure Environment

```bash
# Copy the example environment file
cp .env.example .env

# Edit the .env file with your settings
nano .env  # or use any text editor
```

### 4. Required Configuration

Edit `.env` and set these **required** values:

```env
# AI Provider (choose one)
ANTHROPIC_API_KEY=sk-ant-your-key-here
# OR
OPENAI_API_KEY=sk-your-openai-key-here

# Telegram Bot (for confirmations)
TELEGRAM_BOT_TOKEN=your-bot-token
TELEGRAM_CHAT_ID=your-chat-id

# User Configuration
USER_ID=your-unique-id
USER_EMAIL=your-email@example.com
```

#### Getting API Keys

**Anthropic (Claude):**
1. Go to https://console.anthropic.com/
2. Sign up or log in
3. Go to API Keys section
4. Create a new API key
5. Copy and paste into `.env`

**OpenAI (GPT-4):**
1. Go to https://platform.openai.com/
2. Sign up or log in
3. Go to API Keys section
4. Create a new API key
5. Copy and paste into `.env`

**Telegram Bot:**
1. Open Telegram and search for @BotFather
2. Send `/newbot` command
3. Follow instructions to create your bot
4. Copy the bot token
5. To get your chat ID:
   - Send a message to your bot
   - Visit: `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
   - Find your chat ID in the response
6. Paste both values into `.env`

### 5. Create Required Directories

```bash
mkdir -p data/screenshots data/chroma logs
```

### 6. Test Installation

```bash
# Test the gateway server
npm run gateway

# You should see:
# 🦞 PersonalClaw Gateway started
# HTTP: http://127.0.0.1:18789
# WebSocket: ws://127.0.0.1:18789
```

Press `Ctrl+C` to stop.

### 7. Start PersonalClaw

```bash
# Start all services
npm start

# Or start gateway separately
npm run gateway
```

## Verification

### Check if Everything Works

1. **Gateway Server:**
   ```bash
   curl http://localhost:18789/health
   # Should return: {"status":"ok","uptime":...}
   ```

2. **Financial Blocker:**
   ```bash
   curl http://localhost:18789/api/security/stats
   # Should return statistics
   ```

3. **Telegram Bot:**
   - Send `/start` to your bot
   - You should receive a welcome message

4. **Screen Watcher:**
   - Check logs: `tail -f logs/combined.log`
   - Should see "Screen watcher started" if enabled

## Troubleshooting

### Common Issues

#### 1. "Cannot find module" errors

**Solution:**
```bash
rm -rf node_modules package-lock.json
npm install
```

#### 2. "Port already in use"

**Solution:**
```bash
# Change port in .env
PORT=18790  # or any other available port
```

#### 3. Telegram bot not responding

**Solution:**
- Verify bot token is correct
- Check chat ID is correct
- Ensure bot is not blocked
- Check logs: `tail -f logs/error.log`

#### 4. Screen watcher not working

**Solution:**
- Ensure you have screen capture permissions
- On macOS: System Preferences → Security & Privacy → Screen Recording
- On Windows: Run as Administrator (first time only)

#### 5. LLM API errors

**Solution:**
- Verify API key is correct
- Check API key has credits/quota
- Test API key directly:
  ```bash
  curl https://api.anthropic.com/v1/messages \
    -H "x-api-key: YOUR_KEY" \
    -H "anthropic-version: 2023-06-01"
  ```

### Getting Help

If you encounter issues:

1. Check logs: `tail -f logs/error.log`
2. Enable debug mode in `.env`: `DEBUG=true`
3. Check GitHub Issues
4. Join our Discord community

## Next Steps

After successful installation:

1. **Configure Telegram Bot** - Set up confirmation system
2. **Test Financial Blocker** - Try accessing a blocked site
3. **Enable Screen Watcher** - Start pattern detection
4. **Customize Settings** - Adjust `.env` to your preferences
5. **Read Documentation** - Check README.md for usage examples

## Updating

To update PersonalClaw:

```bash
git pull origin main
npm install
npm start
```

## Uninstalling

To completely remove PersonalClaw:

```bash
# Stop all services
npm stop

# Remove files
cd ..
rm -rf personalclaw

# Remove data (optional)
rm -rf ~/.personalclaw
```

## Security Notes

- **Never share your `.env` file** - It contains sensitive API keys
- **Keep API keys secure** - Rotate them regularly
- **Financial blocker is always active** - Cannot be disabled
- **All data is stored locally** - No cloud sync by default
- **Audit logs track all actions** - Review regularly

## Performance Tips

1. **Adjust screen watch interval** - Higher = less CPU usage
2. **Limit screenshot retention** - Saves disk space
3. **Use Redis for task queue** - Better performance
4. **Enable log rotation** - Prevents large log files

## System Requirements

### Minimum
- CPU: 2 cores
- RAM: 2 GB
- Disk: 5 GB free space
- OS: Windows 10+, macOS 10.15+, Linux (Ubuntu 20.04+)

### Recommended
- CPU: 4+ cores
- RAM: 4+ GB
- Disk: 10+ GB free space
- SSD for better performance

## License

MIT License - See LICENSE file for details

---

**Installation complete!** 🎉

You're now ready to use PersonalClaw. Check the README.md for usage examples and features.
