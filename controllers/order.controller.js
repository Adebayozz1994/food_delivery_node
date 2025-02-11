const Order = require('../models/order');
const Cart = require('../models/Cart');
const stripe = require('stripe')('sk_test_51QrGLQGu8lA2diLSHEZXhvUZVlqlHvb5Yf81TLFT7ClQtIeWnHkxSHPFiz3w3xpc5s9zsFnVRBBy0LNEGrqkuYy8004hv2J779'); // Replace with your actual Stripe secret key
const nodemailer = require('nodemailer');  // Assuming you're using nodemailer for email sending

// Checkout cart function
const checkoutCart = async (req, res) => {
  const { paymentMethod } = req.body;

  if (!['whatsapp', 'card', 'cod'].includes(paymentMethod)) {
    return res.status(400).json({ message: 'Invalid payment method' });
  }

  try {
    const cart = await Cart.findOne({ user: req.user._id }).populate('items.product');
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: 'Cart is empty' });
    }

    let total = 0;
    const orderItems = cart.items.map((item) => {
      total += item.product.price * item.quantity;
      return {
        product: item.product._id,
        quantity: item.quantity,
        price: item.product.price,
      };
    });

    let paymentStatus = 'Pending';
    let clientSecret = null;

    // Handle Stripe payment if 'card' method
    if (paymentMethod === 'card') {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: total * 100, // amount in cents
        currency: 'usd',
        payment_method_types: ['card'],
      });

      clientSecret = paymentIntent.client_secret;
    }

    // Create new order
    const newOrder = new Order({
      user: req.user._id,
      items: orderItems,
      total,
      paymentMethod,
      paymentStatus: paymentMethod === 'card' ? 'Pending' : 'Paid',
    });
    await newOrder.save();

    // Clear the cart
    cart.items = [];
    await cart.save();

    let whatsappLink = null;
    if (paymentMethod === 'whatsapp') {
      let message = `Hello, I would like to place an order:\n`;
      orderItems.forEach((item) => {
        message += `Product: ${item.product.name}, Quantity: ${item.quantity}\n`; // Assuming `product.name` exists
      });
      message += `Total: $${total}\nOrder ID: ${newOrder._id}`;
      whatsappLink = `https://wa.me/2348166223968?text=${encodeURIComponent(message)}`;
    }

    // Send email confirmation
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'ogunladeadebayopeter@gmail.com', // Replace with your email
        pass: 'tfum gyvs fkga tged', // Replace with your email password
      },
    });

    const mailOptions = {
      from: 'ogunladeadebayopeter@gmail.com', // Replace with your email
      to: req.user.email, // Assuming you have email in user model
      subject: 'Order Confirmation',
      text: `Thank you for your order! Here are the details:\n${orderItems.map(item => `Product: ${item.product.name}, Quantity: ${item.quantity}`).join('\n')}\nTotal: $${total}\nOrder ID: ${newOrder._id}`,
    };

    await transporter.sendMail(mailOptions);

    return res.status(200).json({
      message: 'Checkout successful',
      order: newOrder,
      clientSecret,
      whatsappLink,
    });
  } catch (error) {
    console.error('Checkout error:', error);
    return res.status(500).json({ message: 'Error during checkout', error: error.message });
  }
};

module.exports = {
  checkoutCart,
};
