"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.encodeToCurve = exports.hashToCurve = exports.edwardsToMontgomery = exports.edwardsToMontgomeryPub = exports.x448 = exports.ed448ph = exports.ed448 = void 0;
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const sha3_1 = require("@noble/hashes/sha3");
const utils_1 = require("@noble/hashes/utils");
const edwards_js_1 = require("./abstract/edwards.js");
const modular_js_1 = require("./abstract/modular.js");
const montgomery_js_1 = require("./abstract/montgomery.js");
const hash_to_curve_js_1 = require("./abstract/hash-to-curve.js");
const index_js_1 = require("./biginteger/index.js");
/**
 * Edwards448 (not Ed448-Goldilocks) curve with following addons:
 * * X448 ECDH
 * Conforms to RFC 8032 https://www.rfc-editor.org/rfc/rfc8032.html#section-5.2
 */
const shake256_114 = (0, utils_1.wrapConstructor)(() => sha3_1.shake256.create({ dkLen: 114 }));
const shake256_64 = (0, utils_1.wrapConstructor)(() => sha3_1.shake256.create({ dkLen: 64 }));
const ed448P = index_js_1.BigInteger.new('726838724295606890549323807888004534353641360687318060281490199180612328166730772686396383698676545930088884461843637361053498018365439');
// powPminus3div4 calculates z = x^k mod p, where k = (p-3)/4.
// Used for efficient square root calculation.
// ((P-3)/4).toString(2) would produce bits [223x 1, 0, 222x 1]
function ed448_pow_Pminus3div4(x) {
    const P = ed448P;
    // prettier-ignore
    const _1n = index_js_1.BigInteger.new(1), _2n = index_js_1.BigInteger.new(2), _3n = index_js_1.BigInteger.new(3), _11n = index_js_1.BigInteger.new(11);
    // prettier-ignore
    const _22n = index_js_1.BigInteger.new(22), _44n = index_js_1.BigInteger.new(44), _88n = index_js_1.BigInteger.new(88), _223n = index_js_1.BigInteger.new(223);
    const b2 = x.modExp(_3n, P);
    const b3 = b2.mul(b2).imul(x).imod(P);
    const b6 = (0, modular_js_1.pow2)(b3, _3n, P).imul(b3).imod(P);
    const b9 = (0, modular_js_1.pow2)(b6, _3n, P).imul(b3).imod(P);
    const b11 = (0, modular_js_1.pow2)(b9, _2n, P).imul(b2).imod(P);
    const b22 = (0, modular_js_1.pow2)(b11, _11n, P).imul(b11).imod(P);
    const b44 = (0, modular_js_1.pow2)(b22, _22n, P).imul(b22).imod(P);
    const b88 = (0, modular_js_1.pow2)(b44, _44n, P).imul(b44).imod(P);
    const b176 = (0, modular_js_1.pow2)(b88, _88n, P).imul(b88).imod(P);
    const b220 = (0, modular_js_1.pow2)(b176, _44n, P).imul(b44).imod(P);
    const b222 = (0, modular_js_1.pow2)(b220, _2n, P).imul(b2).imod(P);
    const b223 = (0, modular_js_1.pow2)(b222, _1n, P).imul(x).imod(P);
    return (0, modular_js_1.pow2)(b223, _223n, P).imul(b222).imod(P);
}
function adjustScalarBytes(bytes) {
    // Section 5: Likewise, for X448, set the two least significant bits of the first byte to 0, and the most
    // significant bit of the last byte to 1.
    bytes[0] &= 252; // 0b11111100
    // and the most significant bit of the last byte to 1.
    bytes[55] |= 128; // 0b10000000
    // NOTE: is is NOOP for 56 bytes scalars (X25519/X448)
    bytes[56] = 0; // Byte outside of group (456 buts vs 448 bits)
    return bytes;
}
const Fp = (0, modular_js_1.Field)(ed448P, 456, true);
const _4n = index_js_1.BigInteger.new(4);
const _3n = index_js_1.BigInteger.new(3);
const _2n = index_js_1.BigInteger.new(2);
const ED448_DEF = {
    // Param: a
    a: index_js_1.BigInteger.new(1),
    // -39081. Negative number is P - number
    d: index_js_1.BigInteger.new('726838724295606890549323807888004534353641360687318060281490199180612328166730772686396383698676545930088884461843637361053498018326358'),
    // Finite field 𝔽p over which we'll do calculations; 2n**448n - 2n**224n - 1n
    Fp,
    // Subgroup order: how many points curve has;
    // 2n**446n - 13818066809895115352007386748515426880336692474882178609894547503885n
    n: index_js_1.BigInteger.new('181709681073901722637330951972001133588410340171829515070372549795146003961539585716195755291692375963310293709091662304773755859649779'),
    nBitLength: 456,
    // Cofactor
    h: index_js_1.BigInteger.new(4),
    // Base point (x, y) aka generator point
    Gx: index_js_1.BigInteger.new('224580040295924300187604334099896036246789641632564134246125461686950415467406032909029192869357953282578032075146446173674602635247710'),
    Gy: index_js_1.BigInteger.new('298819210078481492676017930443930673437544040154080242095928241372331506189835876003536878655418784733982303233503462500531545062832660'),
    // SHAKE256(dom4(phflag,context)||x, 114)
    hash: shake256_114,
    randomBytes: utils_1.randomBytes,
    adjustScalarBytes,
    // dom4
    domain: (data, ctx, phflag) => {
        if (ctx.length > 255)
            throw new Error(`Context is too big: ${ctx.length}`);
        return (0, utils_1.concatBytes)((0, utils_1.utf8ToBytes)('SigEd448'), new Uint8Array([phflag ? 1 : 0, ctx.length]), ctx, data);
    },
    // Constant-time ratio of u to v. Allows to combine inversion and square root u/√v.
    // Uses algo from RFC8032 5.1.3.
    uvRatio: (u, v) => {
        const P = ed448P;
        // https://datatracker.ietf.org/doc/html/rfc8032#section-5.2.3
        // To compute the square root of (u/v), the first step is to compute the
        //   candidate root x = (u/v)^((p+1)/4).  This can be done using the
        // following trick, to use a single modular powering for both the
        // inversion of v and the square root:
        // x = (u/v)^((p+1)/4)   = u³v(u⁵v³)^((p-3)/4)   (mod p)
        const u2v = (0, modular_js_1.mod)(u.mul(u).mul(v), P); // u²v
        const u3v = (0, modular_js_1.mod)(u2v.mul(u), P); // u³v
        const u5v3 = (0, modular_js_1.mod)(u3v.mul(u2v).mul(v), P); // u⁵v³
        const root = ed448_pow_Pminus3div4(u5v3);
        const x = (0, modular_js_1.mod)(u3v.mul(root), P);
        // Verify that root is exists
        const x2 = (0, modular_js_1.mod)(x.mul(x), P); // x²
        // If vx² = u, the recovered x-coordinate is x.  Otherwise, no
        // square root exists, and the decoding fails.
        return { isValid: (0, modular_js_1.mod)(x2.mul(v), P).equal(u), value: x };
    },
};
exports.ed448 = (0, edwards_js_1.twistedEdwards)(ED448_DEF);
// NOTE: there is no ed448ctx, since ed448 supports ctx by default
exports.ed448ph = (0, edwards_js_1.twistedEdwards)({ ...ED448_DEF, prehash: shake256_64 });
exports.x448 = (() => (0, montgomery_js_1.montgomery)({
    a: index_js_1.BigInteger.new(156326),
    montgomeryBits: 448,
    nByteLength: 57,
    P: ed448P,
    Gu: index_js_1.BigInteger.new(5),
    powPminus2: (x) => {
        const P = ed448P;
        const Pminus3div4 = ed448_pow_Pminus3div4(x);
        const Pminus3 = (0, modular_js_1.pow2)(Pminus3div4, index_js_1.BigInteger.new(2), P);
        return (0, modular_js_1.mod)(Pminus3.mul(x), P); // Pminus3 * x = Pminus2
    },
    adjustScalarBytes,
    randomBytes: utils_1.randomBytes,
}))();
/**
 * Converts edwards448 public key to x448 public key. Uses formula:
 * * `(u, v) = ((y-1)/(y+1), sqrt(156324)*u/x)`
 * * `(x, y) = (sqrt(156324)*u/v, (1+u)/(1-u))`
 * @example
 *   const aPub = ed448.getPublicKey(utils.randomPrivateKey());
 *   x448.getSharedSecret(edwardsToMontgomery(aPub), edwardsToMontgomery(someonesPub))
 */
