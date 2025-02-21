const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
  street: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  phoneNumber: { type: String, required: true }
});

const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true }
  },
  { _id: true }
);

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: [orderItemSchema],
    total: { type: Number, required: true },
    paymentMethod: { type: String, enum: ['whatsapp', 'card', 'cod'], required: true },
    paymentStatus: { type: String, enum: ['Pending', 'Processing', 'Completed', 'Failed'], required: true, default: 'Pending' },
    orderStatus: {
      type: String,
      enum: ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'],
      default: 'Pending'
    },
    deliveryAddress: { type: addressSchema, required: function() { 
      return this.paymentMethod === 'cod'; 
    }},
    paymentIntentId: { type: String, required: true },
    stripePaymentIntentId: { type: String },
    trackingId: { type: String, required: true, unique: true }
  },
  { timestamps: true }
);

const Order = mongoose.model('Order', orderSchema);
module.exports = Order;
