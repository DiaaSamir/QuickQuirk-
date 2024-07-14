const express = require('express');
const authController = require('./../controllers/authController');
const paymentController = require('./../controllers/paymentController');

const router = express.Router();

router
  .route('/')
  .get(
    authController.protect,
    authController.restrictTo('user', 'admin'),
    paymentController.getCheckoutSession,
    paymentController.completePurchase
  );

module.exports = router;
