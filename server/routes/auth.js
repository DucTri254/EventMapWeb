const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { sendVerificationCode, sendPasswordResetCode } = require('../utils/email');
const { generateVerificationCode } = require('../utils/generateCode');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, reEnterPassword, role, company } = req.body;

    // Validation
    if (!name || !email || !password || !reEnterPassword) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    if (password !== reEnterPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role || 'USER',
        company: company || null,
      },
    });

    // Generate verification code
    const code = generateVerificationCode();
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + 60);

    await prisma.verificationCode.create({
      data: {
        email,
        code,
        type: 'EMAIL_VERIFICATION',
        expiresAt,
      },
    });

    // Send verification email
    await sendVerificationCode(email, code);

    res.json({ 
      message: 'Registration successful. Please check your email for verification code.',
      userId: user.id 
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!user.isVerified) {
      return res.status(401).json({ error: 'Email not verified' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate tokens
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    const refreshToken = jwt.sign(
      { userId: user.id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      token,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify Email
router.post('/verify', async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ error: 'Email and code are required' });
    }

    const verification = await prisma.verificationCode.findFirst({
      where: {
        email,
        code,
        type: 'EMAIL_VERIFICATION',
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!verification) {
      return res.status(400).json({ error: 'Invalid or expired code' });
    }

    // Update user
    await prisma.user.update({
      where: { email },
      data: { isVerified: true },
    });

    // Delete verification code
    await prisma.verificationCode.delete({
      where: { id: verification.id },
    });

    res.json({ message: 'Email verified successfully' });
  } catch (error) {
    console.error('Verify error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Forgot Password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(404).json({ error: 'Email not registered' });
    }

    // Generate code
    const code = generateVerificationCode();
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + 60);

    await prisma.verificationCode.create({
      data: {
        email,
        code,
        type: 'PASSWORD_RESET',
        expiresAt,
      },
    });

    // Send email
    await sendPasswordResetCode(email, code);

    res.json({ message: 'Password reset code sent to your email' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reset Password
router.post('/reset-password', async (req, res) => {
  try {
    const { email, code, newPassword, confirmPassword } = req.body;

    if (!email || !code || !newPassword || !confirmPassword) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    const verification = await prisma.verificationCode.findFirst({
      where: {
        email,
        code,
        type: 'PASSWORD_RESET',
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!verification) {
      return res.status(400).json({ error: 'Invalid or expired code' });
    }

    // Update password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { email },
      data: { password: hashedPassword },
    });

    // Delete verification code
    await prisma.verificationCode.delete({
      where: { id: verification.id },
    });

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Resend Verification Code
router.post('/resend-code', async (req, res) => {
  try {
    const { email, type } = req.body;

    if (!email || !type) {
      return res.status(400).json({ error: 'Email and type are required' });
    }

    const code = generateVerificationCode();
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + 60);

    await prisma.verificationCode.create({
      data: {
        email,
        code,
        type: type.toUpperCase(),
        expiresAt,
      },
    });

    if (type === 'EMAIL_VERIFICATION') {
      await sendVerificationCode(email, code);
    } else if (type === 'PASSWORD_RESET') {
      await sendPasswordResetCode(email, code);
    }

    res.json({ message: 'Code resent successfully' });
  } catch (error) {
    console.error('Resend code error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
