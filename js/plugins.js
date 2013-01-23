// Avoid `console` errors in browsers that lack a console.
/*
if (!(window.console && console.log)) {
	(function() {
		var noop = function() {};
		var methods = ['assert', 'clear', 'count', 'debug', 'dir', 'dirxml', 'error', 'exception', 'group', 'groupCollapsed', 'groupEnd', 'info', 'log', 'markTimeline', 'profile', 'profileEnd', 'markTimeline', 'table', 'time', 'timeEnd', 'timeStamp', 'trace', 'warn'];
		var length = methods.length;
		var console = window.console = {};
		while (length--) {
			console[methods[length]] = noop;
		}
	}());
}
*/


/*      
 *         ________                                                            ________        
 *         ______(_)_____ ____  __________________  __ _____________________   ______(_)_______
 *         _____  /_  __ `/  / / /  _ \_  ___/_  / / / ___  __ \  _ \__  __ \  _____  /__  ___/
 *         ____  / / /_/ // /_/ //  __/  /   _  /_/ /____  /_/ /  __/_  /_/ /______  / _(__  ) 
 *         ___  /  \__, / \__,_/ \___//_/    _\__, /_(_)  .___/\___/_  .___/_(_)__  /  /____/  
 *         /___/     /_/                     /____/    /_/          /_/        /___/           
 *      
 *        http://briangonzalez.org/pep
 *        Kinetic drag for mobile/desktop.
 *        
 *        Copyright (c) 2012 Brian Gonzalez
 *        Licensed under the MIT license.
 *
 *        Title generated using "Speed" @ 
 *        http://patorjk.com/software/taag/#p=display&f=Speed&t=jquery.pep.js
 */

