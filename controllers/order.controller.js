const Order = require('../models/order');
const Cart = require('../models/Cart');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const nodemailer = require('nodemailer');
const crypto = require('crypto');

const checkoutCart = async (req, res) => {
  const { paymentMethod, deliveryAddress } = req.body;

  // Validate payment method
  if (!['whatsapp', 'card', 'cod'].includes(paymentMethod)) {
    return res.status(400).json({ message: 'Invalid payment method' });
  }

  // Validate delivery address for COD
  if (paymentMethod === 'cod') {
    if (!deliveryAddress || !deliveryAddress.street || !deliveryAddress.city || 
        !deliveryAddress.state || !deliveryAddress.phoneNumber) {
      return res.status(400).json({ 
        message: 'Delivery address is required for Cash on Delivery orders' 
      });
    }
  }

  try {
    // Fetch the user's cart with populated product details
    const cart = await Cart.findOne({ user: req.user._id })
      .populate({
        path: 'items.product',
        select: 'name price description image'
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

    // Generate tracking ID
    const trackingId = crypto.randomBytes(6).toString('hex').toUpperCase();

    // Initialize payment variables
    let clientSecret = null;
    let paymentIntent = null;

    // Handle different payment methods
    if (paymentMethod === 'card') {
      // Create Stripe payment intent for card payments
      paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(total * 100),
        currency: 'usd',
        payment_method_types: ['card'],
      });
      clientSecret = paymentIntent.client_secret;
    }

    // Prepare new order data
    const newOrderData = {
      user: req.user._id,
      items: orderItems,
      total,
      paymentMethod,
      paymentStatus: paymentMethod === 'card' ? 'Pending' : 'Completed',
      orderStatus: paymentMethod === 'card' ? 'Pending' : 'Processing',
      paymentIntentId: paymentMethod === 'card' ? paymentIntent.id : 'N/A',
      stripePaymentIntentId: paymentMethod === 'card' ? paymentIntent.id : null,
      trackingId,
      ...(paymentMethod === 'cod' && { deliveryAddress }),
    };

    // Create and save the order
    const newOrder = new Order(newOrderData);
    await newOrder.save();

    // Prepare WhatsApp message if payment method is WhatsApp
    let whatsappLink = null;
    if (paymentMethod === 'whatsapp') {
      // Store items before clearing cart
      const orderItemsDetails = cart.items.map(item => ({
        name: item.product.name,
        quantity: item.quantity,
        price: item.product.price
      }));

      let message = `*New Order Request*\n\n`;
      message += `Order ID: ${newOrder._id}\n`;
      message += `Tracking ID: ${trackingId}\n\n`;
      message += `*Order Items:*\n`;
      
      orderItemsDetails.forEach(item => {
        message += `- ${item.name} x${item.quantity} ($${item.price.toFixed(2)})\n`;
      });
      
      message += `\n*Total Amount:* $${total.toFixed(2)}\n\n`;
      message += `Customer: ${req.user.firstName} ${req.user.lastName}\n`;
      message += `Email: ${req.user.email}\n`;
      message += `Payment Method: WhatsApp Pay`;

      // Create WhatsApp link with pre-filled message
      whatsappLink = `https://wa.me/2348166223968?text=${encodeURIComponent(message)}`;
    }

    // Store items before clearing cart
    const orderItemsForEmail = cart.items.map(item => ({
      name: item.product.name,
      quantity: item.quantity,
      price: item.product.price
    }));

    // Clear the cart
    cart.items = [];
    await cart.save();

    // Configure email transporter
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
      text: `
Thank you for your order!

Order Details:
--------------
Order ID: ${newOrder._id}
Tracking ID: ${trackingId}
Payment Method: ${paymentMethod.toUpperCase()}

${paymentMethod === 'cod' ? `
Delivery Address:
----------------
Street: ${deliveryAddress.street}
City: ${deliveryAddress.city}
State: ${deliveryAddress.state}
Phone: ${deliveryAddress.phoneNumber}
` : ''}

Items:
------
${orderItemsForEmail.map(item => `
Product: ${item.name}
Quantity: ${item.quantity}
Price: $${item.price.toFixed(2)}
Subtotal: $${(item.price * item.quantity).toFixed(2)}
`).join('\n')}

Total Amount: $${total.toFixed(2)}

Track your order using the tracking ID: ${trackingId}

${paymentMethod === 'cod' ? '\nNote: Please prepare exact change for the delivery person.' : ''}
${paymentMethod === 'whatsapp' ? '\nNote: Please complete your payment through WhatsApp to process your order.' : ''}

Thank you for shopping with us!
      `,
      html: `
        <h2>Thank you for your order!</h2>
        
        <h3>Order Details:</h3>
        <p><strong>Order ID:</strong> ${newOrder._id}</p>
        <p><strong>Tracking ID:</strong> ${trackingId}</p>
        <p><strong>Payment Method:</strong> ${paymentMethod.toUpperCase()}</p>

        ${paymentMethod === 'cod' ? `
        <h3>Delivery Address:</h3>
        <p>
          <strong>Street:</strong> ${deliveryAddress.street}<br>
          <strong>City:</strong> ${deliveryAddress.city}<br>
          <strong>State:</strong> ${deliveryAddress.state}<br>
          <strong>Phone:</strong> ${deliveryAddress.phoneNumber}
        </p>
        ` : ''}
        
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
            ${orderItemsForEmail.map(item => `
              <tr>
                <td style="padding: 10px; border: 1px solid #dee2e6;">${item.name}</td>
                <td style="padding: 10px; border: 1px solid #dee2e6; text-align: center;">${item.quantity}</td>
                <td style="padding: 10px; border: 1px solid #dee2e6; text-align: right;">$${item.price.toFixed(2)}</td>
                <td style="padding: 10px; border: 1px solid #dee2e6; text-align: right;">$${(item.price * item.quantity).toFixed(2)}</td>
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
        
        ${paymentMethod === 'whatsapp' ? `
          <p>
            <a href="${whatsappLink}" 
               style="background-color: #25D366; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Complete Payment via WhatsApp
            </a>
          </p>
        ` : ''}
        
        <p>Track your order using the tracking ID: <strong>${trackingId}</strong></p>
        
        ${paymentMethod === 'cod' ? '<p><strong>Note:</strong> Please prepare exact change for the delivery person.</p>' : ''}
        ${paymentMethod === 'whatsapp' ? '<p><strong>Note:</strong> Please complete your payment through WhatsApp to process your order.</p>' : ''}
        
        <p>Thank you for shopping with us!</p>
      `
    };

    // Add debug logging
    console.log('Order Items:', orderItemsForEmail);

    // Send the confirmation email
    await transporter.sendMail(mailOptions);

    // Send response based on payment method
    res.status(200).json({
      message: 'Order placed successfully',
      orderId: newOrder._id,
      trackingId,
      paymentIntentId: paymentIntent ? paymentIntent.id : null,
      clientSecret,
      whatsappLink,
      paymentMethod,
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
