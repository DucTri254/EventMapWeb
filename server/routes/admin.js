const express = require('express');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const { authenticate, requireRole } = require('../middleware/auth');
const { calculateEventStatus } = require('../utils/calculateEventStatus');
const { geocodeAddress } = require('../utils/geocoding');

const router = express.Router();
const prisma = new PrismaClient();

// All admin routes require authentication and ADMIN role
router.use(authenticate);
router.use(requireRole('ADMIN'));

// Get statistics
router.get('/stats', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [totalUsers, totalEvents, eventsToday, newUsers] = await Promise.all([
      prisma.user.count(),
      prisma.event.count(),
      prisma.event.count({
        where: {
          startTime: {
            gte: today,
            lt: tomorrow,
          },
        },
      }),
      prisma.user.count({
        where: {
          createdAt: {
            gte: sevenDaysAgo,
          },
        },
      }),
    ]);

    // Get events by month for chart
    const eventsByMonth = await prisma.event.groupBy({
      by: ['createdAt'],
      _count: {
        id: true,
      },
      where: {
        createdAt: {
          gte: new Date(new Date().setMonth(new Date().getMonth() - 12)),
        },
      },
    });

    // Process data for chart (group by month)
    const monthlyData = {};
    eventsByMonth.forEach(event => {
      const month = new Date(event.createdAt).toLocaleString('default', { month: 'long', year: 'numeric' });
      monthlyData[month] = (monthlyData[month] || 0) + event._count.id;
    });

    res.json({
      totalUsers,
      totalEvents,
      eventsToday,
      newUsers,
      eventsByMonth: Object.entries(monthlyData).map(([month, count]) => ({ month, count })),
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all users
router.get('/users', async (req, res) => {
  try {
    const { search, role, page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (role) {
      where.role = role.toUpperCase();
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          company: true,
          gender: true,
          language: true,
          country: true,
          timezone: true,
          avatar: true,
          isVerified: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: parseInt(limit),
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user by ID
router.get('/users/:id', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        company: true,
        gender: true,
        language: true,
        country: true,
        timezone: true,
        avatar: true,
        isVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user
router.put('/users/:id', async (req, res) => {
  try {
    const { name, email, role, gender, language, country, timezone, avatar } = req.body;

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) {
      // Check if email is already taken
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });
      if (existingUser && existingUser.id !== req.params.id) {
        return res.status(400).json({ error: 'Email already taken' });
      }
      updateData.email = email;
    }
    if (role !== undefined) {
      updateData.role = role.toUpperCase();
      
      // If approving a permission request, update it
      const pendingRequest = await prisma.permissionRequest.findFirst({
        where: {
          userId: req.params.id,
          status: 'PENDING',
        },
      });

      if (pendingRequest && pendingRequest.requestedRole === role.toUpperCase()) {
        await prisma.permissionRequest.update({
          where: { id: pendingRequest.id },
          data: {
            status: 'APPROVED',
            processedAt: new Date(),
            processedBy: req.user.id,
          },
        });
      }
    }
    if (gender !== undefined) updateData.gender = gender;
    if (language !== undefined) updateData.language = language;
    if (country !== undefined) updateData.country = country;
    if (timezone !== undefined) updateData.timezone = timezone;
    if (avatar !== undefined) updateData.avatar = avatar;

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        company: true,
        gender: true,
        language: true,
        country: true,
        timezone: true,
        avatar: true,
      },
    });

    // Notify user if role changed
    if (role !== undefined) {
      await prisma.notification.create({
        data: {
          userId: req.params.id,
          type: 'PERMISSION_REQUEST',
          title: 'Role Updated',
          message: `Your role has been updated to ${role}`,
        },
      });
    }

    res.json(user);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete user
router.delete('/users/:id', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.role === 'ADMIN') {
      return res.status(400).json({ error: 'Cannot delete admin user' });
    }

    await prisma.user.delete({
      where: { id: req.params.id },
    });

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all events
router.get('/events', async (req, res) => {
  try {
    const { search, category, region, status, page = 1, limit = 10 } = req.query;
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

// Update event (admin can update any event)
router.put('/events/:id', async (req, res) => {
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
      const event = await prisma.event.findUnique({
        where: { id: req.params.id },
      });
      const finalRegionId = regionId !== undefined ? regionId : event?.regionId;
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
      const event = await prisma.event.findUnique({
        where: { id: req.params.id },
      });
      const finalStartTime = updateData.startTime || event.startTime;
      const finalEndTime = updateData.endTime || event.endTime;
      updateData.status = calculateEventStatus(finalStartTime, finalEndTime);
    }

    const event = await prisma.event.update({
      where: { id: req.params.id },
      data: updateData,
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

    res.json(event);
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete event
router.delete('/events/:id', async (req, res) => {
  try {
    await prisma.event.delete({
      where: { id: req.params.id },
    });

    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
