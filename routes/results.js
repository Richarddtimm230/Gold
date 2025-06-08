const express = require('express');
const router = express.Router();

// Firestore instance
const db = require('../firestore');

// Collection helpers
const resultCollection = () => db.collection('results');
const studentCollection = () => db.collection('students');
const sessionCollection = () => db.collection('sessions');
const termCollection = () => db.collection('terms');
const classCollection = () => db.collection('classes');
const subjectCollection = () => db.collection('subjects');

// Helper: Find or create by name for Session, Term, Class, Subject
async function findOrCreateByName(collection, name, extra = {}) {
  if (!name) return null;
  const snap = await collection().where('name', '==', name).limit(1).get();
  if (!snap.empty) return { id: snap.docs[0].id, ...snap.docs[0].data() };
  const docRef = await collection().add({ name, ...extra });
  return { id: docRef.id, name, ...extra };
}

// Helper: Find or create student by student_id
async function findOrCreateStudent(row, classId) {
  if (!row.student_id) return null;
  const snap = await studentCollection().where('student_id', '==', row.student_id).limit(1).get();
  if (!snap.empty) return { id: snap.docs[0].id, ...snap.docs[0].data() };
  const docRef = await studentCollection().add({
    student_id: row.student_id,
    name: row.student_name,
    class: classId || null
  });
  return { id: docRef.id, student_id: row.student_id, name: row.student_name, class: classId || null };
}