;(function($, window, undefined) {

    //  create the defaults once
    var pluginName = 'pep',
        document = window.document,
        defaults = {
            // OPTIONS W/ DEFAULTS
            // --------------------------------------------------------------------------------
            debug: false, // debug via a small div in the lower-righthand corner of the document 
            activeClass: 'active', // class to add to the DOM el while dragging
            multiplier: 1, // +/- this number to modify to 1:1 ratio of finger/mouse movement to el movement 

            shouldPreventDefault: true, // in some cases, we don't want to prevent the default on our Pep object. your call.
            stopEvents: '', // space delimited set of events which programmatically cause the object to stop

            hardwareAccelerate: true, // apply the CSS3 silver bullet method to accelerate the pep object: http://indiegamr.com/ios6-html-hardware-acceleration-changes-and-how-to-fix-them/
            useCSSTranslation: false, // EXPERIMENTAL: use CSS transform translations as opposed to top/left
            disableSelect: true, // apply `user-select: none` (CSS) to the object

            cssEaseString: "cubic-bezier(0.190, 1.000, 0.220, 1.000)", // get more css ease params from [ http://matthewlein.com/ceaser/ ]
            cssEaseDuration: 750, // how long should it take (in ms) for the object to get from stop to rest?
            shouldEase: true, // disable/enable easing

            constrainToWindow: false, // constrain object to the window
            constrainToParent: false, // constrain object to its parent
            axis: null, // constrain object to either 'x' or 'y' axis
            forceNonCSS3Movement: false, // DO NOT USE: this is subject to come/go. Use at your own ri
            drag: function() {}, // called continuously while the object is dragging 
            start: function() {}, // called when dragging starts
            stop: function() {}, // called when dragging stops
            rest: function() {} // called after dragging stops, and object has come to rest
        };

    //  ---------------------------------
    //  -----  Our main Pep object  -----
    //  ---------------------------------
    function Pep(el, options) {

        // reference to our DOM object 
        // and it's jQuery equivalent.
        this.el = el;
        this.$el = $(el);

        //  jQuery has an extend method which merges the contents of two or 
        //  more objects, storing the result in the first object. 

        //  the first object is generally empty as we don't want to 
        //  alter the default options for
        //  future instances of the plugin.
        this.options = $.extend({}, defaults, options);

        // store document/window so we don't need to keep grabbing it
        // throughout the code
        this.$document = $(document);
        this.$window = $(window);

        this._defaults = defaults;
        this._name = 'Pep';

        //  Create our triggers based on touch/click device 
        this.moveTrigger = this.isTouch() ? "touchmove" : "mousemove";
        this.startTrigger = this.isTouch() ? "touchstart" : "mousedown";
        this.stopTrigger = this.isTouch() ? "touchend" : "mouseup";

        this.stopEvents = [this.stopTrigger, this.options.stopEvents].join(' ');
        this.$container = this.options.constrainToParent ? this.$el.parent() : this.$document;

        this.CSSEaseHash = this.getCSSEaseHash();
        this.velocityQueue = new Array(5);
        this.scale = 1;
        this.disabled = false;

        this.init();
    }

    //  init();
    //    initialization logic 
    //    you already have access to the DOM el and the options via the instance, 
    //    e.g., this.el and this.options
    Pep.prototype.init = function() {
        var self = this;

        if (this.options.hardwareAccelerate) {
            this.hardwareAccelerate();
        }

        if (this.options.debug) this.buildDebugDiv();

        if (this.options.disableSelect) this.disableSelect();

        this.ev = {} // to store our event movements
        this.pos = {} // to store positions
        this.placeObject();
        this.subscribe();
    };

    //  subscribe(); 
    //    useful in the event we want to programmatically 
    //    interact with our Pep object.
    //      e.g.:     $('#pep').trigger('stop')
    Pep.prototype.subscribe = function() {
        var self = this;

        // ★★★  Subscribe to our start event  ★★★★★★★★★★
        this.$el.bind(this.startTrigger, function(ev) {
            self.handleStart(ev);
        });

        this.$document.bind(this.stopEvents, function(ev) {
            self.handleStop(ev);
        });

        // subscribe to move event.
        this.$document.bind(this.moveTrigger, function(ev) {
            self.moveEvent = ev;
        });
    };

    //  handleStart();
    //    once this.startTrigger occurs, handle all of the logic
    //    that must go on. This is where Pep's heavy lifting is done. 
    Pep.prototype.handleStart = function(ev) {
        var self = this;

        // only continue chugging if our start event is a valid move event. 
        if (this.isValidMoveEvent(ev) && !this.disabled) {

            // log it
            this.log({
                type: 'event',
                event: ev.type
            });

            // fire user's stop event.
            this.options.start(ev, this);

            // add active class and reset css animation, if necessary
            this.$el.addClass(this.options.activeClass);
            this.removeCSSEasing();

            // store x & y values for later use
            this.ev.x = this.isTouch() ? ev.originalEvent.pageX : ev.pageX;
            this.ev.y = this.isTouch() ? ev.originalEvent.pageY : ev.pageY;

            // store the initial touch event, used to calculate the inital delta values.
            this.moveEvent = ev;

            // make object active, so watchMoveLoop starts looping.
            this.active = true;

            // preventDefault(), is necessary
            if (this.options.shouldPreventDefault) ev.preventDefault();

            // animation loop to ensure we don't fire 
            // too many unneccessary repaints  
            (function watchMoveLoop() {
                if (!self.active) return;
                self.handleMove();
                self.requestAnimationFrame(watchMoveLoop);
            })($, self);

        }
    };

    //  handleMove();
    //    the logic for when the move events occur 
    Pep.prototype.handleMove = function() {

        // setup our event object
        var ev = this.moveEvent;
        if (typeof(ev) === 'undefined') return;

        // get our move event's x & y
        var curX = (this.isTouch() ? ev.originalEvent.touches[0].pageX : ev.pageX);
        var curY = (this.isTouch() ? ev.originalEvent.touches[0].pageY : ev.pageY);

        // last in, first out (LIFO) queue to help us manage velocity
        this.addToLIFO({
            time: ev.timeStamp,
            x: curX,
            y: curY
        });

        // calculate values necessary to moving
        var dx, dy;

        if (ev.type == this.startTrigger) {
            dx = 0;
            dy = 0;
        } else {
            dx = curX - this.ev.x;
            dy = curY - this.ev.y;
        }

        this.ev.x = curX;
        this.ev.y = curY;

        // no movement in either direction -- so return
        if (dx === 0 && dy === 0) {
            this.log({
                type: 'event',
                event: '** stopped **'
            });
            return;
        }

        // fire user's drag event.
        this.options.drag(ev, this);

        // log the move trigger & event position
        this.log({
            type: 'event',
            event: ev.type
        });
        this.log({
            type: 'event-coords',
            x: this.ev.x,
            y: this.ev.y
        });
        this.log({
            type: 'velocity'
        })

        var hash = this.handleConstraint(dx, dy);

        // if using not using CSS transforms, move object via absolute position
        if (!this.shouldUseCSSTranslation()) {
            var xOp = (dx >= 0) ? "+=" + Math.abs(dx / this.scale) * this.options.multiplier : "-=" + Math.abs(dx / this.scale) * this.options.multiplier;
            var yOp = (dy >= 0) ? "+=" + Math.abs(dy / this.scale) * this.options.multiplier : "-=" + Math.abs(dy / this.scale) * this.options.multiplier;

            if (this.options.constrainToParent || this.options.constrainToWindow) {
                xOp = (hash.x !== false) ? hash.x : xOp;
                yOp = (hash.y !== false) ? hash.y : yOp;
            }

            //  If `constrainToParent` option is set, return if
            //  we hit the edge and we're moving in that direction    
            this.moveTo(xOp, yOp);
        } else {

            dx = (dx / this.scale) * this.options.multiplier;
            dy = (dy / this.scale) * this.options.multiplier

            if (this.options.constrainToParent || this.options.constrainToWindow) {
                dx = (hash.x === false) ? dx : 0;
                dy = (hash.y === false) ? dy : 0;
            }
            this.moveToUsingTransforms(dx, dy);
        }
    };

    //  handleStop();
    //    the logic for when the stop events occur
    Pep.prototype.handleStop = function(ev) {

        // no need to handle stop event if we're not active
        if (!this.active) return;

        // log it
        this.log({
            type: 'event',
            event: ev.type
        });

        // make object inactive, so watchMoveLoop returns
        this.active = false;

        // ease the object, if necessary
        if (this.options.shouldEase) this.ease(ev);

        // fire user's stop event.
        this.options.stop(ev, this);

        // reset the velocity queue 
        this.velocityQueue = new Array(5);

    };

    //  moveTo();
    //    move the object to an x and/or y value
    //    using jQuery's .css function -- this fxn uses the 
    //    .css({top: "+=20", left: "-=30"}) syntax
    Pep.prototype.moveTo = function(x, y, animate) {

        animate = (animate === false || typeof(animate) === 'undefined') ? false : true;

        if (this.options.axis === 'x') {
            y = "+=0"
        } else if (this.options.axis === 'y') {
            x = "+=0"
        }

        var animateDuration = 300;
        this.log({
            type: 'delta',
            x: x,
            y: y
        });
        animate ? this.$el.animate({
            top: y,
            left: x
        }, animateDuration, 'easeOutCirc', {
            queue: false
        }) : this.$el.stop(true, false).css({
            top: y,
            left: x
        });
    };

    //  moveToUsingTransforms();
    //    move the object to an x and/or y value
    Pep.prototype.moveToUsingTransforms = function(x, y) {

        // only move along single axis, if necessary
        if (this.options.axis === 'x') {
            y = 0;
        } else if (this.options.axis === 'y') {
            x = 0
        }

        // CSS3 transforms are additive from current position
        this.cssX = this.cssX ? (this.cssX + x) : x;
        this.cssY = this.cssY ? (this.cssY + y) : y;

        this.log({
            type: 'delta',
            x: x,
            y: y
        });

        this.translation = "translate(" + this.cssX + "px, " + this.cssY + "px)";
        this.$el.css({
            '-webkit-transform': this.translation,
            '-moz-transform': this.translation,
            '-ms-transform': this.translation,
            '-o-transform': this.translation,
            'transform': this.translation
        });
    };

    //  addToLIFO();
    //    a Last-In/First-Out array of the 5 most recent 
    //    velocity points, which is used for easing
    Pep.prototype.addToLIFO = function(val) {
        // last in, first out
        var arr = this.velocityQueue;
        arr = arr.slice(1, arr.length);
        arr.push(val);
        this.velocityQueue = arr;
    };

    //  ease();
    //    used in conjunction with the LIFO queue 
    //    to ease the object after stop
    Pep.prototype.ease = function(ev) {

        var pos = this.$el.position();
        var vel = this.velocity();
        var dt = this.dt;
        var x = (vel.x / this.scale) * this.options.multiplier;
        var y = (vel.y / this.scale) * this.options.multiplier
        var hash = this.handleConstraint(x, y)

        // ✪  Apple the CSS3 animation easing magic  ✪
        if (this.cssAnimationsSupported()) this.$el.css(this.getCSSEaseHash());

        var xOp = (vel.x > 0) ? "+=" + x : "-=" + Math.abs(x);
        var yOp = (vel.y > 0) ? "+=" + y : "-=" + Math.abs(y);

        if (this.options.constrainToParent || this.options.constrainToWindow) {
            xOp = (hash.x !== false) ? hash.x : xOp;
            yOp = (hash.y !== false) ? hash.y : yOp;
        }

        // ease it via JS, the last true tells it to animate..........
        var jsAnimateFallback = !this.cssAnimationsSupported() || this.options.forceNonCSS3Movement;
        this.moveTo(xOp, yOp, jsAnimateFallback);

        // when the rest occurs, remove active class and call
        // user's rest event.
        var self = this;
        this.timeout = setTimeout(function() {

            // call users rest event.
            self.options.rest(ev, self);

            // remove active class 
            self.$el.removeClass(self.options.activeClass);

        }, this.options.cssEaseDuration);


    };

    //  velocity();
    //    using the LIFO, calculate velocity and return
    //    velocity in each direction (x & y)
    Pep.prototype.velocity = function() {
        var sumX = 0;
        var sumY = 0;

        for (var i = 0; i < this.velocityQueue.length - 1; i++) {
            if (this.velocityQueue[i]) {
                sumX = sumX + (this.velocityQueue[i + 1].x - this.velocityQueue[i].x);
                sumY = sumY + (this.velocityQueue[i + 1].y - this.velocityQueue[i].y);
                this.dt = (this.velocityQueue[i + 1].time - this.velocityQueue[i].time);
            }
        }

        // a value to fine tune velocity
        var velocityMultiplier = 1.6;

        // return velocity in each direction.
        return {
            x: sumX * velocityMultiplier,
            y: sumY * velocityMultiplier
        };
    };

    //  requestAnimationFrame();
    //    requestAnimationFrame Polyfill
    //    More info:
    //    http://paulirish.com/2011/requestanimationframe-for-smart-animating/
    Pep.prototype.requestAnimationFrame = function(callback) {
        return window.requestAnimationFrame && window.requestAnimationFrame(callback) || window.webkitRequestAnimationFrame && window.webkitRequestAnimationFrame(callback) || window.mozRequestAnimationFrame && window.mozRequestAnimationFrame(callback) || window.oRequestAnimationFrame && window.mozRequestAnimationFrame(callback) || window.msRequestAnimationFrame && window.msRequestAnimationFrame(callback) || window.setTimeout(callback, 1000 / 60);
    };

    //  placeObject();
    //    place object right where it is, but make it movable
    //    via `position: absolute`
    Pep.prototype.placeObject = function() {

        // make `relative` parent if necessary
        if (this.options.constrainToParent) {
            this.$container.css({
                position: 'relative'
            });
        } else {
            this.$container.css({
                position: 'static'
            });
        }

        var positionType = this.options.constrainToParent ? 'position' : 'offset';
        this.offset = this.$el[positionType]();
        this.$el.css({
            position: 'absolute',
            top: this.offset.top,
            left: this.offset.left,
            zIndex: 1
        });

    };

    //  setScale()
    //    set the scale of the object being moved.
    Pep.prototype.setScale = function(val) {
        this.scale = val;
    };

    //  setMultiplier()
    //    set the multiplier of the object being moved.
    Pep.prototype.setMultiplier = function(val) {
        this.options.multiplier = val;
    };

    //  removeCSSEasing();
    //    remove CSS easing properties, if necessary
    Pep.prototype.removeCSSEasing = function() {
        if (this.cssAnimationsSupported()) this.$el.css(this.getCSSEaseHash(true));
    };

    //  disableSelect();
    //    add the property which causes the object
    //    to not be selected user drags over text areas
    Pep.prototype.disableSelect = function() {

        this.$el.css({
            '-webkit-touch-callout': 'none',
            '-webkit-user-select': 'none',
            '-khtml-user-select': 'none',
            '-moz-user-select': 'none',
            '-ms-user-select': 'none',
            'user-select': 'none'
        });

    };

    //  handleConstraint();
    //    returns a hash of where to move to
    //    when we constrain to parent/window
    Pep.prototype.handleConstraint = function(dx, dy) {
        var pos = this.$el.position();
        this.pos.x = pos.left;
        this.pos.y = pos.top;

        // log our positions
        this.log({
            type: "pos-coords",
            x: this.pos.x,
            y: this.pos.y
        })

        var upperXLimit = this.$container.width() - this.$el.outerWidth();
        var upperYLimit = this.$container.height() - this.$el.outerHeight();
        var hash = {
            x: false,
            y: false
        };

        // is our object trying to move outside upper X & Y limits?
        if (this.pos.x + dx > upperXLimit) hash.x = upperXLimit
        if (this.pos.x + dx < 0) hash.x = 0
        if (this.pos.y + dy > upperYLimit) hash.y = upperYLimit
        if (this.pos.y + dy < 0) hash.y = 0;

        return hash;
    };

    //  getCSSEaseHash();
    //    returns a hash of params used in conjunction 
    //    with this.options.cssEaseString
    Pep.prototype.getCSSEaseHash = function(reset) {
        if (typeof(reset) === 'undefined') reset = false;

        if (reset) {
            var cssEaseString = '';
        } else if (this.CSSEaseHash) {
            return this.CSSEaseHash;
        } else {
            var cssEaseString = ['all', this.options.cssEaseDuration + 'ms', this.options.cssEaseString].join(' ');
        }

        return {
            '-webkit-transition': cssEaseString, // chrome, safari, etc.
            '-moz-transition': cssEaseString, // firefox
            '-ms-transition': cssEaseString, // microsoft
            '-o-transition': cssEaseString, // opera
            'transition': cssEaseString // future
        };
    };

    //  isTouch();
    //    returns whether or not our device is touch-ready
    Pep.prototype.isTouch = function(reset) {
        if (typeof(Modernizr) !== 'undefined') return Modernizr.touch

        if ('ontouchstart' in window || (window.DocumentTouch && document instanceof DocumentTouch)) {
            return true;
        } else {
            return false;
        }
    };

    //  isValidMoveEvent();
    //    returns true if we're on a non-touch device -- or -- 
    //    if the event is a non-pinch event on a touch device
    Pep.prototype.isValidMoveEvent = function(ev) {
        if (!this.isTouch() || (this.isTouch() && ev.originalEvent.hasOwnProperty('touches') && ev.originalEvent.touches.length == 1)) {
            return true;
        } else {
            return false
        }
    };

    //  shouldUseCSSTranslation();
    //    return true if we should use CSS transforms for move the object
    Pep.prototype.shouldUseCSSTranslation = function() {

        if (typeof(this.useCSSTranslation) !== "undefined") return this.useCSSTranslation;

        var useCSSTranslation = false;

        if (!this.options.useCSSTranslation || (typeof(Modernizr) !== "undefined" && !Modernizr.csstransforms)) {
            useCSSTranslation = false;
        } else {
            useCSSTranslation = true;
        }

        this.useCSSTranslation = useCSSTranslation;
        return useCSSTranslation;
    };

    //  cssAnimationsSupported():
    //    returns true if the browser supports CSS animations
    //    which are used for easing..
    Pep.prototype.cssAnimationsSupported = function() {

        if (typeof(this.cssAnimationsSupport) !== "undefined") {
            return this.cssAnimationsSupport
        }

        // If the page has Modernizr, let them do the heavy lifting.
        if ((typeof(Modernizr) !== "undefined" && Modernizr.cssanimations)) {
            this.cssAnimationsSupport = true;
            return true;
        }

        var animation = false,
            elm = document.createElement('div'),
            animationstring = 'animation',
            keyframeprefix = '',
            domPrefixes = 'Webkit Moz O ms Khtml'.split(' '),
            pfx = '';

        if (elm.style.animationName) {
            animation = true;
        }

        if (animation === false) {
            for (var i = 0; i < domPrefixes.length; i++) {
                if (elm.style[domPrefixes[i] + 'AnimationName'] !== undefined) {
                    pfx = domPrefixes[i];
                    animationstring = pfx + 'Animation';
                    keyframeprefix = '-' + pfx.toLowerCase() + '-';
                    animation = true;
                    break;
                }
            }
        }

        this.cssAnimationsSupport = animation;
        return animation;
    };

    //  hardwareAccelerate();
    //    add fool-proof CSS3 hardware acceleration.
    Pep.prototype.hardwareAccelerate = function() {
        this.$el.css({
            '-webkit-transform': 'translateZ(0)',
            'transform': 'translateZ(0)',
            '-webkit-perspective': 1000,
            'perspective': 1000,
            '-webkit-backface-visibility': 'hidden',
            'backface-visibility': 'hidden'
        })
    };

    //  getMovementValues();
    //    returns object pos, event position, and velocity in each direction.
    Pep.prototype.getMovementValues = function() {
        return {
            ev: this.ev,
            pos: this.pos,
            velocity: this.velocity()
        };
    };

    //  buildDebugDiv();
    //    Create a little div in the lower right corner of the window
    //    for extra info about the object currently moving
    Pep.prototype.buildDebugDiv = function() {

        // Build the debugDiv and it's inner HTML -- if necessary
        if ($('#pep-debug').length === 0) {
            var $debugDiv = $('<div></div>')
            $debugDiv.attr('id', 'pep-debug')
                .append("<div style='font-weight:bold; background: red; color: white;'>DEBUG MODE</div>")
                .append("<div id='pep-debug-event'>no event</div>")
                .append("<div id='pep-debug-ev-coords'>event coords: <span class='pep-x'>-</span>, <span class='pep-y'>-</span></div>")
                .append("<div id='pep-debug-pos-coords'>position coords: <span class='pep-x'>-</span>, <span class='pep-y'>-</span></div>")
                .append("<div id='pep-debug-velocity'>velocity: <span class='pep-x'>-</span>, <span class='pep-y'>-</span></div>")
                .append("<div id='pep-debug-delta'>Δ movement: <span class='pep-x'>-</span>, <span class='pep-y'>-</span></div>")
                .css({
                position: 'fixed',
                bottom: 5,
                right: 5,
                zIndex: 99999,
                textAlign: 'right',
                fontFamily: 'Arial, sans',
                fontSize: 10,
                border: '1px solid #DDD',
                padding: '3px',
                background: 'white',
                color: '#333'
            });
        }

        var self = this;
        setTimeout(function() {
            self.debugElements = {
                $event: $("#pep-debug-event"),
                $velocityX: $("#pep-debug-velocity .pep-x"),
                $velocityY: $("#pep-debug-velocity .pep-y"),
                $dX: $("#pep-debug-delta .pep-x"),
                $dY: $("#pep-debug-delta .pep-y"),
                $evCoordsX: $("#pep-debug-ev-coords .pep-x"),
                $evCoordsY: $("#pep-debug-ev-coords .pep-y"),
                $posCoordsX: $("#pep-debug-pos-coords .pep-x"),
                $posCoordsY: $("#pep-debug-pos-coords .pep-y")
            }
        }, 0)

        $('body').append($debugDiv);
    };

    // log()
    Pep.prototype.log = function(opts) {
        if (!this.options.debug) return;

        switch (opts.type) {
            case "event":
                this.debugElements.$event.text(opts.event);
                break;
            case "pos-coords":
                this.debugElements.$posCoordsX.text(opts.x);
                this.debugElements.$posCoordsY.text(opts.y);
                break;
            case "event-coords":
                this.debugElements.$evCoordsX.text(opts.x);
                this.debugElements.$evCoordsY.text(opts.y);
                break;
            case "delta":
                this.debugElements.$dX.text(opts.x);
                this.debugElements.$dY.text(opts.y);
                break;
            case "velocity":
                var vel = this.velocity()
                this.debugElements.$velocityX.text(Math.round(vel.x));
                this.debugElements.$velocityY.text(Math.round(vel.y));
                break;
        }
    };

    //  *** Special Easings functions ***
    //    Used for JS easing fallback 
    //    We can use any of these for a 
    //    good intertia ease
    $.extend($.easing, {
        easeOutQuad: function(x, t, b, c, d) {
            return -c * (t /= d) * (t - 2) + b;
        },
        easeOutCirc: function(x, t, b, c, d) {
            return c * Math.sqrt(1 - (t = t / d - 1) * t) + b;
        },
        easeOutExpo: function(x, t, b, c, d) {
            return (t == d) ? b + c : c * (-Math.pow(2, - 10 * t / d) + 1) + b;
        }
    });

    // toggle()
    //  toggle the pep object
    Pep.prototype.toggle = function(on) {
        if (typeof(on) === "undefined") {
            this.disabled = !this.disabled;
        } else {
            this.disabled = !on;
        }
    };

    //  wrap it 
    //    A really lightweight plugin wrapper around the constructor, 
    //    preventing against multiple instantiations.
    $.fn[pluginName] = function(options) {
        return this.each(function() {
            if (!$.data(this, 'plugin_' + pluginName)) {
                var pepObj = new Pep(this, options);
                $.data(this, 'plugin_' + pluginName, pepObj);
                $.pep.peps.push(pepObj)
            }
        });
    };

    //  The   _   ___ ___ 
    //       /_\ | _ \_ _|
    //      / _ \|  _/| | 
    //     /_/ \_\_| |___|
    //
    $.pep = {}
    $.pep.peps = [];
    $.pep.toggleAll = function(on) {
        $.each(this.peps, function(index, pepObj) {
            pepObj.toggle(on);
        });
    };

}(jQuery, window)); 




