import Lib from '../lib/index.js';
import helpers from './helpers.js';
/*
* substantial portions of this code from FileSaver.js
* https://github.com/eligrey/FileSaver.js
* License: https://github.com/eligrey/FileSaver.js/blob/master/LICENSE.md
* FileSaver.js
* A saveAs() FileSaver implementation.
* 1.1.20160328
*
* By Eli Grey, http://eligrey.com
* License: MIT
*   See https://github.com/eligrey/FileSaver.js/blob/master/LICENSE.md
*/
function fileSaver(url, name, format) {
    const saveLink = document.createElement('a');
    const canUseSaveLink = 'download' in saveLink;
    const promise = new Promise(function (resolve, reject) {
        let blob;
        let objectUrl;
        if (canUseSaveLink) {
            blob = helpers.createBlob(url, format);
            objectUrl = helpers.createObjectURL(blob);
            saveLink.href = objectUrl;
            saveLink.download = name;
            document.body.appendChild(saveLink);
            saveLink.click();
            document.body.removeChild(saveLink);
            helpers.revokeObjectURL(objectUrl);
            blob = null;
            return resolve(name);
        }
        // Older versions of Safari did not allow downloading of blob urls
        if (Lib.isSafari()) {
            const prefix = format === 'svg' ? ',' : ';base64,';
            helpers.octetStream(prefix + encodeURIComponent(url));
            return resolve(name);
        }
        reject(new Error('download error'));
    });
    return promise;
}
export default fileSaver;
