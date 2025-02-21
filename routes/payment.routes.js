const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Order = require('../models/order');
const { authenticateToken } = require('../middleware/auth');

// Create payment intent
router.post('/create-intent', authenticateToken, async (req, res) => {
  try {
    const { amount, orderId } = req.body;

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'usd',
      metadata: { orderId }
    });

    // Update order with payment intent ID
    await Order.findByIdAndUpdate(orderId, {
      stripePaymentIntentId: paymentIntent.id
    });

    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    console.error('Payment intent creation error:', error);
    res.status(500).json({ message: 'Error creating payment intent' });
  }
});

// Webhook handler
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object;
        
        const order = await Order.findOne({ 
          stripePaymentIntentId: paymentIntent.id 
        });
        
        if (order) {
          order.paymentStatus = 'Completed';
          await order.save();
          console.log('Payment completed for order:', order._id);
        }
        break;

      case 'payment_intent.payment_failed':
        const failedPayment = event.data.object;
        
        const failedOrder = await Order.findOne({ 
          stripePaymentIntentId: failedPayment.id 
        });
        
        if (failedOrder) {
          failedOrder.paymentStatus = 'Failed';
          await failedOrder.save();
          console.log('Payment failed for order:', failedOrder._id);
        }
        break;
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

module.exports = router;