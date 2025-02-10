// routes/order.routes.js
const express = require('express');
const router = express.Router();
const { authenticateUser } = require('../middlewares/authMiddleware');
const { checkoutCart } = require('../controllers/order.controller');

// All order routes require authentication
router.use(authenticateUser);

// POST /api/checkout
router.post('/checkout', checkoutCart);

module.exports = router;