function edwardsToMontgomeryPub(edwardsPub) {
    const { y } = exports.ed448.ExtendedPoint.fromHex(edwardsPub);
    return Fp.toBytes(Fp.create(y.dec().imul(Fp.inv(y.inc()))));
}
exports.edwardsToMontgomeryPub = edwardsToMontgomeryPub;
exports.edwardsToMontgomery = edwardsToMontgomeryPub; // deprecated
// Hash To Curve Elligator2 Map
const ELL2_C1 = Fp.ORDER.sub(_3n).irightShift(_2n); // 1. c1 = (q - 3) / 4         # Integer arithmetic
const ELL2_J = index_js_1.BigInteger.new(156326);
function map_to_curve_elligator2_curve448(u) {
    let tv1 = Fp.sqr(u); // 1.  tv1 = u^2
    let e1 = Fp.eql(tv1, Fp.ONE); // 2.   e1 = tv1 == 1
    tv1 = Fp.cmov(tv1, Fp.ZERO, e1); // 3.  tv1 = CMOV(tv1, 0, e1)  # If Z * u^2 == -1, set tv1 = 0
    let xd = Fp.sub(Fp.ONE, tv1); // 4.   xd = 1 - tv1
    let x1n = Fp.neg(ELL2_J); // 5.  x1n = -J
    let tv2 = Fp.sqr(xd); // 6.  tv2 = xd^2
    let gxd = Fp.mul(tv2, xd); // 7.  gxd = tv2 * xd          # gxd = xd^3
    let gx1 = Fp.mul(tv1, Fp.neg(ELL2_J)); // 8.  gx1 = -J * tv1          # x1n + J * xd
    gx1 = Fp.mul(gx1, x1n); // 9.  gx1 = gx1 * x1n         # x1n^2 + J * x1n * xd
    gx1 = Fp.add(gx1, tv2); // 10. gx1 = gx1 + tv2         # x1n^2 + J * x1n * xd + xd^2
    gx1 = Fp.mul(gx1, x1n); // 11. gx1 = gx1 * x1n         # x1n^3 + J * x1n^2 * xd + x1n * xd^2
    let tv3 = Fp.sqr(gxd); // 12. tv3 = gxd^2
    tv2 = Fp.mul(gx1, gxd); // 13. tv2 = gx1 * gxd         # gx1 * gxd
    tv3 = Fp.mul(tv3, tv2); // 14. tv3 = tv3 * tv2         # gx1 * gxd^3
    let y1 = Fp.pow(tv3, ELL2_C1); // 15.  y1 = tv3^c1            # (gx1 * gxd^3)^((p - 3) / 4)
    y1 = Fp.mul(y1, tv2); // 16.  y1 = y1 * tv2          # gx1 * gxd * (gx1 * gxd^3)^((p - 3) / 4)
    let x2n = Fp.mul(x1n, Fp.neg(tv1)); // 17. x2n = -tv1 * x1n        # x2 = x2n / xd = -1 * u^2 * x1n / xd
    let y2 = Fp.mul(y1, u); // 18.  y2 = y1 * u
    y2 = Fp.cmov(y2, Fp.ZERO, e1); // 19.  y2 = CMOV(y2, 0, e1)
    tv2 = Fp.sqr(y1); // 20. tv2 = y1^2
    tv2 = Fp.mul(tv2, gxd); // 21. tv2 = tv2 * gxd
    let e2 = Fp.eql(tv2, gx1); // 22.  e2 = tv2 == gx1
    let xn = Fp.cmov(x2n, x1n, e2); // 23.  xn = CMOV(x2n, x1n, e2)  # If e2, x = x1, else x = x2
    let y = Fp.cmov(y2, y1, e2); // 24.   y = CMOV(y2, y1, e2)    # If e2, y = y1, else y = y2
    let e3 = Fp.isOdd(y); // 25.  e3 = sgn0(y) == 1        # Fix sign of y
    y = Fp.cmov(y, Fp.neg(y), e2 !== e3); // 26.   y = CMOV(y, -y, e2 XOR e3)
    return { xn, xd, yn: y, yd: Fp.ONE }; // 27. return (xn, xd, y, 1)
}
function map_to_curve_elligator2_edwards448(u) {
    let { xn, xd, yn, yd } = map_to_curve_elligator2_curve448(u); // 1. (xn, xd, yn, yd) = map_to_curve_elligator2_curve448(u)
    let xn2 = Fp.sqr(xn); // 2.  xn2 = xn^2
    let xd2 = Fp.sqr(xd); // 3.  xd2 = xd^2
    let xd4 = Fp.sqr(xd2); // 4.  xd4 = xd2^2
    let yn2 = Fp.sqr(yn); // 5.  yn2 = yn^2
    let yd2 = Fp.sqr(yd); // 6.  yd2 = yd^2
    let xEn = Fp.sub(xn2, xd2); // 7.  xEn = xn2 - xd2
    let tv2 = Fp.sub(xEn, xd2); // 8.  tv2 = xEn - xd2
    xEn = Fp.mul(xEn, xd2); // 9.  xEn = xEn * xd2
    xEn = Fp.mul(xEn, yd); // 10. xEn = xEn * yd
    xEn = Fp.mul(xEn, yn); // 11. xEn = xEn * yn
    xEn = Fp.mul(xEn, _4n); // 12. xEn = xEn * 4
    tv2 = Fp.mul(tv2, xn2); // 13. tv2 = tv2 * xn2
    tv2 = Fp.mul(tv2, yd2); // 14. tv2 = tv2 * yd2
    let tv3 = Fp.mul(yn2, _4n); // 15. tv3 = 4 * yn2
    let tv1 = Fp.add(tv3, yd2); // 16. tv1 = tv3 + yd2
    tv1 = Fp.mul(tv1, xd4); // 17. tv1 = tv1 * xd4
    let xEd = Fp.add(tv1, tv2); // 18. xEd = tv1 + tv2
    tv2 = Fp.mul(tv2, xn); // 19. tv2 = tv2 * xn
    let tv4 = Fp.mul(xn, xd4); // 20. tv4 = xn * xd4
    let yEn = Fp.sub(tv3, yd2); // 21. yEn = tv3 - yd2
    yEn = Fp.mul(yEn, tv4); // 22. yEn = yEn * tv4
    yEn = Fp.sub(yEn, tv2); // 23. yEn = yEn - tv2
    tv1 = Fp.add(xn2, xd2); // 24. tv1 = xn2 + xd2
    tv1 = Fp.mul(tv1, xd2); // 25. tv1 = tv1 * xd2
    tv1 = Fp.mul(tv1, xd); // 26. tv1 = tv1 * xd
    tv1 = Fp.mul(tv1, yn2); // 27. tv1 = tv1 * yn2
    tv1 = Fp.mul(tv1, index_js_1.BigInteger.new(-2)); // 28. tv1 = -2 * tv1
    let yEd = Fp.add(tv2, tv1); // 29. yEd = tv2 + tv1
    tv4 = Fp.mul(tv4, yd2); // 30. tv4 = tv4 * yd2
    yEd = Fp.add(yEd, tv4); // 31. yEd = yEd + tv4
    tv1 = Fp.mul(xEd, yEd); // 32. tv1 = xEd * yEd
    let e = Fp.eql(tv1, Fp.ZERO); // 33.   e = tv1 == 0
    xEn = Fp.cmov(xEn, Fp.ZERO, e); // 34. xEn = CMOV(xEn, 0, e)
    xEd = Fp.cmov(xEd, Fp.ONE, e); // 35. xEd = CMOV(xEd, 1, e)
    yEn = Fp.cmov(yEn, Fp.ONE, e); // 36. yEn = CMOV(yEn, 1, e)
    yEd = Fp.cmov(yEd, Fp.ONE, e); // 37. yEd = CMOV(yEd, 1, e)
    const inv = Fp.invertBatch([xEd, yEd]); // batch division
    return { x: Fp.mul(xEn, inv[0]), y: Fp.mul(yEn, inv[1]) }; // 38. return (xEn, xEd, yEn, yEd)
}
const htf = /* @__PURE__ */ (() => (0, hash_to_curve_js_1.createHasher)(exports.ed448.ExtendedPoint, (scalars) => map_to_curve_elligator2_edwards448(scalars[0]), {
    DST: 'edwards448_XOF:SHAKE256_ELL2_RO_',
    encodeDST: 'edwards448_XOF:SHAKE256_ELL2_NU_',
    p: Fp.ORDER,
    m: 1,
    k: 224,
    expand: 'xof',
    hash: sha3_1.shake256,
}))();
exports.hashToCurve = (() => htf.hashToCurve)();
exports.encodeToCurve = (() => htf.encodeToCurve)();
//# sourceMappingURL=ed448.js.map