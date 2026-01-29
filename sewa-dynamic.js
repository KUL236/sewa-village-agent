/**
 * SEWA Dynamic Content Loader
 * Add this to your website to load content from JSON files
 * Updated by the Telegram AI Agent
 */

const SEWA_DATA = {
  newsUrl: './data/news.json',
  galleryUrl: './data/gallery.json'
};

// Load and display news
async function loadNews() {
  try {
    const response = await fetch(SEWA_DATA.newsUrl + '?t=' + Date.now());
    const news = await response.json();
    
    const newsContainer = document.getElementById('news-container');
    if (!newsContainer) return;
    
    newsContainer.innerHTML = news.slice(0, 10).map(item => `
      <div class="news-item ${item.priority === 'high' ? 'news-priority' : ''}" data-id="${item.id}">
        <div class="news-date">📅 ${item.date}</div>
        <h3 class="news-title">${item.title_hindi}</h3>
        <p class="news-title-en">${item.title_english}</p>
        ${item.image ? `<img src="${item.image}" alt="${item.title_hindi}" class="news-image" loading="lazy">` : ''}
        <p class="news-description">${item.description_hindi}</p>
        <span class="news-category">${item.category}</span>
      </div>
    `).join('');
    
  } catch (error) {
    console.log('News not available yet');
  }
}

// Load and display gallery
async function loadGallery() {
  try {
    const response = await fetch(SEWA_DATA.galleryUrl + '?t=' + Date.now());
    const gallery = await response.json();
    
    const galleryContainer = document.getElementById('gallery-container');
    if (!galleryContainer) return;
    
    galleryContainer.innerHTML = gallery.slice(0, 20).map(item => `
      <div class="gallery-item" data-id="${item.id}">
        <img src="${item.path}" alt="${item.title_hindi}" loading="lazy" onclick="openLightbox('${item.path}', '${item.title_hindi}')">
        <div class="gallery-caption">
          <span class="gallery-title">${item.title_hindi}</span>
          <span class="gallery-date">${item.date}</span>
        </div>
      </div>
    `).join('');
    
  } catch (error) {
    console.log('Gallery not available yet');
  }
}

// Lightbox for images
function openLightbox(src, title) {
  const lightbox = document.createElement('div');
  lightbox.className = 'sewa-lightbox';
  lightbox.innerHTML = `
    <div class="lightbox-overlay" onclick="closeLightbox()"></div>
    <div class="lightbox-content">
      <img src="${src}" alt="${title}">
      <p class="lightbox-title">${title}</p>
      <button class="lightbox-close" onclick="closeLightbox()">✕</button>
    </div>
  `;
  document.body.appendChild(lightbox);
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  const lightbox = document.querySelector('.sewa-lightbox');
  if (lightbox) {
    lightbox.remove();
    document.body.style.overflow = '';
  }
}

// Auto-load on page ready
document.addEventListener('DOMContentLoaded', () => {
  loadNews();
  loadGallery();
  
  // Refresh every 5 minutes
  setInterval(() => {
    loadNews();
    loadGallery();
  }, 5 * 60 * 1000);
});

// Styles for dynamic content
const sewaStyles = document.createElement('style');
sewaStyles.textContent = `
  .news-item {
    background: var(--card-bg, #fff);
    border-radius: 12px;
    padding: 1rem;
    margin-bottom: 1rem;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    transition: transform 0.2s;
  }
  
  .news-item:hover {
    transform: translateY(-2px);
  }
  
  .news-priority {
    border-left: 4px solid #e74c3c;
  }
  
  .news-date {
    color: #666;
    font-size: 0.85rem;
  }
  
  .news-title {
    color: #2c3e50;
    margin: 0.5rem 0;
  }
  
  .news-title-en {
    color: #7f8c8d;
    font-size: 0.9rem;
    font-style: italic;
  }
  
  .news-image {
    width: 100%;
    border-radius: 8px;
    margin: 0.5rem 0;
  }
  
  .news-category {
    background: #3498db;
    color: white;
    padding: 0.2rem 0.5rem;
    border-radius: 4px;
    font-size: 0.75rem;
  }
  
  .gallery-item {
    position: relative;
    border-radius: 8px;
    overflow: hidden;
    cursor: pointer;
  }
  
  .gallery-item img {
    width: 100%;
    height: 200px;
    object-fit: cover;
    transition: transform 0.3s;
  }
  
  .gallery-item:hover img {
    transform: scale(1.05);
  }
  
  .gallery-caption {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    background: linear-gradient(transparent, rgba(0,0,0,0.8));
    color: white;
    padding: 1rem 0.5rem 0.5rem;
  }
  
  .sewa-lightbox {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .lightbox-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.9);
  }
  
  .lightbox-content {
    position: relative;
    max-width: 90vw;
    max-height: 90vh;
    text-align: center;
  }
  
  .lightbox-content img {
    max-width: 100%;
    max-height: 80vh;
    border-radius: 8px;
  }
  
  .lightbox-title {
    color: white;
    margin-top: 1rem;
  }
  
  .lightbox-close {
    position: absolute;
    top: -40px;
    right: 0;
    background: none;
    border: none;
    color: white;
    font-size: 2rem;
    cursor: pointer;
  }
`;
document.head.appendChild(sewaStyles);
