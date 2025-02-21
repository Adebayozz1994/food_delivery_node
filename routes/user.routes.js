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
  updateUser,
  getUsers,
} = require('../controllers/User.controller');

const { getProducts } = require('../controllers/product.controller');

// Middlewares
const { authenticateUser, isAdmin } = require('../middlewares/authMiddleware');

// -----------------------------
// Auth Routes (Public)
// -----------------------------
router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/verify-token', verifyToken);
router.post('/forgot-password', forgotPassword);
router.post('/verify-otp', verifyOTP);
router.post('/create-new-password', createNewPassword);

// -----------------------------
// Admin User Management Routes (Admin Only)
// -----------------------------
router.delete('/admin/users/:userId', authenticateUser, isAdmin, deleteUser);
router.put('/admin/users/:userId', authenticateUser, isAdmin, updateUser);
router.get('/admin/users', authenticateUser, isAdmin, getUsers);


router.get('/products', getProducts);

module.exports = router;