/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
import { BigInteger } from '@openpgp/noble-hashes/biginteger';
import { sha512 } from '@openpgp/noble-hashes/sha512';
import { concatBytes, randomBytes, utf8ToBytes } from '@openpgp/noble-hashes/utils';
import { ExtPointType, twistedEdwards } from './abstract/edwards.js';
import { montgomery } from './abstract/montgomery.js';
import { Field, FpSqrtEven, isNegativeLE, mod, pow2 } from './abstract/modular.js';
import {
  bytesToHex,
  bytesToNumberLE,
  ensureBytes,
  equalBytes,
  Hex,
  numberToBytesLE,
} from './abstract/utils.js';
import { createHasher, htfBasicOpts, expand_message_xmd } from './abstract/hash-to-curve.js';
import { AffinePoint } from './abstract/curve.js';

/**
 * ed25519 Twisted Edwards curve with following addons:
 * - X25519 ECDH
 * - Ristretto cofactor elimination
 * - Elligator hash-to-group / point indistinguishability
 */

const ED25519_P = Object.freeze(BigInteger.new(
  '57896044618658097711785492504343953926634992332820282019728792003956564819949'
));
// √(-1) aka √(a) aka 2^((p-1)/4)
const ED25519_SQRT_M1 = Object.freeze(BigInteger.new(
  '19681161376707505956807079304988542015446066515923890162744021073123829784752'
));

const _1n = Object.freeze(BigInteger.new(1));
const _2n = Object.freeze(BigInteger.new(2));
const _3n = Object.freeze(BigInteger.new(3));
const _5n = Object.freeze(BigInteger.new(5));
const _10n = Object.freeze(BigInteger.new(10));
const _20n = Object.freeze(BigInteger.new(20));
const _40n = Object.freeze(BigInteger.new(40));
const _80n = Object.freeze(BigInteger.new(80));

function ed25519_pow_2_252_3(x: BigInteger) {
  const P = ED25519_P;
  const x2 = x.mul(x).imod(P);
  const b2 = x2.mul(x).imod(P); // x^3, 11
  const b4 = pow2(b2, _2n, P).imul(b2).imod(P); // x^15, 1111
  const b5 = pow2(b4, _1n, P).imul(x).imod(P); // x^31
  const b10 = pow2(b5, _5n, P).imul(b5).imod(P);
  const b20 = pow2(b10, _10n, P).imul(b10).imod(P);
  const b40 = pow2(b20, _20n, P).imul(b20).imod(P);
  const b80 = pow2(b40, _40n, P).imul(b40).imod(P);
  const b160 = pow2(b80, _80n, P).imul(b80).imod(P);
  const b240 = pow2(b160, _80n, P).imul(b80).imod(P);
  const b250 = pow2(b240, _10n, P).imul(b10).imod(P);
  const pow_p_5_8 = pow2(b250, _2n, P).imul(x).imod(P);
  // ^ To pow to (p+3)/8, multiply it by x.
  return { pow_p_5_8, b2 };
}

function adjustScalarBytes(bytes: Uint8Array): Uint8Array {
  // Section 5: For X25519, in order to decode 32 random bytes as an integer scalar,
  // set the three least significant bits of the first byte
  bytes[0] &= 248; // 0b1111_1000
  // and the most significant bit of the last to zero,
  bytes[31] &= 127; // 0b0111_1111
  // set the second most significant bit of the last byte to 1
  bytes[31] |= 64; // 0b0100_0000
  return bytes;
}

