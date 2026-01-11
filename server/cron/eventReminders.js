const { PrismaClient } = require('@prisma/client');
const { sendEventReminder } = require('../utils/email');

const prisma = new PrismaClient();

// Send event reminders 24 hours before event
const sendReminders = async () => {
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const dayAfter = new Date(tomorrow);
    dayAfter.setDate(dayAfter.getDate() + 1);

    // Find events starting tomorrow
    const events = await prisma.event.findMany({
      where: {
        startTime: {
          gte: tomorrow,
          lt: dayAfter,
        },
        status: 'UPCOMING',
      },
    });

    console.log(`Found ${events.length} events for reminder`);

    for (const event of events) {
      // Get all interested users
      const interests = await prisma.userEventInterest.findMany({
        where: { eventId: event.id },
        include: { user: true },
      });

      for (const interest of interests) {
        try {
          const eventDate = new Date(event.startTime).toLocaleDateString('vi-VN', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          });

          const eventTime = new Date(event.startTime).toLocaleTimeString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
          });

          await sendEventReminder(
            interest.user.email,
            event.name,
            eventDate,
            eventTime,
            event.location
          );

          console.log(`Reminder sent to ${interest.user.email} for event ${event.name}`);
        } catch (error) {
          console.error(`Error sending reminder to ${interest.user.email}:`, error);
        }
      }
    }

    console.log('Reminder sending completed');
  } catch (error) {
    console.error('Error sending reminders:', error);
  }
};

// For manual execution
if (require.main === module) {
  sendReminders()
    .then(() => {
      console.log('Reminders completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Reminders failed:', error);
      process.exit(1);
    });
}

module.exports = { sendReminders };
