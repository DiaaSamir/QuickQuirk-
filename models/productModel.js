const mongoose = require('mongoose');
const slugify = require('slugify');
const productSchema = new mongoose.Schema(
  {
    productName: {
      type: String,
      required: [true, 'A product must have a brand name'],
    },
    category: {
      type: mongoose.Schema.ObjectId,
      ref: 'Category',
    },
    description: {
      type: String,
      required: [true, 'A product must have details'],
    },
    price: {
      type: Number,
      required: [true, 'A product must have price'],
    },
    ratingsAverage: {
      type: Number,
      default: 4.5,
    },
    ratingsQuantity: {
      type: Number,
      default: 0,
    },
    stockQuantity: {
      type: Number,
      default: 0,
    },
    soldNum: {
      type: Number,
      default: 0,
      select: true,
    },
    images: {
      type: [String],
      default: null,
    },
    imageCover: {
      type: String,
      default: null,
    },
    slug: {
      type: String,
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

//Document middleware to slugify the name of the product before saving it
productSchema.pre('save', function (next) {
  if (this.isModified('productName')) {
    this.slug = slugify(this.productName, { lower: true, strict: true });
  }
  next();
});

//Indexing for better perdormance
productSchema.index({ price: 1, ratingsAverage: -1 });

//virtual popualte for reviews
productSchema.virtual('reviews', {
  ref: 'Review',
  foreignField: 'product',
  localField: '_id',
});

//Populating category
productSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'category',
    select: 'cName',
  });
  next();
});

const Product = mongoose.model('Product', productSchema);
module.exports = Product;
