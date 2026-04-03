import isNumeric from 'fast-isnumeric';
import isMobileOrTablet from 'is-mobile';
export default function preserveDrawingBuffer(opts) {
    let ua;
    if (opts && opts.hasOwnProperty('userAgent')) {
        ua = opts.userAgent;
    }
    else {
        ua = getUserAgent();
    }
    if (typeof ua !== 'string')
        return true;
    const enable = isMobileOrTablet({
        ua: { headers: { 'user-agent': ua } },
        tablet: true,
        featureDetect: false
    });
    if (!enable) {
        const allParts = ua.split(' ');
        for (let i = 1; i < allParts.length; i++) {
            const part = allParts[i];
            if (part.indexOf('Safari') !== -1) {
                // find Safari version
                for (let k = i - 1; k > -1; k--) {
                    const prevPart = allParts[k];
                    if (prevPart.slice(0, 8) === 'Version/') {
                        let v = prevPart.slice(8).split('.')[0];
                        if (isNumeric(v))
                            v = +v;
                        if (v >= 13)
                            return true;
                    }
                }
            }
        }
    }
    return enable;
}
function getUserAgent() {
    // similar to https://github.com/juliangruber/is-mobile/blob/91ca39ccdd4cfc5edfb5391e2515b923a730fbea/index.js#L14-L17
    let ua;
    if (typeof navigator !== 'undefined') {
        ua = navigator.userAgent;
    }
    if (ua &&
        ua.headers &&
        typeof ua.headers['user-agent'] === 'string') {
        ua = ua.headers['user-agent'];
    }
    return ua;
}
