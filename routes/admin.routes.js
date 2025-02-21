const express = require('express');
const router = express.Router();
const Order = require('../models/order');

const { authenticateUser, isAdmin } = require('../middlewares/authMiddleware'); 
const {
  addProduct,
  getProducts,
  updateProduct,
  deleteProduct
} = require('../controllers/product.controller');

const { getUsers, updateUser, deleteUser } = require('../controllers/User.controller');

router.patch('/orders/:trackingId/status', authenticateUser, isAdmin, async (req, res) => {
  try {
    const { trackingId } = req.params;
    const { orderStatus } = req.body;

    const order = await Order.findOne({ trackingId });
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    order.orderStatus = orderStatus;
    await order.save();

    // Optionally send email notification to customer
    // await sendOrderStatusEmail(order.user.email, order.trackingId, orderStatus);

    res.json({ message: 'Order status updated successfully', order });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ message: 'Error updating order status' });
  }
});


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
