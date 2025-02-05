// routes/cart.routes.js
const express = require('express');
const router = express.Router();

const { authenticateUser } = require('../middlewares/authMiddleware');
const { getCart, addToCart, updateCartItem, removeFromCart } = require('../controllers/cart.controller');

// All cart routes require the user to be authenticated
router.use(authenticateUser);

router.get('/', getCart);
router.post('/add', addToCart);
router.put('/update', updateCartItem); // Pass productId and new quantity in body
router.delete('/remove/:productId', removeFromCart);

module.exports = router;
