const express = require('express');
const router = express.Router();
const multer = require('multer');
const Student = require('../models/Student');

// Multer setup for photo uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Utility: generate student_id if needed
function generateStudentId() {
  return 'STU' + Math.floor(100000 + Math.random() * 900000); // e.g., STU123456
}

// POST /api/students - enroll new student
router.post('/', upload.single('photo'), async (req, res) => {
  try {
    const data = req.body;

    // Validate required fields (add/remove as per your schema)
    const required = ['surname', 'firstname', 'dob', 'gender', 'regNo', 'class', 'parentName', 'parentRelationship', 'parentPhone', 'password'];
    for (const field of required) {
      if (!data[field] || data[field].trim() === "") {
        return res.status(400).json({ error: `Missing required field: ${field}` });
      }
    }

    // If student_id is required and not supplied, generate one
    let student_id = data.student_id;
    if (!student_id) {
      student_id = generateStudentId();
    }

    // Handle photo
    let photo;
    if (req.file) {
      photo = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    }

    // Ensure regNo and student_id are unique
    const regNoExists = await Student.findOne({ regNo: data.regNo });
    if (regNoExists) {
      return res.status(400).json({ error: 'A student with that registration number already exists.' });
    }
    const studentIdExists = await Student.findOne({ student_id });
    if (studentIdExists) {
      return res.status(400).json({ error: 'A student with that student ID already exists.' });
    }

    // Create new student
    const student = new Student({
      student_id,
      surname: data.surname,
      firstname: data.firstname,
      othernames: data.othernames,
      dob: data.dob,
      gender: data.gender,
      nationality: data.nationality,
      state: data.state,
      lga: data.lga,
      address: data.address,
      photo,
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
      password: data.password, // Hash in production!
    });
    await student.save();
    res.status(201).json({ message: 'Student enrolled successfully!' });
  } catch (error) {
    console.error('[ENROLL ERROR]', error); // This shows up in Render logs!
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: error.message });
    }
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Duplicate unique field (student_id or regNo).' });
    }
    res.status(500).json({ error: error.message || 'Unknown server error.' });
  }
});

// GET /api/students - retrieve students with optional filters
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.class) filter.class = req.query.class;
    if (req.query.classArm) filter.classArm = req.query.classArm;
    if (req.query.academicSession) filter.academicSession = req.query.academicSession;
    // Add more filters as needed

    const students = await Student.find(filter)
      .populate('class', 'name')
      .sort({ surname: 1, firstname: 1 });
    res.json(students);
  } catch (error) {
    console.error('[GET STUDENTS ERROR]', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
