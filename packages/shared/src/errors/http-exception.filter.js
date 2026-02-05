"use strict";
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
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AllExceptionsFilter = void 0;
const common_1 = require("@nestjs/common");
/** Global exception filter - ensures centralized error format in all responses */
let AllExceptionsFilter = (() => {
    let _classDecorators = [(0, common_1.Catch)()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var AllExceptionsFilter = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            AllExceptionsFilter = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        logger = new common_1.Logger(AllExceptionsFilter.name);
        catch(exception, host) {
            const ctx = host.switchToHttp();
            const response = ctx.getResponse();
            const request = ctx.getRequest();
            const { statusCode, body } = this.normalize(exception, request);
            this.logger.warn({ err: exception, path: request.url, statusCode }, body.message);
            response.status(statusCode).json(body);
        }
        normalize(exception, request) {
            const timestamp = new Date().toISOString();
            const path = request.url;
            if (exception instanceof common_1.HttpException) {
                const status = exception.getStatus();
                const res = exception.getResponse();
                const message = typeof res === 'object' && res !== null && 'message' in res
                    ? (Array.isArray(res.message)
                        ? res.message.join(', ')
                        : res.message)
                    : exception.message;
                return {
                    statusCode: status,
                    body: {
                        statusCode: status,
                        error: exception.name ?? 'HttpException',
                        message,
                        timestamp,
                        path,
                    },
                };
            }
            const isError = exception instanceof Error;
            return {
                statusCode: common_1.HttpStatus.INTERNAL_SERVER_ERROR,
                body: {
                    statusCode: common_1.HttpStatus.INTERNAL_SERVER_ERROR,
                    error: 'Internal Server Error',
                    message: isError ? exception.message : 'Unknown error',
                    timestamp,
                    path,
                },
            };
        }
    };
    return AllExceptionsFilter = _classThis;
})();
exports.AllExceptionsFilter = AllExceptionsFilter;
//# sourceMappingURL=http-exception.filter.js.map