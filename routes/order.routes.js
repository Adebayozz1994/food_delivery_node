// routes/order.routes.js
const express = require('express');
const router = express.Router();
const { authenticateUser } = require('../middlewares/authMiddleware');
const { checkoutCart } = require('../controllers/order.controller');
const { verifyPayment } = require('../controllers/payment.controller');
const { getOrderById,getOrderByPaymentIntent } = require('../controllers/order.controller');

// All order routes require authentication
router.use(authenticateUser);

// POST /api/checkout
router.post('/checkout', checkoutCart);

// Endpoint for verifying payment using Stripe Payment Intent ID
router.get('/verify-payment', verifyPayment);

router.get('/:orderId', getOrderById);
router.get('/payment-intent/:paymentIntentId', getOrderByPaymentIntent);


module.exports = router;
