// models/Order.js
const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true }
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: [orderItemSchema],
    total: { type: Number, required: true },
    paymentMethod: { type: String, enum: ['whatsapp', 'card', 'cod'], required: true },
    // For card payments we assume immediate processing; for whatsapp and COD, status remains pending.
    paymentStatus: { type: String, enum: ['Pending', 'Processing', 'Completed', 'Failed'], required: true, default: 'Pending' }
  },
  { timestamps: true }
);

const Order = mongoose.model('Order', orderSchema);
module.exports = Order;
