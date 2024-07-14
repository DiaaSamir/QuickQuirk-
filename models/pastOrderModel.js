const mongoose = require('mongoose');

const pastOrderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
  },
  products: [
    {
      product: {
        type: mongoose.Schema.ObjectId,
        ref: 'Product',
      },
      quantity: {
        type: Number,
        default: 0,
      },
    },
  ],
  createdAt: {
    type: Date,
    default: new Date(),
  },
});

pastOrderSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'user',
    select: 'name photo',
  }).populate({
    path: 'products.product',
    select: 'productName price',
  });
  next();
});

const PastOrders = mongoose.model('PastOrders', pastOrderSchema);
module.exports = PastOrders;