// POST /api/results/upload - Bulk/manual upload of student results
router.post('/upload', async (req, res) => {
  try {
    const { session, term, class: className, subject, results } = req.body;
    // Find or create session, term, class, subject
    const sessionObj = await findOrCreateByName(sessionCollection, session);
    const termObj = await findOrCreateByName(termCollection, term);
    const classObj = await findOrCreateByName(classCollection, className);
    const subjectObj = await findOrCreateByName(subjectCollection, subject);

    let insertedResults = [];
    for (const row of results) {
      let student = await findOrCreateStudent(row, classObj.id);

      // Check for duplicate result (optional: skip or update if exists)
      // For now, just insert

      const newResult = {
        student: student.id,
        session: sessionObj.id,
        term: termObj.id,
        class: classObj.id,
        subject: subjectObj.id,
        score: row.score,
        grade: row.grade,
        remarks: row.remarks,
        status: row.status || 'Draft'
      };
      const resultRef = await resultCollection().add(newResult);
      insertedResults.push({ id: resultRef.id, ...newResult });
    }
    res.json({ success: true, inserted: insertedResults.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/results - Fetch all results with populated references
router.get('/', async (req, res) => {
  try {
    // Optional query params: student_id, class, session, term, subject
    const filter = {};
    let studentId, classId, sessionId, termId, subjectId;

    if (req.query.student_id) {
      const snap = await studentCollection().where('student_id', '==', req.query.student_id).limit(1).get();
      if (!snap.empty) studentId = snap.docs[0].id;
    }
    if (req.query.class) {
      const snap = await classCollection().where('name', '==', req.query.class).limit(1).get();
      if (!snap.empty) classId = snap.docs[0].id;
    }
    if (req.query.session) {
      const snap = await sessionCollection().where('name', '==', req.query.session).limit(1).get();
      if (!snap.empty) sessionId = snap.docs[0].id;
    }
    if (req.query.term) {
      const snap = await termCollection().where('name', '==', req.query.term).limit(1).get();
      if (!snap.empty) termId = snap.docs[0].id;
    }
    if (req.query.subject) {
      const snap = await subjectCollection().where('name', '==', req.query.subject).limit(1).get();
      if (!snap.empty) subjectId = snap.docs[0].id;
    }

    let query = resultCollection();
    if (studentId) query = query.where('student', '==', studentId);
    if (classId) query = query.where('class', '==', classId);
    if (sessionId) query = query.where('session', '==', sessionId);
    if (termId) query = query.where('term', '==', termId);
    if (subjectId) query = query.where('subject', '==', subjectId);

    const snap = await query.orderBy('__name__', 'desc').get();
    const results = [];
    for (const doc of snap.docs) {
      const result = doc.data();
      result.id = doc.id;

      // Populate references
      const [studentDoc, sessionDoc, termDoc, classDoc, subjectDoc] = await Promise.all([
        result.student ? studentCollection().doc(result.student).get() : null,
        result.session ? sessionCollection().doc(result.session).get() : null,
        result.term ? termCollection().doc(result.term).get() : null,
        result.class ? classCollection().doc(result.class).get() : null,
        result.subject ? subjectCollection().doc(result.subject).get() : null,
      ]);
      result.student = studentDoc && studentDoc.exists ? { id: studentDoc.id, ...studentDoc.data() } : null;
      result.session = sessionDoc && sessionDoc.exists ? { id: sessionDoc.id, ...sessionDoc.data() } : null;
      result.term = termDoc && termDoc.exists ? { id: termDoc.id, ...termDoc.data() } : null;
      result.class = classDoc && classDoc.exists ? { id: classDoc.id, ...classDoc.data() } : null;
      result.subject = subjectDoc && subjectDoc.exists ? { id: subjectDoc.id, ...subjectDoc.data() } : null;

      results.push(result);
    }
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/results/:id - Fetch a single result by ID
router.get('/:id', async (req, res) => {
  try {
    const doc = await resultCollection().doc(req.params.id).get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Result not found' });
    }
    const result = doc.data();
    result.id = doc.id;

    // Populate references
    const [studentDoc, sessionDoc, termDoc, classDoc, subjectDoc] = await Promise.all([
      result.student ? studentCollection().doc(result.student).get() : null,
      result.session ? sessionCollection().doc(result.session).get() : null,
      result.term ? termCollection().doc(result.term).get() : null,
      result.class ? classCollection().doc(result.class).get() : null,
      result.subject ? subjectCollection().doc(result.subject).get() : null,
    ]);
    result.student = studentDoc && studentDoc.exists ? { id: studentDoc.id, ...studentDoc.data() } : null;
    result.session = sessionDoc && sessionDoc.exists ? { id: sessionDoc.id, ...sessionDoc.data() } : null;
    result.term = termDoc && termDoc.exists ? { id: termDoc.id, ...termDoc.data() } : null;
    result.class = classDoc && classDoc.exists ? { id: classDoc.id, ...classDoc.data() } : null;
    result.subject = subjectDoc && subjectDoc.exists ? { id: subjectDoc.id, ...subjectDoc.data() } : null;

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/results/:id - Update a result (full update)
router.put('/:id', async (req, res) => {
  try {
    const update = req.body;
    const docRef = resultCollection().doc(req.params.id);
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      return res.status(404).json({ error: 'Result not found' });
    }
    await docRef.update(update);
    const updated = (await docRef.get()).data();
    updated.id = req.params.id;

    // Populate references
    const [studentDoc, sessionDoc, termDoc, classDoc, subjectDoc] = await Promise.all([
      updated.student ? studentCollection().doc(updated.student).get() : null,
      updated.session ? sessionCollection().doc(updated.session).get() : null,
      updated.term ? termCollection().doc(updated.term).get() : null,
      updated.class ? classCollection().doc(updated.class).get() : null,
      updated.subject ? subjectCollection().doc(updated.subject).get() : null,
    ]);
    updated.student = studentDoc && studentDoc.exists ? { id: studentDoc.id, ...studentDoc.data() } : null;
    updated.session = sessionDoc && sessionDoc.exists ? { id: sessionDoc.id, ...sessionDoc.data() } : null;
    updated.term = termDoc && termDoc.exists ? { id: termDoc.id, ...termDoc.data() } : null;
    updated.class = classDoc && classDoc.exists ? { id: classDoc.id, ...classDoc.data() } : null;
    updated.subject = subjectDoc && subjectDoc.exists ? { id: subjectDoc.id, ...subjectDoc.data() } : null;

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/results/:id - Partial update (edit)
router.patch('/:id', async (req, res) => {
  try {
    const update = req.body;
    const docRef = resultCollection().doc(req.params.id);
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      return res.status(404).json({ error: 'Result not found' });
    }
    await docRef.update(update);
    const updated = (await docRef.get()).data();
    updated.id = req.params.id;

    // (Optional: Populate references if you want, or return raw)
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/results/:id/publish - Set status = "Published"
router.patch('/:id/publish', async (req, res) => {
  try {
    const docRef = resultCollection().doc(req.params.id);
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      return res.status(404).json({ error: 'Result not found' });
    }
    await docRef.update({ status: 'Published' });
    const updated = (await docRef.get()).data();
    updated.id = req.params.id;
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/results/:id - Delete a result
router.delete('/:id', async (req, res) => {
  try {
    const docRef = resultCollection().doc(req.params.id);
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      return res.status(404).json({ error: 'Result not found' });
    }
    await docRef.delete();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