// sqrt(u/v)
function uvRatio(u: BigInteger, v: BigInteger): { isValid: boolean; value: BigInteger } {
  const P = ED25519_P;
  const v3 = mod(v.mul(v).imul(v), P); // v³
  const v7 = mod(v3.mul(v3).imul(v), P); // v⁷
  // (p+3)/8 and (p-5)/8
  const pow = ed25519_pow_2_252_3(u.mul(v7)).pow_p_5_8;
  let x = mod(u.mul(v3).imul(pow), P); // (uv³)(uv⁷)^(p-5)/8
  const vx2 = mod(v.mul(x).imul(x), P); // vx²
  const root1 = x; // First root candidate
  const root2 = mod(x.mul(ED25519_SQRT_M1), P); // Second root candidate
  const useRoot1 = vx2.equal(u); // If vx² = u (mod p), x is a square root
  const useRoot2 = vx2.equal( mod(u.negate(), P) ); // If vx² = -u, set x <-- x * 2^((p-1)/4)
  const noRoot = vx2.equal( mod(u.negate().imul(ED25519_SQRT_M1), P) ); // There is no valid root, vx² = -u√(-1)
  if (useRoot1) x = root1;
  if (useRoot2 || noRoot) x = root2; // We return root2 anyway, for const-time
  if (isNegativeLE(x, P)) x = mod(x.negate(), P);
  return { isValid: useRoot1 || useRoot2, value: x };
}

// Just in case
export const ED25519_TORSION_SUBGROUP = [
  '0100000000000000000000000000000000000000000000000000000000000000',
  'c7176a703d4dd84fba3c0b760d10670f2a2053fa2c39ccc64ec7fd7792ac037a',
  '0000000000000000000000000000000000000000000000000000000000000080',
  '26e8958fc2b227b045c3f489f2ef98f0d5dfac05d3c63339b13802886d53fc05',
  'ecffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff7f',
  '26e8958fc2b227b045c3f489f2ef98f0d5dfac05d3c63339b13802886d53fc85',
  '0000000000000000000000000000000000000000000000000000000000000000',
  'c7176a703d4dd84fba3c0b760d10670f2a2053fa2c39ccc64ec7fd7792ac03fa',
];

const Fp = Field(ED25519_P, undefined, true);

const ed25519Defaults = {
  // Param: a
  a: BigInteger.new(-1), // Fp.create(-1) is proper; our way still works and is faster
  // d is equal to -121665/121666 over finite field.
  // Negative number is P - number, and division is invert(number, P)
  d: BigInteger.new('37095705934669439343138083508754565189542113879843219016388785533085940283555'),
  // Finite field 𝔽p over which we'll do calculations; 2n**255n - 19n
  Fp,
  // Subgroup order: how many points curve has
  // 2n**252n + 27742317777372353535851937790883648493n;
  n: BigInteger.new('7237005577332262213973186563042994240857116359379907606001950938285454250989'),
  // Cofactor
  h: BigInteger.new(8),
  // Base point (x, y) aka generator point
  Gx: BigInteger.new('15112221349535400772501151409588531511454012693041857206046113283949847762202'),
  Gy: BigInteger.new('46316835694926478169428394003475163141307993866256225615783033603165251855960'),
  hash: sha512,
  randomBytes,
  adjustScalarBytes,
  // dom2
  // Ratio of u to v. Allows us to combine inversion and square root. Uses algo from RFC8032 5.1.3.
  // Constant-time, u/√v
  uvRatio,
} as const;

export const ed25519 = twistedEdwards(ed25519Defaults);

function ed25519_domain(data: Uint8Array, ctx: Uint8Array, phflag: boolean) {
  if (ctx.length > 255) throw new Error('Context is too big');
  return concatBytes(
    utf8ToBytes('SigEd25519 no Ed25519 collisions'),
    new Uint8Array([phflag ? 1 : 0, ctx.length]),
    ctx,
    data
  );
}

export const ed25519ctx = twistedEdwards({ ...ed25519Defaults, domain: ed25519_domain });
export const ed25519ph = twistedEdwards({
  ...ed25519Defaults,
  domain: ed25519_domain,
  prehash: sha512,
});

export const x25519 = /* @__PURE__ */ (() =>
  montgomery({
    P: ED25519_P,
    a: BigInteger.new(486662),
    montgomeryBits: 255, // n is 253 bits
    nByteLength: 32,
    Gu: BigInteger.new(9),
    powPminus2: (x: BigInteger): BigInteger => {
      const P = ED25519_P;
      // x^(p-2) aka x^(2^255-21)
      const { pow_p_5_8, b2 } = ed25519_pow_2_252_3(x);
      return mod( pow2(pow_p_5_8, BigInteger.new(3), P).imul(b2), P );
    },
    adjustScalarBytes,
    randomBytes,
  }))();

