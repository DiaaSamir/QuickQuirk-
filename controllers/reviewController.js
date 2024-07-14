const { redisClient, redisClientSetEx } = require('./../redisConfig');
const Review = require('./../models/reviewModel');
const factory = require('./handlerFactory');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');


//Middlewares:
//Middleware that checks if the user made a review before for the product, if yes then he cant create a new review on this produc else he can make his review
exports.checkIfReviewedBefore = catchAsync(async (req, res, next) => {
  const checkReview = await Review.findOne({
    product: req.params.productId,
    user: req.user.id,
  });
  if (checkReview) {
    return next(
      new AppError('You have already reviewed this product before!', 400)
    );
  }
  next();
});
//Middlware to get the product and user
exports.getProductAndUser = (req, res, next) => {
  if (!req.body.product) req.body.product = req.params.productId;
  if (!req.body.user) req.body.user = req.user.id;
  next();
};

//.....................................................................................

//Get all reviews in a collection(for admins only to control reviews)
exports.getAllReviews = factory.getAll(Review, 'review');

//Create a review for a product
exports.createReview = factory.createOne(Review, 'review');

//Get all reviews for a specific product(this is for nested route)
exports.getProductReviews = factory.getAll(Review, 'review');

//.........................................................................................

//All of thess functions is for users to view all reviews they did and they can update and delete them(users to manage and see their reviews)
exports.getAllMyReviews = catchAsync(async (req, res, next) => {
  const cacheKey = `reviews-users:${req.user.id}`;
  const cachedDocs = await redisClient.get(cacheKey);
  if (cachedDocs) {
    return res.status(200).json({
      status: 'success',
      yourReviews: JSON.parse(cachedDocs).length,
      myReviews: JSON.parse(cachedDocs),
    });
  }
  const myReviews = await Review.find({ user: req.user.id });

  if (!myReviews || myReviews.length === 0) {
    return next(new AppError('You do not have reviews yet!', 400));
  }

  redisClientSetEx(cacheKey, myReviews);

  res.status(200).json({
    status: 'success',
    yourReviews: myReviews.length,
    myReviews,
  });
});

exports.getMyReview = factory.getMyCartOrReview('review');

exports.updateMyReivew =
  factory.updateOrRemoveCartProductOrUpdateReview('review');

exports.deleteMyReview = factory.emptyMyCartOrDeleteMyReview('review');
