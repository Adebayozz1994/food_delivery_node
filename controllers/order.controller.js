const Order = require('../models/order');
const Cart = require('../models/Cart');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const nodemailer = require('nodemailer');
const crypto = require('crypto'); 

const checkoutCart = async (req, res) => {
  const { paymentMethod } = req.body;

  // Validate the payment method
  if (!['whatsapp', 'card', 'cod'].includes(paymentMethod)) {
    return res.status(400).json({ message: 'Invalid payment method' });
  }

  try {
    // Fetch the user's cart
    const cart = await Cart.findOne({ user: req.user._id }).populate('items.product');
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: 'Cart is empty' });
    }

    // Calculate total order price and prepare order items
    let total = 0;
    const orderItems = cart.items.map((item) => {
      total += item.product.price * item.quantity;
      return {
        product: item.product._id,
        quantity: item.quantity,
        price: item.product.price,
      };
    });

    // Initialize payment variables
    let paymentStatus = 'Pending';
    let clientSecret = null;
    let paymentIntent = null;

    // Handle card payment
    if (paymentMethod === 'card') {
      paymentIntent = await stripe.paymentIntents.create({
        amount: total * 100, 
        currency: 'usd',
        payment_method_types: ['card'],
      });
      clientSecret = paymentIntent.client_secret;
    }

    // Generate a unique tracking ID for the order
    const trackingId = crypto.randomBytes(6).toString('hex').toUpperCase();

    // Prepare new order data
    const newOrderData = {
      user: req.user._id,
      items: orderItems,
      total,
      paymentMethod,
      paymentIntentId: paymentIntent ? paymentIntent.id : null, 
      paymentStatus: paymentMethod === 'card' ? 'Pending' : 'Paid', 
      trackingId, 
    };

    // If payment method is card, store Stripe payment intent ID
    if (paymentMethod === 'card' && paymentIntent) {
      newOrderData.stripePaymentIntentId = paymentIntent.id;
    }

    // Create and save the new order
    const newOrder = new Order(newOrderData);
    await newOrder.save();

    // Clear the cart after the order is placed
    cart.items = [];
    await cart.save();

    // Handle WhatsApp order link for payment method "whatsapp"
    let whatsappLink = null;
    if (paymentMethod === 'whatsapp') {
      let message = `Hello, I would like to place an order:\n`;
      orderItems.forEach((item) => {
        message += `Product: ${item.product.name}, Quantity: ${item.quantity}\n`;
      });
      message += `Total: $${total}\nTracking ID: ${trackingId}`;
      whatsappLink = `https://wa.me/2348166223968?text=${encodeURIComponent(message)}`;
    }

    // Configure email transporter for sending order confirmation
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER, 
        pass: process.env.EMAIL_PASS,
      },
    });

    // Prepare email content
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: req.user.email,
      subject: 'Order Confirmation',
      text: `Thank you for your order!\nOrder Details:\n${orderItems
        .map(item => `Product: ${item.product.name}, Quantity: ${item.quantity}`)
        .join('\n')}\nTotal: $${total}\nTracking ID: ${trackingId}`,
    };

    // Send the order confirmation email
    await transporter.sendMail(mailOptions);

    // Respond with order details and payment info
    console.log('Response data:', {
      message: 'Payment successful',
      orderId: newOrder._id,
      trackingId,
      paymentIntentId: paymentIntent ? paymentIntent.id : null,
      clientSecret: paymentIntent ? paymentIntent.client_secret : null,
      whatsappLink,
    });


     res.status(200).json({
      message: 'Payment successful',
      orderId: newOrder._id,
      trackingId,
      paymentIntentId: paymentIntent ? paymentIntent.id : null,  
      clientSecret,
      whatsappLink,
    });
  } catch (error) {
    console.error('Checkout error:', error);
    return res.status(500).json({ message: 'Error during checkout', error: error.message });
  }
};

const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('items.product');
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    res.status(200).json({ order });
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ message: 'Error fetching order' });
  }
};

const getOrderByPaymentIntent = async (req, res) => {
  try {
    const { paymentIntentId } = req.params;  // Destructure to get paymentIntentId

    // Find the order by paymentIntentId
    const order = await Order.findOne({ stripePaymentIntentId: paymentIntentId });
    
    if (!order) {
      // Return a 404 if the order is not found
      return res.status(404).json({ message: 'Order not found' });
    }

    // Respond with the order details
    res.status(200).json({
      orderId: order._id,
      trackingId: order.trackingId,
    });
  } catch (error) {
    // Catch and return any errors
    console.error('Error fetching order:', error);
    res.status(500).json({
      message: 'Error fetching order',
      error: error.message,  // Include specific error message for debugging
    });
  }
};


module.exports = { checkoutCart, getOrderById, getOrderByPaymentIntent };
