const express = require('express');
const router = express.Router();
const Student = require('../models/Student');
const CommunicationBookMessage = require('../models/CommunicationBookMessage');
const adminAuth = require('../middleware/adminAuth');
const studentAuth = require('../middleware/studentAuth');

// --- Promotion, Graduation, Demotion ---

// Bulk or single update: promote, graduate, demote
router.post('/students/promotion', adminAuth, async (req, res) => {
  // Input: studentIds[], session, term, action ('promote'|'graduate'|'demote')
  const { studentIds, session, term, action } = req.body;
  if (!Array.isArray(studentIds) || !session || !term || !action) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }
  const validActions = { promote: 'Promoted', graduate: 'Graduated', demote: 'Pending' };
  if (!validActions[action]) return res.status(400).json({ error: 'Invalid action.' });

  const updates = [];
  for (const id of studentIds) {
    const student = await Student.findById(id);
    if (!student) continue;

    // Find or add promotion record for this session/term
    let promo = (student.promotion || []).find(p => p.session === session && p.term === term);
    if (!promo) {
      promo = { session, term, status: validActions[action] };
      student.promotion = student.promotion || [];
      student.promotion.push(promo);
    } else {
      promo.status = validActions[action];
      if (action === 'promote') promo.promotedAt = new Date();
      if (action === 'graduate') promo.graduatedAt = new Date();
    }
    if (action === 'graduate') {
      student.alumni = {
        year: session.split('-')[1], // e.g. "2024-2025" → "2025"
        achievement: '',
        remark: '',
        report: '',
      };
    }
    await student.save();
    updates.push(student._id);
  }
  res.json({ message: 'Students updated!', updated: updates });
});

// --- Fetch students for promotion UI ---
router.get('/students', adminAuth, async (req, res) => {
  const { session, term, class: classId, search, status } = req.query;
  let query = {};
  if (classId) query.class = classId;
  if (session || term || status) {
    query.promotion = {
      $elemMatch: Object.assign(
        {},
        session ? { session } : {},
        term ? { term } : {},
        status ? { status } : {}
      )
    };
  }
  if (search) {
    query.$or = [
      { firstname: new RegExp(search, 'i') },
      { surname: new RegExp(search, 'i') },
      { regNo: new RegExp(search, 'i') }
    ];
  }
  const students = await Student.find(query);
  res.json(students.map(s => ({
    id: s._id,
    name: `${s.firstname} ${s.surname}`,
    regNo: s.regNo,
    class: s.class,
    session: session || '',
    term: term || '',
    status: (s.promotion||[]).find(p => (!session||p.session===session) && (!term||p.term===term))?.status || 'Pending',
  })));
});

// --- Alumni listing ---
router.get('/alumni', adminAuth, async (req, res) => {
  const { search, year } = req.query;
  let query = { 'alumni.year': { $exists: true, $ne: '' } };
  if (year) query['alumni.year'] = year;
  if (search) {
    query.$or = [
      { firstname: new RegExp(search, 'i') },
      { surname: new RegExp(search, 'i') },
      { regNo: new RegExp(search, 'i') }
    ];
  }
  const students = await Student.find(query);
  res.json(
    students.map(s => ({
      name: `${s.firstname} ${s.surname}`,
      regNo: s.regNo,
      class: s.class,
      year: s.alumni?.year,
      achievement: s.alumni?.achievement,
      remark: s.alumni?.remark,
      report: s.alumni?.report,
      photo_url: s.photoBase64 || '',
    }))
  );
});

// --- Update alumni info ---
router.patch('/alumni/:regNo', adminAuth, async (req, res) => {
  const { regNo } = req.params;
  const { achievement, remark, report } = req.body;
  const student = await Student.findOne({ regNo });
  if (!student || !student.alumni) return res.status(404).json({ error: 'Alumni not found' });
  if (achievement !== undefined) student.alumni.achievement = achievement;
  if (remark !== undefined) student.alumni.remark = remark;
  if (report !== undefined) student.alumni.report = report;
  await student.save();
  res.json({ message: 'Alumni info updated!' });
});

// --- Birthdays ---
// Make birthdays route accessible to all authenticated users
router.get('/students/birthdays', studentAuthMiddleware, async (req, res) => {
  const { month } = req.query;
  const monthNum = parseInt(month, 10);
  if (!monthNum || monthNum < 1 || monthNum > 12) return res.status(400).json({ error: 'Invalid month' });
  const students = await Student.find({ dob: { $exists: true, $ne: '' } });
  res.json(
    students
      .filter(s => {
        const dob = new Date(s.dob);
        return dob.getMonth() + 1 === monthNum;
      })
      .map(s => ({
        name: `${s.firstname} ${s.surname}`,
        class: s.class,
        dob: s.dob,
        photo_url: s.photoBase64 || '',
      }))
  );
});

// --- Communication Book ---

// Post message
router.post('/commbook/messages', adminAuth, async (req, res) => {
  // body: class, student, content, senderName, senderRole ('teacher'/'admin'/'student'), senderId
  const { class: classId, student, content, senderName, senderRole, senderId } = req.body;
  if (!classId || !student || !content || !senderName || !senderRole) {
    return res.status(400).json({ error: 'Missing fields.' });
  }
  const msg = await CommunicationBookMessage.create({
    class: classId,
    student,
    content,
    senderName,
    senderRole,
    senderId,
    date: new Date()
  });
  res.status(201).json(msg);
});

// Get messages
router.get('/commbook/messages', adminAuth, async (req, res) => {
  // filter by class, student, search
  const { class: classId, student, search } = req.query;
  let filter = {};
  if (classId) filter.class = classId;
  if (student) filter.student = student;
  if (search) filter.content = new RegExp(search, 'i');
  const msgs = await CommunicationBookMessage.find(filter).sort({ date: -1 }).limit(100);
  res.json(msgs);
});

module.exports = router;
