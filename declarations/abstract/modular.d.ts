/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
import { BigInteger } from '../biginteger/index.js';
export declare function mod(a: BigInteger, b: BigInteger): BigInteger;
/**
 * Efficiently raise num to power and do modular division.
 * Unsafe in some contexts: uses ladder, so can expose bigint bits.
 * @example
 * pow(2n, 6n, 11n) // 64n % 11n == 9n
 */
export declare function pow(num: BigInteger, power: BigInteger, modulo: BigInteger): BigInteger;
export declare function pow2(x: BigInteger, power: BigInteger, modulo: BigInteger): BigInteger;
export declare function invert(number: BigInteger, modulo: BigInteger): BigInteger;
export declare function tonelliShanks(P: BigInteger): <T>(Fp: IField<T>, n: T) => T;
export declare function FpSqrt(P: BigInteger): <T>(Fp: IField<T>, n: T) => T;
export declare const isNegativeLE: (num: BigInteger, modulo: BigInteger) => boolean;
export interface IField<T> {
    ORDER: BigInteger;
    BYTES: number;
    BITS: number;
    MASK: BigInteger;
    ZERO: T;
    ONE: T;
    create: (num: T) => T;
    isValid: (num: T) => boolean;
    is0: (num: T) => boolean;
    neg(num: T): T;
    inv(num: T): T;
    sqrt(num: T): T;
    sqr(num: T): T;
    eql(lhs: T, rhs: T): boolean;
    add(lhs: T, rhs: T): T;
    sub(lhs: T, rhs: T): T;
    mul(lhs: T, rhs: T | BigInteger): T;
    pow(lhs: T, power: BigInteger): T;
    div(lhs: T, rhs: T | BigInteger): T;
    addN(lhs: T, rhs: T): T;
    subN(lhs: T, rhs: T): T;
    mulN(lhs: T, rhs: T | BigInteger): T;
    sqrN(num: T): T;
    isOdd?(num: T): boolean;
    pow(lhs: T, power: BigInteger): T;
    invertBatch: (lst: T[]) => T[];
    toBytes(num: T): Uint8Array;
    fromBytes(bytes: Uint8Array): T;
    cmov(a: T, b: T, c: boolean): T;
}
export declare function validateField<T>(field: IField<T>): IField<T>;
export declare function FpPow<T>(f: IField<T>, num: T, power: BigInteger): T;
export declare function FpInvertBatch<T>(f: IField<T>, nums: T[]): T[];
export declare function FpDiv<T>(f: IField<T>, lhs: T, rhs: T | BigInteger): T;
export declare function FpIsSquare<T>(f: IField<T>): (x: T) => boolean;
export declare function nLength(n: BigInteger, nBitLength?: number): {
    nBitLength: number;
    nByteLength: number;
};
type FpField = IField<BigInteger> & Required<Pick<IField<BigInteger>, 'isOdd'>>;
/**
 * Initializes a galois field over prime. Non-primes are not supported for now.
 * Do not init in loop: slow. Very fragile: always run a benchmark on change.
 * Major performance gains:
 * a) non-normalized operations like mulN instead of mul
 * b) `Object.freeze`
 * c) Same object shape: never add or remove keys
 * @param ORDER prime positive bigint
 * @param bitLen how many bits the field consumes
 * @param isLE (def: false) if encoding / decoding should be in little-endian
 * @param redef optional faster redefinitions of sqrt and other methods
 */
export declare function Field(ORDER: BigInteger, bitLen?: number, isLE?: boolean, redef?: Partial<IField<BigInteger>>): Readonly<FpField>;
export declare function FpSqrtOdd<T>(Fp: IField<T>, elm: T): T;
export declare function FpSqrtEven<T>(Fp: IField<T>, elm: T): T;
/**
 * FIPS 186 B.4.1-compliant "constant-time" private key generation utility.
 * Can take (n+8) or more bytes of uniform input e.g. from CSPRNG or KDF
 * and convert them into private scalar, with the modulo bias being negligible.
 * Needs at least 40 bytes of input for 32-byte private key.
 * https://research.kudelskisecurity.com/2020/07/28/the-definitive-guide-to-modulo-bias-and-how-to-avoid-it/
 * @param hash hash output from SHA3 or a similar function
 * @param groupOrder size of subgroup - (e.g. curveFn.CURVE.n)
 * @param isLE interpret hash bytes as LE num
 * @returns valid private scalar
 */
export declare function hashToPrivateScalar(hash: string | Uint8Array, groupOrder: BigInteger, isLE?: boolean): BigInteger;
export {};
//# sourceMappingURL=modular.d.ts.map