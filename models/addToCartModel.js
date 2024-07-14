const mongoose = require('mongoose');

const addToCartSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'Add To Cart must belong to a user'],
  },
  products: [
    {
      product: {
        type: mongoose.Schema.ObjectId,
        ref: 'Product',
      },
      quantity: {
        type: Number,
        required: [true, 'You must choose quantity'],
        default: 1,
      },
    },
  ],
});

//Query middleware to populate user and products
addToCartSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'user',
    select: 'name photo',
  }).populate({
    path: 'products.product',
    select: 'productName category price',
  });
  next();
});

const AddToCart = mongoose.model('AddToCart', addToCartSchema);
module.exports = AddToCart;