/**
 * Converts ed25519 public key to x25519 public key. Uses formula:
 * * `(u, v) = ((1+y)/(1-y), sqrt(-486664)*u/x)`
 * * `(x, y) = (sqrt(-486664)*u/v, (u-1)/(u+1))`
 * @example
 *   const someonesPub = ed25519.getPublicKey(ed25519.utils.randomPrivateKey());
 *   const aPriv = x25519.utils.randomPrivateKey();
 *   x25519.getSharedSecret(aPriv, edwardsToMontgomeryPub(someonesPub))
 */
export function edwardsToMontgomeryPub(edwardsPub: Hex): Uint8Array {
  const { y } = ed25519.ExtendedPoint.fromHex(edwardsPub);
  const _1n = BigInteger.new(1);
  return Fp.toBytes(Fp.create( _1n.add(y).imul( Fp.inv(_1n.sub(y)) )));
}
export const edwardsToMontgomery = edwardsToMontgomeryPub; // deprecated

/**
 * Converts ed25519 secret key to x25519 secret key.
 * @example
 *   const someonesPub = x25519.getPublicKey(x25519.utils.randomPrivateKey());
 *   const aPriv = ed25519.utils.randomPrivateKey();
 *   x25519.getSharedSecret(edwardsToMontgomeryPriv(aPriv), someonesPub)
 */
export function edwardsToMontgomeryPriv(edwardsPriv: Uint8Array): Uint8Array {
  const hashed = ed25519Defaults.hash(edwardsPriv.subarray(0, 32));
  return ed25519Defaults.adjustScalarBytes(hashed).subarray(0, 32);
}

// Hash To Curve Elligator2 Map (NOTE: different from ristretto255 elligator)
// NOTE: very important part is usage of FpSqrtEven for ELL2_C1_EDWARDS, since
// SageMath returns different root first and everything falls apart
const ELL2_C1 = Fp.ORDER.add(_3n).irightShift(_3n); // 1. c1 = (q + 3) / 8       # Integer arithmetic

const ELL2_C2 = Fp.pow(_2n, ELL2_C1); // 2. c2 = 2^c1
const ELL2_C3 = Fp.sqrt(Fp.neg(Fp.ONE)); // 3. c3 = sqrt(-1)
const ELL2_C4 = Fp.ORDER.sub(_5n).irightShift(_3n);// 4. c4 = (q - 5) / 8       # Integer arithmetic
const ELL2_J = BigInteger.new(486662);

