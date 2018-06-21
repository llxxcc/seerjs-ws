(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.bitshares_ws = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
"use strict";

exports.__esModule = true;

var _ChainWebSocket = require("./ChainWebSocket");

var _ChainWebSocket2 = _interopRequireDefault(_ChainWebSocket);

var _GrapheneApi = require("./GrapheneApi");

var _GrapheneApi2 = _interopRequireDefault(_GrapheneApi);

var _ChainConfig = require("./ChainConfig");

var _ChainConfig2 = _interopRequireDefault(_ChainConfig);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } } // var { List } = require("immutable");


var inst = void 0;
var autoReconnect = true;
/**
    Configure: configure as follows `Apis.instance("ws://localhost:8090").init_promise`.  This returns a promise, once resolved the connection is ready.

    Import: import { Apis } from "@graphene/chain"

    Short-hand: Apis.db("method", "parm1", 2, 3, ...).  Returns a promise with results.

    Additional usage: Apis.instance().db_api().exec("method", ["method", "parm1", 2, 3, ...]).  Returns a promise with results.
*/

exports.default = {

    setRpcConnectionStatusCallback: function setRpcConnectionStatusCallback(callback) {
        this.statusCb = callback;
        if (inst) inst.setRpcConnectionStatusCallback(callback);
    },

    /**
        @arg {boolean} auto means automatic reconnect if possible( browser case), default true
    */
    setAutoReconnect: function setAutoReconnect(auto) {
        autoReconnect = auto;
    },

    /**
        @arg {string} cs is only provided in the first call
        @return {Apis} singleton .. Check Apis.instance().init_promise to know when the connection is established
    */
    reset: function reset() {
        var cs = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : "ws://localhost:8090";

        var _this = this;

        var connect = arguments[1];
        var connectTimeout = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 4000;

        return this.close().then(function () {
            inst = new ApisInstance();
            inst.setRpcConnectionStatusCallback(_this.statusCb);

            if (inst && connect) {
                inst.connect(cs, connectTimeout);
            }

            return inst;
        });
    },
    instance: function instance() {
        var cs = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : "ws://localhost:8090";
        var connect = arguments[1];
        var connectTimeout = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 4000;
        var enableCrypto = arguments[3];

        if (!inst) {
            inst = new ApisInstance();
            inst.setRpcConnectionStatusCallback(this.statusCb);
        }

        if (inst && connect) {
            inst.connect(cs, connectTimeout, enableCrypto);
        }

        return inst;
    },
    chainId: function chainId() {
        return Apis.instance().chain_id;
    },

    close: function close() {
        if (inst) {
            return new Promise(function (res) {
                inst.close().then(function () {
                    inst = null;
                    res();
                });
            });
        }

        return Promise.resolve();
    }
    // db: (method, ...args) => Apis.instance().db_api().exec(method, toStrings(args)),
    // network: (method, ...args) => Apis.instance().network_api().exec(method, toStrings(args)),
    // history: (method, ...args) => Apis.instance().history_api().exec(method, toStrings(args)),
    // crypto: (method, ...args) => Apis.instance().crypto_api().exec(method, toStrings(args))
};

var ApisInstance = function () {
    function ApisInstance() {
        _classCallCheck(this, ApisInstance);
    }

    /** @arg {string} connection .. */
    ApisInstance.prototype.connect = function connect(cs, connectTimeout) {
        var _this2 = this;

        var enableCrypto = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;

        // console.log("INFO\tApiInstances\tconnect\t", cs);
        this.url = cs;
        var rpc_user = "",
            rpc_password = "";
        if (typeof window !== "undefined" && window.location && window.location.protocol === "https:" && cs.indexOf("wss://") < 0) {
            throw new Error("Secure domains require wss connection");
        }

        this.ws_rpc = new _ChainWebSocket2.default(cs, this.statusCb, connectTimeout, autoReconnect, function () {
            if (_this2._db) {
                _this2._db.exec('get_objects', [['2.1.0']]).catch(function (e) {});
            }
        });

        this.init_promise = this.ws_rpc.login(rpc_user, rpc_password).then(function () {
            console.log("Connected to API node:", cs);
            _this2._db = new _GrapheneApi2.default(_this2.ws_rpc, "database");
            _this2._net = new _GrapheneApi2.default(_this2.ws_rpc, "network_broadcast");
            _this2._hist = new _GrapheneApi2.default(_this2.ws_rpc, "history");
            if (enableCrypto) _this2._crypt = new _GrapheneApi2.default(_this2.ws_rpc, "crypto");
            var db_promise = _this2._db.init().then(function () {
                //https://github.com/cryptonomex/graphene/wiki/chain-locked-tx
                return _this2._db.exec("get_chain_id", []).then(function (_chain_id) {
                    _this2.chain_id = _chain_id;
                    return _ChainConfig2.default.setChainId(_chain_id);
                    //DEBUG console.log("chain_id1",this.chain_id)
                });
            });
            _this2.ws_rpc.on_reconnect = function () {
                _this2.ws_rpc.login("", "").then(function () {
                    _this2._db.init().then(function () {
                        if (_this2.statusCb) _this2.statusCb("reconnect");
                    });
                    _this2._net.init();
                    _this2._hist.init();
                    if (enableCrypto) _this2._crypt.init();
                });
            };
            var initPromises = [db_promise, _this2._net.init(), _this2._hist.init()];
            if (enableCrypto) initPromises.push(_this2._crypt.init());
            return Promise.all(initPromises);
        });
    };

    ApisInstance.prototype.close = function close() {
        var _this3 = this;

        if (this.ws_rpc) {
            return this.ws_rpc.close().then(function () {
                _this3.ws_rpc = null;
            });
        };
        this.ws_rpc = null;
        return Promise.resolve();
    };

    ApisInstance.prototype.db_api = function db_api() {
        return this._db;
    };

    ApisInstance.prototype.network_api = function network_api() {
        return this._net;
    };

    ApisInstance.prototype.history_api = function history_api() {
        return this._hist;
    };

    ApisInstance.prototype.crypto_api = function crypto_api() {
        return this._crypt;
    };

    ApisInstance.prototype.setRpcConnectionStatusCallback = function setRpcConnectionStatusCallback(callback) {
        this.statusCb = callback;
    };

    return ApisInstance;
}();

