(function() {
    function Stapes() {
        var eventHandlers = {},
            attributes = {},
            Module = function(){};

        /** Utility functions
         *
         *  Note that these functions are only used inside Stapes, and therefore
         *  aren't that failsafe as the options in libraries
         *  such as Underscore.js, so that's why they're not usable outside
         *  the private scope.
         */
        function bind(fn, ctx) {
            return function() {
                return fn.apply(ctx, arguments);
            };
        }

        function each(obj, fn) {
            for (var key in obj) {
                fn( obj[key], key );
            }
        }

        function isArray(val) {
            return Object.prototype.toString.call( val ) === "[object Array]";
        }

        // from http://stackoverflow.com/a/2117523/152809
        function makeUuid() {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
                return v.toString(16);
            });
        }

        function toArray(arr) {
            return Array.prototype.slice.call(arr, 0);
        }

        /** Private helper functions */
        function addEvent(event) {
            // If we don't have any handlers for this type of event, add a new
            // array we can use to push new handlers
            if (!eventHandlers[event.type]) {
                eventHandlers[event.type] = [];
            }

            // Push an event object
            eventHandlers[event.type].push({
                "handler" : event.handler,
                "scope" : event.scope,
                "type" : event.type
            });
        }

        function setAttribute(key, value) {
            // We need to do this before we actually add the item :)
            var itemExists = this.has(key);

            // Actually add the item to the attributes
            attributes[key] = value;

            // Throw a generic event
            this.emit('change', key);

            // And a namespaced event as well, NOTE that we pass value instead of
            // key here!
            this.emit('change:' + key, value);

            // Also throw a specific event for this type of set
            var specificEvent = itemExists ? 'update' : 'create';

            this.emit(specificEvent, key);

            // And a namespaced event as well, NOTE that we pass value instead of key
            this.emit(specificEvent + ':' + key, value);
        }

        Module.prototype = {
            emit : function(types, data) {
                data = data || null;

                each(types.split(" "), function(type) {
                    if (!eventHandlers[type]) return;

                    each(eventHandlers[type], function(event) {
                        var scope = (event.scope) ? event.scope : this;
                        event.scope = scope;
                        event.handler.call(event.scope, data, event);
                    });
                });
            },

            extend : function(objectOrValues, valuesIfObject) {
                var object = (valuesIfObject) ? objectOrValues : Module,
                    values = (valuesIfObject) ? valuesIfObject : objectOrValues;

                for (var key in values) {
                    var val = values[key];

                    if (valuesIfObject) {
                        object[key] = val;
                    } else {
                        object.prototype[key] = val;
                    }
                }
            },

            filter : function(fn) {
                var items = [];

                each(attributes, function(item) {
                    if (fn(item)) {
                        items.push(item);
                    }
                });

                return items;
            },

            get : function(input) {
                if (typeof input === "string") {
                    return this.has(input) ? attributes[input] : null;
                } else if (typeof input === "function") {
                    var items = this.filter(input);
                    if (items.length) {
                        return items.length[0];
                    }
                }
            },

            getAll : function() {
                return attributes;
            },

            has : function(key) {
                return (typeof attributes[key] !== "undefined");
            },

            init : function() {
                this.emit('ready');
            },

            // 'Eventparam' can either be a string with space-seperated events
            // or an object with key / value pairs for events and handlers
            on : function(argTypeOrMap, argHandlerOrScope, argScope) {
                var eventMap = {},
                    scope;

                if (typeof argTypeOrMap === "string") {
                    scope = argScope || false;
                    eventMap[ argTypeOrMap ] = argHandlerOrScope;
                } else {
                    scope = argHandlerOrScope || false;
                    eventMap = argTypeOrMap;
                }

                for (var eventString in eventMap) {
                    var handler = eventMap[ eventString ],
                        events = eventString.split(" ");

                    for (var i = 0, l = events.length; i < l; i++) {
                        var eventType = events[i];

                        addEvent({
                            "handler" : handler,
                            "scope" : scope,
                            "type" : eventType
                        });
                    }
                }
            },

            remove : function(input) {
                if (typeof input === "function") {
                    each(attributes, bind(function(item, key) {
                        if (input(item)) {
                            delete attributes[key];
                            this.emit('delete change');
                        }
                    }, this));
                } else {
                    if (typeof input === "string") {
                        input = [input];
                    }

                    each(toArray(input), bind(function(id) {
                        if (this.has(id)) {
                            delete attributes[id];
                            this.emit('delete change');
                        }
                    }, this));
                }
            },


            set : function(key, value) {
                // If only key is given, make a uuid for key and use key as value
                if (typeof value === "undefined") {
                    value = key;
                    value.id = key = makeUuid();
                }

                setAttribute.call(this, key, value);
            }
        };

        return new Module();
    }

    // This library can be used as an AMD module, a Node.js module, or an
    // old fashioned global
    if (typeof exports !== "undefined") {
        // Server
        if (typeof module !== "undefined" && module.exports) {
            exports = module.exports = Stapes;
        }
        exports.Stapes = Stapes;
    } else if (typeof define === "function" && define.amd) {
        // AMD
        define(function() {
            return Stapes;
        });
    } else {
        // Global scope
        window.Stapes = Stapes;
    }
})();