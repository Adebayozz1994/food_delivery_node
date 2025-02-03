// routes/user.routes.js
const express = require('express');
const router = express.Router();
const {
  registerUser,
  loginUser,
  verifyToken,
  forgotPassword,
  verifyOTP,
  createNewPassword,
  deleteUser,
  updateUser
} = require('../controllers/User.controller');

// Public routes for registration, login, and password recovery
router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/verifyToken', verifyToken);
router.post('/forgot-password', forgotPassword);
router.post('/verify-otp', verifyOTP);
router.post('/create-new-password', createNewPassword);

// Admin-only routes for managing users
// (These routes should ideally be protected by admin-auth middleware)
router.delete('/admin/users/:userId', deleteUser);
router.put('/admin/users/:userId', updateUser);

module.exports = router;
