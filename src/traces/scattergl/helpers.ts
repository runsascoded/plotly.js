import constants from './constants.js';

export const isOpenSymbol = function(symbol: any) {
    return (typeof symbol === 'string') ?
        constants.OPEN_RE.test(symbol) :
        symbol % 200 > 100;
};

export const isDotSymbol = function(symbol: any) {
    return (typeof symbol === 'string') ?
        constants.DOT_RE.test(symbol) :
        symbol > 200;
};

export default { isOpenSymbol, isDotSymbol };
