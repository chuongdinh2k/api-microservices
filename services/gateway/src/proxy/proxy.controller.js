"use strict";
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProxyController = void 0;
const common_1 = require("@nestjs/common");
let ProxyController = (() => {
    let _classDecorators = [(0, common_1.Controller)()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _instanceExtraInitializers = [];
    let _health_decorators;
    let _auth_decorators;
    let _users_decorators;
    let _products_decorators;
    let _orders_decorators;
    var ProxyController = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _health_decorators = [(0, common_1.Get)('health')];
            _auth_decorators = [(0, common_1.All)('auth*')];
            _users_decorators = [(0, common_1.All)('users*')];
            _products_decorators = [(0, common_1.All)('products*')];
            _orders_decorators = [(0, common_1.All)('orders*')];
            __esDecorate(this, null, _health_decorators, { kind: "method", name: "health", static: false, private: false, access: { has: obj => "health" in obj, get: obj => obj.health }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _auth_decorators, { kind: "method", name: "auth", static: false, private: false, access: { has: obj => "auth" in obj, get: obj => obj.auth }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _users_decorators, { kind: "method", name: "users", static: false, private: false, access: { has: obj => "users" in obj, get: obj => obj.users }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _products_decorators, { kind: "method", name: "products", static: false, private: false, access: { has: obj => "products" in obj, get: obj => obj.products }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _orders_decorators, { kind: "method", name: "orders", static: false, private: false, access: { has: obj => "orders" in obj, get: obj => obj.orders }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            ProxyController = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        proxy = __runInitializers(this, _instanceExtraInitializers);
        constructor(proxy) {
            this.proxy = proxy;
        }
        health() {
            return { status: 'ok', service: 'gateway' };
        }
        auth(req, res) {
            return this.forward('auth', req, res);
        }
        users(req, res) {
            return this.forward('user', req, res);
        }
        products(req, res) {
            return this.forward('product', req, res);
        }
        orders(req, res) {
            return this.forward('order', req, res);
        }
        async forward(service, req, res) {
            const path = req.path;
            const result = await this.proxy.proxy(service, path, req);
            const status = result._status ?? 200;
            const data = result._data;
            res.status(status);
            if (data !== undefined)
                res.json(data);
            else
                res.end();
        }
    };
    return ProxyController = _classThis;
})();
exports.ProxyController = ProxyController;
//# sourceMappingURL=proxy.controller.js.map