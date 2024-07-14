const express = require('express');
const authController = require('./../controllers/authController');
const pastOrdersController = require('./../controllers/pastOrderControllers');

const router = express.Router();

router
  .route('/')
  .get(
    authController.protect,
    authController.restrictTo('user', 'admin'),
    pastOrdersController.getMyPastOrders
  );

module.exports = router;
