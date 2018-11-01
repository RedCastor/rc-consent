Cookie Consent
=================

A Vanilla JS plugin which meets General Data Protection Regulations (GDPR) 

**[Demo][]**

<h4>Installing</h4>

```
bower install rc-consent
```

```
npm install rc-consent
```

<h4>Parameters</h4>
- **formIds**       = array of ids for add listen event on form submit. Each input checkbox with name category set the consent status.
- **clickSelector** = string selector for add listen event on click. This selector can be use on button click accept consent current status by add a cookie with a hash value of the current statuses.
- **cookie**        = object contain the name, days, domain and path of the stored cookie.  
- **defaultStatus** = object of the default status key is the category and value is boolean.


<h4>Usage/Example Form</h4>

```html
<script type="text/javascript" src="dist/rc-consent.js"></script>
<script type="text/javascript" id="rcc_consent_GA">
    window.addEventListener("DOMContentLoaded", function() {
        window.rcc.addProvider({
            id: 'ga',
            trackingId: 'UA-XXXXX-Y',
            anonymizeIp: true,
            load: function() {
                if (typeof ga !== 'undefined') { return false; }
                (function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
                    (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
                    m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
                })(window,document,'script','https://www.google-analytics.com/analytics.js','ga');
            },
            onInitialise: function (rcc, status) {
                console.log('GA Consent init');

                if (rcc.hasConsented(this.category)) {
                    console.log('hasConsented: true');
                }
                else {
                    console.log('hasConsented: false');
                }
            },
            onAllow: function (rcc) {
                console.log('GA consent allow:' + this.category);

                this.load();
                ga('create', this.trackingId, 'auto');
                ga('set', 'anonymizeIp', this.anonymizeIp);
                ga('send', 'event', 'Cookie Consent', 'Accepted');
                ga('send', 'pageview');
            },
            onRevoke: function (rcc) {
                console.log('GA consent revoke:' + this.category);

                this.load();

                ga('create', this.trackingId, {'storage': 'none'});
                ga('send', 'event', 'Cookie Consent', 'Declined');
            }
        });
    });
</script>
<script>
    window.addEventListener("DOMContentLoaded", function() {
        window.rcc.initialise({
            cookie: {name: 'consent'}, 
            defaultStatus: {required: true}
        });
    });
</script>
```

```javascript
//Simple example jQuery with modal foundation
(function($, rcc) {
    "use strict";

    var $consentModal = $('#consentModal');
    var $consentModalInstance = new Foundation.Reveal($consentModal);

    //Check has consented
    $( document ).ready(function() {

        if (!rcc.hasConsented()) {
            $consentModal.foundation('open');
        }
    });

    //On Submit close modal
    $('#consent_form').submit(function (e) {

        rcc.setConsent($consentModal.get(0));

        $consentModal.foundation('close');

        return false;
    });

    //Init form field on Modal Open
    $consentModal.on('open.zf.reveal', function () {

        rcc.setForm($consentModal.get(0));
    });

})(jQuery, rcc);
```

<h4>AngularJS</h4>
AngularJS Module **[See AngularJS Provider]**


[Demo]: http://redcastor.github.io/rc-consent/
[See AngularJS Provider]: https://github.com/RedCastor/rc-consent/blob/master/src/rc-consent-angular.js