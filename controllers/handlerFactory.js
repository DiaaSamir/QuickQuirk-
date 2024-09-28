const { redisClient, redisClientSetEx } = require('./../redisConfig');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const APIFeatures = require('./../utils/apiFeatures');
const AddToCart = require('./../models/addToCartModel');
const Review = require('./../models/reviewModel');

exports.deleteOne = (Model, modelName) =>
  catchAsync(async (req, res, next) => {
    const cacheKey = `${modelName}`;
    const doc = await Model.findByIdAndDelete(req.params.id);

    if (!doc) {
      return next(new AppError(`No ${modelName} found with that id!`, 404));
    }

    redisClient.del(cacheKey);
    res.status(200).json({
      status: 'success',
      message: 'Deleted successfully',
      doc,
    });
  });

//.........................................................................................................................................

exports.getOne = (Model, modelName, popOptions) =>
  catchAsync(async (req, res, next) => {
    //Check if the product already in cache
    const cacheKey = `${modelName}`;
    const cachedDoc = await redisClient.get(cacheKey);

    //if it is in the cahce then respond with the product, if not get the product and add it to cache
    if (cachedDoc) {
      return res.status(200).json({
        status: 'success',
        doc: JSON.parse(cachedDoc),
      });
    }

    //Get the product
    let query = await Model.findById(req.params.id);

    //If there any population then populate
    if (popOptions) query = query.populate(popOptions);

    //Get te doc after populaiton
    const doc = await query;

    if (!doc || doc.length === 0) {
      return next(new AppError(`No ${modelName} found wuth that id`, 404));
    }

    //Add the product to cache if it is not there
    redisClientSetEx(cacheKey, doc);

    //Respond with the product
    res.status(200).json({
      status: 'success',
      doc,
    });
  });

//.........................................................................................................................................

/** UpdateOne used in two cases: 
   1)If the admin wants to update product price as example
   2)If the user wants to update his email or name etc

   But user cant update his passowrd here due to security concerns
   Reviews as well can't be updated here
    **/
exports.updateOne = (Model, modelName) =>
  catchAsync(async (req, res, next) => {
    const cacheKey = `${modelName}`;

    //Find doc to be updated and update it
    const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    //If no doc found return the error
    if (!doc) {
      return next(new AppError(`No ${modelName} found with that id`, 404));
    }

    //Invalidate cache for the model
    redisClient.del(cacheKey);

    //Respond to the user
    res.status(200).json({
      status: 'success',
      message: 'Updated successfully',
      doc,
    });
  });

//.........................................................................................................................................

exports.getAll = (Model, modelName) =>
  catchAsync(async (req, res, next) => {
    let cacheKey = `${modelName}`;
    let cachedDocs;

    //If the enterede model name is review then assign `reviews:${req.params.productId}` to cache key and search in cache if there any cached docs(this is used when the user requests to see reviews on a specific product)
    if (modelName === 'review') {
      cacheKey = `reviews:${req.params.productId}`;
      cachedDocs = await redisClient.get(cacheKey);
    }
    //if the entered model is (products) as an example then search in cache for products
    else {
      cachedDocs = await redisClient.get(cacheKey);
    }

    //if there any cached docs in one of these cases then return cached products without using db
    if (cachedDocs) {
      return res.status(200).json({
        status: 'success',
        results: JSON.parse(cachedDocs).length,
        docs: JSON.parse(cachedDocs),
      });
    }

    // To allow for nested GET reviews on product (hack)
    let filter = {};
    if (req.params.productId) {
      filter = { product: req.params.productId };
    }

    //Apply features for the query
    const features = new APIFeatures(Model.find(filter), req.query)
      .filter()
      .sort()
      .limitFields()
      .paginate();

    //Get docs after features applied
    const docs = await features.query;

    //If there are no docs found then return error
    if (!docs) {
      return next(new AppError(`No ${modelName} found`, 404));
    }

    //If found then assign the key and values in cache(If there were any cached docs this line wouldnt be executed)
    redisClientSetEx(cacheKey, docs);

    //Respond to the user
    res.status(200).json({
      status: 'success',
      results: docs.length,
      docs,
    });
  });

