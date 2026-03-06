const express = require('express');
const router = express.Router();
const { authMiddleware } = require('./auth');
const adminAuth = require('../middleware/adminAuth');
const AdmissionCohort = require('../models/AdmissionCohort');
const AdmissionApplication = require('../models/AdmissionApplication');
const AdmissionSetup = require('../models/AdmissionSetup');
const Session = require('../models/Session');
const Class = require('../models/Class');
const Arm = require('../models/Arm');

// ==================== COHORT ENDPOINTS ====================

// GET all cohorts
router.get('/cohorts', authMiddleware, adminAuth, async (req, res) => {
  try {
    const cohorts = await AdmissionCohort.find()
      .populate('session', 'name')
      .populate('class', 'name')
      .populate('arm', 'name')
      .sort({ createdAt: -1 });

    res.json(cohorts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET single cohort
router.get('/cohorts/:id', authMiddleware, adminAuth, async (req, res) => {
  try {
    const cohort = await AdmissionCohort.findById(req.params.id)
      .populate('session')
      .populate('class')
      .populate('arm')
      .populate('createdBy', 'email name');

    if (!cohort) {
      return res.status(404).json({ error: 'Cohort not found' });
    }

    res.json(cohort);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// CREATE new cohort
router.post('/cohorts', authMiddleware, adminAuth, async (req, res) => {
  try {
    const { session, term, class: classId, arm, startDate, endDate, applicationFee, description, capacity } = req.body;

    // Validation
    if (!session || !term || !classId || !arm || !startDate || !endDate) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if cohort already exists for this session/term/class/arm
    const exists = await AdmissionCohort.findOne({
      session,
      term,
      class: classId,
      arm
    });

    if (exists) {
      return res.status(400).json({ error: 'Cohort already exists for this session/term/class/arm combination' });
    }

    const cohort = new AdmissionCohort({
      session,
      term,
      class: classId,
      arm,
      startDate,
      endDate,
      applicationFee: applicationFee || 0,
      description,
      capacity: capacity || 50,
      createdBy: req.user._id
    });

    await cohort.save();
    await cohort.populate('session', 'name');
    await cohort.populate('class', 'name');
    await cohort.populate('arm', 'name');

    res.status(201).json(cohort);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// UPDATE cohort
router.put('/cohorts/:id', authMiddleware, adminAuth, async (req, res) => {
  try {
    const { session, term, class: classId, arm, startDate, endDate, applicationFee, description, capacity } = req.body;

    const cohort = await AdmissionCohort.findById(req.params.id);
    if (!cohort) {
      return res.status(404).json({ error: 'Cohort not found' });
    }

    // Prevent editing closed cohorts
    if (cohort.status === 'closed') {
      return res.status(400).json({ error: 'Cannot edit closed cohorts' });
    }

    // Update fields
    if (session) cohort.session = session;
    if (term) cohort.term = term;
    if (classId) cohort.class = classId;
    if (arm) cohort.arm = arm;
    if (startDate) cohort.startDate = startDate;
    if (endDate) cohort.endDate = endDate;
    if (applicationFee !== undefined) cohort.applicationFee = applicationFee;
    if (description !== undefined) cohort.description = description;
    if (capacity) cohort.capacity = capacity;

    await cohort.save();
    await cohort.populate('session', 'name');
    await cohort.populate('class', 'name');
    await cohort.populate('arm', 'name');

    res.json(cohort);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE cohort
router.delete('/cohorts/:id', authMiddleware, adminAuth, async (req, res) => {
  try {
    const cohort = await AdmissionCohort.findById(req.params.id);
    if (!cohort) {
      return res.status(404).json({ error: 'Cohort not found' });
    }

    // Check if cohort has applications
    const applicationCount = await AdmissionApplication.countDocuments({ cohort: req.params.id });
    if (applicationCount > 0) {
      return res.status(400).json({ error: 'Cannot delete cohort with existing applications' });
    }

    await AdmissionCohort.findByIdAndDelete(req.params.id);
    res.json({ message: 'Cohort deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PAUSE cohort
router.put('/cohorts/:id/pause', authMiddleware, adminAuth, async (req, res) => {
  try {
    const cohort = await AdmissionCohort.findById(req.params.id);
    if (!cohort) {
      return res.status(404).json({ error: 'Cohort not found' });
    }

    cohort.status = 'paused';
    await cohort.save();

    res.json({ message: 'Cohort paused successfully', cohort });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// RESUME cohort
router.put('/cohorts/:id/resume', authMiddleware, adminAuth, async (req, res) => {
  try {
    const cohort = await AdmissionCohort.findById(req.params.id);
    if (!cohort) {
      return res.status(404).json({ error: 'Cohort not found' });
    }

    if (cohort.status !== 'paused') {
      return res.status(400).json({ error: 'Only paused cohorts can be resumed' });
    }

    cohort.status = 'active';
    await cohort.save();

    res.json({ message: 'Cohort resumed successfully', cohort });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// CLOSE cohort
router.put('/cohorts/:id/close', authMiddleware, adminAuth, async (req, res) => {
  try {
    const cohort = await AdmissionCohort.findById(req.params.id);
    if (!cohort) {
      return res.status(404).json({ error: 'Cohort not found' });
    }

    cohort.status = 'closed';
    await cohort.save();

    res.json({ message: 'Cohort closed successfully', cohort });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== APPLICATION ENDPOINTS ====================

// GET all applications
router.get('/applications', authMiddleware, adminAuth, async (req, res) => {
  try {
    const { cohort, status } = req.query;
    let query = {};

    if (cohort) query.cohort = cohort;
    if (status) query.status = status;

    const applications = await AdmissionApplication.find(query)
      .populate('cohort')
      .populate('session', 'name')
      .populate('class', 'name')
      .populate('arm', 'name')
      .populate('reviewedBy', 'email name')
      .sort({ dateApplied: -1 });

    res.json(applications);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET single application
router.get('/application/:id', authMiddleware, adminAuth, async (req, res) => {
  try {
    const application = await AdmissionApplication.findById(req.params.id)
      .populate('cohort')
      .populate('session', 'name')
      .populate('class', 'name')
      .populate('arm', 'name')
      .populate('reviewedBy', 'email name');

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    res.json(application);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// CREATE application (public or admin)
router.post('/application', async (req, res) => {
  try {
    const {
      cohort,
      name,
      email,
      phone,
      parentEmail,
      parentPhone,
      dateOfBirth,
      gender,
      address,
      previousSchool,
      documents,
      photoUrl
    } = req.body;

    if (!cohort || !name || !email || !phone || !gender) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if cohort exists and is active
    const cohortData = await AdmissionCohort.findById(cohort);
    if (!cohortData) {
      return res.status(404).json({ error: 'Cohort not found' });
    }

    if (cohortData.status !== 'active') {
      return res.status(400).json({ error: 'Admissions for this cohort are currently closed' });
    }

    // Check capacity
    if (cohortData.applicantCount >= cohortData.capacity) {
      return res.status(400).json({ error: 'Cohort is at full capacity' });
    }

    // Check if applicant already applied for this cohort
    const exists = await AdmissionApplication.findOne({ email, cohort });
    if (exists) {
      return res.status(400).json({ error: 'You have already applied for this cohort' });
    }

    const application = new AdmissionApplication({
      cohort,
      session: cohortData.session,
      term: cohortData.term,
      class: cohortData.class,
      arm: cohortData.arm,
      name,
      email,
      phone,
      parentEmail,
      parentPhone,
      dateOfBirth,
      gender,
      address,
      previousSchool,
      documents,
      photoUrl,
      applicationFee: cohortData.applicationFee
    });

    await application.save();

    // Increment applicant count
    cohortData.applicantCount += 1;
    await cohortData.save();

    res.status(201).json({
      message: 'Application submitted successfully',
      application
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// UPDATE application status
router.put('/application/:id', authMiddleware, adminAuth, async (req, res) => {
  try {
    const { status, notes } = req.body;

    if (!status || !['Pending', 'Approved', 'Rejected', 'Enrolled'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const application = await AdmissionApplication.findById(req.params.id);
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    application.status = status;
    if (notes) application.notes = notes;
    application.dateReviewed = new Date();
    application.reviewedBy = req.user._id;

    await application.save();
    await application.populate('reviewedBy', 'email name');

    res.json({ message: `Application ${status}`, application });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE application
router.delete('/application/:id', authMiddleware, adminAuth, async (req, res) => {
  try {
    const application = await AdmissionApplication.findById(req.params.id);
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    const cohort = await AdmissionCohort.findById(application.cohort);
    if (cohort && cohort.applicantCount > 0) {
      cohort.applicantCount -= 1;
      await cohort.save();
    }

    await AdmissionApplication.findByIdAndDelete(req.params.id);
    res.json({ message: 'Application deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== ADMISSION SETUP ENDPOINTS ====================

// CREATE setup
router.post('/setup', authMiddleware, adminAuth, async (req, res) => {
  try {
    const { session, term, classId, armId, startDate, endDate, applicationFee } = req.body;

    if (!session || !term || !classId || !armId || !startDate || !endDate) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const setup = new AdmissionSetup({
      session,
      term,
      class: classId,
      arm: armId,
      startDate,
      endDate,
      applicationFee: applicationFee || 0,
      createdBy: req.user._id
    });

    await setup.save();
    await setup.populate('session', 'name');
    await setup.populate('class', 'name');
    await setup.populate('arm', 'name');

    res.status(201).json(setup);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET all setups
router.get('/setups', authMiddleware, adminAuth, async (req, res) => {
  try {
    const setups = await AdmissionSetup.find()
      .populate('session', 'name')
      .populate('class', 'name')
      .populate('arm', 'name')
      .sort({ createdAt: -1 });

    res.json(setups);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== STATISTICS ENDPOINTS ====================

// GET admission statistics
router.get('/stats', authMiddleware, adminAuth, async (req, res) => {
  try {
    const totalApplications = await AdmissionApplication.countDocuments();
    const pendingApplications = await AdmissionApplication.countDocuments({ status: 'Pending' });
    const approvedApplications = await AdmissionApplication.countDocuments({ status: 'Approved' });
    const rejectedApplications = await AdmissionApplication.countDocuments({ status: 'Rejected' });
    const activeCohorts = await AdmissionCohort.countDocuments({ status: 'active' });
    const pausedCohorts = await AdmissionCohort.countDocuments({ status: 'paused' });

    res.json({
      totalApplications,
      pendingApplications,
      approvedApplications,
      rejectedApplications,
      activeCohorts,
      pausedCohorts
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET cohort statistics
router.get('/cohorts/:id/stats', authMiddleware, adminAuth, async (req, res) => {
  try {
    const cohort = await AdmissionCohort.findById(req.params.id);
    if (!cohort) {
      return res.status(404).json({ error: 'Cohort not found' });
    }

    const totalApplications = await AdmissionApplication.countDocuments({ cohort: req.params.id });
    const pendingApplications = await AdmissionApplication.countDocuments({ 
      cohort: req.params.id, 
      status: 'Pending' 
    });
    const approvedApplications = await AdmissionApplication.countDocuments({ 
      cohort: req.params.id, 
      status: 'Approved' 
    });
    const rejectedApplications = await AdmissionApplication.countDocuments({ 
      cohort: req.params.id, 
      status: 'Rejected' 
    });

    res.json({
      cohort: cohort.name,
      totalApplications,
      pendingApplications,
      approvedApplications,
      rejectedApplications,
      capacity: cohort.capacity,
      remainingCapacity: cohort.capacity - totalApplications
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
