const express = require('express');
const addToController = require('./../controllers/addToCartController');
const authController = require('./../controllers/authController');

const router = express.Router();

//The middleware below apply the protect and restrictto functions to all routes below it
// router.use(authController.protect, authController.restrictTo('user'));
router
  .route('/myCart')
  .get(
    authController.protect,
    authController.restrictTo('user'),
    addToController.getMyCart
  )
  .delete(
    authController.protect,
    authController.restrictTo('user'),
    addToController.emptyMyCart
  );

router
  .route('/myCart/:productId')
  .patch(
    authController.protect,
    authController.restrictTo('user'),
    addToController.updateProductCartQuantity
  )
  .post(
    authController.protect,
    authController.restrictTo('user'),
    addToController.addProductToCart
  )
  .delete(
    authController.protect,
    authController.restrictTo('user'),
    addToController.deleteProductFromCart
  );

//.........................................................................................................

//Thses routes for admins and managers only

router
  .route('/')
  .get(
    authController.protect,
    authController.restrictTo('admin', 'manager'),
    addToController.getCarts
  );
router
  .route('/:cartId')
  .delete(
    authController.protect,
    authController.restrictTo('admin', 'manager'),
    addToController.deleteCart
  );
module.exports = router;