//.........................................................................................................................................

exports.createOne = (Model, modelName) =>
  catchAsync(async (req, res, next) => {
    //Create
    const doc = await Model.create(req.body);

    //If there any creation errors, return error
    if (!doc) {
      return next(
        new AppError(
          `Failed to create that ${modelName}. Please try again later!`,
          400
        )
      );
    }

    /**if the model name entered is review then invalidate cache of:
     1) Reviews on products ----> to update products cache with new reviews
     2) Get My Reviews Cache ----> to update the cache when the user add new review on a product
     3) Get(one) Review cache ----> To update the cache when the user update or delete (one) of his reviews
     * **/
    if (modelName === 'review') {
      const cacheKey = `reviews:${doc.product}`;
      const userReviewsCache = `reviews-users:${req.user.id}`;
      const getMyReviewcache = `${modelName}:${req.params.id}-${req.user.id}`;
      redisClient.del(cacheKey);
      redisClient.del(userReviewsCache);
      redisClient.del(getMyReviewcache);
    }
    //if the entered model name is anything except review (ex: products) then ivalidate cache key of products
    else {
      const cacheKey = `${modelName}`;
      redisClient.del(cacheKey);
    }

    res.status(200).json({
      status: 'success',
      message: 'Created successfully',
      doc,
    });
  });
//.........................................................................................................................................

//User can get his cart or specific review he made
exports.getMyCartOrReview = (modelName) =>
  catchAsync(async (req, res, next) => {
    //set cache key to `${modelName}:${req.user.id}` as default, but it will change if model name is review
    let cachekey = `${modelName}:${req.user.id}`;
    let cachedDocs;
    let doc;
    let message;

    //if the model name passed is cart then find user's cart and respond
    if (modelName === 'cart') {
      message = 'Found Your cart successfully';
      //If the model name passed is cart then search in cache for this cache key, if found return values in cache, if not assign the value to cache
      cachedDocs = await redisClient.get(cachekey);
      if (cachedDocs) {
        return res.status(200).json({
          status: 'success',
          message,
          doc: JSON.parse(cachedDocs),
        });
      }

      //if there are no cached docs get docs from database
      doc = await AddToCart.findOne({
        user: req.user.id,
      });

      if (!doc || doc.products.length === 0) {
        return next(
          new AppError('You have no items in your cart, go add some :)', 404)
        );
      }

      //if the model name passed is review, then get user's review and respond
    } else if (modelName === 'review') {
      message = 'Found your review successfully';

      //If the model name is review modify cachekey and search if it is found in cached docs
      cachekey = `${modelName}:${req.params.id}-${req.user.id}`;
      cachedDocs = await redisClient.get(cachekey);
      if (cachedDocs) {
        return res.status(200).json({
          status: 'success',
          message,
          doc: JSON.parse(cachedDocs),
        });
      }

      //if it is not found in cached docs search in database
      doc = await Review.findOne({
        user: req.user.id,
        _id: req.params.id,
      });

      if (!doc) {
        return next(new AppError('You have no reivew with that id', 404));
      }

      //if the model name entered is invalid(not cart or review), then return an error
    } else {
      return next(new AppError('Invalid model name', 400));
    }

    //set the cahce key and value to redis cache
    redisClientSetEx(cachekey, doc);

    //Respond to the user
    res.status(200).json({
      status: 'success',
      message,
      doc,
    });
  });
//.........................................................................................................................................

