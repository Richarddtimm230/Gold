const express = require('express');
const router = express.Router();
const multer = require('multer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const studentAuthMiddleware = require('../middleware/studentAuth');
const db = require('../firestore');

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
      password: hashedPassword,
      academic: [],
      attendance: [],
      guardians: [],
      hostel: {},
      transport: {},
      fees: [],
      docs: [],
      createdAt: new Date(),
      updatedAt: new Date()
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

// --- Get logged-in student profile for dashboard/profile page ---
router.get('/me', studentAuthMiddleware, async (req, res) => {
  const student = req.student;
  res.json({
    name: `${student.firstname} ${student.surname}`,
    surname: student.surname,
    firstname: student.firstname,
    othernames: student.othernames || '',
    reg_no: student.regNo,
    regNo: student.regNo,
    class: student.class,
    classArm: student.classArm,
    session: student.academicSession,
    term: student.term || '-',
    gender: student.gender || '',
    dob: student.dob || '',
    photo_url: student.photo,
    nationality: student.nationality || '',
    state: student.state || '',
    lga: student.lga || '',
    address: student.address || '',
    parentName: student.parentName,
    parentRelationship: student.parentRelationship,
    parentPhone: student.parentPhone,
    parentEmail: student.parentEmail || '',
    parentAddress: student.parentAddress || '',
    parentOccupation: student.parentOccupation || '',
    studentEmail: student.studentEmail || '',
    studentPhone: student.studentPhone || '',
    religion: student.religion || '',
    bloodGroup: student.bloodGroup || '',
    genotype: student.genotype || '',
    medical: student.medical || '',
    admissionDate: student.admissionDate || '',
    previousSchool: student.previousSchool || '',
    academic: student.academic || [],
    attendance: student.attendance || [],
    guardians: student.guardians || [],
    hostel: student.hostel || {},
    transport: student.transport || {},
    fees: student.fees || [],
    docs: student.docs || [],
    createdAt: student.createdAt || '',
    updatedAt: student.updatedAt || '',
  });
});

// --- Get a student profile by regNo (for admin/staff or direct lookup) ---
router.get('/:regNo', async (req, res) => {
  try {
    const regNo = req.params.regNo;
    const snapshot = await studentsCollection().where('regNo', '==', regNo).limit(1).get();
    if (snapshot.empty) return res.status(404).json({ error: 'Student not found' });

    const profile = snapshot.docs[0].data();
    res.json(profile);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
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

// --- Update student profile (protected, student only) ---
router.put('/me', studentAuthMiddleware, upload.single('photo'), async (req, res) => {
  try {
    const student = req.student;
    const data = req.body;

    // Only allow updating allowed fields
    const updatableFields = [
      'surname', 'firstname', 'othernames', 'dob', 'gender', 'nationality',
      'state', 'lga', 'address', 'class', 'classArm', 'studentEmail',
      'studentPhone', 'religion', 'bloodGroup', 'genotype', 'medical'
    ];
    let updates = {};
    updatableFields.forEach(field => {
      if (data[field]) updates[field] = data[field];
    });

    // Handle photo upload
    if (req.file) {
      updates.photo = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    }

    updates.updatedAt = new Date();

    // Find student doc by regNo (from auth)
    const snap = await studentsCollection().where('regNo', '==', student.regNo).limit(1).get();
    if (snap.empty) return res.status(404).json({ error: 'Student not found' });
    const docId = snap.docs[0].id;
    await studentsCollection().doc(docId).update(updates);

    res.json({ message: 'Profile updated successfully!' });
  } catch (err) {
    console.error('[UPDATE PROFILE ERROR]', err);
    res.status(500).json({ error: err.message || 'Server error.' });
  }
});

// --- Change password (protected, student only) ---
router.post('/change-password', studentAuthMiddleware, async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword)
    return res.status(400).json({ error: 'Old and new password are required.' });
  try {
    const student = req.student;
    const isMatch = await bcrypt.compare(oldPassword, student.password);
    if (!isMatch) return res.status(400).json({ error: 'Old password incorrect.' });

    const hashed = await bcrypt.hash(newPassword, 10);
    // Find student doc by regNo
    const snap = await studentsCollection().where('regNo', '==', student.regNo).limit(1).get();
    if (snap.empty) return res.status(404).json({ error: 'Student not found' });
    const docId = snap.docs[0].id;
    await studentsCollection().doc(docId).update({ password: hashed, updatedAt: new Date() });
    res.json({ message: 'Password changed successfully!' });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Server error.' });
  }
});

// --- Upload a document for a student (protected, student only) ---
router.post('/me/docs', studentAuthMiddleware, upload.single('document'), async (req, res) => {
  try {
    const student = req.student;
    if (!req.file) return res.status(400).json({ error: 'No document uploaded.' });

    const docMeta = {
      label: req.body.label || req.file.originalname,
      value: req.file.originalname,
      url: `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`,
      uploadedAt: new Date()
    };

    // Find student doc by regNo
    const snap = await studentsCollection().where('regNo', '==', student.regNo).limit(1).get();
    if (snap.empty) return res.status(404).json({ error: 'Student not found' });
    const docId = snap.docs[0].id;
    const docData = snap.docs[0].data();
    const docsArr = docData.docs || [];
    docsArr.push(docMeta);

    await studentsCollection().doc(docId).update({ docs: docsArr, updatedAt: new Date() });

    res.json({ message: 'Document uploaded successfully!', doc: docMeta });
  } catch (err) {
    console.error('[UPLOAD DOC ERROR]', err);
    res.status(500).json({ error: err.message || 'Server error.' });
  }
});

// --- Update academic record for a student (admin/staff only, you can add admin middleware here) ---
router.post('/:regNo/academic', async (req, res) => {
  try {
    const regNo = req.params.regNo;
    const academicEntry = req.body; // should include session, term, class, subject, total, grade, remark
    if (!academicEntry.session || !academicEntry.term || !academicEntry.class || !academicEntry.subject) {
      return res.status(400).json({ error: 'Missing required academic fields.' });
    }
    // Find student doc by regNo
    const snap = await studentsCollection().where('regNo', '==', regNo).limit(1).get();
    if (snap.empty) return res.status(404).json({ error: 'Student not found' });
    const docId = snap.docs[0].id;
    const docData = snap.docs[0].data();
    const academicArr = docData.academic || [];
    academicArr.push(academicEntry);

    await studentsCollection().doc(docId).update({ academic: academicArr, updatedAt: new Date() });

    res.json({ message: 'Academic record updated!', academic: academicArr });
  } catch (err) {
    console.error('[ACADEMIC UPDATE ERROR]', err);
    res.status(500).json({ error: err.message || 'Server error.' });
  }
});

// --- Add attendance record (admin/staff only, you can add admin middleware here) ---
router.post('/:regNo/attendance', async (req, res) => {
  try {
    const regNo = req.params.regNo;
    const attendanceEntry = req.body;
    if (!attendanceEntry.session || !attendanceEntry.term || !attendanceEntry.present || !attendanceEntry.total) {
      return res.status(400).json({ error: 'Missing required attendance fields.' });
    }
    // Find student doc by regNo
    const snap = await studentsCollection().where('regNo', '==', regNo).limit(1).get();
    if (snap.empty) return res.status(404).json({ error: 'Student not found' });
    const docId = snap.docs[0].id;
    const docData = snap.docs[0].data();
    const attendanceArr = docData.attendance || [];
    attendanceArr.push(attendanceEntry);

    await studentsCollection().doc(docId).update({ attendance: attendanceArr, updatedAt: new Date() });

    res.json({ message: 'Attendance record updated!', attendance: attendanceArr });
  } catch (err) {
    console.error('[ATTENDANCE UPDATE ERROR]', err);
    res.status(500).json({ error: err.message || 'Server error.' });
  }
});

// --- Add/update guardian info (student or admin/staff) ---
router.post('/me/guardians', studentAuthMiddleware, async (req, res) => {
  try {
    const student = req.student;
    const guardians = req.body.guardians; // array

    if (!Array.isArray(guardians)) return res.status(400).json({ error: 'Guardians must be array.' });

    // Find student doc by regNo
    const snap = await studentsCollection().where('regNo', '==', student.regNo).limit(1).get();
    if (snap.empty) return res.status(404).json({ error: 'Student not found' });
    const docId = snap.docs[0].id;

    await studentsCollection().doc(docId).update({ guardians: guardians, updatedAt: new Date() });

    res.json({ message: 'Guardians info updated!' });
  } catch (err) {
    console.error('[GUARDIAN UPDATE ERROR]', err);
    res.status(500).json({ error: err.message || 'Server error.' });
  }
});

// --- Add/update hostel info (student or admin/staff) ---
router.post('/me/hostel', studentAuthMiddleware, async (req, res) => {
  try {
    const student = req.student;
    const hostel = req.body.hostel; // object

    if (typeof hostel !== 'object') return res.status(400).json({ error: 'Hostel must be an object.' });

    // Find student doc by regNo
    const snap = await studentsCollection().where('regNo', '==', student.regNo).limit(1).get();
    if (snap.empty) return res.status(404).json({ error: 'Student not found' });
    const docId = snap.docs[0].id;

    await studentsCollection().doc(docId).update({ hostel: hostel, updatedAt: new Date() });

    res.json({ message: 'Hostel info updated!' });
  } catch (err) {
    console.error('[HOSTEL UPDATE ERROR]', err);
    res.status(500).json({ error: err.message || 'Server error.' });
  }
});

// --- Add/update transport info (student or admin/staff) ---
router.post('/me/transport', studentAuthMiddleware, async (req, res) => {
  try {
    const student = req.student;
    const transport = req.body.transport; // object

    if (typeof transport !== 'object') return res.status(400).json({ error: 'Transport must be an object.' });

    // Find student doc by regNo
    const snap = await studentsCollection().where('regNo', '==', student.regNo).limit(1).get();
    if (snap.empty) return res.status(404).json({ error: 'Student not found' });
    const docId = snap.docs[0].id;

    await studentsCollection().doc(docId).update({ transport: transport, updatedAt: new Date() });

    res.json({ message: 'Transport info updated!' });
  } catch (err) {
    console.error('[TRANSPORT UPDATE ERROR]', err);
    res.status(500).json({ error: err.message || 'Server error.' });
  }
});

// --- Add/update fees info (admin/staff only, you can add admin middleware here) ---
router.post('/:regNo/fees', async (req, res) => {
  try {
    const regNo = req.params.regNo;
    const feeEntry = req.body;
    if (!feeEntry.session || !feeEntry.term || !feeEntry.type || !feeEntry.amount || !feeEntry.status) {
      return res.status(400).json({ error: 'Missing required fee fields.' });
    }
    // Find student doc by regNo
    const snap = await studentsCollection().where('regNo', '==', regNo).limit(1).get();
    if (snap.empty) return res.status(404).json({ error: 'Student not found' });
    const docId = snap.docs[0].id;
    const docData = snap.docs[0].data();
    const feesArr = docData.fees || [];
    feesArr.push(feeEntry);

    await studentsCollection().doc(docId).update({ fees: feesArr, updatedAt: new Date() });

    res.json({ message: 'Fee record updated!', fees: feesArr });
  } catch (err) {
    console.error('[FEES UPDATE ERROR]', err);
    res.status(500).json({ error: err.message || 'Server error.' });
  }
});

module.exports = router;
