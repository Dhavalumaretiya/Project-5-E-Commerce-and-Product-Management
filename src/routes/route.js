const express = require('express');
const router = express.Router();

const userController = require("../controllers/userController");
const productController = require("../controllers/productController");
const cartController = require("../controllers/cartController");
const orderController = require("../controllers/orderController");
const auth = require("../middelware/auth")

// User APIs
router.post('/register', userController.createUser);
router.post('/login', userController.loginUser);
router.get('/user/:userId/profile', auth.authentication,auth.authorization,userController.getUser);
router.put('/user/:userId/profile', auth.authentication,auth.authorization,userController.updateUser);

// Product APIs
router.post('/products', productController.createProduct);    
router.get('/products', productController.getProductsByQuery);  
router.get('/products/:productId', productController.getProductById);   
router.put('/products/:productId', productController.updateProduct);  
router.delete('/products/:productId', productController.deleteProduct);

// Cart APIs
router.post('/users/:userId/cart',auth.authentication,auth.authorization,cartController.createCart); 
router.put('/users/:userId/cart',auth.authentication,auth.authorization,cartController.updateCart); 
router.get('/users/:userId/cart',auth.authentication,auth.authorization,cartController.getCart); 
router.delete('/users/:userId/cart',auth.authentication,auth.authorization,cartController.deleteCart);

// order APIs
router.post('/users/:userId/orders',auth.authentication,auth.authorization,orderController.createOrder); 
router.put('/users/:userId/orders',auth.authentication,auth.authorization,orderController.updateOrder);


module.exports = router;     