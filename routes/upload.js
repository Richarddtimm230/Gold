const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');

// No need to call cloudinary.config() if CLOUDINARY_URL is set

const upload = multer({ storage: multer.memoryStorage() });

router.post('/image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image file' });

    const stream = cloudinary.uploader.upload_stream(
      { folder: 'cbt-images', resource_type: 'image' },
      (err, result) => {
        if (err || !result) return res.status(500).json({ error: 'Upload failed' });
        return res.json({ url: result.secure_url });
      }
    );
    streamifier.createReadStream(req.file.buffer).pipe(stream);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