/*
jquery.ios-shake: A jQuery plugin that detects a 'shake' event using
Safari's accelerometer support in iOS 4.2+.

Revision History:
0.1.0 - 2011-01-24 - initial release

Copyright 2011 Luke D Hagan, http://lukehagan.com

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

*/
(function($) {
    jQuery.shake = function(options) {
        // Merge passed options with defaults
        var opts = jQuery.extend({}, jQuery.shake.defaults, options);

        // insert debug content
        if (opts.debug !== "") {
            var debug = $(opts.debug);
            debug.append('x: <span id="x">0</span><br>');
            debug.append('y: <span id="y">0</span><br>');
            debug.append('z: <span id="z">0</span><br><br>');

            debug.append('shake: <span id="shake">0</span><br>');
            debug.append('shakeaccum: <span id="shakeaccum"></span><br>');
            debug.append('debug: <span id="console"></span><br>');
        }

        // initialize acceleration variables
        var ax = 0;
        var ay = 0;
        var az = 0;
        var axa = 0;
        var aya = 0;
        var aza = 0;

        // initialize misc internal variables
        var shakecount = 0;
        var shakeaccum = 0;
        var curtime = new Date();
        var prevtime = new Date();
        var timeout = false;

        // http://www.mobilexweb.com/samples/ball.html
        // detect whether acceleration is supported
        if (window.DeviceMotionEvent === undefined) {
            if (opts.supported !== "") {
                $(opts.supported).html("Your browser does not support Device Orientation and Motion API. Try it on an iPhone, iPod or iPad with iOS 4.2+.");
            }
        } else {
            window.ondevicemotion = function(event) {
                // get acceleration values
                var acc = event.accelerationIncludingGravity;
                ax = acc.x;
                ay = acc.y;
                az = acc.y;

                // high pass-filter to remove gravity
                // TODO detect and use gyro (no gravity) on supported devices
                // http://iphonedevelopertips.com/user-interface/accelerometer-101.html
                axa = ax - ((ax * opts.hf) + (axa * (1.0 - opts.hf)));
                aya = ay - ((ay * opts.hf) + (aya * (1.0 - opts.hf)));
                aza = az - ((az * opts.hf) + (aza * (1.0 - opts.hf)));

                // detect single shake
                // http://discussions.apple.com/thread.jspa?messageID=8224655
                var beenhere = false;
                var shake = false;
                if (beenhere) {
                    return;
                }
                beenhere = true;
                if (Math.abs(ax - 2 * axa) > opts.violence * 1.5 || Math.abs(ay - 2 * aya) > opts.violence * 2 || Math.abs(az - 2 * aza) > opts.violence * 3 && timeout === false) {
                    shakeaccum += 1;
                }

                // detect shake event (several shakes)
                curtime = new Date();
                var timedelta = curtime.getTime() - prevtime.getTime();
                $('#console').html(timedelta);

                if (timeout) {
                    if (timedelta >= opts.debounce) {
                        timeout = false;
                    } else {
                        timeout = true;
                    }
                    shakeaccum = 0;
                }

                if (shakeaccum >= opts.shakethreshold && timeout === false) {
                    shakecount += 1;
                    $("#shake").html(shakecount);
                    prevtime = curtime;
                    timeout = true;
                    opts.callback.call();
                }
                beenhere = true;
            };
        }
        if (opts.debug !== "") {
            setInterval(function() {
                // output debug data
                $('#x').html(Math.abs(ax - 2 * axa).toFixed(1));
                $('#y').html(Math.abs(ay - 2 * aya).toFixed(1));
                $('#z').html(Math.abs(az - 2 * aza).toFixed(1));
                $('#shakeaccum').html(shakeaccum);
            }, 10);
        }
    };
})(jQuery);

