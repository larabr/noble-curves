/// <reference types="node" />
import BN from 'bn.js';
import AbstractBigInteger from "./interface.js";
/**
 * @fileoverview
 * BigInteger implementation of basic operations
 * Wrapper of bn.js library (wwww.github.com/indutny/bn.js)
 * @module biginteger/bn
 * @private
 */
/**
 * @private
 */
export default class BNBigInteger extends AbstractBigInteger {
    private value;
    /**
     * Get a BigInteger (input must be big endian for strings and arrays)
     * @param {Number|String|Uint8Array} n - Value to convert
     * @throws {Error} on undefined input
     */
    constructor(n: Uint8Array | string | number | BN);
    clone(): BNBigInteger;
    /**
     * BigInteger increment in place
     */
    iinc(): this;
    /**
     * BigInteger increment
     * @returns {BigInteger} this + 1.
     */
    inc(): BNBigInteger;
    /**
     * BigInteger decrement in place
     */
    idec(): this;
    /**
     * BigInteger decrement
     * @returns {BigInteger} this - 1.
     */
    dec(): BNBigInteger;
    /**
     * BigInteger addition in place
     * @param {BigInteger} x - Value to add
     */
    iadd(x: BNBigInteger): this;
    /**
     * BigInteger addition
     * @param {BigInteger} x - Value to add
     * @returns {BigInteger} this + x.
     */
    add(x: BNBigInteger): BNBigInteger;
    /**
     * BigInteger subtraction in place
     * @param {BigInteger} x - Value to subtract
     */
    isub(x: BNBigInteger): this;
    /**
     * BigInteger subtraction
     * @param {BigInteger} x - Value to subtract
     * @returns {BigInteger} this - x.
     */
    sub(x: BNBigInteger): BNBigInteger;
    /**
     * BigInteger multiplication in place
     * @param {BigInteger} x - Value to multiply
     */
    imul(x: BNBigInteger): this;
    /**
     * BigInteger multiplication
     * @param {BigInteger} x - Value to multiply
     * @returns {BigInteger} this * x.
     */
    mul(x: BNBigInteger): BNBigInteger;
    /**
     * Compute value modulo m, in place
     * @param {BigInteger} m - Modulo
     */
    imod(m: BNBigInteger): this;
    /**
     * Compute value modulo m
     * @param {BigInteger} m - Modulo
     * @returns {BigInteger} this mod m.
     */
    mod(m: BNBigInteger): BNBigInteger;
    /**
     * Compute modular exponentiation
     * Much faster than this.exp(e).mod(n)
     * @param {BigInteger} e - Exponent
     * @param {BigInteger} n - Modulo
     * @returns {BigInteger} this ** e mod n.
     */
    modExp(e: BNBigInteger, n: BNBigInteger): BNBigInteger;
    /**
     * Compute the inverse of this value modulo n
     * Note: this and and n must be relatively prime
     * @param {BigInteger} n - Modulo
     * @returns {BigInteger} x such that this*x = 1 mod n
     * @throws {Error} if the inverse does not exist
     */
    modInv(n: BNBigInteger): BNBigInteger;
    /**
     * Compute greatest common divisor between this and n
     * @param {BigInteger} n - Operand
     * @returns {BigInteger} gcd
     */
    gcd(n: BNBigInteger): BNBigInteger;
    /**
     * Shift this to the left by x, in place
     * @param {BigInteger} x - Shift value
     */
    ileftShift(x: BNBigInteger): this;
    /**
     * Shift this to the left by x
     * @param {BigInteger} x - Shift value
     * @returns {BigInteger} this << x.
     */
    leftShift(x: BNBigInteger): BNBigInteger;
    /**
     * Shift this to the right by x, in place
     * @param {BigInteger} x - Shift value
     */
    irightShift(x: BNBigInteger): this;
    /**
     * Shift this to the right by x
     * @param {BigInteger} x - Shift value
     * @returns {BigInteger} this >> x.
     */
    rightShift(x: BNBigInteger): BNBigInteger;
    ixor(x: BNBigInteger): this;
    ibitwiseAnd(x: BNBigInteger): this;
    bitwiseAnd(x: BNBigInteger): BNBigInteger;
    /**
     * Whether this value is equal to x
     * @param {BigInteger} x
     * @returns {Boolean}
     */
    equal(x: BNBigInteger): boolean;
    /**
     * Whether this value is less than x
     * @param {BigInteger} x
     * @returns {Boolean}
     */
    lt(x: BNBigInteger): boolean;
    /**
     * Whether this value is less than or equal to x
     * @param {BigInteger} x
     * @returns {Boolean}
     */
    lte(x: BNBigInteger): boolean;
    /**
     * Whether this value is greater than x
     * @param {BigInteger} x
     * @returns {Boolean}
     */
    gt(x: BNBigInteger): boolean;
    /**
     * Whether this value is greater than or equal to x
     * @param {BigInteger} x
     * @returns {Boolean}
     */
    gte(x: BNBigInteger): boolean;
    isZero(): boolean;
    isOne(): boolean;
    isNegative(): boolean;
    isEven(): boolean;
    abs(): BNBigInteger;
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
    toUint8Array(endian: string | undefined, length: number): Buffer & any[];
}
//# sourceMappingURL=bn.interface.d.ts.map