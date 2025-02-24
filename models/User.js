// models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');


const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true },
    lastName: String,
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    // Role to distinguish between regular users and admins.
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    // For admins, a unique adminId is generated.
    adminId: { type: String, unique: true, sparse: true },
    otp: { type: String },
    otpExpiration: { type: Date },
    resetPasswordToken: String,
    resetPasswordExpire: Date,
  },
  { timestamps: true }
);

// Pre-save hook to hash the password if modified (using async/await)
userSchema.pre("save", async function(next) {
  if (!this.isModified("password")) return next();
  try {
    const hash = await bcrypt.hash(this.password, 10);
    this.password = hash;
    next();
  } catch (err) {
    next(err);
  }
});

const User = mongoose.model("User", userSchema);
module.exports = User;
