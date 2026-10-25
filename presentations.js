/* ============================================
   PRESENTATIONS.JS - Presentation Library
   Scans public/uploads/presentations/<key>/ for
   slide images (slide-01.webp, ...) extracted from
   the source PowerPoint decks.
   ============================================ */

const fs = require('fs');
const path = require('path');

const LIB_DIR = path.join(__dirname, 'public', 'uploads', 'presentations');
const PUBLIC_PREFIX = '/uploads/presentations';
const SLIDE_PATTERN = /^slide-(\d+)\.(webp|png|jpe?g|gif)$/i;

// Display metadata for the bundled CMS decks
const LIBRARY_META = {
    cms:       { title: 'CMS Overview', accent: '#6366f1', category: 'Fundamentals' },
    wordpress: { title: 'WordPress', accent: '#21759b', category: 'Blogging & CMS' },
    joomla:    { title: 'Joomla',    accent: '#e8562a', category: 'Open-Source CMS' },
    drupal:    { title: 'Drupal',    accent: '#0678be', category: 'Enterprise CMS' },
    wix:       { title: 'Wix',       accent: '#116dff', category: 'Website Builder' },
    shopify:   { title: 'Shopify',   accent: '#5e8e3e', category: 'E-Commerce' },
    magento:   { title: 'Magento',   accent: '#ee672f', category: 'E-Commerce' }
};

function slideNumber(file) {
    const m = file.match(SLIDE_PATTERN);
    return m ? parseInt(m[1], 10) : 0;
}

function toTitle(key) {
    return key.charAt(0).toUpperCase() + key.slice(1);
}

function readDeck(key) {
    const dir = path.join(LIB_DIR, key);
    if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) return null;

    const files = fs.readdirSync(dir);
    const slides = files
        .filter(f => SLIDE_PATTERN.test(f))
        .sort((a, b) => slideNumber(a) - slideNumber(b))
        .map(f => `${PUBLIC_PREFIX}/${key}/${f}`);

    const source = files.find(f => /\.pptx?$/i.test(f));
    const meta = LIBRARY_META[key] || {};

    return {
        key,
        title: meta.title || toTitle(key),
        category: meta.category || 'Presentation',
        accent: meta.accent || null,
        slides,
        slideCount: slides.length,
        cover: slides[0] || null,
        sourceUrl: source ? `/api/presentations/${key}/download` : null,
        staticUrl: source ? `${PUBLIC_PREFIX}/${key}/${source}` : null,
        sourceName: source || null
    };
}

function listPresentations() {
    if (!fs.existsSync(LIB_DIR)) return [];
    return fs.readdirSync(LIB_DIR, { withFileTypes: true })
        .filter(d => d.isDirectory())
        .map(d => readDeck(d.name))
        .filter(deck => deck && deck.slideCount > 0)
        .sort((a, b) => a.title.localeCompare(b.title));
}

function getPresentation(key) {
    if (!key || !/^[a-z0-9_-]+$/i.test(key)) return null;
    return readDeck(key.toLowerCase());
}

module.exports = { listPresentations, getPresentation, LIBRARY_META };
