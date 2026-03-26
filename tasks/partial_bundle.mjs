import prependFile from 'prepend-file';

import constants from './util/constants.cjs';
import common from './util/common.cjs';
import _bundle from './util/bundle_wrapper.mjs';

var header = constants.licenseDist + '\n';
var allTraces = constants.allTraces;
var mainIndex = constants.mainIndex;
var strictIndex = constants.strictIndex;

// Bundle the plotly.js partial bundles
export default function partialBundle(tasks, opts) {
    var name = opts.name;
    var index = opts.index;
    var deleteIndex = opts.deleteIndex;
    var dist = opts.dist;
    var distMin = opts.distMin;
    var traceList = opts.traceList;
    var calendars = opts.calendars;
    var strict = opts.strict;

    // Entry point files (lib/index-*.js) are maintained as static ESM files.
    // Skip the old regex-based index generation — just bundle from the existing file.

    tasks.push(function(done) {
        var bundleOpts = {
            deleteIndex: deleteIndex && !distMin,
        };

        _bundle(index, dist, bundleOpts, function() {
            var headerDist = header.replace('plotly.js', 'plotly.js (' + name + ')');

            if(dist) prependFile.sync(dist, headerDist, common.throwOnError);

            done();
        });
    });

    tasks.push(function(done) {
        var bundleOpts = {
            deleteIndex: deleteIndex,
            minify: true,
        };

        _bundle(index, distMin, bundleOpts, function() {
            var headerDistMin = header.replace('plotly.js', 'plotly.js (' + name + ' - minified)');

            if(distMin) prependFile.sync(distMin, headerDistMin, common.throwOnError);

            done();
        });
    });
}
