(function(angular, rcc) {
    "use strict";
    var module = angular.module("rcConsent", []);
    module.filter("hasConsented", [ function() {
        return function(category) {
            if (!rcc || !angular.isFunction(rcc.hasConsented)) {
                return false;
            }
            return rcc.hasConsented(category);
        };
    } ]);
    module.filter("getStatus", [ function() {
        return function() {
            if (!rcc || !angular.isFunction(rcc.getStatus)) {
                return {};
            }
            return rcc.getStatus();
        };
    } ]);
    module.filter("setStatus", [ function() {
        return function(statuses) {
            if (!rcc || !angular.isFunction(rcc.setStatus)) {
                return false;
            }
            rcc.setStatus(statuses);
            return true;
        };
    } ]);
    module.filter("setConsent", [ function() {
        return function(statuses) {
            if (!rcc || !angular.isFunction(rcc.setConsent)) {
                return false;
            }
            rcc.setConsent(statuses);
            return true;
        };
    } ]);
    module.filter("getProviders", [ function() {
        return function() {
            if (!rcc || !angular.isFunction(rcc.getProviders)) {
                return [];
            }
            return rcc.getProviders();
        };
    } ]);
})(window.angular, window.rcc);
//# sourceMappingURL=rc-consent-angular.js.map
