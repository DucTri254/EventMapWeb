const { scrapeAllEvents } = require('../utils/scraper');

// Run scraping daily at 2:00 AM
const runScraping = async () => {
  console.log('Running scheduled event scraping...');
  await scrapeAllEvents();
};

// For manual execution
if (require.main === module) {
  runScraping()
    .then(() => {
      console.log('Scraping completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Scraping failed:', error);
      process.exit(1);
    });
}

module.exports = { runScraping };
