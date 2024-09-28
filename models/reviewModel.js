const mongoose = require('mongoose');
const Product = require('./productModel');

const reviewSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Review must belong to a user'],
    },
    product: {
      type: mongoose.Schema.ObjectId,
      ref: 'Product',
      required: [true, 'Review must belong to a product'],
    },
    review: {
      type: String,
      required: [true, 'Please provide your review'],
    },
    rating: {
      type: Number,
      max: 5,
      min: 1,
      required: [true, 'Please provide your rating'],
    },
    createdAt: {
      type: Date,
      default: new Date(),
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Static method to calculate average ratings
reviewSchema.statics.calcAvgRatings = async function (productId) {
  const stats = await this.aggregate([
    {
      $match: { product: productId },
    },
    {
      $group: {
        _id: '$product',
        nRating: { $sum: 1 },
        avgRating: { $avg: '$rating' },
      },
    },
  ]);
  if (stats.length > 0) {
    await Product.findByIdAndUpdate(productId, {
      ratingsQuantity: stats[0].nRating,
      ratingsAverage: stats[0].avgRating,
    });
  } else {
    await Product.findByIdAndUpdate(productId, {
      ratingsQuantity: 0,
      ratingsAverage: 4.5,
    });
  }
};

// Middleware to update average rating after saving a review
reviewSchema.post('save', function () {
  this.constructor.calcAvgRatings(this.product);
});

// Use a different approach for findOneAndUpdate hooks
reviewSchema.post(/^findOneAnd/, async function (doc) {
  // `doc` contains the document after the update
  if (doc) {
    await doc.constructor.calcAvgRatings(doc.product);
  }
});

// Pre-query middleware to populate user information
reviewSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'user',
    select: 'name photo',
  });
  next();
});

const Review = mongoose.model('Review', reviewSchema);
module.exports = Review;
