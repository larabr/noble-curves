/// <reference types="node" resolution-mode="require"/>
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
import { BigInteger } from '@openpgp/noble-hashes/biginteger';
import * as mod from './modular.js';
import * as ut from './utils.js';
import { CHash, Hex, PrivKey } from './utils.js';
import { Group, GroupConstructor, BasicCurve, AffinePoint } from './curve.js';
export type { AffinePoint };
type HmacFnSync = (key: Uint8Array, ...messages: Uint8Array[]) => Uint8Array;
type EndomorphismOpts = {
    beta: BigInteger;
    splitScalar: (k: BigInteger) => {
        k1neg: boolean;
        k1: BigInteger;
        k2neg: boolean;
        k2: BigInteger;
    };
};
export type BasicWCurve<T> = BasicCurve<T> & {
    a: T;
    b: T;
    allowedPrivateKeyLengths?: readonly number[];
    wrapPrivateKey?: boolean;
    endo?: EndomorphismOpts;
    isTorsionFree?: (c: ProjConstructor<T>, point: ProjPointType<T>) => boolean;
    clearCofactor?: (c: ProjConstructor<T>, point: ProjPointType<T>) => ProjPointType<T>;
};
type Entropy = Hex | true;
export type SignOpts = {
    lowS?: boolean;
    extraEntropy?: Entropy;
    prehash?: boolean;
};
export type VerOpts = {
    lowS?: boolean;
    prehash?: boolean;
};
/**
 * ### Design rationale for types
 *
 * * Interaction between classes from different curves should fail:
 *   `k256.Point.BASE.add(p256.Point.BASE)`
 * * For this purpose we want to use `instanceof` operator, which is fast and works during runtime
 * * Different calls of `curve()` would return different classes -
 *   `curve(params) !== curve(params)`: if somebody decided to monkey-patch their curve,
 *   it won't affect others
 *
 * TypeScript can't infer types for classes created inside a function. Classes is one instance of nominative types in TypeScript and interfaces only check for shape, so it's hard to create unique type for every function call.
 *
 * We can use generic types via some param, like curve opts, but that would:
 *     1. Enable interaction between `curve(params)` and `curve(params)` (curves of same params)
 *     which is hard to debug.
 *     2. Params can be generic and we can't enforce them to be constant value:
 *     if somebody creates curve from non-constant params,
 *     it would be allowed to interact with other curves with non-constant params
 *
 * TODO: https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-7.html#unique-symbol
 */
