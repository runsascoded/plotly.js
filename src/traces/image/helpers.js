import probeSync from 'probe-image-size/sync';
import { IMAGE_URL_PREFIX as dataUri } from '../../snapshot/helpers.js';
import { Buffer } from 'buffer/';

export var getImageSize = function(src) {
    var data = src.replace(dataUri, '');
    var buff = new Buffer(data, 'base64');
    return probeSync(buff);
};

export default { getImageSize };
