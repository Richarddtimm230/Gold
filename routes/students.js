const express = require('express');
const router = express.Router();
const multer = require('multer');
const Student = require('../models/Student');

// Multer setup for photo uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });

// POST /api/students - enroll new student
router.post('/', upload.single('photo'), async (req, res) => {
  try {
    const data = req.body;
    // Handle photo upload (save to cloud or as base64, here just as buffer)
    const photo = req.file ? req.file.buffer : undefined;
    const student = new Student({
      surname: data.surname,
      firstname: data.firstname,
      othernames: data.othernames,
      dob: data.dob,
      gender: data.gender,
      nationality: data.nationality,
      state: data.state,
      lga: data.lga,
      address: data.address,
      regNo: data.regNo,
      class: data.class,
      classArm: data.classArm,
      previousSchool: data.previousSchool,
      admissionDate: data.admissionDate,
      academicSession: data.academicSession,
      parentName: data.parentName,
      parentRelationship: data.parentRelationship,
      parentPhone: data.parentPhone,
      parentEmail: data.parentEmail,
      parentAddress: data.parentAddress,
      parentOccupation: data.parentOccupation,
      studentEmail: data.studentEmail,
      studentPhone: data.studentPhone,
      religion: data.religion,
      bloodGroup: data.bloodGroup,
      genotype: data.genotype,
      medical: data.medical,
      password: data.password, // hash before saving in production!
      photo
    });
    await student.save();
    res.status(201).json({ message: 'Student enrolled successfully!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
