/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
import { BigInteger } from '@openpgp/noble-hashes/biginteger';
import { mod } from './abstract/modular.js';
import { ProjPointType as PointType } from './abstract/weierstrass.js';
import type { Hex, PrivKey } from './abstract/utils.js';
import { bytesToNumberBE, numberToBytesBE } from './abstract/utils.js';
export declare const secp256k1: Readonly<import("./_shortw_utils.js").CurveFnWithCreate>;
declare function taggedHash(tag: string, ...messages: Uint8Array[]): Uint8Array;
/**
 * lift_x from BIP340. Convert 32-byte x coordinate to elliptic curve point.
 * @returns valid point checked for being on-curve
 */
declare function lift_x(x: BigInteger): PointType<BigInteger>;
/**
 * Schnorr public key is just `x` coordinate of Point as per BIP340.
 */
declare function schnorrGetPublicKey(privateKey: Hex): Uint8Array;
/**
 * Creates Schnorr signature as per BIP340. Verifies itself before returning anything.
 * auxRand is optional and is not the sole source of k generation: bad CSPRNG won't be dangerous.
 */
declare function schnorrSign(message: Hex, privateKey: PrivKey, auxRand?: Hex): Uint8Array;
/**
 * Verifies Schnorr signature.
 * Will swallow errors & return false except for initial type validation of arguments.
 */
declare function schnorrVerify(signature: Hex, message: Hex, publicKey: Hex): boolean;
export declare const schnorr: {
    getPublicKey: typeof schnorrGetPublicKey;
    sign: typeof schnorrSign;
    verify: typeof schnorrVerify;
    utils: {
        randomPrivateKey: () => Uint8Array;
        lift_x: typeof lift_x;
        pointToBytes: (point: PointType<BigInteger>) => Uint8Array;
        numberToBytesBE: typeof numberToBytesBE;
        bytesToNumberBE: typeof bytesToNumberBE;
        taggedHash: typeof taggedHash;
        mod: typeof mod;
    };
};
export declare const hashToCurve: (msg: Uint8Array, options?: import("./abstract/hash-to-curve.js").htfBasicOpts | undefined) => import("./abstract/hash-to-curve.js").H2CPoint<BigInteger>;
export declare const encodeToCurve: (msg: Uint8Array, options?: import("./abstract/hash-to-curve.js").htfBasicOpts | undefined) => import("./abstract/hash-to-curve.js").H2CPoint<BigInteger>;
export {};
