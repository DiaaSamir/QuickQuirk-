const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');

const PastOrders = require('./../models/pastOrderModel');
const AddToCart = require('./../models/addToCartModel');
const Product = require('./../models/productModel');

exports.getCheckoutSession = catchAsync(async (req, res, next) => {
  // Get the cart
  const cart = await AddToCart.findOne({ user: req.user.id });

  //Check if cart is empty
  if (!cart || cart.products.length === 0) {
    return next(new AppError('You have no items in your cart', 400));
  }

  // Create a Checkout Session
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    success_url: `${req.protocol}://${req.get('host')}/?success=true`,
    cancel_url: `${req.protocol}://${req.get('host')}/?cancel=true`,
    customer_email: req.user.email,
    client_reference_id: req.user.id,
    mode: 'payment',
    line_items: cart.products.map((el) => ({
      price_data: {
        currency: 'usd',
        product_data: {
          name: el.product.productName,
          description: el.product.description,
        },
        unit_amount: el.product.price * 100, // Assuming price is in dollars
      },
      quantity: el.quantity,
    })),
  });

  // Update the soldNum and stockQuantity for each product in the cart
  for (let el of cart.products) {
    let product = await Product.findById(el.product._id);
    product.soldNum += el.quantity;
    product.stockQuantity -= el.quantity;
    await product.save({ validateBeforeSave: false });
  }

  res.status(200).json({
    status: 'success',
    session,
  });
  next();
});

//This function is used to empty the user's cart after payment and adds purchased products to his past orders
exports.completePurchase = catchAsync(async (req, res, next) => {
  //Get user's cart
  const cart = await AddToCart.findOne({ user: req.user.id });

  //Check if the cart is empty
  if (!cart || cart.products.length === 0) {
    return next(new AppError('Your cart is empty! ', 404));
  }
  // Create a new order with the products from the cart
  const order = await PastOrders.create({
    user: req.user.id,
    products: cart.products,
  });
  //Empty the cart of the user
  cart.products = [];
  await cart.save();

  //Respond to the user
  res.status(200).json({
    status: 'success',
    order,
  });
  next();
});
