import fs from 'fs-extra';
import path from 'path';
import * as sass from 'sass';

import constants from './util/constants.cjs';
import { createRequire } from 'module';
var mapBoxGLStyleRules = createRequire(import.meta.url)('./util/mapbox-style-rules.json');
import common from './util/common.cjs';
import updateVersion from './util/update_version.cjs';

// main
makeBuildCSS();
exposePartsInLib();
updateVersion(constants.pathToPlotlyVersion);

function makeBuildCSS() {
    var result = sass.renderSync({
        file: constants.pathToSCSS,
        outputStyle: 'compressed'
    });

    var staticCSS = String(result.css);
    for(var k in mapBoxGLStyleRules) {
        staticCSS += '.js-plotly-plot .plotly .mapboxgl-' + k + '{' + mapBoxGLStyleRules[k] + '}';
    }
    fs.writeFileSync(constants.pathToCSSDist, staticCSS);

    // Generate plotcss.js (CSS injection code)
    var cssStr = String(result.css);
    var rules = {};
    cssStr.split(/\s*\}\s*/).forEach(function(chunk) {
        if(!chunk) return;
        var parts = chunk.split(/\s*\{\s*/);
        var selectorList = parts[0];
        var rule = parts[1];
        if(!rule) return;

        selectorList = selectorList
            .replace(/[\.]js-plotly-plot [\.]plotly/g, 'X')
            .replace(/[\.]plotly-notifier/g, 'Y');

        rule = rule.replace(/;\s*/g, ';').replace(/;?\s*$/, ';');
        if(rule.match(/^[\s;]*$/)) return;
        rules[selectorList] = rules[selectorList] || '' + rule;
    });

    var rulesStr = JSON.stringify(rules, null, 4).replace(/"(\w+)":/g, '$1:');
    var outStr = [
        "import { addStyleRule } from '../src/lib/dom.js';",
        'var rules = ' + rulesStr + ';',
        '',
        'for(var selector in rules) {',
        "    var fullSelector = selector.replace(/^,/,' ,')",
        "        .replace(/X/g, '.js-plotly-plot .plotly')",
        "        .replace(/Y/g, '.plotly-notifier');",
        '    addStyleRule(fullSelector, rules[selector]);',
        '}',
        ''
    ].join('\n');

    fs.writeFileSync(constants.pathToCSSBuild, outStr);
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
        var fullPath = path.join(constants.pathToLib, '..', obj[name]);
        if(fs.existsSync(path.join(fullPath, 'index.js'))) {
            targetPath += '/index.js';
        } else {
            targetPath += '.js';
        }

        fs.writeFileSync(
            path.join(constants.pathToLib, name + '.js'),
            "export { default } from '" + targetPath + "';\n"
        );
    }
}
