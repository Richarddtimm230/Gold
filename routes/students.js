const express = require('express');
const router = express.Router();
const multer = require('multer');
const Student = require('../models/Student');

// Multer setup for photo uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Helper function for filtering students
function buildStudentQuery(query) {
  const filter = {};
  if (query.class) filter.class = query.class;
  if (query.classArm) filter.classArm = query.classArm;
  if (query.academicSession) filter.academicSession = query.academicSession;
  // Add accountStatus, subscriptionStatus here if needed, e.g. filter.accountStatus = query.accountStatus;
  return filter;
}

// POST /api/students - enroll new student
router.post('/', upload.single('photo'), async (req, res) => {
  try {
    const data = req.body;
    // Handle photo upload (save as buffer, or change to save URL if you use cloud upload)
    let photo;
    if (req.file) {
      // Option 1: Save photo as buffer (not scalable for large images/db)
      // photo = req.file.buffer;

      // Option 2: Save as base64 (for small images)
      photo = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    }
    // TODO: Hash password before saving in production!
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

// GET /api/students - retrieve students with optional filters
router.get('/', async (req, res) => {
  try {
    const filter = buildStudentQuery(req.query);
    // Optionally populate class name, adjust as needed if class is ObjectId
    const students = await Student.find(filter)
      .populate('class', 'name') // If using Class collection
      .sort({ surname: 1, firstname: 1 });
    res.json(students);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
