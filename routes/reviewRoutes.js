const express = require('express');
const reviewController = require('./../controllers/reviewController');
const authController = require('./../controllers/authController');

const router = express.Router({ mergeParams: true });

//For mounting routes of products , user can get all product reviews , .getAllReviews is used by admins only , and then user can create a review on a specific product
router.use(authController.protect, authController.restrictTo('admin', 'user'));
router
  .route('/')
  .get(reviewController.getProductReviews)
  .post(
    reviewController.getProductAndUser,
    reviewController.checkIfReviewedBefore,
    reviewController.createReview
  );

//..........................................................................................................................................................

//These routes for a user so he can get all his own reviews only , he can get a specific review  , he can update that review and he can delete it as well

router
  .route('/myReviews')
  .get(authController.protect, reviewController.getAllMyReviews);

router
  .route('/myReviews/:id')
  .get(authController.protect, reviewController.getMyReview)
  .patch(authController.protect, reviewController.updateMyReivew)
  .delete(authController.protect, reviewController.deleteMyReview);

//This is used by admins to get all reviews found
router.get(
  authController.protect,
  authController.restrictTo('admin'),
  reviewController.getAllReviews
);
module.exports = router;
