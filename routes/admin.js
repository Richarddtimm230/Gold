// routes/admin.js

const express = require('express');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { authMiddleware } = require('./auth');
const SiteContent = require('../models/SiteContent');

const router = express.Router();

cloudinary.config();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Invalid file type.'), false);
  }
});

const ensureSuperAdminRole = (req, res, next) => {
  if (!req.user || req.user.role !== 'superadmin') {
    return res.status(403).json({ error: 'Forbidden: Super Admin access required.' });
  }
  next();
};

router.use(authMiddleware, ensureSuperAdminRole);

// GET /api/admin/homepage
router.get('/homepage', async (req, res) => {
  try {
    const data = await SiteContent.findOne({ type: 'homepage' }).lean();
    if (!data) {
      return res.status(200).json({
        heroTitle: '',
        heroSubtitle: '',
        heroMotto: '',
        heroImages: [],
        aboutSection: '',
        carouselSlides: []
      });
    }
    res.status(200).json({
      heroTitle: data.heroTitle || '',
      heroSubtitle: data.heroSubtitle || '',
      heroMotto: data.heroMotto || '',
      heroImages: data.heroImages || [],
      aboutSection: data.aboutSection || '',
      carouselSlides: data.carouselSlides || []
    });
  } catch (error) {
    console.error('Error fetching homepage content:', error);
    res.status(500).json({ error: 'Failed to fetch homepage content.' });
  }
});

// PUT /api/admin/homepage
router.put('/homepage', async (req, res) => {
  try {
    const { heroTitle, heroSubtitle, heroMotto, heroImages, aboutSection, carouselSlides } = req.body;

    if (typeof heroTitle !== 'string' || !Array.isArray(heroImages) ||
        typeof aboutSection !== 'string' || !Array.isArray(carouselSlides)) {
      return res.status(400).json({ error: 'Invalid data format.' });
    }

    await SiteContent.findOneAndUpdate(
      { type: 'homepage' },
      {
        type: 'homepage',
        heroTitle: heroTitle || '',
        heroSubtitle: heroSubtitle || '',
        heroMotto: heroMotto || '',
        heroImages,
        aboutSection: aboutSection || '',
        carouselSlides
      },
      { upsert: true, new: true }
    );

    res.status(200).json({ message: 'Homepage content updated successfully!' });
  } catch (error) {
    console.error('Error updating homepage content:', error);
    res.status(500).json({ error: error.message || 'Failed to update homepage content.' });
  }
});

// POST /api/admin/upload-image
router.post('/upload-image', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    const b64 = Buffer.from(req.file.buffer).toString('base64');
    const dataURI = 'data:' + req.file.mimetype + ';base64,' + b64;

    const result = await cloudinary.uploader.upload(dataURI, {
      folder: 'goldlinc_homepage_images',
      resource_type: 'image'
    });

    res.status(200).json({ url: result.secure_url });
  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).json({ error: error.message || 'Failed to upload image.' });
  }
});

module.exports = router;
