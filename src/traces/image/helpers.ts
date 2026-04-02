import probeSync from 'probe-image-size/sync';
import { IMAGE_URL_PREFIX as dataUri } from '../../snapshot/helpers.js';
import { Buffer } from 'buffer/';

export function getImageSize(src: any) {
    const data = src.replace(dataUri, '');
    const buff = new Buffer(data, 'base64');
    return probeSync(buff);
}

export default { getImageSize };
