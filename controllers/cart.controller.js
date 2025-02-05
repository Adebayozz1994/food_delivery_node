// controllers/cart.controller.js
const Cart = require('../models/Cart');
const Product = require('../models/Product');

// Get the current user's cart
const getCart = async (req, res) => {
  try {
    let cart = await Cart.findOne({ user: req.user._id }).populate('items.product', 'name price imageUrl');
    if (!cart) {
      // If the user has no cart, create one
      cart = new Cart({ user: req.user._id, items: [] });
      await cart.save();
    }
    res.status(200).json(cart);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching cart', error });
  }
};

// Add a product to the cart (or update quantity if already exists)
const addToCart = async (req, res) => {
  const { productId, quantity } = req.body;
  try {
    // Validate that product exists
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    let cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      cart = new Cart({ user: req.user._id, items: [] });
    }

    // Check if product already exists in cart
    const itemIndex = cart.items.findIndex(item => item.product.toString() === productId);
    if (itemIndex > -1) {
      // Update the quantity
      cart.items[itemIndex].quantity += quantity;
    } else {
      // Add new item to cart
      cart.items.push({ product: productId, quantity });
    }
    await cart.save();
    res.status(200).json({ message: 'Product added to cart successfully', cart });
  } catch (error) {
    res.status(500).json({ message: 'Error adding to cart', error });
  }
};

// Update a cart item's quantity
const updateCartItem = async (req, res) => {
  const { productId, quantity } = req.body;
  try {
    let cart = await Cart.findOne({ user: req.user._id });
    if (!cart) return res.status(404).json({ message: 'Cart not found' });

    const itemIndex = cart.items.findIndex(item => item.product.toString() === productId);
    if (itemIndex === -1) return res.status(404).json({ message: 'Product not in cart' });

    // If quantity is 0 or less, remove the item
    if (quantity <= 0) {
      cart.items.splice(itemIndex, 1);
    } else {
      cart.items[itemIndex].quantity = quantity;
    }
    await cart.save();
    res.status(200).json({ message: 'Cart updated successfully', cart });
  } catch (error) {
    res.status(500).json({ message: 'Error updating cart', error });
  }
};

// Remove an item from the cart
const removeFromCart = async (req, res) => {
  const { productId } = req.params;
  try {
    let cart = await Cart.findOne({ user: req.user._id });
    if (!cart) return res.status(404).json({ message: 'Cart not found' });

    cart.items = cart.items.filter(item => item.product.toString() !== productId);
    await cart.save();
    res.status(200).json({ message: 'Item removed from cart', cart });
  } catch (error) {
    res.status(500).json({ message: 'Error removing item from cart', error });
  }
};

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
};
