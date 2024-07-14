/* eslint-disable no-unused-vars */
const express = require('express');
const { promisify } = require('util');
const User = require('./../models/userModel');
const jwt = require('jsonwebtoken');
const AppError = require('./../utils/appError');
const catchAsync = require('./../utils/catchAsync');
const Email = require('./../utils/email');
const crypto = require('crypto');

//issue a token for the user
const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

//.........................................................................................................................................

//Assign cookie options
const cookieOptions = {
  expires: new Date(
    Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
  ),
  secure: true,
  httpOnly: true,
};

//Create the token to user's id and respond to the user with the token
const createSendToken = (user, statusCode, res) => {
  //sign the token
  const token = signToken(user._id);

  //create cookie
  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;
  res.cookie('jwt', token, cookieOptions);

  //Hide the user's password from postman output
  user.password = undefined;
  //Send the respones to user
  res.status(statusCode).json({
    status: 'success',
    token,
    user: user,
  });
};

//.........................................................................................................................................

exports.signup = catchAsync(async (req, res, next) => {
  // Get informantion of the new user and save it in db
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    role: req.body.role,
  });
  //Create the token and respond to user
  createSendToken(newUser, 201, res);
});

//.........................................................................................................................................

exports.login = catchAsync(async (req, res, next) => {
  //check if the email an password exists
  const { email, password } = req.body;
  if (!email || !password) {
    return new AppError('Please provide email and password', 400);
  }
  //check if the user exists and chech if the password is correct
  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.comparePasswords(password, user.password))) {
    return new AppError('Email or password is incorrect', 400);
  }
  //Sign the token and respond to user and update last logged in
  user.lastLoggedIn = new Date();
  user.active = true;
  await user.save({ validateBeforeSave: false });
  createSendToken(user, 200, res);
});

//.........................................................................................................................................

/**
 Protect is used to ensure that the user is logged in, check if the token is valid, make sure that the user still exists and to check that the user didn't
 change his password then send (req.user) which we can use in future operations to het user's id as an example
 */
exports.protect = catchAsync(async (req, res, next) => {
  let token;
  //1)get the token and check if its there
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) {
    return new AppError(
      'You are not logged in! Please login to get access',
      401
    );
  }
  //2)Token verification
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  //3) Check if the user still exists
  const freshUser = await User.findById(decoded.id);
  if (!freshUser) {
    return new AppError(
      'The user belonging to this token does no longer exist!',
      401
    );
  }
  //4)Check if the user has changed his password
  if (freshUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError(
        'This user has changed his password please log in again!',
        401
      )
    );
  }
  //5)Grant access to the user
  req.user = freshUser;
  next();
});

//.........................................................................................................................................

/**
 Restrict to is used to secure private routes, so the user can't operate as an admin and vice versa 
 */
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action', 403)
      );
    }
    next();
  };
};

//.........................................................................................................................................

/*
Forgot password is used by user so he can get a token sent to his email and he can use this token to reset his password
 */
exports.forgotPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on POSTed email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError('There is no user with email address.', 404));
  }

  // 2) Generate the random reset token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  // 3) Send it to user's email

  try {
    const resetURL = `${req.protocol}://${req.get(
      'host'
    )}/api/v1/users/resetPassword/${resetToken}`;
    await new Email(user, resetURL).sendPasswordReset();

    res.status(200).json({
      status: 'success',
      message: 'Token sent to email!',
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetTokenExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(
      new AppError('There was an error sending the email. Try again later!'),
      500
    );
  }
});

//.........................................................................................................................................

/*
Reset password is used to get user based on token sent to his email and compare it with his (ResetPasswordToken) stored in db 
*/
exports.resetPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on the token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetTokenExpires: { $gt: Date.now() },
  });

  // 2) If token has not expired, and there is user, set the new password
  if (!user) {
    return next(new AppError('Token is invalid or has expired', 400));
  }
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetTokenExpires = undefined;
  await user.save();

  // 3) Update changedPasswordAt property for the user
  user.passwordChangedAt = Date.now();
  // 4) Log the user in, send JWT
  createSendToken(user, 200, res);
});

//.........................................................................................................................................

/**
 User can use this function to update his password
 */
exports.updateMyPassword = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id).select('+password');
  if (!user.comparePassword(user.password, req.body.passwordCurrent)) {
    return next(new AppError('You entered a wrong password try again!', 400));
  }
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();

  createSendToken(user, 200, res);
});