module.exports = exports["default"];
},{"./ChainConfig":2,"./ChainWebSocket":3,"./GrapheneApi":4}],2:[function(require,module,exports){
(function (process){
"use strict";

exports.__esModule = true;
var _this = void 0;

var ecc_config = {
    address_prefix: process.env.npm_config__graphene_ecc_default_address_prefix || "SEER"
};

_this = {
    core_asset: "SEER",
    address_prefix: "SEER",
    expire_in_secs: 120,
    expire_in_secs_proposal: 24 * 60 * 60,
    review_in_secs_committee: 24 * 60 * 60,
    networks: {
        SEER: {
            core_asset: "SEER",
            address_prefix: "SEER",
            chain_id: "cea4fdf4f5c2278f139b22e782b308928f04008b0fc2c79970a58974a2a28f91"
        }
    },

    /** Set a few properties for known chain IDs. */
    setChainId: function setChainId(chain_id) {

        var i = void 0,
            len = void 0,
            network = void 0,
            network_name = void 0,
            ref = void 0;
        ref = Object.keys(_this.networks);

        for (i = 0, len = ref.length; i < len; i++) {

            network_name = ref[i];
            network = _this.networks[network_name];

            if (network.chain_id === chain_id) {

                _this.network_name = network_name;

                if (network.address_prefix) {
                    _this.address_prefix = network.address_prefix;
                    ecc_config.address_prefix = network.address_prefix;
                }

                // console.log("INFO    Configured for", network_name, ":", network.core_asset, "\n");

                return {
                    network_name: network_name,
                    network: network
                };
            }
        }

        if (!_this.network_name) {
            console.log("Unknown chain id (this may be a testnet)", chain_id);
        }
    },

    reset: function reset() {
        _this.core_asset = "SEER";
        _this.address_prefix = "SEER";
        ecc_config.address_prefix = "SEER";
        _this.expire_in_secs = 15;
        _this.expire_in_secs_proposal = 24 * 60 * 60;

        console.log("Chain config reset");
    },

    setPrefix: function setPrefix() {
        var prefix = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : "SEER";

        _this.address_prefix = prefix;
        ecc_config.address_prefix = prefix;
    }
};

exports.default = _this;
module.exports = exports["default"];
}).call(this,require('_process'))

},{"_process":7}],3:[function(require,module,exports){
(function (process){
"use strict";

exports.__esModule = true;

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var WebSocketClient = void 0;
if (typeof WebSocket === "undefined" && !process.env.browser) {
    WebSocketClient = require("ws");
} else if (typeof WebSocket !== "undefined" && typeof document !== "undefined") {
    WebSocketClient = require("ReconnectingWebSocket");
} else {
    WebSocketClient = WebSocket;
}

var SOCKET_DEBUG = false;

function getWebSocketClient(autoReconnect) {
    if (!autoReconnect && typeof WebSocket !== "undefined" && typeof document !== "undefined") {
        return WebSocket;
    }
    return WebSocketClient;
}

var keep_alive_interval = 5000;
var max_send_life = 5;
var max_recv_life = max_send_life * 2;

var ChainWebSocket = function () {
    function ChainWebSocket(ws_server, statusCb) {
        var connectTimeout = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 5000;

        var _this = this;

        var autoReconnect = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : true;
        var keepAliveCb = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : null;

        _classCallCheck(this, ChainWebSocket);

        this.statusCb = statusCb;
        this.connectionTimeout = setTimeout(function () {
            if (_this.current_reject) {
                var reject = _this.current_reject;
                _this.current_reject = null;
                if (_this.ws.terminate) {
                    _this.ws.terminate();
                } else {
                    _this.ws.close();
                }
                reject(new Error("Connection attempt timed out: " + ws_server));
            }
        }, connectTimeout);
        var WsClient = getWebSocketClient(autoReconnect);
        try {
            this.ws = new WsClient(ws_server);
        } catch (error) {
            console.error("invalid websocket URL:", error, ws_server);
            this.ws = new WsClient("wss://127.0.0.1:8090");
        }
        this.ws.timeoutInterval = 5000;
        this.current_reject = null;
        this.on_reconnect = null;
        this.send_life = max_send_life;
        this.recv_life = max_recv_life;
        this.keepAliveCb = keepAliveCb;
        this.connect_promise = new Promise(function (resolve, reject) {
            _this.current_reject = reject;
            _this.ws.onopen = function () {
                clearTimeout(_this.connectionTimeout);
                if (_this.statusCb) _this.statusCb("open");
                if (_this.on_reconnect) _this.on_reconnect();
                _this.keepalive_timer = setInterval(function () {
                    _this.recv_life--;
                    if (_this.recv_life == 0) {
                        console.error('keep alive timeout.');
                        if (_this.ws.terminate) {
                            _this.ws.terminate();
                        } else {
                            _this.ws.close();
                        }
                        clearInterval(_this.keepalive_timer);
                        _this.keepalive_timer = undefined;
                        return;
                    }
                    _this.send_life--;
                    if (_this.send_life == 0) {
                        // this.ws.ping('', false, true);
                        if (_this.keepAliveCb) {
                            _this.keepAliveCb();
                        }
                        _this.send_life = max_send_life;
                    }
                }, 5000);
                _this.current_reject = null;
                resolve();
            };
            _this.ws.onerror = function (error) {
                if (_this.keepalive_timer) {
                    clearInterval(_this.keepalive_timer);
                    _this.keepalive_timer = undefined;
                }
                clearTimeout(_this.connectionTimeout);
                if (_this.statusCb) _this.statusCb("error");

                if (_this.current_reject) {
                    _this.current_reject(error);
                }
            };
            _this.ws.onmessage = function (message) {
                _this.recv_life = max_recv_life;
                _this.listener(JSON.parse(message.data));
            };
            _this.ws.onclose = function () {
                if (_this.keepalive_timer) {
                    clearInterval(_this.keepalive_timer);
                    _this.keepalive_timer = undefined;
                }
                var err = new Error('connection closed');
                for (var cbId = _this.responseCbId + 1; cbId <= _this.cbId; cbId += 1) {
                    _this.cbs[cbId].reject(err);
                }
                if (_this.statusCb) _this.statusCb("closed");
                if (_this.closeCb) _this.closeCb();
            };
        });
        this.cbId = 0;
        this.responseCbId = 0;
        this.cbs = {};
        this.subs = {};
        this.unsub = {};
    }

    ChainWebSocket.prototype.call = function call(params) {
        var _this2 = this;

        if (this.ws.readyState !== 1) {
            return Promise.reject(new Error('websocket state error:' + this.ws.readyState));
        }
        var method = params[1];
        if (SOCKET_DEBUG) console.log("[ChainWebSocket] >---- call ----->  \"id\":" + (this.cbId + 1), JSON.stringify(params));

        this.cbId += 1;

        if (method === "set_subscribe_callback" || method === "subscribe_to_market" || method === "broadcast_transaction_with_callback" || method === "set_pending_transaction_callback") {
            // Store callback in subs map
            this.subs[this.cbId] = {
                callback: params[2][0]
            };

            // Replace callback with the callback id
            params[2][0] = this.cbId;
        }

        if (method === "unsubscribe_from_market" || method === "unsubscribe_from_accounts") {
            if (typeof params[2][0] !== "function") {
                throw new Error("First parameter of unsub must be the original callback");
            }

            var unSubCb = params[2].splice(0, 1)[0];

            // Find the corresponding subscription
            for (var id in this.subs) {
                if (this.subs[id].callback === unSubCb) {
                    this.unsub[this.cbId] = id;
                    break;
                }
            }
        }

        var request = {
            method: "call",
            params: params
        };
        request.id = this.cbId;
        this.send_life = max_send_life;

        return new Promise(function (resolve, reject) {
            _this2.cbs[_this2.cbId] = {
                time: new Date(),
                resolve: resolve,
                reject: reject
            };
            _this2.ws.send(JSON.stringify(request));
        });
    };

    ChainWebSocket.prototype.listener = function listener(response) {
        if (SOCKET_DEBUG) console.log("[ChainWebSocket] <---- reply ----<", JSON.stringify(response));

        var sub = false,
            callback = null;

        if (response.method === "notice") {
            sub = true;
            response.id = response.params[0];
        }

        if (!sub) {
            callback = this.cbs[response.id];
            this.responseCbId = response.id;
        } else {
            callback = this.subs[response.id].callback;
        }

        if (callback && !sub) {
            if (response.error) {
                callback.reject(response.error);
            } else {
                callback.resolve(response.result);
            }
            delete this.cbs[response.id];

            if (this.unsub[response.id]) {
                delete this.subs[this.unsub[response.id]];
                delete this.unsub[response.id];
            }
        } else if (callback && sub) {
            callback(response.params[1]);
        } else {
            console.log("Warning: unknown websocket response: ", response);
        }
    };

    ChainWebSocket.prototype.login = function login(user, password) {
        var _this3 = this;

        return this.connect_promise.then(function () {
            return _this3.call([1, "login", [user, password]]);
        });
    };

    ChainWebSocket.prototype.close = function close() {
        var _this4 = this;

        return new Promise(function (res) {
            _this4.closeCb = function () {
                res();
                _this4.closeCb = null;
            };
            _this4.ws.close();
            if (_this4.ws.readyState !== 1) res();
        });
    };

    return ChainWebSocket;
}();

exports.default = ChainWebSocket;
module.exports = exports["default"];
}).call(this,require('_process'))

},{"ReconnectingWebSocket":5,"_process":7,"ws":6}],4:[function(require,module,exports){
"use strict";

exports.__esModule = true;

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var GrapheneApi = function () {
    function GrapheneApi(ws_rpc, api_name) {
        _classCallCheck(this, GrapheneApi);

        this.ws_rpc = ws_rpc;
        this.api_name = api_name;
    }

    GrapheneApi.prototype.init = function init() {
        var self = this;
        return this.ws_rpc.call([1, this.api_name, []]).then(function (response) {
            //console.log("[GrapheneApi.js:11] ----- GrapheneApi.init ----->", this.api_name, response);
            self.api_id = response;
            return self;
        });
    };

    GrapheneApi.prototype.exec = function exec(method, params) {
        return this.ws_rpc.call([this.api_id, method, params]).catch(function (error) {
            console.log("!!! GrapheneApi error: ", method, params, error, JSON.stringify(error));
            throw error;
        });
    };

    return GrapheneApi;
}();

exports.default = GrapheneApi;
module.exports = exports["default"];
},{}],5:[function(require,module,exports){
// MIT License:
//
// Copyright (c) 2010-2012, Joe Walnes
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

/**
 * This behaves like a WebSocket in every way, except if it fails to connect,
 * or it gets disconnected, it will repeatedly poll until it successfully connects
 * again.
 *
 * It is API compatible, so when you have:
 *   ws = new WebSocket('ws://....');
 * you can replace with:
 *   ws = new ReconnectingWebSocket('ws://....');
 *
 * The event stream will typically look like:
 *  onconnecting
 *  onopen
 *  onmessage
 *  onmessage
 *  onclose // lost connection
 *  onconnecting
 *  onopen  // sometime later...
 *  onmessage
 *  onmessage
 *  etc...
 *
 * It is API compatible with the standard WebSocket API, apart from the following members:
 *
 * - `bufferedAmount`
 * - `extensions`
 * - `binaryType`
 *
 * Latest version: https://github.com/joewalnes/reconnecting-websocket/
 * - Joe Walnes
 *
 * Syntax
 * ======
 * var socket = new ReconnectingWebSocket(url, protocols, options);
 *
 * Parameters
 * ==========
 * url - The url you are connecting to.
 * protocols - Optional string or array of protocols.
 * options - See below
 *
 * Options
 * =======
 * Options can either be passed upon instantiation or set after instantiation:
 *
 * var socket = new ReconnectingWebSocket(url, null, { debug: true, reconnectInterval: 4000 });
 *
 * or
 *
 * var socket = new ReconnectingWebSocket(url);
 * socket.debug = true;
 * socket.reconnectInterval = 4000;
 *
 * debug
 * - Whether this instance should log debug messages. Accepts true or false. Default: false.
 *
 * automaticOpen
 * - Whether or not the websocket should attempt to connect immediately upon instantiation. The socket can be manually opened or closed at any time using ws.open() and ws.close().
 *
 * reconnectInterval
 * - The number of milliseconds to delay before attempting to reconnect. Accepts integer. Default: 1000.
 *
 * maxReconnectInterval
 * - The maximum number of milliseconds to delay a reconnection attempt. Accepts integer. Default: 30000.
 *
 * reconnectDecay
 * - The rate of increase of the reconnect delay. Allows reconnect attempts to back off when problems persist. Accepts integer or float. Default: 1.5.
 *
 * timeoutInterval
 * - The maximum time in milliseconds to wait for a connection to succeed before closing and retrying. Accepts integer. Default: 2000.
 *
 */
(function (global, factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof module !== 'undefined' && module.exports){
        module.exports = factory();
    } else {
        global.ReconnectingWebSocket = factory();
    }
})(this, function () {

    if (typeof window === "undefined" || !('WebSocket' in window)) {
        return;
    }

    function ReconnectingWebSocket(url, protocols, options) {

        // Default settings
        var settings = {

            /** Whether this instance should log debug messages. */
            debug: false,

            /** Whether or not the websocket should attempt to connect immediately upon instantiation. */
            automaticOpen: true,

            /** The number of milliseconds to delay before attempting to reconnect. */
            reconnectInterval: 1000,
            /** The maximum number of milliseconds to delay a reconnection attempt. */
            maxReconnectInterval: 30000,
            /** The rate of increase of the reconnect delay. Allows reconnect attempts to back off when problems persist. */
            reconnectDecay: 1.5,

            /** The maximum time in milliseconds to wait for a connection to succeed before closing and retrying. */
            timeoutInterval: 2000,

            /** The maximum number of reconnection attempts to make. Unlimited if null. */
            maxReconnectAttempts: null,

            /** The binary type, possible values 'blob' or 'arraybuffer', default 'blob'. */
            binaryType: 'blob'
        }
        if (!options) { options = {}; }

        // Overwrite and define settings with options if they exist.
        for (var key in settings) {
            if (typeof options[key] !== 'undefined') {
                this[key] = options[key];
            } else {
                this[key] = settings[key];
            }
        }

        // These should be treated as read-only properties

        /** The URL as resolved by the constructor. This is always an absolute URL. Read only. */
        this.url = url;

        /** The number of attempted reconnects since starting, or the last successful connection. Read only. */
        this.reconnectAttempts = 0;

        /**
         * The current state of the connection.
         * Can be one of: WebSocket.CONNECTING, WebSocket.OPEN, WebSocket.CLOSING, WebSocket.CLOSED
         * Read only.
         */
        this.readyState = WebSocket.CONNECTING;

        /**
         * A string indicating the name of the sub-protocol the server selected; this will be one of
         * the strings specified in the protocols parameter when creating the WebSocket object.
         * Read only.
         */
        this.protocol = null;

        // Private state variables

        var self = this;
        var ws;
        var forcedClose = false;
        var timedOut = false;
        var t = null;
        var eventTarget = document.createElement('div');

        // Wire up "on*" properties as event handlers

        eventTarget.addEventListener('open',       function(event) { self.onopen(event); });
        eventTarget.addEventListener('close',      function(event) { self.onclose(event); });
        eventTarget.addEventListener('connecting', function(event) { self.onconnecting(event); });
        eventTarget.addEventListener('message',    function(event) { self.onmessage(event); });
        eventTarget.addEventListener('error',      function(event) { self.onerror(event); });

        // Expose the API required by EventTarget

        this.addEventListener = eventTarget.addEventListener.bind(eventTarget);
        this.removeEventListener = eventTarget.removeEventListener.bind(eventTarget);
        this.dispatchEvent = eventTarget.dispatchEvent.bind(eventTarget);

        /**
         * This function generates an event that is compatible with standard
         * compliant browsers and IE9 - IE11
         *
         * This will prevent the error:
         * Object doesn't support this action
         *
         * http://stackoverflow.com/questions/19345392/why-arent-my-parameters-getting-passed-through-to-a-dispatched-event/19345563#19345563
         * @param s String The name that the event should use
         * @param args Object an optional object that the event will use
         */
        function generateEvent(s, args) {
        	var evt = document.createEvent("CustomEvent");
        	evt.initCustomEvent(s, false, false, args);
        	return evt;
        };

        this.open = function (reconnectAttempt) {
            ws = new WebSocket(self.url, protocols || []);
            ws.binaryType = this.binaryType;

            if (reconnectAttempt) {
                if (this.maxReconnectAttempts && this.reconnectAttempts > this.maxReconnectAttempts) {
                    return;
                }
            } else {
                eventTarget.dispatchEvent(generateEvent('connecting'));
                this.reconnectAttempts = 0;
            }

            if (self.debug || ReconnectingWebSocket.debugAll) {
                console.debug('ReconnectingWebSocket', 'attempt-connect', self.url);
            }

            var localWs = ws;
            var timeout = setTimeout(function() {
                if (self.debug || ReconnectingWebSocket.debugAll) {
                    console.debug('ReconnectingWebSocket', 'connection-timeout', self.url);
                }
                timedOut = true;
                localWs.close();
                timedOut = false;
            }, self.timeoutInterval);

            ws.onopen = function(event) {
                clearTimeout(timeout);
                if (self.debug || ReconnectingWebSocket.debugAll) {
                    console.debug('ReconnectingWebSocket', 'onopen', self.url);
                }
                self.protocol = ws.protocol;
                self.readyState = WebSocket.OPEN;
                self.reconnectAttempts = 0;
                var e = generateEvent('open');
                e.isReconnect = reconnectAttempt;
                reconnectAttempt = false;
                eventTarget.dispatchEvent(e);
            };

            ws.onclose = function(event) {
                clearTimeout(timeout);
                ws = null;
                if (forcedClose) {
                    self.readyState = WebSocket.CLOSED;
                    eventTarget.dispatchEvent(generateEvent('close'));
                } else {
                    self.readyState = WebSocket.CONNECTING;
                    var e = generateEvent('connecting');
                    e.code = event.code;
                    e.reason = event.reason;
                    e.wasClean = event.wasClean;
                    eventTarget.dispatchEvent(e);
                    if (!reconnectAttempt && !timedOut) {
                        if (self.debug || ReconnectingWebSocket.debugAll) {
                            console.debug('ReconnectingWebSocket', 'onclose', self.url);
                        }
                        eventTarget.dispatchEvent(generateEvent('close'));
                    }

                    var timeout = self.reconnectInterval * Math.pow(self.reconnectDecay, self.reconnectAttempts);
                    t = setTimeout(function() {
                        self.reconnectAttempts++;
                        self.open(true);
                    }, timeout > self.maxReconnectInterval ? self.maxReconnectInterval : timeout);
                }
            };
            ws.onmessage = function(event) {
                if (self.debug || ReconnectingWebSocket.debugAll) {
                    console.debug('ReconnectingWebSocket', 'onmessage', self.url, event.data);
                }
                var e = generateEvent('message');
                e.data = event.data;
                eventTarget.dispatchEvent(e);
            };
            ws.onerror = function(event) {
                if (self.debug || ReconnectingWebSocket.debugAll) {
                    console.debug('ReconnectingWebSocket', 'onerror', self.url, event);
                }
                eventTarget.dispatchEvent(generateEvent('error'));
            };
        }

        // Whether or not to create a websocket upon instantiation
        if (this.automaticOpen == true) {
            this.open(false);
        }

        /**
         * Transmits data to the server over the WebSocket connection.
         *
         * @param data a text string, ArrayBuffer or Blob to send to the server.
         */
        this.send = function(data) {
            if (ws) {
                if (self.debug || ReconnectingWebSocket.debugAll) {
                    console.debug('ReconnectingWebSocket', 'send', self.url, data);
                }
                return ws.send(data);
            } else {
                throw 'INVALID_STATE_ERR : Pausing to reconnect websocket';
            }
        };

        /**
         * Closes the WebSocket connection or connection attempt, if any.
         * If the connection is already CLOSED, this method does nothing.
         */
        this.close = function(code, reason) {
            // Default CLOSE_NORMAL code
            if (typeof code == 'undefined') {
                code = 1000;
            }
            forcedClose = true;
            if (ws) {
                ws.close(code, reason);
            }
            if (t) {
                clearTimeout(t);
                t = null;
            }
        };

        /**
         * Additional public API method to refresh the connection if still open (close, re-open).
         * For example, if the app suspects bad data / missed heart beats, it can try to refresh.
         */
        this.refresh = function() {
            if (ws) {
                ws.close();
            }
        };
    }

    /**
     * An event listener to be called when the WebSocket connection's readyState changes to OPEN;
     * this indicates that the connection is ready to send and receive data.
     */
    ReconnectingWebSocket.prototype.onopen = function(event) {};
    /** An event listener to be called when the WebSocket connection's readyState changes to CLOSED. */
    ReconnectingWebSocket.prototype.onclose = function(event) {};
    /** An event listener to be called when a connection begins being attempted. */
    ReconnectingWebSocket.prototype.onconnecting = function(event) {};
    /** An event listener to be called when a message is received from the server. */
    ReconnectingWebSocket.prototype.onmessage = function(event) {};
    /** An event listener to be called when an error occurs. */
    ReconnectingWebSocket.prototype.onerror = function(event) {};

    /**
     * Whether all instances of ReconnectingWebSocket should log debug messages.
     * Setting this to true is the equivalent of setting all instances of ReconnectingWebSocket.debug to true.
     */
    ReconnectingWebSocket.debugAll = false;

    ReconnectingWebSocket.CONNECTING = WebSocket.CONNECTING;
    ReconnectingWebSocket.OPEN = WebSocket.OPEN;
    ReconnectingWebSocket.CLOSING = WebSocket.CLOSING;
    ReconnectingWebSocket.CLOSED = WebSocket.CLOSED;

    return ReconnectingWebSocket;
});

},{}],6:[function(require,module,exports){

},{}],7:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}]},{},[1])(1)
});

