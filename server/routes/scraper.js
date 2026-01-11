const express = require('express');
const { authenticate, requireRole } = require('../middleware/auth');
const { scrapeAllEvents } = require('../utils/scraper');

const router = express.Router();

// Manual scraping endpoint (Admin only)
router.post('/scrape', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const result = await scrapeAllEvents();
    res.json({ 
      message: 'Scraping completed',
      result 
    });
  } catch (error) {
    console.error('Scraping error:', error);
    res.status(500).json({ error: 'Scraping failed' });
  }
});

module.exports = router;