// prettier-ignore
function map_to_curve_elligator2_curve25519(u: BigInteger) {
  let tv1 = Fp.sqr(u);       //  1.  tv1 = u^2
  tv1 = Fp.mul(tv1, _2n);       //  2.  tv1 = 2 * tv1
  let xd = Fp.add(tv1, Fp.ONE); //  3.   xd = tv1 + 1         # Nonzero: -1 is square (mod p), tv1 is not
  let x1n = Fp.neg(ELL2_J);  //  4.  x1n = -J              # x1 = x1n / xd = -J / (1 + 2 * u^2)
  let tv2 = Fp.sqr(xd);      //  5.  tv2 = xd^2
  let gxd = Fp.mul(tv2, xd);    //  6.  gxd = tv2 * xd        # gxd = xd^3
  let gx1 = Fp.mul(tv1, ELL2_J); //  7.  gx1 = J * tv1         # x1n + J * xd
  gx1 = Fp.mul(gx1, x1n);       //  8.  gx1 = gx1 * x1n       # x1n^2 + J * x1n * xd
  gx1 = Fp.add(gx1, tv2);       //  9.  gx1 = gx1 + tv2       # x1n^2 + J * x1n * xd + xd^2
  gx1 = Fp.mul(gx1, x1n);       //  10. gx1 = gx1 * x1n       # x1n^3 + J * x1n^2 * xd + x1n * xd^2
  let tv3 = Fp.sqr(gxd);     //  11. tv3 = gxd^2
  tv2 = Fp.sqr(tv3);         //  12. tv2 = tv3^2           # gxd^4
  tv3 = Fp.mul(tv3, gxd);       //  13. tv3 = tv3 * gxd       # gxd^3
  tv3 = Fp.mul(tv3, gx1);       //  14. tv3 = tv3 * gx1       # gx1 * gxd^3
  tv2 = Fp.mul(tv2, tv3);       //  15. tv2 = tv2 * tv3       # gx1 * gxd^7
  let y11 = Fp.pow(tv2, ELL2_C4); //  16. y11 = tv2^c4        # (gx1 * gxd^7)^((p - 5) / 8)
  y11 = Fp.mul(y11, tv3);       //  17. y11 = y11 * tv3       # gx1*gxd^3*(gx1*gxd^7)^((p-5)/8)
  let y12 = Fp.mul(y11, ELL2_C3); //  18. y12 = y11 * c3
  tv2 = Fp.sqr(y11);         //  19. tv2 = y11^2
  tv2 = Fp.mul(tv2, gxd);       //  20. tv2 = tv2 * gxd
  let e1 = Fp.eql(tv2, gx1); //  21.  e1 = tv2 == gx1
  let y1 = Fp.cmov(y12, y11, e1); //  22.  y1 = CMOV(y12, y11, e1)  # If g(x1) is square, this is its sqrt
  let x2n = Fp.mul(x1n, tv1);   //  23. x2n = x1n * tv1       # x2 = x2n / xd = 2 * u^2 * x1n / xd
  let y21 = Fp.mul(y11, u);     //  24. y21 = y11 * u
  y21 = Fp.mul(y21, ELL2_C2);   //  25. y21 = y21 * c2
  let y22 = Fp.mul(y21, ELL2_C3); //  26. y22 = y21 * c3
  let gx2 = Fp.mul(gx1, tv1);   //  27. gx2 = gx1 * tv1       # g(x2) = gx2 / gxd = 2 * u^2 * g(x1)
  tv2 = Fp.sqr(y21);         //  28. tv2 = y21^2
  tv2 = Fp.mul(tv2, gxd);       //  29. tv2 = tv2 * gxd
  let e2 = Fp.eql(tv2, gx2); //  30.  e2 = tv2 == gx2
  let y2 = Fp.cmov(y22, y21, e2); //  31.  y2 = CMOV(y22, y21, e2)  # If g(x2) is square, this is its sqrt
  tv2 = Fp.sqr(y1);          //  32. tv2 = y1^2
  tv2 = Fp.mul(tv2, gxd);       //  33. tv2 = tv2 * gxd
  let e3 = Fp.eql(tv2, gx1); //  34.  e3 = tv2 == gx1
  let xn = Fp.cmov(x2n, x1n, e3); //  35.  xn = CMOV(x2n, x1n, e3)  # If e3, x = x1, else x = x2
  let y = Fp.cmov(y2, y1, e3);  //  36.   y = CMOV(y2, y1, e3)    # If e3, y = y1, else y = y2
  let e4 = Fp.isOdd(y);         //  37.  e4 = sgn0(y) == 1        # Fix sign of y
  y = Fp.cmov(y, Fp.neg(y), e3 !== e4); //  38.   y = CMOV(y, -y, e3 XOR e4)
  return { xMn: xn, xMd: xd, yMn: y, yMd: _1n }; //  39. return (xn, xd, y, 1)
}

