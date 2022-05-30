const express = require('express');
const router = express.Router();

const userController = require("../controllers/userController");
const productController = require("../controllers/productController");
const cartController = require("../controllers/cartController");
const auth = require("../middelware/auth")

// User APIs
router.post('/register', userController.createUser);
router.post('/login', userController.loginUser);
router.get('/user/:userId/profile', auth.auth,userController.getUser);
router.put('/user/:userId/profile', auth.auth,userController.updateUser);

// Product APIs
router.post('/products', productController.createProduct);  
router.get('/products', productController.getProductsByQuery);  
router.get('/products/:productId', productController.getProductById);  
router.put('/products/:productId', productController.updateProduct);  
router.delete('/products/:productId', productController.deleteProduct);

// Cart APIs
router.post('/users/:userId/cart',cartController.createCart); 

module.exports = router;    