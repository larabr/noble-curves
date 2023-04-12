/**
 * @fileoverview
 * BigInteger implementation of basic operations
 * that wraps the native BigInt library.
 * Operations are not constant time,
 * but we try and limit timing leakage where we can
 * @module biginteger/native
 * @private
 */
import AbstractBigInteger from "./interface.js";
/**
 * @private
 */
export default class NativeBigInteger extends AbstractBigInteger {
    private value;
    /**
     * Get a BigInteger (input must be big endian for strings and arrays)
     * @param {Number|String|Uint8Array} n - Value to convert
     * @throws {Error} on null or undefined input
     */
    constructor(n: Uint8Array | string | number | bigint);
    clone(): NativeBigInteger;
    /**
     * BigInteger increment in place
     */
    iinc(): this;
    /**
     * BigInteger increment
     * @returns {BigInteger} this + 1.
     */
    inc(): NativeBigInteger;
    /**
     * BigInteger decrement in place
     */
    idec(): this;
    /**
     * BigInteger decrement
     * @returns {BigInteger} this - 1.
     */
    dec(): NativeBigInteger;
    /**
     * BigInteger addition in place
     * @param {BigInteger} x - Value to add
     */
    iadd(x: NativeBigInteger): this;
    /**
     * BigInteger addition
     * @param {BigInteger} x - Value to add
     * @returns {BigInteger} this + x.
     */
    add(x: NativeBigInteger): NativeBigInteger;
    /**
     * BigInteger subtraction in place
     * @param {BigInteger} x - Value to subtract
     */
    isub(x: NativeBigInteger): this;
    /**
     * BigInteger subtraction
     * @param {BigInteger} x - Value to subtract
     * @returns {BigInteger} this - x.
     */
    sub(x: NativeBigInteger): NativeBigInteger;
    /**
     * BigInteger multiplication in place
     * @param {BigInteger} x - Value to multiply
     */
    imul(x: NativeBigInteger): this;
    /**
     * BigInteger multiplication
     * @param {BigInteger} x - Value to multiply
     * @returns {BigInteger} this * x.
     */
    mul(x: NativeBigInteger): NativeBigInteger;
    /**
     * Compute value modulo m, in place
     * @param {BigInteger} m - Modulo
     */
    imod(m: NativeBigInteger): this;
    /**
     * Compute value modulo m
     * @param {BigInteger} m - Modulo
     * @returns {BigInteger} this mod m.
     */
    mod(m: NativeBigInteger): NativeBigInteger;
    /**
     * Compute modular exponentiation using square and multiply
     * @param {BigInteger} e - Exponent
     * @param {BigInteger} n - Modulo
     * @returns {BigInteger} this ** e mod n.
     */
    modExp(e: NativeBigInteger, n: NativeBigInteger): NativeBigInteger;
    /**
     * Compute the inverse of this value modulo n
     * Note: this and and n must be relatively prime
     * @param {BigInteger} n - Modulo
     * @returns {BigInteger} x such that this*x = 1 mod n
     * @throws {Error} if the inverse does not exist
     */
    modInv(n: NativeBigInteger): NativeBigInteger;
    /**
     * Extended Eucleadian algorithm (http://anh.cs.luc.edu/331/notes/xgcd.pdf)
     * Given a = this and b, compute (x, y) such that ax + by = gdc(a, b)
     * @param {BigInteger} b - Second operand
     * @returns {{ gcd, x, y: BigInteger }}
     */
    private _egcd;
    /**
     * Compute greatest common divisor between this and n
     * @param {BigInteger} b - Operand
     * @returns {BigInteger} gcd
     */
    gcd(bInput: NativeBigInteger): NativeBigInteger;
    /**
     * Shift this to the left by x, in place
     * @param {BigInteger} x - Shift value
     */
    ileftShift(x: NativeBigInteger): this;
    /**
     * Shift this to the left by x
     * @param {BigInteger} x - Shift value
     * @returns {BigInteger} this << x.
     */
    leftShift(x: NativeBigInteger): NativeBigInteger;
    /**
     * Shift this to the right by x, in place
     * @param {BigInteger} x - Shift value
     */
    irightShift(x: NativeBigInteger): this;
    /**
     * Shift this to the right by x
     * @param {BigInteger} x - Shift value
     * @returns {BigInteger} this >> x.
     */
    rightShift(x: NativeBigInteger): NativeBigInteger;
    ixor(x: NativeBigInteger): this;
    ibitwiseAnd(x: NativeBigInteger): this;
    bitwiseAnd(x: NativeBigInteger): NativeBigInteger;
    /**
     * Whether this value is equal to x
     * @param {BigInteger} x
     * @returns {Boolean}
     */
    equal(x: NativeBigInteger): boolean;
    /**
     * Whether this value is less than x
     * @param {BigInteger} x
     * @returns {Boolean}
     */
    lt(x: NativeBigInteger): boolean;
    /**
     * Whether this value is less than or equal to x
     * @param {BigInteger} x
     * @returns {Boolean}
     */
    lte(x: NativeBigInteger): boolean;
    /**
     * Whether this value is greater than x
     * @param {BigInteger} x
     * @returns {Boolean}
     */
    gt(x: NativeBigInteger): boolean;
    /**
     * Whether this value is greater than or equal to x
     * @param {BigInteger} x
     * @returns {Boolean}
     */
    gte(x: NativeBigInteger): boolean;
    isZero(): boolean;
    isOne(): boolean;
    isNegative(): boolean;
    isEven(): boolean;
    abs(): NativeBigInteger;
    /**
     * Get this value as a string
     * @returns {String} this value.
     */
    toString(): string;
    /**
     * Get this value as an exact Number (max 53 bits)
     * Fails if this value is too large
     * @returns {Number}
     */
    toNumber(): number;
    /**
     * Get value of i-th bit
     * @param {Number} i - Bit index
     * @returns {Number} Bit value.
     */
    getBit(i: number): 0 | 1;
    /**
     * Compute bit length
     * @returns {Number} Bit length.
     */
    bitLength(): number;
    /**
     * Compute byte length
     * @returns {Number} Byte length.
     */
    byteLength(): number;
    /**
     * Get Uint8Array representation of this number
     * @param {String} endian - Endianess of output array (defaults to 'be')
     * @param {Number} length - Of output array
     * @returns {Uint8Array}
     */
    toUint8Array(endian: string | undefined, length: number): Uint8Array;
}
//# sourceMappingURL=native.interface.d.ts.map