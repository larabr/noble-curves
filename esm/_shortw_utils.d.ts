import { randomBytes } from '@openpgp/noble-hashes/utils';
import { CurveType, CurveFn } from './abstract/weierstrass.js';
import { CHash } from './abstract/utils.js';
export declare function getHash(hash: CHash): {
    hash: CHash;
    hmac: (key: Uint8Array, ...msgs: Uint8Array[]) => Uint8Array;
    randomBytes: typeof randomBytes;
};
type CurveDef = Readonly<Omit<CurveType, 'hash' | 'hmac' | 'randomBytes'>>;
export interface CurveFnWithCreate extends CurveFn {
    create: (hash: CHash) => CurveFn;
}
export declare function createCurve(curveDef: CurveDef, defHash: CHash): Readonly<CurveFnWithCreate>;
export {};
