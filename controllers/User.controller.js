const User = require('../models/User');
const Order = require('../models/order');
const bcrypt = require("bcryptjs");
const nodemailer = require('nodemailer');
require("dotenv").config();
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;

/* --------------------- Helper Functions --------------------- */

// Generate a unique admin ID (for admins only)
const generateUniqueNumber = () => {
  const currentYear = new Date().getFullYear();
  const randomDigits = Math.floor(1000 + Math.random() * 9000);
  return `FOOD/${currentYear}/${randomDigits}`;
};

// Send an email containing the unique admin ID
const sendUniqueNumberToEmail = (email, adminId) => {
  return new Promise((resolve, reject) => {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER, 
        pass: process.env.EMAIL_PASS 
      }
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'FOOD Admin Registration',
      text: `Your unique admin ID is: ${adminId}`
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        reject(error);
      } else {
        resolve(info);
      }
    });
  });
};

// Email configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Helper function to send order status email
const sendOrderStatusEmail = async (email, orderStatus, trackingId, items) => {
  // Create a formatted items list for the email
  const itemsList = items.map(item => 
    `${item.product.name} x ${item.quantity} - $${(item.product.price * item.quantity).toFixed(2)}`
  ).join('\n');

  const statusMessages = {
    'Processing': 'Your order is now being processed.',
    'Shipped': 'Great news! Your order has been shipped.',
    'Delivered': 'Your order has been delivered successfully.',
    'Cancelled': 'Your order has been cancelled.'
  };

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: `Order Status Update - ${orderStatus}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Order Status Update</h2>
        <p style="color: #666;">Hello,</p>
        <p style="color: #666;">${statusMessages[orderStatus] || `Your order status has been updated to ${orderStatus}`}</p>
        
        <div style="background-color: #f8f9fa; padding: 15px; margin: 20px 0; border-radius: 5px;">
          <p style="margin: 5px 0;"><strong>Order Status:</strong> ${orderStatus}</p>
          <p style="margin: 5px 0;"><strong>Tracking ID:</strong> ${trackingId}</p>
        </div>

        <div style="margin: 20px 0;">
          <h3 style="color: #333;">Order Items:</h3>
          <pre style="background-color: #f8f9fa; padding: 15px; border-radius: 5px;">${itemsList}</pre>
        </div>

        <p style="color: #666;">You can track your order using the tracking ID above.</p>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #888; font-size: 12px;">
          <p>This is an automated message, please do not reply to this email.</p>
        </div>
      </div>
    `
  };

  return new Promise((resolve, reject) => {
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('Email error:', error);
        reject(error);
      } else {
        console.log('Email sent:', info.response);
        resolve(info);
      }
    });
  });
};

/* --------------------- Endpoints --------------------- */

// Register (for both users and admins)
const registerUser = async (req, res) => {
  try {
    const { firstName, lastName, email, password, role } = req.body;
    const newUser = new User({ firstName, lastName, email, password, role });

    if (role === 'admin') {
      const adminId = generateUniqueNumber();
      newUser.adminId = adminId;
      await sendUniqueNumberToEmail(email, adminId);
    }
    
    await newUser.save();
    res.status(201).json({ message: `${role} registered successfully`, status: 200 });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ message: "Internal Server Error", error });
  }
};

// Login for both users and admins
const loginUser = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ message: "Incorrect password" });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role, email: user.email, firstName: user.firstName, lastName: user.lastName },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({ message: `${user.role} signed in successfully`, status: true, user, token });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Verify Token
const verifyToken = (req, res) => {
  const { token } = req.body;
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: "Invalid token" });
    }
    res.json({ message: "Token verified successfully", status: true, decoded, token });
  });
};

// Generate OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP to email
const sendOTPToEmail = (email, otp) => {
  return new Promise((resolve, reject) => {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'FOOD Forgotten Password OTP',
      text: `Your one time password (OTP) is: ${otp}\nThis OTP is valid for 30 minutes. Please do not share this OTP with anyone.`
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        reject(error);
      } else {
        resolve(info);
      }
    });
  });
};