//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJjanMvc3JjL0FwaUluc3RhbmNlcy5qcyIsImNqcy9zcmMvQ2hhaW5Db25maWcuanMiLCJjanMvc3JjL0NoYWluV2ViU29ja2V0LmpzIiwiY2pzL3NyYy9HcmFwaGVuZUFwaS5qcyIsIm5vZGVfbW9kdWxlcy9SZWNvbm5lY3RpbmdXZWJTb2NrZXQvcmVjb25uZWN0aW5nLXdlYnNvY2tldC5qcyIsIm5vZGVfbW9kdWxlcy9icm93c2VyLXJlc29sdmUvZW1wdHkuanMiLCJub2RlX21vZHVsZXMvcHJvY2Vzcy9icm93c2VyLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDdk1BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUNoRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDeFBBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbFhBOztBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigpe2Z1bmN0aW9uIHIoZSxuLHQpe2Z1bmN0aW9uIG8oaSxmKXtpZighbltpXSl7aWYoIWVbaV0pe3ZhciBjPVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmU7aWYoIWYmJmMpcmV0dXJuIGMoaSwhMCk7aWYodSlyZXR1cm4gdShpLCEwKTt2YXIgYT1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK2krXCInXCIpO3Rocm93IGEuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixhfXZhciBwPW5baV09e2V4cG9ydHM6e319O2VbaV1bMF0uY2FsbChwLmV4cG9ydHMsZnVuY3Rpb24ocil7dmFyIG49ZVtpXVsxXVtyXTtyZXR1cm4gbyhufHxyKX0scCxwLmV4cG9ydHMscixlLG4sdCl9cmV0dXJuIG5baV0uZXhwb3J0c31mb3IodmFyIHU9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZSxpPTA7aTx0Lmxlbmd0aDtpKyspbyh0W2ldKTtyZXR1cm4gb31yZXR1cm4gcn0pKCkiLCJcInVzZSBzdHJpY3RcIjtcblxuZXhwb3J0cy5fX2VzTW9kdWxlID0gdHJ1ZTtcblxudmFyIF9DaGFpbldlYlNvY2tldCA9IHJlcXVpcmUoXCIuL0NoYWluV2ViU29ja2V0XCIpO1xuXG52YXIgX0NoYWluV2ViU29ja2V0MiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX0NoYWluV2ViU29ja2V0KTtcblxudmFyIF9HcmFwaGVuZUFwaSA9IHJlcXVpcmUoXCIuL0dyYXBoZW5lQXBpXCIpO1xuXG52YXIgX0dyYXBoZW5lQXBpMiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX0dyYXBoZW5lQXBpKTtcblxudmFyIF9DaGFpbkNvbmZpZyA9IHJlcXVpcmUoXCIuL0NoYWluQ29uZmlnXCIpO1xuXG52YXIgX0NoYWluQ29uZmlnMiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX0NoYWluQ29uZmlnKTtcblxuZnVuY3Rpb24gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChvYmopIHsgcmV0dXJuIG9iaiAmJiBvYmouX19lc01vZHVsZSA/IG9iaiA6IHsgZGVmYXVsdDogb2JqIH07IH1cblxuZnVuY3Rpb24gX2NsYXNzQ2FsbENoZWNrKGluc3RhbmNlLCBDb25zdHJ1Y3RvcikgeyBpZiAoIShpbnN0YW5jZSBpbnN0YW5jZW9mIENvbnN0cnVjdG9yKSkgeyB0aHJvdyBuZXcgVHlwZUVycm9yKFwiQ2Fubm90IGNhbGwgYSBjbGFzcyBhcyBhIGZ1bmN0aW9uXCIpOyB9IH0gLy8gdmFyIHsgTGlzdCB9ID0gcmVxdWlyZShcImltbXV0YWJsZVwiKTtcblxuXG52YXIgaW5zdCA9IHZvaWQgMDtcbnZhciBhdXRvUmVjb25uZWN0ID0gdHJ1ZTtcbi8qKlxuICAgIENvbmZpZ3VyZTogY29uZmlndXJlIGFzIGZvbGxvd3MgYEFwaXMuaW5zdGFuY2UoXCJ3czovL2xvY2FsaG9zdDo4MDkwXCIpLmluaXRfcHJvbWlzZWAuICBUaGlzIHJldHVybnMgYSBwcm9taXNlLCBvbmNlIHJlc29sdmVkIHRoZSBjb25uZWN0aW9uIGlzIHJlYWR5LlxuXG4gICAgSW1wb3J0OiBpbXBvcnQgeyBBcGlzIH0gZnJvbSBcIkBncmFwaGVuZS9jaGFpblwiXG5cbiAgICBTaG9ydC1oYW5kOiBBcGlzLmRiKFwibWV0aG9kXCIsIFwicGFybTFcIiwgMiwgMywgLi4uKS4gIFJldHVybnMgYSBwcm9taXNlIHdpdGggcmVzdWx0cy5cblxuICAgIEFkZGl0aW9uYWwgdXNhZ2U6IEFwaXMuaW5zdGFuY2UoKS5kYl9hcGkoKS5leGVjKFwibWV0aG9kXCIsIFtcIm1ldGhvZFwiLCBcInBhcm0xXCIsIDIsIDMsIC4uLl0pLiAgUmV0dXJucyBhIHByb21pc2Ugd2l0aCByZXN1bHRzLlxuKi9cblxuZXhwb3J0cy5kZWZhdWx0ID0ge1xuXG4gICAgc2V0UnBjQ29ubmVjdGlvblN0YXR1c0NhbGxiYWNrOiBmdW5jdGlvbiBzZXRScGNDb25uZWN0aW9uU3RhdHVzQ2FsbGJhY2soY2FsbGJhY2spIHtcbiAgICAgICAgdGhpcy5zdGF0dXNDYiA9IGNhbGxiYWNrO1xuICAgICAgICBpZiAoaW5zdCkgaW5zdC5zZXRScGNDb25uZWN0aW9uU3RhdHVzQ2FsbGJhY2soY2FsbGJhY2spO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgICAgQGFyZyB7Ym9vbGVhbn0gYXV0byBtZWFucyBhdXRvbWF0aWMgcmVjb25uZWN0IGlmIHBvc3NpYmxlKCBicm93c2VyIGNhc2UpLCBkZWZhdWx0IHRydWVcbiAgICAqL1xuICAgIHNldEF1dG9SZWNvbm5lY3Q6IGZ1bmN0aW9uIHNldEF1dG9SZWNvbm5lY3QoYXV0bykge1xuICAgICAgICBhdXRvUmVjb25uZWN0ID0gYXV0bztcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICAgIEBhcmcge3N0cmluZ30gY3MgaXMgb25seSBwcm92aWRlZCBpbiB0aGUgZmlyc3QgY2FsbFxuICAgICAgICBAcmV0dXJuIHtBcGlzfSBzaW5nbGV0b24gLi4gQ2hlY2sgQXBpcy5pbnN0YW5jZSgpLmluaXRfcHJvbWlzZSB0byBrbm93IHdoZW4gdGhlIGNvbm5lY3Rpb24gaXMgZXN0YWJsaXNoZWRcbiAgICAqL1xuICAgIHJlc2V0OiBmdW5jdGlvbiByZXNldCgpIHtcbiAgICAgICAgdmFyIGNzID0gYXJndW1lbnRzLmxlbmd0aCA+IDAgJiYgYXJndW1lbnRzWzBdICE9PSB1bmRlZmluZWQgPyBhcmd1bWVudHNbMF0gOiBcIndzOi8vbG9jYWxob3N0OjgwOTBcIjtcblxuICAgICAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG4gICAgICAgIHZhciBjb25uZWN0ID0gYXJndW1lbnRzWzFdO1xuICAgICAgICB2YXIgY29ubmVjdFRpbWVvdXQgPSBhcmd1bWVudHMubGVuZ3RoID4gMiAmJiBhcmd1bWVudHNbMl0gIT09IHVuZGVmaW5lZCA/IGFyZ3VtZW50c1syXSA6IDQwMDA7XG5cbiAgICAgICAgcmV0dXJuIHRoaXMuY2xvc2UoKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGluc3QgPSBuZXcgQXBpc0luc3RhbmNlKCk7XG4gICAgICAgICAgICBpbnN0LnNldFJwY0Nvbm5lY3Rpb25TdGF0dXNDYWxsYmFjayhfdGhpcy5zdGF0dXNDYik7XG5cbiAgICAgICAgICAgIGlmIChpbnN0ICYmIGNvbm5lY3QpIHtcbiAgICAgICAgICAgICAgICBpbnN0LmNvbm5lY3QoY3MsIGNvbm5lY3RUaW1lb3V0KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIGluc3Q7XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgaW5zdGFuY2U6IGZ1bmN0aW9uIGluc3RhbmNlKCkge1xuICAgICAgICB2YXIgY3MgPSBhcmd1bWVudHMubGVuZ3RoID4gMCAmJiBhcmd1bWVudHNbMF0gIT09IHVuZGVmaW5lZCA/IGFyZ3VtZW50c1swXSA6IFwid3M6Ly9sb2NhbGhvc3Q6ODA5MFwiO1xuICAgICAgICB2YXIgY29ubmVjdCA9IGFyZ3VtZW50c1sxXTtcbiAgICAgICAgdmFyIGNvbm5lY3RUaW1lb3V0ID0gYXJndW1lbnRzLmxlbmd0aCA+IDIgJiYgYXJndW1lbnRzWzJdICE9PSB1bmRlZmluZWQgPyBhcmd1bWVudHNbMl0gOiA0MDAwO1xuICAgICAgICB2YXIgZW5hYmxlQ3J5cHRvID0gYXJndW1lbnRzWzNdO1xuXG4gICAgICAgIGlmICghaW5zdCkge1xuICAgICAgICAgICAgaW5zdCA9IG5ldyBBcGlzSW5zdGFuY2UoKTtcbiAgICAgICAgICAgIGluc3Quc2V0UnBjQ29ubmVjdGlvblN0YXR1c0NhbGxiYWNrKHRoaXMuc3RhdHVzQ2IpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGluc3QgJiYgY29ubmVjdCkge1xuICAgICAgICAgICAgaW5zdC5jb25uZWN0KGNzLCBjb25uZWN0VGltZW91dCwgZW5hYmxlQ3J5cHRvKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBpbnN0O1xuICAgIH0sXG4gICAgY2hhaW5JZDogZnVuY3Rpb24gY2hhaW5JZCgpIHtcbiAgICAgICAgcmV0dXJuIEFwaXMuaW5zdGFuY2UoKS5jaGFpbl9pZDtcbiAgICB9LFxuXG4gICAgY2xvc2U6IGZ1bmN0aW9uIGNsb3NlKCkge1xuICAgICAgICBpZiAoaW5zdCkge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXMpIHtcbiAgICAgICAgICAgICAgICBpbnN0LmNsb3NlKCkudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIGluc3QgPSBudWxsO1xuICAgICAgICAgICAgICAgICAgICByZXMoKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xuICAgIH1cbiAgICAvLyBkYjogKG1ldGhvZCwgLi4uYXJncykgPT4gQXBpcy5pbnN0YW5jZSgpLmRiX2FwaSgpLmV4ZWMobWV0aG9kLCB0b1N0cmluZ3MoYXJncykpLFxuICAgIC8vIG5ldHdvcms6IChtZXRob2QsIC4uLmFyZ3MpID0+IEFwaXMuaW5zdGFuY2UoKS5uZXR3b3JrX2FwaSgpLmV4ZWMobWV0aG9kLCB0b1N0cmluZ3MoYXJncykpLFxuICAgIC8vIGhpc3Rvcnk6IChtZXRob2QsIC4uLmFyZ3MpID0+IEFwaXMuaW5zdGFuY2UoKS5oaXN0b3J5X2FwaSgpLmV4ZWMobWV0aG9kLCB0b1N0cmluZ3MoYXJncykpLFxuICAgIC8vIGNyeXB0bzogKG1ldGhvZCwgLi4uYXJncykgPT4gQXBpcy5pbnN0YW5jZSgpLmNyeXB0b19hcGkoKS5leGVjKG1ldGhvZCwgdG9TdHJpbmdzKGFyZ3MpKVxufTtcblxudmFyIEFwaXNJbnN0YW5jZSA9IGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBBcGlzSW5zdGFuY2UoKSB7XG4gICAgICAgIF9jbGFzc0NhbGxDaGVjayh0aGlzLCBBcGlzSW5zdGFuY2UpO1xuICAgIH1cblxuICAgIC8qKiBAYXJnIHtzdHJpbmd9IGNvbm5lY3Rpb24gLi4gKi9cbiAgICBBcGlzSW5zdGFuY2UucHJvdG90eXBlLmNvbm5lY3QgPSBmdW5jdGlvbiBjb25uZWN0KGNzLCBjb25uZWN0VGltZW91dCkge1xuICAgICAgICB2YXIgX3RoaXMyID0gdGhpcztcblxuICAgICAgICB2YXIgZW5hYmxlQ3J5cHRvID0gYXJndW1lbnRzLmxlbmd0aCA+IDIgJiYgYXJndW1lbnRzWzJdICE9PSB1bmRlZmluZWQgPyBhcmd1bWVudHNbMl0gOiBmYWxzZTtcblxuICAgICAgICAvLyBjb25zb2xlLmxvZyhcIklORk9cXHRBcGlJbnN0YW5jZXNcXHRjb25uZWN0XFx0XCIsIGNzKTtcbiAgICAgICAgdGhpcy51cmwgPSBjcztcbiAgICAgICAgdmFyIHJwY191c2VyID0gXCJcIixcbiAgICAgICAgICAgIHJwY19wYXNzd29yZCA9IFwiXCI7XG4gICAgICAgIGlmICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiICYmIHdpbmRvdy5sb2NhdGlvbiAmJiB3aW5kb3cubG9jYXRpb24ucHJvdG9jb2wgPT09IFwiaHR0cHM6XCIgJiYgY3MuaW5kZXhPZihcIndzczovL1wiKSA8IDApIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlNlY3VyZSBkb21haW5zIHJlcXVpcmUgd3NzIGNvbm5lY3Rpb25cIik7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLndzX3JwYyA9IG5ldyBfQ2hhaW5XZWJTb2NrZXQyLmRlZmF1bHQoY3MsIHRoaXMuc3RhdHVzQ2IsIGNvbm5lY3RUaW1lb3V0LCBhdXRvUmVjb25uZWN0LCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBpZiAoX3RoaXMyLl9kYikge1xuICAgICAgICAgICAgICAgIF90aGlzMi5fZGIuZXhlYygnZ2V0X29iamVjdHMnLCBbWycyLjEuMCddXSkuY2F0Y2goZnVuY3Rpb24gKGUpIHt9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5pbml0X3Byb21pc2UgPSB0aGlzLndzX3JwYy5sb2dpbihycGNfdXNlciwgcnBjX3Bhc3N3b3JkKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiQ29ubmVjdGVkIHRvIEFQSSBub2RlOlwiLCBjcyk7XG4gICAgICAgICAgICBfdGhpczIuX2RiID0gbmV3IF9HcmFwaGVuZUFwaTIuZGVmYXVsdChfdGhpczIud3NfcnBjLCBcImRhdGFiYXNlXCIpO1xuICAgICAgICAgICAgX3RoaXMyLl9uZXQgPSBuZXcgX0dyYXBoZW5lQXBpMi5kZWZhdWx0KF90aGlzMi53c19ycGMsIFwibmV0d29ya19icm9hZGNhc3RcIik7XG4gICAgICAgICAgICBfdGhpczIuX2hpc3QgPSBuZXcgX0dyYXBoZW5lQXBpMi5kZWZhdWx0KF90aGlzMi53c19ycGMsIFwiaGlzdG9yeVwiKTtcbiAgICAgICAgICAgIGlmIChlbmFibGVDcnlwdG8pIF90aGlzMi5fY3J5cHQgPSBuZXcgX0dyYXBoZW5lQXBpMi5kZWZhdWx0KF90aGlzMi53c19ycGMsIFwiY3J5cHRvXCIpO1xuICAgICAgICAgICAgdmFyIGRiX3Byb21pc2UgPSBfdGhpczIuX2RiLmluaXQoKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAvL2h0dHBzOi8vZ2l0aHViLmNvbS9jcnlwdG9ub21leC9ncmFwaGVuZS93aWtpL2NoYWluLWxvY2tlZC10eFxuICAgICAgICAgICAgICAgIHJldHVybiBfdGhpczIuX2RiLmV4ZWMoXCJnZXRfY2hhaW5faWRcIiwgW10pLnRoZW4oZnVuY3Rpb24gKF9jaGFpbl9pZCkge1xuICAgICAgICAgICAgICAgICAgICBfdGhpczIuY2hhaW5faWQgPSBfY2hhaW5faWQ7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBfQ2hhaW5Db25maWcyLmRlZmF1bHQuc2V0Q2hhaW5JZChfY2hhaW5faWQpO1xuICAgICAgICAgICAgICAgICAgICAvL0RFQlVHIGNvbnNvbGUubG9nKFwiY2hhaW5faWQxXCIsdGhpcy5jaGFpbl9pZClcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgX3RoaXMyLndzX3JwYy5vbl9yZWNvbm5lY3QgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgX3RoaXMyLndzX3JwYy5sb2dpbihcIlwiLCBcIlwiKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgX3RoaXMyLl9kYi5pbml0KCkudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoX3RoaXMyLnN0YXR1c0NiKSBfdGhpczIuc3RhdHVzQ2IoXCJyZWNvbm5lY3RcIik7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBfdGhpczIuX25ldC5pbml0KCk7XG4gICAgICAgICAgICAgICAgICAgIF90aGlzMi5faGlzdC5pbml0KCk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChlbmFibGVDcnlwdG8pIF90aGlzMi5fY3J5cHQuaW5pdCgpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHZhciBpbml0UHJvbWlzZXMgPSBbZGJfcHJvbWlzZSwgX3RoaXMyLl9uZXQuaW5pdCgpLCBfdGhpczIuX2hpc3QuaW5pdCgpXTtcbiAgICAgICAgICAgIGlmIChlbmFibGVDcnlwdG8pIGluaXRQcm9taXNlcy5wdXNoKF90aGlzMi5fY3J5cHQuaW5pdCgpKTtcbiAgICAgICAgICAgIHJldHVybiBQcm9taXNlLmFsbChpbml0UHJvbWlzZXMpO1xuICAgICAgICB9KTtcbiAgICB9O1xuXG4gICAgQXBpc0luc3RhbmNlLnByb3RvdHlwZS5jbG9zZSA9IGZ1bmN0aW9uIGNsb3NlKCkge1xuICAgICAgICB2YXIgX3RoaXMzID0gdGhpcztcblxuICAgICAgICBpZiAodGhpcy53c19ycGMpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLndzX3JwYy5jbG9zZSgpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIF90aGlzMy53c19ycGMgPSBudWxsO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG4gICAgICAgIHRoaXMud3NfcnBjID0gbnVsbDtcbiAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xuICAgIH07XG5cbiAgICBBcGlzSW5zdGFuY2UucHJvdG90eXBlLmRiX2FwaSA9IGZ1bmN0aW9uIGRiX2FwaSgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2RiO1xuICAgIH07XG5cbiAgICBBcGlzSW5zdGFuY2UucHJvdG90eXBlLm5ldHdvcmtfYXBpID0gZnVuY3Rpb24gbmV0d29ya19hcGkoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9uZXQ7XG4gICAgfTtcblxuICAgIEFwaXNJbnN0YW5jZS5wcm90b3R5cGUuaGlzdG9yeV9hcGkgPSBmdW5jdGlvbiBoaXN0b3J5X2FwaSgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2hpc3Q7XG4gICAgfTtcblxuICAgIEFwaXNJbnN0YW5jZS5wcm90b3R5cGUuY3J5cHRvX2FwaSA9IGZ1bmN0aW9uIGNyeXB0b19hcGkoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9jcnlwdDtcbiAgICB9O1xuXG4gICAgQXBpc0luc3RhbmNlLnByb3RvdHlwZS5zZXRScGNDb25uZWN0aW9uU3RhdHVzQ2FsbGJhY2sgPSBmdW5jdGlvbiBzZXRScGNDb25uZWN0aW9uU3RhdHVzQ2FsbGJhY2soY2FsbGJhY2spIHtcbiAgICAgICAgdGhpcy5zdGF0dXNDYiA9IGNhbGxiYWNrO1xuICAgIH07XG5cbiAgICByZXR1cm4gQXBpc0luc3RhbmNlO1xufSgpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGV4cG9ydHNbXCJkZWZhdWx0XCJdOyIsIlwidXNlIHN0cmljdFwiO1xuXG5leHBvcnRzLl9fZXNNb2R1bGUgPSB0cnVlO1xudmFyIF90aGlzID0gdm9pZCAwO1xuXG52YXIgZWNjX2NvbmZpZyA9IHtcbiAgICBhZGRyZXNzX3ByZWZpeDogcHJvY2Vzcy5lbnYubnBtX2NvbmZpZ19fZ3JhcGhlbmVfZWNjX2RlZmF1bHRfYWRkcmVzc19wcmVmaXggfHwgXCJTRUVSXCJcbn07XG5cbl90aGlzID0ge1xuICAgIGNvcmVfYXNzZXQ6IFwiU0VFUlwiLFxuICAgIGFkZHJlc3NfcHJlZml4OiBcIlNFRVJcIixcbiAgICBleHBpcmVfaW5fc2VjczogMTIwLFxuICAgIGV4cGlyZV9pbl9zZWNzX3Byb3Bvc2FsOiAyNCAqIDYwICogNjAsXG4gICAgcmV2aWV3X2luX3NlY3NfY29tbWl0dGVlOiAyNCAqIDYwICogNjAsXG4gICAgbmV0d29ya3M6IHtcbiAgICAgICAgU0VFUjoge1xuICAgICAgICAgICAgY29yZV9hc3NldDogXCJTRUVSXCIsXG4gICAgICAgICAgICBhZGRyZXNzX3ByZWZpeDogXCJTRUVSXCIsXG4gICAgICAgICAgICBjaGFpbl9pZDogXCJjZWE0ZmRmNGY1YzIyNzhmMTM5YjIyZTc4MmIzMDg5MjhmMDQwMDhiMGZjMmM3OTk3MGE1ODk3NGEyYTI4ZjkxXCJcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKiogU2V0IGEgZmV3IHByb3BlcnRpZXMgZm9yIGtub3duIGNoYWluIElEcy4gKi9cbiAgICBzZXRDaGFpbklkOiBmdW5jdGlvbiBzZXRDaGFpbklkKGNoYWluX2lkKSB7XG5cbiAgICAgICAgdmFyIGkgPSB2b2lkIDAsXG4gICAgICAgICAgICBsZW4gPSB2b2lkIDAsXG4gICAgICAgICAgICBuZXR3b3JrID0gdm9pZCAwLFxuICAgICAgICAgICAgbmV0d29ya19uYW1lID0gdm9pZCAwLFxuICAgICAgICAgICAgcmVmID0gdm9pZCAwO1xuICAgICAgICByZWYgPSBPYmplY3Qua2V5cyhfdGhpcy5uZXR3b3Jrcyk7XG5cbiAgICAgICAgZm9yIChpID0gMCwgbGVuID0gcmVmLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG5cbiAgICAgICAgICAgIG5ldHdvcmtfbmFtZSA9IHJlZltpXTtcbiAgICAgICAgICAgIG5ldHdvcmsgPSBfdGhpcy5uZXR3b3Jrc1tuZXR3b3JrX25hbWVdO1xuXG4gICAgICAgICAgICBpZiAobmV0d29yay5jaGFpbl9pZCA9PT0gY2hhaW5faWQpIHtcblxuICAgICAgICAgICAgICAgIF90aGlzLm5ldHdvcmtfbmFtZSA9IG5ldHdvcmtfbmFtZTtcblxuICAgICAgICAgICAgICAgIGlmIChuZXR3b3JrLmFkZHJlc3NfcHJlZml4KSB7XG4gICAgICAgICAgICAgICAgICAgIF90aGlzLmFkZHJlc3NfcHJlZml4ID0gbmV0d29yay5hZGRyZXNzX3ByZWZpeDtcbiAgICAgICAgICAgICAgICAgICAgZWNjX2NvbmZpZy5hZGRyZXNzX3ByZWZpeCA9IG5ldHdvcmsuYWRkcmVzc19wcmVmaXg7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gY29uc29sZS5sb2coXCJJTkZPICAgIENvbmZpZ3VyZWQgZm9yXCIsIG5ldHdvcmtfbmFtZSwgXCI6XCIsIG5ldHdvcmsuY29yZV9hc3NldCwgXCJcXG5cIik7XG5cbiAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICBuZXR3b3JrX25hbWU6IG5ldHdvcmtfbmFtZSxcbiAgICAgICAgICAgICAgICAgICAgbmV0d29yazogbmV0d29ya1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIV90aGlzLm5ldHdvcmtfbmFtZSkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJVbmtub3duIGNoYWluIGlkICh0aGlzIG1heSBiZSBhIHRlc3RuZXQpXCIsIGNoYWluX2lkKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICByZXNldDogZnVuY3Rpb24gcmVzZXQoKSB7XG4gICAgICAgIF90aGlzLmNvcmVfYXNzZXQgPSBcIlNFRVJcIjtcbiAgICAgICAgX3RoaXMuYWRkcmVzc19wcmVmaXggPSBcIlNFRVJcIjtcbiAgICAgICAgZWNjX2NvbmZpZy5hZGRyZXNzX3ByZWZpeCA9IFwiU0VFUlwiO1xuICAgICAgICBfdGhpcy5leHBpcmVfaW5fc2VjcyA9IDE1O1xuICAgICAgICBfdGhpcy5leHBpcmVfaW5fc2Vjc19wcm9wb3NhbCA9IDI0ICogNjAgKiA2MDtcblxuICAgICAgICBjb25zb2xlLmxvZyhcIkNoYWluIGNvbmZpZyByZXNldFwiKTtcbiAgICB9LFxuXG4gICAgc2V0UHJlZml4OiBmdW5jdGlvbiBzZXRQcmVmaXgoKSB7XG4gICAgICAgIHZhciBwcmVmaXggPSBhcmd1bWVudHMubGVuZ3RoID4gMCAmJiBhcmd1bWVudHNbMF0gIT09IHVuZGVmaW5lZCA/IGFyZ3VtZW50c1swXSA6IFwiU0VFUlwiO1xuXG4gICAgICAgIF90aGlzLmFkZHJlc3NfcHJlZml4ID0gcHJlZml4O1xuICAgICAgICBlY2NfY29uZmlnLmFkZHJlc3NfcHJlZml4ID0gcHJlZml4O1xuICAgIH1cbn07XG5cbmV4cG9ydHMuZGVmYXVsdCA9IF90aGlzO1xubW9kdWxlLmV4cG9ydHMgPSBleHBvcnRzW1wiZGVmYXVsdFwiXTsiLCJcInVzZSBzdHJpY3RcIjtcblxuZXhwb3J0cy5fX2VzTW9kdWxlID0gdHJ1ZTtcblxuZnVuY3Rpb24gX2NsYXNzQ2FsbENoZWNrKGluc3RhbmNlLCBDb25zdHJ1Y3RvcikgeyBpZiAoIShpbnN0YW5jZSBpbnN0YW5jZW9mIENvbnN0cnVjdG9yKSkgeyB0aHJvdyBuZXcgVHlwZUVycm9yKFwiQ2Fubm90IGNhbGwgYSBjbGFzcyBhcyBhIGZ1bmN0aW9uXCIpOyB9IH1cblxudmFyIFdlYlNvY2tldENsaWVudCA9IHZvaWQgMDtcbmlmICh0eXBlb2YgV2ViU29ja2V0ID09PSBcInVuZGVmaW5lZFwiICYmICFwcm9jZXNzLmVudi5icm93c2VyKSB7XG4gICAgV2ViU29ja2V0Q2xpZW50ID0gcmVxdWlyZShcIndzXCIpO1xufSBlbHNlIGlmICh0eXBlb2YgV2ViU29ja2V0ICE9PSBcInVuZGVmaW5lZFwiICYmIHR5cGVvZiBkb2N1bWVudCAhPT0gXCJ1bmRlZmluZWRcIikge1xuICAgIFdlYlNvY2tldENsaWVudCA9IHJlcXVpcmUoXCJSZWNvbm5lY3RpbmdXZWJTb2NrZXRcIik7XG59IGVsc2Uge1xuICAgIFdlYlNvY2tldENsaWVudCA9IFdlYlNvY2tldDtcbn1cblxudmFyIFNPQ0tFVF9ERUJVRyA9IGZhbHNlO1xuXG5mdW5jdGlvbiBnZXRXZWJTb2NrZXRDbGllbnQoYXV0b1JlY29ubmVjdCkge1xuICAgIGlmICghYXV0b1JlY29ubmVjdCAmJiB0eXBlb2YgV2ViU29ja2V0ICE9PSBcInVuZGVmaW5lZFwiICYmIHR5cGVvZiBkb2N1bWVudCAhPT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgICByZXR1cm4gV2ViU29ja2V0O1xuICAgIH1cbiAgICByZXR1cm4gV2ViU29ja2V0Q2xpZW50O1xufVxuXG52YXIga2VlcF9hbGl2ZV9pbnRlcnZhbCA9IDUwMDA7XG52YXIgbWF4X3NlbmRfbGlmZSA9IDU7XG52YXIgbWF4X3JlY3ZfbGlmZSA9IG1heF9zZW5kX2xpZmUgKiAyO1xuXG52YXIgQ2hhaW5XZWJTb2NrZXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gQ2hhaW5XZWJTb2NrZXQod3Nfc2VydmVyLCBzdGF0dXNDYikge1xuICAgICAgICB2YXIgY29ubmVjdFRpbWVvdXQgPSBhcmd1bWVudHMubGVuZ3RoID4gMiAmJiBhcmd1bWVudHNbMl0gIT09IHVuZGVmaW5lZCA/IGFyZ3VtZW50c1syXSA6IDUwMDA7XG5cbiAgICAgICAgdmFyIF90aGlzID0gdGhpcztcblxuICAgICAgICB2YXIgYXV0b1JlY29ubmVjdCA9IGFyZ3VtZW50cy5sZW5ndGggPiAzICYmIGFyZ3VtZW50c1szXSAhPT0gdW5kZWZpbmVkID8gYXJndW1lbnRzWzNdIDogdHJ1ZTtcbiAgICAgICAgdmFyIGtlZXBBbGl2ZUNiID0gYXJndW1lbnRzLmxlbmd0aCA+IDQgJiYgYXJndW1lbnRzWzRdICE9PSB1bmRlZmluZWQgPyBhcmd1bWVudHNbNF0gOiBudWxsO1xuXG4gICAgICAgIF9jbGFzc0NhbGxDaGVjayh0aGlzLCBDaGFpbldlYlNvY2tldCk7XG5cbiAgICAgICAgdGhpcy5zdGF0dXNDYiA9IHN0YXR1c0NiO1xuICAgICAgICB0aGlzLmNvbm5lY3Rpb25UaW1lb3V0ID0gc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBpZiAoX3RoaXMuY3VycmVudF9yZWplY3QpIHtcbiAgICAgICAgICAgICAgICB2YXIgcmVqZWN0ID0gX3RoaXMuY3VycmVudF9yZWplY3Q7XG4gICAgICAgICAgICAgICAgX3RoaXMuY3VycmVudF9yZWplY3QgPSBudWxsO1xuICAgICAgICAgICAgICAgIGlmIChfdGhpcy53cy50ZXJtaW5hdGUpIHtcbiAgICAgICAgICAgICAgICAgICAgX3RoaXMud3MudGVybWluYXRlKCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgX3RoaXMud3MuY2xvc2UoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmVqZWN0KG5ldyBFcnJvcihcIkNvbm5lY3Rpb24gYXR0ZW1wdCB0aW1lZCBvdXQ6IFwiICsgd3Nfc2VydmVyKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIGNvbm5lY3RUaW1lb3V0KTtcbiAgICAgICAgdmFyIFdzQ2xpZW50ID0gZ2V0V2ViU29ja2V0Q2xpZW50KGF1dG9SZWNvbm5lY3QpO1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgdGhpcy53cyA9IG5ldyBXc0NsaWVudCh3c19zZXJ2ZXIpO1xuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcihcImludmFsaWQgd2Vic29ja2V0IFVSTDpcIiwgZXJyb3IsIHdzX3NlcnZlcik7XG4gICAgICAgICAgICB0aGlzLndzID0gbmV3IFdzQ2xpZW50KFwid3NzOi8vMTI3LjAuMC4xOjgwOTBcIik7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy53cy50aW1lb3V0SW50ZXJ2YWwgPSA1MDAwO1xuICAgICAgICB0aGlzLmN1cnJlbnRfcmVqZWN0ID0gbnVsbDtcbiAgICAgICAgdGhpcy5vbl9yZWNvbm5lY3QgPSBudWxsO1xuICAgICAgICB0aGlzLnNlbmRfbGlmZSA9IG1heF9zZW5kX2xpZmU7XG4gICAgICAgIHRoaXMucmVjdl9saWZlID0gbWF4X3JlY3ZfbGlmZTtcbiAgICAgICAgdGhpcy5rZWVwQWxpdmVDYiA9IGtlZXBBbGl2ZUNiO1xuICAgICAgICB0aGlzLmNvbm5lY3RfcHJvbWlzZSA9IG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgICAgIF90aGlzLmN1cnJlbnRfcmVqZWN0ID0gcmVqZWN0O1xuICAgICAgICAgICAgX3RoaXMud3Mub25vcGVuID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGNsZWFyVGltZW91dChfdGhpcy5jb25uZWN0aW9uVGltZW91dCk7XG4gICAgICAgICAgICAgICAgaWYgKF90aGlzLnN0YXR1c0NiKSBfdGhpcy5zdGF0dXNDYihcIm9wZW5cIik7XG4gICAgICAgICAgICAgICAgaWYgKF90aGlzLm9uX3JlY29ubmVjdCkgX3RoaXMub25fcmVjb25uZWN0KCk7XG4gICAgICAgICAgICAgICAgX3RoaXMua2VlcGFsaXZlX3RpbWVyID0gc2V0SW50ZXJ2YWwoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICBfdGhpcy5yZWN2X2xpZmUtLTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKF90aGlzLnJlY3ZfbGlmZSA9PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdrZWVwIGFsaXZlIHRpbWVvdXQuJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoX3RoaXMud3MudGVybWluYXRlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgX3RoaXMud3MudGVybWluYXRlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF90aGlzLndzLmNsb3NlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBjbGVhckludGVydmFsKF90aGlzLmtlZXBhbGl2ZV90aW1lcik7XG4gICAgICAgICAgICAgICAgICAgICAgICBfdGhpcy5rZWVwYWxpdmVfdGltZXIgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgX3RoaXMuc2VuZF9saWZlLS07XG4gICAgICAgICAgICAgICAgICAgIGlmIChfdGhpcy5zZW5kX2xpZmUgPT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gdGhpcy53cy5waW5nKCcnLCBmYWxzZSwgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoX3RoaXMua2VlcEFsaXZlQ2IpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBfdGhpcy5rZWVwQWxpdmVDYigpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgX3RoaXMuc2VuZF9saWZlID0gbWF4X3NlbmRfbGlmZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0sIDUwMDApO1xuICAgICAgICAgICAgICAgIF90aGlzLmN1cnJlbnRfcmVqZWN0ID0gbnVsbDtcbiAgICAgICAgICAgICAgICByZXNvbHZlKCk7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgX3RoaXMud3Mub25lcnJvciA9IGZ1bmN0aW9uIChlcnJvcikge1xuICAgICAgICAgICAgICAgIGlmIChfdGhpcy5rZWVwYWxpdmVfdGltZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgY2xlYXJJbnRlcnZhbChfdGhpcy5rZWVwYWxpdmVfdGltZXIpO1xuICAgICAgICAgICAgICAgICAgICBfdGhpcy5rZWVwYWxpdmVfdGltZXIgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNsZWFyVGltZW91dChfdGhpcy5jb25uZWN0aW9uVGltZW91dCk7XG4gICAgICAgICAgICAgICAgaWYgKF90aGlzLnN0YXR1c0NiKSBfdGhpcy5zdGF0dXNDYihcImVycm9yXCIpO1xuXG4gICAgICAgICAgICAgICAgaWYgKF90aGlzLmN1cnJlbnRfcmVqZWN0KSB7XG4gICAgICAgICAgICAgICAgICAgIF90aGlzLmN1cnJlbnRfcmVqZWN0KGVycm9yKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgX3RoaXMud3Mub25tZXNzYWdlID0gZnVuY3Rpb24gKG1lc3NhZ2UpIHtcbiAgICAgICAgICAgICAgICBfdGhpcy5yZWN2X2xpZmUgPSBtYXhfcmVjdl9saWZlO1xuICAgICAgICAgICAgICAgIF90aGlzLmxpc3RlbmVyKEpTT04ucGFyc2UobWVzc2FnZS5kYXRhKSk7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgX3RoaXMud3Mub25jbG9zZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBpZiAoX3RoaXMua2VlcGFsaXZlX3RpbWVyKSB7XG4gICAgICAgICAgICAgICAgICAgIGNsZWFySW50ZXJ2YWwoX3RoaXMua2VlcGFsaXZlX3RpbWVyKTtcbiAgICAgICAgICAgICAgICAgICAgX3RoaXMua2VlcGFsaXZlX3RpbWVyID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB2YXIgZXJyID0gbmV3IEVycm9yKCdjb25uZWN0aW9uIGNsb3NlZCcpO1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGNiSWQgPSBfdGhpcy5yZXNwb25zZUNiSWQgKyAxOyBjYklkIDw9IF90aGlzLmNiSWQ7IGNiSWQgKz0gMSkge1xuICAgICAgICAgICAgICAgICAgICBfdGhpcy5jYnNbY2JJZF0ucmVqZWN0KGVycik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChfdGhpcy5zdGF0dXNDYikgX3RoaXMuc3RhdHVzQ2IoXCJjbG9zZWRcIik7XG4gICAgICAgICAgICAgICAgaWYgKF90aGlzLmNsb3NlQ2IpIF90aGlzLmNsb3NlQ2IoKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLmNiSWQgPSAwO1xuICAgICAgICB0aGlzLnJlc3BvbnNlQ2JJZCA9IDA7XG4gICAgICAgIHRoaXMuY2JzID0ge307XG4gICAgICAgIHRoaXMuc3VicyA9IHt9O1xuICAgICAgICB0aGlzLnVuc3ViID0ge307XG4gICAgfVxuXG4gICAgQ2hhaW5XZWJTb2NrZXQucHJvdG90eXBlLmNhbGwgPSBmdW5jdGlvbiBjYWxsKHBhcmFtcykge1xuICAgICAgICB2YXIgX3RoaXMyID0gdGhpcztcblxuICAgICAgICBpZiAodGhpcy53cy5yZWFkeVN0YXRlICE9PSAxKSB7XG4gICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QobmV3IEVycm9yKCd3ZWJzb2NrZXQgc3RhdGUgZXJyb3I6JyArIHRoaXMud3MucmVhZHlTdGF0ZSkpO1xuICAgICAgICB9XG4gICAgICAgIHZhciBtZXRob2QgPSBwYXJhbXNbMV07XG4gICAgICAgIGlmIChTT0NLRVRfREVCVUcpIGNvbnNvbGUubG9nKFwiW0NoYWluV2ViU29ja2V0XSA+LS0tLSBjYWxsIC0tLS0tPiAgXFxcImlkXFxcIjpcIiArICh0aGlzLmNiSWQgKyAxKSwgSlNPTi5zdHJpbmdpZnkocGFyYW1zKSk7XG5cbiAgICAgICAgdGhpcy5jYklkICs9IDE7XG5cbiAgICAgICAgaWYgKG1ldGhvZCA9PT0gXCJzZXRfc3Vic2NyaWJlX2NhbGxiYWNrXCIgfHwgbWV0aG9kID09PSBcInN1YnNjcmliZV90b19tYXJrZXRcIiB8fCBtZXRob2QgPT09IFwiYnJvYWRjYXN0X3RyYW5zYWN0aW9uX3dpdGhfY2FsbGJhY2tcIiB8fCBtZXRob2QgPT09IFwic2V0X3BlbmRpbmdfdHJhbnNhY3Rpb25fY2FsbGJhY2tcIikge1xuICAgICAgICAgICAgLy8gU3RvcmUgY2FsbGJhY2sgaW4gc3VicyBtYXBcbiAgICAgICAgICAgIHRoaXMuc3Vic1t0aGlzLmNiSWRdID0ge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrOiBwYXJhbXNbMl1bMF1cbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8vIFJlcGxhY2UgY2FsbGJhY2sgd2l0aCB0aGUgY2FsbGJhY2sgaWRcbiAgICAgICAgICAgIHBhcmFtc1syXVswXSA9IHRoaXMuY2JJZDtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChtZXRob2QgPT09IFwidW5zdWJzY3JpYmVfZnJvbV9tYXJrZXRcIiB8fCBtZXRob2QgPT09IFwidW5zdWJzY3JpYmVfZnJvbV9hY2NvdW50c1wiKSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIHBhcmFtc1syXVswXSAhPT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiRmlyc3QgcGFyYW1ldGVyIG9mIHVuc3ViIG11c3QgYmUgdGhlIG9yaWdpbmFsIGNhbGxiYWNrXCIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgdW5TdWJDYiA9IHBhcmFtc1syXS5zcGxpY2UoMCwgMSlbMF07XG5cbiAgICAgICAgICAgIC8vIEZpbmQgdGhlIGNvcnJlc3BvbmRpbmcgc3Vic2NyaXB0aW9uXG4gICAgICAgICAgICBmb3IgKHZhciBpZCBpbiB0aGlzLnN1YnMpIHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5zdWJzW2lkXS5jYWxsYmFjayA9PT0gdW5TdWJDYikge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnVuc3ViW3RoaXMuY2JJZF0gPSBpZDtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgdmFyIHJlcXVlc3QgPSB7XG4gICAgICAgICAgICBtZXRob2Q6IFwiY2FsbFwiLFxuICAgICAgICAgICAgcGFyYW1zOiBwYXJhbXNcbiAgICAgICAgfTtcbiAgICAgICAgcmVxdWVzdC5pZCA9IHRoaXMuY2JJZDtcbiAgICAgICAgdGhpcy5zZW5kX2xpZmUgPSBtYXhfc2VuZF9saWZlO1xuXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgICAgICBfdGhpczIuY2JzW190aGlzMi5jYklkXSA9IHtcbiAgICAgICAgICAgICAgICB0aW1lOiBuZXcgRGF0ZSgpLFxuICAgICAgICAgICAgICAgIHJlc29sdmU6IHJlc29sdmUsXG4gICAgICAgICAgICAgICAgcmVqZWN0OiByZWplY3RcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBfdGhpczIud3Muc2VuZChKU09OLnN0cmluZ2lmeShyZXF1ZXN0KSk7XG4gICAgICAgIH0pO1xuICAgIH07XG5cbiAgICBDaGFpbldlYlNvY2tldC5wcm90b3R5cGUubGlzdGVuZXIgPSBmdW5jdGlvbiBsaXN0ZW5lcihyZXNwb25zZSkge1xuICAgICAgICBpZiAoU09DS0VUX0RFQlVHKSBjb25zb2xlLmxvZyhcIltDaGFpbldlYlNvY2tldF0gPC0tLS0gcmVwbHkgLS0tLTxcIiwgSlNPTi5zdHJpbmdpZnkocmVzcG9uc2UpKTtcblxuICAgICAgICB2YXIgc3ViID0gZmFsc2UsXG4gICAgICAgICAgICBjYWxsYmFjayA9IG51bGw7XG5cbiAgICAgICAgaWYgKHJlc3BvbnNlLm1ldGhvZCA9PT0gXCJub3RpY2VcIikge1xuICAgICAgICAgICAgc3ViID0gdHJ1ZTtcbiAgICAgICAgICAgIHJlc3BvbnNlLmlkID0gcmVzcG9uc2UucGFyYW1zWzBdO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFzdWIpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrID0gdGhpcy5jYnNbcmVzcG9uc2UuaWRdO1xuICAgICAgICAgICAgdGhpcy5yZXNwb25zZUNiSWQgPSByZXNwb25zZS5pZDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNhbGxiYWNrID0gdGhpcy5zdWJzW3Jlc3BvbnNlLmlkXS5jYWxsYmFjaztcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChjYWxsYmFjayAmJiAhc3ViKSB7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2UuZXJyb3IpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjay5yZWplY3QocmVzcG9uc2UuZXJyb3IpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjay5yZXNvbHZlKHJlc3BvbnNlLnJlc3VsdCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBkZWxldGUgdGhpcy5jYnNbcmVzcG9uc2UuaWRdO1xuXG4gICAgICAgICAgICBpZiAodGhpcy51bnN1YltyZXNwb25zZS5pZF0pIHtcbiAgICAgICAgICAgICAgICBkZWxldGUgdGhpcy5zdWJzW3RoaXMudW5zdWJbcmVzcG9uc2UuaWRdXTtcbiAgICAgICAgICAgICAgICBkZWxldGUgdGhpcy51bnN1YltyZXNwb25zZS5pZF07XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoY2FsbGJhY2sgJiYgc3ViKSB7XG4gICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZS5wYXJhbXNbMV0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJXYXJuaW5nOiB1bmtub3duIHdlYnNvY2tldCByZXNwb25zZTogXCIsIHJlc3BvbnNlKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBDaGFpbldlYlNvY2tldC5wcm90b3R5cGUubG9naW4gPSBmdW5jdGlvbiBsb2dpbih1c2VyLCBwYXNzd29yZCkge1xuICAgICAgICB2YXIgX3RoaXMzID0gdGhpcztcblxuICAgICAgICByZXR1cm4gdGhpcy5jb25uZWN0X3Byb21pc2UudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gX3RoaXMzLmNhbGwoWzEsIFwibG9naW5cIiwgW3VzZXIsIHBhc3N3b3JkXV0pO1xuICAgICAgICB9KTtcbiAgICB9O1xuXG4gICAgQ2hhaW5XZWJTb2NrZXQucHJvdG90eXBlLmNsb3NlID0gZnVuY3Rpb24gY2xvc2UoKSB7XG4gICAgICAgIHZhciBfdGhpczQgPSB0aGlzO1xuXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzKSB7XG4gICAgICAgICAgICBfdGhpczQuY2xvc2VDYiA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXMoKTtcbiAgICAgICAgICAgICAgICBfdGhpczQuY2xvc2VDYiA9IG51bGw7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgX3RoaXM0LndzLmNsb3NlKCk7XG4gICAgICAgICAgICBpZiAoX3RoaXM0LndzLnJlYWR5U3RhdGUgIT09IDEpIHJlcygpO1xuICAgICAgICB9KTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIENoYWluV2ViU29ja2V0O1xufSgpO1xuXG5leHBvcnRzLmRlZmF1bHQgPSBDaGFpbldlYlNvY2tldDtcbm1vZHVsZS5leHBvcnRzID0gZXhwb3J0c1tcImRlZmF1bHRcIl07IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbmV4cG9ydHMuX19lc01vZHVsZSA9IHRydWU7XG5cbmZ1bmN0aW9uIF9jbGFzc0NhbGxDaGVjayhpbnN0YW5jZSwgQ29uc3RydWN0b3IpIHsgaWYgKCEoaW5zdGFuY2UgaW5zdGFuY2VvZiBDb25zdHJ1Y3RvcikpIHsgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkNhbm5vdCBjYWxsIGEgY2xhc3MgYXMgYSBmdW5jdGlvblwiKTsgfSB9XG5cbnZhciBHcmFwaGVuZUFwaSA9IGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBHcmFwaGVuZUFwaSh3c19ycGMsIGFwaV9uYW1lKSB7XG4gICAgICAgIF9jbGFzc0NhbGxDaGVjayh0aGlzLCBHcmFwaGVuZUFwaSk7XG5cbiAgICAgICAgdGhpcy53c19ycGMgPSB3c19ycGM7XG4gICAgICAgIHRoaXMuYXBpX25hbWUgPSBhcGlfbmFtZTtcbiAgICB9XG5cbiAgICBHcmFwaGVuZUFwaS5wcm90b3R5cGUuaW5pdCA9IGZ1bmN0aW9uIGluaXQoKSB7XG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgcmV0dXJuIHRoaXMud3NfcnBjLmNhbGwoWzEsIHRoaXMuYXBpX25hbWUsIFtdXSkudGhlbihmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICAgICAgICAgIC8vY29uc29sZS5sb2coXCJbR3JhcGhlbmVBcGkuanM6MTFdIC0tLS0tIEdyYXBoZW5lQXBpLmluaXQgLS0tLS0+XCIsIHRoaXMuYXBpX25hbWUsIHJlc3BvbnNlKTtcbiAgICAgICAgICAgIHNlbGYuYXBpX2lkID0gcmVzcG9uc2U7XG4gICAgICAgICAgICByZXR1cm4gc2VsZjtcbiAgICAgICAgfSk7XG4gICAgfTtcblxuICAgIEdyYXBoZW5lQXBpLnByb3RvdHlwZS5leGVjID0gZnVuY3Rpb24gZXhlYyhtZXRob2QsIHBhcmFtcykge1xuICAgICAgICByZXR1cm4gdGhpcy53c19ycGMuY2FsbChbdGhpcy5hcGlfaWQsIG1ldGhvZCwgcGFyYW1zXSkuY2F0Y2goZnVuY3Rpb24gKGVycm9yKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIiEhISBHcmFwaGVuZUFwaSBlcnJvcjogXCIsIG1ldGhvZCwgcGFyYW1zLCBlcnJvciwgSlNPTi5zdHJpbmdpZnkoZXJyb3IpKTtcbiAgICAgICAgICAgIHRocm93IGVycm9yO1xuICAgICAgICB9KTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIEdyYXBoZW5lQXBpO1xufSgpO1xuXG5leHBvcnRzLmRlZmF1bHQgPSBHcmFwaGVuZUFwaTtcbm1vZHVsZS5leHBvcnRzID0gZXhwb3J0c1tcImRlZmF1bHRcIl07IiwiLy8gTUlUIExpY2Vuc2U6XG4vL1xuLy8gQ29weXJpZ2h0IChjKSAyMDEwLTIwMTIsIEpvZSBXYWxuZXNcbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5XG4vLyBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsXG4vLyBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzXG4vLyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsXG4vLyBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXNcbi8vIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWQgaW5cbi8vIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1MgT1Jcbi8vIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLFxuLy8gRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG4vLyBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSXG4vLyBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLFxuLy8gT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTlxuLy8gVEhFIFNPRlRXQVJFLlxuXG4vKipcbiAqIFRoaXMgYmVoYXZlcyBsaWtlIGEgV2ViU29ja2V0IGluIGV2ZXJ5IHdheSwgZXhjZXB0IGlmIGl0IGZhaWxzIHRvIGNvbm5lY3QsXG4gKiBvciBpdCBnZXRzIGRpc2Nvbm5lY3RlZCwgaXQgd2lsbCByZXBlYXRlZGx5IHBvbGwgdW50aWwgaXQgc3VjY2Vzc2Z1bGx5IGNvbm5lY3RzXG4gKiBhZ2Fpbi5cbiAqXG4gKiBJdCBpcyBBUEkgY29tcGF0aWJsZSwgc28gd2hlbiB5b3UgaGF2ZTpcbiAqICAgd3MgPSBuZXcgV2ViU29ja2V0KCd3czovLy4uLi4nKTtcbiAqIHlvdSBjYW4gcmVwbGFjZSB3aXRoOlxuICogICB3cyA9IG5ldyBSZWNvbm5lY3RpbmdXZWJTb2NrZXQoJ3dzOi8vLi4uLicpO1xuICpcbiAqIFRoZSBldmVudCBzdHJlYW0gd2lsbCB0eXBpY2FsbHkgbG9vayBsaWtlOlxuICogIG9uY29ubmVjdGluZ1xuICogIG9ub3BlblxuICogIG9ubWVzc2FnZVxuICogIG9ubWVzc2FnZVxuICogIG9uY2xvc2UgLy8gbG9zdCBjb25uZWN0aW9uXG4gKiAgb25jb25uZWN0aW5nXG4gKiAgb25vcGVuICAvLyBzb21ldGltZSBsYXRlci4uLlxuICogIG9ubWVzc2FnZVxuICogIG9ubWVzc2FnZVxuICogIGV0Yy4uLlxuICpcbiAqIEl0IGlzIEFQSSBjb21wYXRpYmxlIHdpdGggdGhlIHN0YW5kYXJkIFdlYlNvY2tldCBBUEksIGFwYXJ0IGZyb20gdGhlIGZvbGxvd2luZyBtZW1iZXJzOlxuICpcbiAqIC0gYGJ1ZmZlcmVkQW1vdW50YFxuICogLSBgZXh0ZW5zaW9uc2BcbiAqIC0gYGJpbmFyeVR5cGVgXG4gKlxuICogTGF0ZXN0IHZlcnNpb246IGh0dHBzOi8vZ2l0aHViLmNvbS9qb2V3YWxuZXMvcmVjb25uZWN0aW5nLXdlYnNvY2tldC9cbiAqIC0gSm9lIFdhbG5lc1xuICpcbiAqIFN5bnRheFxuICogPT09PT09XG4gKiB2YXIgc29ja2V0ID0gbmV3IFJlY29ubmVjdGluZ1dlYlNvY2tldCh1cmwsIHByb3RvY29scywgb3B0aW9ucyk7XG4gKlxuICogUGFyYW1ldGVyc1xuICogPT09PT09PT09PVxuICogdXJsIC0gVGhlIHVybCB5b3UgYXJlIGNvbm5lY3RpbmcgdG8uXG4gKiBwcm90b2NvbHMgLSBPcHRpb25hbCBzdHJpbmcgb3IgYXJyYXkgb2YgcHJvdG9jb2xzLlxuICogb3B0aW9ucyAtIFNlZSBiZWxvd1xuICpcbiAqIE9wdGlvbnNcbiAqID09PT09PT1cbiAqIE9wdGlvbnMgY2FuIGVpdGhlciBiZSBwYXNzZWQgdXBvbiBpbnN0YW50aWF0aW9uIG9yIHNldCBhZnRlciBpbnN0YW50aWF0aW9uOlxuICpcbiAqIHZhciBzb2NrZXQgPSBuZXcgUmVjb25uZWN0aW5nV2ViU29ja2V0KHVybCwgbnVsbCwgeyBkZWJ1ZzogdHJ1ZSwgcmVjb25uZWN0SW50ZXJ2YWw6IDQwMDAgfSk7XG4gKlxuICogb3JcbiAqXG4gKiB2YXIgc29ja2V0ID0gbmV3IFJlY29ubmVjdGluZ1dlYlNvY2tldCh1cmwpO1xuICogc29ja2V0LmRlYnVnID0gdHJ1ZTtcbiAqIHNvY2tldC5yZWNvbm5lY3RJbnRlcnZhbCA9IDQwMDA7XG4gKlxuICogZGVidWdcbiAqIC0gV2hldGhlciB0aGlzIGluc3RhbmNlIHNob3VsZCBsb2cgZGVidWcgbWVzc2FnZXMuIEFjY2VwdHMgdHJ1ZSBvciBmYWxzZS4gRGVmYXVsdDogZmFsc2UuXG4gKlxuICogYXV0b21hdGljT3BlblxuICogLSBXaGV0aGVyIG9yIG5vdCB0aGUgd2Vic29ja2V0IHNob3VsZCBhdHRlbXB0IHRvIGNvbm5lY3QgaW1tZWRpYXRlbHkgdXBvbiBpbnN0YW50aWF0aW9uLiBUaGUgc29ja2V0IGNhbiBiZSBtYW51YWxseSBvcGVuZWQgb3IgY2xvc2VkIGF0IGFueSB0aW1lIHVzaW5nIHdzLm9wZW4oKSBhbmQgd3MuY2xvc2UoKS5cbiAqXG4gKiByZWNvbm5lY3RJbnRlcnZhbFxuICogLSBUaGUgbnVtYmVyIG9mIG1pbGxpc2Vjb25kcyB0byBkZWxheSBiZWZvcmUgYXR0ZW1wdGluZyB0byByZWNvbm5lY3QuIEFjY2VwdHMgaW50ZWdlci4gRGVmYXVsdDogMTAwMC5cbiAqXG4gKiBtYXhSZWNvbm5lY3RJbnRlcnZhbFxuICogLSBUaGUgbWF4aW11bSBudW1iZXIgb2YgbWlsbGlzZWNvbmRzIHRvIGRlbGF5IGEgcmVjb25uZWN0aW9uIGF0dGVtcHQuIEFjY2VwdHMgaW50ZWdlci4gRGVmYXVsdDogMzAwMDAuXG4gKlxuICogcmVjb25uZWN0RGVjYXlcbiAqIC0gVGhlIHJhdGUgb2YgaW5jcmVhc2Ugb2YgdGhlIHJlY29ubmVjdCBkZWxheS4gQWxsb3dzIHJlY29ubmVjdCBhdHRlbXB0cyB0byBiYWNrIG9mZiB3aGVuIHByb2JsZW1zIHBlcnNpc3QuIEFjY2VwdHMgaW50ZWdlciBvciBmbG9hdC4gRGVmYXVsdDogMS41LlxuICpcbiAqIHRpbWVvdXRJbnRlcnZhbFxuICogLSBUaGUgbWF4aW11bSB0aW1lIGluIG1pbGxpc2Vjb25kcyB0byB3YWl0IGZvciBhIGNvbm5lY3Rpb24gdG8gc3VjY2VlZCBiZWZvcmUgY2xvc2luZyBhbmQgcmV0cnlpbmcuIEFjY2VwdHMgaW50ZWdlci4gRGVmYXVsdDogMjAwMC5cbiAqXG4gKi9cbihmdW5jdGlvbiAoZ2xvYmFsLCBmYWN0b3J5KSB7XG4gICAgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xuICAgICAgICBkZWZpbmUoW10sIGZhY3RvcnkpO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcgJiYgbW9kdWxlLmV4cG9ydHMpe1xuICAgICAgICBtb2R1bGUuZXhwb3J0cyA9IGZhY3RvcnkoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBnbG9iYWwuUmVjb25uZWN0aW5nV2ViU29ja2V0ID0gZmFjdG9yeSgpO1xuICAgIH1cbn0pKHRoaXMsIGZ1bmN0aW9uICgpIHtcblxuICAgIGlmICh0eXBlb2Ygd2luZG93ID09PSBcInVuZGVmaW5lZFwiIHx8ICEoJ1dlYlNvY2tldCcgaW4gd2luZG93KSkge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gUmVjb25uZWN0aW5nV2ViU29ja2V0KHVybCwgcHJvdG9jb2xzLCBvcHRpb25zKSB7XG5cbiAgICAgICAgLy8gRGVmYXVsdCBzZXR0aW5nc1xuICAgICAgICB2YXIgc2V0dGluZ3MgPSB7XG5cbiAgICAgICAgICAgIC8qKiBXaGV0aGVyIHRoaXMgaW5zdGFuY2Ugc2hvdWxkIGxvZyBkZWJ1ZyBtZXNzYWdlcy4gKi9cbiAgICAgICAgICAgIGRlYnVnOiBmYWxzZSxcblxuICAgICAgICAgICAgLyoqIFdoZXRoZXIgb3Igbm90IHRoZSB3ZWJzb2NrZXQgc2hvdWxkIGF0dGVtcHQgdG8gY29ubmVjdCBpbW1lZGlhdGVseSB1cG9uIGluc3RhbnRpYXRpb24uICovXG4gICAgICAgICAgICBhdXRvbWF0aWNPcGVuOiB0cnVlLFxuXG4gICAgICAgICAgICAvKiogVGhlIG51bWJlciBvZiBtaWxsaXNlY29uZHMgdG8gZGVsYXkgYmVmb3JlIGF0dGVtcHRpbmcgdG8gcmVjb25uZWN0LiAqL1xuICAgICAgICAgICAgcmVjb25uZWN0SW50ZXJ2YWw6IDEwMDAsXG4gICAgICAgICAgICAvKiogVGhlIG1heGltdW0gbnVtYmVyIG9mIG1pbGxpc2Vjb25kcyB0byBkZWxheSBhIHJlY29ubmVjdGlvbiBhdHRlbXB0LiAqL1xuICAgICAgICAgICAgbWF4UmVjb25uZWN0SW50ZXJ2YWw6IDMwMDAwLFxuICAgICAgICAgICAgLyoqIFRoZSByYXRlIG9mIGluY3JlYXNlIG9mIHRoZSByZWNvbm5lY3QgZGVsYXkuIEFsbG93cyByZWNvbm5lY3QgYXR0ZW1wdHMgdG8gYmFjayBvZmYgd2hlbiBwcm9ibGVtcyBwZXJzaXN0LiAqL1xuICAgICAgICAgICAgcmVjb25uZWN0RGVjYXk6IDEuNSxcblxuICAgICAgICAgICAgLyoqIFRoZSBtYXhpbXVtIHRpbWUgaW4gbWlsbGlzZWNvbmRzIHRvIHdhaXQgZm9yIGEgY29ubmVjdGlvbiB0byBzdWNjZWVkIGJlZm9yZSBjbG9zaW5nIGFuZCByZXRyeWluZy4gKi9cbiAgICAgICAgICAgIHRpbWVvdXRJbnRlcnZhbDogMjAwMCxcblxuICAgICAgICAgICAgLyoqIFRoZSBtYXhpbXVtIG51bWJlciBvZiByZWNvbm5lY3Rpb24gYXR0ZW1wdHMgdG8gbWFrZS4gVW5saW1pdGVkIGlmIG51bGwuICovXG4gICAgICAgICAgICBtYXhSZWNvbm5lY3RBdHRlbXB0czogbnVsbCxcblxuICAgICAgICAgICAgLyoqIFRoZSBiaW5hcnkgdHlwZSwgcG9zc2libGUgdmFsdWVzICdibG9iJyBvciAnYXJyYXlidWZmZXInLCBkZWZhdWx0ICdibG9iJy4gKi9cbiAgICAgICAgICAgIGJpbmFyeVR5cGU6ICdibG9iJ1xuICAgICAgICB9XG4gICAgICAgIGlmICghb3B0aW9ucykgeyBvcHRpb25zID0ge307IH1cblxuICAgICAgICAvLyBPdmVyd3JpdGUgYW5kIGRlZmluZSBzZXR0aW5ncyB3aXRoIG9wdGlvbnMgaWYgdGhleSBleGlzdC5cbiAgICAgICAgZm9yICh2YXIga2V5IGluIHNldHRpbmdzKSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIG9wdGlvbnNba2V5XSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICB0aGlzW2tleV0gPSBvcHRpb25zW2tleV07XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXNba2V5XSA9IHNldHRpbmdzW2tleV07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBUaGVzZSBzaG91bGQgYmUgdHJlYXRlZCBhcyByZWFkLW9ubHkgcHJvcGVydGllc1xuXG4gICAgICAgIC8qKiBUaGUgVVJMIGFzIHJlc29sdmVkIGJ5IHRoZSBjb25zdHJ1Y3Rvci4gVGhpcyBpcyBhbHdheXMgYW4gYWJzb2x1dGUgVVJMLiBSZWFkIG9ubHkuICovXG4gICAgICAgIHRoaXMudXJsID0gdXJsO1xuXG4gICAgICAgIC8qKiBUaGUgbnVtYmVyIG9mIGF0dGVtcHRlZCByZWNvbm5lY3RzIHNpbmNlIHN0YXJ0aW5nLCBvciB0aGUgbGFzdCBzdWNjZXNzZnVsIGNvbm5lY3Rpb24uIFJlYWQgb25seS4gKi9cbiAgICAgICAgdGhpcy5yZWNvbm5lY3RBdHRlbXB0cyA9IDA7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFRoZSBjdXJyZW50IHN0YXRlIG9mIHRoZSBjb25uZWN0aW9uLlxuICAgICAgICAgKiBDYW4gYmUgb25lIG9mOiBXZWJTb2NrZXQuQ09OTkVDVElORywgV2ViU29ja2V0Lk9QRU4sIFdlYlNvY2tldC5DTE9TSU5HLCBXZWJTb2NrZXQuQ0xPU0VEXG4gICAgICAgICAqIFJlYWQgb25seS5cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMucmVhZHlTdGF0ZSA9IFdlYlNvY2tldC5DT05ORUNUSU5HO1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBBIHN0cmluZyBpbmRpY2F0aW5nIHRoZSBuYW1lIG9mIHRoZSBzdWItcHJvdG9jb2wgdGhlIHNlcnZlciBzZWxlY3RlZDsgdGhpcyB3aWxsIGJlIG9uZSBvZlxuICAgICAgICAgKiB0aGUgc3RyaW5ncyBzcGVjaWZpZWQgaW4gdGhlIHByb3RvY29scyBwYXJhbWV0ZXIgd2hlbiBjcmVhdGluZyB0aGUgV2ViU29ja2V0IG9iamVjdC5cbiAgICAgICAgICogUmVhZCBvbmx5LlxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5wcm90b2NvbCA9IG51bGw7XG5cbiAgICAgICAgLy8gUHJpdmF0ZSBzdGF0ZSB2YXJpYWJsZXNcblxuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgIHZhciB3cztcbiAgICAgICAgdmFyIGZvcmNlZENsb3NlID0gZmFsc2U7XG4gICAgICAgIHZhciB0aW1lZE91dCA9IGZhbHNlO1xuICAgICAgICB2YXIgdCA9IG51bGw7XG4gICAgICAgIHZhciBldmVudFRhcmdldCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuXG4gICAgICAgIC8vIFdpcmUgdXAgXCJvbipcIiBwcm9wZXJ0aWVzIGFzIGV2ZW50IGhhbmRsZXJzXG5cbiAgICAgICAgZXZlbnRUYXJnZXQuYWRkRXZlbnRMaXN0ZW5lcignb3BlbicsICAgICAgIGZ1bmN0aW9uKGV2ZW50KSB7IHNlbGYub25vcGVuKGV2ZW50KTsgfSk7XG4gICAgICAgIGV2ZW50VGFyZ2V0LmFkZEV2ZW50TGlzdGVuZXIoJ2Nsb3NlJywgICAgICBmdW5jdGlvbihldmVudCkgeyBzZWxmLm9uY2xvc2UoZXZlbnQpOyB9KTtcbiAgICAgICAgZXZlbnRUYXJnZXQuYWRkRXZlbnRMaXN0ZW5lcignY29ubmVjdGluZycsIGZ1bmN0aW9uKGV2ZW50KSB7IHNlbGYub25jb25uZWN0aW5nKGV2ZW50KTsgfSk7XG4gICAgICAgIGV2ZW50VGFyZ2V0LmFkZEV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCAgICBmdW5jdGlvbihldmVudCkgeyBzZWxmLm9ubWVzc2FnZShldmVudCk7IH0pO1xuICAgICAgICBldmVudFRhcmdldC5hZGRFdmVudExpc3RlbmVyKCdlcnJvcicsICAgICAgZnVuY3Rpb24oZXZlbnQpIHsgc2VsZi5vbmVycm9yKGV2ZW50KTsgfSk7XG5cbiAgICAgICAgLy8gRXhwb3NlIHRoZSBBUEkgcmVxdWlyZWQgYnkgRXZlbnRUYXJnZXRcblxuICAgICAgICB0aGlzLmFkZEV2ZW50TGlzdGVuZXIgPSBldmVudFRhcmdldC5hZGRFdmVudExpc3RlbmVyLmJpbmQoZXZlbnRUYXJnZXQpO1xuICAgICAgICB0aGlzLnJlbW92ZUV2ZW50TGlzdGVuZXIgPSBldmVudFRhcmdldC5yZW1vdmVFdmVudExpc3RlbmVyLmJpbmQoZXZlbnRUYXJnZXQpO1xuICAgICAgICB0aGlzLmRpc3BhdGNoRXZlbnQgPSBldmVudFRhcmdldC5kaXNwYXRjaEV2ZW50LmJpbmQoZXZlbnRUYXJnZXQpO1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBUaGlzIGZ1bmN0aW9uIGdlbmVyYXRlcyBhbiBldmVudCB0aGF0IGlzIGNvbXBhdGlibGUgd2l0aCBzdGFuZGFyZFxuICAgICAgICAgKiBjb21wbGlhbnQgYnJvd3NlcnMgYW5kIElFOSAtIElFMTFcbiAgICAgICAgICpcbiAgICAgICAgICogVGhpcyB3aWxsIHByZXZlbnQgdGhlIGVycm9yOlxuICAgICAgICAgKiBPYmplY3QgZG9lc24ndCBzdXBwb3J0IHRoaXMgYWN0aW9uXG4gICAgICAgICAqXG4gICAgICAgICAqIGh0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvMTkzNDUzOTIvd2h5LWFyZW50LW15LXBhcmFtZXRlcnMtZ2V0dGluZy1wYXNzZWQtdGhyb3VnaC10by1hLWRpc3BhdGNoZWQtZXZlbnQvMTkzNDU1NjMjMTkzNDU1NjNcbiAgICAgICAgICogQHBhcmFtIHMgU3RyaW5nIFRoZSBuYW1lIHRoYXQgdGhlIGV2ZW50IHNob3VsZCB1c2VcbiAgICAgICAgICogQHBhcmFtIGFyZ3MgT2JqZWN0IGFuIG9wdGlvbmFsIG9iamVjdCB0aGF0IHRoZSBldmVudCB3aWxsIHVzZVxuICAgICAgICAgKi9cbiAgICAgICAgZnVuY3Rpb24gZ2VuZXJhdGVFdmVudChzLCBhcmdzKSB7XG4gICAgICAgIFx0dmFyIGV2dCA9IGRvY3VtZW50LmNyZWF0ZUV2ZW50KFwiQ3VzdG9tRXZlbnRcIik7XG4gICAgICAgIFx0ZXZ0LmluaXRDdXN0b21FdmVudChzLCBmYWxzZSwgZmFsc2UsIGFyZ3MpO1xuICAgICAgICBcdHJldHVybiBldnQ7XG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5vcGVuID0gZnVuY3Rpb24gKHJlY29ubmVjdEF0dGVtcHQpIHtcbiAgICAgICAgICAgIHdzID0gbmV3IFdlYlNvY2tldChzZWxmLnVybCwgcHJvdG9jb2xzIHx8IFtdKTtcbiAgICAgICAgICAgIHdzLmJpbmFyeVR5cGUgPSB0aGlzLmJpbmFyeVR5cGU7XG5cbiAgICAgICAgICAgIGlmIChyZWNvbm5lY3RBdHRlbXB0KSB7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMubWF4UmVjb25uZWN0QXR0ZW1wdHMgJiYgdGhpcy5yZWNvbm5lY3RBdHRlbXB0cyA+IHRoaXMubWF4UmVjb25uZWN0QXR0ZW1wdHMpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZXZlbnRUYXJnZXQuZGlzcGF0Y2hFdmVudChnZW5lcmF0ZUV2ZW50KCdjb25uZWN0aW5nJykpO1xuICAgICAgICAgICAgICAgIHRoaXMucmVjb25uZWN0QXR0ZW1wdHMgPSAwO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoc2VsZi5kZWJ1ZyB8fCBSZWNvbm5lY3RpbmdXZWJTb2NrZXQuZGVidWdBbGwpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmRlYnVnKCdSZWNvbm5lY3RpbmdXZWJTb2NrZXQnLCAnYXR0ZW1wdC1jb25uZWN0Jywgc2VsZi51cmwpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgbG9jYWxXcyA9IHdzO1xuICAgICAgICAgICAgdmFyIHRpbWVvdXQgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIGlmIChzZWxmLmRlYnVnIHx8IFJlY29ubmVjdGluZ1dlYlNvY2tldC5kZWJ1Z0FsbCkge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmRlYnVnKCdSZWNvbm5lY3RpbmdXZWJTb2NrZXQnLCAnY29ubmVjdGlvbi10aW1lb3V0Jywgc2VsZi51cmwpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB0aW1lZE91dCA9IHRydWU7XG4gICAgICAgICAgICAgICAgbG9jYWxXcy5jbG9zZSgpO1xuICAgICAgICAgICAgICAgIHRpbWVkT3V0ID0gZmFsc2U7XG4gICAgICAgICAgICB9LCBzZWxmLnRpbWVvdXRJbnRlcnZhbCk7XG5cbiAgICAgICAgICAgIHdzLm9ub3BlbiA9IGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xuICAgICAgICAgICAgICAgIGlmIChzZWxmLmRlYnVnIHx8IFJlY29ubmVjdGluZ1dlYlNvY2tldC5kZWJ1Z0FsbCkge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmRlYnVnKCdSZWNvbm5lY3RpbmdXZWJTb2NrZXQnLCAnb25vcGVuJywgc2VsZi51cmwpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBzZWxmLnByb3RvY29sID0gd3MucHJvdG9jb2w7XG4gICAgICAgICAgICAgICAgc2VsZi5yZWFkeVN0YXRlID0gV2ViU29ja2V0Lk9QRU47XG4gICAgICAgICAgICAgICAgc2VsZi5yZWNvbm5lY3RBdHRlbXB0cyA9IDA7XG4gICAgICAgICAgICAgICAgdmFyIGUgPSBnZW5lcmF0ZUV2ZW50KCdvcGVuJyk7XG4gICAgICAgICAgICAgICAgZS5pc1JlY29ubmVjdCA9IHJlY29ubmVjdEF0dGVtcHQ7XG4gICAgICAgICAgICAgICAgcmVjb25uZWN0QXR0ZW1wdCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIGV2ZW50VGFyZ2V0LmRpc3BhdGNoRXZlbnQoZSk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICB3cy5vbmNsb3NlID0gZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgICAgICAgICAgICBjbGVhclRpbWVvdXQodGltZW91dCk7XG4gICAgICAgICAgICAgICAgd3MgPSBudWxsO1xuICAgICAgICAgICAgICAgIGlmIChmb3JjZWRDbG9zZSkge1xuICAgICAgICAgICAgICAgICAgICBzZWxmLnJlYWR5U3RhdGUgPSBXZWJTb2NrZXQuQ0xPU0VEO1xuICAgICAgICAgICAgICAgICAgICBldmVudFRhcmdldC5kaXNwYXRjaEV2ZW50KGdlbmVyYXRlRXZlbnQoJ2Nsb3NlJykpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHNlbGYucmVhZHlTdGF0ZSA9IFdlYlNvY2tldC5DT05ORUNUSU5HO1xuICAgICAgICAgICAgICAgICAgICB2YXIgZSA9IGdlbmVyYXRlRXZlbnQoJ2Nvbm5lY3RpbmcnKTtcbiAgICAgICAgICAgICAgICAgICAgZS5jb2RlID0gZXZlbnQuY29kZTtcbiAgICAgICAgICAgICAgICAgICAgZS5yZWFzb24gPSBldmVudC5yZWFzb247XG4gICAgICAgICAgICAgICAgICAgIGUud2FzQ2xlYW4gPSBldmVudC53YXNDbGVhbjtcbiAgICAgICAgICAgICAgICAgICAgZXZlbnRUYXJnZXQuZGlzcGF0Y2hFdmVudChlKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFyZWNvbm5lY3RBdHRlbXB0ICYmICF0aW1lZE91dCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHNlbGYuZGVidWcgfHwgUmVjb25uZWN0aW5nV2ViU29ja2V0LmRlYnVnQWxsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5kZWJ1ZygnUmVjb25uZWN0aW5nV2ViU29ja2V0JywgJ29uY2xvc2UnLCBzZWxmLnVybCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBldmVudFRhcmdldC5kaXNwYXRjaEV2ZW50KGdlbmVyYXRlRXZlbnQoJ2Nsb3NlJykpO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgdmFyIHRpbWVvdXQgPSBzZWxmLnJlY29ubmVjdEludGVydmFsICogTWF0aC5wb3coc2VsZi5yZWNvbm5lY3REZWNheSwgc2VsZi5yZWNvbm5lY3RBdHRlbXB0cyk7XG4gICAgICAgICAgICAgICAgICAgIHQgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5yZWNvbm5lY3RBdHRlbXB0cysrO1xuICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5vcGVuKHRydWUpO1xuICAgICAgICAgICAgICAgICAgICB9LCB0aW1lb3V0ID4gc2VsZi5tYXhSZWNvbm5lY3RJbnRlcnZhbCA/IHNlbGYubWF4UmVjb25uZWN0SW50ZXJ2YWwgOiB0aW1lb3V0KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgd3Mub25tZXNzYWdlID0gZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgICAgICAgICAgICBpZiAoc2VsZi5kZWJ1ZyB8fCBSZWNvbm5lY3RpbmdXZWJTb2NrZXQuZGVidWdBbGwpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5kZWJ1ZygnUmVjb25uZWN0aW5nV2ViU29ja2V0JywgJ29ubWVzc2FnZScsIHNlbGYudXJsLCBldmVudC5kYXRhKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdmFyIGUgPSBnZW5lcmF0ZUV2ZW50KCdtZXNzYWdlJyk7XG4gICAgICAgICAgICAgICAgZS5kYXRhID0gZXZlbnQuZGF0YTtcbiAgICAgICAgICAgICAgICBldmVudFRhcmdldC5kaXNwYXRjaEV2ZW50KGUpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHdzLm9uZXJyb3IgPSBmdW5jdGlvbihldmVudCkge1xuICAgICAgICAgICAgICAgIGlmIChzZWxmLmRlYnVnIHx8IFJlY29ubmVjdGluZ1dlYlNvY2tldC5kZWJ1Z0FsbCkge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmRlYnVnKCdSZWNvbm5lY3RpbmdXZWJTb2NrZXQnLCAnb25lcnJvcicsIHNlbGYudXJsLCBldmVudCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGV2ZW50VGFyZ2V0LmRpc3BhdGNoRXZlbnQoZ2VuZXJhdGVFdmVudCgnZXJyb3InKSk7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gV2hldGhlciBvciBub3QgdG8gY3JlYXRlIGEgd2Vic29ja2V0IHVwb24gaW5zdGFudGlhdGlvblxuICAgICAgICBpZiAodGhpcy5hdXRvbWF0aWNPcGVuID09IHRydWUpIHtcbiAgICAgICAgICAgIHRoaXMub3BlbihmYWxzZSk7XG4gICAgICAgIH1cblxuICAgICAgICAvKipcbiAgICAgICAgICogVHJhbnNtaXRzIGRhdGEgdG8gdGhlIHNlcnZlciBvdmVyIHRoZSBXZWJTb2NrZXQgY29ubmVjdGlvbi5cbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIGRhdGEgYSB0ZXh0IHN0cmluZywgQXJyYXlCdWZmZXIgb3IgQmxvYiB0byBzZW5kIHRvIHRoZSBzZXJ2ZXIuXG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLnNlbmQgPSBmdW5jdGlvbihkYXRhKSB7XG4gICAgICAgICAgICBpZiAod3MpIHtcbiAgICAgICAgICAgICAgICBpZiAoc2VsZi5kZWJ1ZyB8fCBSZWNvbm5lY3RpbmdXZWJTb2NrZXQuZGVidWdBbGwpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5kZWJ1ZygnUmVjb25uZWN0aW5nV2ViU29ja2V0JywgJ3NlbmQnLCBzZWxmLnVybCwgZGF0YSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiB3cy5zZW5kKGRhdGEpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aHJvdyAnSU5WQUxJRF9TVEFURV9FUlIgOiBQYXVzaW5nIHRvIHJlY29ubmVjdCB3ZWJzb2NrZXQnO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBDbG9zZXMgdGhlIFdlYlNvY2tldCBjb25uZWN0aW9uIG9yIGNvbm5lY3Rpb24gYXR0ZW1wdCwgaWYgYW55LlxuICAgICAgICAgKiBJZiB0aGUgY29ubmVjdGlvbiBpcyBhbHJlYWR5IENMT1NFRCwgdGhpcyBtZXRob2QgZG9lcyBub3RoaW5nLlxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5jbG9zZSA9IGZ1bmN0aW9uKGNvZGUsIHJlYXNvbikge1xuICAgICAgICAgICAgLy8gRGVmYXVsdCBDTE9TRV9OT1JNQUwgY29kZVxuICAgICAgICAgICAgaWYgKHR5cGVvZiBjb2RlID09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgY29kZSA9IDEwMDA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmb3JjZWRDbG9zZSA9IHRydWU7XG4gICAgICAgICAgICBpZiAod3MpIHtcbiAgICAgICAgICAgICAgICB3cy5jbG9zZShjb2RlLCByZWFzb24pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHQpIHtcbiAgICAgICAgICAgICAgICBjbGVhclRpbWVvdXQodCk7XG4gICAgICAgICAgICAgICAgdCA9IG51bGw7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEFkZGl0aW9uYWwgcHVibGljIEFQSSBtZXRob2QgdG8gcmVmcmVzaCB0aGUgY29ubmVjdGlvbiBpZiBzdGlsbCBvcGVuIChjbG9zZSwgcmUtb3BlbikuXG4gICAgICAgICAqIEZvciBleGFtcGxlLCBpZiB0aGUgYXBwIHN1c3BlY3RzIGJhZCBkYXRhIC8gbWlzc2VkIGhlYXJ0IGJlYXRzLCBpdCBjYW4gdHJ5IHRvIHJlZnJlc2guXG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLnJlZnJlc2ggPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGlmICh3cykge1xuICAgICAgICAgICAgICAgIHdzLmNsb3NlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQW4gZXZlbnQgbGlzdGVuZXIgdG8gYmUgY2FsbGVkIHdoZW4gdGhlIFdlYlNvY2tldCBjb25uZWN0aW9uJ3MgcmVhZHlTdGF0ZSBjaGFuZ2VzIHRvIE9QRU47XG4gICAgICogdGhpcyBpbmRpY2F0ZXMgdGhhdCB0aGUgY29ubmVjdGlvbiBpcyByZWFkeSB0byBzZW5kIGFuZCByZWNlaXZlIGRhdGEuXG4gICAgICovXG4gICAgUmVjb25uZWN0aW5nV2ViU29ja2V0LnByb3RvdHlwZS5vbm9wZW4gPSBmdW5jdGlvbihldmVudCkge307XG4gICAgLyoqIEFuIGV2ZW50IGxpc3RlbmVyIHRvIGJlIGNhbGxlZCB3aGVuIHRoZSBXZWJTb2NrZXQgY29ubmVjdGlvbidzIHJlYWR5U3RhdGUgY2hhbmdlcyB0byBDTE9TRUQuICovXG4gICAgUmVjb25uZWN0aW5nV2ViU29ja2V0LnByb3RvdHlwZS5vbmNsb3NlID0gZnVuY3Rpb24oZXZlbnQpIHt9O1xuICAgIC8qKiBBbiBldmVudCBsaXN0ZW5lciB0byBiZSBjYWxsZWQgd2hlbiBhIGNvbm5lY3Rpb24gYmVnaW5zIGJlaW5nIGF0dGVtcHRlZC4gKi9cbiAgICBSZWNvbm5lY3RpbmdXZWJTb2NrZXQucHJvdG90eXBlLm9uY29ubmVjdGluZyA9IGZ1bmN0aW9uKGV2ZW50KSB7fTtcbiAgICAvKiogQW4gZXZlbnQgbGlzdGVuZXIgdG8gYmUgY2FsbGVkIHdoZW4gYSBtZXNzYWdlIGlzIHJlY2VpdmVkIGZyb20gdGhlIHNlcnZlci4gKi9cbiAgICBSZWNvbm5lY3RpbmdXZWJTb2NrZXQucHJvdG90eXBlLm9ubWVzc2FnZSA9IGZ1bmN0aW9uKGV2ZW50KSB7fTtcbiAgICAvKiogQW4gZXZlbnQgbGlzdGVuZXIgdG8gYmUgY2FsbGVkIHdoZW4gYW4gZXJyb3Igb2NjdXJzLiAqL1xuICAgIFJlY29ubmVjdGluZ1dlYlNvY2tldC5wcm90b3R5cGUub25lcnJvciA9IGZ1bmN0aW9uKGV2ZW50KSB7fTtcblxuICAgIC8qKlxuICAgICAqIFdoZXRoZXIgYWxsIGluc3RhbmNlcyBvZiBSZWNvbm5lY3RpbmdXZWJTb2NrZXQgc2hvdWxkIGxvZyBkZWJ1ZyBtZXNzYWdlcy5cbiAgICAgKiBTZXR0aW5nIHRoaXMgdG8gdHJ1ZSBpcyB0aGUgZXF1aXZhbGVudCBvZiBzZXR0aW5nIGFsbCBpbnN0YW5jZXMgb2YgUmVjb25uZWN0aW5nV2ViU29ja2V0LmRlYnVnIHRvIHRydWUuXG4gICAgICovXG4gICAgUmVjb25uZWN0aW5nV2ViU29ja2V0LmRlYnVnQWxsID0gZmFsc2U7XG5cbiAgICBSZWNvbm5lY3RpbmdXZWJTb2NrZXQuQ09OTkVDVElORyA9IFdlYlNvY2tldC5DT05ORUNUSU5HO1xuICAgIFJlY29ubmVjdGluZ1dlYlNvY2tldC5PUEVOID0gV2ViU29ja2V0Lk9QRU47XG4gICAgUmVjb25uZWN0aW5nV2ViU29ja2V0LkNMT1NJTkcgPSBXZWJTb2NrZXQuQ0xPU0lORztcbiAgICBSZWNvbm5lY3RpbmdXZWJTb2NrZXQuQ0xPU0VEID0gV2ViU29ja2V0LkNMT1NFRDtcblxuICAgIHJldHVybiBSZWNvbm5lY3RpbmdXZWJTb2NrZXQ7XG59KTtcbiIsIiIsIi8vIHNoaW0gZm9yIHVzaW5nIHByb2Nlc3MgaW4gYnJvd3NlclxudmFyIHByb2Nlc3MgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xuXG4vLyBjYWNoZWQgZnJvbSB3aGF0ZXZlciBnbG9iYWwgaXMgcHJlc2VudCBzbyB0aGF0IHRlc3QgcnVubmVycyB0aGF0IHN0dWIgaXRcbi8vIGRvbid0IGJyZWFrIHRoaW5ncy4gIEJ1dCB3ZSBuZWVkIHRvIHdyYXAgaXQgaW4gYSB0cnkgY2F0Y2ggaW4gY2FzZSBpdCBpc1xuLy8gd3JhcHBlZCBpbiBzdHJpY3QgbW9kZSBjb2RlIHdoaWNoIGRvZXNuJ3QgZGVmaW5lIGFueSBnbG9iYWxzLiAgSXQncyBpbnNpZGUgYVxuLy8gZnVuY3Rpb24gYmVjYXVzZSB0cnkvY2F0Y2hlcyBkZW9wdGltaXplIGluIGNlcnRhaW4gZW5naW5lcy5cblxudmFyIGNhY2hlZFNldFRpbWVvdXQ7XG52YXIgY2FjaGVkQ2xlYXJUaW1lb3V0O1xuXG5mdW5jdGlvbiBkZWZhdWx0U2V0VGltb3V0KCkge1xuICAgIHRocm93IG5ldyBFcnJvcignc2V0VGltZW91dCBoYXMgbm90IGJlZW4gZGVmaW5lZCcpO1xufVxuZnVuY3Rpb24gZGVmYXVsdENsZWFyVGltZW91dCAoKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdjbGVhclRpbWVvdXQgaGFzIG5vdCBiZWVuIGRlZmluZWQnKTtcbn1cbihmdW5jdGlvbiAoKSB7XG4gICAgdHJ5IHtcbiAgICAgICAgaWYgKHR5cGVvZiBzZXRUaW1lb3V0ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gc2V0VGltZW91dDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBkZWZhdWx0U2V0VGltb3V0O1xuICAgICAgICB9XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gZGVmYXVsdFNldFRpbW91dDtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgICAgaWYgKHR5cGVvZiBjbGVhclRpbWVvdXQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGNsZWFyVGltZW91dDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGRlZmF1bHRDbGVhclRpbWVvdXQ7XG4gICAgICAgIH1cbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGRlZmF1bHRDbGVhclRpbWVvdXQ7XG4gICAgfVxufSAoKSlcbmZ1bmN0aW9uIHJ1blRpbWVvdXQoZnVuKSB7XG4gICAgaWYgKGNhY2hlZFNldFRpbWVvdXQgPT09IHNldFRpbWVvdXQpIHtcbiAgICAgICAgLy9ub3JtYWwgZW52aXJvbWVudHMgaW4gc2FuZSBzaXR1YXRpb25zXG4gICAgICAgIHJldHVybiBzZXRUaW1lb3V0KGZ1biwgMCk7XG4gICAgfVxuICAgIC8vIGlmIHNldFRpbWVvdXQgd2Fzbid0IGF2YWlsYWJsZSBidXQgd2FzIGxhdHRlciBkZWZpbmVkXG4gICAgaWYgKChjYWNoZWRTZXRUaW1lb3V0ID09PSBkZWZhdWx0U2V0VGltb3V0IHx8ICFjYWNoZWRTZXRUaW1lb3V0KSAmJiBzZXRUaW1lb3V0KSB7XG4gICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBzZXRUaW1lb3V0O1xuICAgICAgICByZXR1cm4gc2V0VGltZW91dChmdW4sIDApO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgICAvLyB3aGVuIHdoZW4gc29tZWJvZHkgaGFzIHNjcmV3ZWQgd2l0aCBzZXRUaW1lb3V0IGJ1dCBubyBJLkUuIG1hZGRuZXNzXG4gICAgICAgIHJldHVybiBjYWNoZWRTZXRUaW1lb3V0KGZ1biwgMCk7XG4gICAgfSBjYXRjaChlKXtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIFdoZW4gd2UgYXJlIGluIEkuRS4gYnV0IHRoZSBzY3JpcHQgaGFzIGJlZW4gZXZhbGVkIHNvIEkuRS4gZG9lc24ndCB0cnVzdCB0aGUgZ2xvYmFsIG9iamVjdCB3aGVuIGNhbGxlZCBub3JtYWxseVxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZFNldFRpbWVvdXQuY2FsbChudWxsLCBmdW4sIDApO1xuICAgICAgICB9IGNhdGNoKGUpe1xuICAgICAgICAgICAgLy8gc2FtZSBhcyBhYm92ZSBidXQgd2hlbiBpdCdzIGEgdmVyc2lvbiBvZiBJLkUuIHRoYXQgbXVzdCBoYXZlIHRoZSBnbG9iYWwgb2JqZWN0IGZvciAndGhpcycsIGhvcGZ1bGx5IG91ciBjb250ZXh0IGNvcnJlY3Qgb3RoZXJ3aXNlIGl0IHdpbGwgdGhyb3cgYSBnbG9iYWwgZXJyb3JcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRTZXRUaW1lb3V0LmNhbGwodGhpcywgZnVuLCAwKTtcbiAgICAgICAgfVxuICAgIH1cblxuXG59XG5mdW5jdGlvbiBydW5DbGVhclRpbWVvdXQobWFya2VyKSB7XG4gICAgaWYgKGNhY2hlZENsZWFyVGltZW91dCA9PT0gY2xlYXJUaW1lb3V0KSB7XG4gICAgICAgIC8vbm9ybWFsIGVudmlyb21lbnRzIGluIHNhbmUgc2l0dWF0aW9uc1xuICAgICAgICByZXR1cm4gY2xlYXJUaW1lb3V0KG1hcmtlcik7XG4gICAgfVxuICAgIC8vIGlmIGNsZWFyVGltZW91dCB3YXNuJ3QgYXZhaWxhYmxlIGJ1dCB3YXMgbGF0dGVyIGRlZmluZWRcbiAgICBpZiAoKGNhY2hlZENsZWFyVGltZW91dCA9PT0gZGVmYXVsdENsZWFyVGltZW91dCB8fCAhY2FjaGVkQ2xlYXJUaW1lb3V0KSAmJiBjbGVhclRpbWVvdXQpIHtcbiAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gY2xlYXJUaW1lb3V0O1xuICAgICAgICByZXR1cm4gY2xlYXJUaW1lb3V0KG1hcmtlcik7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICAgIC8vIHdoZW4gd2hlbiBzb21lYm9keSBoYXMgc2NyZXdlZCB3aXRoIHNldFRpbWVvdXQgYnV0IG5vIEkuRS4gbWFkZG5lc3NcbiAgICAgICAgcmV0dXJuIGNhY2hlZENsZWFyVGltZW91dChtYXJrZXIpO1xuICAgIH0gY2F0Y2ggKGUpe1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gV2hlbiB3ZSBhcmUgaW4gSS5FLiBidXQgdGhlIHNjcmlwdCBoYXMgYmVlbiBldmFsZWQgc28gSS5FLiBkb2Vzbid0ICB0cnVzdCB0aGUgZ2xvYmFsIG9iamVjdCB3aGVuIGNhbGxlZCBub3JtYWxseVxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZENsZWFyVGltZW91dC5jYWxsKG51bGwsIG1hcmtlcik7XG4gICAgICAgIH0gY2F0Y2ggKGUpe1xuICAgICAgICAgICAgLy8gc2FtZSBhcyBhYm92ZSBidXQgd2hlbiBpdCdzIGEgdmVyc2lvbiBvZiBJLkUuIHRoYXQgbXVzdCBoYXZlIHRoZSBnbG9iYWwgb2JqZWN0IGZvciAndGhpcycsIGhvcGZ1bGx5IG91ciBjb250ZXh0IGNvcnJlY3Qgb3RoZXJ3aXNlIGl0IHdpbGwgdGhyb3cgYSBnbG9iYWwgZXJyb3IuXG4gICAgICAgICAgICAvLyBTb21lIHZlcnNpb25zIG9mIEkuRS4gaGF2ZSBkaWZmZXJlbnQgcnVsZXMgZm9yIGNsZWFyVGltZW91dCB2cyBzZXRUaW1lb3V0XG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkQ2xlYXJUaW1lb3V0LmNhbGwodGhpcywgbWFya2VyKTtcbiAgICAgICAgfVxuICAgIH1cblxuXG5cbn1cbnZhciBxdWV1ZSA9IFtdO1xudmFyIGRyYWluaW5nID0gZmFsc2U7XG52YXIgY3VycmVudFF1ZXVlO1xudmFyIHF1ZXVlSW5kZXggPSAtMTtcblxuZnVuY3Rpb24gY2xlYW5VcE5leHRUaWNrKCkge1xuICAgIGlmICghZHJhaW5pbmcgfHwgIWN1cnJlbnRRdWV1ZSkge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIGRyYWluaW5nID0gZmFsc2U7XG4gICAgaWYgKGN1cnJlbnRRdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgcXVldWUgPSBjdXJyZW50UXVldWUuY29uY2F0KHF1ZXVlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBxdWV1ZUluZGV4ID0gLTE7XG4gICAgfVxuICAgIGlmIChxdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgZHJhaW5RdWV1ZSgpO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gZHJhaW5RdWV1ZSgpIHtcbiAgICBpZiAoZHJhaW5pbmcpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgdGltZW91dCA9IHJ1blRpbWVvdXQoY2xlYW5VcE5leHRUaWNrKTtcbiAgICBkcmFpbmluZyA9IHRydWU7XG5cbiAgICB2YXIgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIHdoaWxlKGxlbikge1xuICAgICAgICBjdXJyZW50UXVldWUgPSBxdWV1ZTtcbiAgICAgICAgcXVldWUgPSBbXTtcbiAgICAgICAgd2hpbGUgKCsrcXVldWVJbmRleCA8IGxlbikge1xuICAgICAgICAgICAgaWYgKGN1cnJlbnRRdWV1ZSkge1xuICAgICAgICAgICAgICAgIGN1cnJlbnRRdWV1ZVtxdWV1ZUluZGV4XS5ydW4oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBxdWV1ZUluZGV4ID0gLTE7XG4gICAgICAgIGxlbiA9IHF1ZXVlLmxlbmd0aDtcbiAgICB9XG4gICAgY3VycmVudFF1ZXVlID0gbnVsbDtcbiAgICBkcmFpbmluZyA9IGZhbHNlO1xuICAgIHJ1bkNsZWFyVGltZW91dCh0aW1lb3V0KTtcbn1cblxucHJvY2Vzcy5uZXh0VGljayA9IGZ1bmN0aW9uIChmdW4pIHtcbiAgICB2YXIgYXJncyA9IG5ldyBBcnJheShhcmd1bWVudHMubGVuZ3RoIC0gMSk7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAxKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBxdWV1ZS5wdXNoKG5ldyBJdGVtKGZ1biwgYXJncykpO1xuICAgIGlmIChxdWV1ZS5sZW5ndGggPT09IDEgJiYgIWRyYWluaW5nKSB7XG4gICAgICAgIHJ1blRpbWVvdXQoZHJhaW5RdWV1ZSk7XG4gICAgfVxufTtcblxuLy8gdjggbGlrZXMgcHJlZGljdGlibGUgb2JqZWN0c1xuZnVuY3Rpb24gSXRlbShmdW4sIGFycmF5KSB7XG4gICAgdGhpcy5mdW4gPSBmdW47XG4gICAgdGhpcy5hcnJheSA9IGFycmF5O1xufVxuSXRlbS5wcm90b3R5cGUucnVuID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuZnVuLmFwcGx5KG51bGwsIHRoaXMuYXJyYXkpO1xufTtcbnByb2Nlc3MudGl0bGUgPSAnYnJvd3Nlcic7XG5wcm9jZXNzLmJyb3dzZXIgPSB0cnVlO1xucHJvY2Vzcy5lbnYgPSB7fTtcbnByb2Nlc3MuYXJndiA9IFtdO1xucHJvY2Vzcy52ZXJzaW9uID0gJyc7IC8vIGVtcHR5IHN0cmluZyB0byBhdm9pZCByZWdleHAgaXNzdWVzXG5wcm9jZXNzLnZlcnNpb25zID0ge307XG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuXG5wcm9jZXNzLm9uID0gbm9vcDtcbnByb2Nlc3MuYWRkTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5vbmNlID0gbm9vcDtcbnByb2Nlc3Mub2ZmID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBub29wO1xucHJvY2Vzcy5lbWl0ID0gbm9vcDtcbnByb2Nlc3MucHJlcGVuZExpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3MucHJlcGVuZE9uY2VMaXN0ZW5lciA9IG5vb3A7XG5cbnByb2Nlc3MubGlzdGVuZXJzID0gZnVuY3Rpb24gKG5hbWUpIHsgcmV0dXJuIFtdIH1cblxucHJvY2Vzcy5iaW5kaW5nID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuYmluZGluZyBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuXG5wcm9jZXNzLmN3ZCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICcvJyB9O1xucHJvY2Vzcy5jaGRpciA9IGZ1bmN0aW9uIChkaXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuY2hkaXIgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcbnByb2Nlc3MudW1hc2sgPSBmdW5jdGlvbigpIHsgcmV0dXJuIDA7IH07XG4iXX0=
