const express = require('express');
const router = express.Router();
const multer = require('multer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const studentAuthMiddleware = require('../middleware/studentAuth');
const adminAuth = require('../middleware/adminAuth');
const db = require('../firestore');

// Multer setup for photo uploads (limit size to 2MB, accept only images/docs)
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype.startsWith('image/') || 
      file.mimetype === 'application/pdf' ||
      file.mimetype === 'application/msword' ||
      file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      cb(null, true);
    } else {
      cb(new Error('Only images and documents (PDF/DOC/DOCX) are allowed.'));
    }
  }
});

// Utility: generate student_id
function generateStudentId() {
  return 'STU' + Math.floor(100000 + Math.random() * 900000);
}
function studentsCollection() { return db.collection('students'); }

// Utility: generate 8-character alphanumeric scratch card
function generateScratchCard() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let card = '';
  for (let i = 0; i < 8; i++) {
    card += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return card;
}

// --- Joi validation schema for enrollment ---
const studentSchema = Joi.object({
  surname: Joi.string().required(),
  firstname: Joi.string().required(),
  dob: Joi.string().required(),
  gender: Joi.string().required(),
  regNo: Joi.string().required(),
  scratchCard: Joi.string().length(8).alphanum().required(),
  class: Joi.string().required(),
  parentName: Joi.string().required(),
  parentRelationship: Joi.string().required(),
  parentPhone: Joi.string().required(),
  password: Joi.string().min(6).required(),
  othernames: Joi.string().allow(''),
  nationality: Joi.string().allow(''),
  state: Joi.string().allow(''),
  lga: Joi.string().allow(''),
  address: Joi.string().allow(''),
  classArm: Joi.string().allow(''),
  previousSchool: Joi.string().allow(''),
  admissionDate: Joi.string().allow(''),
  academicSession: Joi.string().allow(''),
  parentEmail: Joi.string().allow(''),
  parentAddress: Joi.string().allow(''),
  parentOccupation: Joi.string().allow(''),
  studentEmail: Joi.string().allow(''),
  studentPhone: Joi.string().allow(''),
  religion: Joi.string().allow(''),
  bloodGroup: Joi.string().allow(''),
  genotype: Joi.string().allow(''),
  medical: Joi.string().allow('')
});

