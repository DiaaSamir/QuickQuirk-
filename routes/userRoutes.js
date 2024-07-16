const express = require('express');
const authController = require('./../controllers/authController');
const userController = require('./../controllers/userController');

const router = express.Router();

router.post('/signup', authController.signup);
router.post('/login', authController.login);

router.post('/forgotPassword', authController.forgotPassword);
router.patch('/resetPassword/:token', authController.resetPassword);

//These routes for admins only
router.use(authController.protect, authController.restrictTo('admin'));
router.route('/').get(userController.getAllUsers);
router
  .route('/:userId')
  .get(userController.getUser)
  .post(userController.updateUser)
  .delete(userController.deleteUser);

//.................................................................................

//User can control his profile from these routes

router.use(authController.protect, authController.restrictTo('user', 'admin'));

router
  .route('/myAccount')
  .get(userController.getMe, userController.getUser)
  .delete(userController.deleteMe)
  .patch(
    userController.uploadUserPhoto,
    userController.resizeUserPhoto,
    userController.updateMe
  );
router.route('/updateMyPassword').post(authController.updateMyPassword);

module.exports = router;
