// routes/cart.routes.js
const express = require('express');
const router = express.Router();

const { authenticateUser } = require('../middlewares/authMiddleware');
const { getCart, addToCart, updateCartItem, removeFromCart, getCartCount } = require('../controllers/cart.controller');

// All cart routes require the user to be authenticated
router.use(authenticateUser);

router.get('/', getCart);
router.post('/add', addToCart);
router.put('/update', updateCartItem); 
router.delete('/remove/:productId', removeFromCart);
router.get('/count', getCartCount);


module.exports = router;
