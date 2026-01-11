const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, requireRole } = require('../middleware/auth');
const { geocodeAddress } = require('../utils/geocoding');
const { calculateEventStatus } = require('../utils/calculateEventStatus');
const { sendEventChanged, sendEventCancelled } = require('../utils/email');

const router = express.Router();
const prisma = new PrismaClient();

// Get all events with filters
router.get('/', async (req, res) => {
  try {
    const { 
      search, 
      category, 
      region, 
      status, 
      page = 1, 
      limit = 10 
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = {};

    if (search) {
      where.name = {
        contains: search,
        mode: 'insensitive',
      };
    }

    if (category) {
      where.categoryId = category;
    }

    if (region) {
      where.regionId = region;
    }

    if (status) {
      where.status = status.toUpperCase();
    } else {
      // Calculate status for all events
      const events = await prisma.event.findMany({ where });
      for (const event of events) {
        const calculatedStatus = calculateEventStatus(event.startTime, event.endTime);
        if (calculatedStatus !== event.status) {
          await prisma.event.update({
            where: { id: event.id },
            data: { status: calculatedStatus },
          });
        }
      }
    }

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        include: {
          category: true,
          region: true,
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: parseInt(limit),
      }),
      prisma.event.count({ where }),
    ]);

    res.json({
      events,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get event by ID
router.get('/:id', async (req, res) => {
  try {
    const event = await prisma.event.findUnique({
      where: { id: req.params.id },
      include: {
        category: true,
        region: true,
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Update status
    const calculatedStatus = calculateEventStatus(event.startTime, event.endTime);
    if (calculatedStatus !== event.status) {
      await prisma.event.update({
        where: { id: event.id },
        data: { status: calculatedStatus },
      });
      event.status = calculatedStatus;
    }

    res.json(event);
  } catch (error) {
    console.error('Get event error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create event
router.post('/', authenticate, requireRole('EVENT_CREATOR', 'ADMIN'), async (req, res) => {
  try {
    const {
      name,
      description,
      image,
      location,
      startTime,
      endTime,
      categoryId,
      regionId,
    } = req.body;

    // Validation
    if (!name || name.length < 3) {
      return res.status(400).json({ error: 'Event name must be at least 3 characters' });
    }

    if (!description || description.length < 10) {
      return res.status(400).json({ error: 'Event description must be at least 10 characters' });
    }

    if (!location) {
      return res.status(400).json({ error: 'Location is required' });
    }

    if (!startTime || !endTime) {
      return res.status(400).json({ error: 'Start time and end time are required' });
    }

    if (new Date(startTime) >= new Date(endTime)) {
      return res.status(400).json({ error: 'End time must be after start time' });
    }

    // Get region name for better geocoding
    let regionName = null;
    if (regionId) {
      const region = await prisma.region.findUnique({
        where: { id: regionId },
      });
      if (region) {
        regionName = region.name;
      }
    }

    // Geocode address with region name for better accuracy
    const coordinates = await geocodeAddress(location, regionName);

    // Calculate status
    const status = calculateEventStatus(startTime, endTime);

    const event = await prisma.event.create({
      data: {
        name,
        description,
        image: image || null,
        location,
        latitude: coordinates?.latitude || null,
        longitude: coordinates?.longitude || null,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        categoryId,
        regionId,
        creatorId: req.user.id,
        status,
        source: 'internal',
      },
      include: {
        category: true,
        region: true,
      },
    });

    res.status(201).json(event);
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update event
router.put('/:id', authenticate, async (req, res) => {
  try {
    const event = await prisma.event.findUnique({
      where: { id: req.params.id },
    });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Check permissions
    if (req.user.role !== 'ADMIN' && event.creatorId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to update this event' });
    }

    const {
      name,
      description,
      image,
      location,
      startTime,
      endTime,
      categoryId,
      regionId,
    } = req.body;

    const updateData = {};

    if (name !== undefined) {
      if (name.length < 3) {
        return res.status(400).json({ error: 'Event name must be at least 3 characters' });
      }
      updateData.name = name;
    }

    if (description !== undefined) {
      if (description.length < 10) {
        return res.status(400).json({ error: 'Event description must be at least 10 characters' });
      }
      updateData.description = description;
    }

    if (image !== undefined) updateData.image = image;
    if (categoryId !== undefined) updateData.categoryId = categoryId;
    if (regionId !== undefined) updateData.regionId = regionId;

    if (location !== undefined) {
      updateData.location = location;
      
      // Get region name for better geocoding
      let regionName = null;
      const finalRegionId = regionId !== undefined ? regionId : event.regionId;
      if (finalRegionId) {
        const region = await prisma.region.findUnique({
          where: { id: finalRegionId },
        });
        if (region) {
          regionName = region.name;
        }
      }
      
      // Re-geocode if location changed, with region name for better accuracy
      const coordinates = await geocodeAddress(location, regionName);
      updateData.latitude = coordinates?.latitude || null;
      updateData.longitude = coordinates?.longitude || null;
    }

    if (startTime !== undefined) updateData.startTime = new Date(startTime);
    if (endTime !== undefined) updateData.endTime = new Date(endTime);

    if (startTime || endTime) {
      const finalStartTime = updateData.startTime || event.startTime;
      const finalEndTime = updateData.endTime || event.endTime;
      updateData.status = calculateEventStatus(finalStartTime, finalEndTime);
    }

    const updatedEvent = await prisma.event.update({
      where: { id: req.params.id },
      data: updateData,
      include: {
        category: true,
        region: true,
      },
    });

    // Notify interested users
    const interestedUsers = await prisma.userEventInterest.findMany({
      where: { eventId: req.params.id },
      include: { user: true },
    });

    const changes = [];
    if (name !== undefined && name !== event.name) changes.push(`Name changed to: ${name}`);
    if (location !== undefined && location !== event.location) changes.push(`Location changed to: ${location}`);
    if (startTime !== undefined) changes.push(`Start time changed to: ${new Date(startTime).toLocaleString()}`);
    if (endTime !== undefined) changes.push(`End time changed to: ${new Date(endTime).toLocaleString()}`);

    if (changes.length > 0) {
      for (const interest of interestedUsers) {
        await sendEventChanged(interest.user.email, event.name, changes);
        
        // Create notification
        await prisma.notification.create({
          data: {
            userId: interest.userId,
            type: 'EVENT_CHANGED',
            title: 'Event Updated',
            message: `${event.name} has been updated`,
            link: `/events/${event.id}`,
          },
        });
      }
    }

    res.json(updatedEvent);
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete event
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const event = await prisma.event.findUnique({
      where: { id: req.params.id },
    });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Check permissions
    if (req.user.role !== 'ADMIN' && event.creatorId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to delete this event' });
    }

    // Notify interested users
    const interestedUsers = await prisma.userEventInterest.findMany({
      where: { eventId: req.params.id },
      include: { user: true },
    });

    for (const interest of interestedUsers) {
      await sendEventCancelled(interest.user.email, event.name);
      
      // Create notification
      await prisma.notification.create({
        data: {
          userId: interest.userId,
          type: 'EVENT_CANCELLED',
          title: 'Event Cancelled',
          message: `${event.name} has been cancelled`,
        },
      });
    }

    await prisma.event.delete({
      where: { id: req.params.id },
    });

    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Toggle interest
router.post('/:id/interested', authenticate, async (req, res) => {
  try {
    const { id: eventId } = req.params;
    const userId = req.user.id;

    const existingInterest = await prisma.userEventInterest.findUnique({
      where: {
        userId_eventId: {
          userId,
          eventId,
        },
      },
    });

    if (existingInterest) {
      // Remove interest
      await prisma.userEventInterest.delete({
        where: {
          userId_eventId: {
            userId,
            eventId,
          },
        },
      });

      // Decrease count
      await prisma.event.update({
        where: { id: eventId },
        data: {
          interestedCount: {
            decrement: 1,
          },
        },
      });

      res.json({ interested: false });
    } else {
      // Add interest
      await prisma.userEventInterest.create({
        data: {
          userId,
          eventId,
        },
      });

      // Increase count
      const event = await prisma.event.update({
        where: { id: eventId },
        data: {
          interestedCount: {
            increment: 1,
          },
        },
        include: {
          creator: true,
        },
      });

      // Notify event creator
      if (event.creatorId !== userId) {
        await prisma.notification.create({
          data: {
            userId: event.creatorId,
            type: 'USER_INTERESTED',
            title: 'New Interest',
            message: `${req.user.name} is interested in your event "${event.name}"`,
            link: `/events/${eventId}`,
          },
        });

        const { sendUserInterested } = require('../utils/email');
        await sendUserInterested(event.creator.email, event.name, req.user.name);
      }

      res.json({ interested: true });
    }
  } catch (error) {
    console.error('Toggle interest error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get interested users
router.get('/:id/interested', authenticate, async (req, res) => {
  try {
    const { id: eventId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Check if user is event creator or admin
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (req.user.role !== 'ADMIN' && event.creatorId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const [interests, total] = await Promise.all([
      prisma.userEventInterest.findMany({
        where: { eventId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: parseInt(limit),
      }),
      prisma.userEventInterest.count({ where: { eventId } }),
    ]);

    res.json({
      users: interests.map(i => i.user),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Get interested users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
