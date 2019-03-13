(function(angular, rcc){
    'use strict';

    var module = angular.module('rcConsent', []);

    module.provider('rcConsent', [function rcConsentProvider() {

        this.$get = [function() {

            return {
                hasConsented: function( category ) {

                    if (!rcc || !angular.isFunction(rcc.hasConsented)) {
                        return false;
                    }

                    return rcc.hasConsented(category);
                },
                getStatus: function() {

                    if (!rcc || !angular.isFunction(rcc.getStatus)) {
                        return {};
                    }

                    return rcc.getStatus();
                },
                setStatus: function( statuses ) {

                    if (!rcc || !angular.isFunction(rcc.setStatus)) {
                        return false;
                    }

                    rcc.setStatus( statuses );

                    return true;
                },
                setConsent: function( args ) {

                    if (!rcc || !angular.isFunction(rcc.setConsent)) {
                        return false;
                    }

                    if (angular.isString(args)) {
                        args = document.querySelector(args);
                    }

                    rcc.setConsent( args );

                    return true;
                },
                setForm: function( args ) {

                    if (!rcc || !angular.isFunction(rcc.setForm)) {
                        return false;
                    }

                    if (angular.isString(args)) {
                        args = document.querySelector(args);
                    }

                    rcc.setForm( args );

                    return true;
                },
                getProviders: function() {

                    if (!rcc || !angular.isFunction(rcc.getProviders)) {
                        return [];
                    }

                    return rcc.getProviders();
                }
            };
        }];

        /**
         * Initialise rcc
         *
         * @param options
         * @returns {boolean}
         */
        this.addProvider = function( options ) {

            if (!rcc || !angular.isFunction(rcc.addProvider)) {
                return false;
            }

            rcc.addProvider( options );

            return true;
        };


        /**
         * Initialise rcc
         *
         * @param options
         * @returns {boolean}
         */
        this.initialise = function( options ) {

            if (!rcc || !angular.isFunction(rcc.initialise)) {
                return false;
            }

            rcc.initialise( options );

            return true;
        };

    }]);


    module.filter('hasConsented', [ 'rcConsent', function(rcConsent) {

        return function( category ) {

            return rcConsent.hasConsented(category);
        };
    }]);


    module.filter('getConsentStatus', [ 'rcConsent', function(rcConsent) {

        return function( value ) {

            return rcConsent.getStatus();
        };
    }]);

    module.filter('setConsentStatus', [ 'rcConsent', function(rcConsent) {

        return function( statuses ) {

            return rcConsent.setStatus( statuses );
        };
    }]);

    module.filter('setConsent', [ 'rcConsent', function(rcConsent) {

        return function( args ) {

            return rcConsent.setConsent( args );
        };
    }]);

    module.filter('setConsentForm', [ 'rcConsent', function(rcConsent) {

        return function( args ) {

            return rcConsent.setForm( args );
        };
    }]);

    module.filter('getConsentProviders', [ 'rcConsent', function(rcConsent) {

        return function( value ) {

            return rcConsent.getProviders();
        };
    }]);

})(window.angular, window.rcc);
