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
const getOrderByTracking = async (req, res) => {
  try {
    const { trackingId } = req.params;
    
    const order = await Order.findOne({ trackingId })
      .populate('user', 'firstName lastName email')
      .populate({
        path: 'items.product',
        select: 'name price description image'
      });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.status(200).json({ order });
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ message: 'Error fetching order details', error: error.message });
  }
};

// Update order status
const updateOrderStatus = async (req, res) => {
  try {
    const { trackingId } = req.params;
    const { paymentStatus, orderStatus } = req.body;

    // Validate status values
    const validPaymentStatuses = ['Pending', 'Paid', 'Failed', 'Refunded'];
    const validOrderStatuses = ['Processing', 'Shipped', 'Delivered', 'Cancelled'];

    if (paymentStatus && !validPaymentStatuses.includes(paymentStatus)) {
      return res.status(400).json({ message: 'Invalid payment status' });
    }

    if (orderStatus && !validOrderStatuses.includes(orderStatus)) {
      return res.status(400).json({ message: 'Invalid order status' });
    }

    const updateData = {};
    if (paymentStatus) updateData.paymentStatus = paymentStatus;
    if (orderStatus) updateData.orderStatus = orderStatus;

    const order = await Order.findOneAndUpdate(
      { trackingId },
      updateData,
      { new: true }
    ).populate('user', 'email');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Send email notification
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: order.user.email,
      subject: 'Order Status Update',
      text: `Your order (Tracking ID: ${trackingId}) has been updated:\n
             ${paymentStatus ? `Payment Status: ${paymentStatus}\n` : ''}
             ${orderStatus ? `Order Status: ${orderStatus}` : ''}`
    });

    res.status(200).json({
      message: 'Order updated successfully',
      order
    });
  } catch (error) {
    console.error('Error updating order:', error);
    res.status(500).json({ message: 'Error updating order status', error: error.message });
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
  getOrderByTracking,
  updateOrderStatus
};