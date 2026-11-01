import jwt from 'jsonwebtoken';
import User from '../models/userModel.js';

// 1. Verify JWT Token
export const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      req.user = await User.findById(decoded.id).select('-password');
      if (!req.user) {
        return res.status(401).json({ success: false, message: 'User no longer exists' });
      }

      if (!req.user.isActive) {
        return res.status(403).json({ success: false, message: 'Account is deactivated' });
      }

      next();
    } catch (error) {
      return res.status(401).json({ success: false, message: 'Not authorized, token invalid or expired' });
    }
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized, no token provided' });
  }
};

// 2. Authorize Specific Roles
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role (${req.user.role}) is not authorized to access this resource`,
      });
    }
    next();
  };
};

// 3. Helper: check if user is admin-level (superadmin or principal or admin)
export const isAdminLevel = (role) =>
  ['superadmin', 'principal', 'admin'].includes(role);

// 4. Middleware: allow admin-level roles
export const authorizeAdmin = (req, res, next) => {
  if (!isAdminLevel(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Admin-level access required',
    });
  }
  next();
};

// 5. Middleware: teacher must own the exam or be admin-level
export const authorizeTeacherOrAdmin = (getExamId) => async (req, res, next) => {
  if (isAdminLevel(req.user.role)) return next();
  if (req.user.role === 'teacher') return next();
  return res.status(403).json({ success: false, message: 'Not authorized' });
};
