const express = require('express');
const router = express.Router();

// Firestore instance (adjust path as needed)
const db = require('../firestore');

// Utility: get class and subject collections
const classCollection = () => db.collection('classes');
const subjectCollection = () => db.collection('subjects');

// GET /api/classes - Get all classes with arms, subjects, teachers
router.get('/', async (req, res) => {
  try {
    const snapshot = await classCollection().get();
    const classes = [];
    for (const doc of snapshot.docs) {
      const cls = doc.data();
      cls.id = doc.id;
      // Populate subjects with names if they are references (ids)
      if (Array.isArray(cls.subjects) && cls.subjects.length > 0) {
        const subjectIds = cls.subjects.filter(Boolean);
        if (subjectIds.length) {
          const subjs = [];
          for (const subjId of subjectIds) {
            // If subject is an object, just use it; if string, fetch
            if (typeof subjId === 'string') {
              const subjDoc = await subjectCollection().doc(subjId).get();
              if (subjDoc.exists) {
                const subjData = subjDoc.data();
                subjs.push({ id: subjDoc.id, name: subjData.name });
              }
            } else if (subjId && subjId.name) {
              subjs.push(subjId);
            }
          }
          cls.subjects = subjs;
        }
      } else {
        cls.subjects = [];
      }
      // Ensure arms and teachers arrays
      cls.arms = Array.isArray(cls.arms) ? cls.arms : [];
      cls.teachers = Array.isArray(cls.teachers) ? cls.teachers : [];
      classes.push(cls);
    }
    res.json(classes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/classes - Create a new class
router.post('/', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "Class name required" });

    const existingSnap = await classCollection().where('name', '==', name).limit(1).get();
    if (!existingSnap.empty) return res.status(409).json({ error: "Class already exists" });

    const newClass = {
      name,
      arms: [],
      subjects: [],
      teachers: []
    };
    const docRef = await classCollection().add(newClass);
    const created = (await docRef.get()).data();
    created.id = docRef.id;
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/classes/:id/arms - Add/replace arms for a class
router.post('/:id/arms', async (req, res) => {
  try {
    const { arms } = req.body; // Array of arm names
    if (!Array.isArray(arms)) return res.status(400).json({ error: "Arms array required" });

    const docRef = classCollection().doc(req.params.id);
    const docSnap = await docRef.get();
    if (!docSnap.exists) return res.status(404).json({ error: "Class not found" });

    await docRef.update({ arms });
    const updated = (await docRef.get()).data();
    updated.id = req.params.id;
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/classes/:id/subjects - Add/replace subjects for a class
router.post('/:id/subjects', async (req, res) => {
  try {
    const { subjects } = req.body; // Array of subject names or ids
    if (!Array.isArray(subjects)) return res.status(400).json({ error: "Subjects array required" });
    // If subjects are names, convert to IDs (create if missing)
    const subjectIds = [];
    for (const subj of subjects) {
      let subjDoc = null;
      // Try by id
      if (typeof subj === 'string' && subj.length === 20) { // Firestore doc id length is 20
        const sDoc = await subjectCollection().doc(subj).get();
        if (sDoc.exists) subjDoc = sDoc;
      }
      // Try by name
      if (!subjDoc) {
        const snap = await subjectCollection().where('name', '==', subj).limit(1).get();
        if (!snap.empty) subjDoc = snap.docs[0];
      }
      // Create if missing
      if (!subjDoc) {
        const newSubjRef = await subjectCollection().add({ name: subj });
        subjDoc = await newSubjRef.get();
      }
      subjectIds.push(subjDoc.id);
    }
    const docRef = classCollection().doc(req.params.id);
    const docSnap = await docRef.get();
    if (!docSnap.exists) return res.status(404).json({ error: "Class not found" });

    await docRef.update({ subjects: subjectIds });

    // Populate returned subjects with names
    const updated = (await docRef.get()).data();
    updated.id = req.params.id;
    updated.subjects = [];
    for (const sid of subjectIds) {
      const subjDoc = await subjectCollection().doc(sid).get();
      if (subjDoc.exists) {
        updated.subjects.push({ id: sid, name: subjDoc.data().name });
      }
    }
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/classes/:id/teachers - Add a teacher to a class (optionally to an arm)
router.post('/:id/teachers', async (req, res) => {
  try {
    const { teacher } = req.body; // { name: string, arm: string }
    if (!teacher || !teacher.name) return res.status(400).json({ error: "Teacher object with name required" });

    const docRef = classCollection().doc(req.params.id);
    const docSnap = await docRef.get();
    if (!docSnap.exists) return res.status(404).json({ error: "Class not found" });

    const cls = docSnap.data();
    const teachers = Array.isArray(cls.teachers) ? cls.teachers : [];
    teachers.push(teacher);

    await docRef.update({ teachers });

    const updated = (await docRef.get()).data();
    updated.id = req.params.id;
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
