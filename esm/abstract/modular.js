/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
// Utilities for modular arithmetics and finite fields
import { BigInteger } from '@openpgp/noble-hashes/biginteger';
import { bitMask, numberToBytesBE, numberToBytesLE, bytesToNumberBE, bytesToNumberLE, ensureBytes, validateObject, } from './utils.js';
const _0n = Object.freeze(BigInteger.new(0));
const _1n = Object.freeze(BigInteger.new(1));
const _2n = Object.freeze(BigInteger.new(2));
const _3n = Object.freeze(BigInteger.new(3));
const _4n = Object.freeze(BigInteger.new(4));
const _5n = Object.freeze(BigInteger.new(5));
const _8n = Object.freeze(BigInteger.new(8));
const _9n = Object.freeze(BigInteger.new(9));
const _16n = Object.freeze(BigInteger.new(16));
// Calculates a modulo b
export function mod(a, b) {
    return a.mod(b);
}
/**
 * Efficiently raise num to power and do modular division.
 * Unsafe in some contexts: uses ladder, so can expose bigint bits.
 * @example
 * pow(2n, 6n, 11n) // 64n % 11n == 9n
 */
// TODO: use field version && remove
export function pow(num, power, modulo) {
    // if (modulo <= _0n || power < _0n) throw new Error('Expected power/modulo > 0');
    // if (modulo === _1n) return _0n;
    // let res = _1n;
    // while (power > _0n) {
    //   if (power & _1n) res = (res * num) % modulo;
    //   num = (num * num) % modulo;
    //   power >>= _1n;
    // }
    return num.modExp(power, modulo);
}
// Does x ^ (2 ^ power) mod p. pow2(30, 4) == 30 ^ (2 ^ 4)
export function pow2(x, power, modulo) {
    // let res = x;
    // while (power-- > _0n) {
    //   res *= res;
    //   res %= modulo;
    // }
    // return res;
    return x.modExp(_2n.leftShift(power.dec()), modulo);
}
// Inverses number over modulo
export function invert(number, modulo) {
    return number.modInv(modulo);
}
// Tonelli-Shanks algorithm
// Paper 1: https://eprint.iacr.org/2012/685.pdf (page 12)
// Paper 2: Square Roots from 1; 24, 51, 10 to Dan Shanks
export function tonelliShanks(P) {
    // Legendre constant: used to calculate Legendre symbol (a | p),
    // which denotes the value of a^((p-1)/2) (mod p).
    // (a | p) ≡ 1    if a is a square (mod p)
    // (a | p) ≡ -1   if a is not a square (mod p)
    // (a | p) ≡ 0    if a ≡ 0 (mod p)
    const legendreC = P.dec().rightShift(_1n);
    let Q = P.dec();
    let S = BigInteger.new(0);
    // Step 1: By factoring out powers of 2 from p - 1,
    // find q and s such that p - 1 = q*(2^s) with q odd
    while (Q.isEven()) {
        Q.irightShift(_1n);
        S.iinc();
    }
    let Z = BigInteger.new(2);
    const Pminus1 = P.dec();
    // Step 2: Select a non-square z such that (z | p) ≡ -1 and set c ≡ zq
    while (Z.lt(P) && !pow(Z, legendreC, P).equal(Pminus1)) {
        Z.iinc();
    }
    // Fast-path
    if (S.isOne()) {
        const p1div4 = P.inc().irightShift(_2n);
        return function tonelliFast(Fp, n) {
            const root = Fp.pow(n, p1div4);
            if (!Fp.eql(Fp.sqr(root), n))
                throw new Error('Cannot find square root');
            return root;
        };
    }
    // Slow-path
    const Q1div2 = Q.inc().irightShift(_1n);
    return function tonelliSlow(Fp, n) {
        // Step 0: Check that n is indeed a square: (n | p) should not be ≡ -1
        if (Fp.eql(Fp.pow(n, legendreC), Fp.neg(Fp.ONE)))
            throw new Error('Cannot find square root');
        let r = S;
        // TODO: will fail at Fp2/etc
        let g = Fp.pow(Fp.mul(Fp.ONE, Z), Q); // will update both x and b
        let x = Fp.pow(n, Q1div2); // first guess at the square root
        let b = Fp.pow(n, Q); // first guess at the fudge factor
        while (!Fp.eql(b, Fp.ONE)) {
            if (Fp.eql(b, Fp.ZERO))
                return Fp.ZERO; // https://en.wikipedia.org/wiki/Tonelli%E2%80%93Shanks_algorithm (4. If t = 0, return r = 0)
            // Find m such b^(2^m)==1
            let m = BigInteger.new(1);
            for (let t2 = Fp.sqr(b); m.lt(r); m.iinc()) {
                if (Fp.eql(t2, Fp.ONE))
                    break;
                t2 = Fp.sqr(t2); // t2 *= t2
            }
            // NOTE: r-m-1 can be bigger than 32, need to convert to bigint before shift, otherwise there will be overflow
            const ge = Fp.pow(g, _1n.leftShift(r.sub(m).idec())); // ge = 2^(r-m-1)
            g = Fp.sqr(ge); // g = ge * ge
            x = Fp.mul(x, ge); // x *= ge
            b = Fp.mul(b, g); // b *= g
            r = m;
        }
        return x;
    };
}
export function FpSqrt(P) {
    // NOTE: different algorithms can give different roots, it is up to user to decide which one they want.
    // For example there is FpSqrtOdd/FpSqrtEven to choice root based on oddness (used for hash-to-curve).
    // P ≡ 3 (mod 4)
    // √n = n^((P+1)/4)
    if (P.mod(_4n).equal(_3n)) {
        // Not all roots possible!
        // const ORDER =
        //   0x1a0111ea397fe69a4b1ba7b6434bacd764774b84f38512bf6730d2a0f6b0f6241eabfffeb153ffffb9feffffffffaaabn;
        // const NUM = 72057594037927816n;
        const p1div4 = P.add(_1n).irightShift(_2n); // .idiv(_4n);
        return function sqrt3mod4(Fp, n) {
            const root = Fp.pow(n, p1div4);
            // Throw if root**2 != n
            if (!Fp.eql(Fp.sqr(root), n))
                throw new Error('Cannot find square root');
            return root;
        };
    }
    // Atkin algorithm for q ≡ 5 (mod 8), https://eprint.iacr.org/2012/685.pdf (page 10)
    if (P.mod(_8n).equal(_5n)) {
        const c1 = P.sub(_5n).irightShift(_3n);
        return function sqrt5mod8(Fp, n) {
            const n2 = Fp.mul(n, _2n);
            const v = Fp.pow(n2, c1);
            const nv = Fp.mul(n, v);
            const i = Fp.mul(Fp.mul(nv, _2n), v);
            const root = Fp.mul(nv, Fp.sub(i, Fp.ONE));
            if (!Fp.eql(Fp.sqr(root), n))
                throw new Error('Cannot find square root');
            return root;
        };
    }
    // P ≡ 9 (mod 16)
    if (P.mod(_16n).equal(_9n)) {
        // NOTE: tonelli is too slow for bls-Fp2 calculations even on start
        // Means we cannot use sqrt for constants at all!
        //
        // const c1 = Fp.sqrt(Fp.negate(Fp.ONE)); //  1. c1 = sqrt(-1) in F, i.e., (c1^2) == -1 in F
        // const c2 = Fp.sqrt(c1);                //  2. c2 = sqrt(c1) in F, i.e., (c2^2) == c1 in F
        // const c3 = Fp.sqrt(Fp.negate(c1));     //  3. c3 = sqrt(-c1) in F, i.e., (c3^2) == -c1 in F
        // const c4 = (P + _7n) / _16n;           //  4. c4 = (q + 7) / 16        # Integer arithmetic
        // sqrt = (x) => {
        //   let tv1 = Fp.pow(x, c4);             //  1. tv1 = x^c4
        //   let tv2 = Fp.mul(c1, tv1);           //  2. tv2 = c1 * tv1
        //   const tv3 = Fp.mul(c2, tv1);         //  3. tv3 = c2 * tv1
        //   let tv4 = Fp.mul(c3, tv1);           //  4. tv4 = c3 * tv1
        //   const e1 = Fp.equals(Fp.square(tv2), x); //  5.  e1 = (tv2^2) == x
        //   const e2 = Fp.equals(Fp.square(tv3), x); //  6.  e2 = (tv3^2) == x
        //   tv1 = Fp.cmov(tv1, tv2, e1); //  7. tv1 = CMOV(tv1, tv2, e1)  # Select tv2 if (tv2^2) == x
        //   tv2 = Fp.cmov(tv4, tv3, e2); //  8. tv2 = CMOV(tv4, tv3, e2)  # Select tv3 if (tv3^2) == x
        //   const e3 = Fp.equals(Fp.square(tv2), x); //  9.  e3 = (tv2^2) == x
        //   return Fp.cmov(tv1, tv2, e3); //  10.  z = CMOV(tv1, tv2, e3)  # Select the sqrt from tv1 and tv2
        // }
    }
    // Other cases: Tonelli-Shanks algorithm
    return tonelliShanks(P);
}
// Little-endian check for first LE bit (last BE bit);
export const isNegativeLE = (num, modulo) => (mod(num, modulo).getBit(0) === 1);
// prettier-ignore
const FIELD_FIELDS = [
    'create', 'isValid', 'is0', 'neg', 'inv', 'sqrt', 'sqr',
    'eql', 'add', 'sub', 'mul', 'pow', 'div',
    'addN', 'subN', 'mulN', 'sqrN'
];
export function validateField(field) {
    const initial = {
        ORDER: 'BigInteger',
        MASK: 'BigInteger',
        BYTES: 'isSafeInteger',
        BITS: 'isSafeInteger',
    };
    const opts = FIELD_FIELDS.reduce((map, val) => {
        map[val] = 'function';
        return map;
    }, initial);
    return validateObject(field, opts);
}
// Generic field functions
export function FpPow(f, num, power) {
    // Should have same speed as pow for bigints
    // TODO: benchmark!
    if (power.isNegative())
        throw new Error('Expected power > 0');
    if (power.isZero())
        return f.ONE;
    if (power.isOne())
        return num;
    let p = f.ONE;
    let d = num;
    while (power.gt(_0n)) {
        if (!power.isEven())
            p = f.mul(p, d);
        d = f.sqr(d);
        power = power.rightShift(_1n);
    }
    return p;
}
// 0 is non-invertible: non-batched version will throw on 0
export function FpInvertBatch(f, nums) {
    const tmp = new Array(nums.length);
    // Walk from first to last, multiply them by each other MOD p
    const lastMultiplied = nums.reduce((acc, num, i) => {
        if (f.is0(num))
            return acc;
        tmp[i] = acc;
        return f.mul(acc, num);
    }, f.ONE);
    // Invert last element
    const inverted = f.inv(lastMultiplied);
    // Walk from last to first, multiply them by inverted each other MOD p
    nums.reduceRight((acc, num, i) => {
        if (f.is0(num))
            return acc;
        tmp[i] = f.mul(acc, tmp[i]);
        return f.mul(acc, num);
    }, inverted);
    return tmp;
}
export function FpDiv(f, lhs, rhs) {
    return f.mul(lhs, rhs instanceof BigInteger ? invert(rhs, f.ORDER) : f.inv(rhs));
}
// This function returns True whenever the value x is a square in the field F.
export function FpIsSquare(f) {
    const legendreConst = f.ORDER.dec().irightShift(_1n); // Integer arithmetic
    return (x) => {
        const p = f.pow(x, legendreConst);
        return f.eql(p, f.ZERO) || f.eql(p, f.ONE);
    };
}
// CURVE.n lengths
export function nLength(n, nBitLength) {
    // Bit size, byte size of CURVE.n
    const _nBitLength = nBitLength !== undefined ? nBitLength : n.bitLength();
    const nByteLength = Math.ceil(_nBitLength / 8);
    return { nBitLength: _nBitLength, nByteLength };
}
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
export function Field(ORDER, bitLen, isLE = false, redef = {}) {
    if (ORDER.lte(_0n))
        throw new Error(`Expected Fp ORDER > 0, got ${ORDER}`);
    const { nBitLength: BITS, nByteLength: BYTES } = nLength(ORDER, bitLen);
    if (BYTES > 2048)
        throw new Error('Field lengths over 2048 bytes are not supported');
    const sqrtP = FpSqrt(ORDER);
    const f = Object.freeze({
        ORDER,
        BITS,
        BYTES,
        MASK: bitMask(BITS),
        ZERO: _0n,
        ONE: _1n,
        create: (num) => mod(num, ORDER),
        isValid: (num) => {
            if (!(num instanceof BigInteger))
                throw new Error(`Invalid field element: expected bigint, got ${typeof num}`);
            return _0n.lte(num) && num.lt(ORDER); // 0 is valid element, but it's not invertible
        },
        is0: (num) => num.isZero(),
        isOdd: (num) => !num.isEven(),
        neg: (num) => mod(num.negate(), ORDER),
        eql: (lhs, rhs) => lhs.equal(rhs),
        sqr: (num) => mod(num.mul(num), ORDER),
        add: (lhs, rhs) => mod(lhs.add(rhs), ORDER),
        sub: (lhs, rhs) => mod(lhs.sub(rhs), ORDER),
        mul: (lhs, rhs) => mod(lhs.mul(rhs), ORDER),
        pow: (num, power) => FpPow(f, num, power),
        div: (lhs, rhs) => mod(lhs.mul(invert(rhs, ORDER)), ORDER),
        // Same as above, but doesn't normalize
        sqrN: (num) => num.mul(num),
        addN: (lhs, rhs) => lhs.add(rhs),
        subN: (lhs, rhs) => lhs.sub(rhs),
        mulN: (lhs, rhs) => lhs.mul(rhs),
        inv: (num) => invert(num, ORDER),
        sqrt: redef.sqrt || ((n) => sqrtP(f, n)),
        invertBatch: (lst) => FpInvertBatch(f, lst),
        // TODO: do we really need constant cmov?
        // We don't have const-time bigints anyway, so probably will be not very useful
        cmov: (a, b, c) => (c ? b : a),
        toBytes: (num) => (isLE ? numberToBytesLE(num, BYTES) : numberToBytesBE(num, BYTES)),
        fromBytes: (bytes) => {
            if (bytes.length !== BYTES)
                throw new Error(`Fp.fromBytes: expected ${BYTES}, got ${bytes.length}`);
            return isLE ? bytesToNumberLE(bytes) : bytesToNumberBE(bytes);
        },
    });
    return Object.freeze(f);
}
export function FpSqrtOdd(Fp, elm) {
    if (!Fp.isOdd)
        throw new Error(`Field doesn't have isOdd`);
    const root = Fp.sqrt(elm);
    return Fp.isOdd(root) ? root : Fp.neg(root);
}
export function FpSqrtEven(Fp, elm) {
    if (!Fp.isOdd)
        throw new Error(`Field doesn't have isOdd`);
    const root = Fp.sqrt(elm);
    return Fp.isOdd(root) ? Fp.neg(root) : root;
}
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
export function hashToPrivateScalar(hash, groupOrder, isLE = false) {
    hash = ensureBytes('privateHash', hash);
    const hashLen = hash.length;
    const minLen = nLength(groupOrder).nByteLength + 8;
    if (minLen < 24 || hashLen < minLen || hashLen > 1024)
        throw new Error(`hashToPrivateScalar: expected ${minLen}-1024 bytes of input, got ${hashLen}`);
    const num = isLE ? bytesToNumberLE(hash) : bytesToNumberBE(hash);
    return mod(num, groupOrder.dec()).inc();
}
//# sourceMappingURL=modular.js.map