// Vercel Serverless Function entry point
const app = require('../server');

module.exports = (req, res) => {
    // If Vercel rewrites forward the request with the destination path (/api/index.js),
    // restore the original URL from headers so Express routes match accurately.
    if (req.url && req.url.startsWith('/api/index.js')) {
        const original = req.headers['x-matched-path'] || req.headers['x-forwarded-uri'] || req.url.replace(/^\/api\/index\.js/, '') || '/';
        req.url = original;
    }
    return app(req, res);
};
