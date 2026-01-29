/**
 * SEWA Village Agentic AI
 * 
 * Telegram Bot that automatically updates your village website
 * - Receives messages, photos, documents via Telegram
 * - Uses AI to understand and categorize content
 * - Pushes updates to GitHub → Vercel auto-deploys
 * 
 * Created for: SEWA Smart Village, Didwana, Rajasthan
 */

require('dotenv').config();
const { Telegraf } = require('telegraf');
const { Octokit } = require('octokit');
const OpenAI = require('openai');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const express = require('express');
const axios = require('axios');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');

// ============ Configuration ============
const config = {
  telegram: {
    token: process.env.TELEGRAM_BOT_TOKEN,
    adminIds: process.env.ADMIN_IDS?.split(',').map(id => parseInt(id.trim())) || []
  },
  github: {
    token: process.env.GITHUB_TOKEN,
    owner: process.env.GITHUB_OWNER || 'KUL236',
    repo: process.env.GITHUB_REPO || 'sewa-digital-ganv',
    branch: process.env.GITHUB_BRANCH || 'main'
  },
  ai: {
    openaiKey: process.env.OPENAI_API_KEY,
    geminiKey: process.env.GEMINI_API_KEY
  },
  server: {
    port: process.env.PORT || 3000
  }
};

// ============ Initialize Services ============
const bot = new Telegraf(config.telegram.token);
const octokit = new Octokit({ auth: config.github.token });
const app = express();

// AI Clients
let openai = null;
let genAI = null;

if (config.ai.openaiKey) {
  openai = new OpenAI({ apiKey: config.ai.openaiKey });
}
if (config.ai.geminiKey) {
  genAI = new GoogleGenerativeAI(config.ai.geminiKey);
}

// ============ Content Categories ============
const CATEGORIES = {
  NEWS: 'news',
  EVENT: 'event',
  PHOTO_GALLERY: 'gallery',
  DOCUMENT: 'document',
  HERITAGE: 'heritage',
  EMERGENCY: 'emergency',
  CONTACT: 'contact',
  ANNOUNCEMENT: 'announcement'
};

// ============ AI Functions ============

/**
 * Analyze content using AI (tries OpenAI first, falls back to Gemini)
 */
async function analyzeContent(text, hasImage = false) {
  const prompt = `
You are an AI assistant for SEWA Smart Village website (Didwana, Rajasthan, India).
Analyze the following content and respond in JSON format:

Content: "${text}"
Has Image: ${hasImage}

Respond with this exact JSON structure:
{
  "category": "news|event|gallery|document|heritage|emergency|contact|announcement",
  "title_hindi": "शीर्षक हिंदी में",
  "title_english": "Title in English",
  "description_hindi": "विवरण हिंदी में",
  "description_english": "Description in English",
  "suggested_section": "which section of website this belongs to",
  "priority": "high|medium|low",
  "tags": ["tag1", "tag2"]
}

Guidelines:
- If about temple/mandir/heritage → category: heritage
- If about emergency/ambulance/police → category: emergency
- If general photo → category: gallery
- If announcement/notice → category: announcement
- If event/mela/function → category: event
- If news/update → category: news
`;

  try {
    // Try OpenAI first
    if (openai) {
      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' }
      });
      return JSON.parse(response.choices[0].message.content);
    }
    
    // Fallback to Gemini
    if (genAI) {
      const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    }
    
    throw new Error('No AI service available');
  } catch (error) {
    console.error('AI Analysis Error:', error);
    // Return default categorization
    return {
      category: hasImage ? 'gallery' : 'news',
      title_hindi: text.slice(0, 50),
      title_english: text.slice(0, 50),
      description_hindi: text,
      description_english: text,
      suggested_section: 'general',
      priority: 'medium',
      tags: []
    };
  }
}

// ============ GitHub Functions ============

/**
 * Get file content from GitHub
 */