// plugin default options
jQuery.shake.defaults = {
    // debug div id
    debug: "",

    // not supported message div
    supported: "",

    // single shake sensitivity
    violence: 3.0,

    // high-pass filter constant
    hf: 0.2,

    // number of single shakes required to fire a shake event
    shakethreshold: 5,

    // delay between shake events (in ms)
    debounce: 1000,

    // anonymous callback function
    callback: function() {}
}; 








/*!
 * jQuery Transit - CSS3 transitions and transformations
 * (c) 2011-2012 Rico Sta. Cruz <rico@ricostacruz.com>
 * MIT Licensed.
 *
 * http://ricostacruz.com/jquery.transit
 * http://github.com/rstacruz/jquery.transit
 */

(function($) {
    $.transit = {
        version: "0.9.9",

        // Map of $.css() keys to values for 'transitionProperty'.
        // See https://developer.mozilla.org/en/CSS/CSS_transitions#Properties_that_can_be_animated
        propertyMap: {
            marginLeft: 'margin',
            marginRight: 'margin',
            marginBottom: 'margin',
            marginTop: 'margin',
            paddingLeft: 'padding',
            paddingRight: 'padding',
            paddingBottom: 'padding',
            paddingTop: 'padding'
        },

        // Will simply transition "instantly" if false
        enabled: true,

        // Set this to false if you don't want to use the transition end property.
        useTransitionEnd: false
    };

    var div = document.createElement('div');
    var support = {};

    // Helper function to get the proper vendor property name.
    // (`transition` => `WebkitTransition`)
    function getVendorPropertyName(prop) {
        // Handle unprefixed versions (FF16+, for example)
        if (prop in div.style) return prop;

        var prefixes = ['Moz', 'Webkit', 'O', 'ms'];
        var prop_ = prop.charAt(0).toUpperCase() + prop.substr(1);

        if (prop in div.style) {
            return prop;
        }

        for (var i = 0; i < prefixes.length; ++i) {
            var vendorProp = prefixes[i] + prop_;
            if (vendorProp in div.style) {
                return vendorProp;
            }
        }
    }

    // Helper function to check if transform3D is supported.
    // Should return true for Webkits and Firefox 10+.
    function checkTransform3dSupport() {
        div.style[support.transform] = '';
        div.style[support.transform] = 'rotateY(90deg)';
        return div.style[support.transform] !== '';
    }

    var isChrome = navigator.userAgent.toLowerCase().indexOf('chrome') > -1;

    // Check for the browser's transitions support.
    support.transition = getVendorPropertyName('transition');
    support.transitionDelay = getVendorPropertyName('transitionDelay');
    support.transform = getVendorPropertyName('transform');
    support.transformOrigin = getVendorPropertyName('transformOrigin');
    support.transform3d = checkTransform3dSupport();

    var eventNames = {
        'transition': 'transitionEnd',
        'MozTransition': 'transitionend',
        'OTransition': 'oTransitionEnd',
        'WebkitTransition': 'webkitTransitionEnd',
        'msTransition': 'MSTransitionEnd'
    };

    // Detect the 'transitionend' event needed.
    var transitionEnd = support.transitionEnd = eventNames[support.transition] || null;

    // Populate jQuery's `$.support` with the vendor prefixes we know.
    // As per [jQuery's cssHooks documentation](http://api.jquery.com/jQuery.cssHooks/),
    // we set $.support.transition to a string of the actual property name used.
    for (var key in support) {
        if (support.hasOwnProperty(key) && typeof $.support[key] === 'undefined') {
            $.support[key] = support[key];
        }
    }

    // Avoid memory leak in IE.
    div = null;

    // ## $.cssEase
    // List of easing aliases that you can use with `$.fn.transition`.
    $.cssEase = {
        '_default': 'ease',
        'in': 'ease-in',
        'out': 'ease-out',
        'in-out': 'ease-in-out',
        'snap': 'cubic-bezier(0,1,.5,1)',
        // Penner equations
        'easeOutCubic': 'cubic-bezier(.215,.61,.355,1)',
        'easeInOutCubic': 'cubic-bezier(.645,.045,.355,1)',
        'easeInCirc': 'cubic-bezier(.6,.04,.98,.335)',
        'easeOutCirc': 'cubic-bezier(.075,.82,.165,1)',
        'easeInOutCirc': 'cubic-bezier(.785,.135,.15,.86)',
        'easeInExpo': 'cubic-bezier(.95,.05,.795,.035)',
        'easeOutExpo': 'cubic-bezier(.19,1,.22,1)',
        'easeInOutExpo': 'cubic-bezier(1,0,0,1)',
        'easeInQuad': 'cubic-bezier(.55,.085,.68,.53)',
        'easeOutQuad': 'cubic-bezier(.25,.46,.45,.94)',
        'easeInOutQuad': 'cubic-bezier(.455,.03,.515,.955)',
        'easeInQuart': 'cubic-bezier(.895,.03,.685,.22)',
        'easeOutQuart': 'cubic-bezier(.165,.84,.44,1)',
        'easeInOutQuart': 'cubic-bezier(.77,0,.175,1)',
        'easeInQuint': 'cubic-bezier(.755,.05,.855,.06)',
        'easeOutQuint': 'cubic-bezier(.23,1,.32,1)',
        'easeInOutQuint': 'cubic-bezier(.86,0,.07,1)',
        'easeInSine': 'cubic-bezier(.47,0,.745,.715)',
        'easeOutSine': 'cubic-bezier(.39,.575,.565,1)',
        'easeInOutSine': 'cubic-bezier(.445,.05,.55,.95)',
        'easeInBack': 'cubic-bezier(.6,-.28,.735,.045)',
        'easeOutBack': 'cubic-bezier(.175, .885,.32,1.275)',
        'easeInOutBack': 'cubic-bezier(.68,-.55,.265,1.55)'
    };

    // ## 'transform' CSS hook
    // Allows you to use the `transform` property in CSS.
    //
    //     $("#hello").css({ transform: "rotate(90deg)" });
    //
    //     $("#hello").css('transform');
    //     //=> { rotate: '90deg' }
    //
    $.cssHooks['transit:transform'] = {
        // The getter returns a `Transform` object.
        get: function(elem) {
            return $(elem).data('transform') || new Transform();
        },

        // The setter accepts a `Transform` object or a string.
        set: function(elem, v) {
            var value = v;

            if (!(value instanceof Transform)) {
                value = new Transform(value);
            }

            // We've seen the 3D version of Scale() not work in Chrome when the
            // element being scaled extends outside of the viewport.  Thus, we're
            // forcing Chrome to not use the 3d transforms as well.  Not sure if
            // translate is affectede, but not risking it.  Detection code from
            // http://davidwalsh.name/detecting-google-chrome-javascript
            if (support.transform === 'WebkitTransform' && !isChrome) {
                elem.style[support.transform] = value.toString(true);
            } else {
                elem.style[support.transform] = value.toString();
            }

            $(elem).data('transform', value);
        }
    };

    // Add a CSS hook for `.css({ transform: '...' })`.
    // In jQuery 1.8+, this will intentionally override the default `transform`
    // CSS hook so it'll play well with Transit. (see issue #62)
    $.cssHooks.transform = {
        set: $.cssHooks['transit:transform'].set
    };

    // jQuery 1.8+ supports prefix-free transitions, so these polyfills will not
    // be necessary.
    if ($.fn.jquery < "1.8") {
        // ## 'transformOrigin' CSS hook
        // Allows the use for `transformOrigin` to define where scaling and rotation
        // is pivoted.
        //
        //     $("#hello").css({ transformOrigin: '0 0' });
        //
        $.cssHooks.transformOrigin = {
            get: function(elem) {
                return elem.style[support.transformOrigin];
            },
            set: function(elem, value) {
                elem.style[support.transformOrigin] = value;
            }
        };

        // ## 'transition' CSS hook
        // Allows you to use the `transition` property in CSS.
        //
        //     $("#hello").css({ transition: 'all 0 ease 0' });
        //
        $.cssHooks.transition = {
            get: function(elem) {
                return elem.style[support.transition];
            },
            set: function(elem, value) {
                elem.style[support.transition] = value;
            }
        };
    }

    // ## Other CSS hooks
    // Allows you to rotate, scale and translate.
    registerCssHook('scale');
    registerCssHook('translate');
    registerCssHook('rotate');
    registerCssHook('rotateX');
    registerCssHook('rotateY');
    registerCssHook('rotate3d');
    registerCssHook('perspective');
    registerCssHook('skewX');
    registerCssHook('skewY');
    registerCssHook('x', true);
    registerCssHook('y', true);

    // ## Transform class
    // This is the main class of a transformation property that powers
    // `$.fn.css({ transform: '...' })`.
    //
    // This is, in essence, a dictionary object with key/values as `-transform`
    // properties.
    //
    //     var t = new Transform("rotate(90) scale(4)");
    //
    //     t.rotate             //=> "90deg"
    //     t.scale              //=> "4,4"
    //
    // Setters are accounted for.
    //
    //     t.set('rotate', 4)
    //     t.rotate             //=> "4deg"
    //
    // Convert it to a CSS string using the `toString()` and `toString(true)` (for WebKit)
    // functions.
    //
    //     t.toString()         //=> "rotate(90deg) scale(4,4)"
    //     t.toString(true)     //=> "rotate(90deg) scale3d(4,4,0)" (WebKit version)
    //
    function Transform(str) {
        if (typeof str === 'string') {
            this.parse(str);
        }
        return this;
    }

    Transform.prototype = {
        // ### setFromString()
        // Sets a property from a string.
        //
        //     t.setFromString('scale', '2,4');
        //     // Same as set('scale', '2', '4');
        //
        setFromString: function(prop, val) {
            var args = (typeof val === 'string') ? val.split(',') : (val.constructor === Array) ? val : [val];

            args.unshift(prop);

            Transform.prototype.set.apply(this, args);
        },

        // ### set()
        // Sets a property.
        //
        //     t.set('scale', 2, 4);
        //
        set: function(prop) {
            var args = Array.prototype.slice.apply(arguments, [1]);
            if (this.setter[prop]) {
                this.setter[prop].apply(this, args);
            } else {
                this[prop] = args.join(',');
            }
        },

        get: function(prop) {
            if (this.getter[prop]) {
                return this.getter[prop].apply(this);
            } else {
                return this[prop] || 0;
            }
        },

        setter: {
            // ### rotate
            //
            //     .css({ rotate: 30 })
            //     .css({ rotate: "30" })
            //     .css({ rotate: "30deg" })
            //     .css({ rotate: "30deg" })
            //
            rotate: function(theta) {
                this.rotate = unit(theta, 'deg');
            },

            rotateX: function(theta) {
                this.rotateX = unit(theta, 'deg');
            },

            rotateY: function(theta) {
                this.rotateY = unit(theta, 'deg');
            },

            // ### scale
            //
            //     .css({ scale: 9 })      //=> "scale(9,9)"
            //     .css({ scale: '3,2' })  //=> "scale(3,2)"
            //
            scale: function(x, y) {
                if (y === undefined) {
                    y = x;
                }
                this.scale = x + "," + y;
            },

            // ### skewX + skewY
            skewX: function(x) {
                this.skewX = unit(x, 'deg');
            },

            skewY: function(y) {
                this.skewY = unit(y, 'deg');
            },

            // ### perspectvie
            perspective: function(dist) {
                this.perspective = unit(dist, 'px');
            },

            // ### x / y
            // Translations. Notice how this keeps the other value.
            //
            //     .css({ x: 4 })       //=> "translate(4px, 0)"
            //     .css({ y: 10 })      //=> "translate(4px, 10px)"
            //
            x: function(x) {
                this.set('translate', x, null);
            },

            y: function(y) {
                this.set('translate', null, y);
            },

            // ### translate
            // Notice how this keeps the other value.
            //
            //     .css({ translate: '2, 5' })    //=> "translate(2px, 5px)"
            //
            translate: function(x, y) {
                if (this._translateX === undefined) {
                    this._translateX = 0;
                }
                if (this._translateY === undefined) {
                    this._translateY = 0;
                }

                if (x !== null && x !== undefined) {
                    this._translateX = unit(x, 'px');
                }
                if (y !== null && y !== undefined) {
                    this._translateY = unit(y, 'px');
                }

                this.translate = this._translateX + "," + this._translateY;
            }
        },

        getter: {
            x: function() {
                return this._translateX || 0;
            },

            y: function() {
                return this._translateY || 0;
            },

            scale: function() {
                var s = (this.scale || "1,1").split(',');
                if (s[0]) {
                    s[0] = parseFloat(s[0]);
                }
                if (s[1]) {
                    s[1] = parseFloat(s[1]);
                }

                // "2.5,2.5" => 2.5
                // "2.5,1" => [2.5,1]
                return (s[0] === s[1]) ? s[0] : s;
            },

            rotate3d: function() {
                var s = (this.rotate3d || "0,0,0,0deg").split(',');
                for (var i = 0; i <= 3; ++i) {
                    if (s[i]) {
                        s[i] = parseFloat(s[i]);
                    }
                }
                if (s[3]) {
                    s[3] = unit(s[3], 'deg');
                }

                return s;
            }
        },

        // ### parse()
        // Parses from a string. Called on constructor.
        parse: function(str) {
            var self = this;
            str.replace(/([a-zA-Z0-9]+)\((.*?)\)/g, function(x, prop, val) {
                self.setFromString(prop, val);
            });
        },

        // ### toString()
        // Converts to a `transition` CSS property string. If `use3d` is given,
        // it converts to a `-webkit-transition` CSS property string instead.
        toString: function(use3d) {
            var re = [];

            for (var i in this) {
                if (this.hasOwnProperty(i)) {
                    // Don't use 3D transformations if the browser can't support it.
                    if ((!support.transform3d) && (
                    (i === 'rotateX') || (i === 'rotateY') || (i === 'perspective') || (i === 'transformOrigin'))) {
                        continue;
                    }

                    if (i[0] !== '_') {
                        if (use3d && (i === 'scale')) {
                            re.push(i + "3d(" + this[i] + ",1)");
                        } else if (use3d && (i === 'translate')) {
                            re.push(i + "3d(" + this[i] + ",0)");
                        } else {
                            re.push(i + "(" + this[i] + ")");
                        }
                    }
                }
            }

            return re.join(" ");
        }
    };

    function callOrQueue(self, queue, fn) {
        if (queue === true) {
            self.queue(fn);
        } else if (queue) {
            self.queue(queue, fn);
        } else {
            fn();
        }
    }

    // ### getProperties(dict)
    // Returns properties (for `transition-property`) for dictionary `props`. The
    // value of `props` is what you would expect in `$.css(...)`.
    function getProperties(props) {
        var re = [];

        $.each(props, function(key) {
            key = $.camelCase(key); // Convert "text-align" => "textAlign"
            key = $.transit.propertyMap[key] || $.cssProps[key] || key;
            key = uncamel(key); // Convert back to dasherized

            if ($.inArray(key, re) === -1) {
                re.push(key);
            }
        });

        return re;
    }

    // ### getTransition()
    // Returns the transition string to be used for the `transition` CSS property.
    //
    // Example:
    //
    //     getTransition({ opacity: 1, rotate: 30 }, 500, 'ease');
    //     //=> 'opacity 500ms ease, -webkit-transform 500ms ease'
    //
    function getTransition(properties, duration, easing, delay) {
        // Get the CSS properties needed.
        var props = getProperties(properties);

        // Account for aliases (`in` => `ease-in`).
        if ($.cssEase[easing]) {
            easing = $.cssEase[easing];
        }

        // Build the duration/easing/delay attributes for it.
        var attribs = '' + toMS(duration) + ' ' + easing;
        if (parseInt(delay, 10) > 0) {
            attribs += ' ' + toMS(delay);
        }

        // For more properties, add them this way:
        // "margin 200ms ease, padding 200ms ease, ..."
        var transitions = [];
        $.each(props, function(i, name) {
            transitions.push(name + ' ' + attribs);
        });

        return transitions.join(', ');
    }

    // ## $.fn.transition
    // Works like $.fn.animate(), but uses CSS transitions.
    //
    //     $("...").transition({ opacity: 0.1, scale: 0.3 });
    //
    //     // Specific duration
    //     $("...").transition({ opacity: 0.1, scale: 0.3 }, 500);
    //
    //     // With duration and easing
    //     $("...").transition({ opacity: 0.1, scale: 0.3 }, 500, 'in');
    //
    //     // With callback
    //     $("...").transition({ opacity: 0.1, scale: 0.3 }, function() { ... });
    //
    //     // With everything
    //     $("...").transition({ opacity: 0.1, scale: 0.3 }, 500, 'in', function() { ... });
    //
    //     // Alternate syntax
    //     $("...").transition({
    //       opacity: 0.1,
    //       duration: 200,
    //       delay: 40,
    //       easing: 'in',
    //       complete: function() { /* ... */ }
    //      });
    //
    $.fn.transition = $.fn.transit = function(properties, duration, easing, callback) {
        var self = this;
        var delay = 0;
        var queue = true;

        // Account for `.transition(properties, callback)`.
        if (typeof duration === 'function') {
            callback = duration;
            duration = undefined;
        }

        // Account for `.transition(properties, duration, callback)`.
        if (typeof easing === 'function') {
            callback = easing;
            easing = undefined;
        }

        // Alternate syntax.
        if (typeof properties.easing !== 'undefined') {
            easing = properties.easing;
            delete properties.easing;
        }

        if (typeof properties.duration !== 'undefined') {
            duration = properties.duration;
            delete properties.duration;
        }

        if (typeof properties.complete !== 'undefined') {
            callback = properties.complete;
            delete properties.complete;
        }

        if (typeof properties.queue !== 'undefined') {
            queue = properties.queue;
            delete properties.queue;
        }

        if (typeof properties.delay !== 'undefined') {
            delay = properties.delay;
            delete properties.delay;
        }

        // Set defaults. (`400` duration, `ease` easing)
        if (typeof duration === 'undefined') {
            duration = $.fx.speeds._default;
        }
        if (typeof easing === 'undefined') {
            easing = $.cssEase._default;
        }

        duration = toMS(duration);

        // Build the `transition` property.
        var transitionValue = getTransition(properties, duration, easing, delay);

        // Compute delay until callback.
        // If this becomes 0, don't bother setting the transition property.
        var work = $.transit.enabled && support.transition;
        var i = work ? (parseInt(duration, 10) + parseInt(delay, 10)) : 0;

        // If there's nothing to do...
        if (i === 0) {
            var fn = function(next) {
                self.css(properties);
                if (callback) {
                    callback.apply(self);
                }
                if (next) {
                    next();
                }
            };

            callOrQueue(self, queue, fn);
            return self;
        }

        // Save the old transitions of each element so we can restore it later.
        var oldTransitions = {};

        var run = function(nextCall) {
            var bound = false;

            // Prepare the callback.
            var cb = function() {
                if (bound) {
                    self.unbind(transitionEnd, cb);
                }

                if (i > 0) {
                    self.each(function() {
                        this.style[support.transition] = (oldTransitions[this] || null);
                    });
                }

                if (typeof callback === 'function') {
                    callback.apply(self);
                }
                if (typeof nextCall === 'function') {
                    nextCall();
                }
            };

            if ((i > 0) && (transitionEnd) && ($.transit.useTransitionEnd)) {
                // Use the 'transitionend' event if it's available.
                bound = true;
                self.bind(transitionEnd, cb);
            } else {
                // Fallback to timers if the 'transitionend' event isn't supported.
                window.setTimeout(cb, i);
            }

            // Apply transitions.
            self.each(function() {
                if (i > 0) {
                    this.style[support.transition] = transitionValue;
                }
                $(this).css(properties);
            });
        };

        // Defer running. This allows the browser to paint any pending CSS it hasn't
        // painted yet before doing the transitions.
        var deferredRun = function(next) {
            this.offsetWidth; // force a repaint
            run(next);
        };

        // Use jQuery's fx queue.
        callOrQueue(self, queue, deferredRun);

        // Chainability.
        return this;
    };

    function registerCssHook(prop, isPixels) {
        // For certain properties, the 'px' should not be implied.
        if (!isPixels) {
            $.cssNumber[prop] = true;
        }

        $.transit.propertyMap[prop] = support.transform;

        $.cssHooks[prop] = {
            get: function(elem) {
                var t = $(elem).css('transit:transform');
                return t.get(prop);
            },

            set: function(elem, value) {
                var t = $(elem).css('transit:transform');
                t.setFromString(prop, value);

                $(elem).css({
                    'transit:transform': t
                });
            }
        };

    }

    // ### uncamel(str)
    // Converts a camelcase string to a dasherized string.
    // (`marginLeft` => `margin-left`)
    function uncamel(str) {
        return str.replace(/([A-Z])/g, function(letter) {
            return '-' + letter.toLowerCase();
        });
    }

    // ### unit(number, unit)
    // Ensures that number `number` has a unit. If no unit is found, assume the
    // default is `unit`.
    //
    //     unit(2, 'px')          //=> "2px"
    //     unit("30deg", 'rad')   //=> "30deg"
    //
    function unit(i, units) {
        if ((typeof i === "string") && (!i.match(/^[\-0-9\.]+$/))) {
            return i;
        } else {
            return "" + i + units;
        }
    }

    // ### toMS(duration)
    // Converts given `duration` to a millisecond string.
    //
    //     toMS('fast')   //=> '400ms'
    //     toMS(10)       //=> '10ms'
    //
    function toMS(duration) {
        var i = duration;

        // Allow for string durations like 'fast'.
        if ($.fx.speeds[i]) {
            i = $.fx.speeds[i];
        }

        return unit(i, 'ms');
    }

    // Export some functions for testable-ness.
    $.transit.getTransitionValue = getTransition;
})(jQuery); 
