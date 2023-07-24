import { BigInteger } from '@openpgp/noble-hashes/biginteger';
export declare const p256: Readonly<import("./_shortw_utils.js").CurveFnWithCreate>;
export declare const secp256r1: Readonly<import("./_shortw_utils.js").CurveFnWithCreate>;
export declare const hashToCurve: (msg: Uint8Array, options?: import("./abstract/hash-to-curve.js").htfBasicOpts | undefined) => import("./abstract/hash-to-curve.js").H2CPoint<BigInteger>;
export declare const encodeToCurve: (msg: Uint8Array, options?: import("./abstract/hash-to-curve.js").htfBasicOpts | undefined) => import("./abstract/hash-to-curve.js").H2CPoint<BigInteger>;
