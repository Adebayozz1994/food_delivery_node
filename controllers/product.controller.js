// controllers/product.controller.js
const Product = require('../models/product');

// Add a new product
const addProduct = async (req, res) => {
  try {
    const { name, description, price, imageUrl, category } = req.body;
    
    if (!category) {
      return res.status(400).json({ 
        message: 'Category is required' 
      });
    }

    const newProduct = new Product({
      name,
      description,
      price,
      imageUrl,
      category,
      createdBy: req.user._id,
    });

    await newProduct.save();
    res.status(201).json({ 
      success: true,
      message: 'Product added successfully', 
      product: newProduct 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Error adding product', 
      error: error.message 
    });
  }
};

// Get all products
const getProducts = async (req, res) => {
  try {
    const { category } = req.query;
    let query = {};

    // If category is provided, filter by category
    if (category) {
      query.category = category;
    }

    const products = await Product.find(query)
      .populate('createdBy', 'firstName lastName')
      .sort({ createdAt: -1 }); // Sort by newest first

    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Error fetching products', 
      error: error.message 
    });
  }
};

// Get products by category
const getProductsByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const products = await Product.find({ 
      category,
      isAvailable: true 
    }).populate('createdBy', 'firstName lastName');

    res.status(200).json({
      success: true,
      products
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Error fetching products by category', 
      error: error.message 
    });
  }
};

// Update a product
const updateProduct = async (req, res) => {
  const { productId } = req.params;
  try {
    const updatedProduct = await Product.findByIdAndUpdate(
      productId, 
      req.body, 
      { new: true }
    ).populate('createdBy', 'firstName lastName');

    if (!updatedProduct) {
      return res.status(404).json({ 
        success: false,
        message: 'Product not found' 
      });
    }

    res.status(200).json({ 
      success: true,
      message: 'Product updated successfully', 
      product: updatedProduct 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Error updating product', 
      error: error.message 
    });
  }
};

// Delete a product
const deleteProduct = async (req, res) => {
  const { productId } = req.params;
  try {
    const deletedProduct = await Product.findByIdAndDelete(productId);
    
    if (!deletedProduct) {
      return res.status(404).json({ 
        success: false,
        message: 'Product not found' 
      });
    }

    res.status(200).json({ 
      success: true,
      message: 'Product deleted successfully' 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Error deleting product', 
      error: error.message 
    });
  }
};

// Toggle product availability
const toggleProductAvailability = async (req, res) => {
  const { productId } = req.params;
  try {
    const product = await Product.findById(productId);
    
    if (!product) {
      return res.status(404).json({ 
        success: false,
        message: 'Product not found' 
      });
    }

    product.isAvailable = !product.isAvailable;
    await product.save();

    res.status(200).json({ 
      success: true,
      message: `Product is now ${product.isAvailable ? 'available' : 'unavailable'}`,
      product 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Error toggling product availability', 
      error: error.message 
    });
  }
};

module.exports = {
  addProduct,
  getProducts,
  getProductsByCategory,
  updateProduct,
  deleteProduct,
  toggleProductAvailability
};
