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

            try {
                var val_obj = JSON.parse(decodeURIComponent(value));

                value = val_obj;
            }
            catch (e) {}

            return value;
        },
        setCookie: function(name, value, expiryDays, domain, path, secure) {
            var exdate = new Date();
            exdate.setDate(exdate.getDate() + (expiryDays || 365));

            if (this.isPlainObject(value)) {
                value = JSON.stringify(value);
            }

            value = encodeURIComponent(value);

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
        // only used for hashing json objects (used for hash status objects)
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
            return hash & 0xfffffff; //Always positive
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
    var cacheStatus = {};

    var defaultProvider = {
        id: null,
        trackingId: null,
        category: 'analytics',
        onInitialise: function(rcc, status) {},
        onAllow: function(rcc) {},
        onRevoke: function(rcc) {},
        onStatusChange: function(rcc, new_status, old_status) {}
    };

    var defaultOptions = {
        formId: null,
        cookie: {
            name: 'rcc_consent',
            domain: '',
            path: '/',
            days: 7
        },
        categories: [
            'analytics'
        ]
    };


    /**
     * Merge default status target with source not extend target
     * @param target
     * @param source
     * @returns {*}
     */
    function mergeDefaultStatus (target, source) {

        for (var prop in target) {
            if (target.hasOwnProperty(prop)) {

                if (source[prop] === true || source[prop] === false) {
                    target[prop] = source[prop];
                }
            }
        }

        return target;
    }


    rcc = {
        initialise: function(options) {

            //Init options
            utils.deepExtend((this.options = {}), defaultOptions);

            if (utils.isPlainObject(options)) {
                utils.deepExtend(this.options, options);
            }

            //Add Event Listner for submit form ids
            if (this.options.formIds) {

                for (var i_el_form = 0; i_el_form < this.options.formIds.length; i_el_form++) {

                    var el_form = window.document.getElementById(this.options.formIds[i_el_form]);

                    el_form.addEventListener('submit', setConsent);
                }
            }

            //Add Event Listner for click button
            if (this.options.clickSelector) {

                var el_click = window.document.querySelectorAll(this.options.clickSelector);

                for (var i_el_click = 0; i_el_click < el_click.length; i_el_click++) {

                    el_click[i_el_click].addEventListener('click', setConsent);
                }
            }

            //Add Event Listner for set consent
            window.document.addEventListener('rccSetConsent', setConsent);

            //Init Categories
            categories = [];
            if (utils.isPlainObject(this.options.defaultStatus)) {
                var categories = Object.keys(this.options.defaultStatus);
            }

            for (var i_cat = 0; i_cat < providers.length; i_cat++) {
                var category = providers[i_cat].category || 'analytics';

                if (categories.indexOf(category) === -1) {
                    categories.push(category);
                }

                //Add categories from provider
                if (this.options.categories.indexOf(category) >= 0) {
                    this.options.categories.splice(this.options.categories.indexOf(category), 1);
                }
            }

            //Concat default
            this.options.categories = categories.concat(this.options.categories);

            var status = this.getStatus();


            //Initialize each provider
            for (var i = 0; i < providers.length; i++) {

                var category = providers[i].category;

                providers[i].onInitialise.call(providers[i], this, status);

                if (category && status[category] === true) {
                    providers[i].onAllow.call(providers[i], this);
                }
            }

            cacheStatus = status;
        },
        addProvider: function (options) {

            if (!options.id || options.id === '') {
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
        setConsent: function( args  ) {

            this.setStatus(args);

            var status = this.getStatus();
            var is_status_change = false;

            //Status change
            if (JSON.stringify(status) !== JSON.stringify(cacheStatus)) {
                is_status_change = true;
            }

            //Call onChange revoke or allow for each provider
            for (var i = 0; i < providers.length; i++) {
                var category = providers[i].category;

                if (is_status_change) {
                    providers[i].onStatusChange.call(providers[i], this, status, cacheStatus);
                }

                if (status[category] !== cacheStatus[category]) {

                    if (!status[category]) {
                        providers[i].onRevoke.call(providers[i], this);
                    }
                    else {
                        providers[i].onAllow.call(providers[i], this);
                    }
                }
            }

            cacheStatus = status;
        },
        getStatus: function() {

            var cookie = rcc.options.cookie;
            var curent_value = utils.getCookie(cookie.name);
            var value_hash = utils.getCookie(cookie.name + '_hash');
            var value = this.getDefaultStatus();

            if (utils.isPlainObject(curent_value)) {

                mergeDefaultStatus(value, curent_value);
            }

            //Update cookie if current value not same as default value merge with current value.
            if (JSON.stringify(curent_value) !== JSON.stringify(value)) {

                utils.setCookie(cookie.name, value, 0, cookie.domain, cookie.path);
            }

            //Remove hash not same as cookie status
            if (value_hash !== utils.hash(JSON.stringify(value))) {

                utils.setCookie(this.options.cookie.name + '_hash', '', -1, cookie.domain, cookie.path);
            }

            return value;
        },
        setStatus: function( value ) {

            var cookie = this.options.cookie;

            if (!utils.isPlainObject(value)) {

                var curent_value = utils.getCookie(cookie.name);

                value = this.getDefaultStatus();

                if (utils.isPlainObject(curent_value)) {
                    mergeDefaultStatus(value, curent_value);
                }

            }

            var cookie_hash = utils.hash(JSON.stringify(value));

            utils.setCookie(cookie.name, value, 0, cookie.domain, cookie.path);
            utils.setCookie(cookie.name + '_hash', cookie_hash, cookie.days, cookie.domain, cookie.path);
        },
        clearStatus: function() {

            var cookie = this.options.cookie;

            utils.setCookie(cookie.name, '', -1, cookie.domain, cookie.path);
            utils.setCookie(cookie.name + '_hash', '', -1, cookie.domain, cookie.path);

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
        hasConsented: function ( category ) {

            var status = this.getStatus();

            var value_hash = utils.getCookie(this.options.cookie.name + '_hash');

            if (!value_hash) {
                return false;
            }
            else if (!category) {
                return true;
            }

            return !!status[category];
        }
    };


    /**
     * Set Consent for event
     *
     * @param event
     * @param args
     */
    var setConsent = function( event, args ) {

        if (!args && event.type === 'submit') {

            var el_input = event.target.querySelectorAll('input[name]');

            if (el_input.length) {
                var args = {};

                for (var i = 0; i < el_input.length; i++) {

                    if(el_input[i].type === 'checkbox' && rcc.options.categories.indexOf(el_input[i].name) >= 0) {
                        args[el_input[i].name] = el_input[i].checked;
                    }
                }
            }

        }

        rcc.setConsent(args);
    };

    //Prevent run twice
    rcc.hasInitialised = true;

    window.rcc = rcc;
})(window, window.rcc || {});