// --- Enroll a new student ---
router.post('/', upload.single('photo'), async (req, res) => {
  try {
    // If scratchCard is not set, generate one
    if (!req.body.scratchCard || req.body.scratchCard.length !== 8) {
      req.body.scratchCard = generateScratchCard();
    }

    const { error, value: data } = studentSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    // Ensure regNo and student_id are unique
    const regNoSnap = await studentsCollection().where('regNo', '==', data.regNo).limit(1).get();
    if (!regNoSnap.empty) {
      return res.status(400).json({ error: 'A student with that registration number already exists.' });
    }
    // Ensure scratchCard is unique
    const scratchCardSnap = await studentsCollection().where('scratchCard', '==', data.scratchCard).limit(1).get();
    if (!scratchCardSnap.empty) {
      // Try a few more times to generate a unique one (should be rare)
      let tries = 0;
      let newScratch;
      do {
        newScratch = generateScratchCard();
        tries++;
        const check = await studentsCollection().where('scratchCard', '==', newScratch).limit(1).get();
        if (check.empty) {
          data.scratchCard = newScratch;
          break;
        }
      } while (tries < 5);
      if (tries === 5) {
        return res.status(400).json({ error: 'Could not generate a unique scratch card. Please try again.' });
      }
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

    // Handle photo (convert to Base64 and store directly)
    let photoBase64 = '';
    if (req.file) {
      // Convert uploaded file buffer to base64 string and prefix with mimetype
      photoBase64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
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
      photoBase64: photoBase64,
      regNo: data.regNo,
      scratchCard: data.scratchCard,
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

// --- Retrieve all students with filters (summary fields only, with pagination) ---
router.get('/', async (req, res) => {
  try {
    let query = studentsCollection();
    if (req.query.class) query = query.where('class', '==', req.query.class);
    if (req.query.classArm) query = query.where('classArm', '==', req.query.classArm);
    if (req.query.academicSession) query = query.where('academicSession', '==', req.query.academicSession);

    const pageSize = parseInt(req.query.pageSize) || 20;
    let snap;
    if (req.query.startAfter) {
      snap = await query.orderBy('surname').startAfter(req.query.startAfter).limit(pageSize).get();
    } else {
      snap = await query.orderBy('surname').limit(pageSize).get();
    }

    const students = [];
    snap.forEach(doc => {
      const d = doc.data();
      students.push({
        student_id: d.student_id,
        surname: d.surname,
        firstname: d.firstname,
        othernames: d.othernames || '',
        regNo: d.regNo,
        scratchCard: d.scratchCard,
        class: d.class,
        classArm: d.classArm,
        gender: d.gender,
        dob: d.dob,
        parentName: d.parentName,
        parentPhone: d.parentPhone,
        parentRelationship: d.parentRelationship,
        parentEmail: d.parentEmail,
        parentAddress: d.parentAddress,
        parentOccupation: d.parentOccupation,
        studentEmail: d.studentEmail,
        studentPhone: d.studentPhone,
        nationality: d.nationality,
        state: d.state,
        lga: d.lga,
        previousSchool: d.previousSchool,
        admissionDate: d.admissionDate,
        academicSession: d.academicSession,
        photoBase64: d.photoBase64 || '',
      });
    });

    res.json({
      students,
      lastVisible: students.length ? students[students.length - 1].surname : null
    });
  } catch (error) {
    console.error('[GET STUDENTS ERROR]', error);
    res.status(500).json({ error: error.message });
  }
});

// --- Get logged-in student profile for dashboard/profile page ---
router.get('/me', studentAuthMiddleware, async (req, res) => {
  // Remove sensitive fields (e.g., password) before sending
  const student = req.student;
  const { password, ...safeProfile } = student;
  res.json({
    ...safeProfile,
    name: `${student.firstname} ${student.surname}`,
    photo_url: student.photoBase64 || ''
  });
});

// --- Get a student profile by regNo (for admin/staff or direct lookup, admin only) ---
router.get('/:regNo', adminAuth, async (req, res) => {
  try {
    const regNo = req.params.regNo;
    const snapshot = await studentsCollection().where('regNo', '==', regNo).limit(1).get();
    if (snapshot.empty) return res.status(404).json({ error: 'Student not found' });

    const profile = snapshot.docs[0].data();
    const { password, ...safeProfile } = profile;
    res.json(safeProfile);
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
        photo_url: student.photoBase64 || ''
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// --- Update student profile (protected, student only) ---
const updateSchema = Joi.object({
  surname: Joi.string(),
  firstname: Joi.string(),
  othernames: Joi.string().allow(''),
  dob: Joi.string(),
  gender: Joi.string(),
  nationality: Joi.string().allow(''),
  state: Joi.string().allow(''),
  lga: Joi.string().allow(''),
  address: Joi.string().allow(''),
  class: Joi.string(),
  classArm: Joi.string().allow(''),
  studentEmail: Joi.string().allow(''),
  studentPhone: Joi.string().allow(''),
  religion: Joi.string().allow(''),
  bloodGroup: Joi.string().allow(''),
  genotype: Joi.string().allow(''),
  medical: Joi.string().allow('')
});

router.put('/me', studentAuthMiddleware, upload.single('photo'), async (req, res) => {
  try {
    const { error, value: data } = updateSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const student = req.student;
    let updates = { ...data };

    // Handle photo upload
    if (req.file) {
      updates.photoBase64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
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

// --- Upload a document for a student (protected, student only, as base64) ---
router.post('/me/docs', studentAuthMiddleware, upload.single('document'), async (req, res) => {
  try {
    const student = req.student;
    if (!req.file) return res.status(400).json({ error: 'No document uploaded.' });

    const docBase64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    const docMeta = {
      label: req.body.label || req.file.originalname,
      value: req.file.originalname,
      base64: docBase64,
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

// --- Update academic record for a student (admin/staff only) ---
router.post('/:regNo/academic', adminAuth, async (req, res) => {
  try {
    const regNo = req.params.regNo;
    const academicEntry = req.body;
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

// --- Add attendance record (admin/staff only) ---
router.post('/:regNo/attendance', adminAuth, async (req, res) => {
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
    const guardians = req.body.guardians;
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
    const hostel = req.body.hostel;
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
    const transport = req.body.transport;
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

// --- Add/update fees info (admin/staff only) ---
router.post('/:regNo/fees', adminAuth, async (req, res) => {
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
// Add or update skills & reports for a student (admin only)
router.post('/:regNo/skills-report', adminAuth, async (req, res) => {
  try {
    const regNo = req.params.regNo;
    const { session, term, skills, attendance, comment } = req.body;
    if (!session || !term || !skills) {
      return res.status(400).json({ error: 'session, term, and skills are required.' });
    }

    // Find student doc by regNo
    const snap = await studentsCollection().where('regNo', '==', regNo).limit(1).get();
    if (snap.empty) return res.status(404).json({ error: 'Student not found' });
    const docId = snap.docs[0].id;
    const docData = snap.docs[0].data();

    // Skills record format
    const reportEntry = {
      session,
      term,
      skills,      // { affective: { ... }, psychomotor: { ... } }
      attendance,  // { days_present, days_absent }
      comment,     // Principal's comment
      updatedAt: new Date()
    };

    // Store in docData.skillsReports (array)
    let skillsReports = docData.skillsReports || [];
    // If exists for session+term, replace; else, push
    const idx = skillsReports.findIndex(r => r.session === session && r.term === term);
    if (idx >= 0) skillsReports[idx] = reportEntry;
    else skillsReports.push(reportEntry);

    await studentsCollection().doc(docId).update({ skillsReports, updatedAt: new Date() });

    res.json({ message: 'Skills report saved!', skillsReports });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Server error.' });
  }
});

// Get all skills & reports for a student (admin or student)
router.get('/:regNo/skills-report', adminAuth, async (req, res) => {
  try {
    const regNo = req.params.regNo;
    const snap = await studentsCollection().where('regNo', '==', regNo).limit(1).get();
    if (snap.empty) return res.status(404).json({ error: 'Student not found' });

    const docData = snap.docs[0].data();
    res.json({ skillsReports: docData.skillsReports || [] });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Server error.' });
  }
});
// --- Update student by student_id or regNo (admin only) ---
router.put('/:studentId', adminAuth, upload.single('photo'), async (req, res) => {
  try {
    const { studentId } = req.params;
    // Find by student_id or regNo
    let snap = await studentsCollection().where('student_id', '==', studentId).limit(1).get();
    if (snap.empty) {
      snap = await studentsCollection().where('regNo', '==', studentId).limit(1).get();
    }
    if (snap.empty) return res.status(404).json({ error: 'Student not found' });
    const docRef = snap.docs[0].ref;

    // Allow all updatable fields
    const allowedFields = [
      "surname", "firstname", "othernames", "dob", "gender", "nationality", "state", "lga", "address",
      "class", "classArm", "previousSchool", "admissionDate", "academicSession",
      "parentName", "parentRelationship", "parentPhone", "parentEmail", "parentAddress", "parentOccupation",
      "studentEmail", "studentPhone", "religion", "bloodGroup", "genotype", "medical"
    ];
    const updates = {};
    for (const key of allowedFields) {
      if (key in req.body) updates[key] = req.body[key];
    }

    // Optionally handle photo upload
    if (req.file) {
      updates.photoBase64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    }
    updates.updatedAt = new Date();

    await docRef.update(updates);
    res.json({ message: "Student updated successfully!" });
  } catch (err) {
    res.status(500).json({ error: err.message || "Unknown server error." });
  }
});

// --- Delete student by student_id or regNo (admin only) ---
router.delete('/:studentId', adminAuth, async (req, res) => {
  try {
    const { studentId } = req.params;
    // Find by student_id or regNo
    let snap = await studentsCollection().where('student_id', '==', studentId).limit(1).get();
    if (snap.empty) {
      snap = await studentsCollection().where('regNo', '==', studentId).limit(1).get();
    }
    if (snap.empty) return res.status(404).json({ error: 'Student not found' });
    const docRef = snap.docs[0].ref;
    await docRef.delete();
    res.json({ message: "Student deleted successfully!" });
  } catch (err) {
    res.status(500).json({ error: err.message || "Unknown server error." });
  }
});
                                                      
module.exports = router;
