const express = require('express');
const router = express.Router();
const AdmissionSetup = require('../models/AdmissionSetup');
const AdmissionApplication = require('../models/AdmissionApplication');
const AttendanceRecord = require('../models/AttendanceRecord');
// These are assumed to be present in your codebase:
const Student = require('../models/Student');
const Staff = require('../models/Staff');
const Session = require('../models/Session');
const Class = require('../models/Class');
const Arm = require('../models/Arm');
const adminAuth = require('../middleware/adminAuth');

// -------- Admission Endpoints --------

// Setup admission period
router.post('/admission/setup', adminAuth, async (req, res) => {
  try {
    const { session, term, classId, armId, startDate, endDate, applicationFee } = req.body;
    if (!session || !term || !classId || !armId || !startDate || !endDate || !applicationFee)
      return res.status(400).json({ error: "All fields are required" });
    const setup = await AdmissionSetup.findOneAndUpdate(
      { session, term, classId, armId },
      { session, term, classId, armId, startDate, endDate, applicationFee },
      { upsert: true, new: true }
    );
    res.json(setup);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// List all admission setups (not used in UI, but useful for admin)
router.get('/admission/setups', adminAuth, async (req, res) => {
  const setups = await AdmissionSetup.find().populate('session classId armId');
  res.json(setups);
});

// List all applications
router.get('/admission/applications', adminAuth, async (req, res) => {
  const applications = await AdmissionApplication.find().populate('session classId armId').sort('-createdAt');
  res.json(applications.map(app => ({
    _id: app._id,
    name: app.name,
    sessionName: app.session?.name,
    term: app.term,
    className: app.classId?.name,
    armName: app.armId?.name,
    dateApplied: app.dateApplied,
    status: app.status,
    email: app.email,
    phone: app.phone,
    documents: app.documents
  })));
});

// Get application by ID
router.get('/admission/application/:id', adminAuth, async (req, res) => {
  const app = await AdmissionApplication.findById(req.params.id).populate('session classId armId');
  if (!app) return res.status(404).json({ error: "Not found" });
  res.json({
    _id: app._id,
    name: app.name,
    sessionName: app.session?.name,
    term: app.term,
    className: app.classId?.name,
    armName: app.armId?.name,
    dateApplied: app.dateApplied,
    status: app.status,
    email: app.email,
    phone: app.phone,
    documents: app.documents
  });
});

// Approve/reject application
router.put('/admission/application/:id', adminAuth, async (req, res) => {
  const { status } = req.body;
  if (!['Approved', 'Rejected'].includes(status)) return res.status(400).json({ error: "Invalid status" });
  const updated = await AdmissionApplication.findByIdAndUpdate(
    req.params.id,
    { status },
    { new: true }
  );
  if (!updated) return res.status(404).json({ error: "Not found" });
  res.json({ message: "Status updated", status: updated.status });
});

// -------- Dropdown Data: Sessions, Classes, Arms --------

router.get('/sessions', adminAuth, async (req, res) => {
  const sessions = await Session.find().sort('-createdAt');
  res.json(sessions.map(s => ({ _id: s._id, name: s.name })));
});
router.get('/classes', adminAuth, async (req, res) => {
  const classes = await Class.find().sort('name');
  res.json(classes.map(c => ({ _id: c._id, name: c.name })));
});
router.get('/arms', adminAuth, async (req, res) => {
  const arms = await Arm.find().sort('name');
  res.json(arms.map(a => ({ _id: a._id, name: a.name })));
});

// ----------- Attendance Endpoints -----------

// Create attendance record (for students or staff)
router.post('/attendance/record', adminAuth, async (req, res) => {
  const { date, userId, name, role, class: className, department, status, remark, recordedBy } = req.body;
  if (!date || !userId || !name || !role || !status)
    return res.status(400).json({ error: "Missing required fields" });
  const record = new AttendanceRecord({ date, userId, name, role, class: className, department, status, remark, recordedBy });
  await record.save();
  res.status(201).json(record);
});

// Attendance summary (present today)
router.get('/attendance/summary', adminAuth, async (req, res) => {
  const today = new Date();
  today.setHours(0,0,0,0);
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate()+1);

  const studentsPresent = await AttendanceRecord.countDocuments({ date: { $gte: today, $lt: tomorrow }, role: 'student', status: 'Present' });
  const teachingPresent = await AttendanceRecord.countDocuments({ date: { $gte: today, $lt: tomorrow }, role: 'teaching', status: 'Present' });
  const nonTeachingPresent = await AttendanceRecord.countDocuments({ date: { $gte: today, $lt: tomorrow }, role: 'non-teaching', status: 'Present' });

  // Trends for last 7 days
  let trends = { labels: [], students: [], teaching: [], nonTeaching: [] };
  for(let i=6;i>=0;i--) {
    let day = new Date(); day.setHours(0,0,0,0); day.setDate(day.getDate()-i);
    let next = new Date(day); next.setDate(day.getDate()+1);
    trends.labels.push(day.toISOString().slice(0,10));
    trends.students.push(await AttendanceRecord.countDocuments({ date: { $gte: day, $lt: next }, role: 'student', status: 'Present' }));
    trends.teaching.push(await AttendanceRecord.countDocuments({ date: { $gte: day, $lt: next }, role: 'teaching', status: 'Present' }));
    trends.nonTeaching.push(await AttendanceRecord.countDocuments({ date: { $gte: day, $lt: next }, role: 'non-teaching', status: 'Present' }));
  }

  res.json({ studentsPresent, teachingPresent, nonTeachingPresent, trends });
});

// Attendance records (table, filter/search)
router.get('/attendance/records', adminAuth, async (req, res) => {
  const { date, role, status, search } = req.query;
  let filter = {};
  if (date) {
    let start = new Date(date); start.setHours(0,0,0,0);
    let end = new Date(start); end.setDate(start.getDate()+1);
    filter.date = { $gte: start, $lt: end };
  }
  if (role) filter.role = role;
  if (status) filter.status = status;
  if (search) {
    filter.$or = [
      { name: new RegExp(search, 'i') },
      { userId: new RegExp(search, 'i') },
    ];
  }
  const records = await AttendanceRecord.find(filter).sort('-date');
  res.json(records.map(r => ({
    date: r.date,
    name: r.name,
    id: r.userId,
    regNo: r.userId,
    staffId: r.userId,
    role: r.role,
    class: r.class,
    department: r.department,
    status: r.status,
    remark: r.remark,
    recordedBy: r.recordedBy
  })));
});

module.exports = router;
