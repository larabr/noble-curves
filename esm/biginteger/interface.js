class BigInteger {
    static setImplementation(Implementation, replace = false) {
        if (BigInteger.Implementation && !replace) {
            throw new Error('Implementation already set');
        }
        BigInteger.Implementation = Implementation;
    }
    static new(n) {
        return new BigInteger.Implementation(n);
    }
}
export { BigInteger, BigInteger as default };
//# sourceMappingURL=interface.js.map