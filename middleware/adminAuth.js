module.exports = function (req, res, next) {
  if (!req.user || !['admin', 'teacher', 'staff', 'superadmin'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Forbidden: Admin/Staff access only.' });
  }
  next();
};
