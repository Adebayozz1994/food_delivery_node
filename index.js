// index.js
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();
const jwt = require('jsonwebtoken');

const userRoutes = require('./routes/user.routes'); 
const adminRoutes = require('./routes/admin.routes');
const cartRoutes = require('./routes/cart.routes'); 

const app = express();

// Connect to MongoDB (preferably centralize your connection here)
const URI = process.env.MONGO_URI;
mongoose
  .connect(URI)
  .then(() => console.log("Connected to database successfully"))
  .catch((err) => console.error("Database connection error:", err));


app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Mount the unified routes under /api
app.use('/api', userRoutes);  
app.use('/api/admin', adminRoutes); 
app.use('/api/cart', cartRoutes); 

// A sample route to verify the token and fetch user details
app.get('/api/user', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    res.json({
      firstName: decoded.firstName,
      lastName: decoded.lastName,
      email: decoded.email,
    });
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on PORT: ${PORT}`);
});