async function getFileFromGitHub(path) {
  try {
    const response = await octokit.rest.repos.getContent({
      owner: config.github.owner,
      repo: config.github.repo,
      path: path,
      ref: config.github.branch
    });
    
    const content = Buffer.from(response.data.content, 'base64').toString('utf-8');
    return { content, sha: response.data.sha };
  } catch (error) {
    if (error.status === 404) {
      return { content: null, sha: null };
    }
    throw error;
  }
}

/**
 * Create or update file on GitHub
 */
async function updateFileOnGitHub(path, content, message, sha = null) {
  const params = {
    owner: config.github.owner,
    repo: config.github.repo,
    path: path,
    message: message,
    content: Buffer.from(content).toString('base64'),
    branch: config.github.branch
  };
  
  if (sha) {
    params.sha = sha;
  }
  
  const response = await octokit.rest.repos.createOrUpdateFileContents(params);
  return response.data;
}

/**
 * Upload image to GitHub
 */
async function uploadImageToGitHub(imageBuffer, filename) {
  // Optimize image
  const optimizedBuffer = await sharp(imageBuffer)
    .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toBuffer();
  
  const path = `images/${filename}`;
  const message = `📷 Add image: ${filename}`;
  
  await updateFileOnGitHub(path, optimizedBuffer, message);
  return path;
}

// ============ Website Update Functions ============

/**
 * Add news/announcement to website
 */
async function addNewsToWebsite(analysis, imagePath = null) {
  const newsId = uuidv4().slice(0, 8);
  const date = new Date().toLocaleDateString('hi-IN');
  
  // Create news HTML snippet
  const newsHTML = `
<!-- News Item: ${newsId} - Added on ${date} -->
<div class="news-item" id="news-${newsId}">
  <div class="news-date">${date}</div>
  <h3 class="news-title">${analysis.title_hindi}</h3>
  <p class="news-title-en">${analysis.title_english}</p>
  ${imagePath ? `<img src="${imagePath}" alt="${analysis.title_hindi}" class="news-image">` : ''}
  <p class="news-description">${analysis.description_hindi}</p>
  <p class="news-description-en">${analysis.description_english}</p>
</div>
`;

  // Get current news data file or create new one
  let { content, sha } = await getFileFromGitHub('data/news.json');
  
  let newsData = [];
  if (content) {
    try {
      newsData = JSON.parse(content);
    } catch (e) {
      newsData = [];
    }
  }
  
  // Add new news item
  newsData.unshift({
    id: newsId,
    date: date,
    timestamp: Date.now(),
    title_hindi: analysis.title_hindi,
    title_english: analysis.title_english,
    description_hindi: analysis.description_hindi,
    description_english: analysis.description_english,
    image: imagePath,
    category: analysis.category,
    priority: analysis.priority,
    tags: analysis.tags
  });
  
  // Keep only last 50 news items
  newsData = newsData.slice(0, 50);
  
  // Update news.json
  await updateFileOnGitHub(
    'data/news.json',
    JSON.stringify(newsData, null, 2),
    `📰 Add news: ${analysis.title_english.slice(0, 50)}`,
    sha
  );
  
  return { newsId, newsHTML };
}

/**
 * Add photo to gallery
 */
async function addPhotoToGallery(imagePath, analysis) {
  let { content, sha } = await getFileFromGitHub('data/gallery.json');
  
  let galleryData = [];
  if (content) {
    try {
      galleryData = JSON.parse(content);
    } catch (e) {
      galleryData = [];
    }
  }
  
  const photoId = uuidv4().slice(0, 8);
  
  galleryData.unshift({
    id: photoId,
    path: imagePath,
    title_hindi: analysis.title_hindi,
    title_english: analysis.title_english,
    category: analysis.category,
    tags: analysis.tags,
    timestamp: Date.now(),
    date: new Date().toLocaleDateString('hi-IN')
  });
  
  await updateFileOnGitHub(
    'data/gallery.json',
    JSON.stringify(galleryData, null, 2),
    `🖼️ Add gallery photo: ${analysis.title_english.slice(0, 30)}`,
    sha
  );
  
  return photoId;
}

