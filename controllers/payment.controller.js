// controllers/paymentController.js

const Order = require('../models/order');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const verifyPayment = async (req, res) => {
  const { paymentIntentId } = req.query;

  if (!paymentIntentId) {
    return res.status(400).json({ message: "Missing paymentIntentId" });
  }

  try {
    // Retrieve the Payment Intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    console.log("Payment Intent status:", paymentIntent.status);

    // Find the corresponding order in your database using the stored Payment Intent ID
    const order = await Order.findOne({ stripePaymentIntentId: paymentIntentId });

    // If the payment has succeeded, update the order status if needed
    if (order && paymentIntent.status === 'succeeded' && order.paymentStatus !== 'Paid') {
      order.paymentStatus = 'Paid';
      await order.save();
    }

    return res.status(200).json({
      message: "Payment verification successful",
      paymentStatus: paymentIntent.status,
      order,
      paymentIntent,
    });
  } catch (error) {
    console.error("Payment verification error:", error);
    return res.status(500).json({ message: "Error verifying payment", error: error.message });
  }
};

module.exports = {
  verifyPayment,
};
