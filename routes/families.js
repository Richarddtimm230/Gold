const express = require('express');
const router = express.Router();
const Family = require('../models/Family');

/**
 * GET all families
 */
router.get('/', async (req, res) => {
  try {
    const families = await Family.find().sort({ name: 1 });
    res.json(families);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET family by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const family = await Family.findById(req.params.id);
    if (!family) return res.status(404).json({ error: 'Family not found' });
    res.json(family);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * CREATE family
 */
router.post('/', async (req, res) => {
  try {
    const family = await Family.create(req.body);
    res.status(201).json(family);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * UPDATE family
 */
router.patch('/:id', async (req, res) => {
  try {
    const family = await Family.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!family) return res.status(404).json({ error: 'Family not found' });
    res.json(family);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * DELETE family
 */
router.delete('/:id', async (req, res) => {
  try {
    const family = await Family.findByIdAndDelete(req.params.id);
    if (!family) return res.status(404).json({ error: 'Family not found' });
    res.json({ message: 'Family deleted successfully!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
