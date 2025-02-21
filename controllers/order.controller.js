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
    // Fetch the user's cart and populate product details
    const cart = await Cart.findOne({ user: req.user._id }).populate({
      path: 'items.product',
      select: 'name price description'
    });

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: 'Cart is empty' });
    }

    // Calculate total and prepare order items
    let total = 0;
    const orderItems = cart.items.map(item => {
      total += item.product.price * item.quantity;
      return {
        product: item.product._id,
        quantity: item.quantity,
        price: item.product.price,
      };
    });

    // Save the original cart items for email and WhatsApp before clearing the cart
    const emailItems = cart.items.map(item => ({
      product: item.product,
      quantity: item.quantity
    }));

    // Initialize payment variables
    let clientSecret = null;
    let paymentIntent = null;

    if (paymentMethod === 'card') {
      paymentIntent = await stripe.paymentIntents.create({
        amount: total * 100,
        currency: 'usd',
        payment_method_types: ['card'],
      });
      clientSecret = paymentIntent.client_secret;
    }

    // Generate a unique tracking ID
    const trackingId = crypto.randomBytes(6).toString('hex').toUpperCase();

    // Prepare new order data
    const newOrderData = {
      user: req.user._id,
      items: orderItems,
      total,
      paymentMethod,
      // If card, set the payment intent ID; for other methods, you can use a placeholder
      paymentIntentId: paymentMethod === 'card' && paymentIntent ? paymentIntent.id : 'N/A',
      // For card payments, status remains pending; for others, assume paid
      paymentStatus: paymentMethod === 'card' ? 'Pending' : 'Paid',
      trackingId,
      stripePaymentIntentId: paymentMethod === 'card' && paymentIntent ? paymentIntent.id : null,
    };

    // Create and save the order
    const newOrder = new Order(newOrderData);
    await newOrder.save();

    // Clear the cart after saving the order
    cart.items = [];
    await cart.save();

    // If payment method is WhatsApp, build the message using emailItems
    let whatsappLink = null;
    if (paymentMethod === 'whatsapp') {
      let message = `Hello, I would like to place an order:\n`;
      emailItems.forEach(item => {
        message += `Product: ${item.product.name}, Quantity: ${item.quantity}\n`;
      });
      message += `Total: $${total}\nTracking ID: ${trackingId}`;
      whatsappLink = `https://wa.me/2348166223968?text=${encodeURIComponent(message)}`;
    }

    // Configure email transporter for sending confirmation email
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Create the order items list for the email using emailItems
    const orderItemsList = emailItems.map(item => `
      Product: ${item.product.name}
      Quantity: ${item.quantity}
      Price: $${item.product.price.toFixed(2)}
      Subtotal: $${(item.product.price * item.quantity).toFixed(2)}
    `).join('\n');

    // Prepare email content
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: req.user.email,
      subject: 'Order Confirmation',
      text: `
Thank you for your order!

Order Details:
--------------
Order ID: ${newOrder._id}
Tracking ID: ${trackingId}
Payment Method: ${paymentMethod}

Items:
------
${orderItemsList}

Total Amount: $${total.toFixed(2)}

Track your order using the tracking ID: ${trackingId}

Thank you for shopping with us!
      `,
      html: `
        <h2>Thank you for your order!</h2>
        <h3>Order Details:</h3>
        <p><strong>Order ID:</strong> ${newOrder._id}</p>
        <p><strong>Tracking ID:</strong> ${trackingId}</p>
        <p><strong>Payment Method:</strong> ${paymentMethod}</p>
        <h3>Items:</h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <thead>
            <tr style="background-color: #f8f9fa;">
              <th style="padding: 10px; border: 1px solid #dee2e6;">Product</th>
              <th style="padding: 10px; border: 1px solid #dee2e6;">Quantity</th>
              <th style="padding: 10px; border: 1px solid #dee2e6;">Price</th>
              <th style="padding: 10px; border: 1px solid #dee2e6;">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${emailItems.map(item => `
              <tr>
                <td style="padding: 10px; border: 1px solid #dee2e6;">${item.product.name}</td>
                <td style="padding: 10px; border: 1px solid #dee2e6; text-align: center;">${item.quantity}</td>
                <td style="padding: 10px; border: 1px solid #dee2e6; text-align: right;">$${item.product.price.toFixed(2)}</td>
                <td style="padding: 10px; border: 1px solid #dee2e6; text-align: right;">$${(item.product.price * item.quantity).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr style="background-color: #f8f9fa;">
              <td colspan="3" style="padding: 10px; border: 1px solid #dee2e6; text-align: right;"><strong>Total:</strong></td>
              <td style="padding: 10px; border: 1px solid #dee2e6; text-align: right;"><strong>$${total.toFixed(2)}</strong></td>
            </tr>
          </tfoot>
        </table>
        <p>Track your order using the tracking ID: <strong>${trackingId}</strong></p>
        <p>Thank you for shopping with us!</p>
      `
    };

    // Send the confirmation email
    await transporter.sendMail(mailOptions);

    // Respond with order details and payment info
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
    const { orderId } = req.params;

    const order = await Order.findById(orderId)
      .populate({
        path: 'items.product',
        select: 'name price description image'
      })
      .populate('user', 'firstName lastName email');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if the order belongs to the authenticated user
    if (order.user._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Unauthorized access to order' });
    }

    res.json({ order });
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ message: 'Error fetching order details' });
  }
};

const getOrderByPaymentIntent = async (req, res) => {
  try {
    const { paymentIntentId } = req.params;
    const order = await Order.findOne({ stripePaymentIntentId: paymentIntentId }).populate({
      path: 'items.product',
      select: 'name price description image'
    });
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    res.status(200).json({
      orderId: order._id,
      trackingId: order.trackingId,
      items: order.items,
      total: order.total,
      paymentStatus: order.paymentStatus,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    });
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ message: 'Error fetching order', error: error.message });
  }
};

module.exports = { checkoutCart, getOrderById, getOrderByPaymentIntent };
