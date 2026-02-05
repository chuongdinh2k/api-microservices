"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PinoLoggerService = void 0;
const pino_1 = __importDefault(require("pino"));
/** Structured logging - same format across services for aggregation/querying */
class PinoLoggerService {
    context;
    logger;
    constructor(context, options) {
        this.context = context;
        this.logger = (0, pino_1.default)({
            level: process.env.LOG_LEVEL ?? 'info',
            formatters: {
                level: (label) => ({ level: label }),
            },
            ...options,
        });
    }
    log(message, ...optionalParams) {
        this.logger.info({ context: this.context, extra: optionalParams }, message);
    }
    error(message, ...optionalParams) {
        this.logger.error({ context: this.context, extra: optionalParams }, message);
    }
    warn(message, ...optionalParams) {
        this.logger.warn({ context: this.context, extra: optionalParams }, message);
    }
    debug(message, ...optionalParams) {
        this.logger.debug({ context: this.context, extra: optionalParams }, message);
    }
    verbose(message, ...optionalParams) {
        this.logger.trace({ context: this.context, extra: optionalParams }, message);
    }
}
exports.PinoLoggerService = PinoLoggerService;
//# sourceMappingURL=logger.service.js.map