// ============ Telegram Bot Handlers ============

// Check if user is admin
function isAdmin(ctx) {
  const userId = ctx.from?.id;
  // If no admin IDs configured, allow all (for testing)
  if (config.telegram.adminIds.length === 0) {
    return true;
  }
  return config.telegram.adminIds.includes(userId);
}

// Start command
bot.start((ctx) => {
  const welcomeMessage = `
🙏 नमस्ते! SEWA Smart Village AI में आपका स्वागत है!

Welcome to SEWA Smart Village AI Bot!

मैं आपकी मदद कर सकता हूं:
• 📰 समाचार/घोषणाएं जोड़ें
• 📷 फोटो अपलोड करें
• 📄 दस्तावेज़ जोड़ें
• 🏛️ हेरिटेज जानकारी अपडेट करें

Simply send me:
• Text message for news/announcements
• Photos for gallery
• Documents to upload

Commands:
/help - सहायता
/status - वेबसाइट स्थिति
/recent - हाल के अपडेट

🌐 Website: sewa-digital-ganv.vercel.app
`;
  ctx.reply(welcomeMessage);
});

// Help command
bot.help((ctx) => {
  ctx.reply(`
📚 SEWA Village AI - सहायता

कैसे उपयोग करें:

1️⃣ समाचार जोड़ें:
   बस टेक्स्ट भेजें, जैसे:
   "कल ग्राम सभा होगी शाम 5 बजे"

2️⃣ फोटो जोड़ें:
   फोटो भेजें + कैप्शन में विवरण

3️⃣ घोषणा:
   #announcement के साथ संदेश भेजें

4️⃣ इमरजेंसी:
   #emergency के साथ संदेश भेजें

Commands:
/start - शुरू करें
/help - यह संदेश
/status - बॉट स्थिति
/recent - हाल के अपडेट देखें
`);
});

// Status command
bot.command('status', async (ctx) => {
  try {
    const repoInfo = await octokit.rest.repos.get({
      owner: config.github.owner,
      repo: config.github.repo
    });
    
    ctx.reply(`
✅ SEWA Village AI Status

🌐 Website: Active
📦 GitHub: Connected
🤖 AI: ${openai ? 'OpenAI ✓' : ''}${genAI ? ' Gemini ✓' : ''}
📊 Repo: ${repoInfo.data.full_name}
⏰ Last Updated: ${new Date(repoInfo.data.updated_at).toLocaleString('hi-IN')}
`);
  } catch (error) {
    ctx.reply('❌ Status check failed: ' + error.message);
  }
});

// Handle text messages
bot.on('text', async (ctx) => {
  if (!isAdmin(ctx)) {
    return ctx.reply('⚠️ आप इस बॉट का उपयोग करने के लिए अधिकृत नहीं हैं।\nYou are not authorized to use this bot.');
  }
  
  const text = ctx.message.text;
  
  // Skip commands
  if (text.startsWith('/')) return;
  
  try {
    await ctx.reply('🔄 Processing... विश्लेषण हो रहा है...');
    
    // Analyze content with AI
    const analysis = await analyzeContent(text, false);
    
    // Add to website
    const result = await addNewsToWebsite(analysis);
    
    await ctx.reply(`
✅ सफलतापूर्वक जोड़ा गया! Successfully added!

📌 Category: ${analysis.category}
📝 Title: ${analysis.title_hindi}
🆔 ID: ${result.newsId}

🌐 Website will update in ~1 minute
🔗 sewa-digital-ganv.vercel.app
`);
  } catch (error) {
    console.error('Text handler error:', error);
    ctx.reply('❌ Error: ' + error.message);
  }
});

