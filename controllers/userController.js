var passport = require('passport');

exports.get_regsiter = function(req, res, next) {
    var messages = req.flash('error');
    res.render('frontend/member/register', {
        pageTitle: req.__('Member Register'),
        csrfToken: req.csrfToken(),
        messages: messages,
        hasErrors: messages.length > 0
    });
};

// POST Register
exports.post_regsiter = passport.authenticate('local.regsiter', {
    successRedirect: '/account/profile',
    failureRedirect: '/account/register',
    failureFlash: true
});

// GET Profile
exports.get_profile = function(req, res, next) {
    res.render('frontend/member/dashboard', {
        pageTitle: req.__('Dashboard')
    });
};

// GET Login
exports.get_login = function(req, res, next) {
    var messages = req.flash('error');
    res.render('frontend/member/login', {
        pageTitle: req.__('Member Login'),
        csrfToken: req.csrfToken(),
        messages: messages,
        hasErrors: messages.length > 0
    });
};

exports.get_logout = function(req, res, next) {
    req.logout();
    res.redirect('/');
};

// POST Login
exports.post_login = passport.authenticate('local.login', {
    successRedirect: '/account/profile',
    failureRedirect: '/account/login',
    failureFlash: true
});

// GET Facebook login
exports.get_facebook_login = passport.authenticate('facebook', {
    scope: ['email, public_profile']
});

// GET Facebook login
exports.get_facebook_login_callback = passport.authenticate('facebook', {
    successRedirect: '/account/profile',
    failureRedirect: '/account/register'
});

exports.isLoggedIn = function(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/account/login');
};

exports.notLoggedIn = function(req, res, next) {
    if (!req.isAuthenticated()) {
        return next();
    }
    res.redirect('/account/profile');
};

exports.notLogin_use = function(req, res, next) {
    next();
};