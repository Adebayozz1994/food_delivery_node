const Order = require('../models/order');
const Cart = require('../models/Cart');
const mongoose = require('mongoose');
const stripe = require('stripe')('your-stripe-secret-key');  // Add your actual Stripe secret key

// Checkout controller: processes the cart into an order.
const checkoutCart = async (req, res) => {
  const { paymentMethod, cardDetails } = req.body;

  // Validate payment method
  if (!['whatsapp', 'card', 'cod'].includes(paymentMethod)) {
    return res.status(400).json({ message: 'Invalid payment method' });
  }

  try {
    // Find the user's cart and populate product details
    let cart = await Cart.findOne({ user: req.user._id }).populate('items.product');
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: 'Cart is empty' });
    }

    // Calculate total and prepare order items
    let total = 0;
    const orderItems = cart.items.map((item) => {
      total += item.product.price * item.quantity;
      return {
        product: item.product._id,
        quantity: item.quantity,
        price: item.product.price
      };
    });

    // If payment method is "card", integrate with Stripe payment gateway.
    let paymentStatus = 'Pending';
    if (paymentMethod === 'card') {
      // Validate card details (for simplicity, skipping detailed card validation here)
      if (!cardDetails || !cardDetails.cardNumber) {
        return res.status(400).json({ message: 'Card details are required for card payment' });
      }

      // Create payment intent on Stripe
      const paymentIntent = await stripe.paymentIntents.create({
        amount: total * 100, // Amount in cents
        currency: 'usd',     // Replace with the correct currency
        payment_method: cardDetails.cardId,  // Card ID from Stripe frontend
        confirmation_method: 'manual',
        confirm: true
      });

      // Check if the payment was successful
      if (paymentIntent.status === 'succeeded') {
        paymentStatus = 'Paid';
      } else {
        return res.status(500).json({ message: 'Payment failed' });
      }
    }

    // Create the order
    const newOrder = new Order({
      user: req.user._id,
      items: orderItems,
      total,
      paymentMethod,
      paymentStatus
    });
    await newOrder.save();

    // Clear the user's cart
    cart.items = [];
    await cart.save();

    // For WhatsApp orders, generate a pre-filled WhatsApp URL link with the order details.
    let whatsappLink = null;
    if (paymentMethod === 'whatsapp') {
      let message = `Hello, I would like to place an order:\n`;
      newOrder.items.forEach((item) => {
        message += `Product ID: ${item.product}, Quantity: ${item.quantity}\n`;
      });
      message += `Total: $${total}\nOrder ID: ${newOrder._id}`;
      // Replace YOUR_PHONE_NUMBER with your actual WhatsApp number (with country code)
      whatsappLink = `https://wa.me/+2348166223968?text=${encodeURIComponent(message)}`;
    }

    return res.status(200).json({
      message: 'Checkout successful',
      order: newOrder,
      ...(whatsappLink && { whatsappLink })
    });
  } catch (error) {
    return res.status(500).json({ message: 'Error during checkout', error: error.message });
  }
};

module.exports = { checkoutCart };
