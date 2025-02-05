const express = require('express');
const router = express.Router();

const { authenticateUser, isAdmin } = require('../middlewares/authMiddleware'); 
const {
  addProduct,
  getProducts,
  updateProduct,
  deleteProduct
} = require('../controllers/product.controller');

const { getUsers, updateUser, deleteUser } = require('../controllers/user.controller');

// Apply authentication and admin middleware to all routes below
router.use(authenticateUser, isAdmin);

// -----------------------------
// Admin Product Management Endpoints
// -----------------------------
router.post('/products', addProduct);
router.put('/products/:productId', updateProduct);
router.delete('/products/:productId', deleteProduct);
router.get('/products', getProducts); // Admin can also view all products

// -----------------------------
// Admin User Management Endpoints
// -----------------------------
router.get('/users', getUsers);
router.put('/users/:userId', updateUser);
router.delete('/users/:userId', deleteUser);

module.exports = router;
