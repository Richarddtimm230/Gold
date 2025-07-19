// models/SiteContent.js
const mongoose = require('mongoose');

const CarouselSlideSchema = new mongoose.Schema({
  image: { type: String, required: true },
  caption: { type: String },
}, { _id: false });

const SiteContentSchema = new mongoose.Schema({
  type: { type: String, required: true, unique: true }, // e.g., 'homepage'
  heroTitle: { type: String, default: '' },
  heroSubtitle: { type: String, default: '' },
  heroMotto: { type: String, default: '' },
  heroImages: { type: [String], default: [] },
  aboutSection: { type: String, default: '' },
  carouselSlides: { type: [CarouselSlideSchema], default: [] }
}, { timestamps: true });

module.exports = mongoose.model('SiteContent', SiteContentSchema);
