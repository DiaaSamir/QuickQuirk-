const { redisClient, redisClientSetEx } = require('./../redisConfig');
const PastOrders = require('./../models/pastOrderModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

exports.getMyPastOrders = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const cacheKey = `pastOrders : ${userId}`;
  const cachedDocs = await redisClient.get(cacheKey);
  if (cachedDocs) {
    return res.status(200).json({
      status: 'success',
      orders: JSON.parse(cachedDocs),
    });
  }
  const orders = await PastOrders.findOne({ user: userId });
  if (!orders || orders.products.length === 0) {
    return next(new AppError('You have not purchased any items yet!', 404));
  }

  redisClientSetEx(cacheKey, JSON.stringify(orders));
  res.status(200).json({
    status: 'success',
    orders,
  });
});
