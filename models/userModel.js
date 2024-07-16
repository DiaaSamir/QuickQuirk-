const mongoose = require('mongoose');
const { isEmail } = require('validator');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    minlength: [5, 'Your name must be more than 5 characters'],
    required: [true, 'A user must have a name'],
  },

  email: {
    type: String,
    required: [true, 'A user must have an email'],
    lowercase: true,
    validate: [isEmail, 'Please enter a valid email'],
  },

  password: {
    type: String,
    required: [true, 'A user must have a password'],
    minlength: [8, 'Your password must be more that 8 characters'],
    select: false,
  },

  passwordConfirm: {
    type: String,
    required: [true, 'Please confirm your password'],
    validator: {
      validate: (value) => {
        return value === this.password;
      },
      message: 'Passwrods are not the same!',
    },
  },

  role: {
    type: String,
    enum: ['user', 'admin', 'guest'],
    default: 'guest',
  },

  photo: {
    type: String,
    default: 'default.jpg',
  },

  passwordChangedAt: Date,

  passwordResetToken: String,

  passwordResetTokenExpires: Date,

  active: {
    type: Boolean,
    default: true,
    select: false,
  },

  lastLoggedIn: {
    type: Date,
    default: Date.now(),
  },
});

//hashing password
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  this.passwordConfirm = undefined;
  next();
});

//If the user changed his password then passwordchangedat changes as well
userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || this.isNew) return next();

  this.passwordChangedAt = Date.now() - 1000;
  next();
});

//query middleare to show only {ative: true} users
userSchema.pre(/^find/, function (next) {
  this.find({ active: true });
  next();
});

//Used to compare passwords
userSchema.methods.comparePasswords = async function (
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

//check if the user changed his password
userSchema.methods.changedPasswordAfter = (JWTTimestamp) => {
  if (this.passwordChangedAt) {
    const changedTimeStamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );
    return JWTTimestamp < changedTimeStamp;
  }

  return false;
};

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  this.passwordResetTokenExpires = Date.now() + 10 * 60 * 1000;

  return resetToken;
};
const User = mongoose.model('User', userSchema);
module.exports = User;
