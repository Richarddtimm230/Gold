const express = require('express');
const router = express.Router();
const BursaryStaff = require('../models/BursaryStaff');
const GeneralStaff = require('../models/GeneralStaff');
const RegistrarStaff = require('../models/RegistrarStaff');

// Bursary Staff CRUD
router.get('/bursary', async (req, res) => {
  res.json(await BursaryStaff.find());
});
router.post('/bursary', async (req, res) => {
  res.status(201).json(await BursaryStaff.create(req.body));
});
router.patch('/bursary/:id', async (req, res) => {
  res.json(await BursaryStaff.findByIdAndUpdate(req.params.id, req.body, { new: true }));
});
router.delete('/bursary/:id', async (req, res) => {
  await BursaryStaff.findByIdAndDelete(req.params.id);
  res.json({ message: 'Deleted' });
});

// General Staff CRUD
router.get('/general', async (req, res) => {
  res.json(await GeneralStaff.find());
});
router.post('/general', async (req, res) => {
  res.status(201).json(await GeneralStaff.create(req.body));
});
router.patch('/general/:id', async (req, res) => {
  res.json(await GeneralStaff.findByIdAndUpdate(req.params.id, req.body, { new: true }));
});
router.delete('/general/:id', async (req, res) => {
  await GeneralStaff.findByIdAndDelete(req.params.id);
  res.json({ message: 'Deleted' });
});

// Registrar Staff CRUD
router.get('/registrar', async (req, res) => {
  res.json(await RegistrarStaff.find());
});
router.post('/registrar', async (req, res) => {
  res.status(201).json(await RegistrarStaff.create(req.body));
});
router.patch('/registrar/:id', async (req, res) => {
  res.json(await RegistrarStaff.findByIdAndUpdate(req.params.id, req.body, { new: true }));
});
router.delete('/registrar/:id', async (req, res) => {
  await RegistrarStaff.findByIdAndDelete(req.params.id);
  res.json({ message: 'Deleted' });
});

module.exports = router;
