import Lib from '../lib/index.js';
import toImage from '../plot_api/to_image.js';
import fileSaver from './filesaver.js';
import helpers from './helpers.js';
import type { GraphDiv } from '../../types/core';

/**
 * Plotly.downloadImage
 *
 * @param {object | string | HTML div} gd
 *   can either be a data/layout/config object
 *   or an existing graph <div>
 *   or an id to an existing graph <div>
 * @param {object} opts (see Plotly.toImage in ../plot_api/to_image)
 * @return {promise}
 */
function downloadImage(gd: GraphDiv, opts: any) {
    let _gd;
    if(!Lib.isPlainObject(gd)) _gd = Lib.getGraphDiv(gd);

    opts = opts || {};
    opts.format = opts.format || 'png';
    opts.width = opts.width || null;
    opts.height = opts.height || null;
    opts.imageDataOnly = true;

    return new Promise(function(resolve, reject) {
        if(_gd && _gd._snapshotInProgress) {
            reject(new Error('Snapshotting already in progress.'));
        }

        if(_gd) _gd._snapshotInProgress = true;
        const promise = toImage(gd, opts);

        let filename = opts.filename || gd.fn || 'newplot';
        filename += '.' + opts.format.replace('-', '.');

        promise.then(function(result) {
            if(_gd) _gd._snapshotInProgress = false;
            return fileSaver(result, filename, opts.format);
        }).then(function(name) {
            resolve(name);
        }).catch(function(err) {
            if(_gd) _gd._snapshotInProgress = false;
            reject(err);
        });
    });
}

export default downloadImage;
