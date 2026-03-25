import fs from 'fs-extra';
import path from 'path';
import sass from 'sass';

import constants from './util/constants.cjs';
import mapboxConstants from '../src/plots/mapbox/constants.js';
var mapBoxGLStyleRules = mapboxConstants.styleRules;
import common from './util/common.cjs';
import pullCSS from './util/pull_css.cjs';
import updateVersion from './util/update_version.cjs';

// main
makeBuildCSS();
exposePartsInLib();
updateVersion(constants.pathToPlotlyVersion);

// convert scss to css to js and static css file
function makeBuildCSS() {
    sass.render(
        {
            file: constants.pathToSCSS,
            outputStyle: 'compressed'
        },
        function(err, result) {
            if(err) throw err;

            var staticCSS = String(result.css);
            for(var k in mapBoxGLStyleRules) {
                staticCSS += '.js-plotly-plot .plotly .mapboxgl-' + k + '{' + mapBoxGLStyleRules[k] + '}';
            }
            fs.writeFile(constants.pathToCSSDist, staticCSS, function(err) {
                if(err) throw err;
            });

            pullCSS(String(result.css), constants.pathToCSSBuild);
        }
    );
}

function exposePartsInLib() {
    var obj = {};

    var insert = function(name, folder) {
        obj[name] = folder + '/' + name;
    };

    insert('core', 'src');
    insert('calendars', 'src/components');

    constants.allTraces.forEach(function(k) {
        insert(k, 'src/traces');
    });

    writeLibFiles(obj);
}

function writeLibFiles(obj) {
    for(var name in obj) {
        var targetPath = '../' + obj[name];
        // Check if it's a directory with index.js
        var fullPath = path.join(constants.pathToLib, '..', obj[name]);
        if(fs.existsSync(path.join(fullPath, 'index.js'))) {
            targetPath += '/index.js';
        } else {
            targetPath += '.js';
        }

        common.writeFile(
            path.join(constants.pathToLib, name + '.js'),
            "export { default } from '" + targetPath + "';\n"
        );
    }
}
