export default function isPlainObject(obj: unknown): obj is Record<string, unknown> {
    if((globalThis as any).process?.versions) {
        return Object.prototype.toString.call(obj) === '[object Object]';
    }

    return (
        Object.prototype.toString.call(obj) === '[object Object]' &&
        Object.getPrototypeOf(obj).hasOwnProperty('hasOwnProperty')
    );
}
