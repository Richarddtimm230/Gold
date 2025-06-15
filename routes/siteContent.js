const express = require('express');
const router = express.Router();
const multer = require('multer');

// Firestore DB instance
const db = require('../firestore'); // Adjust path as needed

const storage = multer.memoryStorage();
const upload = multer({ storage });

// Utility: get site content collection
function siteCollection() {
  return db.collection('site');
}

// Middleware: Only superadmins allowed
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'superadmin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
};

/**
 * GET /api/site/homepage - Return homepage content
 */
router.get('/homepage', requireAdmin, async (req, res) => {
  try {
    const doc = await siteCollection().doc('homepage').get();
    if (!doc.exists) return res.json({});
    const data = doc.data();
    // If you want to mask/omit fields, do it here
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Firestore error', details: err.message });
  }
});

/**
 * PUT /api/site/homepage - Update homepage content (text fields only)
 */
router.put('/homepage', requireAdmin, async (req, res) => {
  const { heroTitle, heroSubtitle, heroMotto, aboutSection } = req.body;
  try {
    await siteCollection().doc('homepage').set(
      { heroTitle, heroSubtitle, heroMotto, aboutSection },
      { merge: true }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Firestore error', details: err.message });
  }
});

/**
 * POST /api/site/homepage/images - Upload hero images as data URIs (base64)
 * Accepts multiple files named 'heroImages'
 */
router.post(
  '/homepage/images',
  requireAdmin,
  upload.array('heroImages'),
  async (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'No images uploaded' });
      }

      // Convert each file to a data URI string
      const heroImages = req.files.map(file =>
        `data:${file.mimetype};base64,${file.buffer.toString('base64')}`
      );

      // Update Firestore: Replace (or merge with) heroImages array
      await siteCollection().doc('homepage').set(
        { heroImages },
        { merge: true }
      );

      res.status(200).json({ message: 'Hero images updated', heroImages });
    } catch (err) {
      res.status(500).json({ error: 'Image upload error', details: err.message });
    }
  }
);

module.exports = router;
