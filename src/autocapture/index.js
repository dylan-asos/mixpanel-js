import { _, document, window } from '../utils'; // eslint-disable-line camelcase
import {
    getPropsForDOMEvent, logger, minDOMApisSupported,
    EV_CLICK, EV_MP_LOCATION_CHANGE, EV_SCROLL
} from './utils';

var AUTOCAPTURE_CONFIG_KEY = 'autocapture';
var LEGACY_PAGEVIEW_CONFIG_KEY = 'track_pageview';

var CONFIG_BLOCK_SELECTORS = 'block_selectors';
var CONFIG_BLOCK_URL_REGEXES = 'block_url_regexes';
var CONFIG_TRACK_CLICK = 'click';
var CONFIG_TRACK_PAGEVIEW = 'pageview';
var CONFIG_TRACK_SCROLL = 'scroll';

var DEFAULT_PROPS = {
    '$mp_autocapture': true
};

var MP_EV_CLICK = '$mp_click';
var MP_EV_SCROLL = '$mp_scroll';

var CLICK_EVENT_PROPS = [
    'clientX', 'clientY',
    'offsetX', 'offsetY',
    'pageX', 'pageY',
    'screenX', 'screenY',
    'x', 'y'
];

/**
 * Autocapture: manages automatic event tracking
 * @constructor
 */
var Autocapture = function(mp) {
    this.mp = mp;
};

Autocapture.prototype.init = function() {
    if (!minDOMApisSupported()) {
        logger.critical('Autocapture unavailable: missing required DOM APIs');
        return;
    }

    this.initPageviewTracking();
    this.initClickTracking();
    this.initScrollTracking();
};

Autocapture.prototype.getConfig = function(key) {
    var autocaptureConfig = this.mp.get_config(AUTOCAPTURE_CONFIG_KEY);
    return autocaptureConfig[key];
};

Autocapture.prototype.currentUrlBlocked = function() {
    var blockUrlRegexes = this.getConfig(CONFIG_BLOCK_URL_REGEXES) || [];
    if (!blockUrlRegexes || !blockUrlRegexes.length) {
        return false;
    }

    var currentUrl = _.info.currentUrl();
    for (var i = 0; i < blockUrlRegexes.length; i++) {
        try {
            if (currentUrl.match(blockUrlRegexes[i])) {
                return true;
            }
        } catch (err) {
            logger.critical('Error while checking block URL regex: ' + blockUrlRegexes[i], err);
            return true;
        }
    }
    return false;
};

Autocapture.prototype.pageviewTrackingConfig = function() {
    // supports both autocapture config and old track_pageview config
    var autocaptureConfig = this.mp.get_config(AUTOCAPTURE_CONFIG_KEY);
    if (CONFIG_TRACK_PAGEVIEW in autocaptureConfig) {
        return autocaptureConfig[CONFIG_TRACK_PAGEVIEW];
    } else {
        return this.mp.get_config(LEGACY_PAGEVIEW_CONFIG_KEY);
    }
};

Autocapture.prototype.initClickTracking = function() {
    window.removeEventListener(EV_CLICK, this.listenerClick);

    if (!this.getConfig(CONFIG_TRACK_CLICK)) {
        return;
    }

    // TODO try/catch
    this.listenerClick = window.addEventListener(EV_CLICK, function(ev) {
        if (this.currentUrlBlocked()) {
            return;
        }

        var props = getPropsForDOMEvent(ev, this.getConfig(CONFIG_BLOCK_SELECTORS));
        if (props) {
            _.each(CLICK_EVENT_PROPS, function(prop) {
                if (prop in ev) {
                    props['$' + prop] = ev[prop];
                }
            });
            _.extend(props, DEFAULT_PROPS);
            this.mp.track(MP_EV_CLICK, props);
        }
    }.bind(this));
};

Autocapture.prototype.initPageviewTracking = function() {
    // TODO remove any existing listeners before initializing

    if (!this.pageviewTrackingConfig()) {
        return;
    }

    var previousTrackedUrl = '';
    var tracked = this.mp.track_pageview(DEFAULT_PROPS);
    if (tracked) {
        previousTrackedUrl = _.info.currentUrl();
    }

    window.addEventListener('popstate', function() {
        window.dispatchEvent(new Event(EV_MP_LOCATION_CHANGE));
    });
    window.addEventListener('hashchange', function() {
        window.dispatchEvent(new Event(EV_MP_LOCATION_CHANGE));
    });
    var nativePushState = window.history.pushState;
    if (typeof nativePushState === 'function') {
        window.history.pushState = function(state, unused, url) {
            nativePushState.call(window.history, state, unused, url);
            window.dispatchEvent(new Event(EV_MP_LOCATION_CHANGE));
        };
    }
    var nativeReplaceState = window.history.replaceState;
    if (typeof nativeReplaceState === 'function') {
        window.history.replaceState = function(state, unused, url) {
            nativeReplaceState.call(window.history, state, unused, url);
            window.dispatchEvent(new Event(EV_MP_LOCATION_CHANGE));
        };
    }
    window.addEventListener(EV_MP_LOCATION_CHANGE, function() {
        var currentUrl = _.info.currentUrl();
        var shouldTrack = false;
        var trackPageviewOption = this.pageviewTrackingConfig();
        if (trackPageviewOption === 'full-url') {
            shouldTrack = currentUrl !== previousTrackedUrl;
        } else if (trackPageviewOption === 'url-with-path-and-query-string') {
            shouldTrack = currentUrl.split('#')[0] !== previousTrackedUrl.split('#')[0];
        } else if (trackPageviewOption === 'url-with-path') {
            shouldTrack = currentUrl.split('#')[0].split('?')[0] !== previousTrackedUrl.split('#')[0].split('?')[0];
        }

        if (shouldTrack) {
            var tracked = this.mp.track_pageview(DEFAULT_PROPS);
            if (tracked) {
                previousTrackedUrl = currentUrl;
            }
        }
    }.bind(this));
};

Autocapture.prototype.initScrollTracking = function() {
    window.removeEventListener(EV_SCROLL, this.listenerScroll);

    if (!this.getConfig(CONFIG_TRACK_SCROLL)) {
        return;
    }

    this.listenerScroll = window.addEventListener(EV_SCROLL, function() {
        if (this.currentUrlBlocked()) {
            return;
        }

        var scrollTop = window.scrollY;
        var props = _.extend({'$scroll_top': scrollTop}, DEFAULT_PROPS);
        try {
            var scrollHeight = document.body.scrollHeight;
            var scrollPercentage = Math.round((scrollTop / (scrollHeight - window.innerHeight)) * 100);
            props['$scroll_height'] = scrollHeight;
            props['$scroll_percentage'] = scrollPercentage;
        } catch (err) {
            logger.critical('Error while calculating scroll percentage', err);
        }
        this.mp.track(MP_EV_SCROLL, props);
    }.bind(this));
};

export { Autocapture };
