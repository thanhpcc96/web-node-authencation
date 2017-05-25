var express = require('express');
var router = express.Router();
var csrf = require('csurf');

var csrfProtection = csrf();
router.use(csrfProtection);

// Require Controller Module
var userController = require('../controllers/userController');

/* GET Profile */
router.get('/profile', userController.isLoggedIn, userController.get_profile);

/* GET Logout */
router.get('/logout', userController.isLoggedIn, userController.get_logout);

router.use('/', userController.notLogin_use);

/* GET Member Regsiter. */
router.get('/register', userController.notLoggedIn, userController.get_regsiter);

/* POST Member Regsiter */
router.post('/register', userController.post_regsiter);

/* GET Member Login */
router.get('/login', userController.notLoggedIn, userController.get_login);

/* GET Member Login */
router.post('/login', userController.post_login);

/* GET Facebook Login */
router.get('/facebook', userController.get_facebook_login);

/* GET Facebook callback Login  */
router.get('/facebook/callback', userController.get_facebook_login_callback);

module.exports = router;