/**
 * Build fork-specific bundles (minimal, lite) that have hand-written entry
 * points and don't go through the partial_bundle trace-stripping system.
 */
import path from 'path';
import runSeries from 'run-series';
import prependFile from 'prepend-file';

import constants from './util/constants.cjs';
import common from './util/common.cjs';
import _bundle from './util/bundle_wrapper.mjs';

var header = constants.licenseDist + '\n';

var customBundles = ['minimal', 'lite'];
var tasks = [];

for(var i = 0; i < customBundles.length; i++) {
    (function(name) {
        var index = path.join(constants.pathToLib, 'index-' + name + '.js');
        var dist = path.join(constants.pathToDist, name + '.js');
        var distMin = path.join(constants.pathToDist, name + '.min.js');

        tasks.push(function(done) {
            _bundle(index, dist, {}, function() {
                prependFile.sync(dist, header, common.throwOnError);
                done();
            });
        });

        tasks.push(function(done) {
            _bundle(index, distMin, { minify: true }, function() {
                prependFile.sync(distMin, header, common.throwOnError);
                done();
            });
        });
    })(customBundles[i]);
}

runSeries(tasks, function(err) {
    if(err) throw err;
});
