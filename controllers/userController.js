const User = require('./../models/userModel');
const AppError = require('./../utils/appError');
const catchAsync = require('./../utils/catchAsync');
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

//For filtering fields
const filterObj = (obj, ...allowdFields) => {
  const newObj = {};

  Object.keys(obj).map((el) => {
    if (allowdFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};

//These functions is for admins only
exports.getAllUsers = factory.getAll(User, 'user');

exports.getUser = factory.getOne(User, 'user');

exports.deleteUser = factory.deleteOne(User, 'user');
exports.updateUser = factory.updateOne(User, 'user');

//............................................................................................................................

//Operations for the user

// exports.uploadSinglePhoto = upload.single('photo');

// exports.resizeUserPhoto = catchAsync(async (req, res, next) => {
//   if (!req.file) {
//     return next();
//   }

//   //uploading image cover

//   req.file.filename = `${req.user.name}-${
//     req.user.id
//   }-${Date.now()}-photo.jpeg`;

//   await sharp(req.file.buffer)
//     .resize(500, 500)
//     .toFormat('jpeg')
//     .jpeg({ quality: 90 })
//     .toFile(`public/img/users/${req.file.filename}`);

//   next();
// });

exports.updateMe = catchAsync(async (req, res, next) => {
  console.log(req.file);
  console.log(req.body);
  //DO NOT let the user update his password here
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(
        'You are not allowed to update your password here, please use /updatePassword instead!',
        400
      )
    );
  }

  //Filter and limit fields the user can update(ex : he can't update his(role) to admin)

  const filteredBody = filterObj(req.body, 'name', 'email');
  if (req.file) {
    filteredBody.photo = req.file.originalname;
  }

  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true,
    runValidators: true,
  });

  if (!updatedUser) {
    return next(new AppError('User not found!', 404));
  }
  res.status(200).json({
    status: 'success',
    message: 'Updated Successfully',
    updatedUser,
  });
});

exports.deleteMe = catchAsync(async (req, res, next) => {
  //Find the user
  const user = await User.findByIdAndUpdate(req.user.id, { active: false });

  //check if user not found
  if (!user) {
    return next(new AppError('User not found', 404));
  }

  //Send the response
  res.status(200).json({
    status: 'success',
    message: 'Your account has been deactivated successfully',
  });
});

//Middleware to get the user
exports.getMe = (req, res, next) => {
  req.params.id = req.user.id;
  next();
};
