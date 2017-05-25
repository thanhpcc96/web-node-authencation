var i18n = require('i18n');

var register = function(Handlebars) {
    var helpers = {
        __: function(req, res) {
            return i18n.__.apply(this, arguments);
        },
        __n: function() {
            return i18n.__n.apply(this, arguments);
        }
    };

    if (Handlebars && typeof Handlebars.registerHelper === "function") {
        for (var prop in helpers) {
            Handlebars.registerHelper(prop, helpers[prop]);
        }
    } else {
        return helpers;
    }
}

module.exports.register = register;
module.exports.helpers = register(null);