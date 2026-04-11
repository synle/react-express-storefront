const express = require('express');
const { OAuth2Client } = require('google-auth-library');
const { v4: uuidv4 } = require('uuid');
const { requireAuth, signToken } = require('../middleware/auth');

const router = express.Router();

/**
 * POST /api/auth/google
 * Verify Google ID token and create/login user.
 * Body: { credential: "google-id-token" }
 */
router.post('/google', async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ error: 'Missing Google credential token' });
    }

    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    const payload = ticket.getPayload();

    const { sub: googleId, email, name, picture } = payload;
    const db = req.app.locals.db;

    // Check if user exists
    let user = await db('users').where({ google_id: googleId }).first();

    if (!user) {
      // Create new user
      const id = uuidv4();
      await db('users').insert({
        id,
        email,
        name,
        picture,
        google_id: googleId
      });
      user = { id, email, name, picture, google_id: googleId };
    } else {
      // Update profile info in case it changed
      await db('users').where({ id: user.id }).update({ name, picture });
      user.name = name;
      user.picture = picture;
    }

    // Generate JWT
    const token = signToken(user);

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture
      }
    });
  } catch (err) {
    console.error('Google auth error:', err.message);
    res.status(401).json({ error: 'Invalid Google credential' });
  }
});

/**
 * GET /api/auth/me
 * Get current user info from JWT.
 */
router.get('/me', requireAuth, async (req, res) => {
  const db = req.app.locals.db;
  const user = await db('users').where({ id: req.user.id }).first();
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    picture: user.picture
  });
});

module.exports = router;
