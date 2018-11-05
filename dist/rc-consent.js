(function(rcc) {
    "use strict";
    if (rcc.hasInitialised) {
        return;
    }
    var utils = {
        escapeRegExp: function(str) {
            return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
        },
        hasClass: function(element, selector) {
            var s = " ";
            return element.nodeType === 1 && (s + element.className + s).replace(/[\n\t]/g, s).indexOf(s + selector + s) >= 0;
        },
        addClass: function(element, className) {
            element.className += " " + className;
        },
        removeClass: function(element, className) {
            var regex = new RegExp("\\b" + this.escapeRegExp(className) + "\\b");
            element.className = element.className.replace(regex, "");
        },
        interpolateString: function(str, callback) {
            var marker = /{{([a-z][a-z0-9\-_]*)}}/gi;
            return str.replace(marker, function(matches) {
                return callback(arguments[1]) || "";
            });
        },
        getCookie: function(name) {
            var value = "; " + document.cookie;
            var parts = value.split("; " + name + "=");
            value = parts.length < 2 ? undefined : parts.pop().split(";").shift();
            try {
                var val_obj = JSON.parse(decodeURIComponent(value));
                value = val_obj;
            } catch (e) {}
            return value;
        },
        setCookie: function(name, value, expiryDays, domain, path, secure) {
            var exdate = new Date();
            exdate.setDate(exdate.getDate() + (expiryDays || 365));
            if (this.isPlainObject(value)) {
                value = JSON.stringify(value);
            }
            value = encodeURIComponent(value);
            var cookie = [ name + "=" + value, "expires=" + exdate.toUTCString(), "path=" + (path || "/") ];
            if (domain) {
                cookie.push("domain=" + domain);
            }
            if (secure) {
                cookie.push("secure");
            }
            document.cookie = cookie.join(";");
        },
        deepExtend: function(target, source) {
            for (var prop in source) {
                if (source.hasOwnProperty(prop)) {
                    if (prop in target && this.isPlainObject(target[prop]) && this.isPlainObject(source[prop])) {
                        this.deepExtend(target[prop], source[prop]);
                    } else {
                        target[prop] = source[prop];
                    }
                }
            }
            return target;
        },
        throttle: function(callback, limit) {
            var wait = false;
            return function() {
                if (!wait) {
                    callback.apply(this, arguments);
                    wait = true;
                    setTimeout(function() {
                        wait = false;
                    }, limit);
                }
            };
        },
        hash: function(str) {
            var hash = 0, i, chr, len;
            if (str.length === 0) {
                return hash;
            }
            for (i = 0, len = str.length; i < len; ++i) {
                chr = str.charCodeAt(i);
                hash = (hash << 5) - hash + chr;
                hash |= 0;
            }
            return hash & 268435455;
        },
        normaliseHex: function(hex) {
            if (hex[0] === "#") {
                hex = hex.substr(1);
            }
            if (hex.length === 3) {
                hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
            }
            return hex;
        },
        getContrast: function(hex) {
            hex = this.normaliseHex(hex);
            var r = parseInt(hex.substr(0, 2), 16);
            var g = parseInt(hex.substr(2, 2), 16);
            var b = parseInt(hex.substr(4, 2), 16);
            var yiq = (r * 299 + g * 587 + b * 114) / 1e3;
            return yiq >= 128 ? "#000" : "#fff";
        },
        getLuminance: function(hex) {
            var num = parseInt(this.normaliseHex(hex), 16), amt = 38, R = (num >> 16) + amt, B = (num >> 8 & 255) + amt, G = (num & 255) + amt;
            var newColour = (16777216 + (R < 255 ? R < 1 ? 0 : R : 255) * 65536 + (B < 255 ? B < 1 ? 0 : B : 255) * 256 + (G < 255 ? G < 1 ? 0 : G : 255)).toString(16).slice(1);
            return "#" + newColour;
        },
        isMobile: function() {
            return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        },
        isPlainObject: function(obj) {
            return typeof obj === "object" && obj !== null && obj.constructor === Object;
        },
        traverseDOMPath: function(elem, className) {
            if (!elem || !elem.parentNode) {
                return null;
            }
            if (util.hasClass(elem, className)) {
                return elem;
            }
            return this.traverseDOMPath(elem.parentNode, className);
        }
    };
    var providers = [];
    var cacheStatus = {};
    var defaultProvider = {
        id: null,
        trackingId: null,
        category: "analytics",
        onInitialise: function(rcc, status) {},
        onAllow: function(rcc) {},
        onRevoke: function(rcc) {},
        onStatusChange: function(rcc, new_status, old_status) {}
    };
    var defaultOptions = {
        cookie: {
            name: "rcc_consent",
            domain: "",
            path: "/",
            days: 7
        },
        categories: [ "analytics" ]
    };
    var setConsent = function(event, args) {
        if (!args && event.type === "submit") {
            rcc.setConsent(event.target);
        } else {
            rcc.setConsent(args);
        }
    };
    function mergeDefaultStatus(target, source) {
        if (utils.isPlainObject(source)) {
            for (var prop in target) {
                if (target.hasOwnProperty(prop)) {
                    if (source[prop] === true || source[prop] === false) {
                        target[prop] = source[prop];
                    }
                }
            }
        }
        return target;
    }
    rcc = {
        initialise: function(options) {
            utils.deepExtend(this.options = {}, defaultOptions);
            if (utils.isPlainObject(options)) {
                utils.deepExtend(this.options, options);
            }
            window.document.addEventListener("rccSetConsent", setConsent);
            var categories = [];
            var category;
            if (utils.isPlainObject(this.options.defaultStatus)) {
                categories = Object.keys(this.options.defaultStatus);
            }
            for (var i_cat = 0; i_cat < providers.length; i_cat++) {
                category = providers[i_cat].category || "analytics";
                if (categories.indexOf(category) === -1) {
                    categories.push(category);
                }
                if (this.options.categories.indexOf(category) >= 0) {
                    this.options.categories.splice(this.options.categories.indexOf(category), 1);
                }
            }
            this.options.categories = categories.concat(this.options.categories);
            var status = this.getStatus();
            for (var i = 0; i < providers.length; i++) {
                category = providers[i].category;
                providers[i].onInitialise.call(providers[i], this, status);
                if (category && status[category] === true) {
                    providers[i].onAllow.call(providers[i], this);
                }
            }
            cacheStatus = status;
        },
        addProvider: function(options) {
            if (!options.id || options.id === "") {
                return false;
            }
            var provider = {};
            utils.deepExtend(provider, defaultProvider);
            if (utils.isPlainObject(options)) {
                utils.deepExtend(provider, options);
            }
            providers.push(provider);
            return true;
        },
        getProviders: function() {
            return providers;
        },
        setConsent: function(args) {
            if (!!(args instanceof Element || args instanceof HTMLDocument)) {
                var element = args;
                var elems_input = element.querySelectorAll("input[name]");
                args = undefined;
                if (elems_input.length) {
                    args = {};
                    for (var i_el = 0; i_el < elems_input.length; i_el++) {
                        if (elems_input[i_el].type === "checkbox" && rcc.options.categories.indexOf(elems_input[i_el].name) >= 0) {
                            args[elems_input[i_el].name] = elems_input[i_el].checked;
                        }
                    }
                }
            }
            var current_consented = this.hasConsented();
            this.setStatus(args);
            var status = this.getStatus();
            var is_status_change = false;
            if (JSON.stringify(status) !== JSON.stringify(cacheStatus)) {
                is_status_change = true;
            }
            for (var i = 0; i < providers.length; i++) {
                var category = providers[i].category;
                if (is_status_change) {
                    providers[i].onStatusChange.call(providers[i], this, status, cacheStatus);
                }
                if (!current_consented || status[category] !== cacheStatus[category]) {
                    if (!status[category]) {
                        providers[i].onRevoke.call(providers[i], this);
                    } else {
                        providers[i].onAllow.call(providers[i], this);
                    }
                }
            }
            cacheStatus = status;
        },
        getStatus: function() {
            var cookie = rcc.options.cookie;
            var curent_value = utils.getCookie(cookie.name);
            var value_hash = utils.getCookie(cookie.name + "_hash");
            var value = this.getDefaultStatus();
            mergeDefaultStatus(value, curent_value);
            if (JSON.stringify(curent_value) !== JSON.stringify(value)) {
                utils.setCookie(cookie.name, value, 0, cookie.domain, cookie.path);
            }
            if (value_hash !== utils.hash(JSON.stringify(value))) {
                utils.setCookie(this.options.cookie.name + "_hash", "", -1, cookie.domain, cookie.path);
            }
            return value;
        },
        setStatus: function(value) {
            var cookie = this.options.cookie;
            var default_value = this.getDefaultStatus();
            if (!utils.isPlainObject(value)) {
                value = utils.getCookie(cookie.name);
            }
            value = mergeDefaultStatus(default_value, value);
            var cookie_hash = utils.hash(JSON.stringify(value));
            utils.setCookie(cookie.name, value, 0, cookie.domain, cookie.path);
            utils.setCookie(cookie.name + "_hash", cookie_hash, cookie.days, cookie.domain, cookie.path);
        },
        clearStatus: function() {
            var cookie = this.options.cookie;
            utils.setCookie(cookie.name, "", -1, cookie.domain, cookie.path);
            utils.setCookie(cookie.name + "_hash", "", -1, cookie.domain, cookie.path);
            cacheStatus = this.getDefaultStatus();
        },
        getDefaultStatus: function() {
            var default_value = utils.isPlainObject(this.options.defaultStatus) ? this.options.defaultStatus : {};
            var status = {};
            for (var i = 0; i < this.options.categories.length; i++) {
                var cat_status = default_value[this.options.categories[i]];
                status[this.options.categories[i]] = cat_status === true ? true : false;
            }
            return status;
        },
        hasConsented: function(category) {
            var status = this.getStatus();
            var value_hash = utils.getCookie(this.options.cookie.name + "_hash");
            if (!value_hash) {
                return false;
            } else if (!category || category === "") {
                return true;
            }
            return !!status[category];
        },
        setForm: function(element) {
            if (!!(element instanceof Element || element instanceof HTMLDocument)) {
                var status = this.getStatus();
                var elems_input = element.querySelectorAll("input[name]");
                if (elems_input.length) {
                    for (var i = 0; i < elems_input.length; i++) {
                        if (elems_input[i].type === "checkbox" && rcc.options.categories.indexOf(elems_input[i].name) >= 0) {
                            elems_input[i].checked = status[elems_input[i].name] === true ? true : false;
                        }
                    }
                }
            }
        },
        destroy: function() {
            window.document.removeEventListener("rccSetConsent", setConsent);
        }
    };
    rcc.hasInitialised = true;
    window.rcc = rcc;
})(window.rcc || {});
//# sourceMappingURL=rc-consent.js.map
