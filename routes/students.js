const express = require('express');
const router = express.Router();
const multer = require('multer');
const bcrypt = require('bcryptjs'); // Use bcryptjs for Node.js compatibility
const jwt = require('jsonwebtoken');
const studentAuthMiddleware = require('../middleware/studentAuth'); // Import BEFORE using!

// Firestore DB instance (ensure you added it to app.locals or require db initialization here)
const db = require('../firestore'); // You can create a firestore.js that exports your db instance, or use app.locals.firestoreDB

// Multer setup for photo uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Utility: generate student_id
function generateStudentId() {
  return 'STU' + Math.floor(100000 + Math.random() * 900000);
}

// Utility: get students collection reference
function studentsCollection() {
  return db.collection('students');
}

// --- Enroll a new student ---
router.post('/', upload.single('photo'), async (req, res) => {
  try {
    const data = req.body;

    // Required field list
    const required = [
      'surname', 'firstname', 'dob', 'gender',
      'regNo', 'class', 'parentName',
      'parentRelationship', 'parentPhone', 'password'
    ];

    for (const field of required) {
      if (
        !data[field] ||
        (typeof data[field] === 'string' && data[field].trim() === '')
      ) {
        return res.status(400).json({ error: `Missing required field: ${field}` });
      }
    }

    // Ensure regNo and student_id are unique
    const regNoSnap = await studentsCollection().where('regNo', '==', data.regNo).limit(1).get();
    if (!regNoSnap.empty) {
      return res.status(400).json({ error: 'A student with that registration number already exists.' });
    }

    let student_id = data.student_id || generateStudentId();
    const studentIdSnap = await studentsCollection().where('student_id', '==', student_id).limit(1).get();
    if (!studentIdSnap.empty) {
      return res.status(400).json({ error: 'A student with that student ID already exists.' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, 10);

    // Convert admission date to Date object if provided
    const admissionDate = data.admissionDate ? new Date(data.admissionDate) : undefined;

    // Handle photo
    let photo;
    if (req.file) {
      photo = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    }

    // Create student doc data
    const studentDoc = {
      student_id,
      surname: data.surname,
      firstname: data.firstname,
      othernames: data.othernames || '',
      dob: data.dob,
      gender: data.gender,
      nationality: data.nationality || '',
      state: data.state || '',
      lga: data.lga || '',
      address: data.address || '',
      photo: photo || '',
      regNo: data.regNo,
      class: data.class,
      classArm: data.classArm || '',
      previousSchool: data.previousSchool || '',
      admissionDate: admissionDate || null,
      academicSession: data.academicSession || '',
      parentName: data.parentName,
      parentRelationship: data.parentRelationship,
      parentPhone: data.parentPhone,
      parentEmail: data.parentEmail || '',
      parentAddress: data.parentAddress || '',
      parentOccupation: data.parentOccupation || '',
      studentEmail: data.studentEmail || '',
      studentPhone: data.studentPhone || '',
      religion: data.religion || '',
      bloodGroup: data.bloodGroup || '',
      genotype: data.genotype || '',
      medical: data.medical || '',
      password: hashedPassword
    };

    await studentsCollection().add(studentDoc);
    res.status(201).json({ message: 'Student enrolled successfully!' });
  } catch (error) {
    console.error('[ENROLL ERROR]', error);
    res.status(500).json({ error: error.message || 'Unknown server error.' });
  }
});

// --- Retrieve all students with filters (summary fields only) ---
router.get('/', async (req, res) => {
  try {
    let query = studentsCollection();
    if (req.query.class) query = query.where('class', '==', req.query.class);
    if (req.query.classArm) query = query.where('classArm', '==', req.query.classArm);
    if (req.query.academicSession) query = query.where('academicSession', '==', req.query.academicSession);

    const snap = await query.get();
    const students = [];
    snap.forEach(doc => {
      const d = doc.data();
      students.push({
        student_id: d.student_id,
        surname: d.surname,
        firstname: d.firstname,
        regNo: d.regNo,
        class: d.class,
        classArm: d.classArm,
        photo: d.photo,
        academicSession: d.academicSession
      });
    });

    // Optionally sort by surname/firstname
    students.sort((a, b) => {
      if (a.surname === b.surname) {
        return a.firstname.localeCompare(b.firstname);
      }
      return a.surname.localeCompare(b.surname);
    });

    res.json(students);
  } catch (error) {
    console.error('[GET STUDENTS ERROR]', error);
    res.status(500).json({ error: error.message });
  }
});

// --- Get logged-in student profile for dashboard ---
router.get('/me', studentAuthMiddleware, async (req, res) => {
  const student = req.student; // Your auth middleware must attach Firestore student doc data!
  res.json({
    name: `${student.firstname} ${student.surname}`,
    reg_no: student.regNo,
    class: student.class,
    classArm: student.classArm,
    session: student.academicSession,
    term: student.term || '-',
    photo_url: student.photo,
    timetable: student.timetable || [],
    news: student.news || [],
    eclass_summary: [
      'My Classrooms',
      'Unread messages',
      'Happening now'
    ]
  });
});

// --- Student login ---
router.post('/login', async (req, res) => {
  const { regNo, studentEmail, password } = req.body;
  if ((!regNo && !studentEmail) || !password) {
    return res.status(400).json({ error: 'Registration number or email and password are required.' });
  }
  try {
    // Find student by regNo or email
    let query = studentsCollection();
    if (regNo) {
      query = query.where('regNo', '==', regNo);
    } else {
      query = query.where('studentEmail', '==', studentEmail);
    }
    const snap = await query.limit(1).get();
    if (snap.empty) return res.status(401).json({ error: 'Invalid credentials.' });

    const studentDoc = snap.docs[0];
    const student = studentDoc.data();

    const isMatch = await bcrypt.compare(password, student.password);
    if (!isMatch) return res.status(401).json({ error: 'Invalid credentials.' });

    // JWT
    const token = jwt.sign(
      { id: studentDoc.id, regNo: student.regNo, role: 'student' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: studentDoc.id,
        name: `${student.firstname} ${student.surname}`,
        regNo: student.regNo,
        role: 'student',
        class: student.class,
        photo_url: student.photo
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
