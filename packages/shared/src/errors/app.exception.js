"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ForbiddenException = exports.UnauthorizedException = exports.ConflictException = exports.NotFoundException = exports.AppException = void 0;
const common_1 = require("@nestjs/common");
/** Base app exception - use for domain/validation errors */
class AppException extends common_1.HttpException {
    code;
    constructor(message, statusCode = common_1.HttpStatus.BAD_REQUEST, code) {
        super({ message, code }, statusCode);
        this.code = code;
    }
}
exports.AppException = AppException;
class NotFoundException extends AppException {
    constructor(message = 'Resource not found', code) {
        super(message, common_1.HttpStatus.NOT_FOUND, code ?? 'NOT_FOUND');
    }
}
exports.NotFoundException = NotFoundException;
class ConflictException extends AppException {
    constructor(message = 'Resource already exists', code) {
        super(message, common_1.HttpStatus.CONFLICT, code ?? 'CONFLICT');
    }
}
exports.ConflictException = ConflictException;
class UnauthorizedException extends AppException {
    constructor(message = 'Unauthorized', code) {
        super(message, common_1.HttpStatus.UNAUTHORIZED, code ?? 'UNAUTHORIZED');
    }
}
exports.UnauthorizedException = UnauthorizedException;
class ForbiddenException extends AppException {
    constructor(message = 'Forbidden', code) {
        super(message, common_1.HttpStatus.FORBIDDEN, code ?? 'FORBIDDEN');
    }
}
exports.ForbiddenException = ForbiddenException;
//# sourceMappingURL=app.exception.js.map