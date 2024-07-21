const express = require('express');
const addToController = require('./../controllers/addToCartController');
const authController = require('./../controllers/authController');

const router = express.Router();

//The middleware below apply the protect and restrictto functions to all routes below it
router.use(authController.protect, authController.restrictTo('user'));
router
  .route('/myCart')
  .get(addToController.getMyCart)
  .delete(addToController.emptyMyCart);

router
  .route('/myCart/:productId')
  .patch(addToController.updateProductCartQuantity)
  .post(addToController.addProductToCart)
  .delete(addToController.deleteProductFromCart);

//.........................................................................................................

//Thses routes for admins only
router.use(
  authController.protect,
  authController.restrictTo('admin', 'manager')
);
router.route('/').get(addToController.getCarts);
router.route('/:cartId').delete(addToController.deleteCart);
module.exports = router;
