export default function isPlainObject(obj) {
    if (globalThis.process?.versions) {
        return Object.prototype.toString.call(obj) === '[object Object]';
    }
    return (Object.prototype.toString.call(obj) === '[object Object]' &&
        Object.getPrototypeOf(obj).hasOwnProperty('hasOwnProperty'));
}
