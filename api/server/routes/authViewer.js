const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Viewer = require('~/models/Viewer');
const { logger } = require('~/config');
const { isEnabled } = require('~/server/utils'); // Added for checking env var

const { viewerLoginLimiter, viewerRegisterLimiter } = require('~/server/middleware/limiters');

// TODO: Implement or reuse existing rate limiters if available and applicable for viewers
// const { registerLimiter, loginLimiter } = require('~/server/middleware');

const router = express.Router();

const allowViewerRegistration = isEnabled(process.env.ALLOW_VIEWER_REGISTRATION !== 'false'); // Default true

// Viewer Registration
router.post('/register', viewerRegisterLimiter, async (req, res) => {
  if (!allowViewerRegistration) {
    return res.status(403).json({ message: 'Viewer registration is disabled.' });
  }
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Basic email validation
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters long' });
    }

    const existingViewer = await Viewer.findOne({ email: email.toLowerCase() });
    if (existingViewer) {
      return res.status(400).json({ message: 'Viewer already exists with this email' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newViewer = new Viewer({
      email: email.toLowerCase(),
      password: hashedPassword,
    });

    await newViewer.save();

    // Do not log in viewer immediately after registration, require them to log in separately.
    res.status(201).json({ message: 'Viewer registered successfully. Please login.' });

  } catch (error) {
    logger.error('[AuthViewerRegister] Error registering viewer:', error);
    res.status(500).json({ message: 'Error registering viewer' });
  }
});

// Viewer Login
router.post('/login', viewerLoginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const viewer = await Viewer.findOne({ email: email.toLowerCase() });
    if (!viewer) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, viewer.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const payload = {
      viewerId: viewer.id,
      email: viewer.email,
      role: 'viewer',
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '1h', // Use existing env var or default
    });
    
    // Set httpOnly cookie, similar to existing auth
    // Note: Domain and secure flags should be configured based on environment
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    };
    if (process.env.DOMAIN_SERVER) {
      cookieOptions.domain = process.env.DOMAIN_SERVER;
    }

    res.cookie('viewer_token', token, cookieOptions);

    res.json({ 
      message: 'Viewer login successful', 
      token, // Also sending token in response body for flexibility, though cookie is primary
      viewer: {
        id: viewer.id,
        email: viewer.email,
        role: viewer.role,
      }
    });

  } catch (error) {
    logger.error('[AuthViewerLogin] Error logging in viewer:', error);
    res.status(500).json({ message: 'Error logging in viewer' });
  }
});

// Viewer Logout (Optional but good practice)
router.post('/logout', (req, res) => {
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: new Date(0) // Set to a past date
  };
  if (process.env.DOMAIN_SERVER) {
    cookieOptions.domain = process.env.DOMAIN_SERVER;
  }
  res.cookie('viewer_token', '', cookieOptions);
  res.status(200).json({ message: 'Viewer logged out successfully' });
});


module.exports = router; 