"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = exports.BigInteger = void 0;
class BigInteger {
    static setImplementation(Implementation, replace = false) {
        if (BigInteger.Implementation && !replace) {
            throw new Error('Implementation already set');
        }
        BigInteger.Implementation = Implementation;
    }
    static new(n) {
        return new BigInteger.Implementation(n);
    }
}
exports.BigInteger = BigInteger;
exports.default = BigInteger;
//# sourceMappingURL=interface.js.map