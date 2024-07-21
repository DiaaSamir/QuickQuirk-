const express = require('express');
const productController = require('./../controllers/productController');
const reviewRouter = require('./reviewRoutes');
const authController = require('./../controllers/authController');

const router = express.Router();

//Nested Route To get and create review on a specific product
router.use('/:productId/reviews', reviewRouter);

router
  .route('/')
  .get(authController.protect, productController.getAllProducts)
  .post(
    authController.protect,
    authController.restrictTo('admin', 'manager'),
    productController.addProduct
  );

router
  .route('/:id')
  .get(
    authController.protect,
    authController.restrictTo('user', 'admin', 'manager'),
    productController.getProduct
  )
  .patch(
    authController.protect,
    authController.restrictTo('manager'),
    productController.uploadProductImages,
    productController.resizeProductImages,
    productController.updateProduct
  )
  .delete(
    authController.protect,
    authController.restrictTo('managers'),
    productController.deleteProduct
  );

module.exports = router;
