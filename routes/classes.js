// Converted class API to Mongoose
const express = require('express');
const router = express.Router();

const Class = require('../models/Class');
const Subject = require('../models/Subject');
const Student = require('../models/Student');
const teacherAuth = require('../middleware/teacherAuth');

// ===== GET ENDPOINTS =====

// GET /api/classes - Get all classes with optional teacher filter
router.get('/', async (req, res) => {
  try {
    const teacherId = req.query.teacher_id;
    let query = {};
    if (teacherId) query.teachers = teacherId;
    
    const classes = await Class.find(query).populate('subjects');
    const output = classes.map(cls => {
      return {
        _id: cls._id,
        id: cls._id,
        name: cls.name,
        arms: Array.isArray(cls.arms) ? cls.arms : [],
        teachers: Array.isArray(cls.teachers) ? cls.teachers : [],
        subjects: cls.subjects.map(sub => ({ 
          _id: sub._id, 
          id: sub._id, 
          name: sub.name 
        }))
      };
    });
    res.json(output);
  } catch (err) {
    console.error('Error fetching classes:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/classes/all - Get ALL classes (including those not assigned to teacher)
router.get('/all', async (req, res) => {
  try {
    console.log('[DEBUG] Fetching all classes');
    const classes = await Class.find({}).populate('subjects students teachers');
    
    console.log(`[DEBUG] Found ${classes.length} classes`);
    
    const output = classes.map(cls => {
      return {
        _id: cls._id,
        id: cls._id,
        name: cls.name,
        arms: Array.isArray(cls.arms) ? cls.arms : [],
        teachers: Array.isArray(cls.teachers) ? cls.teachers : [],
        subjects: cls.subjects.map(sub => ({ 
          _id: sub._id, 
          id: sub._id, 
          name: sub.name 
        })),
        studentCount: (cls.students || []).length
      };
    });
    res.json(output);
  } catch (err) {
    console.error('Error fetching all classes:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/classes/:classId/students - Get all students in a class
router.get('/:classId/students', async (req, res) => {
  try {
    const { classId } = req.params;

    console.log(`[DEBUG] Fetching students for class: ${classId}`);

    // Validate classId format
    if (!classId || classId.length !== 24) {
      console.warn(`[DEBUG] Invalid class ID format: ${classId}`);
      return res.status(400).json({ 
        error: 'Invalid class ID format',
        received: classId,
        length: classId ? classId.length : 0
      });
    }

    // Find the class first
    console.log(`[DEBUG] Looking up class in database...`);
    const cls = await Class.findById(classId);
    
    if (!cls) {
      console.warn(`[DEBUG] Class not found in database: ${classId}`);
      
      // Try alternative lookup by name if ID fails
      console.log(`[DEBUG] Attempting lookup by other fields...`);
      const allClasses = await Class.find({}).select('_id name');
      console.log(`[DEBUG] Available classes:`, allClasses);
      
      return res.status(404).json({ 
        error: 'Class not found',
        classId: classId,
        message: 'No class exists with this ID. Check if the class ID is correct.',
        availableClasses: allClasses
      });
    }

    console.log(`[DEBUG] Class found: ${cls.name}`);

    // Fetch students directly filtered by class
    const students = await Student.find({ class: classId });
    
    console.log(`[DEBUG] Found ${students.length} students in class`);

    // Return students with relevant fields
    const output = students.map(student => ({
      _id: student._id,
      id: student._id,
      name: `${student.first_name || ''} ${student.last_name || ''}`.trim(),
      firstName: student.first_name,
      lastName: student.last_name,
      regNo: student.regNo || student.registration_number || 'N/A',
      email: student.email,
      class: student.class,
      className: cls.name
    }));

    res.json(output);
  } catch (err) {
    console.error('Error fetching class students:', err);
    res.status(500).json({ 
      error: err.message,
      type: err.name,
      classId: req.params.classId
    });
  }
});

// GET /api/classes/:classId - Get single class details
router.get('/:classId/details', async (req, res) => {
  try {
    const { classId } = req.params;

    console.log(`[DEBUG] Fetching class details for: ${classId}`);

    if (!classId || classId.length !== 24) {
      return res.status(400).json({ error: 'Invalid class ID format' });
    }

    const cls = await Class.findById(classId)
      .populate('subjects')
      .populate('teachers')
      .populate('students');

    if (!cls) {
      console.warn(`[DEBUG] Class not found: ${classId}`);
      return res.status(404).json({ error: 'Class not found' });
    }

    res.json({
      _id: cls._id,
      id: cls._id,
      name: cls.name,
      arms: cls.arms || [],
      teachers: cls.teachers || [],
      subjects: (cls.subjects || []).map(sub => ({
        _id: sub._id,
        id: sub._id,
        name: sub.name
      })),
      students: (cls.students || []).map(student => ({
        _id: student._id,
        id: student._id,
        name: `${student.first_name || ''} ${student.last_name || ''}`.trim(),
        regNo: student.regNo || student.registration_number || 'N/A'
      }))
    });
  } catch (err) {
    console.error('Error fetching class:', err);
    res.status(500).json({ error: err.message });
  }
});

// ===== POST ENDPOINTS =====

// POST /api/classes - Create a new class
router.post('/', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Class name required' });

    const existing = await Class.findOne({ name });
    if (existing) return res.status(409).json({ error: 'Class already exists' });

    const newClass = new Class({ 
      name, 
      arms: [], 
      subjects: [], 
      teachers: [],
      students: []
    });
    await newClass.save();
    
    console.log(`[DEBUG] Created new class: ${newClass._id} - ${name}`);

    res.status(201).json({ 
      _id: newClass._id,
      id: newClass._id, 
      name,
      arms: [],
      subjects: [],
      teachers: [],
      students: []
    });
  } catch (err) {
    console.error('Error creating class:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/classes/:id/teachers - Add a teacher to a class
router.post('/:id/teachers', async (req, res) => {
  try {
    const { teacherId } = req.body;
    if (!teacherId) return res.status(400).json({ error: 'Teacher ID required' });

    const cls = await Class.findById(req.params.id);
    if (!cls) return res.status(404).json({ error: 'Class not found' });

    // Check if teacher already assigned
    if (!cls.teachers.includes(teacherId)) {
      cls.teachers.push(teacherId);
      await cls.save();
    }

    await cls.populate('teachers');
    res.json({ 
      _id: cls._id,
      id: cls._id, 
      ...cls.toObject() 
    });
  } catch (err) {
    console.error('Error adding teacher:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/classes/:id/arms - Add/replace arms in a class
router.post('/:id/arms', async (req, res) => {
  try {
    const { arms } = req.body;
    if (!Array.isArray(arms)) {
      return res.status(400).json({ error: 'Arms array required' });
    }

    const updated = await Class.findByIdAndUpdate(
      req.params.id, 
      { arms }, 
      { new: true }
    ).populate('subjects').populate('teachers');

    if (!updated) return res.status(404).json({ error: 'Class not found' });

    res.json({ 
      _id: updated._id,
      id: updated._id, 
      ...updated.toObject() 
    });
  } catch (err) {
    console.error('Error updating arms:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/classes/:id/subjects - Add/replace subjects in a class
router.post('/:id/subjects', async (req, res) => {
  try {
    const { id } = req.params;
    const { subjectName } = req.body;

    if (!subjectName || !subjectName.trim()) {
      return res.status(400).json({ error: "Subject name required" });
    }

    // Find or create subject
    let subject = await Subject.findOne({ name: subjectName.trim() });
    if (!subject) {
      subject = new Subject({ 
        name: subjectName.trim(), 
        class: id 
      });
      await subject.save();
    } else if (!subject.class || String(subject.class) !== String(id)) {
      subject.class = id;
      await subject.save();
    }

    const cls = await Class.findById(id);
    if (!cls) return res.status(404).json({ error: "Class not found" });

    // Add subject if not already in class
    if (!cls.subjects.includes(subject._id)) {
      cls.subjects.push(subject._id);
      await cls.save();
    }

    await cls.populate('subjects');

    res.json({
      success: true,
      _id: cls._id,
      id: cls._id,
      name: cls.name,
      subjects: cls.subjects.map(sub => ({
        _id: sub._id,
        id: sub._id,
        name: sub.name
      }))
    });
  } catch (err) {
    console.error('Error adding subject:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/classes/:classId/subjects/teacher - Add subjects as a teacher
router.post('/:classId/subjects/teacher', teacherAuth, async (req, res) => {
  try {
    const { classId } = req.params;
    const { subjectName } = req.body;

    if (!subjectName || !subjectName.trim()) {
      return res.status(400).json({ error: "Subject name required" });
    }

    // Find or create subject
    let subject = await Subject.findOne({ name: subjectName.trim() });
    if (!subject) {
      subject = new Subject({ 
        name: subjectName.trim(), 
        class: classId 
      });
      await subject.save();
    } else if (!subject.class || String(subject.class) !== String(classId)) {
      subject.class = classId;
      await subject.save();
    }

    const cls = await Class.findById(classId);
    if (!cls) return res.status(404).json({ error: "Class not found" });

    let justAdded = null;
    if (!cls.subjects.some(s =>
      s.subject &&
      String(s.subject._id) === String(subject._id) &&
      String(s.teacher) === String(req.staff._id)
    )) {
      cls.subjects.push({ subject: subject._id, teacher: req.staff._id });
      await cls.save();
      justAdded = { subject: subject._id, teacher: req.staff._id };
    }

    await cls.populate([
      { path: 'subjects.subject', model: 'Subject' },
      { path: 'subjects.teacher', model: 'Staff', select: 'first_name last_name email' }
    ]);

    const added = cls.subjects.find(s =>
      s.subject &&
      String(s.subject._id) === String(subject._id) &&
      String(s.teacher._id) === String(req.staff._id)
    );

    res.json({
      success: true,
      subject: added
        ? {
          _id: added.subject._id,
          id: added.subject._id,
          name: added.subject.name,
          teacher: added.teacher
            ? {
              _id: added.teacher._id,
              id: added.teacher._id,
              name: `${added.teacher.first_name} ${added.teacher.last_name}`,
              email: added.teacher.email
            }
            : null
        }
        : null
    });
  } catch (err) {
    console.error('Error adding subject as teacher:', err);
    res.status(500).json({ error: err.message });
  }
});

// ===== UTILITY ENDPOINTS =====

// GET /api/classes/debug/all - Debug endpoint to list all classes
router.get('/debug/all', async (req, res) => {
  try {
    const classes = await Class.find({}).select('_id name');
    res.json({
      count: classes.length,
      classes: classes
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
