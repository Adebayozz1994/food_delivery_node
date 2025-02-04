// controllers/user.controller.js
const User = require('../models/User');
const bcrypt = require("bcryptjs");
const nodemailer = require('nodemailer');
require("dotenv").config();
const SECRET = process.env.SECRET;
const jwt = require("jsonwebtoken");

/* --------------------- Helper Functions --------------------- */

// Generate a unique admin ID (for admins only)
const generateUniqueNumber = () => {
  const currentYear = new Date().getFullYear();
  const randomDigits = Math.floor(1000 + Math.random() * 9000);
  return `FOOD/${currentYear}/${randomDigits}`;
};

// Send an email containing the unique admin ID
function sendUniqueNumberToEmail(email, adminId) {
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
        resolve();
      }
    });
  });
}

/* --------------------- Endpoints --------------------- */

// Register (for both users and admins)
// If role is "admin", generate a unique adminId and send it by email.
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

// Login for both users and admins using email and password.
const loginUser = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      console.log("User not found");
      return res.status(404).json({ message: "User not found" });
    }
    bcrypt.compare(password, user.password, (err, match) => {
      if (err) {
        console.log("Error comparing passwords:", err);
        return res.status(500).json({ message: "Internal Server Error" });
      }
      if (!match) {
        console.log("Incorrect password");
        return res.status(401).json({ message: "Incorrect password" });
      } else {
        const token = jwt.sign(
          { id: user._id, role: user.role, email: user.email },
          SECRET,
          { expiresIn: '1h' }
        );
        console.log(`${user.role} signed in successfully`);
        res.json({ message: `${user.role} signed in successfully`, status: true, user, token });
      }
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};


// Verify the provided JWT token.
const verifyToken = (req, res) => {
  const { token } = req.body;
  jwt.verify(token, SECRET, (err, decoded) => {
    if (err) {
      console.error('Token verification failed:', err);
      return res.status(401).json({ message: "Invalid token" });
    }
    res.json({ message: "Token verified successfully", status: true, decoded, token });
  });
};

// Generate a 6-digit OTP.
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP to email (for forgotten password)
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
        resolve();
      }
    });
  });
};

// Forgot password: update the user document with an OTP and send it by email.
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
      res.status(200).json({ message: 'OTP sent to email', status: true, otp });
    } else {
      res.status(404).json({ message: "User not found" });
    }
  } catch (err) {
    res.status(500).json({ message: 'Database error', error: err });
  }
};

// Verify OTP provided by the user.
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

// Update the user's password (after OTP verification).
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
// These endpoints are intended to be used by admins to manage regular users.

// Delete a user by their ID.
const deleteUser = async (req, res) => {
  const { userId } = req.params;
  try {
    const deletedUser = await User.findByIdAndDelete(userId);
    if (!deletedUser)
      return res.status(404).json({ message: "User not found" });
    res.json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting user", error });
  }
};

// Update a user by their ID.
const updateUser = async (req, res) => {
  const { userId } = req.params;
  try {
    const updatedUser = await User.findByIdAndUpdate(userId, req.body, { new: true });
    if (!updatedUser)
      return res.status(404).json({ message: "User not found" });
    res.json({ message: "User updated successfully", user: updatedUser });
  } catch (error) {
    res.status(500).json({ message: "Error updating user", error });
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
  updateUser
};
