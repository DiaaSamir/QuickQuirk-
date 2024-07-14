/* eslint-disable no-unused-vars */
const { redisClient } = require('./../redisConfig');
const AddToCart = require('./../models/addToCartModel');
const catchAsync = require('./../utils/catchAsync');
const factory = require('./handlerFactory');

//Admin can control all carts
exports.getCarts = factory.getAll(AddToCart, 'cart');
exports.deleteCart = factory.deleteOne(AddToCart, 'cart');

//.............................................................................................................................................

//User can see his own cart products, he can update a quantity of a specific product, he can delete a product from his cart, he can add product
exports.getMyCart = factory.getMyCartOrReview('cart');

exports.updateProductCartQuantity =
  factory.updateOrRemoveCartProductOrUpdateReview('cart', 'update');

exports.deleteProductFromCart = factory.updateOrRemoveCartProductOrUpdateReview(
  'cart',
  'delete'
);

exports.emptyMyCart = factory.emptyMyCartOrDeleteMyReview('cart');

exports.addProductToCart = catchAsync(async (req, res, next) => {
  const cacheKey = `cart:${req.user.id}`;
  const productId = req.params.productId;
  const newQuantity = req.body.quantity || 1;

  //Get user's cart
  let myCart = await AddToCart.findOne({ user: req.user.id });

  // If the cart does not exist, create a new one
  if (!myCart) {
    myCart = await AddToCart.create({ user: req.user.id, products: [] });
  }

  //Check if the already in user's cart, if yes then increase the quantity of the product in user's cart by th value user provided , if no then add it
  const productIndex = myCart.products.findIndex(
    (item) => item.product.id.toString() === productId
  );

  if (productIndex > -1) {
    // If the product is already in the cart, update the quantity
    myCart.products[productIndex].quantity += parseInt(newQuantity, 10);
  } else {
    // If the product is not in the cart, add it
    myCart.products.push({
      product: productId,
      quantity: parseInt(newQuantity, 10),
    });
  }

  redisClient.del(cacheKey);

  //Save the updated cart
  await myCart.save();

  //Respond to the user
  res.status(200).json({
    status: 'success',
    message: 'Product added successfully',
  });
});