// Forgot Password
const forgotPassword = async (req, res) => {
  const { email } = req.body;
  const otp = generateOTP();
  const expirationTime = new Date(Date.now() + 30 * 60 * 1000);
  try {
    const user = await User.findOneAndUpdate(
      { email },
      { otp, otpExpiration: expirationTime },
      { new: true }
    );

    if (user) {
      await sendOTPToEmail(email, otp);
      res.status(200).json({ message: 'OTP sent to email', status: true });
    } else {
      res.status(404).json({ message: "User not found" });
    }
  } catch (err) {
    res.status(500).json({ message: 'Database error', error: err });
  }
};

// Verify OTP
const verifyOTP = async (req, res) => {
  const { email, otp } = req.body;
  try {
    const user = await User.findOne({ email, otp });
    if (user && user.otpExpiration > new Date()) {
      res.status(200).json({ message: 'OTP verified successfully', status: true });
    } else {
      res.status(400).json({ message: 'Invalid or expired OTP', status: false });
    }
  } catch (error) {
    res.status(500).json({ message: 'Database error', error });
  }
};

// Create New Password
const createNewPassword = async (req, res) => {
  const { email, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.findOneAndUpdate(
      { email },
      { password: hashedPassword },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: "User not found", status: false });
    } else {
      res.status(200).json({ message: "Password updated successfully", status: true });
    }
  } catch (error) {
    console.error("Error updating password:", error);
    res.status(500).json({ message: "Internal Server Error", error });
  }
};

/* --------------------- Admin-Control Functions --------------------- */

// Fetch all users
const getUsers = async (req, res) => {
  try {
    const users = await User.find();
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: "Error fetching users", error });
  }
};

// Delete user
const deleteUser = async (req, res) => {
  const { userId } = req.params;
  try {
    const deletedUser = await User.findByIdAndDelete(userId);
    if (!deletedUser) return res.status(404).json({ message: "User not found" });
    res.json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting user", error });
  }
};

// Update user
const updateUser = async (req, res) => {
  const { userId } = req.params;
  try {
    const updatedUser = await User.findByIdAndUpdate(userId, req.body, { new: true });
    if (!updatedUser) return res.status(404).json({ message: "User not found" });
    res.json({ message: "User updated successfully", user: updatedUser });
  } catch (error) {
    res.status(500).json({ message: "Error updating user", error });
  }
};

/* --------------------- Order Tracking Functions --------------------- */

// Get order by tracking ID
// Get all orders
const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('user', 'firstName lastName email')
      .populate('items.product', 'name price image')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: {
        orders,
        count: orders.length
      }
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching orders',
      error: error.message
    });
  }
};

