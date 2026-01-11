const express = require('express');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// Get all regions
router.get('/', async (req, res) => {
  try {
    const regions = await prisma.region.findMany({
      orderBy: {
        name: 'asc',
      },
    });

    res.json(regions);
  } catch (error) {
    console.error('Get regions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
