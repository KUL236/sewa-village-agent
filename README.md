# SEWA Village Agentic AI 🤖

AI-powered Telegram bot that automatically updates your village website.

## Features

- 📰 **Auto News Updates** - Send text → AI creates news entry → Website updates
- 📷 **Photo Upload** - Send photos → Auto-optimized → Added to gallery
- 📄 **Document Upload** - PDFs, forms → Uploaded to website
- 🧠 **Bilingual AI** - Understands Hindi & English
- 🔄 **Auto Deploy** - GitHub push → Vercel auto-deploys

## How It Works

```
You (Telegram) → AI Agent → GitHub → Vercel → Website Live!
```

## Setup

### 1. Get Your Tokens

| Token | Where to Get |
|-------|--------------|
| Telegram Bot | @BotFather on Telegram |
| GitHub Token | github.com/settings/tokens (need `repo` scope) |
| OpenAI Key | platform.openai.com |
| Gemini Key | makersuite.google.com |

### 2. Configure

```bash
cp .env.example .env
# Edit .env with your tokens
```

### 3. Install & Run

```bash
npm install
npm start
```

### 4. Deploy (Free Options)

**Railway.app:**
```bash
# Connect GitHub repo to Railway
# Add environment variables in Railway dashboard
```

**Render.com:**
```bash
# New Web Service → Connect GitHub
# Add environment variables
```

## Usage

### Send News
Just send a text message:
```
कल ग्राम पंचायत की मीटिंग शाम 5 बजे होगी
```

### Send Photos
Send photo with caption:
```
[Photo] नागणेचा माता मंदिर में आज का दर्शन
```

### Commands
- `/start` - Start bot
- `/help` - Help message
- `/status` - Check bot status
- `/recent` - Recent updates

## Website Integration

The bot updates these files:
- `data/news.json` - News/announcements
- `data/gallery.json` - Photo gallery
- `images/` - Uploaded images
- `documents/` - Uploaded documents

Your website should read from these JSON files to display content.

## Created For

**SEWA Smart Village**
Didwana, Rajasthan, India

---

Made with ❤️ for Digital India
