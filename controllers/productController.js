const Product = require('./../models/productModel');
const factory = require('./handlerFactory');


//For files upload
// const multerStorage = multer.memoryStorage();
// const multerFilter = (req, file, cb) => {
//   if (file.mimetype.startsWith('image')) {
//     cb(null, true);
//   } else {
//     cb(new AppError('Not an image!...Please upload an image', 400), false);
//   }
// };
// const upload = multer({
//   storage: multerStorage,
//   fileFilter: multerFilter,
// });

// exports.uploadProductImages = upload.fields([
//   {
//     name: 'imageCover',
//     maxCount: 1,
//   },
//   {
//     name: 'images',
//     maxCount: 5,
//   },
// ]);

// exports.resizeImgs = (modelName) =>
//   catchAsync(async (req, res, next) => {
//     if (!req.files) return next();

//     //uploading image cover
//     if (req.files.imageCover) {
//       req.body.imageCover = `${req.user.name}-${modelName}-${
//         req.params.id
//       }-${Date.now()}-cover.jpeg`;

//       await sharp(req.files.imageCover[0].buffer)
//         .resize(2000, 1333)
//         .toFormat('jpeg')
//         .jpeg({ quality: 90 })
//         .toFile(`public/img/${modelName}/${req.body.imageCover}`);
//     }

//     //uploadimg images
//     req.body.images = [];

//     if (req.files.images) {
//       await Promise.all(
//         req.files.images.map(async (file, i) => {
//           const filename = `${req.user.name}-${modelName}-${
//             req.params.id
//           }-${Date.now()}-${i + 1}.jpeg`;

//           await sharp(req.files.images[i].buffer)
//             .resize(2000, 1333)
//             .toFormat('jpeg')
//             .jpeg({ quality: 90 })
//             .toFile(`public/img/${modelName}/${filename}`);

//           req.body.images.push(filename);
//         })
//       );
//     }
//     next();
//   });

//................................................................................

exports.getAllProducts = factory.getAll(Product, 'products');
exports.getProduct = factory.getOne(Product, 'products', [{ path: 'reviews' }]);

//................................................................................

//These functions for admins only so they can add,update,delete products
exports.addProduct = factory.createOne(Product, 'products');
exports.updateProduct = factory.updateOne(Product, 'products');
exports.deleteProduct = factory.deleteOne(Product, 'products');