// Handle photos
bot.on('photo', async (ctx) => {
  if (!isAdmin(ctx)) {
    return ctx.reply('⚠️ आप इस बॉट का उपयोग करने के लिए अधिकृत नहीं हैं।');
  }
  
  try {
    await ctx.reply('🔄 फोटो प्रोसेस हो रही है... Processing photo...');
    
    // Get highest resolution photo
    const photo = ctx.message.photo[ctx.message.photo.length - 1];
    const caption = ctx.message.caption || 'Village Photo';
    
    // Download photo
    const fileLink = await ctx.telegram.getFileLink(photo.file_id);
    const response = await axios.get(fileLink.href, { responseType: 'arraybuffer' });
    const imageBuffer = Buffer.from(response.data);
    
    // Analyze with AI
    const analysis = await analyzeContent(caption, true);
    
    // Generate filename
    const filename = `${Date.now()}_${uuidv4().slice(0, 8)}.jpg`;
    
    // Upload to GitHub
    const imagePath = await uploadImageToGitHub(imageBuffer, filename);
    
    // Add to appropriate section
    if (analysis.category === 'gallery' || analysis.category === 'heritage') {
      await addPhotoToGallery(imagePath, analysis);
    } else {
      await addNewsToWebsite(analysis, imagePath);
    }
    
    await ctx.reply(`
✅ फोटो अपलोड हो गई! Photo uploaded!

📌 Category: ${analysis.category}
📝 Title: ${analysis.title_hindi}
📁 Path: ${imagePath}

🌐 Website updating...
🔗 sewa-digital-ganv.vercel.app
`);
  } catch (error) {
    console.error('Photo handler error:', error);
    ctx.reply('❌ Photo upload error: ' + error.message);
  }
});

// Handle documents
bot.on('document', async (ctx) => {
  if (!isAdmin(ctx)) {
    return ctx.reply('⚠️ आप इस बॉट का उपयोग करने के लिए अधिकृत नहीं हैं।');
  }
  
  try {
    await ctx.reply('🔄 दस्तावेज़ प्रोसेस हो रहा है... Processing document...');
    
    const doc = ctx.message.document;
    const caption = ctx.message.caption || doc.file_name;
    
    // Download document
    const fileLink = await ctx.telegram.getFileLink(doc.file_id);
    const response = await axios.get(fileLink.href, { responseType: 'arraybuffer' });
    const docBuffer = Buffer.from(response.data);
    
    // Upload to GitHub
    const path = `documents/${doc.file_name}`;
    await updateFileOnGitHub(path, docBuffer, `📄 Add document: ${doc.file_name}`);
    
    // Analyze and add news entry
    const analysis = await analyzeContent(caption, false);
    analysis.category = 'document';
    await addNewsToWebsite(analysis);
    
    await ctx.reply(`
✅ दस्तावेज़ अपलोड हो गया! Document uploaded!

📄 File: ${doc.file_name}
📁 Path: ${path}

🌐 Website updating...
`);
  } catch (error) {
    console.error('Document handler error:', error);
    ctx.reply('❌ Document upload error: ' + error.message);
  }
});

// ============ Express Server (for health checks) ============
app.get('/', (req, res) => {
  res.json({
    name: 'SEWA Village Agentic AI',
    status: 'running',
    version: '1.0.0',
    website: 'sewa-digital-ganv.vercel.app'
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// ============ Start Services ============
async function start() {
  console.log('🚀 Starting SEWA Village Agentic AI...');
  
  // Validate configuration
  if (!config.telegram.token) {
    throw new Error('TELEGRAM_BOT_TOKEN is required');
  }
  if (!config.github.token) {
    throw new Error('GITHUB_TOKEN is required');
  }
  
  // Start Express server
  app.listen(config.server.port, () => {
    console.log(`📡 Server running on port ${config.server.port}`);
  });
  
  // Start Telegram bot
  await bot.launch();
  console.log('🤖 Telegram bot started: @sewa_ganv_bot');
  console.log('✅ SEWA Village AI is ready!');
}

// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

// Start the application
start().catch(console.error);
