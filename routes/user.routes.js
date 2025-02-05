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
} = require('../controllers/user.controller');

const {
  addProduct,
  getProducts,
  updateProduct,
  deleteProduct,
} = require('../controllers/product.controller');

const { authenticateUser, isAdmin } = require('../middlewares/authMiddleware');

// Auth routes
router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/verifyToken', verifyToken);
router.post('/forgot-password', forgotPassword);
router.post('/verify-otp', verifyOTP);
router.post('/create-new-password', createNewPassword);

// Admin-only routes for managing users (protected by authentication and admin middleware)
router.delete('/admin/users/:userId', authenticateUser, isAdmin, deleteUser);
router.put('/admin/users/:userId', authenticateUser, isAdmin, updateUser);

// Product routes
router.post('/products/add', authenticateUser, addProduct); 
router.get('/products', getProducts);
router.put('/products/:productId', authenticateUser, updateProduct); 
router.delete('/products/:productId', authenticateUser, deleteProduct);

module.exports = router;
