const express = require('express');
const router = express.Router();
const multer = require('multer');
const { db, bucket } = require('../config/firebase');

// Replace with your actual admin middleware
const requireAdmin = (req, res, next) => {
  // Example: req.user.role === 'superadmin'
  if (!req.user || req.user.role !== 'superadmin') {
    return res.status(403).json({ error: "Forbidden" });
  }
  next();
};

// ========== GET homepage data ==========
router.get('/homepage', requireAdmin, async (req, res) => {
  try {
    const snap = await db.collection('siteContent').doc('homepage').get();
    if (!snap.exists) return res.json({});
    res.json(snap.data());
  } catch (err) {
    res.status(500).json({ error: "Firestore error" });
  }
});

// ========== UPDATE homepage data ==========
router.put('/homepage', requireAdmin, async (req, res) => {
  const { heroTitle, heroSubtitle, heroMotto, heroImages, aboutSection } = req.body;
  try {
    await db.collection('siteContent').doc('homepage').set({
      heroTitle, heroSubtitle, heroMotto, heroImages, aboutSection
    }, { merge: true });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Firestore error" });
  }
});

// ========== IMAGE UPLOAD ==========
const upload = multer({ storage: multer.memoryStorage() });

router.post('/upload-image', requireAdmin, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  const fileName = `homepage/${Date.now()}_${req.file.originalname}`;
  const file = bucket.file(fileName);

  const stream = file.createWriteStream({
    metadata: {
      contentType: req.file.mimetype
    }
  });

  stream.on('error', err => res.status(500).json({ error: "Upload error" }));
  stream.on('finish', async () => {
    await file.makePublic();
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${file.name}`;
    res.json({ url: publicUrl });
  });

  stream.end(req.file.buffer);
});

module.exports = router;
