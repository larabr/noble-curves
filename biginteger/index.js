"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = exports.BigInteger = void 0;
const interface_js_1 = __importDefault(require("./interface.js"));
exports.BigInteger = interface_js_1.default;
exports.default = interface_js_1.default;
const native_interface_js_1 = __importDefault(require("./native.interface.js"));
const bn_interface_js_1 = __importDefault(require("./bn.interface.js"));
const detectBigInt = () => typeof BigInt !== 'undefined';
interface_js_1.default.setImplementation(detectBigInt() ? native_interface_js_1.default : bn_interface_js_1.default);
// About BigInteger interface and bigint replacement:
// - some functions get a bigint and change its value without reassingment (eg i++). Note that with BigIntegers, you must clone the value before doing so!!!
//# sourceMappingURL=index.js.map