var validator = require('express-validator');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var FacebookStrategy = require('passport-facebook');

var settings = require('../config/settings');
var User = require('../models/User');
var cfgAuth = require('./auth');

var provider = null;

passport.serializeUser(function(user, done) {
    done(null, user._id);
});

passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user) {

        var newUser = user.toObject();
        newUser['provider'] = provider;
        done(err, newUser);
    });
});

// Passport register
passport.use('local.regsiter', new LocalStrategy({
    usernameField: 'email', // Tên của input dùng đăng nhập
    passwordField: 'password', // tên của input mật khẩu
    passReqToCallback: true
}, function(req, email, password, done) {
    // Validator các input từ trang đăng ký
    req.checkBody('firstname', req.__('Please input first name.')).notEmpty();
    req.checkBody('lastname', req.__('Please input last name.')).notEmpty();
    req.checkBody('email', req.__('Email address invalid, please check again.')).notEmpty().isEmail();
    req.checkBody('password', req.__('Password invalid, password must be at least %d characters or more', settings.passwordLength)).notEmpty().isLength({
        min: settings.passwordLength
    });
    req.checkBody('password', req.__('Confirm password is not the same, please check again.')).equals(req.body.confirmpassword);
    req.checkBody('accept', req.__('You have to accept with our terms to continute.')).equals("1");

    var errors = req.validationErrors();
    if (errors) {
        var messages = [];
        errors.forEach(function(error) {
            messages.push(error.msg);
        });
        return done(null, false, req.flash('error', messages));
    }

    User.findOne({
        'local.email': email
    }, function(err, user) {
        if (err) {
            return done(err);
        }
        if (user) {
            return done(null, false, {
                message: req.__('Email address used, please enter another email.')
            });
        }
        var newUser = new User();
        newUser.info.firstname = req.body.firstname;
        newUser.info.lastname = req.body.lastname;
        newUser.local.email = req.body.email;
        newUser.local.password = newUser.encryptPassword(req.body.password);
        newUser.newsletter = req.body.newsletter;
        newUser.roles = 'MEMBER';
        // Nếu yêu cầu kích hoạt tài khoản qua email thì trạng thái tài khoản là INACTIVE
        newUser.status = (settings.confirmRegister == 1) ? 'INACTIVE' : 'ACTIVE';

        newUser.save(function(err, result) {
            if (err) {
                return done(err);
            } else {
                // Nếu yêu cầu kích hoạt tài khoản qua email thì chỉ đăng ký mà không tự động đăng nhập
                if (settings.confirmRegister == 1) {
                    return done(null, newUser);
                } else {
                    // Tự động đăng nhập cho thành viên mới đăng ký khi không yêu cầu kích hoạt tài khoản qua email
                    req.logIn(newUser, function(err) {
                        provider = 'local';
                        return done(err, newUser);
                    });
                }
            }
        });
    });
}));

// Passport Login
passport.use('local.login', new LocalStrategy({
    usernameField: 'email', // Tên của input dùng đăng nhập
    passwordField: 'password', // tên của input mật khẩu
    passReqToCallback: true
}, function(req, email, password, done) {
    req.checkBody('email', req.__('Invalid email address, please try again.')).notEmpty().isEmail();
    req.checkBody('password', req.__('Incorrect password, please try again.')).notEmpty();

    var errors = req.validationErrors();

    if (errors) {
        var messages = [];
        errors.forEach(function(error) {
            messages.push(error.msg);
        });
        return done(null, false, req.flash('error', messages));
    }

    // Check member input
    User.findOne({
        'local.email': email
    }, function(err, user) {
        if (err) {
            return done(err);
        }

        if (!user) {
            return done(null, false, {
                message: req.__('Account not found!')
            });
        }

        if (!user.validPassword(password)) {
            return done(null, false, {
                message: req.__('Password incorrect, please try again.')
            });
        };

        if (user.isInActivated(user.status)) {
            return done(null, false, {
                message: req.__('Your account is Inactive')
            });
        }

        if (user.isSuspended(user.status)) {
            return done(null, false, {
                message: req.__('Your account is Suspended')
            });
        }

        provider = "local";
        return done(null, user);

    });

}));

// Passport Facebook Login
passport.use(new FacebookStrategy({
    clientID: cfgAuth.facebookAuth.clientID,
    clientSecret: cfgAuth.facebookAuth.clientSecret,
    callbackURL: cfgAuth.facebookAuth.callbackURL,
    profileFields: cfgAuth.facebookAuth.profileFields,
    passReqToCallback: true
}, function(req, token, refreshTonken, profile, done) {

    // Check exist account
    User.findOne({
        'facebook.id': profile.id
    }, function(err, user) {
        if (err) {
            return done(err);
        }

        if (user) {
            provider = "facebook";
            return done(null, user);
        } else {
            // Link facebook to local account
            User.findOne({
                'local.email': profile.emails[0].value
            }, function(err, user) {

                if (err) {
                    return done(err);
                }

                if (user) {
                    // Update exist account
                    User.findOneAndUpdate({
                        'local.email': profile.emails[0].value
                    }, {
                        'facebook.id': profile.id,
                        'facebook.token': token,
                        'facebook.email': profile.emails[0].value,
                        'facebook.name': profile._json.first_name + ' ' + profile._json.last_name,
                        'facebook.photo': 'https://graph.facebook.com/v2.9/' + profile.id + '/picture?type=large'
                    }, {
                        new: true
                    }, function(err, user) {
                        if (err) {
                            return done(err);
                        }
                        provider = "facebook";
                        return done(null, user);
                    });
                } else {
                    // add new account with facebook info
                    var newUser = new User();
                    newUser.facebook.id = profile.id;
                    newUser.facebook.token = token;
                    newUser.facebook.email = profile.emails[0].value;
                    newUser.facebook.name = profile._json.first_name + ' ' + profile._json.last_name;
                    newUser.facebook.photo = 'https://graph.facebook.com/v2.9/' + profile.id + '/picture?type=large';
                    newUser.facebook.roles = "MEMBER";
                    newUser.facebook.status = "ACTIVE";
                    newUser.save(function(err) {
                        if (err) {
                            return done(err);
                        }
                        provider = "facebook";
                        return done(null, newUser);
                    });
                }
            });
        }
    });
}));