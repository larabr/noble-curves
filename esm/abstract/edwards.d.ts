import * as ut from './utils.js';
import { FHash, Hex } from './utils.js';
import { Group, GroupConstructor, BasicCurve, AffinePoint } from './curve.js';
import { BigInteger } from '@noble/hashes/biginteger';
export type CurveType = BasicCurve<BigInteger> & {
    a: BigInteger;
    d: BigInteger;
    hash: FHash;
    randomBytes: (bytesLength?: number) => Uint8Array;
    adjustScalarBytes?: (bytes: Uint8Array) => Uint8Array;
    domain?: (data: Uint8Array, ctx: Uint8Array, phflag: boolean) => Uint8Array;
    uvRatio?: (u: BigInteger, v: BigInteger) => {
        isValid: boolean;
        value: BigInteger;
    };
    prehash?: FHash;
    mapToCurve?: (scalar: BigInteger[]) => AffinePoint<BigInteger>;
};
declare function validateOpts(curve: CurveType): Readonly<{
    readonly nBitLength: number;
    readonly nByteLength: number;
    readonly Fp: import("./modular.js").IField<BigInteger>;
    readonly n: BigInteger;
    readonly h: BigInteger;
    readonly hEff?: BigInteger | undefined;
    readonly Gx: BigInteger;
    readonly Gy: BigInteger;
    readonly allowInfinityPoint?: boolean | undefined;
    readonly a: BigInteger;
    readonly d: BigInteger;
    readonly hash: ut.FHash;
    readonly randomBytes: (bytesLength?: number | undefined) => Uint8Array;
    readonly adjustScalarBytes?: ((bytes: Uint8Array) => Uint8Array) | undefined;
    readonly domain?: ((data: Uint8Array, ctx: Uint8Array, phflag: boolean) => Uint8Array) | undefined;
    readonly uvRatio?: ((u: BigInteger, v: BigInteger) => {
        isValid: boolean;
        value: BigInteger;
    }) | undefined;
    readonly prehash?: ut.FHash | undefined;
    readonly mapToCurve?: ((scalar: BigInteger[]) => AffinePoint<BigInteger>) | undefined;
    readonly p: BigInteger;
}>;
export interface ExtPointType extends Group<ExtPointType> {
    readonly ex: BigInteger;
    readonly ey: BigInteger;
    readonly ez: BigInteger;
    readonly et: BigInteger;
    get x(): BigInteger;
    get y(): BigInteger;
    assertValidity(): void;
    multiply(scalar: BigInteger): ExtPointType;
    multiplyUnsafe(scalar: BigInteger): ExtPointType;
    isSmallOrder(): boolean;
    isTorsionFree(): boolean;
    clearCofactor(): ExtPointType;
    toAffine(iz?: BigInteger): AffinePoint<BigInteger>;
    toRawBytes(isCompressed?: boolean): Uint8Array;
    toHex(isCompressed?: boolean): string;
}
export interface ExtPointConstructor extends GroupConstructor<ExtPointType> {
    new (x: BigInteger, y: BigInteger, z: BigInteger, t: BigInteger): ExtPointType;
    fromAffine(p: AffinePoint<BigInteger>): ExtPointType;
    fromHex(hex: Hex): ExtPointType;
    fromPrivateKey(privateKey: Hex): ExtPointType;
}
export type CurveFn = {
    CURVE: ReturnType<typeof validateOpts>;
    getPublicKey: (privateKey: Hex) => Uint8Array;
    sign: (message: Hex, privateKey: Hex, options?: {
        context?: Hex;
    }) => Uint8Array;
    verify: (sig: Hex, message: Hex, publicKey: Hex, options?: {
        context?: Hex;
        zip215: boolean;
    }) => boolean;
    ExtendedPoint: ExtPointConstructor;
    utils: {
        randomPrivateKey: () => Uint8Array;
        getExtendedPublicKey: (key: Hex) => {
            head: Uint8Array;
            prefix: Uint8Array;
            scalar: BigInteger;
            point: ExtPointType;
            pointBytes: Uint8Array;
        };
    };
};
export declare function twistedEdwards(curveDef: CurveType): CurveFn;
export {};
