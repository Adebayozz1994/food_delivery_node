// controllers/product.controller.js
const Product = require('../models/Product');

// Add a new product
const addProduct = async (req, res) => {
  try {
    const { name, description, price, imageUrl } = req.body;
    const newProduct = new Product({
      name,
      description,
      price,
      imageUrl,
      createdBy: req.user._id, 
    });

    await newProduct.save();
    res.status(201).json({ message: 'Product added successfully', product: newProduct });
  } catch (error) {
    res.status(500).json({ message: 'Error adding product', error });
  }
};

// Get all products
const getProducts = async (req, res) => {
  try {
    const products = await Product.find().populate('createdBy', 'firstName lastName');
    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching products', error });
  }
};

// Update a product
const updateProduct = async (req, res) => {
  const { productId } = req.params;
  try {
    const updatedProduct = await Product.findByIdAndUpdate(productId, req.body, { new: true });
    if (!updatedProduct) return res.status(404).json({ message: 'Product not found' });

    res.status(200).json({ message: 'Product updated successfully', product: updatedProduct });
  } catch (error) {
    res.status(500).json({ message: 'Error updating product', error });
  }
};

// Delete a product
const deleteProduct = async (req, res) => {
  const { productId } = req.params;
  try {
    const deletedProduct = await Product.findByIdAndDelete(productId);
    if (!deletedProduct) return res.status(404).json({ message: 'Product not found' });

    res.status(200).json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting product', error });
  }
};

module.exports = {
  addProduct,
  getProducts,
  updateProduct,
  deleteProduct,
};
