import constants from './constants.js';
export function isOpenSymbol(symbol) {
    return (typeof symbol === 'string') ?
        constants.OPEN_RE.test(symbol) :
        symbol % 200 > 100;
}
export function isDotSymbol(symbol) {
    return (typeof symbol === 'string') ?
        constants.DOT_RE.test(symbol) :
        symbol > 200;
}
export default { isOpenSymbol, isDotSymbol };
