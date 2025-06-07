const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Firestore DB instance (adjust if you use app.locals or another export)
const db = require('../firestore');

// --- UNIFIED LOGIN ROUTE ---
router.post('/login', async (req, res) => {
  const { email, regNo, password } = req.body;
  if ((!email && !regNo) || !password) {
    return res.status(400).json({ error: 'Email/registration number and password are required.' });
  }
  try {
    // 1. Try User (admin/superadmin)
    let userDoc = null;
    let userSnap = null;
    if (email) {
      userSnap = await db.collection('users').where('email', '==', email).limit(1).get();
    } else if (regNo) {
      userSnap = await db.collection('users').where('regNo', '==', regNo).limit(1).get();
    }
    if (userSnap && !userSnap.empty) {
      userDoc = userSnap.docs[0];
      const user = userDoc.data();
      if (await bcrypt.compare(password, user.password)) {
        const token = jwt.sign(
          {
            id: userDoc.id,
            role: user.role,
            email: user.email,
            regNo: user.regNo || null
          },
          process.env.JWT_SECRET,
          { expiresIn: '7d' }
        );
        return res.json({
          token,
          user: {
            id: userDoc.id,
            name: user.name,
            email: user.email,
            regNo: user.regNo || null,
            role: user.role
          }
        });
      }
    }

    // 2. Try Staff (by login_email or email)
    let staffDoc = null;
    let staffSnap = null;
    if (email) {
      staffSnap = await db.collection('staff').where('login_email', '==', email).limit(1).get();
      if (staffSnap.empty) {
        staffSnap = await db.collection('staff').where('email', '==', email).limit(1).get();
      }
    }
    // Staff can ONLY login with email (not regNo)
    if (staffSnap && !staffSnap.empty) {
      staffDoc = staffSnap.docs[0];
      const staff = staffDoc.data();
      if (await bcrypt.compare(password, staff.login_password)) {
        const token = jwt.sign(
          {
            id: staffDoc.id,
            role: staff.access_level || 'staff',
            email: staff.login_email || staff.email
          },
          process.env.JWT_SECRET,
          { expiresIn: '7d' }
        );
        return res.json({
          token,
          user: {
            id: staffDoc.id,
            name: `${staff.first_name} ${staff.last_name}`,
            email: staff.login_email || staff.email,
            role: staff.access_level || 'staff',
            department: staff.department,
            designation: staff.designation
          }
        });
      }
    }

    // 3. Try Student (by regNo or studentEmail)
    let studentDoc = null;
    let studentSnap = null;
    if (regNo) {
      studentSnap = await db.collection('students').where('regNo', '==', regNo).limit(1).get();
    } else if (email) {
      studentSnap = await db.collection('students').where('studentEmail', '==', email).limit(1).get();
    }
    if (studentSnap && !studentSnap.empty) {
      studentDoc = studentSnap.docs[0];
      const student = studentDoc.data();
      if (await bcrypt.compare(password, student.password)) {
        const token = jwt.sign(
          {
            id: studentDoc.id,
            role: 'student',
            regNo: student.regNo
          },
          process.env.JWT_SECRET,
          { expiresIn: '7d' }
        );
        return res.json({
          token,
          user: {
            id: studentDoc.id,
            name: `${student.firstname} ${student.surname}`,
            regNo: student.regNo,
            role: 'student'
          }
        });
      }
    }

    // If none matched, invalid credentials
    return res.status(401).json({ error: 'Invalid credentials.' });
  } catch (err) {
    console.error('[LOGIN ERROR]', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// --- AUTH MIDDLEWARE ---
async function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided.' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 1. Try fetching user (admin/superadmin)
    let userDoc = await db.collection('users').doc(decoded.id).get();
    if (userDoc.exists) {
      const user = userDoc.data();
      req.user = {
        id: userDoc.id,
        name: user.name,
        email: user.email,
        regNo: user.regNo || null,
        role: user.role
      };
      return next();
    }
    // 2. Try fetching staff
    let staffDoc = await db.collection('staff').doc(decoded.id).get();
    if (staffDoc.exists) {
      const staff = staffDoc.data();
      req.user = {
        id: staffDoc.id,
        name: `${staff.first_name} ${staff.last_name}`,
        email: staff.login_email || staff.email,
        role: staff.access_level || 'staff',
        department: staff.department,
        designation: staff.designation
      };
      return next();
    }
    // 3. Fallback: Try fetching student
    let studentDoc = await db.collection('students').doc(decoded.id).get();
    if (studentDoc.exists) {
      const student = studentDoc.data();
      req.user = {
        id: studentDoc.id,
        name: `${student.firstname} ${student.surname}`,
        regNo: student.regNo,
        role: 'student'
      };
      return next();
    }
    return res.status(401).json({ error: 'User not found.' });
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

// --- GET CURRENT USER ROUTE ---
router.get('/me', authMiddleware, (req, res) => {
  res.json(req.user);
});

module.exports = { router, authMiddleware };
