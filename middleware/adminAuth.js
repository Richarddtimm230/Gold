// middleware/adminAuth.js
module.exports = function (req, res, next) {
  // Only block if token exists but invalid
  if (req.user && req.user.role) {
    return next();
  }
  // Otherwise, just continue
  next();
};