exports.updateOrRemoveCartProductOrUpdateReview = (
  modelName,
  cartOperationType
) =>
  catchAsync(async (req, res, next) => {
    let cacheKey;
    let doc;
    let message;

    // If the entered model name is cart
    if (modelName === 'cart') {
      // Assign the cache key to the model and id of the user
      cacheKey = `${modelName}:${req.user.id}`;

      // Get product id and the new quantity for modification
      const productId = req.params.productId;
      const newQuantity = req.body.quantity;

      // Get user's cart
      doc = await AddToCart.findOne({ user: req.user.id }).exec(); // Ensure to call exec() to avoid cached queries

      // Check if the cart is empty
      if (!doc || !doc.products || doc.products.length === 0) {
        return next(new AppError('You have no items in your cart!', 404));
      }

      // Get the index of the product user wants to update
      const productIndex = doc.products.findIndex((item) =>
        item.product.equals(productId)
      );

      // If the product does not exist
      if (productIndex === -1) {
        return next(new AppError('No product found with that id!', 404));
      }

      // If the user wants to update
      if (cartOperationType === 'update') {
        // Update the product's quantity
        doc.products[productIndex].quantity = newQuantity;
        message = 'Product quantity updated successfully';
      }

      // If the user wants to delete
      if (cartOperationType === 'delete') {
        // Delete the product if found
        doc.products.splice(productIndex, 1);
        message = 'Product deleted successfully';
      }

      // Save the cart after modification
      await doc.save(); // Await the save operation to ensure it's completed

      // Invalidate user's cart
      redisClient.del(cacheKey);

      // If the entered model name is review
    } else if (modelName === 'review') {
      // Assign the cache key
      cacheKey = `${modelName}:${req.params.id}-${req.user.id}`;

      // Get the review to be updated and update it
      try {
        doc = await Review.findOneAndUpdate(
          { _id: req.params.id, user: req.user.id },
          { review: req.body.review, rating: req.body.rating },
          { new: true, runValidators: true }
        );
      } catch (error) {
        console.log(error);
      } // Use exec() to ensure a fresh query

      // If the review not found return the error
      if (!doc) {
        return next(new AppError('No review found with that id!', 404));
      }

      // Invalidate user's review cache
      redisClient.del(cacheKey);
      message = 'Updated your review!';

      // If the entered model name is invalid (not review or cart), return error
    } else {
      return next(new AppError('Invalid model name or cartOperationType', 400));
    }

    // Respond to the user
    res.status(200).json({
      status: 'success',
      message,
      doc,
    });
  });

//.........................................................................................................................................

//Here the user can empty his cart(delete all products in his cart) , also he can delete one of his reviews
exports.emptyMyCartOrDeleteMyReview = (modelName) =>
  catchAsync(async (req, res, next) => {
    let cacheKey;
    let doc;

    //if the entered model name is cart
    if (modelName === 'cart') {
      //assign the cache key to the model and id of the user
      cacheKey = `${modelName}:${req.user.id}`;

      //Get user's cart
      doc = await AddToCart.findOne({ user: req.user.id });

      //Check if the cart is already empty
      if (!doc || !doc.products || doc.products.length === 0) {
        return next(
          new AppError(
            'You already have no items in your cart, Go add some :)',
            404
          )
        );
      }

      //Empty the cart if there are products
      doc.products = [];

      //Save the cart
      await doc.save();

      //Invalidate cache of user's cart
      redisClient.del(cacheKey);
    } //if the entered model name is review
    else if (modelName === 'review') {
      //assign cache key to user's review
      cacheKey = `${modelName}:${req.params.id}-${req.user.id}`;

      //Get the revciew and delete it
      doc = await Review.findOneAndDelete({
        user: req.user.id,
        _id: req.params.id,
      });

      //If no review found return the error
      if (!doc) {
        return next(new AppError('No review found with that id', 404));
      }

      //Invalidate user's review in cache
      redisClient.del(cacheKey);
    } else {
      return next(new AppError('Invalid model name', 400));
    }

    //Respond to the user
    res.status(200).json({
      status: 'success',
      message: 'Deleted successfully',
    });
  });
