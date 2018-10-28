(function(rcc) {
    "use strict";

    //Prevent run twice
    if (rcc.hasInitialised) return;

    var utils = {
        // https://stackoverflow.com/questions/3446170/escape-string-for-use-in-javascript-regex
        escapeRegExp: function(str) {
            return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');
        },
        hasClass: function(element, selector) {
            var s = ' ';
            return (
                element.nodeType === 1 &&
                (s + element.className + s)
                    .replace(/[\n\t]/g, s)
                    .indexOf(s + selector + s) >= 0
            );
        },
        addClass: function(element, className) {
            element.className += ' ' + className;
        },
        removeClass: function(element, className) {
            var regex = new RegExp('\\b' + this.escapeRegExp(className) + '\\b');
            element.className = element.className.replace(regex, '');
        },
        interpolateString: function(str, callback) {
            var marker = /{{([a-z][a-z0-9\-_]*)}}/gi;
            return str.replace(marker, function(matches) {
                return callback(arguments[1]) || '';
            });
        },
        getCookie: function(name) {
            var value = '; ' + document.cookie;
            var parts = value.split('; ' + name + '=');

            value = parts.length < 2
                ? undefined
                : parts
                    .pop()
                    .split(';')
                    .shift();

            value = decodeURIComponent(value);

            try {
                value = JSON.parse(decodeURIComponent(value));
            }
            catch (e) {}

            return value;
        },
        setCookie: function(name, value, expiryDays, domain, path, secure) {
            var exdate = new Date();
            exdate.setDate(exdate.getDate() + (expiryDays || 365));

            value = encodeURIComponent(JSON.stringify(value));

            var cookie = [
                name + '=' + value,
                'expires=' + exdate.toUTCString(),
                'path=' + (path || '/')
            ];

            if (domain) {
                cookie.push('domain=' + domain);
            }
            if (secure) {
                cookie.push('secure');
            }

            document.cookie = cookie.join(';');
        },
        // only used for extending the initial options
        deepExtend: function(target, source) {
            for (var prop in source) {
                if (source.hasOwnProperty(prop)) {
                    if (
                        prop in target &&
                        this.isPlainObject(target[prop]) &&
                        this.isPlainObject(source[prop])
                    ) {
                        this.deepExtend(target[prop], source[prop]);
                    } else {
                        target[prop] = source[prop];
                    }
                }
            }
            return target;
        },
        // only used for throttling the 'mousemove' event (used for animating the revoke button when `animateRevokable` is true)
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
        // only used for hashing json objects (used for hash mapping palette objects, used when custom colours are passed through JavaScript)
        hash: function(str) {
            var hash = 0,
                i,
                chr,
                len;
            if (str.length === 0) return hash;
            for (i = 0, len = str.length; i < len; ++i) {
                chr = str.charCodeAt(i);
                hash = (hash << 5) - hash + chr;
                hash |= 0;
            }
            return hash;
        },
        normaliseHex: function(hex) {
            if (hex[0] == '#') {
                hex = hex.substr(1);
            }
            if (hex.length == 3) {
                hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
            }
            return hex;
        },
        // used to get text colors if not set
        getContrast: function(hex) {
            hex = this.normaliseHex(hex);
            var r = parseInt(hex.substr(0, 2), 16);
            var g = parseInt(hex.substr(2, 2), 16);
            var b = parseInt(hex.substr(4, 2), 16);
            var yiq = (r * 299 + g * 587 + b * 114) / 1000;
            return yiq >= 128 ? '#000' : '#fff';
        },
        // used to change color on highlight
        getLuminance: function(hex) {
            var num = parseInt(this.normaliseHex(hex), 16),
                amt = 38,
                R = (num >> 16) + amt,
                B = ((num >> 8) & 0x00ff) + amt,
                G = (num & 0x0000ff) + amt;
            var newColour = (
                0x1000000 +
                (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
                (B < 255 ? (B < 1 ? 0 : B) : 255) * 0x100 +
                (G < 255 ? (G < 1 ? 0 : G) : 255)
            )
                .toString(16)
                .slice(1);
            return '#' + newColour;
        },
        isMobile: function() {
            return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
                navigator.userAgent
            );
        },
        isPlainObject: function(obj) {
            // The code "typeof obj === 'object' && obj !== null" allows Array objects
            return (
                typeof obj === 'object' && obj !== null && obj.constructor == Object
            );
        },
        traverseDOMPath: function(elem, className) {
            if (!elem || !elem.parentNode) return null;
            if (util.hasClass(elem, className)) return elem;

            return this.traverseDOMPath(elem.parentNode, className);
        }
    };

    var providers = [];
    var defaultProvider = {
        category: 'analytics',
        onInitialise: function(status) {},
        onAllow: function(category) {}
    };

    var defaultOptions = {
        cookieName: 'rcc_consent',
        categories: [
            'required',
            'analytics',
            'marketing'
        ]
    };


    rcc = {
        initialise: function(options) {

            utils.deepExtend((rcc.options = {}), defaultOptions);

            if (utils.isPlainObject(options)) {
                utils.deepExtend(rcc.options, options);
            }

            var status = rcc.getStatus();

            for (var i = 0; i < providers.length; i++) {

                providers[i].onInitialise.bind(this, status)();

                var category = providers[i].category;

                if (status[category]) {
                    providers[i].onAllow.bind(this, category)();
                }
            }

            console.log(providers);
        },
        addProvider: function (options) {

            var provider = {};

            utils.deepExtend(provider, defaultProvider);

            if (utils.isPlainObject(options)) {
                utils.deepExtend(provider, options);
            }

            providers.push(provider);
        },
        getProviders: function() {
            return providers;
        },
        getStatus: function() {

            return utils.getCookie(rcc.options.cookieName) || {};
        },
        hasConsented: function ( category ) {

            var status = this.getStatus();

            return !!status[category];
        }
    };

    //Event Listner for confirm
    window.document.addEventListener('rccConfirm', function( event ) {

        console.log(event);
    });



    //Prevent run twice
    rcc.hasInitialised = true;

    window.rcc = rcc;
})(window, window.rcc || {});