const ELL2_C1_EDWARDS = FpSqrtEven(Fp, Fp.neg(BigInteger.new(486664))); // sgn0(c1) MUST equal 0
function map_to_curve_elligator2_edwards25519(u: BigInteger) {
  const { xMn, xMd, yMn, yMd } = map_to_curve_elligator2_curve25519(u); //  1.  (xMn, xMd, yMn, yMd) =
  // map_to_curve_elligator2_curve25519(u)
  let xn = Fp.mul(xMn, yMd); //  2.  xn = xMn * yMd
  xn = Fp.mul(xn, ELL2_C1_EDWARDS); //  3.  xn = xn * c1
  let xd = Fp.mul(xMd, yMn); //  4.  xd = xMd * yMn    # xn / xd = c1 * xM / yM
  let yn = Fp.sub(xMn, xMd); //  5.  yn = xMn - xMd
  let yd = Fp.add(xMn, xMd); //  6.  yd = xMn + xMd    # (n / d - 1) / (n / d + 1) = (n - d) / (n + d)
  let tv1 = Fp.mul(xd, yd); //  7. tv1 = xd * yd
  let e = Fp.eql(tv1, Fp.ZERO); //  8.   e = tv1 == 0
  xn = Fp.cmov(xn, Fp.ZERO, e); //  9.  xn = CMOV(xn, 0, e)
  xd = Fp.cmov(xd, Fp.ONE, e); //  10. xd = CMOV(xd, 1, e)
  yn = Fp.cmov(yn, Fp.ONE, e); //  11. yn = CMOV(yn, 1, e)
  yd = Fp.cmov(yd, Fp.ONE, e); //  12. yd = CMOV(yd, 1, e)

  const inv = Fp.invertBatch([xd, yd]); // batch division
  return { x: Fp.mul(xn, inv[0]), y: Fp.mul(yn, inv[1]) }; //  13. return (xn, xd, yn, yd)
}

const htf = /* @__PURE__ */ (() =>
  createHasher(
    ed25519.ExtendedPoint,
    (scalars: BigInteger[]) => map_to_curve_elligator2_edwards25519(scalars[0]),
    {
      DST: 'edwards25519_XMD:SHA-512_ELL2_RO_',
      encodeDST: 'edwards25519_XMD:SHA-512_ELL2_NU_',
      p: Fp.ORDER,
      m: 1,
      k: 128,
      expand: 'xmd',
      hash: sha512,
    }
  ))();
export const hashToCurve = /* @__PURE__ */ (() => htf.hashToCurve)();
export const encodeToCurve = /* @__PURE__ */ (() => htf.encodeToCurve)();

function assertRstPoint(other: unknown) {
  if (!(other instanceof RistPoint)) throw new Error('RistrettoPoint expected');
}

// √(-1) aka √(a) aka 2^((p-1)/4)
const SQRT_M1 = ED25519_SQRT_M1;
// √(ad - 1)
const SQRT_AD_MINUS_ONE = BigInteger.new(
  '25063068953384623474111414158702152701244531502492656460079210482610430750235'
);
// 1 / √(a-d)
const INVSQRT_A_MINUS_D = BigInteger.new(
  '54469307008909316920995813868745141605393597292927456921205312896311721017578'
);
// 1-d²
const ONE_MINUS_D_SQ = BigInteger.new(
  '1159843021668779879193775521855586647937357759715417654439879720876111806838'
);
// (d-1)²
const D_MINUS_ONE_SQ = BigInteger.new(
  '40440834346308536858101042469323190826248399146238708352240133220865137265952'
);
// Calculates 1/√(number)
const invertSqrt = (number: BigInteger) => uvRatio(_1n, number);