// Update order status and payment status with email notification
const updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { orderStatus, paymentStatus } = req.body;

    // Validate order status
    const validOrderStatuses = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];
    if (orderStatus && !validOrderStatuses.includes(orderStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order status'
      });
    }

    // Validate payment status
    const validPaymentStatuses = ['Pending', 'Paid', 'Failed', 'Refunded'];
    if (paymentStatus && !validPaymentStatuses.includes(paymentStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment status'
      });
    }

    // Build update object
    const updateData = {
      updatedAt: new Date()
    };
    if (orderStatus) updateData.orderStatus = orderStatus;
    if (paymentStatus) updateData.paymentStatus = paymentStatus;

    const order = await Order.findByIdAndUpdate(
      orderId,
      updateData,
      { new: true }
    )
    .populate('user', 'firstName lastName email')
    .populate('items.product', 'name price image');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Send email notification
    try {
      // Customize email based on what was updated
      let emailSubject = '';
      let statusMessage = '';

      if (orderStatus && paymentStatus) {
        emailSubject = `Order and Payment Status Update`;
        statusMessage = `Your order status has been updated to ${orderStatus} and payment status to ${paymentStatus}`;
      } else if (orderStatus) {
        emailSubject = `Order Status Update - ${orderStatus}`;
        statusMessage = getOrderStatusMessage(orderStatus);
      } else if (paymentStatus) {
        emailSubject = `Payment Status Update - ${paymentStatus}`;
        statusMessage = getPaymentStatusMessage(paymentStatus);
      }

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: order.user.email,
        subject: emailSubject,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Status Update</h2>
            <p style="color: #666;">Hello ${order.user.firstName},</p>
            <p style="color: #666;">${statusMessage}</p>
            
            <div style="background-color: #f8f9fa; padding: 15px; margin: 20px 0; border-radius: 5px;">
              ${orderStatus ? `<p style="margin: 5px 0;"><strong>Order Status:</strong> ${orderStatus}</p>` : ''}
              ${paymentStatus ? `<p style="margin: 5px 0;"><strong>Payment Status:</strong> ${paymentStatus}</p>` : ''}
              <p style="margin: 5px 0;"><strong>Tracking ID:</strong> ${order.trackingId}</p>
              <p style="margin: 5px 0;"><strong>Order Total:</strong> $${order.total.toFixed(2)}</p>
            </div>

            <div style="margin: 20px 0;">
              <h3 style="color: #333;">Order Items:</h3>
              <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px;">
                ${order.items.map(item => `
                  <div style="margin-bottom: 10px;">
                    <span>${item.product.name} x ${item.quantity}</span>
                    <span style="float: right;">$${(item.product.price * item.quantity).toFixed(2)}</span>
                  </div>
                `).join('')}
              </div>
            </div>

            <p style="color: #666;">You can track your order using the tracking ID above.</p>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #888; font-size: 12px;">
              <p>This is an automated message, please do not reply to this email.</p>
            </div>
          </div>
        `
      };

      await transporter.sendMail(mailOptions);

    } catch (emailError) {
      console.error('Failed to send email notification:', emailError);
      // Continue with the response even if email fails
    }

    res.status(200).json({
      success: true,
      data: {
        order
      },
      message: 'Order updated and notification sent'
    });

  } catch (error) {
    console.error('Error updating order:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating order',
      error: error.message
    });
  }
};

// Helper functions for status messages
const getOrderStatusMessage = (status) => {
  const messages = {
    'Processing': 'Your order is now being processed.',
    'Shipped': 'Great news! Your order has been shipped.',
    'Delivered': 'Your order has been delivered successfully.',
    'Cancelled': 'Your order has been cancelled.',
    'Pending': 'Your order is pending processing.'
  };
  return messages[status] || `Your order status has been updated to ${status}`;
};

const getPaymentStatusMessage = (status) => {
  const messages = {
    'Paid': 'Your payment has been successfully processed.',
    'Pending': 'Your payment is pending confirmation.',
    'Failed': 'Your payment has failed. Please contact support.',
    'Refunded': 'Your payment has been refunded.'
  };
  return messages[status] || `Your payment status has been updated to ${status}`;
};

// Get order by tracking ID
const getOrderByTracking = async (req, res) => {
  try {
    const { trackingId } = req.params;
    
    const order = await Order.findOne({ trackingId })
      .populate('user', 'firstName lastName email')
      .populate('items.product', 'name price image');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        order
      }
    });
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching order',
      error: error.message
    });
  }
};

// Get order statistics
const getOrderStats = async (req, res) => {
  try {
    const totalOrders = await Order.countDocuments();
    const totalRevenue = await Order.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: "$total" }
        }
      }
    ]);

    const ordersByStatus = await Order.aggregate([
      {
        $group: {
          _id: "$orderStatus",
          count: { $sum: 1 }
        }
      }
    ]);

    const ordersByPaymentMethod = await Order.aggregate([
      {
        $group: {
          _id: "$paymentMethod",
          count: { $sum: 1 }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalOrders,
        totalRevenue: totalRevenue[0]?.total || 0,
        ordersByStatus: ordersByStatus.reduce((acc, curr) => {
          acc[curr._id] = curr.count;
          return acc;
        }, {}),
        ordersByPaymentMethod: ordersByPaymentMethod.reduce((acc, curr) => {
          acc[curr._id] = curr.count;
          return acc;
        }, {})
      }
    });
  } catch (error) {
    console.error('Error fetching order stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching order statistics',
      error: error.message
    });
  }
};

module.exports = {
  registerUser,
  loginUser,
  verifyToken,
  forgotPassword,
  verifyOTP,
  createNewPassword,
  deleteUser,
  updateUser,
  getUsers,
  getAllOrders,         // Add this
  updateOrderStatus,    // Add this
  getOrderByTracking,   // Add this
  getOrderStats 
};