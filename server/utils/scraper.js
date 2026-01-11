const axios = require('axios');
const cheerio = require('cheerio');
const { PrismaClient } = require('@prisma/client');
const { geocodeAddress } = require('./geocoding');
const { calculateEventStatus } = require('./calculateEventStatus');

const prisma = new PrismaClient();

// Scrape events from sansukien.com
const scrapeSansukien = async () => {
  try {
    const response = await axios.get('https://sansukien.com/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    const $ = cheerio.load(response.data);
    const events = [];

    // This is a placeholder - actual selectors need to be determined by inspecting the website
    $('.event-item, .event-card, article').each((i, elem) => {
      try {
        const title = $(elem).find('h2, h3, .title, .event-title').first().text().trim();
        const description = $(elem).find('.description, .content, p').first().text().trim();
        const location = $(elem).find('.location, .venue, .address').first().text().trim();
        const dateText = $(elem).find('.date, .time, .datetime').first().text().trim();
        const imageUrl = $(elem).find('img').first().attr('src');

        if (title && location) {
          events.push({
            name: title,
            description: description || title,
            location,
            dateText,
            imageUrl,
            source: 'sansukien',
          });
        }
      } catch (error) {
        console.error('Error parsing event:', error);
      }
    });

    return events;
  } catch (error) {
    console.error('Error scraping sansukien.com:', error);
    return [];
  }
};

// Scrape events from ticketbox.vn
const scrapeTicketbox = async () => {
  try {
    const response = await axios.get('https://ticketbox.vn/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    const $ = cheerio.load(response.data);
    const events = [];

    // This is a placeholder - actual selectors need to be determined by inspecting the website
    $('.event, .event-item, .ticket-item').each((i, elem) => {
      try {
        const title = $(elem).find('h2, h3, .title, .event-name').first().text().trim();
        const description = $(elem).find('.description, .content, p').first().text().trim();
        const location = $(elem).find('.location, .venue, .address').first().text().trim();
        const dateText = $(elem).find('.date, .time, .datetime').first().text().trim();
        const imageUrl = $(elem).find('img').first().attr('src');

        if (title && location) {
          events.push({
            name: title,
            description: description || title,
            location,
            dateText,
            imageUrl,
            source: 'ticketbox',
          });
        }
      } catch (error) {
        console.error('Error parsing event:', error);
      }
    });

    return events;
  } catch (error) {
    console.error('Error scraping ticketbox.vn:', error);
    return [];
  }
};

// Convert image URL to base64
const imageToBase64 = async (url) => {
  try {
    if (!url || url.startsWith('data:')) return null;
    
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    const base64 = Buffer.from(response.data).toString('base64');
    const contentType = response.headers['content-type'] || 'image/jpeg';
    return `data:${contentType};base64,${base64}`;
  } catch (error) {
    console.error('Error converting image to base64:', error);
    return null;
  }
};

// Parse date text to Date object
const parseDate = (dateText) => {
  if (!dateText) return null;

  // Try various date formats
  const date = new Date(dateText);
  if (!isNaN(date.getTime())) {
    return date;
  }

  // Add more parsing logic here based on common Vietnamese date formats
  return null;
};

// Save scraped events to database
const saveScrapedEvents = async (events) => {
  try {
    // Get default category and region (or create them)
    let defaultCategory = await prisma.eventCategory.findFirst({
      where: { name: 'Khác' },
    });

    if (!defaultCategory) {
      defaultCategory = await prisma.eventCategory.create({
        data: { name: 'Khác', description: 'Các sự kiện khác' },
      });
    }

    let defaultRegion = await prisma.region.findFirst({
      where: { code: 'HCM' },
    });

    if (!defaultRegion) {
      defaultRegion = await prisma.region.create({
        data: { name: 'Thành phố Hồ Chí Minh', code: 'HCM' },
      });
    }

    let savedCount = 0;
    let skippedCount = 0;

    for (const eventData of events) {
      try {
        // Check if event already exists (by name and source)
        const existing = await prisma.event.findFirst({
          where: {
            name: eventData.name,
            source: eventData.source,
          },
        });

        if (existing) {
          skippedCount++;
          continue;
        }

        // Parse dates
        const startTime = parseDate(eventData.dateText) || new Date();
        const endTime = new Date(startTime);
        endTime.setHours(endTime.getHours() + 2); // Default 2 hours duration

        // Geocode location
        const coordinates = await geocodeAddress(eventData.location);

        // Convert image
        const image = eventData.imageUrl ? await imageToBase64(eventData.imageUrl) : null;

        // Calculate status
        const status = calculateEventStatus(startTime, endTime);

        // Create event
        await prisma.event.create({
          data: {
            name: eventData.name,
            description: eventData.description || eventData.name,
            image,
            location: eventData.location,
            latitude: coordinates?.latitude || null,
            longitude: coordinates?.longitude || null,
            startTime,
            endTime,
            categoryId: defaultCategory.id,
            regionId: defaultRegion.id,
            creatorId: (await prisma.user.findFirst({ where: { role: 'ADMIN' } }))?.id || '',
            status,
            source: eventData.source,
          },
        });

        savedCount++;
      } catch (error) {
        console.error('Error saving event:', error);
        skippedCount++;
      }
    }

    console.log(`Scraped events saved: ${savedCount}, skipped: ${skippedCount}`);
    return { saved: savedCount, skipped: skippedCount };
  } catch (error) {
    console.error('Error saving scraped events:', error);
    return { saved: 0, skipped: 0 };
  }
};

// Main scraping function
const scrapeAllEvents = async () => {
  console.log('Starting event scraping...');
  
  const [sansukienEvents, ticketboxEvents] = await Promise.all([
    scrapeSansukien(),
    scrapeTicketbox(),
  ]);

  const allEvents = [...sansukienEvents, ...ticketboxEvents];
  console.log(`Scraped ${allEvents.length} events total`);

  const result = await saveScrapedEvents(allEvents);
  console.log('Scraping completed:', result);

  return result;
};

module.exports = {
  scrapeSansukien,
  scrapeTicketbox,
  scrapeAllEvents,
};
