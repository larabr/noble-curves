/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
import { BigInteger } from '@openpgp/noble-hashes/biginteger';
import { IField } from './modular.js';
export type AffinePoint<T> = {
    x: T;
    y: T;
} & {
    z?: never;
    t?: never;
};
export interface Group<T extends Group<T>> {
    double(): T;
    negate(): T;
    add(other: T): T;
    subtract(other: T): T;
    equals(other: T): boolean;
    multiply(scalar: BigInteger): T;
}
export type GroupConstructor<T> = {
    BASE: T;
    ZERO: T;
};
export type Mapper<T> = (i: T[]) => T[];
export declare function wNAF<T extends Group<T>>(c: GroupConstructor<T>, bits: number): {
    constTimeNegate: (condition: boolean, item: T) => T;
    unsafeLadder(elm: T, exp: BigInteger): T;
    /**
     * Creates a wNAF precomputation window. Used for caching.
     * Default window size is set by `utils.precompute()` and is equal to 8.
     * Number of precomputed points depends on the curve size:
     * 2^(𝑊−1) * (Math.ceil(𝑛 / 𝑊) + 1), where:
     * - 𝑊 is the window size
     * - 𝑛 is the bitlength of the curve order.
     * For a 256-bit curve and window size 8, the number of precomputed points is 128 * 33 = 4224.
     * @returns precomputed point tables flattened to a single array
     */
    precomputeWindow(elm: T, W: number): Group<T>[];
    /**
     * Implements ec multiplication using precomputed tables and w-ary non-adjacent form.
     * @param W window size
     * @param precomputes precomputed tables
     * @param n scalar (we don't check here, but should be less than curve order)
     * @returns real and fake (for const-time) points
     */
    wNAF(W: number, precomputes: T[], scalar: BigInteger): {
        p: T;
        f: T;
    };
    wNAFCached(P: T, precomputesMap: Map<T, T[]>, n: BigInteger, transform: Mapper<T>): {
        p: T;
        f: T;
    };
};
export type BasicCurve<T> = {
    Fp: IField<T>;
    n: BigInteger;
    nBitLength?: number;
    nByteLength?: number;
    h: BigInteger;
    hEff?: BigInteger;
    Gx: T;
    Gy: T;
    allowInfinityPoint?: boolean;
};
export declare function validateBasic<FP, T>(curve: BasicCurve<FP> & T): Readonly<{
    readonly nBitLength: number;
    readonly nByteLength: number;
} & BasicCurve<FP> & T & {
    p: BigInteger;
}>;
