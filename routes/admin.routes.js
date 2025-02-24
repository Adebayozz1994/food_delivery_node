const express = require('express');
const router = express.Router();
const Order = require('../models/order');
const { isAdmin, authenticateUser } = require('../middlewares/authMiddleware');
const {
  addProduct,
  getProducts,
  updateProduct,
  deleteProduct,
  getProductsByCategory,
  toggleProductAvailability
} = require('../controllers/product.controller');

const { getUsers, updateUser, deleteUser } = require('../controllers/User.controller');

// Order Controllers (make sure these functions are defined and exported in order.controller.js)
const { getAllOrders, updateOrderStatus } = require('../controllers/User.controller');

// Apply authentication and admin middleware to all routes below
router.use(authenticateUser, isAdmin);

// -----------------------------
// Admin Product Management Endpoints
// -----------------------------
router.post('/products', addProduct);
router.put('/products/:productId', updateProduct);
router.delete('/products/:productId', deleteProduct);
router.get('/products', getProducts);
router.get('/products/category/:category', getProductsByCategory);
router.patch('/products/:productId/toggle-availability', toggleProductAvailability);

// -----------------------------
// Admin User Management Endpoints
// -----------------------------
router.get('/users', getUsers);
router.put('/users/:userId', updateUser);
router.delete('/users/:userId', deleteUser);

router.get('/orders', authenticateUser, isAdmin, getAllOrders);
router.patch('/orders/:orderId', authenticateUser, isAdmin, updateOrderStatus);


module.exports = router;
