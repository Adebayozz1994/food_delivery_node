// models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const URI = process.env.MONGO_URI || "mongodb+srv://Adebayozz:Peterzz1994@cluster0.72sjynx.mongodb.net/food?retryWrites=true&w=majority&appName=Cluster0";


mongoose
  .connect(URI)
  .then(() => console.log("Connected to database successfully"))
  .catch((err) => {
    console.error("Database connection error:", err);
  });

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true },
    lastName: String,
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    // Use role to distinguish between regular users and admins.
    // Allowed values: 'user' (default) and 'admin'
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    // For admins, a unique adminId is generated.
    adminId: { type: String, unique: true, sparse: true },
    otp: { type: String },
    otpExpiration: { type: Date },
  },
  { timestamps: true }
);

// Pre-save hook to hash the password if modified
userSchema.pre("save", function (next) {
  if (!this.isModified("password")) return next();
  bcrypt.hash(this.password, 10, (err, hash) => {
    if (err) return next(err);
    this.password = hash;
    next();
  });
});

const User = mongoose.model("User", userSchema);
module.exports = User;
