/*!
 * Response   Responsive design toolkit
 * @link      https://github.com/pixeldust/response.js
 * @author    Jason Williams
 * @author    Ryan Van Etten (c) 2011 (original)
 * @license   MIT
 * @version   0.3.0.20120224
 * @requires  jQuery 1.7+ or Zepto 0.8+
 */

;window.Response = (function(namespace, $, window, doc, undef) {
    
    // If you want to alias Response to a shorter name in your scripts you can do:
    // (function(R){  /* R works as alias for Response in here */  }(Response));
    // If you have a naming conflict with another window.Response then it can be 
    // avoided be changing the first line to window.MyCustomName. You can change 
    // the event namespace in the very last line from 'Response' to 'MyCustomName'
    
    'use strict'; // invoke strict mode
              
    // Combine local vars/funcs into one statement:    
    
    var Response
    //, arrPrototype = []                     // Array.prototype
      , docElem = doc.documentElement         // <html> element.
      , $doc = $(doc)                         // Cache selector.
      , $window = $(window)                   // Cache selector.
      , initContentKey = 'i' + namespace      // Key for storing initial (no-js) content. Default: 'iResponse'
      , deviceDpr = 1    					  // Default to 1 for now
      
      , doError = function(msg) {
            // Error handling. (Throws exception.)
            // Use Ctrl+F to find specific @errors
            throw 'Error using Response.' + (msg || '');
        }
        
      , namespaceIt = function(eventName) {
            // namespace string is passed in the invocation @ the way bottom.
            // By default this turns 'resize' into 'resize.Response' etc.
            return eventName + '.' + namespace;
        } 
        
      , supportsNativeJSON = !!window.JSON && !!JSON.parse
        
      , supportsNativeDataset = (function(testElem) {
            //Test technique @link github.com/Modernizr/Modernizr/blob/master/feature-detects/dom-dataset.js
            //true if element.dataset.foo works natively
            testElem.setAttribute('data-a-b', namespace);
            return !!(testElem.dataset && testElem.dataset.aB === namespace);
        }(doc.createElement(namespace))) // Use namespace as dummy string.
        
        //, navUA = window.navigator.userAgent
        //, isWebkitOrGecko = /webkit\/|gecko\//i.test(navUA)

        // Select elem only if not already selected.
        // github.com/madrobby/zepto/issues/349#issuecomment-3793000
        
      , selectOnce = $ !== window.jQuery ? $ : function(ukn) { return ukn instanceof $ ? ukn : $(ukn); }
        
      , getNative = function(e) {
            // stackoverflow.com/questions/9119823/safest-way-to-detect-native-dom-element
            // The isElement test used is like that of v.is.ele(o) from github.com/ded/valentine
            // See @link jsperf.com/get-native
            // Must be a native element or selector containing them to pass:
            return e && e.nodeType && e.nodeType === 1 ? e : e[0] && e[0].nodeType && e[0].nodeType === 1 ? e[0] : false;
        }
            
        /** 
         * Local version of Object.create with polyfill that supports only the 1st arg. It creates
         * an empty object whose prototype is set to the specified prototypeObject. (Referred to as 
         * prototypal inheritance or differential inheritance.)
         *
         * Docs @link developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Object/create
         * FYI there is a full polyfill @link github.com/kriskowal/es5-shim
         */
         
      , objectCreate = Object.create || function (prototypeObject) {
            
            function Type () {}                 // Function to output empty object.
            Type.prototype = prototypeObject;   // Set prototype property to the prototypeObj.
            return new Type();                  // Instantiate the new object.
            
            /* Alternative version:
            var object;
            function Type () {}                 // Function to output empty object.
            Type.prototype = prototypeObject;   // Set prototype property to the prototypeObj.
            object = new Type();                // Instantiate the new object.
            object.__proto__ = prototypeObject; // Ensure `Object.getPrototypeOf` works on objects created by this.
            return object;
            */
        }

        // Use native isArray when available
      , isArray = Array.isArray || $.isArray
      
      // Local map func adapted from github.com/ded/valentine
      // A lot of maps ar eused here so I want a local version here faster than $.map
      // Could use native version where avail and fallback to jQuery like...
      //, map = 'map' in arrPrototype ? function (arr, callback) { return arrPrototype.map.call(arr, callback); } : $.map
      // see v.map @link github.com/ded/valentine
      // ...but the loop below works everywhere, is as fast as the native call, and ends up using about the same amount of code overall.
      
      , map = function (arr, callback, scope) {
            var r = []
              , i = -1
              , len = arr.length;
            while ( i++ < len ) {
                i in arr && ( r[i] = callback.call(scope, arr[i]) );
            }
            return r;
        }
            
        // Adapted from the native forEach / Valentine (v.each) / jQuery.each. Optimized for use here. Callbacks
        // the form (index, value) as args. Scope (thisArg) not supported. Works on arrays/selectors. It's like
        // Array.prototype.forEach() but w/o support for the thisArg, and is a faster locally.
        // jsperf.com/each-loops
        // github.com/ded/valentine
        // developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/forEach
        
      , each = function (arr, callback) {
            var i = -1
              , len = arr.length;
            while ( i++ < len ) {
                i in arr && callback(i, arr[i]);
            }
        }
        
    //   not needed    
    // , indexOf = nativ ? function (a, el, start) { return a.indexOf(el); } : function(a, el) { return $.inArray(el, a); }

      , regexFunkyPunc = /[^a-z0-9\-\_\.]/gi
      , regexCamels = /([a-z])([A-Z])/g
      , regexDashB4 = /-(.)/g
      , regexDataPrefix = /^data-(.+)$/
      , regexSpace = /\s+/
      , regexPeriods = /\./g
      
      , camelize = function (str) {// Remove data- prefix and convert remaining dashed string to camelCase.
            // Converts data-pulp-fiction to pulpFiction
            // via camelize @link github.com/ded/bonzo
            return str.replace(regexDataPrefix, '$1').replace(regexDashB4, function (m, m1) {
                return m1.toUpperCase();
            });
        }
      
      , datatize = function(str) {//str should be camelCasedString
            // Converts nameLikeThis (or data-nameLikeThis) to data-name-like-this
            // adapted from decamelize @link github.com/ded/bonzo
            // Make sure there's no data- already in str for it to work right in IE8.
            return 'data-' + (str ? str.replace(regexDataPrefix, '$1').replace(regexCamels, '$1-$2').toLowerCase() : str);
        }

        /*
         * Techically data attributes names can contain uppercase in HTML, but, The DOM lowercases attributes, so they must 
         * be lowercase regardless when we target them in jQuery. Force them lowercase here to prevent issues. Removing all
         * punc marks except for dashes, underscores, and periods so that we don't have to worry about escaping anything crazy.
         * Rules @link dev.w3.org/html5/spec/Overview.html#custom-data-attribute
         * jQuery selectors @link api.jquery.com/category/selectors/ 
         */
         
      , sanitize = function(key) {//Allow lowercase alphanumerics, dashes, underscores, and periods.
            return 'string' === typeof key ? key.toLowerCase().replace(regexFunkyPunc, '') : false;
        }
        

        /**
         * Response.render                Converts stringified primitives back to JavaScript.
         *                                Adapted from dataValue() @link github.com/ded/bonzo
         *
         * @param   string|other    s     String to render back to its correct JavaScript value.
         *                                If s is not a string then it is returned unaffected. 
         * @return  converted data
         *
         */
                
      , render = function(s) {
            var n;
            return (!s || 'string' !== typeof s ? s              // unchanged
                            : 'true' === s      ? true           // convert "true" to true
                            : 'false' === s     ? false          // convert "false" to false
                            : 'undefined' === s ? undef          // convert "undefined" to undefined
                            : 'null' === s      ? null           // convert "null" to null
                            : isFinite((n = parseFloat(s))) ? n  // convert "1000" to 1000
                            : s                                  // unchanged
            );
        }//render
      
        /**
         * Response.merge
         * @since 0.3.0
         * Generic method for merging objects and/or arrays.
         * This is fast and simple method. For deep merges see jQuery.extend()
         * Falsey values in adds do not overwrite values in base, unless
         * the optional overwrite param is explicitly set to true.
         * @param   object|array   base
         * @param   object|array   adds
         * @param   boolean        overwrite
         */
 
      , merge = function(base, adds, overwrite) {
            $.each(adds, function(k, v) {
                //base[k] = v || (!overwrite ? base[k] : v);
                base[k]= v || overwrite ? v : base[k];
            });
            return base;
        }
        
        /**
         * Response.route()                               Handler method for accepting args as arrays or singles, for 
         *                                                callbacks 
         *   
         * @param   array|other         ukn               If ukn is an array then the callback gets called on each
         *                                                array member. Otherwise the callback is called on ukn itself.
         * @param   callback            callback          The function to call on ukn(s).
         *
         * @return  array|other      updated ukn
         * @since   0.3.0
         *
         */     
        
      , route = function(ukn, callback) {
            return isArray(ukn) ? map(ukn, callback) : callback(ukn); 
        }
        
        /**
         * .dataset()          Cross browser implementation of HTML5 dataset
         * 
         *                     The chainable syntax can be exposed to jQuery elements 
         *                     by calling Response.chain()
         * 
         * Chainable form:  $('div').dataset(key)               // get (from first matched element)
         *                  $('div').dataset([key])             // get and render (See Response.render)
         *                  $('div').dataset(key, value)        // set (sets all matched elems)
         *                  $('div').dataset({k1:val, k2:val})  // set multiple attrs at once (on all matched elems)
         *                  $('div').deletes(keys)              // delete attrs (space-separated string)
         * 
         * Non-chainable:   Response.dataset(elem, key)               // get (elem can be native or jQuery elem)
         *                  Response.dataset(elem, [key])             // get and render (See Response.render)
         *                  Response.dataset(elem, key, value)        // set
         *                  Response.dataset(elem, {k1:val, k2:val})  // set multiple attrs at once
         *                  Response.deletes(elem, keys)              // delete attrs (space-separated string)
         * 
         *
         * @since 0.3.0
         */
        
      , datasetChainable = function(key, value) {
      
            var numOfArgs = arguments.length
              , elem = getNative(this) || doError('dataset @elem')
              , ret
              , renderData = false
              , n
            ;//var
            
            if ( numOfArgs ) {
                
                if ( isArray(key) ) {
                    renderData = true;
                    key = key[0];
                }
                
                if ( 'string' === typeof key ) {
                
                    // key || doError('dataset @key'); // Make sure key is not an empty string.
                    
                    key = datatize(key);
                    
                    if ( 1 === numOfArgs ) {//GET
                        ret = elem.getAttribute(key);
                        return renderData ? render(ret) : ret;
                    }
                    
                    if ( this === elem || 2 > (n = this.length || 1) ) {//SET single elem
                        //value = undef !== value ? value : '';
                        elem.setAttribute(key, value);
                    }
                    
                    else {//SET for group of selected elems
                        while( n-- ) {// n starts as # of elems in selector and stops at 0
                            n in this && datasetChainable.apply(this[n], arguments);
                        }
                    }
                }
                
                else if ( key instanceof Object ) {//SET
                    // Plain object containing key/value pairs:
                    for (n in key) {
                        if (key.hasOwnProperty(n)) {
                            datasetChainable.call(this, n, key[n]);
                        }
                    }
                }
                
                return this; // chain
            
            }//1 or more args

            // ** Zero args **
            // Return object containing all the data attributes.
            // Use the native dataset when available:
            if ( supportsNativeDataset ) {
               return elem.dataset; // DOMStringMap
            }
                        
            // Fallback to manually reading all the attributes:
            
            ret = {};      // Plain object for fallback output.
            
            /* In jQuery 1.7 this works, but not Zepto 0.8:
            $.map( $(elem).data(), function(attValue, attName) {
                if ( elem.hasAttribute(datatize(attName)) ) {
                    ret[camelize(attName)] = '' + attValue; 
                }
            });
            */
            
            /* same goes for this, works in  jQuery 1.7 but not Zepto 0.8:
            var allData = $(elem).data(); // This gives an object containing all the data attached to elem in the
                                     // DOM *and* in the data cache. To normalize with the native elem.dataset return 
                                     // we need to convert the data to strings and filter the object so it only includes 
                                     // the the data in the DOM (the data attributes).
            for ( n in allData ) {// n is the attribute name
                if ( allData.hasOwnProperty(n) && elem.hasAttribute(datatize(n)) ) {
                    ret[n] = allData[n].toString(); 
                }
            }
            */

            // Fallback that works everywhere. Adapated from:
            // stackoverflow.com/questions/4187032/get-list-of-data-attributes-using-javascript-jquery
            
            $.each(elem.attributes, function(i, attr) {
                if (regexDataPrefix.test(attr.nodeName)) {
                    var key = camelize(attr.nodeName);
                    ret[key] = attr.nodeValue;
                }
            });
            
            return ret;
                     
        }//datasetChainable
        
        
        /**
         * .deletes()
         * 
         *
         * @since 0.3.0
         */
         
      , deletesChainable = function(keys) {
            // could make this take a little less code using sending the space-separated string 
            // straight to removeAttr but Zepto's removeAttr doesn't support space-separated keys
              if ( 'string' === typeof keys ) {
                /* this works in both jQuery and Zepto:
                each(selectOnce(this), function(i, el) {
                    each(keys.split(regexSpace), function(i, key) {
                        el.removeAttribute(datatize(key));
                    });
                });  this is better and still works in both: */
                var $elems = selectOnce(this);
                each(keys.split(regexSpace), function(i, key) {
                    key && $elems.removeAttr(datatize(key)); 
                });
            }
            return this;
        }//deletesChainable
        
        /**
         * Response.dataset()        See datasetChainable above
         *                           This is the non-chainable version. It grabs the thisArg
         *                           and calls the chainable version
         *
         * @since 0.3.0
         */
         
      , dataset = function(elem, key, value) {
            return 2 < arguments.length ? datasetChainable.call(elem, key, value) : datasetChainable.call(elem, key);
            //OR return datasetChainable.apply(elem, arrPrototype.slice.call(arguments).slice(1) );
        }
        
        /**
         * Response.deletes(elem, keys)           Delete HTML5 data attributes (remove them from them DOM)
         * 
         * @since 0.3.0
         *                             Where native DOM dataset is supported you can do: `delete elem.dataset.foo`
         * 
         * @param   object   elem     is a native element or jQuery object e.g. document.body or $('body')
         * 
         * @param   string   keys     one or more space-separated data attribute keys (names) to delete (removed
         *                            from the DOM) Should be camelCased or lowercase.
         * 
         * @example  Response.deletes(document.body, 'casaBlanca movie'); // Removes data-casa-blanca and data-movie
         *                                                                // from the <body> element.
         * 
         * @example  Response.deletes($(div), 'casaBlanca movie')         // Removes data-casa-blanca and data-movie
         *                                                                // from all divs.
         */
         
      , deletes = function(elem, keys) {
            return deletesChainable.call(elem, keys);
        }
        
        // Local version of jQuery.grep b/c Zepto ain't got no grep.
        // Filter out array values that don't pass the callback:
        
      , grep = function(elems, callback, inverse) {
            var i, ret = [], len = elems.length;
            for (i = 0; i < len; i++) {
                if ( !inverse !== !callback(elems[i], i) ) {//do like this to make sure both are boolean
                    ret.push(elems[i]);
                }
            }
            return ret;
        }
        
        /**
         * Response.action           A hook for calling functions on both the ready and resize events.
         *
         * @link     http://responsejs.com/#action
         * @since    0.1.3
         * @param    callback|array  action  is the callback name or array of callback names to call.
         *
         * @example  Response.action(myFunc1);            // call myFunc1() on ready/resize
         * @example  Response.action([myFunc1, myFunc2]); // call myFunc1(), myFunc2() ...
         */    

      , action = function (action) {
            route(action, function (actionFunc) {
                'function' === typeof actionFunc || doError('action'); 
                $doc.ready(actionFunc);
                $window.resize(actionFunc);
            });
            return this; // chainable
        }//action

      , deviceW = window.screen.width            // These don't change so we can just set them.
      , deviceH = window.screen.height           // See @link responsejs.com/labs/dimensions/
      , deviceMax = Math.max(deviceW, deviceH)

      // Functions for viewport width and height. See @link responsejs.com/labs/dimensions/
      // Use the faster clientWidth/clientHeight methods if available. Fallback to jQuery calculation.
      
      , viewportW = docElem.clientWidth  ? function() { return docElem.clientWidth; }
                                         : function() { return $window.width(); }     
      , viewportH = docElem.clientHeight ? function() { return docElem.clientHeight; }
                                         : function() { return $window.height(); }
                                                     
      , inORout = function(curr, min, max) {
            // Local boolean function to handle basic range comparisons.
            // Returns true if curr equals min or max, or is any number in between.
            min = min || 0; // Default min.
            return !max ? curr >= min : curr >= min && curr <= max;
        }
                
        /** 
         * Response.overflowX       Get the number of pixels that the document width exceeds viewport width.
         *
         * @return  integer   pixel amount that horizontal content overflows viewport (or 0 if there's no overflow).
         */
         
      , overflowX = function() {
            var difference = $doc.width() - viewportW();
            return 0 < difference ? difference : 0;
        }
        
        /** 
         * Response.overflowY       Get the number of pixels that the document height exceeds viewport height.
         *
         * @return  integer   pixel amount that vertical content overflows the viewport (or 0 if there's no overflow).
         */
         
      , overflowY = function() {
            var difference = $doc.height() - viewportH();
            return 0 < difference ? difference : 0;
        }
        
        // Cross-browser versions of window.scrollX and window.scrollY
        // Compatibiliy notes @link developer.mozilla.org/en/DOM/window.scrollY
        // Performance tests @link jsperf.com/scrollx-cross-browser-compatible
        // Using native here b/c Zepto doesn't support .scrollLeft() /scrollTop()
        // In jQuery you can do $(window).scrollLeft() and $(window).scrollTop()
        
      , scrollX = function(){ return window.pageXOffset || docElem.scrollLeft; } // Response.scrollX()
      , scrollY = function(){ return window.pageYOffset || docElem.scrollTop; }  // Response.scrollY()
            
        /**
         * area methods inX/inY/inViewport
         * 
         * In non-chainable contexts, these are booleans.
         * In chainable contexts, they are filters.
         *
         * @since   0.3.0
         *
         * Inspired by @link appelsiini.net/projects/viewport
         *
         */
                  
      , axis = function(elemStart, elemLength, viewportStart, viewportLength, verge) {
            // handler for the inX/inY methods
            verge = 'number' === typeof verge ? verge : 0;
            return viewportStart + viewportLength >= elemStart - verge && elemStart + elemLength >= viewportStart - verge;
        }
        
        // The verge is the amount of pixels to act as a cushion around the viewport. It can be any 
        // integer. If verge is zero, then the inX/inY/inViewport methods are exact. If verge is set to 100, 
        // then those methods return true when for elements that are are in the viewport *or* near it, 
        // with *near* being defined as within 100 pixels outside the viewport edge. Elements immediately 
        // outside the viewport are 'on the verge' of being scrolled to.
            
      , inX = function(elem, verge) {
            elem = selectOnce(elem); // Make sure elem is selector. elem.length is 0 if selector is empty.
            return elem.length && axis(elem.offset().left, elem.width(), scrollX(), viewportW(), verge);
        }
                
      , inY = function(elem, verge) {
            elem = selectOnce(elem); // Make sure elem is selector. elem.length is 0 if selector is empty.
            return elem.length && axis(elem.offset().top, elem.height(), scrollY(), viewportH(), verge);
        }
                
      , inViewport = function(elem, verge) {
            // If there's no overflow then the entire axis in is view. Responsive sites typically only
            // overflow in one direction, so one of these should pass quickly from the overflow check:
            return (!overflowX() || inX(elem, verge)) && (!overflowY() || inY(elem, verge));
        }
                            
        /**
         * Response.band()       Test if a min/max-width breakpoint range is active. 
         *
         * @since   0.1.1
         * @param   integer      min    is the min-width in pixels
         * @param   integer      max    is the max-width in pixels
         * @param	boolean		 usedpr should be take device pixel density into account
         * @return  boolean
         * @example w/ min only:    Response.band(481)   // true when viewport width is 481px+
         * @example w/ min and max: Response.band(0,480) // true when viewport width is 0-480px
         */
         
      , band = function (min, max, usedpr) {
    	  	return inORout(usedpr ? deviceDpr*viewportW() : viewportW(), min, max);
        }
    
        /**
         * Response.wave()       Test if a min/max-height breakpoint range is active. 
         *
         * @since   0.2.9
         * @param   integer      min    is the min-height in pixels
         * @param   integer      max    is the max-height in pixels
         * @param	boolean		 usedpr should be take device pixel density into account
         * @return  boolean
         * @example w/ min only:    Response.wave(481)   // true when viewport height is 481px+
         * @example w/ min and max: Response.wave(0,480) // true when viewport height is 0-480px
         */    
     
      , wave = function (min, max, usedpr) {
    	  return inORout(usedpr ? deviceDpr*viewportH() : viewportH(), min, max);
        }
       
      , device = {
    
            /**
             * Response.device.band()       Test if a min/max-device-width range is active. 
             *
             * @since   0.2.9
             * @param   integer      min    is the min-device-width in pixels
             * @param   integer      max    is the max-device-width in pixels
             * @return  boolean
             */
         
            band: function (min, max) {
                return inORout(deviceW, min, max);
            }
        
            /**
             * Response.device.wave()       Test if a min/max-device-height range is active. 
             *
             * @since   0.2.9
             * @param   integer      min    is the min-device-height in pixels
             * @param   integer      max    is the max-device-height in pixels
             * @return  boolean
             */
         
          , wave: function (min, max) {
                return inORout(deviceH, min, max);
            }
            
        }//device

        /**
         * Response.media                 A normalized version of window.matchMedia that uses either the 
         *                                standard version or the the Microsoft version. Response.media's 
         *                                syntax is exactly like window.matchMedia's syntax.
         *
         *                                Response.media is natively supported in Chrome 9+/FF6+/Safari 5.1+/IE10 PP3+
         *                                See @link developer.mozilla.org/en/DOM/window.matchMedia
         *                                and @link msdn.microsoft.com/en-us/library/windows/apps/hh453838.aspx
         *                                and @link caniuse.com/matchmedia
         
         *                                Response.media only works where there is support for either window.matchMedia
         *                                or window.msMatchMedia. Either check first to make sure it works e.g. check
         *                                ( !!Response.media ). OR polyfill w/ @link github.com/paulirish/matchMedia.js/
         *
         * @param    string   mediaQuery
         *
         * @return   boolean
         *
         * @example  if ( Response.media ) {
         *               var is320up = Response.media("(min-width:320px)").matches;
         *           }
         * 
         * @example  var is320up = Response.media ? Response.media("(min-width:320px)").matches : false;
         *
         * Note: See Response.band / Response.wave / Response.device.band / Response.device.wave / Response.dpr
         *       They offer a terser syntax and are 100% reliable for their specific tasks.
         *       For other queries use this, or if you are using Modernizr, use Modernizr.mq instead b/c it 
         *       has better (but not full) support.
         * 
         */
        
      , media  = window.matchMedia || window.msMatchMedia
 
        /**
         * Response.dpr(decimal)         Tests if a minimum device pixel ratio is active. 
         *                               Or (version added in 0.3.0) returns the device-pixel-ratio
     *
     *
         * @param    number    decimal   is the integer or float to test.
         *
         * @return   boolean|number
         * @example  Response.dpr();     // get the device-pixel-ratio (or 0 if undetectable)
         * @example  Response.dpr(1.5);  // true when device-pixel-ratio is 1.5+
         * @example  Response.dpr(2);    // true when device-pixel-ratio is 2+
     * @example  Response.dpr(3/2);  // [!] FAIL (Gotta be a decimal or integer)
     *
         */
    
      , dpr = function(decimal) {
      
    	  	var dPR = window.devicePixelRatio;
              
            if ( !arguments.length ) {//Return exact value or kinda iterate for approx:
                return dPR || (dpr(2) ? 2 : dpr(1.5) ? 1.5 : dpr(1) ? 1 : 0);
            }
            
            if ( !isFinite(decimal) ) {// Shh. Actually allows numeric strings too. ;)
                return false;
            }
    
            // Use window.devicePixelRatio if supported - supported by Webkit 
            // (Safari/Chrome/Android) and Presto 2.8+ (Opera) browsers.         

            if ( dPR ) {
                return dPR >= decimal; 
            }
            
            // Fallback to .matchMedia/.msMatchMedia. Supported by Gecko (FF6+) and more:
            // @link developer.mozilla.org/en/DOM/window.matchMedia
            // -webkit-min- and -o-min- omitted (Webkit/Opera supported above)
            // The generic min-device-pixel-ratio is expected to be added to the W3 spec.
            // Return false if neither method is available.
            
            decimal = 'only all and (min--moz-device-pixel-ratio:' + decimal + ')';
            return !media ? false : media(decimal).matches || media(decimal.replace('-moz-', '')).matches;
            
        }
             
      , detectMode = function(elem) {

            // Detect whether elem should act in src or markup mode.
            //
            // @param   elem      is a native dom element
            // @return  boolean   true (src mode) or false (markup mode) depending on whether there is a
            //                     src attr *and* whether the spec allows it on the elem in question.
            //
            // @link dev.w3.org/html5/spec-author-view/index.html#attributes-1
            // @link stackoverflow.com/questions/8715689/check-if-element-legally-supports-the-src-attribute-or-innerhtml
            //
            // In jQuery you can also use $(elem).prop('tagName') to get the tagName. 
            // This uses developer.mozilla.org/en/DOM/element.tagName
            //
            // In HTML5, element.tagName returns the tagName in uppercase.
            // These are the elems that can use src attr per the W3 spec:
            
            var srcElems = {IMG:1, INPUT:1, SOURCE:3, EMBED:3, TRACK:3, IFRAME:5, AUDIO:5, VIDEO:5, SCRIPT:5}
              , modeID = srcElems[elem.tagName.toUpperCase()] || -1  // toUpperCase this so it works in XHTML too.
            ;

            // -5 => markup mode for video/audio/iframe w/o src attr.
            // -1 => markup mode for any elem not in the array above.
            //  1 => src mode    for img/input (empty content model). Images.
            //  3 => src mode    for source/embed/track (empty content model). Media *or* time data.
            //  5 => src mode    for audio/video/iframe/script *with* src attr.
            //  If we at some point we need to differentiate <track> we'll use 4, but for now
            //  it's grouped with the other non-image empty content elems that use src.
            //  hasAttribute is not supported in IE7 so using 'string' === typeof elem.getAttribute('src')
            
            return 4 > modeID ? modeID : 'string' === typeof elem.getAttribute('src') ? 5 : -5; // integer
        }//detectMode
        
        /**
         * Response.store()
         * @since 0.1.9
         *
         * Store a data value on each elem targeted by a jQuery selector. We use this for storing an 
         * elem's orig (no-js) state. This gives us the ability to return the elem to its orig state.
         * The data it stores is either the src attr or the innerHTML based on result of detectMode().
         *
         * @param          $elems     is the jQuery selector.
         * @param  string  key        is the key to use to store the orig value w/ @link api.jquery.com/data/
         * @param  string  overwrite  (optional, @since 0.3.0) gives the option for overwriting the key if it 
         *                            already exists. Does not overwrite by default. To overwrite, set to true.
         *
         */
    
      , store = function ($elems, key, overwrite) {
            ($elems && key) || doError('store');
            each($elems, function(i, el) {
                if ( overwrite || !dataset(el, key) ) {// Check mode and store appropriate value:
                    // If detectMode(el) is positive then we know getAttribute will return a string.
                    dataset(el, key, (0 < detectMode(el) ? el.getAttribute('src') : $(el).html()||'' ));
                }
            });
            /*var i = -1
              , len = $elems.length
              , el
            ;
            while ( i++ < len ) {
                if ( i in $elems && (overwrite || !dataset((el = $elems[i]), key)) ) {// Check mode and store appropriate value:
                    dataset( el, key, 0 < detectMode(el) ? el.getAttribute('src') : $(el).html() );
                }
            }*/
            return Response;
        }

        /**
         * Response.target()           Get the corresponding data attributes for an array of data keys.
         * @since    0.1.9
         * @param    array     keys    is the array of data keys whose attributes you want to select.
         * @return   object            jQuery selector
         * @example  Response.target(['a', 'b', 'c'])  //  $('[data-a],[data-b],[data-c]')
         */
    
      , target = function(keys) {
            // The .replace is needed to escape periods. 
            // @link github.com/jquery/sizzle/issues/76
            keys = isArray(keys) ? keys : 'string' === typeof keys ? keys.split(regexSpace) : [];
            return $( map(keys, function(k) { return '[' + datatize(k).replace(regexPeriods, '\\.') + ']'; }).join() );
        }
    
        /**
         * Response.access()        Access data-* values for element from an array of data-* keys. 
         * @since 0.1.9
         * @param    selector       is the jQuery selector for elems you want to target.
         * @param    keys           is an array of data keys whose values you want to access.
         * @return   array          is the array of values that correspond to each key (with
         *                          falsey values converted to an empty string).
         */
    
      , access = function($elem, keys) {
            //var i, len, ret = [];
            ($elem && isArray(keys)) || doError('access');
            //len = keys.length;
            //for ( i = 0; i < len; i++ ) {
            //    ret[i] = dataset($elem, keys[i]);
            //}
            //return ret;
            return map(keys, datasetChainable, $elem); // $elem becomes thisArg
        }
         
        /*
         * Elemset                      Prototype object for element sets used in Response.create
         *                              Each element in the set inherits this as well, so some of the 
         *                              methods apply to the set, while others apply to single elements.
         */
         
      , Elemset = (function() {

            var memoizeCache = []
            
                 // Custom breakpoints override these defaults. Custom breakpoints can be entered in any
                // order. They get sorted lowest to highest, but the defaults  here are presorted so
                // that we can skip the need to sort when using the defaults. Omit trailing decimal zeros, 
                // b/c for example if you put 1.0 as a devicePixelRatio breakpoint, then the target would 
                // be data-pre1 (NOT data-pre1.0) so drop the zeros.

              , defaultBreakpoints = {
                    width: [0, 320, 481, 641, 961, 1025, 1281]  // width  | device-width  (ideal for 960 grids)
                  , height: [0, 481]                            // height | device-height (maybe add 801 too)
                  , ratio: [1, 1.5, 2]                          // device-pixel-ratio     (!omit trailing zeros!)
                }
                
               , propTests = {
                    // The keys are the prop and the values are the method that tests that prop.
                    // The props with dashes in them are added via array notation below.
                    // Props marked as dynamic change when the viewport is resized. Ones that are
                    // marked as static do not.
                    width:  band    // dynamic
                  , height: wave    // dynamic
                }
                
            ;//var
            
            // Multi-dimensional cache to track breakpoints by use of pixel density
            // memoizeCache[usedpr][breakpoint]
            memoizeCache[false] = memoizeCache[true] = [];
            
            propTests['device-width']       = device.band;  // static
            propTests['device-height']      = device.wave;  // static    
            propTests['device-pixel-ratio'] = dpr;          // static
            
            return {
                e: 0                      // object    the native element
              , $: 0                      // object    jQuery selector in sets.
              , mode: 0                   // integer   defined per element
              , breakpoints: 0            // array     validated @ configure()
              , prefix: 0                 // string    validated @ configure()
              , prop: 'width'             // string    validated @ configure()
              , keys: []                  // array     defined @ configure()
              , dynamic: 0                // boolean   defined @ configure()
              , values: []                // array     available values
              , method: 0                 // callback  defined @ configure()
              , verge: undef              // integer   defaults to Math.min(deviceMax, 500)
              , newValue: 0
              , currValue: 1
              , usedpr: false			  // boolean   validate @ cofigure()
          
              , cut: function(arr, maxNum) {
                    // Remove breakpoints that are above the device's max dimension.
                    // Do this to reduce the number of iterations needed in decideValue()
                    // Must be done before Elemset keys are created so that the keys match.
            	  	// If enable for Elemset, then take into account pixel density to 
            	  	// recalcuate actual pixel width of device.
                    maxNum = maxNum || (this.usedpr ? deviceDpr*deviceMax : deviceMax);
                    return grep(arr, function(n) { return n <= maxNum; });
                }
            
              , valid8: function() {
                    var arr = this.breakpoints 
                      , prop = this.prop
                      , prefilteredLength
                    ;
                    if (!arr) {
                        // If no array is supplied, then get the default breakpoints for the specified prop.
                        // Supported props: 'width', 'height', 'device-width', 'device-height', 'device-pixel-ratio'
                        return defaultBreakpoints[prop] || defaultBreakpoints[prop.split('-').pop()] || doError('create @prop'); 
                    }
                    isArray(arr) || doError('create @breakpoints');
                    prefilteredLength = arr.length;
                    // Filter out non numerics and sort lowest to highest:
                    arr = grep(arr, isFinite).sort(function(a, b){ return (a - b); });
                    return prefilteredLength === arr.length ? arr : false; // Length of the new array must match.
                }
          
              //, dataset: function() { return datasetChainable.apply(this.$, arguments); }
              //, deletes: function() { return deletesChainable.apply(this.$, arguments); }
              
              , reset: function() {        // Reset memoize cache. It's safe to set index zero to true b/c all the the test
                    memoizeCache[false] = [true]; // methods (see propTests) return true for zero. E.g. b/c band(0) === true // always
                    memoizeCache[true] = [true];
                    return this;           // chainable
                }
                
              , memoize: function(breakpoint, usedpr) {
                    // Prevents repeating tests:
            	    if ( 'boolean' !== typeof memoizeCache[usedpr][breakpoint] ) {
            	    	memoizeCache[usedpr][breakpoint] = this.method(breakpoint, undefined, usedpr);
                    }
                    return memoizeCache[usedpr][breakpoint];
                }
    
              , configure: function(options) {
                    var context = this;
                    
                    merge(context, options, true); // Merge properties from options object into this object.
                    
                    // Force usedpr to be boolean
                    context.usedpr = Boolean(options.usedpr);
                    	
                    context.verge = isFinite(context.verge) ? context.verge : Math.min(deviceMax, 500);
                    
                    context.prefix = sanitize(context.prefix) || doError('create @prefix');
                    
                    context.method = propTests[context.prop] || doError('create @prop');
                    
                    // If we get to here then we know the prop is one one our supported props:
                    // 'width', 'height', 'device-width', 'device-height', 'device-pixel-ratio'
                    // If its 1st character is d for device-* then the prop is NOT dynamic:
                    context.dynamic = 'd' !== context.prop[0]; // true only for 'width' and 'height'
                    
                    // Sort and validate custom breakpoints if supplied. Otherwise grab the defaults.
                    // Then cut any breakpoints that are higher than the deviceMax dimension so that
                    // we'll have iterations later:
                    context.breakpoints = context.cut(context.valid8());
                                  
                    // Use the breakpoints array to create array of data keys:
                    context.keys = map(context.breakpoints, function(bp){ return context.prefix + bp; });
                    
                    return context; // chainable
                }
            
              , target: function() {                 // Stuff that can't happen until the DOM is ready:
                    this.$ = target(this.keys);      // Cache jQuery selector for the set.
                    store(this.$, initContentKey);   // Store original (no-js) value to data key.
                    this.keys.push(initContentKey);  // Add key onto end of keys array. (# keys now equals # breakpoints + 1)
                    return this; // chainable
                }
            
              , each: function(callback) {
                    var arr = this.$
                      , i = -1
                    ;
                    while ( i++ < arr.length ) {
                        i in arr && callback(i, arr[i]);
                    }
                    return arr; // chainable
                }
            
                // The rest of the methods are designed for use with single elements.
                // They are for use in a cloned instances within a loop.
            
              , decideValue: function() {
            	  	// Return the first value from the values array that passes the boolean
                    // test callback. If none pass the test, then return the fallback value.
                    // this.breakpoints.length === this.values.length + 1  
                    // The extra member in the values array is the initContentKey value.
                    var val = 0
                      , subjects = this.breakpoints
                      , sL = subjects.length
                      , i = sL
                    ;
                    while( !val && i-- ) {
                        if ( this.memoize(subjects[i], this.usedpr) ) {
                            val = this.values[i];                        
                        }
                    }
                    //$('#A').append( supportsNativeDataset ); // testing
                    this.newValue = val || this.values[sL];
                    return this; // chainable
                }
            
              , prepareData: function(elem) {
                    this.e = elem;                      // native element
                    this.$ = $(elem);                   // jQuery selector
                    this.mode = detectMode(this.e);     // Detect the mode of the element.
                    this.values = access(this.$, this.keys); // Access Response data- values for the element.
                    return this.decideValue();          // chainable
                }
            
              , updateDOM: function() {
                    // Apply the method that performs the actual swap. When updateDOM called this.$ and this.e refer
                    // to single elements. Only update the DOM when the new value is different than the current value.
                    if (this.currValue === this.newValue) { return this; }
                    this.currValue = this.newValue;
                    return 0 < this.mode ? this.e.setAttribute('src', this.newValue) : this.$.html(this.newValue);
                }
            
            };//return
        }())//Elemset
        
    ;//var @ top
    
    /**
     * Response()
     * At some point might use Response() as a wrapper for chainable methods, like
     * so we could do stuff like Response(nativeElem).dataset(key, value)
     */
    /*
    function Response(elems) {
        //var Rfn = {dataset: datasetChainable, deletes: deletesChainable};
        //Rfn.prototype = Element;
        var R = objectCreate(Elemset);
        //elems = docElem;
        //elems.prototype = objectCreate(huh);
        //if (elems) {
            //R.$ = 'string' === typeof elems ? $(elems) : elems; 
        //}
        return R;
    }
    */
        
    /**
     * Response.create()              Create their own Response attribute sets, with custom 
     *                                breakpoints and data-* names.
     * @since    0.1.9
     *
     * @param    object|array   args   is an options object or an array of options objects.
     *
     * @link     http://responsejs.com/#create
     *
     * @example  Ideally this method is only called once:
     *           To create a single set,  use the form:  Response.create(object);
     *           To create multiple sets, use the form:  Response.create([object1, object2]); 
     */
     
    function create(args) {
      
        var scrollName = namespaceIt('scroll')
          , customEventOne = namespaceIt('allLoaded')
            // 0.3.0 rolls out a new lazy feature only in Webkit. It works
            // elsewhere but bogs a little in slower JavaScript engines.
          , isWebkit = /webkit\//i.test(window.navigator.userAgent)
        ;
            
        route(args, function (options) {

            options instanceof Object || doError('create @args must be object(s)');
           
            var elemset = objectCreate(Elemset).configure(options)
              , lowestNonZeroBP
              , verge = elemset.verge
              , breakpoints = elemset.breakpoints
            ;//var    

            if ( !breakpoints.length ) { return; }    // Quit if there are zero breakpoints.
            
            // Identify the lowest nonzero breakpoint. (They're already sorted low to high by now.)
            lowestNonZeroBP = breakpoints[0] || breakpoints[1] || false;
        
            $doc.ready(function() {                  // Ready. Yea mofo.

                // Target elements containing this set's Response data attributes and chain into the 
                // loop that occurs on ready. The selector is cached to elemset.$ for later use.
                
                elemset.target().each(function(i, v) {
                    
                    elemset[i] = objectCreate(elemset).prepareData(v); // Inherit from elemset.

                    if ( !isWebkit || inViewport(elemset[i].$, verge) ) {
                        elemset[i].updateDOM();
                    }
                        
                });
                
                function resizeHandler() {   // Only runs for dynamic props.
                	elemset.reset().each(function(i, v) {// Reset memoize cache and then loop thru the set.
                		elemset[i].decideValue().updateDOM(); // Grab elem object from cache and update all.
                    }).trigger(customEventOne);
                }
                
                // device-* props are static and only need to be tested once. The others are
                // dynamic, meaning they need to be tested on resize. Also if a device so small
                // that it doesn't support the lowestNonZeroBP then we don't need to listen for 
                // resize events b/c we know the device can't resize beyond that breakpoint.
                
                if ( elemset.dynamic && lowestNonZeroBP < deviceMax ) {
                    $window.on(namespaceIt('resize'), resizeHandler);
                }
                
                // We don't have to re-decide the content on scrolls because neither the viewport or device
                // properties change from a scroll. This setup minimizes the operations binded to the scroll 
                // event. Once everything in the set has been swapped once, the scroll handler is deactivated
                // through the use of a custom event.
                    
                if ( !isWebkit ) { return; }
                    
                function scrollHandler() {
                    elemset.each(function(i, v) {
                        if ( inViewport(elemset[i].$, verge) ) {
                            elemset[i].updateDOM();
                        }
                    });
                }
                    
                $window.on(scrollName, scrollHandler);
                elemset.$.one(customEventOne, function() {
                    $window.off(scrollName, scrollHandler);
                });
      
                    /* 
                    //It works like this:                    
                    function configureLazyEvent(scrollHandler, doneEventSelector, doneEventName, scrollName) {
                        scrollName = namespaceIt('scroll');
                        $window.on(scrollName, scrollHandler);
                        doneEventSelector.one(doneEventName, function() {
                            $window.off(scrollName, scrollHandler);
                        });
                    }
                    //with these params:
                    configureLazyEvent( scrollEventHandler, elemset.$, namespaceIt('allLoaded') );
                    */

            });//ready
        });//route
        return Response; // chainable
    }//create
        
    /**
     * Response.chain
     * @since 0.3.0
     * Expose chainable methods to jQuery.
     */
       
    function chain() {
        if (!chain.on) {
        
            // Expose .dataset() and .deletes() to jQuery:
            $.fn.dataset = datasetChainable;
            $.fn.deletes = deletesChainable;
                
            // Expose .inX() .inY() .inViewport() to jQuery as filter methods:
            each(['inX', 'inY', 'inViewport'], function(i, methodName) {
                $.fn[methodName] = function(verge, invert) {
                    
                    /*  We could to this...
                    
                    return this.not(function(index) {
                        return (!invert !== Response[methodName](this, verge));
                    });
                    
                    but... This is faster and minifies smaller:   */
                    
                    return $(grep(this, function(el) {
                        return !invert === Response[methodName](el, verge); 
                    }));
                    
                };//fn
            });
            chain.on = 1; // Prevent from running more than once.
        }
        return Response; // chainable
    }//chain
    
    Response = { // Expose these as props/methods on Response:
        viewportW : viewportW
      , viewportH : viewportH
      , deviceW: deviceW
      , deviceH: deviceH
      , deviceMax: deviceMax
      , deviceMin: deviceW + deviceH - deviceMax
      , inX: inX
      , inY: inY
      , inViewport: inViewport
      , scrollX: scrollX
      , scrollY: scrollY
      , overflowX: overflowX
      , overflowY: overflowY
      , band: band
      , wave: wave
      , device: device
      , dpr: dpr
      , action: action
      , dataset: dataset
      , deletes: deletes
      , route: route
      , merge: merge
      , store: store
      , target: target
      , access: access
      , create: create
      , media: media
      , render: render
      , decide: function(){doError('decide: method depreciated');}
      , chain: chain
    };//Response
    
    
    /**
     * Initialize
     */

    $doc.ready(function(customData) {
    	// Grab device's device's pixel density ratio to avoid repeated lookups, 
    	// falls back to 1 if dpr is unobtainable.
    	deviceDpr = dpr() || 1;	
    	
        customData = dataset(doc.body, 'responsejs'); // Read data-responsejs attr.            
        if ( customData ) {
            customData = supportsNativeJSON ? JSON.parse(customData) : $.parseJSON ? $.parseJSON(customData) : {};
            if ( customData.create ) {
                create(customData.create); 
            }
        }
    });
    
    return Response;  // Bam!
    
}( 'Response', this.jQuery||this.Zepto, this, this.document ));

// In the global context, this === window. Watch @link vimeo.com/12529436
// The args here are passed into the function that starts all the way at the top.
// Since version 0.3.0, Response is compatible with jQuery *and* Zepto (zeptojs.com)
// Now go play.

/*jslint browser: true, white: true, plusplus: true, regexp: true, maxerr: 50, indent: 4 */