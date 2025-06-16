// routes/admin.js

const express = require('express');
const admin = require('firebase-admin'); // Still needed for Firestore operations
const multer = require('multer'); // For handling file uploads
const cloudinary = require('cloudinary').v2; // Import Cloudinary SDK

// Assuming authMiddleware is exported from your auth route file
// Adjust the path if your auth.js is in a different location relative to admin.js
const { authMiddleware } = require('./auth'); 

const router = express.Router();

// --- Configure Cloudinary using CLOUDINARY_URL environment variable ---
cloudinary.config(); 

// --- Multer setup for image uploads ---
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // Limit file size to 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images (JPEG, PNG, GIF, WebP) are allowed.'), false);
    }
  }
});

// --- Middleware to ensure Super Admin role ---
const ensureSuperAdminRole = (req, res, next) => {
  if (!req.user || req.user.role !== 'superadmin') {
    return res.status(403).json({ error: 'Forbidden: Super Admin access required.' });
  }
  next();
};

// Apply authMiddleware and ensureSuperAdminRole to all admin routes
router.use(authMiddleware, ensureSuperAdminRole);

// ====================================================================
// GET /api/admin/homepage - Fetch homepage content (Firestore)
// ====================================================================
router.get('/homepage', async (req, res) => {
  try {
    const db = req.app.locals.firestoreDB; // Access Firestore instance from app.js
    const homepageDocRef = db.collection('siteContent').doc('homepage');
    const doc = await homepageDocRef.get();

    if (!doc.exists) {
      // If no homepage content exists, return a default empty structure
      return res.status(200).json({
        heroTitle: '',
        heroSubtitle: '',
        heroMotto: '',
        heroImages: [],
        aboutSection: '',
        carouselSlides: [] // NEW: Default empty array for carousel slides
      });
    }

    // Return existing data, ensuring new fields default to empty if not present
    const data = doc.data();
    res.status(200).json({
      heroTitle: data.heroTitle || '',
      heroSubtitle: data.heroSubtitle || '',
      heroMotto: data.heroMotto || '',
      heroImages: data.heroImages || [],
      aboutSection: data.aboutSection || '',
      carouselSlides: data.carouselSlides || [] // NEW: Ensure carouselSlides is an array
    });
  } catch (error) {
    console.error('Error fetching homepage content:', error);
    res.status(500).json({ error: 'Failed to fetch homepage content.' });
  }
});

// ====================================================================
// PUT /api/admin/homepage - Update homepage content (Firestore)
// ====================================================================
router.put('/homepage', async (req, res) => {
  try {
    const db = req.app.locals.firestoreDB; // Access Firestore instance
    const { heroTitle, heroSubtitle, heroMotto, heroImages, aboutSection, carouselSlides } = req.body; // NEW: Destructure carouselSlides

    // Basic validation (you can add more robust validation here)
    if (typeof heroTitle !== 'string' || !Array.isArray(heroImages) || typeof aboutSection !== 'string' || !Array.isArray(carouselSlides)) { // NEW: Validate carouselSlides
      return res.status(400).json({ error: 'Invalid data format for homepage update.' });
    }

    const homepageDocRef = db.collection('siteContent').doc('homepage');
    await homepageDocRef.set({
      heroTitle: heroTitle || '',
      heroSubtitle: heroSubtitle || '',
      heroMotto: heroMotto || '',
      heroImages: heroImages, // Array of image URLs
      aboutSection: aboutSection || '',
      carouselSlides: carouselSlides // NEW: Save carouselSlides
    }, { merge: true }); // Use merge: true to only update specified fields

    res.status(200).json({ message: 'Homepage content updated successfully!' });
  } catch (error) {
    console.error('Error updating homepage content:', error);
    res.status(500).json({ error: error.message || 'Failed to update homepage content.' });
  }
});

// ====================================================================
// POST /api/admin/upload-image - Upload an image to Cloudinary
// ====================================================================
router.post('/upload-image', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    const b64 = Buffer.from(req.file.buffer).toString('base64');
    let dataURI = 'data:' + req.file.mimetype + ';base64,' + b64;

    const result = await cloudinary.uploader.upload(dataURI, {
      folder: 'goldlinc_homepage_images', // Optional: organize uploads in a folder
      resource_type: 'image'
    });

    res.status(200).json({ url: result.secure_url });

  } catch (error) {
    console.error('Error uploading image to Cloudinary:', error);
    res.status(500).json({ error: error.message || 'Failed to upload image.' });
  }
});

module.exports = router;
