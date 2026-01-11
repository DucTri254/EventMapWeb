const express = require('express');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const { sendPermissionRequest } = require('../utils/email');

const router = express.Router();
const prisma = new PrismaClient();

// Get user profile
router.get('/profile', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
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
        createdAt: true,
      },
    });

    res.json(user);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user profile
router.put('/profile', authenticate, async (req, res) => {
  try {
    const { name, gender, language, country, timezone, avatar } = req.body;

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (gender !== undefined) updateData.gender = gender;
    if (language !== undefined) updateData.language = language;
    if (country !== undefined) updateData.country = country;
    if (timezone !== undefined) updateData.timezone = timezone;
    if (avatar !== undefined) updateData.avatar = avatar;

    const user = await prisma.user.update({
      where: { id: req.user.id },
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

    res.json(user);
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Request role change
router.post('/role-request', authenticate, async (req, res) => {
  try {
    const { requestedRole } = req.body;

    if (!requestedRole || !['USER', 'EVENT_CREATOR', 'ADMIN'].includes(requestedRole)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    if (req.user.role === requestedRole) {
      return res.status(400).json({ error: 'You already have this role' });
    }

    // Check for existing pending request
    const existingRequest = await prisma.permissionRequest.findFirst({
      where: {
        userId: req.user.id,
        status: 'PENDING',
      },
    });

    if (existingRequest) {
      return res.status(400).json({ error: 'You already have a pending request' });
    }

    // Create request
    const request = await prisma.permissionRequest.create({
      data: {
        userId: req.user.id,
        requestedRole,
      },
    });

    // Notify all admins
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN' },
    });

    for (const admin of admins) {
      await prisma.notification.create({
        data: {
          userId: admin.id,
          type: 'PERMISSION_REQUEST',
          title: 'Permission Request',
          message: `${req.user.name} wants to change role to ${requestedRole}`,
          link: `/admin/users/${req.user.id}/edit`,
        },
      });

      await sendPermissionRequest(admin.email, req.user.name, requestedRole);
    }

    res.json({ 
      message: 'Request submitted. Waiting for admin approval.',
      request 
    });
  } catch (error) {
    console.error('Role request error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get favorite events
router.get('/favorites', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [interests, total] = await Promise.all([
      prisma.userEventInterest.findMany({
        where: { userId: req.user.id },
        include: {
          event: {
            include: {
              category: true,
              region: true,
              creator: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: parseInt(limit),
      }),
      prisma.userEventInterest.count({ where: { userId: req.user.id } }),
    ]);

    res.json({
      events: interests.map(i => i.event),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Get favorites error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get my events (for Event Creator)
router.get('/my-events', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'EVENT_CREATOR' && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const { 
      search, 
      status, 
      page = 1, 
      limit = 10 
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = { creatorId: req.user.id };

    if (search) {
      where.name = {
        contains: search,
        mode: 'insensitive',
      };
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
    console.error('Get my events error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
