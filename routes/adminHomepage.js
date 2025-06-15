const express = require('express');
const router = express.Router();
const multer = require('multer');
const bcrypt = require('bcryptjs');

// Firestore DB instance (update the path if you use app.locals.firestoreDB or a different export)
const db = require('../firestore'); // Or: req.app.locals.firestoreDB in each route handler

const storage = multer.memoryStorage();
const upload = multer({ storage });

// Utility: get staff collection
function siteContent() {
  return db.collection('siteContent');
}
// Middleware: Only superadmins allowed
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'superadmin') {
    return res.status(403).json({ error: "Forbidden" });
  }
  next();
};

// ====== GET homepage data ======
router.get('/homepage', requireAdmin, async (req, res) => {
  try {
    const snap = await db.collection('siteContent').doc('homepage').get();
    if (!snap.exists) return res.json({});
    res.json(snap.data());
  } catch (err) {
    res.status(500).json({ error: "Firestore error", details: err.message });
  }
});

// ====== UPDATE homepage data ======
router.put('/homepage', requireAdmin, async (req, res) => {
  const { heroTitle, heroSubtitle, heroMotto, heroImages, aboutSection } = req.body;
  try {
    await db.collection('siteContent').doc('homepage').set(
      { heroTitle, heroSubtitle, heroMotto, heroImages, aboutSection },
      { merge: true }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Firestore error", details: err.message });
  }
});

// ====== IMAGE UPLOAD (Firebase Storage) ======
const upload = multer({ storage: multer.memoryStorage() });

router.post('/upload-image', requireAdmin, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  try {
    const fileName = `homepage/${Date.now()}_${req.file.originalname.replace(/\s+/g, '_')}`;
    const file = bucket.file(fileName);

    const stream = file.createWriteStream({
      metadata: { contentType: req.file.mimetype }
    });

    stream.on('error', err => {
      console.error('[Upload error]', err);
      res.status(500).json({ error: "Upload error", details: err.message });
    });

    stream.on('finish', async () => {
      try {
        await file.makePublic();
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${file.name}`;
        res.json({ url: publicUrl });
      } catch (err) {
        res.status(500).json({ error: "Error making file public", details: err.message });
      }
    });

    stream.end(req.file.buffer);
  } catch (err) {
    res.status(500).json({ error: "Unexpected upload error", details: err.message });
  }
});

module.exports = router;