const MAX_255B = BigInteger.new('0x7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
const bytes255ToNumberLE = (bytes: Uint8Array) =>
  ed25519.CURVE.Fp.create(bytesToNumberLE(bytes).ibitwiseAnd(MAX_255B));

type ExtendedPoint = ExtPointType;

// Computes Elligator map for Ristretto
// https://ristretto.group/formulas/elligator.html
function calcElligatorRistrettoMap(r0: BigInteger): ExtendedPoint {
  const { d } = ed25519.CURVE;
  const P = ed25519.CURVE.Fp.ORDER;
  const mod = ed25519.CURVE.Fp.create;
  const r = mod(SQRT_M1.mul(r0).imul(r0)); // 1
  const Ns = mod(r.add(_1n).imul(ONE_MINUS_D_SQ)); // 2
  let c = BigInteger.new(-1); // 3
  const D = mod(c.sub( d.mul(r) ).imul( mod(r.add(d)) )); // 4
  let { isValid: Ns_D_is_sq, value: s } = uvRatio(Ns, D); // 5
  let s_ = mod(s.mul(r0)); // 6
  if (!isNegativeLE(s_, P)) s_ = mod(s_.negate());
  if (!Ns_D_is_sq) s = s_; // 7
  if (!Ns_D_is_sq) c = r; // 8
  const Nt = mod(c.mul(r.sub(_1n)).imul( D_MINUS_ONE_SQ ).isub( D )); // 9
  const s2 = s.mul(s);
  const W0 = mod(s.add(s).imul(D)); // 10
  const W1 = mod(Nt.mul(SQRT_AD_MINUS_ONE)); // 11
  const W2 = mod(_1n.sub(s2)); // 12
  const W3 = mod(_1n.add(s2)); // 13
  return new ed25519.ExtendedPoint(mod(W0.mul(W3)), mod(W2.mul(W1)), mod(W1.mul(W3)), mod(W0.mul(W2)));
}

/**
 * Each ed25519/ExtendedPoint has 8 different equivalent points. This can be
 * a source of bugs for protocols like ring signatures. Ristretto was created to solve this.
 * Ristretto point operates in X:Y:Z:T extended coordinates like ExtendedPoint,
 * but it should work in its own namespace: do not combine those two.
 * https://datatracker.ietf.org/doc/html/draft-irtf-cfrg-ristretto255-decaf448
 */
class RistPoint {
  static BASE: RistPoint;
  static ZERO: RistPoint;
  // Private property to discourage combining ExtendedPoint + RistrettoPoint
  // Always use Ristretto encoding/decoding instead.
  constructor(private readonly ep: ExtendedPoint) {}

  static fromAffine(ap: AffinePoint<BigInteger>) {
    return new RistPoint(ed25519.ExtendedPoint.fromAffine(ap));
  }

  /**
   * Takes uniform output of 64-byte hash function like sha512 and converts it to `RistrettoPoint`.
   * The hash-to-group operation applies Elligator twice and adds the results.
   * **Note:** this is one-way map, there is no conversion from point to hash.
   * https://ristretto.group/formulas/elligator.html
   * @param hex 64-byte output of a hash function
   */
  static hashToCurve(hex: Hex): RistPoint {
    hex = ensureBytes('ristrettoHash', hex, 64);
    const r1 = bytes255ToNumberLE(hex.slice(0, 32));
    const R1 = calcElligatorRistrettoMap(r1);
    const r2 = bytes255ToNumberLE(hex.slice(32, 64));
    const R2 = calcElligatorRistrettoMap(r2);
    return new RistPoint(R1.add(R2));
  }

  /**
   * Converts ristretto-encoded string to ristretto point.
   * https://ristretto.group/formulas/decoding.html
   * @param hex Ristretto-encoded 32 bytes. Not every 32-byte string is valid ristretto encoding
   */
  static fromHex(hex: Hex): RistPoint {
    hex = ensureBytes('ristrettoHex', hex, 32);
    const { a, d } = ed25519.CURVE;
    const P = ed25519.CURVE.Fp.ORDER;
    const mod = ed25519.CURVE.Fp.create;
    const emsg = 'RistrettoPoint.fromHex: the hex is not valid encoding of RistrettoPoint';
    const s = bytes255ToNumberLE(hex);
    // 1. Check that s_bytes is the canonical encoding of a field element, or else abort.
    // 3. Check that s is non-negative, or else abort
    if (!equalBytes(numberToBytesLE(s, 32), hex) || isNegativeLE(s, P)) throw new Error(emsg);
    const s2 = mod(s.mul(s));
    const u1 = mod(_1n.add( a.mul(s2) )); // 4 (a is -1)
    const u2 = mod(_1n.sub( a.mul(s2)) ); // 5
    const u1_2 = mod(u1.mul(u1));
    const u2_2 = mod(u2.mul(u2));
    const v = mod( a.mul(d).mul(u1_2).sub(u2_2) ); // 6
    const { isValid, value: I } = invertSqrt(mod(v.mul(u2_2))); // 7
    const Dx = mod(I.mul(u2)); // 8
    const Dy = mod(I.mul(Dx).mul(v)); // 9
    let x = mod(s.add(s).imul(Dx)); // 10
    if (isNegativeLE(x, P)) x = mod(x.negate()); // 10
    const y = mod(u1.mul(Dy)); // 11
    const t = mod(x.mul(y)); // 12
    if (!isValid || isNegativeLE(t, P) || y.isZero()) throw new Error(emsg);
    return new RistPoint(new ed25519.ExtendedPoint(x, y, _1n, t));
  }

  /**
   * Encodes ristretto point to Uint8Array.
   * https://ristretto.group/formulas/encoding.html
   */
  toRawBytes(): Uint8Array {
    let { ex: x, ey: y, ez: z, et: t } = this.ep;
    const P = ed25519.CURVE.Fp.ORDER;
    const mod = ed25519.CURVE.Fp.create;
    const u1 = mod(mod(z.add(y)).mul( mod(z.sub(y)) )); // 1
    const u2 = mod(x.mul(y)); // 2
    // Square root always exists
    const u2sq = mod(u2.mul(u2));
    const { value: invsqrt } = invertSqrt(mod(u1.mul(u2sq))); // 3
    const D1 = mod(invsqrt.mul(u1)); // 4
    const D2 = mod(invsqrt.mul(u2)); // 5
    const zInv = mod(D1.mul(D2).imul(t)); // 6
    let D: BigInteger; // 7
    if (isNegativeLE(t.mul(zInv), P)) {
      let _x = mod(y.mul(SQRT_M1));
      let _y = mod(x.mul(SQRT_M1));
      x = _x;
      y = _y;
      D = mod(D1.mul(INVSQRT_A_MINUS_D));
    } else {
      D = D2; // 8
    }
    if (isNegativeLE(x.mul(zInv), P)) y = mod(y.negate()); // 9
    let s = mod((z.sub(y)).mul(D)); // 10 (check footer's note, no sqrt(-a))
    if (isNegativeLE(s, P)) s = mod(s.negate());
    return numberToBytesLE(s, 32); // 11
  }

  toHex(): string {
    return bytesToHex(this.toRawBytes());
  }

  toString(): string {
    return this.toHex();
  }

  // Compare one point to another.
  equals(other: RistPoint): boolean {
    assertRstPoint(other);
    const { ex: X1, ey: Y1 } = this.ep;
    const { ex: X2, ey: Y2 } = other.ep;
    const mod = ed25519.CURVE.Fp.create;
    // (x1 * y2 == y1 * x2) | (y1 * y2 == x1 * x2)
    const one = mod( X1.mul(Y2) ).equal( mod(Y1.mul(X2)) );
    const two = mod( Y1.mul(Y2) ).equal( mod(X1.mul(X2)) );
    return one || two;
  }

  add(other: RistPoint): RistPoint {
    assertRstPoint(other);
    return new RistPoint(this.ep.add(other.ep));
  }

  subtract(other: RistPoint): RistPoint {
    assertRstPoint(other);
    return new RistPoint(this.ep.subtract(other.ep));
  }

  multiply(scalar: BigInteger): RistPoint {
    return new RistPoint(this.ep.multiply(scalar));
  }

  multiplyUnsafe(scalar: BigInteger): RistPoint {
    return new RistPoint(this.ep.multiplyUnsafe(scalar));
  }
}
export const RistrettoPoint = /* @__PURE__ */ (() => {
  if (!RistPoint.BASE) RistPoint.BASE = new RistPoint(ed25519.ExtendedPoint.BASE);
  if (!RistPoint.ZERO) RistPoint.ZERO = new RistPoint(ed25519.ExtendedPoint.ZERO);
  return RistPoint;
})();

// https://datatracker.ietf.org/doc/draft-irtf-cfrg-hash-to-curve/14/
// Appendix B.  Hashing to ristretto255
export const hash_to_ristretto255 = (msg: Uint8Array, options: htfBasicOpts) => {
  const d = options.DST;
  const DST = typeof d === 'string' ? utf8ToBytes(d) : d;
  const uniform_bytes = expand_message_xmd(msg, DST, 64, sha512);
  const P = RistPoint.hashToCurve(uniform_bytes);
  return P;
};