export interface ProjPointType<T> extends Group<ProjPointType<T>> {
    readonly px: T;
    readonly py: T;
    readonly pz: T;
    get x(): T;
    get y(): T;
    multiply(scalar: BigInteger): ProjPointType<T>;
    toAffine(iz?: T): AffinePoint<T>;
    isTorsionFree(): boolean;
    clearCofactor(): ProjPointType<T>;
    assertValidity(): void;
    hasEvenY(): boolean;
    toRawBytes(isCompressed?: boolean): Uint8Array;
    toHex(isCompressed?: boolean): string;
    multiplyUnsafe(scalar: BigInteger): ProjPointType<T>;
    multiplyAndAddUnsafe(Q: ProjPointType<T>, a: BigInteger, b: BigInteger): ProjPointType<T> | undefined;
    _setWindowSize(windowSize: number): void;
}
export interface ProjConstructor<T> extends GroupConstructor<ProjPointType<T>> {
    new (x: T, y: T, z: T): ProjPointType<T>;
    fromAffine(p: AffinePoint<T>): ProjPointType<T>;
    fromHex(hex: Hex): ProjPointType<T>;
    fromPrivateKey(privateKey: PrivKey): ProjPointType<T>;
    normalizeZ(points: ProjPointType<T>[]): ProjPointType<T>[];
}
export type CurvePointsType<T> = BasicWCurve<T> & {
    fromBytes?: (bytes: Uint8Array) => AffinePoint<T>;
    toBytes?: (c: ProjConstructor<T>, point: ProjPointType<T>, isCompressed: boolean) => Uint8Array;
};
export type CurvePointsRes<T> = {
    ProjectivePoint: ProjConstructor<T>;
    normPrivateKeyToScalar: (key: PrivKey) => BigInteger;
    weierstrassEquation: (x: T) => T;
    isWithinCurveOrder: (num: BigInteger) => boolean;
};
export declare const DER: {
    Err: {
        new (m?: string): {
            name: string;
            message: string;
            stack?: string | undefined;
        };
        captureStackTrace(targetObject: object, constructorOpt?: Function | undefined): void;
        prepareStackTrace?: ((err: Error, stackTraces: NodeJS.CallSite[]) => any) | undefined;
        stackTraceLimit: number;
    };
    _parseInt(data: Uint8Array): {
        d: BigInteger;
        l: Uint8Array;
    };
    toSig(hex: string | Uint8Array): {
        r: BigInteger;
        s: BigInteger;
    };
    hexFromSig(sig: {
        r: BigInteger;
        s: BigInteger;
    }): string;
};
export declare function weierstrassPoints<T>(opts: CurvePointsType<T>): {
    CURVE: Readonly<{
        readonly nBitLength: number;
        readonly nByteLength: number;
        readonly Fp: mod.IField<T>;
        readonly n: BigInteger;
        readonly h: BigInteger;
        readonly hEff?: BigInteger | undefined;
        readonly Gx: T;
        readonly Gy: T;
        readonly allowInfinityPoint?: boolean | undefined;
        readonly a: T;
        readonly b: T;
        readonly allowedPrivateKeyLengths?: readonly number[] | undefined;
        readonly wrapPrivateKey?: boolean | undefined;
        readonly endo?: EndomorphismOpts | undefined;
        readonly isTorsionFree?: ((c: ProjConstructor<T>, point: ProjPointType<T>) => boolean) | undefined;
        readonly clearCofactor?: ((c: ProjConstructor<T>, point: ProjPointType<T>) => ProjPointType<T>) | undefined;
        readonly fromBytes?: ((bytes: Uint8Array) => AffinePoint<T>) | undefined;
        readonly toBytes?: ((c: ProjConstructor<T>, point: ProjPointType<T>, isCompressed: boolean) => Uint8Array) | undefined;
        readonly p: BigInteger;
    }>;
    ProjectivePoint: ProjConstructor<T>;
    normPrivateKeyToScalar: (key: PrivKey) => BigInteger;
    weierstrassEquation: (x: T) => T;
    isWithinCurveOrder: (num: BigInteger) => boolean;
};
export interface SignatureType {
    readonly r: BigInteger;
    readonly s: BigInteger;
    readonly recovery?: number;
    assertValidity(): void;
    addRecoveryBit(recovery: number): RecoveredSignatureType;
    hasHighS(): boolean;
    normalizeS(): SignatureType;
    recoverPublicKey(msgHash: Hex): ProjPointType<BigInteger>;
    toCompactRawBytes(): Uint8Array;
    toCompactHex(): string;
    toDERRawBytes(isCompressed?: boolean): Uint8Array;
    toDERHex(isCompressed?: boolean): string;
}
export type RecoveredSignatureType = SignatureType & {
    readonly recovery: number;
};
export type SignatureConstructor = {
    new (r: BigInteger, s: BigInteger): SignatureType;
    fromCompact(hex: Hex): SignatureType;
    fromDER(hex: Hex): SignatureType;
};
type SignatureLike = {
    r: BigInteger;
    s: BigInteger;
};
export type PubKey = Hex | ProjPointType<BigInteger>;
export type CurveType = BasicWCurve<BigInteger> & {
    hash: CHash;
    hmac: HmacFnSync;
    randomBytes: (bytesLength?: number) => Uint8Array;
    lowS?: boolean;
    bits2int?: (bytes: Uint8Array) => BigInteger;
    bits2int_modN?: (bytes: Uint8Array) => BigInteger;
};
declare function validateOpts(curve: CurveType): Readonly<{
    readonly nBitLength: number;
    readonly nByteLength: number;
    readonly Fp: mod.IField<BigInteger>;
    readonly n: BigInteger;
    readonly h: BigInteger;
    readonly hEff?: BigInteger | undefined;
    readonly Gx: BigInteger;
    readonly Gy: BigInteger;
    readonly allowInfinityPoint?: boolean | undefined;
    readonly a: BigInteger;
    readonly b: BigInteger;
    readonly allowedPrivateKeyLengths?: readonly number[] | undefined;
    readonly wrapPrivateKey?: boolean | undefined;
    readonly endo?: EndomorphismOpts | undefined;
    readonly isTorsionFree?: ((c: ProjConstructor<BigInteger>, point: ProjPointType<BigInteger>) => boolean) | undefined;
    readonly clearCofactor?: ((c: ProjConstructor<BigInteger>, point: ProjPointType<BigInteger>) => ProjPointType<BigInteger>) | undefined;
    readonly hash: ut.CHash;
    readonly hmac: HmacFnSync;
    readonly randomBytes: (bytesLength?: number | undefined) => Uint8Array;
    lowS: boolean;
    readonly bits2int?: ((bytes: Uint8Array) => BigInteger) | undefined;
    readonly bits2int_modN?: ((bytes: Uint8Array) => BigInteger) | undefined;
    readonly p: BigInteger;
}>;
export type CurveFn = {
    CURVE: ReturnType<typeof validateOpts>;
    getPublicKey: (privateKey: PrivKey, isCompressed?: boolean) => Uint8Array;
    getSharedSecret: (privateA: PrivKey, publicB: Hex, isCompressed?: boolean) => Uint8Array;
    sign: (msgHash: Hex, privKey: PrivKey, opts?: SignOpts) => RecoveredSignatureType;
    verify: (signature: Hex | SignatureLike, msgHash: Hex, publicKey: Hex, opts?: VerOpts) => boolean;
    ProjectivePoint: ProjConstructor<BigInteger>;
    Signature: SignatureConstructor;
    utils: {
        normPrivateKeyToScalar: (key: PrivKey) => BigInteger;
        isValidPrivateKey(privateKey: PrivKey): boolean;
        randomPrivateKey: () => Uint8Array;
        precompute: (windowSize?: number, point?: ProjPointType<BigInteger>) => ProjPointType<BigInteger>;
    };
};
export declare function weierstrass(curveDef: CurveType): CurveFn;
/**
 * Implementation of the Shallue and van de Woestijne method for any weierstrass curve.
 * TODO: check if there is a way to merge this with uvRatio in Edwards; move to modular.
 * b = True and y = sqrt(u / v) if (u / v) is square in F, and
 * b = False and y = sqrt(Z * (u / v)) otherwise.
 * @param Fp
 * @param Z
 * @returns
 */
export declare function SWUFpSqrtRatio<T>(Fp: mod.IField<T>, Z: T): (u: T, v: T) => {
    isValid: boolean;
    value: T;
};
/**
 * From draft-irtf-cfrg-hash-to-curve-16
 */
export declare function mapToCurveSimpleSWU<T>(Fp: mod.IField<T>, opts: {
    A: T;
    B: T;
    Z: T;
}): (u: T) => {
    x: T;
    y: T;
};
