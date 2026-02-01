const express = require('express');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const { sendPermissionRequest, sendEmailChangeCode } = require('../utils/email');
const { generateVerificationCode } = require('../utils/generateCode');

const router = express.Router();
const prisma = new PrismaClient();
const EMAIL_CHANGE_EXPIRES_MINUTES = 10;

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

// Update user profile (email change requires verification via confirm-email-change)
router.put('/profile', authenticate, async (req, res) => {
  try {
    const { name, email, gender, language, country, timezone, avatar } = req.body;
    const currentUser = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { email: true },
    });
    if (!currentUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const newEmailTrimmed = email !== undefined && email.trim() !== '' ? email.trim() : null;
    const isEmailChanging = newEmailTrimmed && newEmailTrimmed !== currentUser.email;

    if (isEmailChanging) {
      const existing = await prisma.user.findFirst({
        where: { email: newEmailTrimmed, id: { not: req.user.id } },
      });
      if (existing) {
        return res.status(400).json({ error: 'Email đã được sử dụng bởi tài khoản khác' });
      }

      const code = generateVerificationCode();
      const expiresAt = new Date(Date.now() + EMAIL_CHANGE_EXPIRES_MINUTES * 60 * 1000);

      await prisma.verificationCode.deleteMany({
        where: { userId: req.user.id, type: 'EMAIL_CHANGE' },
      });
      await prisma.verificationCode.create({
        data: {
          email: newEmailTrimmed,
          code,
          type: 'EMAIL_CHANGE',
          userId: req.user.id,
          expiresAt,
        },
      });

      await sendEmailChangeCode(newEmailTrimmed, code);

      const updateData = {};
      if (name !== undefined) updateData.name = name;
      if (gender !== undefined) updateData.gender = gender;
      if (language !== undefined) updateData.language = language;
      if (country !== undefined) updateData.country = country;
      if (timezone !== undefined) updateData.timezone = timezone;
      if (avatar !== undefined) updateData.avatar = avatar;
      if (Object.keys(updateData).length > 0) {
        await prisma.user.update({
          where: { id: req.user.id },
          data: updateData,
        });
      }

      return res.json({ requiresVerification: true, newEmail: newEmailTrimmed });
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (gender !== undefined) updateData.gender = gender;
    if (language !== undefined) updateData.language = language;
    if (country !== undefined) updateData.country = country;
    if (timezone !== undefined) updateData.timezone = timezone;
    if (avatar !== undefined) updateData.avatar = avatar;
    if (newEmailTrimmed) updateData.email = newEmailTrimmed;

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

// Confirm email change with 6-digit code (sent to new email)
router.post('/confirm-email-change', authenticate, async (req, res) => {
  try {
    const { newEmail, code } = req.body;
    if (!newEmail || !code || String(code).length !== 6) {
      return res.status(400).json({ error: 'Vui lòng nhập mã 6 số hợp lệ' });
    }

    const record = await prisma.verificationCode.findFirst({
      where: {
        email: newEmail.trim(),
        code: String(code).trim(),
        type: 'EMAIL_CHANGE',
        userId: req.user.id,
      },
    });

    if (!record) {
      return res.status(400).json({ error: 'Mã xác minh không đúng' });
    }
    if (new Date() > record.expiresAt) {
      await prisma.verificationCode.delete({ where: { id: record.id } });
      return res.status(400).json({ error: 'Mã đã hết hạn. Vui lòng thử đổi email lại và lấy mã mới.' });
    }

    await prisma.user.update({
      where: { id: req.user.id },
      data: { email: newEmail.trim() },
    });
    await prisma.verificationCode.deleteMany({
      where: { userId: req.user.id, type: 'EMAIL_CHANGE' },
    });

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
      },
    });

    res.json(user);
  } catch (error) {
    console.error('Confirm email change error:', error);
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
